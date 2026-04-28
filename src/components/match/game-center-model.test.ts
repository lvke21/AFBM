import { describe, expect, it } from "vitest";

import {
  buildGameCenterStatusState,
  getGameCenterHref,
  getGameReportHref,
} from "./game-center-model";
import type { MatchReport } from "./match-report-model";

function createMatch(status: string, overrides: Partial<MatchReport> = {}): MatchReport {
  return {
    status,
    stadiumName: null,
    summary: "Match summary",
    homeTeam: {
      name: "Boston Guardians",
      abbreviation: "BOS",
      score: status === "SCHEDULED" ? null : 14,
      stats: null,
    },
    awayTeam: {
      name: "New York Titans",
      abbreviation: "NYT",
      score: status === "SCHEDULED" ? null : 10,
      stats: null,
    },
    leaders: {},
    drives: status === "SCHEDULED"
      ? []
      : [
          {
            sequence: 1,
            phaseLabel: "Q1",
            offenseTeamAbbreviation: "BOS",
            defenseTeamAbbreviation: "NYT",
            startedScore: "0-0",
            endedScore: "7-0",
            plays: 8,
            passAttempts: 5,
            rushAttempts: 3,
            totalYards: 72,
            resultType: "TOUCHDOWN",
            turnover: false,
            redZoneTrip: true,
            summary: "Boston beendet den Drive mit einem Touchdown.",
            pointsScored: 7,
            primaryPlayerName: "Alex Carter",
            primaryDefenderName: null,
          },
        ],
    ...overrides,
  };
}

describe("game center model", () => {
  it("builds stable Game Center and report links", () => {
    expect(getGameCenterHref("save-1", "match-1")).toBe(
      "/app/savegames/save-1/game/live?matchId=match-1",
    );
    expect(getGameCenterHref("save-1", null)).toBeNull();
    expect(getGameReportHref("save-1", "match-1")).toBe(
      "/app/savegames/save-1/game/report?matchId=match-1",
    );
  });

  it("represents scheduled games without score or drives", () => {
    const state = buildGameCenterStatusState(
      createMatch("SCHEDULED"),
      "/app/savegames/save-1/matches/match-1",
    );

    expect(state.label).toBe("Geplant");
    expect(state.tone).toBe("scheduled");
    expect(state.scoreLine).toBe("BOS - : - NYT");
    expect(state.hasDriveLog).toBe(false);
    expect(state.reportReady).toBe(false);
  });

  it("represents in-progress games as live with the latest drive", () => {
    const state = buildGameCenterStatusState(
      createMatch("IN_PROGRESS"),
      "/app/savegames/save-1/matches/match-1",
    );

    expect(state.label).toBe("Laeuft");
    expect(state.tone).toBe("live");
    expect(state.scoreLine).toBe("BOS 14 : 10 NYT");
    expect(state.hasDriveLog).toBe(true);
    expect(state.lastDrive?.resultType).toBe("TOUCHDOWN");
    expect(state.reportReady).toBe(false);
  });

  it("represents completed games as final and report-ready", () => {
    const state = buildGameCenterStatusState(
      createMatch("COMPLETED"),
      "/app/savegames/save-1/matches/match-1",
    );

    expect(state.label).toBe("Final");
    expect(state.tone).toBe("final");
    expect(state.reportReady).toBe(true);
  });
});
