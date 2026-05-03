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

  it("returns a clear fallback for membership projection conflicts", () => {
    expect(
      getOnlineRecoveryCopy(
        new Error("Membership-Projektion inkonsistent in league-1 fuer user-1"),
        {
          title: "Online-Liga konnte nicht geladen werden.",
          message: "Online-Liga konnte nicht geladen werden.",
          helper: "Pruefe deine Verbindung.",
        },
      ),
    ).toEqual({
      kind: "sync",
      title: "Online-Liga muss neu synchronisiert werden",
      message: "Die Liga-Zuordnung ist widerspruechlich und wird nicht angezeigt.",
      helper:
        "Lade die Liga neu oder tritt ueber den Onlinebereich erneut bei. Es wurde keine stille Reparatur ausgefuehrt.",
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
