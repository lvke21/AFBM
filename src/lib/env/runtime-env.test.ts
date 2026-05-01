import { describe, expect, it } from "vitest";

import { assertRuntimeEnvironment, readDeployEnvironment } from "./runtime-env";

const stagingEnv = {
  AFBM_DEPLOY_ENV: "staging",
  AFBM_ONLINE_BACKEND: "firebase",
  DATA_BACKEND: "firestore",
  NEXT_PUBLIC_AFBM_ONLINE_BACKEND: "firebase",
  NODE_ENV: "production",
};

const productionEnv = {
  ...stagingEnv,
  AFBM_DEPLOY_ENV: "production",
  DATA_BACKEND: "prisma",
  DATABASE_URL: "postgresql://production.example.test/afbm",
  NEXT_PUBLIC_FIREBASE_API_KEY: "firebase-api-key",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:prod",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "afbm-prod.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "afbm-prod",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "afbm-prod.appspot.com",
};

describe("runtime environment validation", () => {
  it("allows local development defaults", () => {
    expect(
      assertRuntimeEnvironment({
        NODE_ENV: "development",
      }),
    ).toEqual({ deployEnvironment: "local" });
  });

  it("treats production NODE_ENV without explicit deploy env as production", () => {
    expect(readDeployEnvironment({ NODE_ENV: "production" })).toBe("production");
  });

  it("allows staging with Firebase custom-claim admin and no local backend", () => {
    expect(assertRuntimeEnvironment(stagingEnv)).toEqual({ deployEnvironment: "staging" });
  });

  it("allows staging firestore without legacy DATABASE_URL", () => {
    expect(assertRuntimeEnvironment({
      ...stagingEnv,
      DATABASE_URL: undefined,
    })).toEqual({ deployEnvironment: "staging" });
  });

  it("blocks production when critical secrets are missing", () => {
    expect(() =>
      assertRuntimeEnvironment({
        AFBM_DEPLOY_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toThrow("DATABASE_URL");
  });

  it("blocks client emulator flags and local online mode in production", () => {
    expect(() =>
      assertRuntimeEnvironment({
        ...productionEnv,
        NEXT_PUBLIC_AFBM_ONLINE_BACKEND: "local",
        NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      }),
    ).toThrow("NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST");
  });

  it("blocks deprecated admin password env in production", () => {
    expect(() =>
      assertRuntimeEnvironment({
        ...productionEnv,
        ADMIN_ACCESS_CODE: "legacy-admin-code",
        AFBM_ADMIN_ACCESS_CODE: "legacy-admin-code",
      }),
    ).toThrow("ADMIN_ACCESS_CODE");
  });

  it("allows production when required public config and server secrets are present", () => {
    expect(assertRuntimeEnvironment(productionEnv)).toEqual({ deployEnvironment: "production" });
  });
});
