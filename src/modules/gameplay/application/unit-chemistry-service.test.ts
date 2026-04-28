import { describe, expect, it } from "vitest";

import {
  buildChemistryGroupKey,
  calculateUnitChemistryModifiers,
  createEmptyChemistryState,
  updateChemistryAfterGame,
  type ChemistryGroupUsage,
  type ChemistryState,
} from "./unit-chemistry-service";

function playWeeks(input: {
  state?: ChemistryState;
  usagesForWeek: (week: number) => ChemistryGroupUsage[];
  weeks: number;
}) {
  let state = input.state ?? createEmptyChemistryState();

  for (let week = 1; week <= input.weeks; week += 1) {
    state = updateChemistryAfterGame({
      state,
      usages: input.usagesForWeek(week),
      context: {
        seasonYear: 2026,
        week,
      },
    });
  }

  return state;
}

function lineUsage(playerIds: string[], snaps = 64): ChemistryGroupUsage {
  return {
    type: "OFFENSIVE_LINE",
    teamId: "TEAM",
    playerIds,
    snaps,
  };
}

function qbWrUsage(qbId: string, receiverId: string, snaps = 38): ChemistryGroupUsage {
  return {
    type: "QB_WR",
    teamId: "TEAM",
    playerIds: [qbId, receiverId],
    snaps,
  };
}

function dbUsage(playerIds: string[], snaps = 58): ChemistryGroupUsage {
  return {
    type: "DEFENSIVE_BACK",
    teamId: "TEAM",
    playerIds,
    snaps,
  };
}

describe("unit chemistry service", () => {
  it("gives a stable offensive line better chemistry than a frequently changing line", () => {
    const stableLine = ["lt", "lg", "c", "rg", "rt"];
    const rotatingLines = [
      ["lt", "lg", "c", "rg", "rt"],
      ["lt", "lg", "c", "rg", "rt2"],
      ["lt", "lg2", "c", "rg", "rt2"],
      ["lt2", "lg2", "c", "rg", "rt2"],
      ["lt2", "lg2", "c2", "rg", "rt2"],
      ["lt2", "lg2", "c2", "rg2", "rt2"],
    ];
    const stableState = playWeeks({
      weeks: 6,
      usagesForWeek: () => [lineUsage(stableLine)],
    });
    const rotatingState = playWeeks({
      weeks: 6,
      usagesForWeek: (week) => [lineUsage(rotatingLines[week - 1])],
    });
    const stableModifiers = calculateUnitChemistryModifiers({
      state: stableState,
      teamId: "TEAM",
      offensiveLinePlayerIds: stableLine,
    });
    const rotatingModifiers = calculateUnitChemistryModifiers({
      state: rotatingState,
      teamId: "TEAM",
      offensiveLinePlayerIds: rotatingLines[5],
    });

    expect(stableModifiers.offensiveLine.chemistry).toBeGreaterThan(
      rotatingModifiers.offensiveLine.chemistry,
    );
    expect(stableModifiers.offensiveLine.passProtectionBonus).toBeGreaterThan(
      rotatingModifiers.offensiveLine.passProtectionBonus,
    );
    expect(stableModifiers.offensiveLine.passProtectionBonus).toBeLessThanOrEqual(2.8);
    expect(stableModifiers.offensiveLine.runBlockingBonus).toBeLessThanOrEqual(2.4);
  });

  it("builds QB-WR chemistry over multiple games into timing and catch-window modifiers", () => {
    const state = playWeeks({
      weeks: 8,
      usagesForWeek: () => [qbWrUsage("qb-1", "wr-1")],
    });
    const newDuoModifiers = calculateUnitChemistryModifiers({
      state: createEmptyChemistryState(),
      teamId: "TEAM",
      qbReceiverPlayerIds: ["qb-1", "wr-1"],
    });
    const builtDuoModifiers = calculateUnitChemistryModifiers({
      state,
      teamId: "TEAM",
      qbReceiverPlayerIds: ["qb-1", "wr-1"],
    });

    expect(builtDuoModifiers.qbReceiver.chemistry).toBeGreaterThan(
      newDuoModifiers.qbReceiver.chemistry,
    );
    expect(builtDuoModifiers.qbReceiver.routeTimingModifier).toBeGreaterThan(
      newDuoModifiers.qbReceiver.routeTimingModifier,
    );
    expect(builtDuoModifiers.qbReceiver.targetSelectionBonus).toBeGreaterThan(
      newDuoModifiers.qbReceiver.targetSelectionBonus,
    );
    expect(builtDuoModifiers.qbReceiver.catchWindowModifier).toBeGreaterThan(
      newDuoModifiers.qbReceiver.catchWindowModifier,
    );
    expect(builtDuoModifiers.qbReceiver.catchWindowModifier).toBeLessThanOrEqual(0.036);
  });

  it("builds DB chemistry into small coverage support advantages over games", () => {
    const defensiveBacks = ["cb-1", "cb-2", "fs-1", "ss-1"];
    const state = playWeeks({
      weeks: 7,
      usagesForWeek: () => [dbUsage(defensiveBacks)],
    });
    const modifiers = calculateUnitChemistryModifiers({
      state,
      teamId: "TEAM",
      defensiveBackPlayerIds: defensiveBacks,
    });

    expect(modifiers.defensiveBack.chemistry).toBeGreaterThan(35);
    expect(modifiers.defensiveBack.coverageSupportModifier).toBeGreaterThan(-0.01);
    expect(modifiers.defensiveBack.zoneHandoffModifier).toBeLessThanOrEqual(0.03);
    expect(modifiers.defensiveBack.safetyHelpModifier).toBeLessThanOrEqual(0.028);
  });

  it("decays unused chemistry slowly without deleting recent group history", () => {
    const line = ["lt", "lg", "c", "rg", "rt"];
    const key = buildChemistryGroupKey({
      type: "OFFENSIVE_LINE",
      teamId: "TEAM",
      playerIds: line,
    });
    const builtState = playWeeks({
      weeks: 4,
      usagesForWeek: () => [lineUsage(line)],
    });
    const beforeDecay = builtState.groups[key].chemistry;
    const decayedState = updateChemistryAfterGame({
      state: builtState,
      usages: [],
      context: {
        seasonYear: 2026,
        week: 7,
      },
    });

    expect(decayedState.groups[key].chemistry).toBeLessThan(beforeDecay);
    expect(decayedState.groups[key].chemistry).toBeGreaterThan(20);
  });
});
