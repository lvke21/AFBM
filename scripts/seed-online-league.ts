import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import { ONLINE_MVP_TEAM_POOL } from "../src/lib/online/online-league-constants";
import {
  createOnlineLeagueSchedule,
  type OnlineContractPlayer,
  type OnlineDepthChartEntry,
  type OnlineLeagueTeam,
} from "../src/lib/online/online-league-service";
import type {
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "../src/lib/online/types";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./seeds/multiplayer-firestore-env";

const DEFAULT_PROJECT_ID = "afbm-staging";
const DEFAULT_LEAGUE_NAME = "AFBM Admin Week Simulation Test League";
const DEFAULT_LEAGUE_ID = "afbm-admin-week-sim-test-league";
const SEED_KEY = "afbm-admin-week-simulation-v1";
const SEEDED_AT = "2026-05-01T16:00:00.000Z";
const SEED_ACTOR_ID = "server-admin-week-sim-seed";
const ROSTER_SIZE = 53;
const POSITION_PLAN = [
  ["QB", 3],
  ["RB", 4],
  ["WR", 7],
  ["TE", 3],
  ["LT", 4],
  ["LG", 3],
  ["C", 3],
  ["RG", 3],
  ["RT", 4],
  ["DE", 5],
  ["DT", 4],
  ["LB", 6],
  ["CB", 5],
  ["FS", 2],
  ["SS", 2],
  ["K", 1],
  ["P", 1],
] as const;

type CliOptions = {
  help: boolean;
  leagueId: string;
  name: string;
  projectId: string;
};

type SeededMembership = FirestoreOnlineMembershipDoc & {
  createdBySeed: true;
  seedKey: string;
  testData: true;
};

function printHelp() {
  console.log(`Seed a staging Online League for Admin Week Simulation.

Usage:
  npm run firebase:seed-online-league -- --project afbm-staging [--name "League Name"]
  tsx scripts/seed-online-league.ts --project afbm-staging [--league-id ${DEFAULT_LEAGUE_ID}]

Options:
  --project <projectId>   Required. Must be ${DEFAULT_PROJECT_ID}.
  --name <name>           Optional league name. Defaults to "${DEFAULT_LEAGUE_NAME}".
  --league-id <id>        Optional stable league id. Defaults to ${DEFAULT_LEAGUE_ID}.
  --help                  Show this help.

Safety:
  Requires CONFIRM_STAGING_SEED=true and USE_FIRESTORE_EMULATOR=false.
  Refuses production and refuses to overwrite non-seed memberships/team assignments.
`);
}

function readOption(args: string[], name: string) {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function parseCliOptions(argv = process.argv.slice(2)): CliOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    return {
      help: true,
      leagueId: DEFAULT_LEAGUE_ID,
      name: DEFAULT_LEAGUE_NAME,
      projectId: readOption(argv, "--project") ?? DEFAULT_PROJECT_ID,
    };
  }

  const projectId = readOption(argv, "--project");

  if (!projectId) {
    throw new Error(`Missing required --project ${DEFAULT_PROJECT_ID}.`);
  }

  return {
    help: false,
    leagueId: readOption(argv, "--league-id") ?? DEFAULT_LEAGUE_ID,
    name: readOption(argv, "--name") ?? DEFAULT_LEAGUE_NAME,
    projectId,
  };
}

function assertSafeLeagueId(leagueId: string) {
  if (!/^[a-z0-9-]{6,80}$/.test(leagueId)) {
    throw new Error(`Unsafe league id "${leagueId}". Use lowercase letters, numbers and hyphens.`);
  }
}

function configureStagingFromCli(options: CliOptions) {
  if (options.projectId !== DEFAULT_PROJECT_ID) {
    throw new Error(`Admin week simulation seed requires --project ${DEFAULT_PROJECT_ID}.`);
  }

  process.env.GOOGLE_CLOUD_PROJECT = options.projectId;
  process.env.FIREBASE_PROJECT_ID ??= options.projectId;
  process.env.USE_FIRESTORE_EMULATOR = "false";

  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: true });
  logMultiplayerFirestoreEnvironment(environment, "seed admin week simulation online league");

  return environment;
}

function deterministicOverall(teamIndex: number, playerIndex: number) {
  const base = 62 + ((teamIndex * 7 + playerIndex * 5) % 24);
  const premium = playerIndex < 8 ? 5 : playerIndex < 22 ? 2 : 0;

  return Math.min(91, base + premium);
}

function buildContract(overall: number) {
  const salaryPerYear = (600_000 + overall * 42_000);

  return {
    capHitPerYear: salaryPerYear,
    contractType: overall >= 84 ? "star" : overall <= 68 ? "rookie" : "regular",
    deadCapPerYear: Math.round(salaryPerYear * 0.18),
    guaranteedMoney: Math.round(salaryPerYear * 0.45),
    salaryPerYear,
    signingBonus: Math.round(salaryPerYear * 0.2),
    totalValue: salaryPerYear * 3,
    yearsRemaining: 3,
  } satisfies OnlineContractPlayer["contract"];
}

function buildRoster(team: OnlineLeagueTeam, teamIndex: number): OnlineContractPlayer[] {
  const positions = POSITION_PLAN.flatMap(([position, count]) =>
    Array.from({ length: count }, () => position),
  );

  return positions.slice(0, ROSTER_SIZE).map((position, index) => {
    const overall = deterministicOverall(teamIndex, index);

    return {
      age: 22 + ((teamIndex + index) % 13),
      attributes: {
        awareness: Math.max(45, overall - 3),
        speed: Math.max(45, overall + ((index % 5) - 2)),
        strength: Math.max(45, overall + ((index % 7) - 3)),
      },
      contract: buildContract(overall),
      developmentPath: overall >= 84 ? "star" : overall >= 66 ? "solid" : "bust",
      developmentProgress: (teamIndex * 11 + index * 7) % 100,
      overall,
      playerId: `${team.id}-seed-player-${String(index + 1).padStart(2, "0")}`,
      playerName: `${team.abbreviation} Seed Player ${String(index + 1).padStart(2, "0")}`,
      position,
      potential: Math.min(95, overall + 4 + (index % 5)),
      status: "active",
      xFactors: [],
    };
  });
}

function buildDepthChart(roster: OnlineContractPlayer[], now: string): OnlineDepthChartEntry[] {
  const positions = Array.from(new Set(roster.map((player) => player.position)));

  return positions.map((position) => {
    const players = roster
      .filter((player) => player.position === position)
      .sort((left, right) => right.overall - left.overall);

    return {
      backupPlayerIds: players.slice(1).map((player) => player.playerId),
      position,
      starterPlayerId: players[0]?.playerId ?? "",
      updatedAt: now,
    };
  });
}

function buildTeamDoc(team: OnlineLeagueTeam, teamIndex: number, now: string): FirestoreOnlineTeamDoc {
  const roster = buildRoster(team, teamIndex);

  return {
    assignedUserId: `seed-week-sim-gm-${team.id}`,
    cityId: team.id.split("-")[0],
    cityName: team.name.split(" ")[0] ?? team.name,
    contractRoster: roster,
    createdAt: now,
    depthChart: buildDepthChart(roster, now),
    displayName: team.name,
    id: team.id,
    status: "assigned",
    teamName: team.name,
    teamNameId: team.id,
    updatedAt: now,
  };
}

function buildMembershipDoc(team: OnlineLeagueTeam, now: string): SeededMembership {
  const userId = `seed-week-sim-gm-${team.id}`;

  return {
    createdBySeed: true,
    displayName: `${team.name} Seed GM`,
    joinedAt: now,
    lastSeenAt: now,
    ready: true,
    role: "gm",
    seedKey: SEED_KEY,
    status: "active",
    teamId: team.id,
    testData: true,
    userId,
    username: `${team.abbreviation}_SeedGM`,
  };
}

function buildLeagueDoc(options: CliOptions, now: string): FirestoreOnlineLeagueDoc {
  const schedule = createOnlineLeagueSchedule(options.leagueId, ONLINE_MVP_TEAM_POOL);

  return {
    completedWeeks: [],
    createdAt: now,
    createdByUserId: SEED_ACTOR_ID,
    currentSeason: 1,
    currentWeek: 1,
    id: options.leagueId,
    lastSimulatedWeekKey: FieldValue.delete() as unknown as string,
    matchResults: [],
    maxTeams: ONLINE_MVP_TEAM_POOL.length,
    memberCount: ONLINE_MVP_TEAM_POOL.length,
    name: options.name,
    schedule,
    settings: {
      createdBySeed: true,
      draftExecuted: true,
      foundationStatus: "roster_ready",
      onlineBackbone: true,
      seedKey: SEED_KEY,
      seedSource: "scripts/seed-online-league.ts",
      testData: true,
    },
    standings: [],
    status: "active",
    updatedAt: now,
    version: 1,
    weekStatus: "ready",
  };
}

function buildDraftState(leagueId: string, now: string): FirestoreOnlineDraftStateDoc {
  return {
    completedAt: now,
    currentTeamId: "",
    draftOrder: ONLINE_MVP_TEAM_POOL.map((team) => team.id),
    draftRunId: `${leagueId}-seed-draft`,
    leagueId,
    pickNumber: ONLINE_MVP_TEAM_POOL.length * ROSTER_SIZE + 1,
    round: ROSTER_SIZE + 1,
    seedKey: SEED_KEY,
    startedAt: now,
    status: "completed",
    testData: true,
  };
}

async function deleteCollection(path: string) {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore.collection(path).get();
  let batch = firestore.batch();
  let operations = 0;

  for (const document of snapshot.docs) {
    batch.delete(document.ref);
    operations += 1;

    if (operations === 450) {
      await batch.commit();
      batch = firestore.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }

  return snapshot.size;
}

async function assertExistingLeagueIsSeedOwned(leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const [leagueSnapshot, membershipsSnapshot, teamsSnapshot] = await Promise.all([
    leagueRef.get(),
    leagueRef.collection("memberships").get(),
    leagueRef.collection("teams").get(),
  ]);

  if (!leagueSnapshot.exists) {
    return;
  }

  const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc;
  const seedKey = typeof league.settings.seedKey === "string" ? league.settings.seedKey : "";

  if (seedKey !== SEED_KEY) {
    throw new Error(
      `Refusing to overwrite existing league ${leagueId}; settings.seedKey is "${seedKey || "<missing>"}".`,
    );
  }

  const unsafeMembership = membershipsSnapshot.docs.find((document) => {
    const data = document.data() as Partial<SeededMembership>;

    return data.seedKey !== SEED_KEY || data.createdBySeed !== true;
  });

  if (unsafeMembership) {
    throw new Error(`Refusing to overwrite non-seed membership ${unsafeMembership.id}.`);
  }

  const unsafeTeam = teamsSnapshot.docs.find((document) => {
    const data = document.data() as FirestoreOnlineTeamDoc & { seedKey?: string };

    return Boolean(data.assignedUserId) && !data.assignedUserId?.startsWith("seed-week-sim-gm-");
  });

  if (unsafeTeam) {
    throw new Error(`Refusing to overwrite team with non-seed assignment ${unsafeTeam.id}.`);
  }
}

async function seedOnlineLeague(options: CliOptions) {
  assertSafeLeagueId(options.leagueId);
  const environment = configureStagingFromCli(options);
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(options.leagueId);
  const now = SEEDED_AT;

  await withMultiplayerFirestoreTimeout(
    assertExistingLeagueIsSeedOwned(options.leagueId),
    "validate existing admin week simulation test league",
    environment,
  );

  const deleted = {
    adminActionLocks: await deleteCollection(`leagues/${options.leagueId}/adminActionLocks`),
    events: await deleteCollection(`leagues/${options.leagueId}/events`),
    memberships: await deleteCollection(`leagues/${options.leagueId}/memberships`),
    teams: await deleteCollection(`leagues/${options.leagueId}/teams`),
    weeks: await deleteCollection(`leagues/${options.leagueId}/weeks`),
  };

  const league = buildLeagueDoc(options, now);
  const teams = ONLINE_MVP_TEAM_POOL.map((team, index) => buildTeamDoc(team, index, now));
  const memberships = ONLINE_MVP_TEAM_POOL.map((team) => buildMembershipDoc(team, now));
  const draftState = buildDraftState(options.leagueId, now);
  const batch = firestore.batch();

  batch.set(leagueRef, league, { merge: true });
  teams.forEach((team) => {
    batch.set(leagueRef.collection("teams").doc(team.id), {
      ...team,
      createdBySeed: true,
      seedKey: SEED_KEY,
      testData: true,
    });
  });
  memberships.forEach((membership) => {
    batch.set(leagueRef.collection("memberships").doc(membership.userId), membership);
  });
  batch.set(leagueRef.collection("draft").doc("main"), draftState, { merge: true });
  batch.set(leagueRef.collection("weeks").doc("s1-w1"), {
    season: 1,
    startedAt: now,
    status: "ready",
    week: 1,
  });
  batch.set(leagueRef.collection("events").doc("seed-created"), {
    createdAt: now,
    createdByUserId: SEED_ACTOR_ID,
    payload: {
      leagueId: options.leagueId,
      scheduleGames: league.schedule?.length ?? 0,
      seedKey: SEED_KEY,
      teamCount: teams.length,
      testData: true,
    },
    type: "admin_week_sim_seeded",
  });

  await withMultiplayerFirestoreTimeout(
    batch.commit(),
    "write admin week simulation test league",
    environment,
  );

  return {
    deleted,
    leagueId: options.leagueId,
    name: options.name,
    projectId: environment.projectId,
    rosterSize: ROSTER_SIZE,
    scheduleGames: league.schedule?.length ?? 0,
    status: league.status,
    teamCount: teams.length,
    week: league.currentWeek,
  };
}

async function main() {
  const options = parseCliOptions();

  if (options.help) {
    printHelp();
    return;
  }

  const summary = await seedOnlineLeague(options);

  console.log("Admin week simulation seed complete:");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`leagueId=${summary.leagueId}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export {
  buildDepthChart,
  buildDraftState,
  buildLeagueDoc,
  buildMembershipDoc,
  buildRoster,
  buildTeamDoc,
  parseCliOptions,
  seedOnlineLeague,
};
