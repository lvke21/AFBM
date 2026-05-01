import { deleteApp, getApps } from "firebase-admin/app";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getFirebaseAdminApp,
  readFirebaseAdminConfig,
} from "./admin";

async function deleteAdminApps() {
  await Promise.all(getApps().map((app) => deleteApp(app)));
}

describe("firebase admin passive setup", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    await deleteAdminApps();
  });

  it("throws a clear error when project configuration is missing", () => {
    expect(() => readFirebaseAdminConfig({})).toThrow(
      "FIREBASE_PROJECT_ID, GOOGLE_CLOUD_PROJECT or NEXT_PUBLIC_FIREBASE_PROJECT_ID is required",
    );
  });

  it("normalizes escaped service account private keys", () => {
    const config = readFirebaseAdminConfig({
      FIREBASE_PROJECT_ID: "afbm-test",
      FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.test",
      FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
    });

    expect(config.privateKey).toContain("-----BEGIN PRIVATE KEY-----\nabc\n");
  });

  it("allows App Hosting default credentials when explicit service account secrets are absent", () => {
    expect(readFirebaseAdminConfig({
      FIREBASE_PROJECT_ID: "afbm-staging",
    })).toEqual({
      projectId: "afbm-staging",
    });
  });

  it("accepts GOOGLE_CLOUD_PROJECT for staging-style admin credentials", () => {
    expect(readFirebaseAdminConfig({
      GOOGLE_CLOUD_PROJECT: "afbm-staging",
      USE_FIRESTORE_EMULATOR: "false",
    })).toEqual({
      projectId: "afbm-staging",
    });
  });

  it("rejects partial explicit service account configuration", () => {
    expect(() => readFirebaseAdminConfig({
      FIREBASE_PROJECT_ID: "afbm-test",
      FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.test",
    })).toThrow("FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be configured together");
  });

  it("initializes once with emulator-only project configuration", () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "afbm-emulator-test");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");

    const firstApp = getFirebaseAdminApp();
    const secondApp = getFirebaseAdminApp();

    expect(firstApp).toBe(secondApp);
    expect(firstApp.options.projectId).toBe("afbm-emulator-test");
  });
});
