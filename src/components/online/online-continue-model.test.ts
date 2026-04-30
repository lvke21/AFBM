import { describe, expect, it } from "vitest";

import { ONLINE_MVP_TEAM_POOL, type OnlineLeague } from "@/lib/online/online-league-service";

import { buildOnlineContinueState } from "./online-continue-model";

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
  it("explains when no last league id is stored", () => {
    expect(buildOnlineContinueState(null, null)).toEqual({
      status: "missing-last-league",
      message: "Du bist noch keiner Online-Liga beigetreten.",
      helper: "Suche zuerst nach einer Liga.",
    });
  });

  it("explains when the stored last league id is invalid", () => {
    expect(buildOnlineContinueState("missing-league", null)).toEqual({
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
