import {
  FieldValue,
  type DocumentReference,
  type Transaction,
  type WriteBatch,
} from "firebase-admin/firestore";

import {
  createAdminSimulationLockId,
  isSafeAdminEntityId,
  normalizeBoundedAdminInteger,
  normalizeExpectedAdminSimulationStep,
} from "@/lib/admin/admin-action-hardening";
import { createSeededId } from "@/lib/random/seeded-rng";
import type { AdminActionActor } from "@/lib/admin/admin-action-guard";
import { LocalAdminMemoryStorage, type LocalAdminStateInput } from "@/lib/admin/local-admin-storage";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  assertCanStartOnlineLeagueWeekSimulation,
  getOnlineLeagueSimulationLockStatus,
  OnlineLeagueWeekSimulationError,
  prepareOnlineLeagueWeekSimulation,
  type OnlineLeagueWeekSimulationSummary,
} from "@/lib/admin/online-week-simulation";
import {
  applyOnlineRevenueSharing,
  canCreateOnlineLeagueSchedule,
  authorizeOnlineGmRemoval,
  createOnlineLeagueSchedule,
  createFantasyDraftPlayerPool,
  createInitialFantasyDraftState,
  createOnlineLeague,
  deleteOnlineLeague,
  fillOnlineLeagueWithFakeUsers,
  completeOnlineFantasyDraftIfReady,
  getOnlineLeagueById,
  getOnlineLeagueWeekReadyState,
  getOnlineLeagues,
  makeOnlineFantasyDraftPick,
  markOnlineTeamVacant,
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_MVP_TEAM_POOL,
  recordOnlineGmMissedWeek,
  removeOnlineGmByAdmin,
  removeOnlineLeagueUser,
  resetOnlineLeague,
  resetOnlineLeagues,
  resetWeeklyTrainingPlan,
  saveOnlineLeague,
  setAllOnlineLeagueUsersReady,
  setAllOnlineLeaguesUsersReady,
  simulateOnlineLeagueWeek as simulateLocalOnlineLeagueWeek,
  startOnlineFantasyDraft,
  startOnlineLeague,
  warnOnlineGm,
  addFakeUserToOnlineLeague,
  type OnlineContractPlayer,
  type OnlineFantasyDraftPick,
  type OnlineFantasyDraftState,
  type OnlineLeague,
  type OnlineLeagueTeam,
} from "@/lib/online/online-league-service";
import {
  mapFirestoreSnapshotToOnlineLeague,
  mapLocalTeamToFirestoreTeam,
  type FirestoreOnlineDraftAvailablePlayerDoc,
  type FirestoreOnlineDraftPickDoc,
  type FirestoreOnlineDraftStateDoc,
  type FirestoreOnlineEventDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
} from "@/lib/online/types";

export type OnlineAdminActionName =
  | "listLeagues"
  | "getLeague"
  | "createLeague"
  | "deleteLeague"
  | "resetLeague"
  | "debugDeleteAllLeagues"
  | "debugAddFakeUser"
  | "debugFillLeague"
  | "debugSetAllReady"
  | "debugResetOnlineState"
  | "setAllReady"
  | "startLeague"
  | "removePlayer"
  | "simulateWeek"
  | "applyRevenueSharing"
  | "resetTrainingPlan"
  | "recordMissedWeek"
  | "warnGm"
  | "authorizeRemoval"
  | "adminRemoveGm"
  | "markVacant"
  | "initializeFantasyDraft"
  | "startFantasyDraft"
  | "completeFantasyDraftIfReady"
  | "autoDraftNextFantasyDraft"
  | "autoDraftToEndFantasyDraft"
  | "resetFantasyDraft";

export type OnlineAdminActionInput = {
  action: OnlineAdminActionName;
  backendMode?: "local" | "firebase";
  leagueId?: string;
  targetUserId?: string;
  name?: string;
  maxUsers?: number;
  startWeek?: number;
  reason?: string;
  message?: string;
  deadlineAt?: string;
  season?: number;
  week?: number;
  localState?: LocalAdminStateInput;
};

export type OnlineAdminActionResult = {
  ok: true;
  message: string;
  league?: OnlineLeague | null;
  leagues?: OnlineLeague[];
  simulation?: OnlineLeagueWeekSimulationSummary;
  localState?: ReturnType<LocalAdminMemoryStorage["toLocalState"]>;
};

class OnlineAdminActionValidationError extends Error {}

const ADMIN_CREATE_LEAGUE_MIN_USERS = 2;
const ADMIN_CREATE_LEAGUE_MAX_USERS = 32;
const ADMIN_CREATE_LEAGUE_NAME_MIN_LENGTH = 3;
const ADMIN_CREATE_LEAGUE_NAME_MAX_LENGTH = 60;
const ADMIN_EXPANSION_TEAM_POOL: OnlineLeagueTeam[] = [
  { id: "austin-comets", name: "Austin Comets", abbreviation: "AUS" },
  { id: "charlotte-copperheads", name: "Charlotte Copperheads", abbreviation: "CHA" },
  { id: "columbus-forge", name: "Columbus Forge", abbreviation: "COL" },
  { id: "memphis-riverhawks", name: "Memphis Riverhawks", abbreviation: "MEM" },
  { id: "okc-mustangs", name: "Oklahoma City Mustangs", abbreviation: "OKC" },
  { id: "raleigh-redwoods", name: "Raleigh Redwoods", abbreviation: "RAL" },
  { id: "salt-lake-sentinels", name: "Salt Lake Sentinels", abbreviation: "SLS" },
  { id: "san-antonio-voyagers", name: "San Antonio Voyagers", abbreviation: "SAV" },
  { id: "birmingham-steel", name: "Birmingham Steel", abbreviation: "BIR" },
  { id: "omaha-pioneers", name: "Omaha Pioneers", abbreviation: "OMA" },
  { id: "tulsa-tempest", name: "Tulsa Tempest", abbreviation: "TUL" },
  { id: "boise-summit", name: "Boise Summit", abbreviation: "BOI" },
  { id: "madison-monarchs", name: "Madison Monarchs", abbreviation: "MAD" },
  { id: "des-moines-aviators", name: "Des Moines Aviators", abbreviation: "DSM" },
  { id: "richmond-rapids", name: "Richmond Rapids", abbreviation: "RIC" },
  { id: "hartford-harbor", name: "Hartford Harbor", abbreviation: "HAR" },
];

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createLeagueId(name: string) {
  const slug = slugify(name) || "online-liga";
  return createSeededId(slug, `admin-league:${slug}:${nowIso()}`, 6);
}

function getAdminLeagueTeamPool(maxTeams: number) {
  return [...ONLINE_MVP_TEAM_POOL, ...ADMIN_EXPANSION_TEAM_POOL].slice(0, maxTeams);
}

function requireCreateLeagueName(input: OnlineAdminActionInput) {
  const name = input.name?.trim() ?? "";

  if (!name) {
    throw new OnlineAdminActionValidationError("Liga Name ist erforderlich.");
  }

  if (name.length < ADMIN_CREATE_LEAGUE_NAME_MIN_LENGTH) {
    throw new OnlineAdminActionValidationError(
      `Liga Name muss mindestens ${ADMIN_CREATE_LEAGUE_NAME_MIN_LENGTH} Zeichen lang sein.`,
    );
  }

  if (name.length > ADMIN_CREATE_LEAGUE_NAME_MAX_LENGTH) {
    throw new OnlineAdminActionValidationError(
      `Liga Name darf maximal ${ADMIN_CREATE_LEAGUE_NAME_MAX_LENGTH} Zeichen lang sein.`,
    );
  }

  return name;
}

function requireCreateLeagueMaxUsers(input: OnlineAdminActionInput) {
  const maxUsers = input.maxUsers;

  if (typeof maxUsers !== "number" || !Number.isFinite(maxUsers) || Math.floor(maxUsers) !== maxUsers) {
    throw new OnlineAdminActionValidationError("Max Spieler muss eine ganze Zahl sein.");
  }

  if (maxUsers < ADMIN_CREATE_LEAGUE_MIN_USERS || maxUsers > ADMIN_CREATE_LEAGUE_MAX_USERS) {
    throw new OnlineAdminActionValidationError(
      `Max Spieler muss zwischen ${ADMIN_CREATE_LEAGUE_MIN_USERS} und ${ADMIN_CREATE_LEAGUE_MAX_USERS} liegen.`,
    );
  }

  return maxUsers;
}

function requireLeagueId(input: OnlineAdminActionInput) {
  if (!input.leagueId?.trim() || !isSafeAdminEntityId(input.leagueId)) {
    throw new OnlineAdminActionValidationError("Liga-ID fehlt.");
  }

  return input.leagueId;
}

function requireTargetUserId(input: OnlineAdminActionInput) {
  if (!input.targetUserId?.trim() || !isSafeAdminEntityId(input.targetUserId)) {
    throw new OnlineAdminActionValidationError("Zielspieler fehlt.");
  }

  return input.targetUserId;
}

function requireExpectedSimulationStep(input: OnlineAdminActionInput) {
  const expectedStep = normalizeExpectedAdminSimulationStep(input);

  if (!expectedStep) {
    throw new OnlineAdminActionValidationError(
      "Simulationsziel fehlt. Bitte lade die Admin-Liga neu.",
    );
  }

  return expectedStep;
}

function requireReason(input: OnlineAdminActionInput) {
  if (!input.reason?.trim()) {
    throw new OnlineAdminActionValidationError("Für diese Admin-Aktion ist ein Grund erforderlich.");
  }

  return input.reason.trim();
}

function createEvent(
  type: string,
  actor: AdminActionActor,
  payload: Record<string, unknown> = {},
): FirestoreOnlineEventDoc {
  return {
    type,
    createdAt: nowIso(),
    createdByUserId: actor.adminUserId,
    payload,
  };
}

async function markFirestoreWeekSimulationFailed(input: {
  actor: AdminActionActor;
  error: OnlineLeagueWeekSimulationError;
  failedAt: string;
  leagueId: string;
  lockRef: DocumentReference;
  season: number;
  week: number;
}) {
  const firestore = getFirebaseAdminFirestore();

  await firestore.runTransaction(async (transaction) => {
    const lockSnapshot = await transaction.get(input.lockRef);
    const lockStatus = lockSnapshot.exists
      ? getOnlineLeagueSimulationLockStatus(lockSnapshot.data())
      : "idle";

    if (lockStatus === "simulated" || lockStatus === "simulating") {
      return;
    }

    transaction.set(
      input.lockRef,
      {
        action: "simulateWeek",
        adminSessionId: input.actor.adminSessionId,
        adminUserId: input.actor.adminUserId,
        errorCode: input.error.code,
        errorMessage: input.error.message,
        failedAt: input.failedAt,
        leagueId: input.leagueId,
        season: input.season,
        status: "failed",
        week: input.week,
      },
      { merge: true },
    );
  });
}

async function mapFirestoreLeague(leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const draftRef = getFirestoreDraftRef(leagueId);
  const [leagueSnapshot, membershipsSnapshot, teamsSnapshot, eventsSnapshot, draftSnapshot, draftPicksSnapshot, availablePlayersSnapshot] = await Promise.all([
    leagueRef.get(),
    leagueRef.collection("memberships").get(),
    leagueRef.collection("teams").get(),
    firestore
      .collection("leagues")
      .doc(leagueId)
      .collection("events")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
    draftRef.get(),
    draftRef.collection("picks").get(),
    draftRef.collection("availablePlayers").get(),
  ]);

  if (!leagueSnapshot.exists) {
    return null;
  }

  return mapFirestoreSnapshotToOnlineLeague({
    league: leagueSnapshot.data() as FirestoreOnlineLeagueDoc,
    memberships: membershipsSnapshot.docs.map(
      (snapshot) => snapshot.data() as FirestoreOnlineMembershipDoc,
    ),
    teams: teamsSnapshot.docs.map((snapshot) => snapshot.data() as FirestoreOnlineTeamDoc),
    events: eventsSnapshot.docs.map((snapshot) => snapshot.data() as FirestoreOnlineEventDoc),
    draftState: draftSnapshot.exists
      ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
      : undefined,
    draftPicks: draftPicksSnapshot.docs.map(
      (snapshot) => snapshot.data() as FirestoreOnlineDraftPickDoc,
    ),
    draftAvailablePlayers: availablePlayersSnapshot.docs.map(
      (snapshot) => snapshot.data() as FirestoreOnlineDraftAvailablePlayerDoc,
    ),
  });
}

async function listFirestoreAdminLeagues() {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore
    .collection("leagues")
    .where("settings.onlineBackbone", "==", true)
    .get();
  const leagues = await Promise.all(snapshot.docs.map((document) => mapFirestoreLeague(document.id)));

  return leagues
    .filter((league): league is OnlineLeague => Boolean(league))
    .sort((left, right) => {
      const leftCreatedAt = left.createdAt ?? "";
      const rightCreatedAt = right.createdAt ?? "";

      return rightCreatedAt.localeCompare(leftCreatedAt);
    });
}

function getFirestoreDraftRef(leagueId: string) {
  return getFirebaseAdminFirestore()
    .collection("leagues")
    .doc(leagueId)
    .collection("draft")
    .doc("main");
}

function createDraftRunId(leagueId: string, createdAt: string) {
  return createSeededId("draft-run", `${leagueId}:${createdAt}`, 8);
}

function toFirestoreDraftStateDoc(
  state: OnlineFantasyDraftState,
  draftRunId: string,
): FirestoreOnlineDraftStateDoc {
  return {
    leagueId: state.leagueId,
    status: state.status,
    round: state.round,
    pickNumber: state.pickNumber,
    currentTeamId: state.currentTeamId,
    draftOrder: state.draftOrder,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    draftRunId,
  };
}

function toFirestoreAvailablePlayerDoc(
  player: OnlineContractPlayer,
  draftRunId: string,
): FirestoreOnlineDraftAvailablePlayerDoc {
  return {
    ...player,
    displayName: player.playerName,
    draftRunId,
  };
}

function toFirestoreDraftPickDoc(
  pick: OnlineFantasyDraftPick,
  player: OnlineContractPlayer,
  draftRunId: string,
): FirestoreOnlineDraftPickDoc {
  return {
    ...pick,
    draftRunId,
    playerSnapshot: player,
  };
}

async function writeFirestoreDraftPlayerPool(
  leagueId: string,
  playerPool: OnlineContractPlayer[],
  draftRunId: string,
) {
  const firestore = getFirebaseAdminFirestore();
  const draftRef = getFirestoreDraftRef(leagueId);
  const chunkSize = 400;

  for (let index = 0; index < playerPool.length; index += chunkSize) {
    const batch = firestore.batch();
    playerPool.slice(index, index + chunkSize).forEach((player) => {
      batch.set(
        draftRef.collection("availablePlayers").doc(player.playerId),
        toFirestoreAvailablePlayerDoc(player, draftRunId),
      );
    });
    await batch.commit();
  }
}

function setFirestoreDraftState(
  writer: Transaction | WriteBatch,
  leagueId: string,
  state: OnlineFantasyDraftState,
  draftRunId: string,
) {
  (writer as WriteBatch).set(getFirestoreDraftRef(leagueId), toFirestoreDraftStateDoc(state, draftRunId), {
    merge: true,
  });
}

function getLegacyFirestoreFantasyDraftState(league: FirestoreOnlineLeagueDoc): OnlineFantasyDraftState | null {
  return getFirestoreFantasyDraftState(league);
}

function getLegacyFirestoreFantasyDraftPlayerPool(league: FirestoreOnlineLeagueDoc): OnlineContractPlayer[] {
  return getFirestoreFantasyDraftPlayerPool(league);
}

async function applyFirestoreAdminAutoDraftPick(
  leagueId: string,
  actor: AdminActionActor,
): Promise<string> {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const mappedLeague = await mapFirestoreLeague(leagueId);
  const player = mappedLeague ? getBestAdminAutoDraftPlayer(mappedLeague) : null;
  const draftTeamId = mappedLeague?.fantasyDraft?.currentTeamId ?? "";
  const draftUser = mappedLeague ? getCurrentDraftUser(mappedLeague) : null;
  const draftRef = getFirestoreDraftRef(leagueId);

  if (!mappedLeague || !player || !draftTeamId || !draftUser) {
    return "Auto-Draft konnte keinen gueltigen Pick finden.";
  }

  return firestore.runTransaction(async (transaction) => {
    const [leagueSnapshot, draftSnapshot, availablePlayerSnapshot] = await Promise.all([
      transaction.get(leagueRef),
      transaction.get(draftRef),
      transaction.get(draftRef.collection("availablePlayers").doc(player.playerId)),
    ]);
    const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

    if (!league) {
      throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
    }

    const state =
      (draftSnapshot.exists ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc) : null) ??
      getLegacyFirestoreFantasyDraftState(league);

    if (!state || state.status !== "active") {
      return "Fantasy Draft ist nicht aktiv.";
    }

    const playerPool = mappedLeague.fantasyDraftPlayerPool ?? getLegacyFirestoreFantasyDraftPlayerPool(league);
    const draftRunId = "draftRunId" in state && typeof state.draftRunId === "string"
      ? state.draftRunId
      : createDraftRunId(leagueId, state.startedAt ?? nowIso());

    if (
      state.currentTeamId !== draftTeamId ||
      !mappedLeague.fantasyDraft?.availablePlayerIds.includes(player.playerId) ||
      !availablePlayerSnapshot.exists ||
      mappedLeague.fantasyDraft.picks.some((pick) => pick.playerId === player.playerId)
    ) {
      return "Draft-State wurde zwischenzeitlich aktualisiert. Bitte erneut ausfuehren.";
    }

    const now = nowIso();
    const pick: OnlineFantasyDraftPick = {
      pickNumber: state.pickNumber,
      round: state.round,
      teamId: state.currentTeamId,
      playerId: player.playerId,
      pickedByUserId: draftUser.userId,
      timestamp: now,
    };
    const currentState = mappedLeague.fantasyDraft;

    if (!currentState) {
      return "Fantasy Draft ist nicht aktiv.";
    }

    const pickedState: OnlineFantasyDraftState = {
      ...currentState,
      picks: [...currentState.picks, pick],
      availablePlayerIds: currentState.availablePlayerIds.filter((candidate) => candidate !== player.playerId),
    };
    const nextState = getNextAdminDraftState(pickedState, playerPool, now);

    transaction.set(
      draftRef.collection("picks").doc(String(pick.pickNumber).padStart(4, "0")),
      toFirestoreDraftPickDoc(pick, player, draftRunId),
    );
    transaction.delete(draftRef.collection("availablePlayers").doc(player.playerId));
    transaction.set(draftRef, toFirestoreDraftStateDoc(nextState, draftRunId), { merge: true });
    transaction.update(leagueRef, { updatedAt: now, version: FieldValue.increment(1) });
    transaction.set(
      leagueRef.collection("events").doc(),
      createEvent("draft_pick_made", actor, {
        teamId: pick.teamId,
        playerId: pick.playerId,
        playerName: player.playerName,
        pickNumber: pick.pickNumber,
        autoDraft: true,
      }),
    );

    if (nextState.status === "completed") {
      const playersById = new Map(playerPool.map((candidate) => [candidate.playerId, candidate]));

      nextState.draftOrder.forEach((teamId) => {
        const roster = nextState.picks
          .filter((candidate) => candidate.teamId === teamId)
          .sort((left, right) => left.pickNumber - right.pickNumber)
          .map((candidate) => playersById.get(candidate.playerId))
          .filter((candidate): candidate is OnlineContractPlayer => Boolean(candidate));

        transaction.update(leagueRef.collection("teams").doc(teamId), {
          contractRoster: roster,
          depthChart: createAdminDraftDepthChart(roster, now),
          updatedAt: now,
        });
      });
      transaction.update(leagueRef, {
        status: "active",
        currentWeek: 1,
        currentSeason: 1,
        updatedAt: now,
        version: FieldValue.increment(1),
      });
    }

    return nextState.status === "completed"
      ? "Auto-Draft Pick gespeichert. Fantasy Draft abgeschlossen."
      : "Auto-Draft Pick gespeichert.";
  });
}

function getFirestoreFantasyDraftStatus(
  league: FirestoreOnlineLeagueDoc,
): "not_started" | "active" | "completed" | null {
  const fantasyDraft = league.settings.fantasyDraft;

  if (typeof fantasyDraft !== "object" || fantasyDraft === null || !("status" in fantasyDraft)) {
    return null;
  }

  const status = fantasyDraft.status;

  return status === "not_started" || status === "active" || status === "completed"
    ? status
    : null;
}

function getFirestoreFantasyDraftState(league: FirestoreOnlineLeagueDoc): OnlineFantasyDraftState | null {
  const value = league.settings.fantasyDraft as Partial<OnlineFantasyDraftState> | undefined;

  if (
    !value ||
    typeof value.leagueId !== "string" ||
    (value.status !== "not_started" && value.status !== "active" && value.status !== "completed") ||
    typeof value.round !== "number" ||
    typeof value.pickNumber !== "number" ||
    typeof value.currentTeamId !== "string" ||
    !Array.isArray(value.draftOrder) ||
    !Array.isArray(value.picks) ||
    !Array.isArray(value.availablePlayerIds)
  ) {
    return null;
  }

  return value as OnlineFantasyDraftState;
}

function getFirestoreFantasyDraftPlayerPool(league: FirestoreOnlineLeagueDoc): OnlineContractPlayer[] {
  return Array.isArray(league.settings.fantasyDraftPlayerPool)
    ? (league.settings.fantasyDraftPlayerPool as OnlineContractPlayer[])
    : createFantasyDraftPlayerPool(league.id, league.maxTeams);
}

function isDevelopmentOrTestRuntime() {
  return process.env.NODE_ENV !== "production";
}

function getFantasyDraftPlayersById(league: OnlineLeague) {
  return new Map((league.fantasyDraftPlayerPool ?? []).map((player) => [player.playerId, player]));
}

function getFantasyDraftNeededPosition(league: OnlineLeague, teamId: string) {
  const draft = league.fantasyDraft;

  if (!draft) {
    return null;
  }

  const playersById = getFantasyDraftPlayersById(league);
  const teamPicks = draft.picks.filter((pick) => pick.teamId === teamId);

  return (
    ONLINE_FANTASY_DRAFT_POSITIONS.find((position) => {
      const count = teamPicks.filter(
        (pick) => playersById.get(pick.playerId)?.position === position,
      ).length;

      return count < ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position];
    }) ?? null
  );
}

function getBestAdminAutoDraftPlayer(league: OnlineLeague): OnlineContractPlayer | null {
  const draft = league.fantasyDraft;

  if (!draft || draft.status !== "active" || !draft.currentTeamId) {
    return null;
  }

  const neededPosition = getFantasyDraftNeededPosition(league, draft.currentTeamId);
  const availableIds = new Set(draft.availablePlayerIds);
  const candidates = (league.fantasyDraftPlayerPool ?? [])
    .filter((player) => availableIds.has(player.playerId))
    .filter((player) => !neededPosition || player.position === neededPosition)
    .sort((left, right) => right.overall - left.overall || left.age - right.age);

  if (candidates[0]) {
    return candidates[0];
  }

  return (league.fantasyDraftPlayerPool ?? [])
    .filter((player) => availableIds.has(player.playerId))
    .sort((left, right) => right.overall - left.overall || left.age - right.age)[0] ?? null;
}

function getCurrentDraftUser(league: OnlineLeague) {
  return league.users.find((user) => user.teamId === league.fantasyDraft?.currentTeamId) ?? null;
}

function resetFantasyDraftState(league: OnlineLeague): OnlineLeague {
  return {
    ...league,
    fantasyDraft: createInitialFantasyDraftState(league.id, league.maxUsers),
    fantasyDraftPlayerPool: createFantasyDraftPlayerPool(league.id, league.maxUsers),
    status: "waiting",
    weekStatus: "pre_week",
    currentWeek: 1,
    currentSeason: 1,
    lastSimulatedWeekKey: undefined,
    matchResults: [],
    completedWeeks: [],
    users: league.users.map((user) => ({
      ...user,
      contractRoster: [],
      depthChart: [],
      readyForWeek: false,
    })),
  };
}

function getDraftPositionCounts(
  teamId: string,
  picks: OnlineFantasyDraftPick[],
  playersById: Map<string, OnlineContractPlayer>,
) {
  return ONLINE_FANTASY_DRAFT_POSITIONS.map((position) => ({
    position,
    count: picks.filter(
      (pick) => pick.teamId === teamId && playersById.get(pick.playerId)?.position === position,
    ).length,
  }));
}

function hasCompletedDraftRoster(
  teamId: string,
  picks: OnlineFantasyDraftPick[],
  playersById: Map<string, OnlineContractPlayer>,
) {
  return getDraftPositionCounts(teamId, picks, playersById).every(
    (entry) => entry.count >= ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[entry.position],
  );
}

function getSnakeDraftTeamId(draftOrder: string[], pickIndex: number) {
  if (draftOrder.length === 0) {
    return "";
  }

  const roundIndex = Math.floor(pickIndex / draftOrder.length);
  const indexInRound = pickIndex % draftOrder.length;
  const order = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();

  return order[indexInRound] ?? "";
}

function getNextAdminDraftState(
  state: OnlineFantasyDraftState,
  playerPool: OnlineContractPlayer[],
  now: string,
): OnlineFantasyDraftState {
  const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
  const completed = state.draftOrder.length > 0 &&
    state.draftOrder.every((teamId) => hasCompletedDraftRoster(teamId, state.picks, playersById));

  if (completed) {
    return {
      ...state,
      status: "completed",
      currentTeamId: "",
      completedAt: state.completedAt ?? now,
    };
  }

  const nextPickIndex = state.picks.length;

  return {
    ...state,
    status: "active",
    round: Math.floor(nextPickIndex / Math.max(1, state.draftOrder.length)) + 1,
    pickNumber: nextPickIndex + 1,
    currentTeamId: getSnakeDraftTeamId(state.draftOrder, nextPickIndex),
  };
}

function createAdminDraftDepthChart(roster: OnlineContractPlayer[], now: string) {
  const positions = Array.from(new Set(roster.map((player) => player.position)));

  return positions.map((position) => {
    const players = roster
      .filter((player) => player.position === position)
      .sort((left, right) => right.overall - left.overall);

    return {
      position,
      starterPlayerId: players[0]?.playerId ?? "",
      backupPlayerIds: players.slice(1).map((player) => player.playerId),
      updatedAt: now,
    };
  });
}

async function addFirestoreAdminLog(
  leagueId: string,
  actor: AdminActionActor,
  action: string,
  payload: Record<string, unknown> = {},
) {
  const firestore = getFirebaseAdminFirestore();
  await firestore.collection("leagues").doc(leagueId).collection("adminLogs").add({
    action,
    createdAt: nowIso(),
    adminSessionId: actor.adminSessionId,
    adminUserId: actor.adminUserId,
    payload,
  });
}

async function executeFirebaseAction(
  input: OnlineAdminActionInput,
  actor: AdminActionActor,
): Promise<OnlineAdminActionResult> {
  const firestore = getFirebaseAdminFirestore();

  if (input.action === "listLeagues") {
    return {
      ok: true,
      message: "Ligen geladen.",
      leagues: await listFirestoreAdminLeagues(),
    };
  }

  if (input.action === "getLeague") {
    const league = await mapFirestoreLeague(requireLeagueId(input));

    return {
      ok: true,
      message: league ? "Liga geladen." : "Liga konnte nicht gefunden werden.",
      league,
    };
  }

  if (input.action === "createLeague") {
    const name = requireCreateLeagueName(input);
    const leagueId = createLeagueId(name);
    const maxTeams = requireCreateLeagueMaxUsers(input);
    const teamPool = getAdminLeagueTeamPool(maxTeams);
    const schedule = canCreateOnlineLeagueSchedule(teamPool)
      ? createOnlineLeagueSchedule(leagueId, teamPool)
      : [];
    const currentWeek = normalizeBoundedAdminInteger(input.startWeek, 1, 1, 18);
    const createdAt = nowIso();
    const batch = firestore.batch();
    const leagueRef = firestore.collection("leagues").doc(leagueId);

    batch.set(leagueRef, {
      id: leagueId,
      name,
      status: "lobby",
      createdByUserId: actor.adminUserId,
      createdAt,
      updatedAt: createdAt,
      maxTeams,
      memberCount: 0,
      currentWeek,
      currentSeason: 1,
      weekStatus: "pre_week",
      settings: {
        onlineBackbone: true,
      },
      schedule,
      version: 1,
    } satisfies FirestoreOnlineLeagueDoc);
    const initialDraftState = createInitialFantasyDraftState(leagueId, maxTeams);
    const initialPlayerPool = createFantasyDraftPlayerPool(leagueId, maxTeams);
    const draftRunId = createDraftRunId(leagueId, createdAt);

    setFirestoreDraftState(batch, leagueId, initialDraftState, draftRunId);
    teamPool.forEach((team) => {
      batch.set(
        leagueRef.collection("teams").doc(team.id),
        mapLocalTeamToFirestoreTeam(team, createdAt),
      );
    });
    batch.set(leagueRef.collection("events").doc(), createEvent("league_created", actor, { name }));
    batch.set(leagueRef.collection("adminLogs").doc(), {
      action: "createLeague",
      createdAt,
      adminSessionId: actor.adminSessionId,
      adminUserId: actor.adminUserId,
      payload: {
        name,
        maxTeams,
      },
    });
    await batch.commit();
    await writeFirestoreDraftPlayerPool(leagueId, initialPlayerPool, draftRunId);

    return {
      ok: true,
      message: `${name} wurde erstellt.`,
      league: await mapFirestoreLeague(leagueId),
    };
  }

  const leagueId = requireLeagueId(input);
  const leagueRef = firestore.collection("leagues").doc(leagueId);

  switch (input.action) {
    case "deleteLeague": {
      const reason = input.reason?.trim() || "Archived from Admin Control Center";
      const result = await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        if (league.status === "archived") {
          return {
            message: "Liga war bereits archiviert.",
          };
        }

        transaction.update(leagueRef, {
          status: "archived",
          updatedAt: nowIso(),
          version: FieldValue.increment(1),
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("league_archived", actor, { reason }),
        );

        return {
          message: "Liga wurde archiviert.",
        };
      });
      await addFirestoreAdminLog(leagueId, actor, "archiveLeague", { reason });

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    case "resetLeague": {
      const createdAt = nowIso();
      const leagueSnapshot = await leagueRef.get();
      const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

      if (!league) {
        throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
      }

      const [memberships, teams] = await Promise.all([
        leagueRef.collection("memberships").get(),
        leagueRef.collection("teams").get(),
      ]);
      const batch = firestore.batch();
      memberships.docs.forEach((membership) => {
        const data = membership.data() as FirestoreOnlineMembershipDoc;
        if (data.role !== "admin") {
          batch.delete(membership.ref);
        } else {
          batch.update(membership.ref, { ready: false, teamId: "" });
        }
      });
      teams.docs.forEach((team) => {
        batch.update(team.ref, {
          assignedUserId: null,
          status: "available",
          updatedAt: createdAt,
        });
      });
      batch.update(leagueRef, {
        memberCount: 0,
        currentWeek: 1,
        currentSeason: 1,
        status: "lobby",
        "settings.onlineBackbone": true,
        "settings.fantasyDraft": FieldValue.delete(),
        "settings.fantasyDraftPlayerPool": FieldValue.delete(),
        updatedAt: createdAt,
        version: FieldValue.increment(1),
      });
      const draftState = createInitialFantasyDraftState(leagueId, league.maxTeams);
      const playerPool = createFantasyDraftPlayerPool(leagueId, league.maxTeams);
      const draftRunId = createDraftRunId(leagueId, createdAt);

      setFirestoreDraftState(batch, leagueId, draftState, draftRunId);
	      batch.set(leagueRef.collection("adminLogs").doc(), {
	        action: "resetLeague",
	        createdAt,
	        adminSessionId: actor.adminSessionId,
	        adminUserId: actor.adminUserId,
	        reason: input.reason?.trim() || "Reset from Admin Control Center",
      });
      batch.set(leagueRef.collection("events").doc(), createEvent("league_reset", actor));
      await batch.commit();
      await writeFirestoreDraftPlayerPool(leagueId, playerPool, draftRunId);
      return { ok: true, message: "Liga wurde zurückgesetzt.", league: await mapFirestoreLeague(leagueId) };
    }
    case "setAllReady": {
      const ready = true;
      const createdAt = nowIso();
      const result = await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);

        if (!leagueSnapshot.exists) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        const memberships = await transaction.get(leagueRef.collection("memberships"));
        let updatedMembers = 0;

        memberships.docs.forEach((membership) => {
          const data = membership.data() as FirestoreOnlineMembershipDoc;
          if (data.status === "active" && data.teamId && !data.ready) {
            updatedMembers += 1;
            transaction.update(membership.ref, { ready, lastSeenAt: createdAt });
          }
        });

        if (updatedMembers === 0) {
          return {
            message: "Alle Spieler waren bereits ready.",
          };
        }

        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "setAllReady",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
          payload: { ready, updatedMembers },
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("admin_set_all_ready", actor, { ready, updatedMembers }),
        );

        return {
          message: "Alle Spieler wurden auf Ready gesetzt.",
        };
      });

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    case "startLeague": {
      const createdAt = nowIso();
      const result = await firestore.runTransaction(async (transaction) => {
        const draftRef = getFirestoreDraftRef(leagueId);
        const [leagueSnapshot, draftSnapshot] = await Promise.all([
          transaction.get(leagueRef),
          transaction.get(draftRef),
        ]);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        if (league.status === "active") {
          return {
            message: "Liga war bereits gestartet.",
          };
        }

        if (league.status !== "lobby" || league.memberCount < 2) {
          throw new OnlineAdminActionValidationError("Liga kann noch nicht gestartet werden.");
        }

        const draftDoc = draftSnapshot.exists
          ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
          : null;
        const existingDraftStatus = draftDoc?.status ?? getFirestoreFantasyDraftStatus(league);

        if (existingDraftStatus === "active") {
          return {
            message: "Fantasy Draft war bereits gestartet.",
          };
        }

        if (existingDraftStatus === "completed") {
          transaction.update(leagueRef, {
            status: "active",
            currentWeek: 1,
            currentSeason: 1,
            updatedAt: createdAt,
            version: FieldValue.increment(1),
          });
          transaction.set(leagueRef.collection("weeks").doc("s1-w1"), {
            season: 1,
            week: 1,
            status: "pre_week",
            startedAt: createdAt,
          });

          return {
            message: "Liga wurde gestartet.",
          };
        }

        const memberships = await transaction.get(leagueRef.collection("memberships"));
        const activeTeamIds = new Set(
          memberships.docs
            .map((membership) => membership.data() as FirestoreOnlineMembershipDoc)
            .filter((membership) => membership.status === "active" && membership.teamId)
            .map((membership) => membership.teamId),
        );
        const draftOrder = getAdminLeagueTeamPool(league.maxTeams)
          .map((team) => team.id)
          .filter((teamId) => activeTeamIds.has(teamId));
        const legacyPlayerPool = getLegacyFirestoreFantasyDraftPlayerPool(league);
        const draftState = {
          ...createInitialFantasyDraftState(leagueId, league.maxTeams),
          status: "active" as const,
          draftOrder,
          currentTeamId: draftOrder[0] ?? "",
          availablePlayerIds: legacyPlayerPool.map((player) => player.playerId),
          startedAt: createdAt,
        };
        const draftRunId = draftDoc?.draftRunId ?? createDraftRunId(leagueId, createdAt);

        if (draftOrder.length < 2) {
          throw new OnlineAdminActionValidationError("Fantasy Draft benoetigt mindestens zwei Teams.");
        }

        transaction.set(draftRef, toFirestoreDraftStateDoc(draftState, draftRunId), { merge: true });
        transaction.update(leagueRef, {
          currentWeek: 1,
          currentSeason: 1,
          "settings.fantasyDraft": FieldValue.delete(),
          "settings.fantasyDraftPlayerPool": FieldValue.delete(),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "startLeague",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("fantasy_draft_started", actor, { draftOrder }),
        );

        return {
          message: "Fantasy Draft wurde gestartet.",
          playerPoolToWrite: {
            playerPool: legacyPlayerPool,
            draftRunId,
          },
        };
      });
      const playerPoolToWrite = "playerPoolToWrite" in result ? result.playerPoolToWrite : null;

      if (playerPoolToWrite) {
        await writeFirestoreDraftPlayerPool(
          leagueId,
          playerPoolToWrite.playerPool,
          playerPoolToWrite.draftRunId,
        );
      }

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    case "simulateWeek": {
      const expectedStep = requireExpectedSimulationStep(input);
      const createdAt = nowIso();
      const lockRef = leagueRef
        .collection("adminActionLocks")
        .doc(createAdminSimulationLockId(leagueId, expectedStep.season, expectedStep.week));
      let simulation: OnlineLeagueWeekSimulationSummary;

      try {
        simulation = await firestore.runTransaction(async (transaction) => {
        const draftRef = getFirestoreDraftRef(leagueId);
        const [leagueSnapshot, draftSnapshot] = await Promise.all([
          transaction.get(leagueRef),
          transaction.get(draftRef),
        ]);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;
        const draftDoc = draftSnapshot.exists
          ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
          : null;
        const memberships = await transaction.get(leagueRef.collection("memberships"));
        const teams = await transaction.get(leagueRef.collection("teams"));
        const membershipDocs = memberships.docs.map(
          (membership) => membership.data() as FirestoreOnlineMembershipDoc,
        );
        const teamDocs = teams.docs.map((team) => team.data() as FirestoreOnlineTeamDoc);

        const lockSnapshot = await transaction.get(lockRef);

        if (lockSnapshot.exists) {
          assertCanStartOnlineLeagueWeekSimulation(lockSnapshot.data());
        }

        const preparedSimulation = prepareOnlineLeagueWeekSimulation({
          actorUserId: actor.adminUserId,
          draftState: draftDoc,
          expectedSeason: expectedStep.season,
          expectedWeek: expectedStep.week,
          league,
          memberships: membershipDocs,
          now: createdAt,
          teams: teamDocs,
        });

        memberships.docs.forEach((membership) => {
          const data = membership.data() as FirestoreOnlineMembershipDoc;
          if (data.status === "active") {
            transaction.update(membership.ref, { ready: false });
          }
        });
        transaction.update(leagueRef, {
          completedWeeks: preparedSimulation.nextCompletedWeeks,
          currentSeason: preparedSimulation.nextSeason,
          currentWeek: preparedSimulation.nextWeek,
          lastSimulatedWeekKey: preparedSimulation.weekKey,
          matchResults: [...preparedSimulation.results, ...preparedSimulation.existingMatchResults],
          standings: preparedSimulation.standingsSummary,
          weekStatus: "pre_week",
          updatedAt: preparedSimulation.updatedAt,
          version: FieldValue.increment(1),
        });
        transaction.set(lockRef, {
          action: "simulateWeek",
          status: "simulated",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
          season: expectedStep.season,
          week: expectedStep.week,
        });
        transaction.set(
          leagueRef.collection("weeks").doc(`s${expectedStep.season}-w${expectedStep.week}`),
          {
            season: expectedStep.season,
            week: expectedStep.week,
            status: "completed",
            completedAt: preparedSimulation.updatedAt,
            simulatedByUserId: actor.adminUserId,
          },
          { merge: true },
        );
        transaction.set(
          leagueRef.collection("weeks").doc(`s${preparedSimulation.nextSeason}-w${preparedSimulation.nextWeek}`),
          {
            season: preparedSimulation.nextSeason,
            week: preparedSimulation.nextWeek,
            status: "pre_week",
            startedAt: preparedSimulation.updatedAt,
          },
          { merge: true },
        );
        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "simulateWeek",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
          payload: {
            previousSeason: expectedStep.season,
            previousWeek: expectedStep.week,
            nextSeason: preparedSimulation.nextSeason,
            nextWeek: preparedSimulation.nextWeek,
            resultCount: preparedSimulation.gamesSimulated,
          },
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("week_simulated", actor, {
            previousSeason: expectedStep.season,
            previousWeek: expectedStep.week,
            nextSeason: preparedSimulation.nextSeason,
            nextWeek: preparedSimulation.nextWeek,
            resultCount: preparedSimulation.gamesSimulated,
          }),
        );

        return preparedSimulation;
        });
      } catch (error) {
        if (
          error instanceof OnlineLeagueWeekSimulationError &&
          error.code !== "simulation_in_progress" &&
          error.code !== "week_already_simulated"
        ) {
          await markFirestoreWeekSimulationFailed({
            actor,
            error,
            failedAt: createdAt,
            leagueId,
            lockRef,
            season: expectedStep.season,
            week: expectedStep.week,
          });
        }

        throw error;
      }

      return {
        ok: true,
        message: `Die Woche wurde simuliert. ${simulation.gamesSimulated} Ergebnisse gespeichert, die nächste Week ist vorbereitet.`,
        league: await mapFirestoreLeague(leagueId),
        simulation,
      };
    }
    case "initializeFantasyDraft": {
      const createdAt = nowIso();
      let playerPool: OnlineContractPlayer[] = [];
      let draftRunId = "";
      await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        const draftState = createInitialFantasyDraftState(leagueId, league.maxTeams);
        playerPool = createFantasyDraftPlayerPool(leagueId, league.maxTeams);
        draftRunId = createDraftRunId(leagueId, createdAt);
        setFirestoreDraftState(transaction, leagueId, draftState, draftRunId);
        transaction.update(leagueRef, {
          status: "lobby",
          currentWeek: 1,
          currentSeason: 1,
          "settings.onlineBackbone": true,
          "settings.fantasyDraft": FieldValue.delete(),
          "settings.fantasyDraftPlayerPool": FieldValue.delete(),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("fantasy_draft_initialized", actor),
        );
      });
      await writeFirestoreDraftPlayerPool(leagueId, playerPool, draftRunId);

      return { ok: true, message: "Fantasy Draft wurde initialisiert.", league: await mapFirestoreLeague(leagueId) };
    }
    case "startFantasyDraft":
      return executeFirebaseAction({ ...input, action: "startLeague" }, actor);
    case "autoDraftNextFantasyDraft": {
      const message = await applyFirestoreAdminAutoDraftPick(leagueId, actor);

      return { ok: true, message, league: await mapFirestoreLeague(leagueId) };
    }
    case "autoDraftToEndFantasyDraft": {
      let picksMade = 0;
      let mappedLeague = await mapFirestoreLeague(leagueId);

      while (mappedLeague?.fantasyDraft?.status === "active") {
        const message = await applyFirestoreAdminAutoDraftPick(leagueId, actor);

        if (!message.includes("gespeichert")) {
          break;
        }

        picksMade += 1;
        mappedLeague = await mapFirestoreLeague(leagueId);
      }

      return {
        ok: true,
        message: `Auto-Draft ausgefuehrt: ${picksMade} Picks.`,
        league: mappedLeague,
      };
    }
    case "completeFantasyDraftIfReady": {
      const mappedLeague = await mapFirestoreLeague(leagueId);
      const message = await firestore.runTransaction(async (transaction) => {
        const draftRef = getFirestoreDraftRef(leagueId);
        const [leagueSnapshot, draftSnapshot] = await Promise.all([
          transaction.get(leagueRef),
          transaction.get(draftRef),
        ]);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        const draftDoc = draftSnapshot.exists
          ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
          : null;
        const state = mappedLeague?.fantasyDraft ?? getFirestoreFantasyDraftState(league);
        const playerPool = mappedLeague?.fantasyDraftPlayerPool ?? getFirestoreFantasyDraftPlayerPool(league);

        if (!state) {
          return "Fantasy Draft ist nicht initialisiert.";
        }

        if (draftDoc && draftDoc.pickNumber !== state.pickNumber) {
          return "Draft-State wurde zwischenzeitlich aktualisiert. Bitte erneut ausfuehren.";
        }

        const now = nowIso();
        const nextState = getNextAdminDraftState(state, playerPool, now);
        const draftRunId = draftDoc?.draftRunId ?? createDraftRunId(leagueId, state.startedAt ?? now);

        if (nextState.status !== "completed") {
          return "Fantasy Draft ist noch nicht vollstaendig.";
        }

        const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
        nextState.draftOrder.forEach((teamId) => {
          const roster = nextState.picks
            .filter((pick) => pick.teamId === teamId)
            .sort((left, right) => left.pickNumber - right.pickNumber)
            .map((pick) => playersById.get(pick.playerId))
            .filter((player): player is OnlineContractPlayer => Boolean(player));

          transaction.update(leagueRef.collection("teams").doc(teamId), {
            contractRoster: roster,
            depthChart: createAdminDraftDepthChart(roster, now),
            updatedAt: now,
          });
        });
        transaction.update(leagueRef, {
          status: "active",
          currentWeek: 1,
          currentSeason: 1,
          "settings.fantasyDraft": FieldValue.delete(),
          "settings.fantasyDraftPlayerPool": FieldValue.delete(),
          updatedAt: now,
          version: FieldValue.increment(1),
        });
        transaction.set(draftRef, toFirestoreDraftStateDoc(nextState, draftRunId), { merge: true });

        return "Fantasy Draft abgeschlossen. Liga ist bereit fuer Week 1.";
      });

      return { ok: true, message, league: await mapFirestoreLeague(leagueId) };
    }
    case "resetFantasyDraft": {
      if (!isDevelopmentOrTestRuntime()) {
        throw new OnlineAdminActionValidationError("Draft Reset ist nur in Development/Test erlaubt.");
      }

      const createdAt = nowIso();
      let playerPool: OnlineContractPlayer[] = [];
      let draftRunId = "";
      await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        const draftState = createInitialFantasyDraftState(leagueId, league.maxTeams);
        playerPool = createFantasyDraftPlayerPool(leagueId, league.maxTeams);
        draftRunId = createDraftRunId(leagueId, createdAt);
        setFirestoreDraftState(transaction, leagueId, draftState, draftRunId);
        transaction.update(leagueRef, {
          status: "lobby",
          currentWeek: 1,
          currentSeason: 1,
          "settings.onlineBackbone": true,
          "settings.fantasyDraft": FieldValue.delete(),
          "settings.fantasyDraftPlayerPool": FieldValue.delete(),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
      });
      await writeFirestoreDraftPlayerPool(leagueId, playerPool, draftRunId);

      return { ok: true, message: "Fantasy Draft wurde zurueckgesetzt.", league: await mapFirestoreLeague(leagueId) };
    }
    case "removePlayer": {
      const targetUserId = requireTargetUserId(input);
      const reason = input.reason?.trim() || "Removed from Admin Control Center";
      const membershipRef = leagueRef.collection("memberships").doc(targetUserId);
      const createdAt = nowIso();
      const result = await firestore.runTransaction(async (transaction) => {
        const membershipSnapshot = await transaction.get(membershipRef);
        const membership = membershipSnapshot.data() as FirestoreOnlineMembershipDoc | undefined;

        if (!membership || membership.status !== "active") {
          return {
            message: "Spieler war bereits entfernt.",
          };
        }

        transaction.update(membershipRef, {
          status: "removed",
          ready: false,
          lastSeenAt: createdAt,
        });
        if (membership.teamId) {
          transaction.update(leagueRef.collection("teams").doc(membership.teamId), {
            status: "vacant",
            assignedUserId: null,
            updatedAt: createdAt,
          });
        }
        transaction.update(leagueRef, {
          memberCount: FieldValue.increment(-1),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "removeMember",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
          targetUserId,
          targetTeamId: membership.teamId,
          reason,
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("gm_removed_by_admin", actor, { targetUserId, reason }),
        );

        return {
          message: "Spieler wurde entfernt.",
        };
      });

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    case "markVacant": {
      const targetUserId = requireTargetUserId(input);
      const reason = requireReason(input);
      const membershipRef = leagueRef.collection("memberships").doc(targetUserId);
      const createdAt = nowIso();
      const result = await firestore.runTransaction(async (transaction) => {
        const membership = await transaction.get(membershipRef);
        const membershipData = membership.data() as FirestoreOnlineMembershipDoc | undefined;

        if (!membershipData?.teamId || membershipData.status !== "active") {
          return {
            message: "Team war bereits vakant oder konnte nicht gefunden werden.",
          };
        }

        transaction.update(leagueRef.collection("teams").doc(membershipData.teamId), {
          status: "vacant",
          assignedUserId: null,
          updatedAt: createdAt,
        });
        transaction.update(membershipRef, {
          status: "removed",
          ready: false,
        });
        transaction.update(leagueRef, {
          memberCount: FieldValue.increment(-1),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "markTeamVacant",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
          targetUserId,
          targetTeamId: membershipData.teamId,
          reason,
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("team_marked_vacant", actor, { teamId: membershipData.teamId, reason }),
        );

        return {
          message: "Team wurde als vakant markiert.",
        };
      });

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    default:
      throw new OnlineAdminActionValidationError(
        "Diese Admin-Aktion ist im Firebase-Modus noch nicht serverseitig verfügbar.",
      );
  }
}

function executeLocalAction(
  input: OnlineAdminActionInput,
  actor: AdminActionActor,
): OnlineAdminActionResult {
  const storage = new LocalAdminMemoryStorage(input.localState);
  let league: OnlineLeague | null = null;
  let leagues: OnlineLeague[] | undefined;
  let message = "Admin-Aktion wurde ausgeführt.";
  let resetCurrentUser = false;

  switch (input.action) {
    case "listLeagues":
      leagues = getOnlineLeagues(storage);
      message = "Ligen geladen.";
      break;
    case "getLeague":
      league = getOnlineLeagueById(requireLeagueId(input), storage);
      message = league ? "Liga geladen." : "Liga konnte nicht gefunden werden.";
      break;
    case "createLeague":
      league = createOnlineLeague(
        {
          name: requireCreateLeagueName(input),
          maxUsers: requireCreateLeagueMaxUsers(input),
          startWeek: input.startWeek,
        },
        storage,
      );
      message = `${league.name} wurde erstellt.`;
      break;
    case "deleteLeague":
      leagues = deleteOnlineLeague(requireLeagueId(input), storage);
      message = "Liga wurde gelöscht.";
      break;
    case "resetLeague":
      league = resetOnlineLeague(requireLeagueId(input), storage);
      message = "Liga wurde zurückgesetzt.";
      break;
    case "debugDeleteAllLeagues":
      resetOnlineLeagues(storage);
      leagues = [];
      message = "Alle lokalen Ligen wurden gelöscht.";
      break;
    case "debugAddFakeUser":
      league = addFakeUserToOnlineLeague(storage);
      message = "Fake User wurde hinzugefügt.";
      break;
    case "debugFillLeague":
      league = fillOnlineLeagueWithFakeUsers(storage);
      message = "Liga wurde mit Debug-Spielern gefüllt.";
      break;
    case "debugSetAllReady":
      leagues = setAllOnlineLeaguesUsersReady(storage);
      message = "Alle Spieler wurden auf Ready gesetzt.";
      break;
    case "debugResetOnlineState":
      resetOnlineLeagues(storage);
      leagues = [];
      resetCurrentUser = true;
      message = "Online State wurde zurückgesetzt.";
      break;
    case "setAllReady":
      league = setAllOnlineLeagueUsersReady(requireLeagueId(input), storage);
      message = "Alle Spieler wurden auf Ready gesetzt.";
      break;
    case "startLeague":
      league = startOnlineLeague(requireLeagueId(input), storage);
      message = "Liga wurde gestartet.";
      break;
    case "initializeFantasyDraft":
      {
        const leagueId = requireLeagueId(input);
        const currentLeague = getOnlineLeagueById(leagueId, storage);

        league = currentLeague ? saveOnlineLeague(resetFantasyDraftState(currentLeague), storage) : null;
        message = "Fantasy Draft wurde initialisiert.";
      }
      break;
    case "startFantasyDraft":
      league = startOnlineFantasyDraft(requireLeagueId(input), storage);
      message = "Fantasy Draft wurde gestartet.";
      break;
    case "autoDraftNextFantasyDraft":
      {
        const leagueId = requireLeagueId(input);
        const currentLeague = getOnlineLeagueById(leagueId, storage);
        const player = currentLeague ? getBestAdminAutoDraftPlayer(currentLeague) : null;
        const user = currentLeague ? getCurrentDraftUser(currentLeague) : null;

        if (!currentLeague || !player || !user || !currentLeague.fantasyDraft) {
          league = currentLeague;
          message = "Auto-Draft konnte keinen gueltigen Pick finden.";
          break;
        }

        const result = makeOnlineFantasyDraftPick(
          leagueId,
          currentLeague.fantasyDraft.currentTeamId,
          player.playerId,
          user.userId,
          storage,
        );

        league = result.league;
        message = result.message;
      }
      break;
    case "autoDraftToEndFantasyDraft":
      {
        const leagueId = requireLeagueId(input);
        let currentLeague = getOnlineLeagueById(leagueId, storage);
        let picksMade = 0;

        while (currentLeague?.fantasyDraft?.status === "active") {
          const player = getBestAdminAutoDraftPlayer(currentLeague);
          const user = getCurrentDraftUser(currentLeague);

          if (!player || !user || !currentLeague.fantasyDraft.currentTeamId) {
            break;
          }

          const result = makeOnlineFantasyDraftPick(
            leagueId,
            currentLeague.fantasyDraft.currentTeamId,
            player.playerId,
            user.userId,
            storage,
          );

          if (result.status !== "success" && result.status !== "completed") {
            currentLeague = result.league;
            break;
          }

          currentLeague = result.league;
          picksMade += 1;
        }

        league = currentLeague;
        message = `Auto-Draft ausgefuehrt: ${picksMade} Picks.`;
      }
      break;
    case "completeFantasyDraftIfReady":
      league = completeOnlineFantasyDraftIfReady(requireLeagueId(input), storage);
      message =
        league?.fantasyDraft?.status === "completed"
          ? "Fantasy Draft abgeschlossen. Liga ist bereit fuer Week 1."
          : "Fantasy Draft ist noch nicht vollstaendig.";
      break;
    case "resetFantasyDraft":
      {
        if (!isDevelopmentOrTestRuntime()) {
          throw new OnlineAdminActionValidationError("Draft Reset ist nur in Development/Test erlaubt.");
        }

        const currentLeague = getOnlineLeagueById(requireLeagueId(input), storage);
        league = currentLeague ? saveOnlineLeague(resetFantasyDraftState(currentLeague), storage) : null;
        message = "Fantasy Draft wurde zurueckgesetzt.";
      }
      break;
    case "removePlayer":
      league = removeOnlineLeagueUser(requireLeagueId(input), requireTargetUserId(input), storage);
      message = "Spieler wurde aus der Liga entfernt.";
      break;
    case "simulateWeek":
      {
        const leagueId = requireLeagueId(input);
        const expectedStep = requireExpectedSimulationStep(input);
        const currentLeague = getOnlineLeagues(storage).find(
          (candidate) => candidate.id === leagueId,
        );

        if (!currentLeague) {
          league = null;
          message = "Liga konnte nicht gefunden werden.";
          break;
        }

        if ((currentLeague.currentSeason ?? 1) !== expectedStep.season || currentLeague.currentWeek !== expectedStep.week) {
          league = currentLeague;
          message = "Die Woche wurde bereits weitergeschaltet.";
          break;
        }

        const readyState = getOnlineLeagueWeekReadyState(currentLeague);

        if (!readyState.allReady) {
          league = currentLeague;
          message = "Week-Simulation ist gesperrt, bis alle aktiven Teams ready sind.";
          break;
        }

        league = simulateLocalOnlineLeagueWeek(leagueId, storage, {
          simulatedByUserId: actor.adminUserId,
        });
        message = "Die Woche wurde simuliert. Die nächste Week ist vorbereitet.";
      }
      break;
    case "applyRevenueSharing":
      league = applyOnlineRevenueSharing(requireLeagueId(input), storage);
      message = "Revenue Sharing wurde angewendet.";
      break;
    case "resetTrainingPlan":
      league = resetWeeklyTrainingPlan(
        requireLeagueId(input),
        requireTargetUserId(input),
        Math.max(1, Math.floor(input.season ?? 1)),
        Math.max(1, Math.floor(input.week ?? 1)),
        storage,
      );
      message = "Trainingsplan wurde zurückgesetzt.";
      break;
    case "recordMissedWeek":
      league = recordOnlineGmMissedWeek(requireLeagueId(input), requireTargetUserId(input), storage);
      message = "Verpasste Woche wurde erfasst.";
      break;
    case "warnGm":
      league = warnOnlineGm(
        requireLeagueId(input),
        requireTargetUserId(input),
        input.message ?? "",
        input.deadlineAt ?? "",
        storage,
      );
      message = "GM wurde verwarnt.";
      break;
    case "authorizeRemoval":
      league = authorizeOnlineGmRemoval(
        requireLeagueId(input),
        requireTargetUserId(input),
        requireReason(input),
        storage,
      );
      message = "Entlassung wurde ermächtigt.";
      break;
    case "adminRemoveGm":
      league = removeOnlineGmByAdmin(
        requireLeagueId(input),
        requireTargetUserId(input),
        requireReason(input),
        storage,
      );
      message = "GM wurde entfernt und das Team ist vakant.";
      break;
    case "markVacant":
      league = markOnlineTeamVacant(
        requireLeagueId(input),
        requireTargetUserId(input),
        requireReason(input),
        storage,
      );
      message = "Team wurde als vakant markiert.";
      break;
    default:
      throw new OnlineAdminActionValidationError("Unbekannte Admin-Aktion.");
  }

  return {
    ok: true,
    message,
    league,
    leagues: leagues ?? getOnlineLeagues(storage),
    localState: storage.toLocalState(resetCurrentUser),
  };
}

export async function simulateOnlineLeagueWeek(
  leagueId: string,
  actor: AdminActionActor,
  options: { expectedSeason?: number; expectedWeek?: number } = {},
) {
  const league = await mapFirestoreLeague(leagueId);

  if (!league) {
    throw new OnlineLeagueWeekSimulationError(
      "league_not_found",
      "Liga konnte nicht gefunden werden.",
    );
  }

  const result = await executeOnlineAdminAction(
    {
      action: "simulateWeek",
      backendMode: "firebase",
      leagueId,
      season: options.expectedSeason ?? league.currentSeason ?? 1,
      week: options.expectedWeek ?? league.currentWeek,
    },
    actor,
  );

  if (!result.simulation) {
    throw new OnlineLeagueWeekSimulationError(
      "simulation_failed",
      "Week-Simulation lieferte kein strukturiertes Ergebnis.",
    );
  }

  return result.simulation;
}

export async function executeOnlineAdminAction(
  input: OnlineAdminActionInput,
  actor: AdminActionActor,
): Promise<OnlineAdminActionResult> {
  if (!input.action) {
    throw new OnlineAdminActionValidationError("Admin-Aktion fehlt.");
  }

  if (input.backendMode === "firebase") {
    return executeFirebaseAction(input, actor);
  }

  return executeLocalAction(input, actor);
}

export function toOnlineAdminActionError(error: unknown) {
  if (error instanceof OnlineLeagueWeekSimulationError) {
    return {
      status: 400,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof OnlineAdminActionValidationError) {
    return {
      status: 400,
      code: "ADMIN_ACTION_INVALID",
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      code: "ADMIN_ACTION_FAILED",
      message: error.message || "Admin-Aktion konnte nicht ausgeführt werden.",
    };
  }

  return {
    status: 500,
    code: "ADMIN_ACTION_FAILED",
    message: "Admin-Aktion konnte nicht ausgeführt werden.",
  };
}
