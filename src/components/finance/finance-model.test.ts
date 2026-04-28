import { describe, expect, it } from "vitest";

import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import {
  buildFinanceDecisionItems,
  getFinanceEventSummary,
  getFinanceProjection,
  getFinanceWorkspaceSummary,
} from "./finance-model";

function player(overrides: Partial<TeamPlayerSummary> = {}): TeamPlayerSummary {
  return {
    age: 25,
    archetypeName: null,
    captainFlag: false,
    currentContract: {
      capHit: 5_000_000,
      signingBonus: 1_000_000,
      yearlySalary: 4_000_000,
      years: 2,
    },
    depthChartSlot: 1,
    detailRatings: [],
    developmentFocus: false,
    fatigue: 10,
    fullName: "Test Player",
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
    mentalOverall: 70,
    morale: 60,
    physicalOverall: 70,
    positionCode: "QB",
    positionGroupName: "Quarterback",
    positionName: "Quarterback",
    positionOverall: 72,
    potentialRating: 78,
    rosterStatus: "STARTER",
    schemeFitName: null,
    schemeFitScore: null,
    seasonLine: {
      fieldGoalsAttempted: 0,
      fieldGoalsMade: 0,
      gamesPlayed: 0,
      interceptions: 0,
      passesDefended: 0,
      passingInterceptions: 0,
      passingTouchdowns: 0,
      passingYards: 0,
      punts: 0,
      puntsInside20: 0,
      receptionsAllowed: 0,
      receivingTouchdowns: 0,
      receivingYards: 0,
      receptions: 0,
      returnFumbles: 0,
      returnTouchdowns: 0,
      returnYards: 0,
      rushingTouchdowns: 0,
      rushingYards: 0,
      sacks: 0,
      tackles: 0,
      targetsAllowed: 0,
      yardsAllowed: 0,
    },
    secondaryPositionCode: null,
    secondaryPositionName: null,
    status: "ACTIVE",
    weightKg: 100,
    yearsPro: 3,
    ...overrides,
  };
}

function team(overrides: Partial<TeamDetail> = {}): TeamDetail {
  return {
    abbreviation: "BOS",
    cashBalance: 20_000_000,
    conferenceName: "East",
    contractOutlook: {
      activeCapCommitted: 100_000_000,
      expiringCap: 12_000_000,
      expiringPlayers: [
        {
          capHit: 12_000_000,
          fullName: "Expiring Player",
          id: "expiring-1",
          positionCode: "WR",
          years: 1,
        },
      ],
    },
    currentRecord: "1-0",
    divisionName: "North",
    id: "team-1",
    managerControlled: true,
    morale: 70,
    name: "Boston Guardians",
    overallRating: 82,
    players: [player()],
    recentDecisionEvents: [],
    recentFinanceEvents: [],
    salaryCapSpace: 8_000_000,
    schemes: {
      defense: "Zone",
      offense: "Balanced",
      specialTeams: "Field Position",
    },
    teamNeeds: [],
    ...overrides,
  };
}

describe("finance model", () => {
  it("summarizes cap, contracts and event counts for the workspace", () => {
    const summary = getFinanceWorkspaceSummary(team());

    expect(summary.capSummary.capLimit).toBe(108_000_000);
    expect(summary.contractSummary.contractCount).toBe(1);
    expect(summary.financeEventCount).toBe(0);
  });

  it("projects next cap space from expiring contracts", () => {
    const projection = getFinanceProjection(team());

    expect(projection.projectedActiveCap).toBe(88_000_000);
    expect(projection.projectedCapSpace).toBe(20_000_000);
    expect(projection.expiringPlayers).toBe(1);
  });

  it("highlights critical and warning finance decisions", () => {
    expect(buildFinanceDecisionItems(team({ salaryCapSpace: -1 })).at(0)).toEqual(
      expect.objectContaining({
        id: "cap-negative",
        tone: "critical",
      }),
    );
    expect(buildFinanceDecisionItems(team({ salaryCapSpace: 1_000_000 })).at(0)).toEqual(
      expect.objectContaining({
        id: "cap-tight",
        tone: "warning",
      }),
    );
  });

  it("summarizes finance events for the events workspace", () => {
    const summary = getFinanceEventSummary([
      {
        amount: -1_000_000,
        capImpact: -2_000_000,
        cashBalanceAfter: 19_000_000,
        description: "Signing",
        id: "event-1",
        occurredAt: new Date("2026-09-10T10:00:00Z"),
        playerName: "Player One",
        type: "SIGNING_BONUS",
      },
      {
        amount: 500_000,
        capImpact: 750_000,
        cashBalanceAfter: 19_500_000,
        description: "Release",
        id: "event-2",
        occurredAt: new Date("2026-09-11T10:00:00Z"),
        playerName: "Player Two",
        type: "RELEASE_PAYOUT",
      },
    ]);

    expect(summary.eventCount).toBe(2);
    expect(summary.totalCashImpact).toBe(-500_000);
    expect(summary.totalCapImpact).toBe(-1_250_000);
    expect(summary.latestEventLabel).toBe("RELEASE PAYOUT");
  });
});
