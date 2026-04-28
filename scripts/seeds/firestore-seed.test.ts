import { describe, expect, it } from "vitest";

import {
  buildFirestoreSeedDocuments,
  ensureFirestoreEmulatorEnvironment,
  FIRESTORE_SEED_COLLECTIONS,
  summarizeSeedDocuments,
  withEmulatorOperationTimeout,
} from "./firestore-seed";
import {
  FIRESTORE_PARITY_IDS,
  FIRESTORE_PARITY_TEAM_TEMPLATES,
  PARITY_EXPECTED_COUNTS,
  PARITY_FIXTURE_MAPPING,
} from "./parity-fixture";
import { expectedFirestoreParityDocumentIds } from "./firestore-verify";

describe("firestore emulator seed data", () => {
  it("builds a realistic league structure", () => {
    const documents = buildFirestoreSeedDocuments();
    const summary = summarizeSeedDocuments(documents);

    expect(summary.users).toBe(PARITY_EXPECTED_COUNTS.users);
    expect(summary.leagues).toBe(PARITY_EXPECTED_COUNTS.leagues);
    expect(summary.leagueMembers).toBe(PARITY_EXPECTED_COUNTS.leagueMembers);
    expect(summary.teams).toBe(PARITY_EXPECTED_COUNTS.teams);
    expect(summary.players).toBe(PARITY_EXPECTED_COUNTS.players);
    expect(summary.seasons).toBe(PARITY_EXPECTED_COUNTS.seasons);
    expect(summary.weeks).toBe(PARITY_EXPECTED_COUNTS.weeks);
    expect(summary.matches).toBe(PARITY_EXPECTED_COUNTS.matches);
    expect(summary.playerStats).toBe(PARITY_EXPECTED_COUNTS.playerStats);
    expect(summary.teamStats).toBe(PARITY_EXPECTED_COUNTS.teamStats);
    expect(summary.reports).toBe(PARITY_EXPECTED_COUNTS.reports);
  });

  it("uses only the final Firestore collections", () => {
    const documents = buildFirestoreSeedDocuments();
    const allowedCollections = new Set<string>(FIRESTORE_SEED_COLLECTIONS);

    expect(documents.every((document) => allowedCollections.has(document.collection))).toBe(true);
  });

  it("keeps all league scoped documents tied to the demo league", () => {
    const documents = buildFirestoreSeedDocuments();
    const leagueScopedCollections = new Set([
      "teams",
      "players",
      "seasons",
      "weeks",
      "matches",
      "playerStats",
      "teamStats",
      "reports",
    ]);

    for (const document of documents) {
      if (leagueScopedCollections.has(document.collection)) {
        expect(document.data.leagueId).toBe(FIRESTORE_PARITY_IDS.leagueId);
      }
    }
  });

  it("exposes stable Firestore fixture IDs and Prisma mapping for parity", () => {
    const documents = buildFirestoreSeedDocuments();
    const documentKeys = new Set(
      documents.map((document) => `${document.collection}/${document.id}`),
    );
    const expectedIds = expectedFirestoreParityDocumentIds();

    expect(PARITY_FIXTURE_MAPPING.managerTeam.firestoreId).toBe(
      FIRESTORE_PARITY_TEAM_TEMPLATES[0][0],
    );
    expect(PARITY_FIXTURE_MAPPING.managerTeam.prismaId).toBe("e2e-team-bos");

    for (const [collectionName, ids] of Object.entries(expectedIds)) {
      for (const id of ids) {
        expect(documentKeys.has(`${collectionName}/${id}`)).toBe(true);
      }
    }
  });

  it("uses emulator defaults and blocks non-demo projects before writing", () => {
    expect(() =>
      ensureFirestoreEmulatorEnvironment({
        FIREBASE_PROJECT_ID: "production-afbm",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      }),
    ).toThrow("Use a demo-* emulator project");

    expect(() =>
      ensureFirestoreEmulatorEnvironment({
        FIREBASE_PROJECT_ID: "demo-afbm",
      }),
    ).not.toThrow();
  });

  it("keeps seed/reset style operations blocked for staging projects", () => {
    expect(() =>
      ensureFirestoreEmulatorEnvironment({
        FIREBASE_PROJECT_ID: "afbm-staging",
        FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS: "afbm-staging",
        FIRESTORE_PREVIEW_DRY_RUN: "true",
      }),
    ).toThrow("Use a demo-* emulator project");
  });

  it("fails fast when an emulator operation does not complete", async () => {
    await expect(
      withEmulatorOperationTimeout(new Promise(() => undefined), "test timeout", 1),
    ).rejects.toThrow("Timed out after 1ms");
  });
});
