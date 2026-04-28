import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";

import {
  ensureFirestoreEmulatorEnvironment,
  FIRESTORE_SEED_COLLECTIONS,
  withEmulatorOperationTimeout,
} from "./firestore-seed";
import {
  FIRESTORE_PARITY_IDS,
  FIRESTORE_PARITY_TEAM_TEMPLATES,
  makeFirestoreMatchId,
  makeFirestoreWeekId,
  PARITY_EXPECTED_COUNTS,
} from "./parity-fixture";

const expectedSeedCounts: Record<string, number> = PARITY_EXPECTED_COUNTS;

const expectedResetCounts = Object.fromEntries(
  FIRESTORE_SEED_COLLECTIONS.map((collection) => [collection, 0]),
);

export async function verifyFirestoreEmulatorCounts(
  expectedCounts: Record<string, number> = expectedSeedCounts,
) {
  ensureFirestoreEmulatorEnvironment();
  const firestore = getFirebaseAdminFirestore();
  const actualCounts: Record<string, number> = {};

  for (const collectionName of FIRESTORE_SEED_COLLECTIONS) {
    const snapshot = await withEmulatorOperationTimeout(
      firestore.collection(collectionName).get(),
      `count ${collectionName} emulator documents`,
    );
    actualCounts[collectionName] = snapshot.size;
  }

  const mismatches = FIRESTORE_SEED_COLLECTIONS.filter(
    (collectionName) => actualCounts[collectionName] !== expectedCounts[collectionName],
  );

  return {
    actualCounts,
    expectedCounts,
    ok: mismatches.length === 0,
    mismatches,
  };
}

export function expectedFirestoreParityDocumentIds() {
  return {
    leagues: [FIRESTORE_PARITY_IDS.leagueId],
    matches: [FIRESTORE_PARITY_IDS.firstMatchId, makeFirestoreMatchId(2, 1)],
    players: FIRESTORE_PARITY_TEAM_TEMPLATES.map(
      ([teamId]) => `${teamId}-qb`,
    ),
    seasons: [FIRESTORE_PARITY_IDS.seasonId],
    teams: FIRESTORE_PARITY_TEAM_TEMPLATES.map(([teamId]) => teamId),
    users: [FIRESTORE_PARITY_IDS.ownerId],
    weeks: [makeFirestoreWeekId(1), makeFirestoreWeekId(2)],
  };
}

export async function verifyFirestoreEmulatorFixtureIds() {
  ensureFirestoreEmulatorEnvironment();
  const firestore = getFirebaseAdminFirestore();
  const expectedIds = expectedFirestoreParityDocumentIds();
  const missing: string[] = [];

  for (const [collectionName, ids] of Object.entries(expectedIds)) {
    for (const id of ids) {
      const snapshot = await withEmulatorOperationTimeout(
        firestore.collection(collectionName).doc(id).get(),
        `read ${collectionName}/${id} while verifying emulator fixture IDs`,
      );

      if (!snapshot.exists) {
        missing.push(`${collectionName}/${id}`);
      }
    }
  }

  return {
    expectedIds,
    missing,
    ok: missing.length === 0,
  };
}

function readExpectedMode() {
  const modeArg = process.argv.find((arg) => arg.startsWith("--expect="));
  return modeArg?.replace("--expect=", "") ?? "seeded";
}

async function main() {
  const expectedCounts = readExpectedMode() === "empty"
    ? expectedResetCounts
    : expectedSeedCounts;
  const result = await verifyFirestoreEmulatorCounts(expectedCounts);
  const fixtureIdResult = readExpectedMode() === "empty"
    ? { missing: [], ok: true }
    : await verifyFirestoreEmulatorFixtureIds();

  console.log("Firestore emulator collection counts:");
  for (const collectionName of FIRESTORE_SEED_COLLECTIONS) {
    console.log(
      `- ${collectionName}: ${result.actualCounts[collectionName]} / expected ${result.expectedCounts[collectionName]}`,
    );
  }

  if (!result.ok) {
    throw new Error(`Unexpected Firestore emulator counts: ${result.mismatches.join(", ")}`);
  }

  if (!fixtureIdResult.ok) {
    throw new Error(`Missing Firestore parity fixture documents: ${fixtureIdResult.missing.join(", ")}`);
  }

  if (readExpectedMode() !== "empty") {
    console.log("Firestore parity fixture IDs: OK");
  }
}

if (process.argv[1]?.endsWith("firestore-verify.ts")) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
