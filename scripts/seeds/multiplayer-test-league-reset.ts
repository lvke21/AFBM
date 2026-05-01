import type { DocumentReference } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import {
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
} from "./multiplayer-test-league-firestore-seed";
import {
  FIRESTORE_SEED_EMULATOR_HOST,
  FIRESTORE_SEED_PROJECT_ID,
  ensureFirestoreEmulatorEnvironment,
  withEmulatorOperationTimeout,
} from "./firestore-seed";

const deleteBatchSize = 400;

function assertSafeMultiplayerResetEnvironment() {
  ensureFirestoreEmulatorEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID ?? FIRESTORE_SEED_PROJECT_ID;
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? FIRESTORE_SEED_EMULATOR_HOST;

  if (process.env.NODE_ENV === "production" || process.env.AFBM_DEPLOY_ENV === "production") {
    throw new Error("Refusing multiplayer test reset in production.");
  }

  if (!projectId.startsWith("demo-")) {
    throw new Error(`Refusing multiplayer test reset for non-demo project "${projectId}".`);
  }

  if (!emulatorHost) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required for multiplayer test reset.");
  }
}

function isMarkedMultiplayerTestLeague(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data) {
    return false;
  }

  const settings = data.settings;

  if (!settings || typeof settings !== "object") {
    return false;
  }

  const record = settings as Record<string, unknown>;

  return (
    data.id === MULTIPLAYER_TEST_LEAGUE_ID &&
    record.seedKey === MULTIPLAYER_TEST_LEAGUE_SEED_KEY &&
    record.testData === true &&
    record.leagueSlug === MULTIPLAYER_TEST_LEAGUE_SLUG &&
    record.createdBySeed === true
  );
}

async function deleteCollection(collectionRef: FirebaseFirestore.CollectionReference) {
  const documents = await withEmulatorOperationTimeout(
    collectionRef.listDocuments(),
    `list ${collectionRef.path} before multiplayer reset`,
  );
  let deleted = 0;

  for (let index = 0; index < documents.length; index += deleteBatchSize) {
    const batch = getFirebaseAdminFirestore().batch();
    documents.slice(index, index + deleteBatchSize).forEach((documentRef) => {
      batch.delete(documentRef);
    });
    await withEmulatorOperationTimeout(batch.commit(), `delete ${collectionRef.path}`);
    deleted += documents.slice(index, index + deleteBatchSize).length;
  }

  return deleted;
}

async function deleteDraftSubtree(leagueRef: DocumentReference) {
  const draftRef = leagueRef.collection("draft").doc("main");
  const [availablePlayers, picks] = await Promise.all([
    deleteCollection(draftRef.collection("availablePlayers")),
    deleteCollection(draftRef.collection("picks")),
  ]);
  const draftSnapshot = await withEmulatorOperationTimeout(
    draftRef.get(),
    "read multiplayer draft doc before reset",
  );

  if (draftSnapshot.exists) {
    await withEmulatorOperationTimeout(draftRef.delete(), "delete multiplayer draft doc");
  }

  return {
    draftDocs: draftSnapshot.exists ? 1 : 0,
    availablePlayers,
    picks,
  };
}

export async function resetMultiplayerTestLeague() {
  assertSafeMultiplayerResetEnvironment();

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const leagueSnapshot = await withEmulatorOperationTimeout(
    leagueRef.get(),
    "read multiplayer test league before reset",
  );

  if (!leagueSnapshot.exists) {
    return {
      deleted: false,
      reason: "league-not-found",
      teams: 0,
      memberships: 0,
      events: 0,
      weeks: 0,
      adminLogs: 0,
      draftDocs: 0,
      availablePlayers: 0,
      picks: 0,
    };
  }

  if (!isMarkedMultiplayerTestLeague(leagueSnapshot.data())) {
    throw new Error(
      `Refusing to delete ${MULTIPLAYER_TEST_LEAGUE_ID}: missing seed safety markers.`,
    );
  }

  const [draftSummary, teams, memberships, events, weeks, adminLogs] = await Promise.all([
    deleteDraftSubtree(leagueRef),
    deleteCollection(leagueRef.collection("teams")),
    deleteCollection(leagueRef.collection("memberships")),
    deleteCollection(leagueRef.collection("events")),
    deleteCollection(leagueRef.collection("weeks")),
    deleteCollection(leagueRef.collection("adminLogs")),
  ]);

  await withEmulatorOperationTimeout(leagueRef.delete(), "delete multiplayer test league");

  return {
    deleted: true,
    reason: "deleted-marked-test-league",
    teams,
    memberships,
    events,
    weeks,
    adminLogs,
    ...draftSummary,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetMultiplayerTestLeague()
    .then((summary) => {
      console.log(`Reset multiplayer test league: ${summary.reason}`);
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
