import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineDraftPickDoc,
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "../src/lib/online/types";
import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
  OnlineLeagueScheduleMatch,
} from "../src/lib/online/online-league-types";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./seeds/multiplayer-firestore-env";

const DEFAULT_LEAGUE_ID = "afbm-playability-test";
const LEAGUE_NAME = "AFBM Playability Test League";
const SEED_KEY = "afbm-playability-staging-v1";
const SEED_ACTOR_ID = "playability-staging-seed";
const DRAFT_RUN_ID = "playability-draft-v1";

type PlayabilityTeamSeed = {
  abbreviation: string;
  cityName: string;
  id: string;
  primaryColor: string;
  secondaryColor: string;
  teamName: string;
};

const TEAMS: PlayabilityTeamSeed[] = [
  {
    abbreviation: "BAS",
    cityName: "Basel",
    id: "basel-rhinos",
    primaryColor: "#991B1B",
    secondaryColor: "#E5E7EB",
    teamName: "Rhinos",
  },
  {
    abbreviation: "BER",
    cityName: "Bern",
    id: "bern-wolves",
    primaryColor: "#334155",
    secondaryColor: "#FACC15",
    teamName: "Wolves",
  },
  {
    abbreviation: "GEN",
    cityName: "Geneva",
    id: "geneva-falcons",
    primaryColor: "#047857",
    secondaryColor: "#FDE68A",
    teamName: "Falcons",
  },
  {
    abbreviation: "ZUR",
    cityName: "Zurich",
    id: "zurich-guardians",
    primaryColor: "#1D4ED8",
    secondaryColor: "#F8FAFC",
    teamName: "Guardians",
  },
];

function requireStagingSeedConfirmation() {
  if (process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error("Playability staging seed requires CONFIRM_STAGING_SEED=true.");
  }
}

function resolveLeagueId() {
  const leagueId = process.env.PLAYABILITY_LEAGUE_ID?.trim() || DEFAULT_LEAGUE_ID;

  if (!/^[a-z0-9-]+$/.test(leagueId) || !leagueId.startsWith("afbm-playability-")) {
    throw new Error(
      `Refusing unsafe playability league id "${leagueId}". Use an afbm-playability-* id.`,
    );
  }

  return leagueId;
}

function nowIso() {
  return new Date().toISOString();
}

function createPlayer(team: PlayabilityTeamSeed, index: number): OnlineContractPlayer {
  return {
    age: 24 + index,
    contract: {
      capHitPerYear: 1_000_000,
      contractType: "regular",
      deadCapPerYear: 0,
      guaranteedMoney: 0,
      salaryPerYear: 1_000_000,
      signingBonus: 0,
      totalValue: 1_000_000,
      yearsRemaining: 1,
    },
    developmentPath: "solid",
    developmentProgress: 0,
    overall: 72 + index,
    playerId: `${team.id}-qb-${index}`,
    playerName: `${team.cityName} ${team.teamName} QB ${index}`,
    position: "QB",
    potential: 78 + index,
    status: "active",
    xFactors: [],
  };
}

function createRoster(team: PlayabilityTeamSeed) {
  return [createPlayer(team, 1), createPlayer(team, 2)];
}

function createDepthChart(team: PlayabilityTeamSeed): OnlineDepthChartEntry[] {
  return [
    {
      backupPlayerIds: [`${team.id}-qb-2`],
      position: "QB",
      starterPlayerId: `${team.id}-qb-1`,
      updatedAt: nowIso(),
    },
  ];
}

function createTeamDoc(team: PlayabilityTeamSeed, createdAt: string): FirestoreOnlineTeamDoc {
  const userId = `${team.id}-gm`;

  return {
    abbreviation: team.abbreviation,
    assignedUserId: userId,
    branding: {
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
    },
    cityId: team.id.split("-")[0],
    cityName: team.cityName,
    contractRoster: createRoster(team),
    createdAt,
    createdBySeed: true,
    depthChart: createDepthChart(team),
    displayName: `${team.cityName} ${team.teamName}`,
    id: team.id,
    leagueSlug: resolveLeagueId(),
    seedKey: SEED_KEY,
    status: "assigned",
    teamName: team.teamName,
    teamNameId: team.teamName.toLowerCase(),
    testData: true,
    updatedAt: createdAt,
  } as FirestoreOnlineTeamDoc;
}

function createMembershipDoc(team: PlayabilityTeamSeed, createdAt: string): FirestoreOnlineMembershipDoc {
  const userId = `${team.id}-gm`;

  return {
    displayName: `${team.cityName} ${team.teamName} GM`,
    joinedAt: createdAt,
    lastSeenAt: createdAt,
    ready: false,
    role: "gm",
    status: "active",
    teamId: team.id,
    userId,
    username: `${team.cityName} ${team.teamName} GM`,
  };
}

function createMirrorDoc(input: {
  createdAt: string;
  leagueId: string;
  team: PlayabilityTeamSeed;
}): FirestoreLeagueMemberMirrorDoc {
  const userId = `${input.team.id}-gm`;

  return {
    createdAt: input.createdAt,
    id: `${input.leagueId}_${userId}`,
    leagueId: input.leagueId,
    leagueSlug: input.leagueId,
    role: "GM",
    status: "ACTIVE",
    teamId: input.team.id,
    uid: userId,
    updatedAt: input.createdAt,
    userId,
  };
}

function createSchedule(leagueId: string): OnlineLeagueScheduleMatch[] {
  const teamIds = TEAMS.map((team) => team.id);
  const rounds: Array<Array<[string, string]>> = [
    [
      [teamIds[0], teamIds[1]],
      [teamIds[2], teamIds[3]],
    ],
    [
      [teamIds[0], teamIds[2]],
      [teamIds[1], teamIds[3]],
    ],
    [
      [teamIds[0], teamIds[3]],
      [teamIds[1], teamIds[2]],
    ],
  ];

  return rounds.flatMap((games, weekIndex) =>
    games.map(([homeTeamName, awayTeamName], gameIndex) => ({
      awayTeamName,
      homeTeamName,
      id: `${leagueId}-s1-w${weekIndex + 1}-g${String(gameIndex + 1).padStart(2, "0")}`,
      scheduledAt: `2026-05-${String(weekIndex + 4).padStart(2, "0")}T18:00:00.000Z`,
      status: "scheduled",
      week: weekIndex + 1,
    })),
  );
}

function createDraftState(leagueId: string, createdAt: string): FirestoreOnlineDraftStateDoc {
  return {
    completedAt: createdAt,
    currentTeamId: "",
    draftOrder: TEAMS.map((team) => team.id),
    draftRunId: DRAFT_RUN_ID,
    leagueId,
    leagueSlug: leagueId,
    pickNumber: 1,
    round: 1,
    seedKey: SEED_KEY,
    startedAt: createdAt,
    status: "completed",
    testData: true,
    createdBySeed: true,
  };
}

function createDraftPicks(createdAt: string): FirestoreOnlineDraftPickDoc[] {
  return TEAMS.map((team, index) => {
    const player = createPlayer(team, 1);

    return {
      draftRunId: DRAFT_RUN_ID,
      pickedByUserId: `${team.id}-gm`,
      pickNumber: index + 1,
      playerId: player.playerId,
      playerSnapshot: player,
      round: 1,
      teamId: team.id,
      timestamp: createdAt,
    };
  });
}

function createLeagueDoc(leagueId: string, createdAt: string): FirestoreOnlineLeagueDoc {
  return {
    completedWeeks: [],
    createdAt,
    createdByUserId: SEED_ACTOR_ID,
    currentSeason: 1,
    currentWeek: 1,
    id: leagueId,
    matchResults: [],
    maxTeams: TEAMS.length,
    memberCount: TEAMS.length,
    name: LEAGUE_NAME,
    schedule: createSchedule(leagueId),
    settings: {
      createdBySeed: true,
      currentPhase: "roster_ready",
      draftExecuted: true,
      foundationStatus: "roster_ready",
      gamePhase: "pre_week",
      leagueSlug: leagueId,
      onlineBackbone: true,
      phase: "roster_ready",
      rosterReady: true,
      seedKey: SEED_KEY,
      seedSource: "scripts/seed-playability-league.ts",
      testData: true,
    },
    standings: [],
    status: "active",
    updatedAt: createdAt,
    version: 1,
    weekStatus: "pre_week",
  };
}

async function deleteCollection(
  collection: FirebaseFirestore.CollectionReference,
  label: string,
) {
  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: true });
  const snapshot = await withMultiplayerFirestoreTimeout(
    collection.get(),
    `read ${label}`,
    environment,
    30_000,
  );

  if (snapshot.empty) {
    return 0;
  }

  const firestore = getFirebaseAdminFirestore();
  let deleted = 0;

  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = firestore.batch();
    const chunk = snapshot.docs.slice(index, index + 400);

    chunk.forEach((document) => batch.delete(document.ref));
    await withMultiplayerFirestoreTimeout(
      batch.commit(),
      `delete ${label}`,
      environment,
      30_000,
    );
    deleted += chunk.length;
  }

  return deleted;
}

async function resetPlayabilityLeague(leagueId: string) {
  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: true });
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const mirrorSnapshot = await withMultiplayerFirestoreTimeout(
    firestore.collection("leagueMembers").where("leagueId", "==", leagueId).get(),
    "read playability league member mirrors",
    environment,
    30_000,
  );
  let deletedMirrors = 0;

  if (!mirrorSnapshot.empty) {
    const batch = firestore.batch();
    mirrorSnapshot.docs.forEach((document) => {
      batch.delete(document.ref);
      deletedMirrors += 1;
    });
    await withMultiplayerFirestoreTimeout(
      batch.commit(),
      "delete playability league member mirrors",
      environment,
      30_000,
    );
  }

  const deletedSubdocs = await Promise.all([
    deleteCollection(leagueRef.collection("adminActionLocks"), "playability admin action locks"),
    deleteCollection(leagueRef.collection("adminLogs"), "playability admin logs"),
    deleteCollection(leagueRef.collection("events"), "playability events"),
    deleteCollection(leagueRef.collection("memberships"), "playability memberships"),
    deleteCollection(leagueRef.collection("teams"), "playability teams"),
    deleteCollection(leagueRef.collection("weeks"), "playability weeks"),
    deleteCollection(leagueRef.collection("draft").doc("main").collection("availablePlayers"), "playability available players"),
    deleteCollection(leagueRef.collection("draft").doc("main").collection("picks"), "playability picks"),
  ]);

  await withMultiplayerFirestoreTimeout(
    leagueRef.collection("draft").doc("main").delete(),
    "delete playability draft doc",
    environment,
    30_000,
  );
  await withMultiplayerFirestoreTimeout(
    leagueRef.delete(),
    "delete playability league doc",
    environment,
    30_000,
  );

  return {
    deletedMirrors,
    deletedSubdocs: deletedSubdocs.reduce((sum, count) => sum + count, 0),
  };
}

async function writePlayabilityLeague(leagueId: string) {
  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: true });
  const firestore = getFirebaseAdminFirestore();
  const createdAt = nowIso();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const batch = firestore.batch();
  const league = createLeagueDoc(leagueId, createdAt);
  const draft = createDraftState(leagueId, createdAt);
  const picks = createDraftPicks(createdAt);

  batch.set(leagueRef, league);
  batch.set(leagueRef.collection("draft").doc("main"), draft);

  TEAMS.forEach((team) => {
    batch.set(leagueRef.collection("teams").doc(team.id), createTeamDoc(team, createdAt));
    batch.set(
      leagueRef.collection("memberships").doc(`${team.id}-gm`),
      createMembershipDoc(team, createdAt),
    );
    batch.set(
      firestore.collection("leagueMembers").doc(`${leagueId}_${team.id}-gm`),
      createMirrorDoc({ createdAt, leagueId, team }),
    );
  });

  picks.forEach((pick) => {
    batch.set(
      leagueRef.collection("draft").doc("main").collection("picks").doc(String(pick.pickNumber).padStart(4, "0")),
      pick,
    );
  });

  batch.set(leagueRef.collection("events").doc("playability-seed-created"), {
    createdAt,
    createdByUserId: SEED_ACTOR_ID,
    payload: {
      draftStatus: draft.status,
      scheduleGames: league.schedule?.length ?? 0,
      seedKey: SEED_KEY,
      teamCount: TEAMS.length,
      testData: true,
    },
    type: "playability_seed_created",
  });

  await withMultiplayerFirestoreTimeout(
    batch.commit(),
    "write playability league",
    environment,
    30_000,
  );

  return {
    createdAt,
    draft,
    league,
    picks,
  };
}

async function validatePlayabilityLeague(leagueId: string) {
  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: true });
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const [leagueSnapshot, teamsSnapshot, membershipsSnapshot, draftSnapshot, picksSnapshot] =
    await Promise.all([
      withMultiplayerFirestoreTimeout(leagueRef.get(), "validate playability league", environment, 30_000),
      withMultiplayerFirestoreTimeout(leagueRef.collection("teams").get(), "validate playability teams", environment, 30_000),
      withMultiplayerFirestoreTimeout(leagueRef.collection("memberships").get(), "validate playability memberships", environment, 30_000),
      withMultiplayerFirestoreTimeout(leagueRef.collection("draft").doc("main").get(), "validate playability draft", environment, 30_000),
      withMultiplayerFirestoreTimeout(leagueRef.collection("draft").doc("main").collection("picks").get(), "validate playability picks", environment, 30_000),
    ]);
  const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;
  const draft = draftSnapshot.data() as FirestoreOnlineDraftStateDoc | undefined;
  const issues: string[] = [];

  if (!leagueSnapshot.exists || !league) {
    issues.push("League document is missing.");
  } else {
    if (league.id !== leagueId || league.settings?.testData !== true) {
      issues.push("League identity or test-data marker is invalid.");
    }

    if (league.status !== "active" || league.weekStatus !== "pre_week" || league.currentWeek !== 1) {
      issues.push("League is not reset to active/pre_week/currentWeek=1.");
    }

    if ((league.schedule ?? []).length !== 6) {
      issues.push(`Expected 6 scheduled games, found ${(league.schedule ?? []).length}.`);
    }

    if ((league.matchResults ?? []).length !== 0 || (league.completedWeeks ?? []).length !== 0) {
      issues.push("League must start with empty results and completedWeeks.");
    }
  }

  if (teamsSnapshot.size !== TEAMS.length) {
    issues.push(`Expected ${TEAMS.length} teams, found ${teamsSnapshot.size}.`);
  }

  if (membershipsSnapshot.size !== TEAMS.length) {
    issues.push(`Expected ${TEAMS.length} memberships, found ${membershipsSnapshot.size}.`);
  }

  if (draft?.status !== "completed") {
    issues.push(`Expected completed draft, found ${draft?.status ?? "<missing>"}.`);
  }

  if (picksSnapshot.size !== TEAMS.length) {
    issues.push(`Expected ${TEAMS.length} draft picks, found ${picksSnapshot.size}.`);
  }

  return {
    ok: issues.length === 0,
    issues,
    summary: {
      currentWeek: league?.currentWeek,
      draftStatus: draft?.status,
      leagueId,
      membershipCount: membershipsSnapshot.size,
      resultCount: league?.matchResults?.length ?? 0,
      scheduleGames: league?.schedule?.length ?? 0,
      teamCount: teamsSnapshot.size,
      weekStatus: league?.weekStatus,
    },
  };
}

export async function seedPlayabilityLeague() {
  requireStagingSeedConfirmation();
  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: true });
  logMultiplayerFirestoreEnvironment(environment, "seed playability league");

  if (environment.mode !== "staging") {
    throw new Error("Playability league seed is restricted to staging.");
  }

  const leagueId = resolveLeagueId();
  const reset = await resetPlayabilityLeague(leagueId);
  const write = await writePlayabilityLeague(leagueId);
  const validation = await validatePlayabilityLeague(leagueId);

  if (!validation.ok) {
    throw new Error(`Playability league validation failed: ${validation.issues.join("; ")}`);
  }

  return {
    createdAt: write.createdAt,
    example: {
      draft: {
        pickCount: write.picks.length,
        status: write.draft.status,
      },
      league: {
        currentWeek: write.league.currentWeek,
        id: write.league.id,
        scheduleGames: write.league.schedule?.length ?? 0,
        status: write.league.status,
        weekStatus: write.league.weekStatus,
      },
      memberships: TEAMS.map((team) => ({
        ready: false,
        teamId: team.id,
        userId: `${team.id}-gm`,
      })),
    },
    leagueId,
    reset,
    validation: validation.summary,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPlayabilityLeague()
    .then((summary) => {
      console.log("Playability staging league seeded.");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
