import { describe, expect, it } from "vitest";

import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import { MAX_ROSTER_DECISIONS, buildRosterDecisionInbox } from "./roster-decision-model";

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

function team(players: TeamPlayerSummary[]): TeamDetail {
  return {
    id: "team-1",
    teamNeeds: [],
    players,
  } as unknown as TeamDetail;
}

describe("roster decision model", () => {
  it("prioritizes depth problems before value decisions", () => {
    const decisions = buildRosterDecisionInbox({
      saveGameId: "save-1",
      team: team([
        player({ id: "qb1", fullName: "QB One", rosterStatus: "STARTER", depthChartSlot: 1 }),
        player({ id: "qb2", fullName: "QB Two", rosterStatus: "STARTER", depthChartSlot: 1 }),
        player({
          id: "wr",
          fullName: "Costly WR",
          positionCode: "WR",
          currentContract: {
            years: 2,
            yearlySalary: 15_000_000,
            signingBonus: 0,
            capHit: 15_000_000,
          },
          rosterStatus: "BACKUP",
          positionOverall: 72,
          potentialRating: 73,
        }),
      ]),
    });

    expect(decisions[0].id).toBe("depth-conflicts");
    expect(decisions.some((decision) => decision.id.startsWith("expensive-backup"))).toBe(true);
  });

  it("removes depth warnings after the lineup is fixed", () => {
    const decisions = buildRosterDecisionInbox({
      saveGameId: "save-1",
      team: team([
        player({ id: "qb1", positionCode: "QB", rosterStatus: "STARTER", depthChartSlot: 1 }),
      ]),
    });

    expect(decisions.some((decision) => decision.id === "depth-conflicts")).toBe(false);
  });

  it("limits visible decisions to three and keeps links actionable", () => {
    const decisions = buildRosterDecisionInbox({
      saveGameId: "save-1",
      team: {
        ...team([
          player({ id: "qb1", rosterStatus: "STARTER", depthChartSlot: 1 }),
          player({ id: "qb2", rosterStatus: "STARTER", depthChartSlot: 1 }),
          player({
            id: "dev",
            age: 22,
            fullName: "Young Upside",
            positionCode: "WR",
            positionOverall: 66,
            potentialRating: 82,
          }),
        ]),
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
      } as TeamDetail,
    });

    expect(decisions.length).toBeLessThanOrEqual(MAX_ROSTER_DECISIONS);
    expect(decisions.every((decision) => decision.href.startsWith("/app/savegames/save-1"))).toBe(
      true,
    );
  });

  it("keeps critical lineup actions ahead of important value actions", () => {
    const decisions = buildRosterDecisionInbox({
      saveGameId: "save-1",
      team: {
        ...team([
          player({ id: "qb1", fullName: "QB One", rosterStatus: "STARTER", depthChartSlot: 1 }),
          player({ id: "qb2", fullName: "QB Two", rosterStatus: "STARTER", depthChartSlot: 1 }),
          player({
            id: "wr",
            fullName: "Costly WR",
            positionCode: "WR",
            currentContract: {
              years: 2,
              yearlySalary: 15_000_000,
              signingBonus: 0,
              capHit: 15_000_000,
            },
            rosterStatus: "BACKUP",
            positionOverall: 72,
            potentialRating: 73,
          }),
        ]),
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
      } as TeamDetail,
    });

    expect(decisions.map((decision) => decision.id)).toEqual([
      "depth-conflicts",
      "starter-missing",
      "high-value-market-CB",
    ]);
    expect(decisions[0]).toMatchObject({
      actionLabel: "Jetzt beheben",
      affectedLabel: "QB #1",
      priority: "critical",
    });
  });

  it("always gives the player at least one clear action when lineup data exists", () => {
    const decisions = buildRosterDecisionInbox({
      saveGameId: "save-1",
      team: team([
        player({ id: "qb1", positionCode: "QB", rosterStatus: "STARTER", depthChartSlot: 1 }),
      ]),
    });

    expect(decisions.length).toBeGreaterThanOrEqual(1);
    expect(decisions[0].href).toBe("/app/savegames/save-1/team/depth-chart");
    expect(decisions[0].actionLabel).toBe("Zum Depth Chart");
  });

  it("handles sparse legacy team records without crashing", () => {
    const decisions = buildRosterDecisionInbox({
      saveGameId: "save-1",
      team: {
        id: "team-1",
      } as TeamDetail,
    });

    expect(decisions).toEqual([]);
  });
});
