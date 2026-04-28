import { describe, expect, it } from "vitest";

import type { SeasonMatchSummary, SeasonOverview } from "@/modules/seasons/domain/season.types";

import {
  getGameFlowHref,
  getGameFlowStatus,
  getGameReportPhase,
  getGameReportPhaseLabel,
  selectGameFlowMatchForStep,
  selectRelevantGameFlowMatch,
} from "./game-flow-model";

function createMatch(overrides: Partial<SeasonMatchSummary> = {}): SeasonMatchSummary {
  return {
    awayScore: null,
    awayTeamId: "away-1",
    awayTeamName: "Away",
    homeScore: null,
    homeTeamId: "home-1",
    homeTeamName: "Home",
    id: "match-1",
    kind: "REGULAR_SEASON",
    scheduledAt: new Date("2026-09-10T18:00:00Z"),
    status: "SCHEDULED",
    week: 1,
    ...overrides,
  };
}

function createSeason(matches: SeasonMatchSummary[]): SeasonOverview {
  return {
    championName: null,
    id: "season-1",
    matches,
    phase: "REGULAR_SEASON",
    playoffPicture: [],
    standings: [],
    week: 2,
    year: 2026,
  };
}

describe("game flow model", () => {
  it("maps match status to the right flow step link", () => {
    expect(getGameFlowHref("save-1", createMatch({ id: "scheduled" }))).toBe(
      "/app/savegames/save-1/game/setup?matchId=scheduled",
    );
    expect(
      getGameFlowHref("save-1", createMatch({ id: "live", status: "IN_PROGRESS" })),
    ).toBe("/app/savegames/save-1/game/live?matchId=live");
    expect(getGameFlowHref("save-1", createMatch({ id: "done", status: "COMPLETED" }))).toBe(
      "/app/savegames/save-1/game/report?matchId=done",
    );
    expect(getGameFlowHref("save-1", null)).toBe("/app/savegames/save-1/game/setup");
  });

  it("uses clear display statuses for the user flow", () => {
    expect(getGameFlowStatus("SCHEDULED")).toBe("pre");
    expect(getGameFlowStatus("IN_PROGRESS")).toBe("live");
    expect(getGameFlowStatus("COMPLETED")).toBe("finished");
  });

  it("derives report phase from actual match status without false finished state", () => {
    expect(getGameReportPhase("SCHEDULED")).toBe("PRE_GAME");
    expect(getGameReportPhase("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(getGameReportPhase("COMPLETED")).toBe("FINISHED");
    expect(getGameReportPhaseLabel("PRE_GAME")).toBe("Vor dem Spiel");
    expect(getGameReportPhaseLabel("IN_PROGRESS")).toBe("Live");
    expect(getGameReportPhaseLabel("FINISHED")).toBe("Beendet");
  });

  it("selects the next relevant game with live games first", () => {
    const season = createSeason([
      createMatch({ id: "later-scheduled", scheduledAt: new Date("2026-09-17T18:00:00Z"), week: 3 }),
      createMatch({
        awayTeamId: "manager-team",
        id: "manager-live",
        status: "IN_PROGRESS",
        week: 2,
      }),
      createMatch({ id: "other-live", status: "IN_PROGRESS", week: 2 }),
    ]);

    expect(selectRelevantGameFlowMatch(season, "manager-team")?.id).toBe("manager-live");
  });

  it("selects a step-specific match before falling back to the relevant game", () => {
    const season = createSeason([
      createMatch({
        awayScore: 17,
        awayTeamId: "manager-team",
        homeScore: 24,
        id: "finished",
        status: "COMPLETED",
        week: 1,
      }),
      createMatch({ id: "scheduled", status: "SCHEDULED", week: 2 }),
    ]);

    expect(selectGameFlowMatchForStep(season, "manager-team", "report")?.id).toBe("finished");
    expect(selectGameFlowMatchForStep(season, "manager-team", "live")?.id).toBe("scheduled");
  });
});
