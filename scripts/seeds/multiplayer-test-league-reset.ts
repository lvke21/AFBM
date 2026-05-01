import type { DocumentReference } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import {
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
} from "./multiplayer-test-league-firestore-seed";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  type MultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./multiplayer-firestore-env";

const deleteBatchSize = 400;

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

async function deleteCollection(
  collectionRef: FirebaseFirestore.CollectionReference,
  environment: MultiplayerFirestoreEnvironment,
) {
  const documents = await withMultiplayerFirestoreTimeout(
    collectionRef.listDocuments(),
    `list ${collectionRef.path} before multiplayer reset`,
    environment,
  );
  let deleted = 0;

  for (let index = 0; index < documents.length; index += deleteBatchSize) {
    const batch = getFirebaseAdminFirestore().batch();
    documents.slice(index, index + deleteBatchSize).forEach((documentRef) => {
      batch.delete(documentRef);
    });
    await withMultiplayerFirestoreTimeout(batch.commit(), `delete ${collectionRef.path}`, environment);
    deleted += documents.slice(index, index + deleteBatchSize).length;
  }

  return deleted;
}

async function deleteDraftSubtree(
  leagueRef: DocumentReference,
  environment: MultiplayerFirestoreEnvironment,
) {
  const draftRef = leagueRef.collection("draft").doc("main");
  const [availablePlayers, picks] = await Promise.all([
    deleteCollection(draftRef.collection("availablePlayers"), environment),
    deleteCollection(draftRef.collection("picks"), environment),
  ]);
  const draftSnapshot = await withMultiplayerFirestoreTimeout(
    draftRef.get(),
    "read multiplayer draft doc before reset",
    environment,
  );

  if (draftSnapshot.exists) {
    await withMultiplayerFirestoreTimeout(draftRef.delete(), "delete multiplayer draft doc", environment);
  }

  return {
    draftDocs: draftSnapshot.exists ? 1 : 0,
    availablePlayers,
    picks,
  };
}

export async function resetMultiplayerTestLeague() {
  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: true });
  logMultiplayerFirestoreEnvironment(environment, "reset multiplayer test league");

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const leagueSnapshot = await withMultiplayerFirestoreTimeout(
    leagueRef.get(),
    "read multiplayer test league before reset",
    environment,
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
    deleteDraftSubtree(leagueRef, environment),
    deleteCollection(leagueRef.collection("teams"), environment),
    deleteCollection(leagueRef.collection("memberships"), environment),
    deleteCollection(leagueRef.collection("events"), environment),
    deleteCollection(leagueRef.collection("weeks"), environment),
    deleteCollection(leagueRef.collection("adminLogs"), environment),
  ]);

  await withMultiplayerFirestoreTimeout(leagueRef.delete(), "delete multiplayer test league", environment);

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
