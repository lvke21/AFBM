import type { Transaction } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { MatchStatus, SeasonPhase, WeekState } from "@/modules/shared/domain/enums";

import { canReadFirestoreLeague, getFirestoreLeague } from "./firestoreAccess";
import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import {
  logFirestoreWriteFailure,
  logStateTransitionFailure,
  withFirestoreRepositoryLogging,
} from "./firestoreOperationalLogger";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

type WeekFlowInput = {
  userId: string;
  saveGameId: string;
};

type MatchWeekFlowInput = WeekFlowInput & {
  matchId: string;
};

type FinishGameInput = MatchWeekFlowInput;

type WeekFlowResult = {
  currentSeasonId: string;
  matchId?: string;
  phase: SeasonPhase;
  saveGameId: string;
  week: number;
  weekState: WeekState;
};

type FirestoreLeagueState = {
  id: string;
  currentSeasonId?: string | null;
  currentWeekId?: string | null;
  currentSeasonSnapshot?: {
    phase?: SeasonPhase;
    weekNumber?: number;
    year?: number;
  };
  settings?: {
    seasonLengthWeeks?: number;
  };
  weekState?: WeekState;
};

type FirestoreSeasonState = {
  id: string;
  phase?: SeasonPhase;
  currentWeekNumber?: number;
  weekNumber?: number;
  year?: number;
};

type FirestoreWeekState = {
  id: string;
  leagueId: string;
  seasonId: string;
  state: WeekState;
  weekNumber: number;
};

type FirestoreMatchState = {
  awayScore?: number | null;
  id: string;
  leagueId: string;
  homeScore?: number | null;
  seasonId: string;
  simulationSeed?: string | null;
  status: MatchStatus;
  weekId: string;
  weekNumber: number;
};

const validWeekTransitions: Record<WeekState, WeekState[]> = {
  [WeekState.PRE_WEEK]: [WeekState.READY],
  [WeekState.READY]: [WeekState.GAME_RUNNING],
  [WeekState.GAME_RUNNING]: [WeekState.READY, WeekState.POST_GAME],
  [WeekState.POST_GAME]: [WeekState.PRE_WEEK],
};

export const weekMatchStateRepositoryFirestore = {
  async prepareWeekForUser(input: WeekFlowInput): Promise<WeekFlowResult> {
    return withWeekStateLogging("prepareWeekForUser", async () => {
    assertFirestoreEmulatorOnly();
    const context = await requireWeekContext(input);

    assertCurrentState(context.weekState, WeekState.PRE_WEEK, "prepareWeek");
    assertTransition(context.weekState, WeekState.READY);

    await updateWeekState(context, WeekState.READY);

    return resultFromContext(context, WeekState.READY);
    });
  },

  async startGameForUser(input: MatchWeekFlowInput): Promise<WeekFlowResult> {
    return withWeekStateLogging("startGameForUser", async () => {
    assertFirestoreEmulatorOnly();
    const context = await requireWeekContext(input);

    assertCurrentState(context.weekState, WeekState.READY, "startGame");
    assertTransition(context.weekState, WeekState.GAME_RUNNING);

    const match = await requireCurrentWeekMatch(
      context,
      input.matchId,
      MatchStatus.SCHEDULED,
    );
    const firestore = getFirebaseAdminFirestore();
    const now = new Date();
    const result = resolveSystemMatchResult(match);

    await firestore.runTransaction(async (transaction) => {
      transaction.update(firestore.collection("matches").doc(match.id), {
        awayScore: result.awayScore,
        homeScore: result.homeScore,
        simulationSeed: result.seed,
        simulationStartedAt: now,
        status: MatchStatus.IN_PROGRESS,
        updatedAt: now,
      });
      recordFirestoreUsage({
        collection: "matches",
        count: 1,
        operation: "write",
        query: "transaction update",
      });
      writeWeekState(transaction, context, WeekState.GAME_RUNNING, now);
    });

    return resultFromContext(context, WeekState.GAME_RUNNING, match.id);
    });
  },

  async finishGameForUser(input: FinishGameInput): Promise<WeekFlowResult> {
    return withWeekStateLogging("finishGameForUser", async () => {
    assertFirestoreEmulatorOnly();
    const context = await requireWeekContext(input);

    assertCurrentState(context.weekState, WeekState.GAME_RUNNING, "finishGame");

    const match = await requireCurrentWeekMatch(
      context,
      input.matchId,
      MatchStatus.IN_PROGRESS,
    );
    const nextWeekState = await determineWeekStateAfterFinishedMatch(context, match.id);
    if (nextWeekState !== context.weekState) {
      assertTransition(context.weekState, nextWeekState);
    }
    const firestore = getFirebaseAdminFirestore();
    const now = new Date();
    const result = resolveSystemMatchResult(match);

    await firestore.runTransaction(async (transaction) => {
      transaction.update(firestore.collection("matches").doc(match.id), {
        awayScore: result.awayScore,
        homeScore: result.homeScore,
        simulationSeed: result.seed,
        simulationCompletedAt: now,
        status: MatchStatus.COMPLETED,
        updatedAt: now,
      });
      recordFirestoreUsage({
        collection: "matches",
        count: 1,
        operation: "write",
        query: "transaction update",
      });
      writeWeekState(transaction, context, nextWeekState, now);
    });

    return resultFromContext(context, nextWeekState, match.id);
    });
  },

  async advanceWeekForUser(input: WeekFlowInput): Promise<WeekFlowResult> {
    return withWeekStateLogging("advanceWeekForUser", async () => {
    assertFirestoreEmulatorOnly();
    const context = await requireWeekContext(input);

    assertCurrentState(context.weekState, WeekState.POST_GAME, "advanceWeek");
    assertTransition(context.weekState, WeekState.PRE_WEEK);

    const firestore = getFirebaseAdminFirestore();
    const openMatches = await firestore
      .collection("matches")
      .where("leagueId", "==", context.saveGameId)
      .where("seasonId", "==", context.currentSeasonId)
      .where("weekId", "==", context.currentWeekId)
      .where("status", "in", [MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS])
      .get();
    recordFirestoreUsage({
      collection: "matches",
      count: openMatches.size,
      operation: "read",
      query: "leagueId+seasonId+weekId+status in",
    });

    if (!openMatches.empty) {
      throw new Error("Current week still has open matches");
    }

    const nextWeek = Math.min(context.week + 1, context.seasonLengthWeeks);
    const nextWeekId = `${context.saveGameId}_${context.currentSeasonId}_w${nextWeek}`;
    const now = new Date();

    await firestore.runTransaction(async (transaction) => {
      transaction.update(firestore.collection("leagues").doc(context.saveGameId), {
        currentSeasonSnapshot: {
          phase: context.phase,
          weekNumber: nextWeek,
          year: context.year,
        },
        currentWeekId: nextWeekId,
        updatedAt: now,
        weekState: WeekState.PRE_WEEK,
      });
      recordFirestoreUsage({
        collection: "leagues",
        count: 1,
        operation: "write",
        query: "transaction update",
      });
      transaction.update(firestore.collection("seasons").doc(context.currentSeasonId), {
        currentWeekNumber: nextWeek,
        updatedAt: now,
      });
      recordFirestoreUsage({
        collection: "seasons",
        count: 1,
        operation: "write",
        query: "transaction update",
      });
      transaction.update(firestore.collection("weeks").doc(nextWeekId), {
        state: WeekState.PRE_WEEK,
        updatedAt: now,
      });
      recordFirestoreUsage({
        collection: "weeks",
        count: 1,
        operation: "write",
        query: "transaction update",
      });
    });

    return {
      currentSeasonId: context.currentSeasonId,
      phase: context.phase,
      saveGameId: context.saveGameId,
      week: nextWeek,
      weekState: WeekState.PRE_WEEK,
    };
    });
  },
};

type WeekContext = {
  currentSeasonId: string;
  currentWeekId: string;
  phase: SeasonPhase;
  saveGameId: string;
  seasonLengthWeeks: number;
  week: number;
  weekState: WeekState;
  year: number;
};

async function requireWeekContext(input: WeekFlowInput): Promise<WeekContext> {
  if (!(await canReadFirestoreLeague(input.userId, input.saveGameId))) {
    throw new Error("Savegame week context not found");
  }

  const firestore = getFirebaseAdminFirestore();
  const league = await getFirestoreLeague(input.saveGameId) as FirestoreLeagueState | null;

  if (!league?.currentSeasonId || !league.currentWeekId) {
    throw new Error("Savegame has no active current season");
  }

  const [seasonSnapshot, weekSnapshot] = await Promise.all([
    firestore.collection("seasons").doc(league.currentSeasonId).get(),
    firestore.collection("weeks").doc(league.currentWeekId).get(),
  ]);
  recordFirestoreUsage({
    collection: "seasons",
    count: seasonSnapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });
  recordFirestoreUsage({
    collection: "weeks",
    count: weekSnapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });

  if (!seasonSnapshot.exists || !weekSnapshot.exists) {
    throw new Error("Savegame week context not found");
  }

  const season = {
    ...(seasonSnapshot.data() as FirestoreSeasonState),
    id: seasonSnapshot.id,
  };
  const week = {
    ...(weekSnapshot.data() as FirestoreWeekState),
    id: weekSnapshot.id,
  };

  return {
    currentSeasonId: season.id,
    currentWeekId: week.id,
    phase: season.phase ?? league.currentSeasonSnapshot?.phase ?? SeasonPhase.REGULAR_SEASON,
    saveGameId: input.saveGameId,
    seasonLengthWeeks: league.settings?.seasonLengthWeeks ?? 1,
    week: week.weekNumber ?? season.currentWeekNumber ?? league.currentSeasonSnapshot?.weekNumber ?? 1,
    weekState: (league.weekState ?? week.state) as WeekState,
    year: season.year ?? league.currentSeasonSnapshot?.year ?? 0,
  };
}

async function requireCurrentWeekMatch(
  context: WeekContext,
  matchId: string,
  status: MatchStatus,
) {
  const snapshot = await getFirebaseAdminFirestore().collection("matches").doc(matchId).get();
  recordFirestoreUsage({
    collection: "matches",
    count: snapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });

  if (!snapshot.exists) {
    throw new Error(status === MatchStatus.SCHEDULED
      ? "Scheduled current-week match not found"
      : "Running current-week match not found");
  }

  const match = {
    ...(snapshot.data() as FirestoreMatchState),
    id: snapshot.id,
  };

  if (
    match.leagueId !== context.saveGameId ||
    match.seasonId !== context.currentSeasonId ||
    match.weekId !== context.currentWeekId ||
    match.status !== status
  ) {
    throw new Error(status === MatchStatus.SCHEDULED
      ? "Scheduled current-week match not found"
      : "Running current-week match not found");
  }

  return match;
}

async function determineWeekStateAfterFinishedMatch(
  context: WeekContext,
  finishedMatchId: string,
) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("matches")
    .where("leagueId", "==", context.saveGameId)
    .where("seasonId", "==", context.currentSeasonId)
    .where("weekId", "==", context.currentWeekId)
    .where("status", "in", [MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS])
    .get();
  recordFirestoreUsage({
    collection: "matches",
    count: snapshot.size,
    operation: "read",
    query: "leagueId+seasonId+weekId+status in",
  });

  const remainingOpenMatches = snapshot.docs
    .map((document) => document.data() as FirestoreMatchState)
    .filter((match) => match.id !== finishedMatchId);

  if (remainingOpenMatches.some((match) => match.status === MatchStatus.IN_PROGRESS)) {
    return WeekState.GAME_RUNNING;
  }

  if (remainingOpenMatches.some((match) => match.status === MatchStatus.SCHEDULED)) {
    return WeekState.READY;
  }

  return WeekState.POST_GAME;
}

async function updateWeekState(context: WeekContext, to: WeekState) {
  const firestore = getFirebaseAdminFirestore();
  const now = new Date();

  try {
    await firestore.runTransaction(async (transaction) => {
      writeWeekState(transaction, context, to, now);
    });
  } catch (error) {
    logFirestoreWriteFailure({
      error,
      flowName: "week-loop",
      operation: "updateWeekState",
      repository: "weekMatchStateRepositoryFirestore",
    });
    throw error;
  }
}

function writeWeekState(
  transaction: Transaction,
  context: WeekContext,
  to: WeekState,
  now: Date,
) {
  const firestore = getFirebaseAdminFirestore();

  transaction.update(firestore.collection("leagues").doc(context.saveGameId), {
    updatedAt: now,
    weekState: to,
  });
  recordFirestoreUsage({
    collection: "leagues",
    count: 1,
    operation: "write",
    query: "transaction update",
  });
  transaction.update(firestore.collection("weeks").doc(context.currentWeekId), {
    state: to,
    updatedAt: now,
  });
  recordFirestoreUsage({
    collection: "weeks",
    count: 1,
    operation: "write",
    query: "transaction update",
  });
}

function resultFromContext(
  context: WeekContext,
  weekState: WeekState,
  matchId?: string,
): WeekFlowResult {
  return {
    currentSeasonId: context.currentSeasonId,
    matchId,
    phase: context.phase,
    saveGameId: context.saveGameId,
    week: context.week,
    weekState,
  };
}

function assertTransition(from: WeekState, to: WeekState) {
  if (!validWeekTransitions[from].includes(to)) {
    logStateTransitionFailure({
      action: "assertTransition",
      from,
      to,
    });
    throw new Error(`Invalid week-state transition from ${from} to ${to}`);
  }
}

function assertCurrentState(actual: WeekState, expected: WeekState, action: string) {
  if (actual !== expected) {
    logStateTransitionFailure({
      action,
      actual,
      expected,
    });
    throw new Error(`${action} requires week state ${expected}, current state is ${actual}`);
  }
}

function withWeekStateLogging<T>(operation: string, run: () => Promise<T>) {
  return withFirestoreRepositoryLogging(
    {
      flowName: "week-loop",
      operation,
      repository: "weekMatchStateRepositoryFirestore",
    },
    run,
  );
}

function resolveSystemMatchResult(match: FirestoreMatchState) {
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;

  if (
    typeof homeScore === "number" &&
    Number.isInteger(homeScore) &&
    homeScore >= 0 &&
    typeof awayScore === "number" &&
    Number.isInteger(awayScore) &&
    awayScore >= 0
  ) {
    return {
      awayScore,
      homeScore,
      seed: match.simulationSeed ?? buildSystemSeed(match),
    };
  }

  return buildSystemMatchResult(match);
}

function buildSystemMatchResult(match: FirestoreMatchState) {
  const seed = buildSystemSeed(match);
  const hash = hashString(seed);
  const homeScore = 13 + (hash % 21);
  let awayScore = 10 + (Math.floor(hash / 97) % 21);

  if (homeScore === awayScore) {
    awayScore = Math.max(0, awayScore - 3);
  }

  return {
    awayScore,
    homeScore,
    seed,
  };
}

function buildSystemSeed(match: FirestoreMatchState) {
  return `firestore-system-result:${match.id}:w${match.weekNumber}`;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
