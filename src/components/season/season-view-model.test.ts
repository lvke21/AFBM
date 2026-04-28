import { describe, expect, it } from "vitest";

import type {
  SeasonMatchSummary,
  SeasonStandingRow,
} from "@/modules/seasons/domain/season.types";
import {
  formatMatchResult,
  getCurrentWeekSummary,
  getGameCenterHref,
  getMatchHref,
  getMatchWinnerName,
  getRedZoneTouchdownRate,
  getTeamHref,
  groupScheduleByWeek,
  sortStandingsRows,
} from "./season-view-model";

const standings: SeasonStandingRow[] = [
  {
    teamId: "team-b",
    name: "Beta",
    abbreviation: "BET",
    overallRating: 78,
    record: "2-1",
    pointsFor: 80,
    pointsAgainst: 40,
    touchdownsFor: 8,
    turnoversForced: 2,
    turnoversCommitted: 1,
    turnoverDifferential: 1,
    passingYards: 700,
    rushingYards: 300,
    sacks: 6,
    explosivePlays: 12,
    redZoneTrips: 4,
    redZoneTouchdowns: 2,
  },
  {
    teamId: "team-a",
    name: "Alpha",
    abbreviation: "ALP",
    overallRating: 82,
    record: "3-0",
    pointsFor: 70,
    pointsAgainst: 30,
    touchdownsFor: 7,
    turnoversForced: 3,
    turnoversCommitted: 0,
    turnoverDifferential: 3,
    passingYards: 600,
    rushingYards: 350,
    sacks: 7,
    explosivePlays: 10,
    redZoneTrips: 0,
    redZoneTouchdowns: 0,
  },
];

const matches: SeasonMatchSummary[] = [
  {
    id: "late",
    week: 2,
    kind: "REGULAR_SEASON",
    scheduledAt: new Date("2026-09-15T20:00:00Z"),
    status: "SCHEDULED",
    homeTeamId: "team-a",
    homeTeamName: "Alpha",
    awayTeamId: "team-b",
    awayTeamName: "Beta",
    homeScore: null,
    awayScore: null,
  },
  {
    id: "early",
    week: 1,
    kind: "REGULAR_SEASON",
    scheduledAt: new Date("2026-09-08T20:00:00Z"),
    status: "COMPLETED",
    homeTeamId: "team-c",
    homeTeamName: "Charlie",
    awayTeamId: "team-d",
    awayTeamName: "Delta",
    homeScore: 24,
    awayScore: 17,
  },
];

describe("season view model", () => {
  it("builds stable navigation links", () => {
    expect(getTeamHref("save-1", "team-1")).toBe("/app/savegames/save-1/team");
    expect(getGameCenterHref("save-1", "match-1")).toBe(
      "/app/savegames/save-1/game/live?matchId=match-1",
    );
    expect(getMatchHref("save-1", "match-1")).toBe(
      "/app/savegames/save-1/game/report?matchId=match-1",
    );
  });

  it("sorts standings and formats red-zone rate", () => {
    expect(sortStandingsRows(standings).map((row) => row.teamId)).toEqual(["team-a", "team-b"]);
    expect(getRedZoneTouchdownRate(standings[0])).toBe(50);
    expect(getRedZoneTouchdownRate(standings[1])).toBeNull();
  });

  it("groups schedule by week and keeps matches sorted", () => {
    expect(groupScheduleByWeek(matches).map((week) => week.week)).toEqual([1, 2]);
    expect(groupScheduleByWeek(matches)[0].matches[0].id).toBe("early");
  });

  it("formats match result and winner", () => {
    expect(formatMatchResult(matches[0])).toBe("SCHEDULED");
    expect(formatMatchResult(matches[1])).toBe("24:17");
    expect(getMatchWinnerName(matches[1])).toBe("Charlie");
  });

  it("summarizes the current week", () => {
    const summary = getCurrentWeekSummary({
      phase: "REGULAR_SEASON",
      week: 2,
      matches,
    });

    expect(summary.canSimulateWeek).toBe(true);
    expect(summary.progressPercent).toBe(0);
    expect(summary.scheduledMatches.map((match) => match.id)).toEqual(["late"]);
    expect(summary.completedMatches).toHaveLength(0);
  });

  it("blocks week simulation while matches are already in progress", () => {
    const summary = getCurrentWeekSummary({
      phase: "REGULAR_SEASON",
      week: 2,
      matches: [
        {
          ...matches[0],
          status: "IN_PROGRESS",
        },
      ],
    });

    expect(summary.canSimulateWeek).toBe(false);
    expect(summary.inProgressMatches).toHaveLength(1);
  });
});
