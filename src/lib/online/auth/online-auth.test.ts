import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  clearOnlineAuthBrowserContext,
  getOnlineAuthErrorDetails,
  getOnlineAuthErrorMessage,
} from "./online-auth";

describe("online-auth", () => {
  it.each([
    ["auth/email-already-in-use", "Diese Email wird bereits verwendet. Bitte melde dich an."],
    ["auth/invalid-credential", "Email oder Passwort ist falsch."],
    ["auth/wrong-password", "Das Passwort ist falsch."],
    ["auth/user-not-found", "Zu dieser Email existiert kein Account."],
    ["auth/weak-password", "Das Passwort ist zu schwach. Bitte nutze mindestens 6 Zeichen."],
    ["auth/invalid-email", "Bitte gib eine gültige Email-Adresse ein."],
    [
      "auth/operation-not-allowed",
      "Email/Passwort-Login ist im Firebase-Projekt noch nicht aktiviert.",
    ],
    [
      "auth/network-request-failed",
      "Netzwerkfehler bei Firebase Auth. Bitte versuche es erneut.",
    ],
  ])("maps %s to a user-facing message", (code, message) => {
    expect(getOnlineAuthErrorMessage({ code })).toBe(message);
  });

  it("does not bootstrap online users through anonymous Firebase auth", () => {
    const source = readFileSync(fileURLToPath(import.meta.url).replace(".test.ts", ".ts"), "utf8");

    expect(source).not.toContain(["signIn", "Anonymously"].join(""));
    expect(source).not.toContain(["link", "WithCredential"].join(""));
    expect(source).not.toContain(["Email", "AuthProvider"].join(""));
  });

  it("keeps Firebase error codes and messages available for the UI", () => {
    expect(
      getOnlineAuthErrorDetails({
        code: "auth/operation-not-allowed",
        message: "Email/password sign-in is disabled.",
      }),
    ).toEqual({
      code: "auth/operation-not-allowed",
      message: "Email/password sign-in is disabled.",
      name: "UnknownError",
    });
  });

  it("clears local online context on logout without touching other browser storage", () => {
    const values = new Map<string, string>([
      ["afbm.online.lastLeagueId", "league-1"],
      ["afbm.online.leagues", "[]"],
      ["afbm.online.userId", "user-1"],
      ["afbm.online.username", "Coach One"],
      ["afbm.savegames.activeSaveGameId", "save-1"],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };

    clearOnlineAuthBrowserContext(storage);

    expect(storage.getItem("afbm.online.lastLeagueId")).toBeNull();
    expect(storage.getItem("afbm.online.leagues")).toBeNull();
    expect(storage.getItem("afbm.online.userId")).toBeNull();
    expect(storage.getItem("afbm.online.username")).toBeNull();
    expect(storage.getItem("afbm.savegames.activeSaveGameId")).toBe("save-1");
  });
});
