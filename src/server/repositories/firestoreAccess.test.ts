import { describe, expect, it } from "vitest";

import { canReadFirestoreLeagueFromDocs } from "./firestoreAccess";

describe("firestore league access", () => {
  it("uses canonical online membership instead of the global mirror for online leagues", () => {
    const league = {
      ownerId: "owner",
      settings: {
        onlineBackbone: true,
      },
    };

    expect(
      canReadFirestoreLeagueFromDocs({
        userId: "gm",
        league,
        legacyMirror: {
          userId: "gm",
          status: "ACTIVE",
        },
        onlineMembership: null,
      }),
    ).toBe(false);
    expect(
      canReadFirestoreLeagueFromDocs({
        userId: "gm",
        league,
        legacyMirror: null,
        onlineMembership: {
          userId: "gm",
          status: "active",
        },
      }),
    ).toBe(true);
  });

  it("keeps the legacy mirror path only for non-online leagues", () => {
    expect(
      canReadFirestoreLeagueFromDocs({
        userId: "gm",
        league: {
          ownerId: "owner",
          settings: {},
        },
        legacyMirror: {
          userId: "gm",
          status: "ACTIVE",
        },
        onlineMembership: null,
      }),
    ).toBe(true);
  });

  it("does not accept mirrors that belong to another user", () => {
    expect(
      canReadFirestoreLeagueFromDocs({
        userId: "gm",
        league: {
          ownerId: "owner",
          settings: {},
        },
        legacyMirror: {
          userId: "other-user",
          status: "ACTIVE",
        },
        onlineMembership: null,
      }),
    ).toBe(false);
  });
});
