import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function requireClientEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required Firebase client environment variable: ${name}`);
  }

  return value;
}

export function getFirebaseClientConfig(): FirebaseClientConfig {
  return {
    apiKey: requireClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: requireClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: requireClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: requireClientEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requireClientEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requireClientEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };
}

export function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseClientConfig());
}
