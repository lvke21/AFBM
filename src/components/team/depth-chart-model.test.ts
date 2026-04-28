import { describe, expect, it } from "vitest";

import {
  DEPTH_CHART_POSITIONS,
  buildDepthChartGroups,
  buildDepthChartDecisionSignals,
  buildDepthChartLineupGroups,
  buildLineupReadinessState,
  canSelectRosterStatus,
  detectDepthChartConflicts,
  getAssignablePlayersForSlot,
  getDepthChartMoveTarget,
  getEmptyStarterPositions,
  isDepthSlotUnavailableForPlayer,
} from "./depth-chart-model";
import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";

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
  schemeFitScore: null,
  positionOverall: 75,
  potentialRating: 80,
  physicalOverall: 75,
  mentalOverall: 75,
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
  | "id"
  | "fullName"
  | "positionCode"
  | "rosterStatus"
  | "depthChartSlot"
>;

function makePlayer(overrides: Partial<TeamPlayerSummary>): TeamPlayerSummary {
  return {
    ...playerShell,
    id: "player",
    fullName: "Test Player",
    positionCode: "QB",
    rosterStatus: "BACKUP",
    depthChartSlot: null,
    ...overrides,
  };
}

describe("depth chart model", () => {
  it("detects slot conflicts for game-day eligible players", () => {
    const conflicts = detectDepthChartConflicts([
      makePlayer({ id: "qb-1", fullName: "QB One", depthChartSlot: 1 }),
      makePlayer({ id: "qb-2", fullName: "QB Two", depthChartSlot: 1 }),
      makePlayer({
        id: "qb-ir",
        fullName: "QB IR",
        depthChartSlot: 1,
        rosterStatus: "INJURED_RESERVE",
      }),
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].positionCode).toBe("QB");
    expect(conflicts[0].players.map((player) => player.id)).toEqual(["qb-1", "qb-2"]);
  });

  it("ignores invalid depth slots for conflicts and assigned-readiness counts", () => {
    const players = [
      makePlayer({ id: "qb-1", fullName: "QB One", depthChartSlot: -1 }),
      makePlayer({ id: "qb-2", fullName: "QB Two", depthChartSlot: -1 }),
    ];
    const groups = buildDepthChartGroups(players);
    const qbGroup = groups.find((group) => group.positionCode === "QB");
    const readiness = buildLineupReadinessState(players);

    expect(detectDepthChartConflicts(players)).toEqual([]);
    expect(qbGroup?.slots[0]?.players).toEqual([]);
    expect(qbGroup?.unassignedPlayers.map((player) => player.id)).toEqual(["qb-1", "qb-2"]);
    expect(readiness.metrics.find((metric) => metric.label === "Im Einsatz")?.value).toBe("0");
  });

  it("marks occupied slots unavailable for other players", () => {
    const starter = makePlayer({ id: "qb-1", depthChartSlot: 1 });
    const backup = makePlayer({ id: "qb-2", depthChartSlot: null });

    expect(isDepthSlotUnavailableForPlayer([starter, backup], backup, 1)).toBe(true);
    expect(isDepthSlotUnavailableForPlayer([starter, backup], starter, 1)).toBe(false);
    expect(isDepthSlotUnavailableForPlayer([starter, backup], backup, 0)).toBe(true);
  });

  it("applies injured reserve eligibility rules", () => {
    expect(
      canSelectRosterStatus(makePlayer({ injuryStatus: "HEALTHY" }), "INJURED_RESERVE"),
    ).toBe(false);
    expect(
      canSelectRosterStatus(makePlayer({ injuryStatus: "OUT" }), "INJURED_RESERVE"),
    ).toBe(true);
    expect(canSelectRosterStatus(makePlayer({ injuryStatus: "HEALTHY" }), "BACKUP")).toBe(true);
  });

  it("keeps empty positions visible", () => {
    const groups = buildDepthChartGroups([]);
    const qbGroup = groups.find((group) => group.positionCode === "QB");

    expect(qbGroup?.slots).toHaveLength(3);
    expect(getEmptyStarterPositions(groups).some((group) => group.positionCode === "QB")).toBe(
      true,
    );
  });

  it("builds the eight manager-facing lineup groups in football order", () => {
    const groups = buildDepthChartLineupGroups([
      makePlayer({
        id: "lt-1",
        fullName: "Left Tackle",
        positionCode: "LT",
        depthChartSlot: 1,
      }),
      makePlayer({
        id: "rg-1",
        fullName: "Right Guard",
        positionCode: "RG",
        depthChartSlot: 2,
      }),
      makePlayer({
        id: "k-1",
        fullName: "Kicker",
        positionCode: "K",
        depthChartSlot: 1,
      }),
    ]);

    expect(groups.map((group) => group.code)).toEqual([
      "QB",
      "RB",
      "WR",
      "OL",
      "DL",
      "LB",
      "DB",
      "ST",
    ]);
    expect(groups.find((group) => group.code === "OL")?.positions.map((group) => group.positionCode)).toEqual([
      "LT",
      "LG",
      "C",
      "RG",
      "RT",
    ]);
    expect(groups.find((group) => group.code === "OL")?.starterCount).toBe(1);
    expect(groups.find((group) => group.code === "OL")?.backupCount).toBe(1);
    expect(groups.find((group) => group.code === "ST")?.positions.map((group) => group.positionCode)).toEqual([
      "K",
      "P",
      "LS",
    ]);
  });

  it("builds command-center readiness warnings for conflicts and open starters", () => {
    const players = [
      makePlayer({ id: "qb-1", depthChartSlot: 1 }),
      makePlayer({ id: "qb-2", depthChartSlot: 1 }),
    ];
    const state = buildLineupReadinessState(players);

    expect(state.status).toBe("blocked");
    expect(state.statusLabel).toBe("Blockiert");
    expect(state.conflicts).toHaveLength(1);
    expect(state.emptyStarterPositions.some((group) => group.positionCode === "RB")).toBe(true);
    expect(state.metrics.find((metric) => metric.label === "Doppelt besetzt")?.value).toBe("1");
  });

  it("labels complete, incomplete and blocked lineups clearly", () => {
    const completePlayers = DEPTH_CHART_POSITIONS.map((position) =>
      makePlayer({
        id: `${position.code}-starter`,
        positionCode: position.code,
        positionName: position.label,
        rosterStatus: "STARTER",
        depthChartSlot: 1,
      }),
    );
    const complete = buildLineupReadinessState(completePlayers);
    const missingCoreStarter = buildLineupReadinessState(
      completePlayers.filter((player) => player.positionCode !== "QB"),
    );
    const missingSecondaryStarter = buildLineupReadinessState(
      completePlayers.filter((player) => player.positionCode !== "LS"),
    );
    const blocked = buildLineupReadinessState([
      makePlayer({ id: "qb-1", depthChartSlot: 1 }),
      makePlayer({ id: "qb-2", depthChartSlot: 1 }),
    ]);

    expect(complete.statusLabel).toBe("Bereit");
    expect(complete.status).toBe("ready");
    expect(missingCoreStarter.statusLabel).toBe("Blockiert");
    expect(missingCoreStarter.status).toBe("blocked");
    expect(missingCoreStarter.coreEmptyStarterPositions.map((group) => group.positionCode)).toContain("QB");
    expect(missingSecondaryStarter.statusLabel).toBe("Pruefen");
    expect(missingSecondaryStarter.status).toBe("check");
    expect(missingSecondaryStarter.autoFillPlayers[0]).toMatchObject({
      internalTag: "DEV_AUTO_FILL",
      overall: 62,
      positionCode: "LS",
    });
    expect(blocked.statusLabel).toBe("Blockiert");
    expect(blocked.status).toBe("blocked");
  });

  it("lists only eligible candidates for slot assignment", () => {
    const players = [
      makePlayer({ id: "qb-1", fullName: "Starter", depthChartSlot: 1 }),
      makePlayer({ id: "qb-2", fullName: "Backup", depthChartSlot: null }),
      makePlayer({
        id: "qb-inactive",
        fullName: "Inactive",
        depthChartSlot: null,
        rosterStatus: "INACTIVE",
      }),
    ];
    const group = buildDepthChartGroups(players).find((entry) => entry.positionCode === "QB");

    if (!group) {
      throw new Error("Expected QB group");
    }

    expect(getAssignablePlayersForSlot(group, players, 2).map((player) => player.id)).toEqual([
      "qb-2",
    ]);
    expect(getAssignablePlayersForSlot(group, players, 1)).toEqual([]);
  });

  it("finds adjacent move targets within a position group", () => {
    const players = [
      makePlayer({ id: "qb-1", fullName: "Starter", depthChartSlot: 1 }),
      makePlayer({ id: "qb-2", fullName: "Backup", depthChartSlot: 2 }),
      makePlayer({ id: "qb-3", fullName: "Third", depthChartSlot: 3 }),
    ];
    const group = buildDepthChartGroups(players).find((entry) => entry.positionCode === "QB");

    if (!group) {
      throw new Error("Expected QB group");
    }

    expect(getDepthChartMoveTarget(group, players[1], "up")).toMatchObject({
      currentSlot: 2,
      targetSlot: 1,
      targetPlayer: expect.objectContaining({ id: "qb-1" }),
    });
    expect(getDepthChartMoveTarget(group, players[1], "down")).toMatchObject({
      currentSlot: 2,
      targetSlot: 3,
      targetPlayer: expect.objectContaining({ id: "qb-3" }),
    });
  });

  it("labels depth-chart trade-offs as now, long-term and risk decisions", () => {
    const players = [
      makePlayer({
        id: "qb-now",
        fullName: "Now QB",
        depthChartSlot: 1,
        positionOverall: 79,
        potentialRating: 82,
        fatigue: 70,
        rosterStatus: "STARTER",
      }),
      makePlayer({
        id: "qb-stable",
        fullName: "Stable QB",
        depthChartSlot: 2,
        positionOverall: 74,
        potentialRating: 78,
        fatigue: 8,
        rosterStatus: "ROTATION",
      }),
      makePlayer({
        id: "qb-upside",
        fullName: "Upside QB",
        age: 22,
        depthChartSlot: 3,
        positionOverall: 70,
        potentialRating: 87,
        fatigue: 12,
        rosterStatus: "BACKUP",
      }),
    ];

    expect(buildDepthChartDecisionSignals(players[0], players).map((signal) => signal.label)).toEqual([
      "besser jetzt",
      "Risiko",
    ]);
    expect(buildDepthChartDecisionSignals(players[1], players).map((signal) => signal.label)).toEqual([
      "stabil",
    ]);
    expect(buildDepthChartDecisionSignals(players[2], players).map((signal) => signal.label)).toEqual([
      "besser langfristig",
    ]);
  });

  it("allows moving into an empty adjacent slot and blocks invalid move edges", () => {
    const players = [
      makePlayer({ id: "qb-1", fullName: "Starter", depthChartSlot: 1 }),
      makePlayer({ id: "qb-2", fullName: "Backup", depthChartSlot: null }),
      makePlayer({
        id: "qb-inactive",
        fullName: "Inactive",
        depthChartSlot: 2,
        rosterStatus: "INACTIVE",
      }),
    ];
    const group = buildDepthChartGroups(players).find((entry) => entry.positionCode === "QB");

    if (!group) {
      throw new Error("Expected QB group");
    }

    expect(getDepthChartMoveTarget(group, players[0], "up")).toBeNull();
    expect(getDepthChartMoveTarget(group, players[0], "down")).toEqual({
      currentSlot: 1,
      targetSlot: 2,
      targetPlayer: null,
    });
    expect(getDepthChartMoveTarget(group, players[1], "up")).toBeNull();
    expect(getDepthChartMoveTarget(group, players[2], "up")).toBeNull();
  });
});
