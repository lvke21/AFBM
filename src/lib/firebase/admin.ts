import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only module by convention: do not import from Client Components.
export type FirebaseAdminConfig = {
  projectId: string;
  clientEmail?: string;
  privateKey?: string;
  emulatorHost?: string;
};

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
}

function missingAdminConfig(message: string): Error {
  return new Error(`Firebase Admin configuration error: ${message}`);
}

export function readFirebaseAdminConfig(
  env: Record<string, string | undefined> = process.env,
): FirebaseAdminConfig {
  const projectId =
    env.FIREBASE_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const emulatorHost =
    env.USE_FIRESTORE_EMULATOR === "false"
      ? undefined
      : env.FIRESTORE_EMULATOR_HOST ?? env.FIREBASE_EMULATOR_HOST;

  if (!projectId) {
    throw missingAdminConfig(
      "FIREBASE_PROJECT_ID, GOOGLE_CLOUD_PROJECT or NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.",
    );
  }

  if (emulatorHost) {
    return {
      projectId,
      emulatorHost,
    };
  }

  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    if (clientEmail || privateKey) {
      throw missingAdminConfig(
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be configured together.",
      );
    }

    return {
      projectId,
    };
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const config = readFirebaseAdminConfig();

  if (config.emulatorHost) {
    return initializeApp({
      projectId: config.projectId,
    });
  }

  if (!config.clientEmail || !config.privateKey) {
    return initializeApp({
      projectId: config.projectId,
    });
  }

  return initializeApp({
    credential: cert({
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
      projectId: config.projectId,
    }),
    projectId: config.projectId,
  });
}

export function getFirebaseAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
