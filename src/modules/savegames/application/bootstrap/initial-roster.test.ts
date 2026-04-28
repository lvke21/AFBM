import { describe, expect, it } from "vitest";

import { calculateTeamOverall } from "../../../players/domain/player-evaluation";
import { buildInitialRoster } from "./initial-roster";

describe("buildInitialRoster", () => {
  it("creates a full 53 player roster", () => {
    const roster = buildInitialRoster(0, 74, 2026);

    expect(roster).toHaveLength(53);
  });

  it("covers the required offense, defense and special teams positions", () => {
    const roster = buildInitialRoster(1, 68, 2026);
    const positionCounts = new Map<string, number>();

    for (const player of roster) {
      positionCounts.set(
        player.primaryPositionCode,
        (positionCounts.get(player.primaryPositionCode) ?? 0) + 1,
      );
    }

    expect(positionCounts.get("QB")).toBe(3);
    expect(positionCounts.get("WR")).toBe(5);
    expect(positionCounts.get("LE")).toBe(2);
    expect(positionCounts.get("RE")).toBe(2);
    expect(positionCounts.get("DT")).toBe(4);
    expect(positionCounts.get("CB")).toBe(5);
    expect(positionCounts.get("FS")).toBe(2);
    expect(positionCounts.get("SS")).toBe(2);
    expect(positionCounts.get("K")).toBe(2);
    expect(positionCounts.get("P")).toBe(1);
    expect(positionCounts.get("LS")).toBe(1);
  });

  it("assigns structured return roles through secondary positions", () => {
    const roster = buildInitialRoster(2, 72, 2026);
    const secondaryPositions = roster
      .map((player) => player.secondaryPositionCode)
      .filter((value): value is string => value != null);

    expect(secondaryPositions).toContain("KR");
    expect(secondaryPositions).toContain("PR");
  });

  it("adds the new specialist and coverage attributes to the relevant positions", () => {
    const roster = buildInitialRoster(0, 74, 2026);
    const quarterback = roster.find((player) => player.primaryPositionCode === "QB");
    const wideReceiver = roster.find((player) => player.primaryPositionCode === "WR");
    const middleLinebacker = roster.find((player) => player.primaryPositionCode === "MLB");
    const longSnapper = roster.find((player) => player.primaryPositionCode === "LS");

    expect(quarterback?.attributes.MOBILITY).toBeGreaterThan(0);
    expect(wideReceiver?.attributes.HANDS).toBeGreaterThan(0);
    expect(middleLinebacker?.attributes.LB_ZONE_COVERAGE).toBeGreaterThan(0);
    expect(middleLinebacker?.attributes.COVERAGE_RANGE).toBeGreaterThan(0);
    expect(longSnapper?.attributes.SNAP_VELOCITY).toBeGreaterThan(0);
  });

  it("keeps effective roster strength close to requested team prestige", () => {
    const weak = calculateTeamOverall(
      buildInitialRoster(3, 68, 2026).map((player) => ({
        positionCode: player.primaryPositionCode,
        positionOverall: player.positionOverall,
        specialTeamsOverall: player.specialTeamsOverall,
      })),
    );
    const balanced = calculateTeamOverall(
      buildInitialRoster(1, 74, 2026).map((player) => ({
        positionCode: player.primaryPositionCode,
        positionOverall: player.positionOverall,
        specialTeamsOverall: player.specialTeamsOverall,
      })),
    );
    const strong = calculateTeamOverall(
      buildInitialRoster(4, 84, 2026).map((player) => ({
        positionCode: player.primaryPositionCode,
        positionOverall: player.positionOverall,
        specialTeamsOverall: player.specialTeamsOverall,
      })),
    );

    expect(weak).toBeLessThan(balanced);
    expect(balanced).toBeLessThan(strong);
    expect(Math.abs(weak - 68)).toBeLessThanOrEqual(3);
    expect(Math.abs(balanced - 74)).toBeLessThanOrEqual(3);
    expect(Math.abs(strong - 84)).toBeLessThanOrEqual(3);
  });

  it("creates visible depth-chart trade-offs on key decision positions", () => {
    const roster = buildInitialRoster(0, 74, 2026);

    for (const positionCode of ["QB", "RB", "WR", "LT", "MLB", "CB", "K"]) {
      const players = roster
        .filter((player) => player.primaryPositionCode === positionCode)
        .sort((left, right) => left.depthChartSlot - right.depthChartSlot);

      expect(players.length).toBeGreaterThanOrEqual(2);
      expect(players[0]?.fatigue).toBeGreaterThanOrEqual(58);

      if (players[1]) {
        expect(players[1].fatigue).toBeLessThanOrEqual(17);
      }

      if (players[2]) {
        expect(players[2].potentialRating - players[2].positionOverall).toBeGreaterThanOrEqual(10);
      }
    }
  });
});
