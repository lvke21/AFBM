import { describe, expect, it } from "vitest";

import {
  DEFENSE_SCHEMES,
  getCapSummary,
  getCapUsagePercent,
  getContractDecisionSignal,
  getContractRows,
  getContractTableSummary,
  getFinanceEventListState,
  getRosterSummary,
  selectSchemeCode,
  sortTeamNeeds,
} from "./team-overview-model";
import type { TeamDetail, TeamNeedSummary, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

const needs: TeamNeedSummary[] = [
  {
    positionCode: "WR",
    positionName: "Wide Receiver",
    starterAverage: 79,
    starterSchemeFit: 77,
    playerCount: 6,
    targetCount: 6,
    needScore: 2,
  },
  {
    positionCode: "OL",
    positionName: "Offensive Line",
    starterAverage: 66,
    starterSchemeFit: 63,
    playerCount: 4,
    targetCount: 5,
    needScore: 8,
  },
  {
    positionCode: "CB",
    positionName: "Cornerback",
    starterAverage: 68,
    starterSchemeFit: 70,
    playerCount: 3,
    targetCount: 5,
    needScore: 8,
  },
];

const playerShell = {
  age: 25,
  yearsPro: 3,
  heightCm: 185,
  weightKg: 95,
  secondaryPositionCode: null,
  secondaryPositionName: null,
  positionGroupName: "Offense",
  archetypeName: null,
  schemeFitName: null,
  depthChartSlot: null,
  captainFlag: false,
  developmentFocus: false,
  schemeFitScore: null,
  potentialRating: 80,
  physicalOverall: 75,
  mentalOverall: 75,
  detailRatings: [],
  injuryName: null,
  morale: 70,
  fatigue: 10,
  keyAttributes: {
    speed: 70,
    strength: 70,
    awareness: 70,
    leadership: 70,
    discipline: 70,
    durability: 70,
    mobility: 70,
    hands: 70,
    coverageRange: 70,
    linebackerCoverage: 70,
    linebackerManCoverage: 70,
    linebackerZoneCoverage: 70,
    kickConsistency: 70,
    returnVision: 70,
    snapAccuracy: 70,
    snapVelocity: 70,
  },
  currentContract: null,
  seasonLine: {
    gamesPlayed: 0,
    passingYards: 0,
    passingTouchdowns: 0,
    passingInterceptions: 0,
    rushingYards: 0,
    rushingTouchdowns: 0,
    receivingYards: 0,
    receptions: 0,
    receivingTouchdowns: 0,
    tackles: 0,
    sacks: 0,
    passesDefended: 0,
    interceptions: 0,
    targetsAllowed: 0,
    receptionsAllowed: 0,
    yardsAllowed: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    punts: 0,
    puntsInside20: 0,
    returnYards: 0,
    returnTouchdowns: 0,
    returnFumbles: 0,
  },
} satisfies Omit<
  TeamPlayerSummary,
  | "id"
  | "fullName"
  | "positionCode"
  | "positionName"
  | "rosterStatus"
  | "positionOverall"
  | "status"
  | "injuryStatus"
>;

describe("team overview model", () => {
  it("sorts team needs by urgency and weaker starter average", () => {
    expect(sortTeamNeeds(needs).map((need) => need.positionCode)).toEqual(["OL", "CB", "WR"]);
  });

  it("falls back to the default scheme code when the current label is unknown", () => {
    expect(selectSchemeCode(DEFENSE_SCHEMES, "Zone Discipline", "FOUR_THREE_FRONT")).toBe(
      "ZONE_DISCIPLINE",
    );
    expect(selectSchemeCode(DEFENSE_SCHEMES, null, "FOUR_THREE_FRONT")).toBe("FOUR_THREE_FRONT");
  });

  it("returns a stable empty finance state", () => {
    expect(getFinanceEventListState([]).isEmpty).toBe(true);
    expect(getFinanceEventListState([]).message).toBe("Noch keine Finance Events.");
  });

  it("calculates cap usage from active commitments and remaining space", () => {
    const team = {
      salaryCapSpace: 20000000,
      contractOutlook: {
        activeCapCommitted: 80000000,
      },
    } as Pick<TeamDetail, "contractOutlook" | "salaryCapSpace">;

    expect(getCapUsagePercent(team)).toBe(80);
    expect(getCapSummary(team)).toEqual({
      activeCapCommitted: 80000000,
      capLimit: 100000000,
      capUsagePercent: 80,
      salaryCapSpace: 20000000,
    });
  });

  it("builds contract rows and totals from player contracts", () => {
    const players: TeamPlayerSummary[] = [
      {
        ...playerShell,
        id: "player-1",
        fullName: "High Cap",
        positionCode: "QB",
        positionName: "Quarterback",
        rosterStatus: "STARTER",
        positionOverall: 84,
        status: "ACTIVE",
        injuryStatus: "HEALTHY",
        currentContract: {
          years: 3,
          yearlySalary: 12000000,
          signingBonus: 3000000,
          capHit: 15000000,
        },
      },
      {
        ...playerShell,
        id: "player-2",
        fullName: "Low Cap",
        positionCode: "RB",
        positionName: "Running Back",
        rosterStatus: "BACKUP",
        positionOverall: 74,
        status: "ACTIVE",
        injuryStatus: "HEALTHY",
        currentContract: {
          years: 1,
          yearlySalary: 2000000,
          signingBonus: 500000,
          capHit: 2500000,
        },
      },
    ];

    expect(getContractRows(players).map((row) => row.fullName)).toEqual([
      "High Cap",
      "Low Cap",
    ]);
    expect(getContractTableSummary(players)).toEqual({
      contractCount: 2,
      totalCapHit: 17500000,
      totalYearlySalary: 14000000,
    });
  });

  it("derives contract decision signals for cost, value and expiring risk", () => {
    expect(
      getContractDecisionSignal({
        capHit: 9_000_000,
        capLimit: 100_000_000,
        positionOverall: 72,
        potentialRating: 74,
        rosterStatus: "BACKUP",
        years: 3,
      }),
    ).toMatchObject({
      label: "Teuer fuer Leistung",
      tone: "warning",
    });

    expect(
      getContractDecisionSignal({
        age: 23,
        capHit: 4_000_000,
        capLimit: 100_000_000,
        positionOverall: 78,
        potentialRating: 86,
        rosterStatus: "STARTER",
        years: 3,
      }),
    ).toMatchObject({
      label: "Value Contract",
      tone: "positive",
    });

    expect(
      getContractDecisionSignal({
        capHit: 5_000_000,
        capLimit: 100_000_000,
        positionOverall: 82,
        potentialRating: 83,
        rosterStatus: "STARTER",
        years: 1,
      }),
    ).toMatchObject({
      label: "Bald auslaufend",
      tone: "danger",
    });
  });

  it("summarizes roster state for the team card", () => {
    const players: TeamPlayerSummary[] = [
      {
        ...playerShell,
        id: "player-1",
        fullName: "Starter One",
        positionCode: "QB",
        positionName: "Quarterback",
        rosterStatus: "STARTER",
        positionOverall: 84,
        status: "ACTIVE",
        injuryStatus: "HEALTHY",
      },
      {
        ...playerShell,
        id: "player-2",
        fullName: "Backup Two",
        positionCode: "RB",
        positionName: "Running Back",
        rosterStatus: "BACKUP",
        positionOverall: 74,
        status: "ACTIVE",
        injuryStatus: "QUESTIONABLE",
      },
    ];

    expect(getRosterSummary(players)).toEqual({
      activePlayers: 2,
      averageOverall: 79,
      injured: 1,
      playerCount: 2,
      starters: 1,
    });
  });

  it("orders finance events and keeps action impacts visible", () => {
    const state = getFinanceEventListState([
      {
        id: "old",
        type: "RELEASE_PAYOUT",
        amount: 0,
        capImpact: 2500000,
        cashBalanceAfter: 9000000,
        description: "Release",
        occurredAt: new Date("2026-01-01T00:00:00Z"),
        playerName: "Released Player",
      },
      {
        id: "new",
        type: "SIGNING_BONUS",
        amount: -1000000,
        capImpact: -3000000,
        cashBalanceAfter: 8000000,
        description: "Signing",
        occurredAt: new Date("2026-02-01T00:00:00Z"),
        playerName: "Signed Player",
      },
    ]);

    expect(state.events.map((event) => event.id)).toEqual(["new", "old"]);
    expect(state.events[0].cashImpactDirection).toBe("negative");
    expect(state.events[0].capImpactDirection).toBe("negative");
    expect(state.events[1].capImpactDirection).toBe("positive");
  });
});
