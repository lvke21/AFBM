import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import type { DocumentReference } from "firebase-admin/firestore";

import { ONLINE_MVP_TEAM_POOL } from "../../src/lib/online/online-league-service";
import { mapLocalTeamToFirestoreTeam } from "../../src/lib/online/types";
import {
  FIRESTORE_SEED_EMULATOR_HOST,
  FIRESTORE_SEED_PROJECT_ID,
  ensureFirestoreEmulatorEnvironment,
  withEmulatorOperationTimeout,
} from "./firestore-seed";

export const MULTIPLAYER_E2E_LEAGUE_ID = "e2e-multiplayer-league";
const createdAt = "2026-04-30T10:00:00.000Z";

async function clearNestedCollection(
  leagueRef: DocumentReference,
  collectionName: string,
) {
  const snapshot = await leagueRef.collection(collectionName).get();
  const batch = getFirebaseAdminFirestore().batch();

  snapshot.docs.forEach((document) => batch.delete(document.ref));

  if (!snapshot.empty) {
    await withEmulatorOperationTimeout(
      batch.commit(),
      `clear ${collectionName} for multiplayer E2E league`,
    );
  }
}

export async function seedMultiplayerE2eLeague() {
  ensureFirestoreEmulatorEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID ?? FIRESTORE_SEED_PROJECT_ID;
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? FIRESTORE_SEED_EMULATOR_HOST;

  if (!projectId.startsWith("demo-")) {
    throw new Error(`Refusing multiplayer E2E seed for non-demo project "${projectId}".`);
  }

  if (!emulatorHost) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required for multiplayer E2E seed.");
  }

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_E2E_LEAGUE_ID);

  await Promise.all([
    clearNestedCollection(leagueRef, "memberships"),
    clearNestedCollection(leagueRef, "teams"),
    clearNestedCollection(leagueRef, "events"),
    clearNestedCollection(leagueRef, "weeks"),
    clearNestedCollection(leagueRef, "adminLogs"),
  ]);

  const batch = firestore.batch();
  const maxTeams = 2;

  batch.set(leagueRef, {
    id: MULTIPLAYER_E2E_LEAGUE_ID,
    name: "Firebase Multiplayer E2E League",
    status: "lobby",
    createdByUserId: "server-e2e-admin",
    createdAt,
    updatedAt: createdAt,
    maxTeams,
    memberCount: 0,
    currentWeek: 1,
    currentSeason: 1,
    settings: {
      onlineBackbone: true,
    },
    version: 1,
  });

  ONLINE_MVP_TEAM_POOL.slice(0, maxTeams).forEach((team) => {
    batch.set(
      leagueRef.collection("teams").doc(team.id),
      mapLocalTeamToFirestoreTeam(team, createdAt),
    );
  });
  batch.set(leagueRef.collection("events").doc(), {
    type: "league_created",
    createdAt,
    createdByUserId: "server-e2e-admin",
    payload: {
      source: "multiplayer-e2e-seed",
    },
  });

  await withEmulatorOperationTimeout(batch.commit(), "seed multiplayer E2E league");

  return {
    leagueId: MULTIPLAYER_E2E_LEAGUE_ID,
    maxTeams,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMultiplayerE2eLeague()
    .then((summary) => {
      console.log(
        `Seeded ${summary.leagueId} with ${summary.maxTeams} available teams in Firestore emulator.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
