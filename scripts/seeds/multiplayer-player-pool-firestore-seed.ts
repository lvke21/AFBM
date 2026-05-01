import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import { createRng, createSeededId, type SeededRng } from "../../src/lib/random/seeded-rng";
import type {
  FirestoreOnlineDraftAvailablePlayerDoc,
  FirestoreOnlineDraftStateDoc,
} from "../../src/lib/online/types";
import type { OnlineContractPlayer } from "../../src/lib/online/online-league-types";
import {
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
  MULTIPLAYER_TEST_LEAGUE_TEAMS,
} from "./multiplayer-test-league-firestore-seed";
import {
  FIRESTORE_SEED_EMULATOR_HOST,
  FIRESTORE_SEED_PROJECT_ID,
  ensureFirestoreEmulatorEnvironment,
  withEmulatorOperationTimeout,
} from "./firestore-seed";

export const MULTIPLAYER_PLAYER_POOL_SEED = "afbm-multiplayer-player-pool-v1";
export const MULTIPLAYER_PLAYER_POOL_CREATED_AT = "2026-05-01T10:00:00.000Z";
export const MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID = "foundation-player-pool-v1";

export const MULTIPLAYER_PLAYER_POSITION_TARGETS = {
  QB: 36,
  RB: 48,
  WR: 72,
  TE: 36,
  OL: 104,
  DL: 64,
  LB: 48,
  CB: 48,
  S: 32,
  K: 8,
  P: 8,
} as const;

type MultiplayerPoolPosition = keyof typeof MULTIPLAYER_PLAYER_POSITION_TARGETS;

export type MultiplayerPlayerPoolSeedDocuments = {
  draftState: FirestoreOnlineDraftStateDoc;
  players: FirestoreOnlineDraftAvailablePlayerDoc[];
};

const FIRST_NAMES = [
  "Adrian",
  "Bennett",
  "Caleb",
  "Darian",
  "Elias",
  "Felix",
  "Gavin",
  "Harlan",
  "Isaiah",
  "Jonas",
  "Kai",
  "Lennox",
  "Malik",
  "Nico",
  "Owen",
  "Preston",
  "Quentin",
  "Rafael",
  "Silas",
  "Tobias",
  "Umar",
  "Victor",
  "Wesley",
  "Xavier",
  "Yannick",
  "Zane",
  "Amir",
  "Bruno",
  "Cedric",
  "Damon",
  "Emil",
  "Florian",
  "Gregor",
  "Hugo",
  "Ilan",
  "Julian",
  "Kilian",
  "Luca",
  "Marco",
  "Noah",
];

const LAST_NAMES = [
  "Alder",
  "Bishop",
  "Cross",
  "Dawson",
  "Ellis",
  "Foster",
  "Grant",
  "Hayes",
  "Irving",
  "Jensen",
  "Keller",
  "Lang",
  "Mercer",
  "Nolan",
  "Osborne",
  "Porter",
  "Quinn",
  "Reed",
  "Santos",
  "Turner",
  "Ulrich",
  "Vaughn",
  "West",
  "Young",
  "Zimmer",
  "Bauer",
  "Costa",
  "Dubois",
  "Eriksen",
  "Fischer",
  "Gruber",
  "Hartmann",
  "Iverson",
  "Moreau",
  "Novak",
  "Rossi",
  "Schneider",
  "Varga",
  "Weber",
  "Wyatt",
];

function clampRating(value: number) {
  return Math.max(35, Math.min(99, value));
}

function getRatingBand(index: number, count: number) {
  const percentile = index / Math.max(1, count - 1);

  if (percentile < 0.01) {
    return { min: 90, max: 95 };
  }

  if (percentile < 0.08) {
    return { min: 85, max: 89 };
  }

  if (percentile < 0.58) {
    return { min: 72, max: 84 };
  }

  if (percentile < 0.84) {
    return { min: 60, max: 71 };
  }

  if (percentile < 0.96) {
    return { min: 50, max: 65 };
  }

  return { min: 45, max: 59 };
}

function makeAttributes(
  position: MultiplayerPoolPosition,
  overall: number,
  rng: SeededRng,
): Record<string, number> {
  const around = (offset = 0, spread = 5) => clampRating(overall + offset + rng.int(-spread, spread));

  if (position === "QB") {
    return {
      throwingPower: around(2),
      throwingAccuracy: around(1),
      awareness: around(0),
      mobility: around(-3, 7),
    };
  }

  if (position === "RB") {
    return {
      speed: around(2),
      strength: around(-2),
      carrying: around(1),
      agility: around(2),
    };
  }

  if (position === "WR" || position === "TE") {
    return {
      catching: around(1),
      routeRunning: around(1),
      speed: around(position === "WR" ? 3 : -1),
      release: around(0),
    };
  }

  if (position === "OL") {
    return {
      passBlock: around(1),
      runBlock: around(1),
      strength: around(3),
      awareness: around(0),
    };
  }

  if (position === "DL" || position === "LB") {
    return {
      tackling: around(1),
      strength: around(position === "DL" ? 3 : 0),
      blockShedding: around(1),
      passRush: around(position === "DL" ? 2 : -1),
    };
  }

  if (position === "CB" || position === "S") {
    return {
      coverage: around(position === "CB" ? 2 : 0),
      speed: around(2),
      tackling: around(position === "S" ? 2 : -1),
      awareness: around(0),
    };
  }

  return {
    kickPower: around(2),
    kickAccuracy: around(1),
  };
}

function getAge(overall: number, rng: SeededRng) {
  if (overall >= 90) {
    return rng.int(25, 30);
  }

  if (overall >= 80) {
    return rng.int(24, 31);
  }

  if (overall >= 66) {
    return rng.int(22, 32);
  }

  return rng.int(21, 28);
}

function getPotential(overall: number, age: number, rng: SeededRng) {
  const upside =
    age <= 23 ? rng.int(5, 13) : age <= 26 ? rng.int(2, 9) : age <= 29 ? rng.int(0, 5) : rng.int(0, 2);

  return Math.max(overall, Math.min(98, overall + upside));
}

function getDevelopmentPath(overall: number, potential: number): OnlineContractPlayer["developmentPath"] {
  if (potential >= 88 && potential - overall >= 5) {
    return "star";
  }

  if (potential >= 76 || potential - overall >= 4) {
    return "solid";
  }

  return "bust";
}

function getSalary(position: MultiplayerPoolPosition, overall: number, rng: SeededRng) {
  const premium = position === "QB" ? 190_000 : position === "WR" || position === "CB" || position === "DL" ? 145_000 : 115_000;
  const base = Math.max(750_000, Math.round(overall * premium));

  return Math.round(base * rng.int(92, 108) / 100);
}

function getPlayerName(globalIndex: number) {
  const firstName = FIRST_NAMES[globalIndex % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(globalIndex / FIRST_NAMES.length) % LAST_NAMES.length];

  return `${firstName} ${lastName}`;
}

function createPoolPlayer(
  leagueId: string,
  position: MultiplayerPoolPosition,
  positionIndex: number,
  positionCount: number,
  globalIndex: number,
): FirestoreOnlineDraftAvailablePlayerDoc {
  const rng = createRng(`${MULTIPLAYER_PLAYER_POOL_SEED}:${leagueId}:${position}:${positionIndex}`);
  const band = getRatingBand(positionIndex, positionCount);
  const overall = rng.int(band.min, band.max);
  const age = getAge(overall, rng);
  const potential = getPotential(overall, age, rng);
  const salaryPerYear = getSalary(position, overall, rng);
  const yearsRemaining = rng.int(1, overall >= 84 ? 5 : 4);
  const playerName = getPlayerName(globalIndex);

  return {
    playerId: createSeededId(
      `mp-${position.toLowerCase()}-${String(positionIndex + 1).padStart(3, "0")}`,
      `${MULTIPLAYER_PLAYER_POOL_SEED}:${leagueId}:${position}:${positionIndex}:id`,
      8,
    ),
    displayName: playerName,
    playerName,
    position,
    attributes: makeAttributes(position, overall, rng),
    age,
    overall,
    potential,
    developmentPath: getDevelopmentPath(overall, potential),
    developmentProgress: 0,
    xFactors: [],
    contract: {
      salaryPerYear,
      yearsRemaining,
      totalValue: salaryPerYear * yearsRemaining,
      guaranteedMoney: Math.round(salaryPerYear * yearsRemaining * rng.int(12, 45) / 100),
      signingBonus: Math.round(salaryPerYear * rng.int(8, 22) / 100),
      contractType: overall >= 84 ? "star" : overall <= 64 && age <= 24 ? "rookie" : "regular",
      capHitPerYear: salaryPerYear,
      deadCapPerYear: Math.round(salaryPerYear * rng.int(4, 16) / 100),
    },
    status: "free_agent",
    draftRunId: MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
    seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
    testData: true,
    leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
    createdBySeed: true,
  };
}

export function buildMultiplayerPlayerPoolSeedDocuments(
  leagueId = MULTIPLAYER_TEST_LEAGUE_ID,
): MultiplayerPlayerPoolSeedDocuments {
  let globalIndex = 0;
  const players = Object.entries(MULTIPLAYER_PLAYER_POSITION_TARGETS).flatMap(
    ([position, count]) =>
      Array.from({ length: count }, (_, positionIndex) =>
        createPoolPlayer(
          leagueId,
          position as MultiplayerPoolPosition,
          positionIndex,
          count,
          globalIndex++,
        ),
      ),
  );

  return {
    draftState: {
      leagueId,
      status: "not_started",
      round: 1,
      pickNumber: 1,
      currentTeamId: "",
      draftOrder: MULTIPLAYER_TEST_LEAGUE_TEAMS.map((team) => team.id),
      startedAt: null,
      completedAt: null,
      draftRunId: MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
      seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
      testData: true,
      leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
      createdBySeed: true,
    },
    players,
  };
}

export function summarizeMultiplayerPlayerPool(players: FirestoreOnlineDraftAvailablePlayerDoc[]) {
  return players.reduce(
    (summary, player) => {
      summary.positions[player.position] = (summary.positions[player.position] ?? 0) + 1;

      if (player.overall >= 90) {
        summary.ratings.elite += 1;
      } else if (player.overall >= 85) {
        summary.ratings.stars += 1;
      } else if (player.overall >= 72) {
        summary.ratings.starters += 1;
      } else if (player.overall >= 60) {
        summary.ratings.backups += 1;
      } else if (player.overall >= 50) {
        summary.ratings.prospects += 1;
      } else {
        summary.ratings.weakFreeAgents += 1;
      }

      return summary;
    },
    {
      count: players.length,
      positions: {} as Record<string, number>,
      ratings: {
        elite: 0,
        stars: 0,
        starters: 0,
        backups: 0,
        prospects: 0,
        weakFreeAgents: 0,
      },
    },
  );
}

export async function seedMultiplayerPlayerPool() {
  ensureFirestoreEmulatorEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID ?? FIRESTORE_SEED_PROJECT_ID;
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? FIRESTORE_SEED_EMULATOR_HOST;

  if (!projectId.startsWith("demo-")) {
    throw new Error(`Refusing multiplayer player pool seed for non-demo project "${projectId}".`);
  }

  if (!emulatorHost) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required for multiplayer player pool seed.");
  }

  const firestore = getFirebaseAdminFirestore();
  const documents = buildMultiplayerPlayerPoolSeedDocuments();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const draftRef = leagueRef.collection("draft").doc("main");
  const setupBatch = firestore.batch();

  setupBatch.set(draftRef, documents.draftState, { merge: true });
  setupBatch.set(
    leagueRef,
    {
      updatedAt: MULTIPLAYER_PLAYER_POOL_CREATED_AT,
      settings: {
        playerPoolSeed: MULTIPLAYER_PLAYER_POOL_SEED,
        playerPoolSeeded: true,
        playerPoolCount: documents.players.length,
        seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
        testData: true,
        leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        createdBySeed: true,
      },
    },
    { merge: true },
  );
  await withEmulatorOperationTimeout(setupBatch.commit(), "seed multiplayer player pool setup");

  for (let index = 0; index < documents.players.length; index += 400) {
    const batch = firestore.batch();

    documents.players.slice(index, index + 400).forEach((player) => {
    batch.set(draftRef.collection("availablePlayers").doc(player.playerId), player, { merge: true });
    });

    await withEmulatorOperationTimeout(batch.commit(), `seed multiplayer player pool chunk ${index / 400 + 1}`);
  }

  return summarizeMultiplayerPlayerPool(documents.players);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMultiplayerPlayerPool()
    .then((summary) => {
      console.log(`Seeded ${summary.count} multiplayer draft/free-agent players.`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
