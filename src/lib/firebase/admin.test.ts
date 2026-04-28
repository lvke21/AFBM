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
      "FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID is required",
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

  it("initializes once with emulator-only project configuration", () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "afbm-emulator-test");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");

    const firstApp = getFirebaseAdminApp();
    const secondApp = getFirebaseAdminApp();

    expect(firstApp).toBe(secondApp);
    expect(firstApp.options.projectId).toBe("afbm-emulator-test");
  });
});
