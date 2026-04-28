import { afterEach, describe, expect, it, vi } from "vitest";

import { backfillFirestoreFromPrisma } from "./firestore-backfill";
import { compareFirestoreBackfill } from "./firestore-compare";

describe("firestore preview script guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks preview backfill without explicit write confirmation", async () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "afbm-staging");
    vi.stubEnv("FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS", "afbm-staging");
    vi.stubEnv("FIRESTORE_PREVIEW_DRY_RUN", "true");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
    vi.stubEnv("FIREBASE_EMULATOR_HOST", "");

    await expect(backfillFirestoreFromPrisma({ reset: false })).rejects.toThrow(
      "FIRESTORE_PREVIEW_CONFIRM_WRITE=true",
    );
  });

  it("blocks preview compare for non-allowlisted projects before reading data", async () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "afbm-staging");
    vi.stubEnv("FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS", "other-staging");
    vi.stubEnv("FIRESTORE_PREVIEW_DRY_RUN", "true");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
    vi.stubEnv("FIREBASE_EMULATOR_HOST", "");

    await expect(compareFirestoreBackfill()).rejects.toThrow(
      "not in FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS",
    );
  });
});
