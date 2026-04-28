import { describe, expect, it } from "vitest";

import { DEPTH_CHART_POSITIONS } from "@/components/team/depth-chart-model";
import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import { MAX_SHORT_TERM_GOALS, buildShortTermGoalsState } from "./short-term-goals-model";

const playerShell = {
  age: 25,
  yearsPro: 3,
  heightCm: 185,
  weightKg: 95,
  positionName: "Position",
  secondaryPositionCode: null,
  secondaryPositionName: null,
  positionGroupName: "Group",
  archetypeName: null,
  schemeFitName: null,
  captainFlag: false,
  developmentFocus: false,
  schemeFitScore: 70,
  physicalOverall: 72,
  mentalOverall: 72,
  detailRatings: [],
  status: "ACTIVE",
  injuryStatus: "HEALTHY",
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
  | "depthChartSlot"
  | "fullName"
  | "id"
  | "positionCode"
  | "positionOverall"
  | "potentialRating"
  | "rosterStatus"
>;

function player(overrides: Partial<TeamPlayerSummary>): TeamPlayerSummary {
  return {
    ...playerShell,
    id: "player",
    fullName: "Player",
    positionCode: "QB",
    rosterStatus: "BACKUP",
    depthChartSlot: null,
    positionOverall: 70,
    potentialRating: 74,
    ...overrides,
  };
}

function completeStarterPlayers() {
  return DEPTH_CHART_POSITIONS.map((position) =>
    player({
      id: `starter-${position.code}`,
      fullName: `${position.code} Starter`,
      positionCode: position.code,
      positionName: position.label,
      rosterStatus: "STARTER",
      depthChartSlot: 1,
      positionOverall: 74,
      potentialRating: 76,
    }),
  );
}

function team(overrides: Partial<TeamDetail>): TeamDetail {
  return {
    id: "team-1",
    teamNeeds: [],
    players: [],
    ...overrides,
  } as TeamDetail;
}

describe("short term goals model", () => {
  it("limits active goals to three", () => {
    const state = buildShortTermGoalsState({
      saveGameId: "save-1",
      team: team({
        players: [
          player({ id: "qb1", rosterStatus: "STARTER", depthChartSlot: 1 }),
          player({ id: "qb2", rosterStatus: "STARTER", depthChartSlot: 1 }),
          player({
            id: "value",
            fullName: "Costly Backup",
            positionCode: "WR",
            rosterStatus: "BACKUP",
            positionOverall: 72,
            potentialRating: 73,
            currentContract: {
              years: 2,
              yearlySalary: 15_000_000,
              signingBonus: 0,
              capHit: 15_000_000,
            },
          }),
          player({
            id: "dev",
            age: 22,
            fullName: "Young Upside",
            positionCode: "CB",
            positionOverall: 64,
            potentialRating: 82,
          }),
        ],
        teamNeeds: [
          {
            positionCode: "CB",
            positionName: "Cornerback",
            starterAverage: 62,
            starterSchemeFit: 50,
            playerCount: 1,
            targetCount: 3,
            needScore: 9,
          },
        ],
      }),
    });

    expect(state.goals.length).toBeLessThanOrEqual(MAX_SHORT_TERM_GOALS);
    expect(state.goals.map((goal) => goal.id)).toEqual([
      "fix-depth-conflicts",
      "improve-position-CB",
      "find-value-value",
    ]);
  });

  it("removes starter and need goals after they are fulfilled", () => {
    const state = buildShortTermGoalsState({
      saveGameId: "save-1",
      team: team({
        players: completeStarterPlayers(),
        teamNeeds: [
          {
            positionCode: "CB",
            positionName: "Cornerback",
            starterAverage: 76,
            starterSchemeFit: 72,
            playerCount: 5,
            targetCount: 5,
            needScore: 2,
          },
        ],
      }),
    });

    expect(state.goals.some((goal) => goal.id === "set-all-starters")).toBe(false);
    expect(state.goals.some((goal) => goal.id.startsWith("improve-position"))).toBe(false);
  });

  it("does not show contradictory starter and conflict goals at the same time", () => {
    const state = buildShortTermGoalsState({
      saveGameId: "save-1",
      team: team({
        players: [
          player({ id: "qb1", rosterStatus: "STARTER", depthChartSlot: 1 }),
          player({ id: "qb2", rosterStatus: "STARTER", depthChartSlot: 1 }),
        ],
      }),
    });

    expect(state.goals.some((goal) => goal.id === "fix-depth-conflicts")).toBe(true);
    expect(state.goals.some((goal) => goal.id === "set-all-starters")).toBe(false);
  });

  it("stays stable with sparse legacy team records", () => {
    const state = buildShortTermGoalsState({
      saveGameId: "save-1",
      team: {
        id: "team-1",
      } as TeamDetail,
    });

    expect(state.goals).toEqual([]);
    expect(state.emptyMessage).toContain("Keine kurzfristigen Ziele");
  });
});
