import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const onlineBackendMode = process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND;
const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
const firebaseAuthEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

function requireClientEnv(name: string, value: string | undefined) {
  if (value) {
    return value;
  }

  const fallback = getDemoFirebaseClientEnvFallback(name);

  if (fallback) {
    return fallback;
  }

  throw new Error(`Missing required Firebase client environment variable: ${name}`);
}

function allowsDemoFirebaseClientEnvFallback() {
  return process.env.NODE_ENV !== "production" && onlineBackendMode === "firebase";
}

function getDemoFirebaseClientEnvFallback(name: string) {
  if (!allowsDemoFirebaseClientEnvFallback()) {
    return null;
  }

  const projectId = firebaseProjectId ?? "demo-afbm";
  const values: Record<string, string> = {
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:e2e",
  };

  return values[name] ?? null;
}

function parseEmulatorHost(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [host, rawPort] = value.split(":");
  const port = Number(rawPort);

  if (!host || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid Firebase emulator host: ${value}`);
  }

  return { host, port };
}

function connectFirebaseClientEmulators(app: FirebaseApp) {
  if (typeof window === "undefined") {
    return;
  }

  const state = window as typeof window & {
    __afbmFirebaseEmulatorsConnected?: {
      auth?: boolean;
      firestore?: boolean;
    };
  };
  const connectionState = state.__afbmFirebaseEmulatorsConnected ?? {};
  const firestoreHost = parseEmulatorHost(
    firestoreEmulatorHost ?? (allowsDemoFirebaseClientEnvFallback() ? "127.0.0.1:8080" : undefined),
  );
  const authHost = parseEmulatorHost(
    firebaseAuthEmulatorHost ??
      (allowsDemoFirebaseClientEnvFallback() ? "127.0.0.1:9099" : undefined),
  );

  if (firestoreHost && !connectionState.firestore) {
    connectFirestoreEmulator(getFirestore(app), firestoreHost.host, firestoreHost.port);
    connectionState.firestore = true;
  }

  if (authHost && !connectionState.auth) {
    connectAuthEmulator(getAuth(app), `http://${authHost.host}:${authHost.port}`, {
      disableWarnings: true,
    });
    connectionState.auth = true;
  }

  state.__afbmFirebaseEmulatorsConnected = connectionState;
}

export function getFirebaseClientConfig(): FirebaseClientConfig {
  return {
    apiKey: requireClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY", firebaseApiKey),
    authDomain: requireClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseAuthDomain),
    projectId: requireClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseProjectId),
    storageBucket: requireClientEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseStorageBucket),
    messagingSenderId: requireClientEnv(
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      firebaseMessagingSenderId,
    ),
    appId: requireClientEnv("NEXT_PUBLIC_FIREBASE_APP_ID", firebaseAppId),
  };
}

export function getFirebaseClientApp(): FirebaseApp {
  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseClientConfig());

  connectFirebaseClientEmulators(app);

  return app;
}
