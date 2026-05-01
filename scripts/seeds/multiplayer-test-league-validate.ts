import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import {
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_NAME,
  MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
  MULTIPLAYER_TEST_LEAGUE_TEAMS,
} from "./multiplayer-test-league-firestore-seed";
import { MULTIPLAYER_PLAYER_POSITION_TARGETS } from "./multiplayer-player-pool-firestore-seed";
import {
  FIRESTORE_SEED_EMULATOR_HOST,
  FIRESTORE_SEED_PROJECT_ID,
  ensureFirestoreEmulatorEnvironment,
  withEmulatorOperationTimeout,
} from "./firestore-seed";
import type {
  FirestoreOnlineDraftAvailablePlayerDoc,
  FirestoreOnlineDraftPickDoc,
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineTeamDoc,
} from "../../src/lib/online/types";

export type MultiplayerSeedValidationResult = {
  ok: boolean;
  issues: string[];
  summary: {
    leagueExists: boolean;
    teamCount: number;
    playerCount: number;
    pickCount: number;
    currentTeamId?: string;
    positionCounts: Record<string, number>;
  };
};

function assertSafeValidationEnvironment() {
  ensureFirestoreEmulatorEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID ?? FIRESTORE_SEED_PROJECT_ID;
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? FIRESTORE_SEED_EMULATOR_HOST;

  if (!projectId.startsWith("demo-")) {
    throw new Error(`Refusing multiplayer seed validation for non-demo project "${projectId}".`);
  }

  if (!emulatorHost) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required for multiplayer seed validation.");
  }
}

function countByPosition(players: FirestoreOnlineDraftAvailablePlayerDoc[]) {
  return players.reduce<Record<string, number>>((counts, player) => {
    counts[player.position] = (counts[player.position] ?? 0) + 1;
    return counts;
  }, {});
}

function hasSafetyMarkers(value: Record<string, unknown> | undefined) {
  return (
    value?.seedKey === MULTIPLAYER_TEST_LEAGUE_SEED_KEY &&
    value.testData === true &&
    value.leagueSlug === MULTIPLAYER_TEST_LEAGUE_SLUG &&
    value.createdBySeed === true
  );
}

export async function validateMultiplayerSeedWorkflow(): Promise<MultiplayerSeedValidationResult> {
  assertSafeValidationEnvironment();

  const issues: string[] = [];
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const draftRef = leagueRef.collection("draft").doc("main");
  const [leagueSnapshot, teamsSnapshot, draftSnapshot, playersSnapshot, picksSnapshot] =
    await Promise.all([
      withEmulatorOperationTimeout(leagueRef.get(), "validate multiplayer league"),
      withEmulatorOperationTimeout(leagueRef.collection("teams").get(), "validate multiplayer teams"),
      withEmulatorOperationTimeout(draftRef.get(), "validate multiplayer draft state"),
      withEmulatorOperationTimeout(
        draftRef.collection("availablePlayers").get(),
        "validate multiplayer available players",
      ),
      withEmulatorOperationTimeout(draftRef.collection("picks").get(), "validate multiplayer picks"),
    ]);

  const league = leagueSnapshot.exists
    ? (leagueSnapshot.data() as FirestoreOnlineLeagueDoc)
    : null;
  const teams = teamsSnapshot.docs.map((document) => document.data() as FirestoreOnlineTeamDoc);
  const draftState = draftSnapshot.exists
    ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
    : null;
  const players = playersSnapshot.docs.map(
    (document) => document.data() as FirestoreOnlineDraftAvailablePlayerDoc,
  );
  const picks = picksSnapshot.docs.map((document) => document.data() as FirestoreOnlineDraftPickDoc);
  const positionCounts = countByPosition(players);

  if (!league) {
    issues.push("League document is missing.");
  } else {
    if (league.id !== MULTIPLAYER_TEST_LEAGUE_ID || league.name !== MULTIPLAYER_TEST_LEAGUE_NAME) {
      issues.push("League identity is invalid.");
    }

    if (!hasSafetyMarkers(league.settings)) {
      issues.push("League safety markers are missing or invalid.");
    }
  }

  if (teams.length !== 8) {
    issues.push(`Expected 8 teams, found ${teams.length}.`);
  }

  const expectedTeamIds = new Set(MULTIPLAYER_TEST_LEAGUE_TEAMS.map((team) => team.id));
  const actualTeamIds = teams.map((team) => team.id);

  if (new Set(actualTeamIds).size !== actualTeamIds.length) {
    issues.push("Duplicate team IDs found.");
  }

  if (actualTeamIds.some((teamId) => !expectedTeamIds.has(teamId))) {
    issues.push("Unexpected team ID found.");
  }

  if (players.length < 500) {
    issues.push(`Expected at least 500 available players, found ${players.length}.`);
  }

  const playerIds = players.map((player) => player.playerId);

  if (new Set(playerIds).size !== playerIds.length) {
    issues.push("Duplicate player IDs found.");
  }

  for (const [position, expectedCount] of Object.entries(MULTIPLAYER_PLAYER_POSITION_TARGETS)) {
    if ((positionCounts[position] ?? 0) < expectedCount) {
      issues.push(
        `Position ${position} has ${positionCounts[position] ?? 0}, expected at least ${expectedCount}.`,
      );
    }
  }

  if (!players.every((player) => hasSafetyMarkers(player))) {
    issues.push("At least one player is missing safety markers.");
  }

  if (!draftState) {
    issues.push("Draft state is missing.");
  } else {
    if (draftState.status !== "active") {
      issues.push(`Expected active draft state, found ${draftState.status}.`);
    }

    if (draftState.round !== 1 || draftState.pickNumber !== 1) {
      issues.push("Initial draft round/pick is invalid.");
    }

    if (draftState.currentTeamId !== MULTIPLAYER_TEST_LEAGUE_TEAMS[0]?.id) {
      issues.push("Current team for first pick is invalid.");
    }

    if (draftState.draftOrder.join("|") !== MULTIPLAYER_TEST_LEAGUE_TEAMS.map((team) => team.id).join("|")) {
      issues.push("Draft order is invalid.");
    }

    if (!hasSafetyMarkers(draftState)) {
      issues.push("Draft state safety markers are missing or invalid.");
    }
  }

  const pickedPlayerIds = new Set(picks.map((pick) => pick.playerId));

  if (pickedPlayerIds.size !== picks.length) {
    issues.push("Duplicate drafted player references found.");
  }

  if (picks.some((pick) => playerIds.includes(pick.playerId))) {
    issues.push("A drafted player is still available.");
  }

  return {
    ok: issues.length === 0,
    issues,
    summary: {
      leagueExists: Boolean(league),
      teamCount: teams.length,
      playerCount: players.length,
      pickCount: picks.length,
      currentTeamId: draftState?.currentTeamId,
      positionCounts,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateMultiplayerSeedWorkflow()
    .then((result) => {
      console.log("Multiplayer seed validation:");
      console.log(JSON.stringify(result.summary, null, 2));

      if (!result.ok) {
        throw new Error(`Validation failed: ${result.issues.join("; ")}`);
      }

      console.log("Validation OK");
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
