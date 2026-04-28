import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";

import {
  ensureFirestoreEmulatorEnvironment,
  FIRESTORE_SEED_COLLECTIONS,
  withEmulatorOperationTimeout,
} from "./firestore-seed";

const batchSize = 450;

export async function resetFirestoreEmulator() {
  ensureFirestoreEmulatorEnvironment();
  const firestore = getFirebaseAdminFirestore();
  const summary: Record<string, number> = {};

  for (const collectionName of FIRESTORE_SEED_COLLECTIONS) {
    const snapshot = await withEmulatorOperationTimeout(
      firestore.collection(collectionName).listDocuments(),
      `list ${collectionName} documents before reset`,
    );
    summary[collectionName] = snapshot.length;

    for (let index = 0; index < snapshot.length; index += batchSize) {
      const batch = firestore.batch();
      for (const documentRef of snapshot.slice(index, index + batchSize)) {
        batch.delete(documentRef);
      }
      await withEmulatorOperationTimeout(
        batch.commit(),
        `delete ${collectionName} emulator documents`,
      );
    }
  }

  return summary;
}

async function main() {
  const summary = await resetFirestoreEmulator();

  console.log("Reset Firestore emulator collections:");
  for (const collection of FIRESTORE_SEED_COLLECTIONS) {
    console.log(`- ${collection}: deleted ${summary[collection] ?? 0}`);
  }
}

if (process.argv[1]?.endsWith("firestore-reset.ts")) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
