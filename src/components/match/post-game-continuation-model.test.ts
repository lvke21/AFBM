import { describe, expect, it } from "vitest";

import { buildPostGameContinuationState } from "./post-game-continuation-model";
import type { MatchReport } from "./match-report-model";

function createMatch(overrides: Partial<MatchReport> = {}): MatchReport {
  return {
    status: "COMPLETED",
    stadiumName: "Harbor Field",
    summary: "Boston gewinnt.",
    homeTeam: {
      name: "Boston Guardians",
      abbreviation: "BOS",
      managerControlled: true,
      score: 24,
      stats: null,
    },
    awayTeam: {
      name: "New York Titans",
      abbreviation: "NYT",
      managerControlled: false,
      score: 17,
      stats: null,
    },
    leaders: {},
    drives: [],
    ...overrides,
  };
}

describe("post-game continuation model", () => {
  it("gives the player an immediate next-week task after a completed game", () => {
    const state = buildPostGameContinuationState({
      match: createMatch(),
      saveGameId: "save-1",
      weekState: "POST_GAME",
    });

    expect(state.action).toEqual({
      kind: "advance-week",
      label: "Naechste Woche laden",
      href: null,
    });
    expect(state.progress).toContain("Week Loop 4/4");
    expect(state.nextTask).toContain("Naechste Woche");
    expect(state.motivation).not.toBe("");
  });

  it("avoids a post-game dead end when the week state already moved on", () => {
    const state = buildPostGameContinuationState({
      match: createMatch(),
      saveGameId: "save-1",
      weekState: "PRE_WEEK",
    });

    expect(state.action).toEqual({
      kind: "dashboard",
      label: "Naechste Aktion ansehen",
      href: "/app/savegames/save-1",
    });
    expect(state.nextTask).toContain("Dashboard");
  });

  it("stays hidden before the game is finished", () => {
    const state = buildPostGameContinuationState({
      match: createMatch({
        status: "SCHEDULED",
        homeTeam: {
          ...createMatch().homeTeam,
          score: null,
        },
        awayTeam: {
          ...createMatch().awayTeam,
          score: null,
        },
      }),
      saveGameId: "save-1",
      weekState: "READY",
    });

    expect(state.action).toBeNull();
    expect(state.emptyMessage).toContain("abgeschlossenen Spiel");
  });
});
