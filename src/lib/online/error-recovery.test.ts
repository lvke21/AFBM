import { describe, expect, it } from "vitest";

import {
  classifyOnlineRecoveryError,
  getMissingPlayerRecoveryCopy,
  getMissingTeamRecoveryCopy,
  getOnlineRecoveryCopy,
} from "./error-recovery";

describe("online error recovery", () => {
  it("classifies auth, permission, not found and network failures", () => {
    expect(classifyOnlineRecoveryError({ code: "auth/network-request-failed" })).toBe("auth");
    expect(classifyOnlineRecoveryError({ code: "permission-denied" })).toBe("permission");
    expect(classifyOnlineRecoveryError(new Error("Liga nicht gefunden"))).toBe("not-found");
    expect(classifyOnlineRecoveryError(new Error("service unavailable"))).toBe("network");
  });

  it("returns safe fallback copy for unknown sync errors", () => {
    expect(
      getOnlineRecoveryCopy("kaputt", {
        title: "Sync fehlgeschlagen",
        message: "Daten konnten nicht synchronisiert werden.",
        helper: "Versuche es erneut.",
      }),
    ).toEqual({
      kind: "sync",
      title: "Sync fehlgeschlagen",
      message: "Daten konnten nicht synchronisiert werden.",
      helper: "Versuche es erneut.",
    });
  });

  it("has explicit recovery copy for missing player and team states", () => {
    expect(getMissingPlayerRecoveryCopy()).toMatchObject({
      kind: "missing-player",
      title: "Spieler in dieser Liga nicht gefunden",
    });
    expect(getMissingTeamRecoveryCopy()).toMatchObject({
      kind: "missing-team",
      title: "Team-Zuordnung fehlt",
    });
  });
});
