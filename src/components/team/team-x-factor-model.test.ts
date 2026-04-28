import { describe, expect, it } from "vitest";

import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

import { buildXFactorState } from "./team-x-factor-model";

function makePlayer(overrides: Partial<TeamPlayerSummary> = {}): TeamPlayerSummary {
  const player: TeamPlayerSummary = {
    age: 26,
    archetypeName: "Balanced",
    captainFlag: false,
    currentContract: null,
    depthChartSlot: 1,
    detailRatings: [
      { label: "Pass", value: 84 },
      { label: "Command", value: 80 },
      { label: "Mobility", value: 68 },
    ],
    developmentFocus: false,
    fatigue: 32,
    fullName: "Casey Star",
    heightCm: 190,
    id: "player-1",
    injuryName: null,
    injuryStatus: "HEALTHY",
    keyAttributes: {
      awareness: 80,
      coverageRange: 70,
      discipline: 76,
      durability: 78,
      hands: 70,
      kickConsistency: 50,
      leadership: 78,
      linebackerCoverage: 65,
      linebackerManCoverage: 65,
      linebackerZoneCoverage: 65,
      mobility: 72,
      returnVision: 50,
      snapAccuracy: 50,
      snapVelocity: 50,
      speed: 76,
      strength: 72,
    },
    mentalOverall: 82,
    morale: 76,
    physicalOverall: 78,
    positionCode: "QB",
    positionGroupName: "Offense",
    positionName: "Quarterback",
    positionOverall: 84,
    potentialRating: 88,
    rosterStatus: "STARTER",
    schemeFitName: "Balanced",
    schemeFitScore: 74,
    seasonLine: {
      fieldGoalsAttempted: 0,
      fieldGoalsMade: 0,
      gamesPlayed: 5,
      interceptions: 0,
      passesDefended: 0,
      passingInterceptions: 2,
      passingTouchdowns: 8,
      passingYards: 1100,
      punts: 0,
      puntsInside20: 0,
      receivingTouchdowns: 0,
      receivingYards: 0,
      receptions: 0,
      receptionsAllowed: 0,
      returnFumbles: 0,
      returnTouchdowns: 0,
      returnYards: 0,
      rushingTouchdowns: 1,
      rushingYards: 120,
      sacks: 0,
      tackles: 0,
      targetsAllowed: 0,
      yardsAllowed: 0,
    },
    secondaryPositionCode: null,
    secondaryPositionName: null,
    status: "ACTIVE",
    weightKg: 100,
    yearsPro: 5,
  };

  return {
    ...player,
    ...overrides,
    keyAttributes: {
      ...player.keyAttributes,
      ...overrides.keyAttributes,
    },
    seasonLine: {
      ...player.seasonLine,
      ...overrides.seasonLine,
    },
  };
}

function makeTeam(players: TeamPlayerSummary[]): TeamDetail {
  return {
    abbreviation: "BOS",
    cashBalance: 10_000_000,
    conferenceName: "AFC",
    contractOutlook: {
      activeCapCommitted: 100_000_000,
      expiringCap: 0,
      expiringPlayers: [],
    },
    currentRecord: "3-1",
    divisionName: "East",
    id: "team-1",
    managerControlled: true,
    morale: 72,
    name: "Boston Captains",
    overallRating: 78,
    players,
    recentDecisionEvents: [],
    recentFinanceEvents: [],
    salaryCapSpace: 15_000_000,
    schemes: {
      defense: "4-3",
      offense: "Balanced",
      specialTeams: "Field Position",
    },
    teamNeeds: [],
  };
}

describe("team x-factor model", () => {
  it("handles missing team context with a stable empty state", () => {
    const state = buildXFactorState(null);

    expect(state.players).toEqual([]);
    expect(state.topPlayer).toBeNull();
    expect(state.summary).toBe("Kein Teamkontext vorhanden.");
  });

  it("derives ready X-Factors from star traits and playable roles", () => {
    const state = buildXFactorState(
      makeTeam([
        makePlayer({
          fullName: "Quinn QB",
          id: "qb",
          positionCode: "QB",
        }),
        makePlayer({
          detailRatings: [{ label: "Coverage", value: 88 }],
          fullName: "Casey CB",
          id: "cb",
          positionCode: "CB",
          positionGroupName: "Defense",
          positionOverall: 83,
        }),
      ]),
    );

    expect(state.activeCount).toBe(2);
    expect(state.readyCount).toBe(2);
    expect(state.players.map((player) => player.abilityName)).toContain("Field General");
    expect(state.players.map((player) => player.unitKey)).toEqual(
      expect.arrayContaining(["offense", "defense"]),
    );
    expect(state.topPlayer?.conditions.every((condition) => condition.met)).toBe(true);
  });

  it("marks fatigue and injury as limited or locked activation conditions", () => {
    const state = buildXFactorState(
      makeTeam([
        makePlayer({
          fatigue: 86,
          fullName: "Tired WR",
          id: "wr",
          positionCode: "WR",
          positionOverall: 84,
        }),
        makePlayer({
          fullName: "Hurt LB",
          id: "lb",
          injuryStatus: "QUESTIONABLE",
          positionCode: "MLB",
          positionOverall: 84,
          rosterStatus: "BACKUP",
          depthChartSlot: null,
        }),
      ]),
    );

    expect(state.limitedCount).toBeGreaterThan(0);
    expect(
      state.players.find((player) => player.id === "wr")?.conditions.find(
        (condition) => condition.label === "Load okay",
      )?.met,
    ).toBe(false);
    expect(
      state.players.find((player) => player.id === "lb")?.conditions.find(
        (condition) => condition.label === "Healthy",
      )?.met,
    ).toBe(false);
  });

  it("does not promote normal depth players to visible X-Factors", () => {
    const state = buildXFactorState(
      makeTeam([
        makePlayer({
          detailRatings: [{ label: "Runner", value: 68 }],
          fullName: "Depth RB",
          id: "rb",
          positionCode: "RB",
          positionOverall: 68,
          potentialRating: 72,
          rosterStatus: "BACKUP",
        }),
      ]),
    );

    expect(state.players).toEqual([]);
    expect(state.summary).toBe("Keine X-Factor Profile aus vorhandenen Teamdaten abgeleitet.");
  });
});
