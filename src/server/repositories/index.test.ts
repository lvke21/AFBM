import { afterEach, describe, expect, it, vi } from "vitest";

import { getRepositories } from "./index";

describe("repository provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses prisma as the default backend", () => {
    vi.stubEnv("DATA_BACKEND", "");

    const repositories = getRepositories();

    expect(repositories.backend).toBe("prisma");
    expect(repositories.saveGames.listByUser).toBeTypeOf("function");
    expect(repositories.teams.findOwnedByUser).toBeTypeOf("function");
    expect(repositories.players.findOwnedByUser).toBeTypeOf("function");
    expect(repositories.matches.findDetailForUser).toBeTypeOf("function");
  });

  it("rejects unavailable backends until they are implemented", () => {
    vi.stubEnv("DATA_BACKEND", "unknown");

    expect(() => getRepositories()).toThrow('Unsupported DATA_BACKEND "unknown"');
  });

  it("rejects firestore outside the emulator", () => {
    vi.stubEnv("DATA_BACKEND", "firestore");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
    vi.stubEnv("FIREBASE_EMULATOR_HOST", "");
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");

    expect(() => getRepositories()).toThrow(
      "Non-emulator Firestore access requires FIRESTORE_PREVIEW_DRY_RUN=true",
    );
  });

  it("uses firestore repositories in emulator mode", () => {
    vi.stubEnv("DATA_BACKEND", "firestore");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-afbm");

    const repositories = getRepositories();

    expect(repositories.backend).toBe("firestore");
    expect(repositories.teams.findOwnedByUser).toBeTypeOf("function");
    expect(repositories.players.findOwnedByUser).toBeTypeOf("function");
    expect(repositories.seasons.findOwnedByUser).toBeTypeOf("function");
    expect(repositories.weeks.findCurrentBySaveGame).toBeTypeOf("function");
    expect(repositories.matches.findDetailForUser).toBeTypeOf("function");
    expect(repositories.saveGames.listByUser).toBeTypeOf("function");
  });
});
