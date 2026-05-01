import { describe, expect, it } from "vitest";

import { configureMultiplayerFirestoreEnvironment } from "./multiplayer-firestore-env";

describe("multiplayer firestore seed environment", () => {
  it("configures emulator mode explicitly", () => {
    const env: Record<string, string | undefined> = {
      USE_FIRESTORE_EMULATOR: "true",
    };

    expect(configureMultiplayerFirestoreEnvironment({}, env)).toEqual({
      mode: "emulator",
      projectId: "demo-afbm",
      emulatorHost: "127.0.0.1:8080",
      resetAllowed: true,
    });
    expect(env.FIRESTORE_EMULATOR_HOST).toBe("127.0.0.1:8080");
    expect(env.FIREBASE_PROJECT_ID).toBe("demo-afbm");
  });

  it("configures staging mode without emulator host", () => {
    const env: Record<string, string | undefined> = {
      USE_FIRESTORE_EMULATOR: "false",
      GOOGLE_CLOUD_PROJECT: "afbm-staging",
      CONFIRM_STAGING_SEED: "true",
    };

    expect(configureMultiplayerFirestoreEnvironment({ allowReset: true }, env)).toEqual({
      mode: "staging",
      projectId: "afbm-staging",
      resetAllowed: true,
    });
    expect(env.FIREBASE_PROJECT_ID).toBe("afbm-staging");
  });

  it("blocks staging reset without explicit confirmation", () => {
    expect(() =>
      configureMultiplayerFirestoreEnvironment(
        { allowReset: true },
        {
          USE_FIRESTORE_EMULATOR: "false",
          GOOGLE_CLOUD_PROJECT: "afbm-staging",
        },
      ),
    ).toThrow("CONFIRM_STAGING_SEED=true");
  });

  it("blocks staging when an emulator host is still set", () => {
    expect(() =>
      configureMultiplayerFirestoreEnvironment(
        {},
        {
          USE_FIRESTORE_EMULATOR: "false",
          GOOGLE_CLOUD_PROJECT: "afbm-staging",
          FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        },
      ),
    ).toThrow("no FIRESTORE_EMULATOR_HOST");
  });

  it("blocks unknown projects and production envs", () => {
    expect(() =>
      configureMultiplayerFirestoreEnvironment(
        {},
        {
          USE_FIRESTORE_EMULATOR: "false",
          GOOGLE_CLOUD_PROJECT: "afbm-production",
        },
      ),
    ).toThrow("afbm-staging");

    expect(() =>
      configureMultiplayerFirestoreEnvironment(
        {},
        {
          USE_FIRESTORE_EMULATOR: "true",
          NODE_ENV: "production",
        },
      ),
    ).toThrow("production");
  });
});
