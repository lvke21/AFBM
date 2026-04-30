import { cert, deleteApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import {
  buildFirestoreSeedDocuments,
  FIRESTORE_SEED_COLLECTIONS,
  summarizeSeedDocuments,
} from "./firestore-seed";

const BATCH_LIMIT = 450;
const CONFIRM_ENV = "FIRESTORE_CLOUD_SEED_CONFIRM";
const ALLOW_OVERWRITE_ENV = "FIRESTORE_CLOUD_SEED_ALLOW_OVERWRITE";
const ALLOW_PRODUCTION_ENV = "FIRESTORE_CLOUD_SEED_ALLOW_PRODUCTION";

function readBooleanEnv(name: string) {
  return process.env[name]?.toLowerCase() === "true";
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
}

function assertCloudTarget() {
  if (process.env.NODE_ENV === "production" || process.env.AFBM_DEPLOY_ENV === "production") {
    throw new Error("Refusing to run Cloud Firestore seed scripts in production.");
  }

  const emulatorSignals = [
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_EMULATOR_HOST",
    "FIREBASE_FIRESTORE_EMULATOR_ADDRESS",
    "FIREBASE_EMULATOR_HUB",
  ].filter((name) => process.env[name]);

  if (emulatorSignals.length > 0) {
    throw new Error(
      `Refusing to seed Cloud Firestore while emulator variables are set: ${emulatorSignals.join(", ")}.`,
    );
  }

  if (!readBooleanEnv(CONFIRM_ENV)) {
    throw new Error(
      `Refusing to write Cloud Firestore seed without ${CONFIRM_ENV}=true. ` +
        "Review the target project and existing-data warning first.",
    );
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Cloud Firestore seed requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  if (projectId.startsWith("demo-")) {
    throw new Error(`Refusing to seed demo project "${projectId}". Use a real Cloud Firestore project ID.`);
  }

  const productionProjectId = process.env.FIREBASE_PRODUCTION_PROJECT_ID;
  if (
    productionProjectId &&
    projectId === productionProjectId &&
    !readBooleanEnv(ALLOW_PRODUCTION_ENV)
  ) {
    throw new Error(
      `Refusing to seed production project "${projectId}" without ${ALLOW_PRODUCTION_ENV}=true.`,
    );
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
    projectId,
  };
}

function getCloudFirestore(): Firestore {
  const config = assertCloudTarget();
  const existingApp = getApps()[0];
  const app =
    existingApp ??
    initializeApp({
      credential: cert({
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
        projectId: config.projectId,
      }),
      projectId: config.projectId,
    });

  return getFirestore(app);
}

async function countExistingDocuments(firestore: Firestore) {
  const counts: Record<string, number> = {};

  for (const collectionName of FIRESTORE_SEED_COLLECTIONS) {
    const snapshot = await firestore.collection(collectionName).limit(1).get();
    counts[collectionName] = snapshot.size;
  }

  return counts;
}

function collectionsWithExistingDocuments(counts: Record<string, number>) {
  return FIRESTORE_SEED_COLLECTIONS.filter((collectionName) => (counts[collectionName] ?? 0) > 0);
}

export async function seedCloudFirestore() {
  const firestore = getCloudFirestore();
  const documents = buildFirestoreSeedDocuments();
  const existingCounts = await countExistingDocuments(firestore);
  const nonEmptyCollections = collectionsWithExistingDocuments(existingCounts);

  if (nonEmptyCollections.length > 0 && !readBooleanEnv(ALLOW_OVERWRITE_ENV)) {
    throw new Error(
      "Cloud Firestore already contains seed-target collections: " +
        `${nonEmptyCollections.join(", ")}. ` +
        `Set ${ALLOW_OVERWRITE_ENV}=true to overwrite matching seed document IDs.`,
    );
  }

  for (let index = 0; index < documents.length; index += BATCH_LIMIT) {
    const batch = firestore.batch();
    for (const seedDocument of documents.slice(index, index + BATCH_LIMIT)) {
      batch.set(
        firestore.collection(seedDocument.collection).doc(seedDocument.id),
        seedDocument.data,
      );
    }
    await batch.commit();
  }

  return {
    existingCounts,
    projectId: process.env.FIREBASE_PROJECT_ID ?? "<missing>",
    summary: summarizeSeedDocuments(documents),
  };
}

async function main() {
  try {
    const result = await seedCloudFirestore();

    console.log(`Seeded Cloud Firestore project: ${result.projectId}`);
    console.log("Collections written:");
    for (const collection of FIRESTORE_SEED_COLLECTIONS) {
      console.log(`- ${collection}: ${result.summary[collection]}`);
    }
  } finally {
    await Promise.all(getApps().map((app) => deleteApp(app)));
  }
}

if (process.argv[1]?.endsWith("firestore-cloud-seed.ts")) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
