import { describe, expect, it } from "vitest";

import { ONLINE_MVP_TEAM_POOL } from "@/lib/online/online-league-constants";
import type { OnlineLeague } from "@/lib/online/online-league-types";

import { buildOnlineContinueState, isSafeOnlineLeagueId } from "./online-continue-model";

const league: OnlineLeague = {
  id: "global-test-league",
  name: "Global Test League",
  users: [],
  teams: ONLINE_MVP_TEAM_POOL,
  currentWeek: 1,
  maxUsers: 16,
  status: "waiting",
};

describe("buildOnlineContinueState", () => {
  it("accepts route-safe online league ids only", () => {
    expect(isSafeOnlineLeagueId("global-test-league")).toBe(true);
    expect(isSafeOnlineLeagueId("abc_123")).toBe(true);
    expect(isSafeOnlineLeagueId("")).toBe(false);
    expect(isSafeOnlineLeagueId("../admin")).toBe(false);
    expect(isSafeOnlineLeagueId("league/other")).toBe(false);
  });

  it("explains when no last league id is stored", () => {
    expect(buildOnlineContinueState(null, null)).toEqual({
      status: "missing-last-league",
      message: "Du bist noch keiner Online-Liga beigetreten.",
      helper: "Suche zuerst nach einer Liga.",
    });
  });

  it("rejects a corrupt stored last league id before navigation", () => {
    expect(buildOnlineContinueState("../admin", null)).toEqual({
      status: "invalid-last-league",
      message: "Die gespeicherte Online-Liga ist ungültig.",
      helper: "Suche erneut nach einer Liga.",
    });
  });

  it("explains when the stored last league id is invalid", () => {
    expect(buildOnlineContinueState("missing-league", null)).toEqual({
      status: "missing-league",
      message: "Die zuletzt gespielte Online-Liga konnte nicht gefunden werden.",
      helper: "Suche erneut nach einer Liga.",
    });
  });

  it("explains when the signed-in player has no membership in the stored league", () => {
    expect(buildOnlineContinueState("missing-league", null, { hadAuthenticatedUser: true })).toEqual({
      status: "missing-membership",
      message: "Du bist mit dieser Online-Liga nicht als Manager verbunden.",
      helper: "Melde dich mit dem richtigen Spieler-Account an oder tritt der Liga erneut bei.",
    });
  });

  it("does not navigate when the loaded league does not match the stored id", () => {
    expect(buildOnlineContinueState("other-league", league)).toEqual({
      status: "missing-league",
      message: "Die zuletzt gespielte Online-Liga konnte nicht gefunden werden.",
      helper: "Suche erneut nach einer Liga.",
    });
  });

  it("returns a detail page href for a valid league", () => {
    expect(buildOnlineContinueState("global-test-league", league)).toEqual({
      status: "ready",
      href: "/online/league/global-test-league",
    });
  });
});
