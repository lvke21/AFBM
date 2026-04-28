import { describe, expect, it } from "vitest";

import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

import { buildTeamChemistryState, getChemistryTone } from "./team-chemistry-model";

function makePlayer(overrides: Partial<TeamPlayerSummary> = {}): TeamPlayerSummary {
  const player: TeamPlayerSummary = {
    age: 25,
    archetypeName: "Balanced",
    captainFlag: false,
    currentContract: null,
    depthChartSlot: 1,
    detailRatings: [],
    developmentFocus: false,
    fatigue: 30,
    fullName: "Casey Starter",
    heightCm: 188,
    id: "player-1",
    injuryName: null,
    injuryStatus: "HEALTHY",
    keyAttributes: {
      awareness: 70,
      coverageRange: 70,
      discipline: 70,
      durability: 70,
      hands: 70,
      kickConsistency: 70,
      leadership: 70,
      linebackerCoverage: 70,
      linebackerManCoverage: 70,
      linebackerZoneCoverage: 70,
      mobility: 70,
      returnVision: 70,
      snapAccuracy: 70,
      snapVelocity: 70,
      speed: 70,
      strength: 70,
    },
    mentalOverall: 76,
    morale: 72,
    physicalOverall: 76,
    positionCode: "QB",
    positionGroupName: "Offense",
    positionName: "Quarterback",
    positionOverall: 78,
    potentialRating: 82,
    rosterStatus: "STARTER",
    schemeFitName: "Balanced",
    schemeFitScore: 72,
    seasonLine: {
      fieldGoalsAttempted: 0,
      fieldGoalsMade: 0,
      gamesPlayed: 4,
      interceptions: 0,
      passesDefended: 0,
      passingInterceptions: 1,
      passingTouchdowns: 4,
      passingYards: 700,
      punts: 0,
      puntsInside20: 0,
      receivingTouchdowns: 0,
      receivingYards: 0,
      receptions: 0,
      receptionsAllowed: 0,
      returnFumbles: 0,
      returnTouchdowns: 0,
      returnYards: 0,
      rushingTouchdowns: 0,
      rushingYards: 40,
      sacks: 0,
      tackles: 0,
      targetsAllowed: 0,
      yardsAllowed: 0,
    },
    secondaryPositionCode: null,
    secondaryPositionName: null,
    status: "ACTIVE",
    weightKg: 98,
    yearsPro: 4,
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

function makeTeam(players: TeamPlayerSummary[], overrides: Partial<TeamDetail> = {}): TeamDetail {
  return {
    abbreviation: "BOS",
    cashBalance: 10_000_000,
    conferenceName: "AFC",
    contractOutlook: {
      activeCapCommitted: 100_000_000,
      expiringCap: 0,
      expiringPlayers: [],
    },
    currentRecord: "2-1",
    divisionName: "East",
    id: "team-1",
    managerControlled: true,
    morale: 70,
    name: "Boston Captains",
    overallRating: 76,
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
    ...overrides,
  };
}

describe("team chemistry model", () => {
  it("handles missing team context with a stable empty state", () => {
    const state = buildTeamChemistryState(null);

    expect(state.score).toBe(0);
    expect(state.units).toEqual([]);
    expect(state.summary).toBe("Kein Teamkontext vorhanden.");
  });

  it("builds offense, defense and special teams groups from existing players", () => {
    const state = buildTeamChemistryState(
      makeTeam([
        makePlayer({
          captainFlag: true,
          fullName: "Quinn QB",
          id: "qb",
          morale: 82,
          positionCode: "QB",
        }),
        makePlayer({
          fullName: "Casey CB",
          id: "cb",
          positionCode: "CB",
          positionGroupName: "Defense",
          schemeFitScore: 64,
        }),
        makePlayer({
          fullName: "Parker P",
          id: "p",
          positionCode: "P",
          positionGroupName: "Special Teams",
          schemeFitScore: null,
        }),
      ]),
    );

    expect(state.units.map((unit) => unit.key)).toEqual([
      "offense",
      "defense",
      "special-teams",
    ]);
    expect(state.units.find((unit) => unit.key === "offense")?.leaders[0]?.id).toBe("qb");
    expect(state.influences.find((item) => item.label === "Leadership")?.value).toBe("1");
    expect(state.score).toBeGreaterThan(0);
  });

  it("makes injury and fatigue influence visible as risk signals", () => {
    const state = buildTeamChemistryState(
      makeTeam([
        makePlayer({
          fatigue: 80,
          fullName: "Tired WR",
          id: "wr",
          positionCode: "WR",
        }),
        makePlayer({
          fullName: "Hurt LB",
          id: "lb",
          injuryStatus: "QUESTIONABLE",
          positionCode: "MLB",
        }),
      ]),
    );

    expect(state.influences.find((item) => item.label === "Risk Signals")?.value).toBe("2");
    expect(state.units.find((unit) => unit.key === "offense")?.riskPlayers[0]?.id).toBe("wr");
    expect(state.units.find((unit) => unit.key === "defense")?.riskPlayers[0]?.id).toBe("lb");
  });

  it("classifies score tones consistently", () => {
    expect(getChemistryTone(80)).toBe("positive");
    expect(getChemistryTone(60)).toBe("neutral");
    expect(getChemistryTone(45)).toBe("warning");
    expect(getChemistryTone(30)).toBe("danger");
  });
});
