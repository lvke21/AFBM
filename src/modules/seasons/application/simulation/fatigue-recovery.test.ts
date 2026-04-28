import { describe, expect, it } from "vitest";

import {
  applyMatchFatigueDelta,
  buildFatigueGameDayProfile,
  buildRecoveryConditionUpdate,
  calculateMatchFatigueDelta,
} from "./fatigue-recovery";
import type { PlayerSimulationLine } from "./simulation.types";

function createLine(overrides: Partial<PlayerSimulationLine> = {}): PlayerSimulationLine {
  return {
    playerId: "player-1",
    teamId: "team-1",
    started: false,
    snapsOffense: 0,
    snapsDefense: 0,
    snapsSpecialTeams: 0,
    passing: {
      attempts: 0,
      completions: 0,
      yards: 0,
      touchdowns: 0,
      interceptions: 0,
      sacksTaken: 0,
      sackYardsLost: 0,
      longestCompletion: 0,
    },
    rushing: {
      attempts: 0,
      yards: 0,
      touchdowns: 0,
      fumbles: 0,
      longestRush: 0,
      brokenTackles: 0,
    },
    receiving: {
      targets: 0,
      receptions: 0,
      yards: 0,
      touchdowns: 0,
      drops: 0,
      longestReception: 0,
      yardsAfterCatch: 0,
    },
    blocking: {
      passBlockSnaps: 0,
      runBlockSnaps: 0,
      sacksAllowed: 0,
      pressuresAllowed: 0,
      pancakes: 0,
    },
    defensive: {
      tackles: 0,
      assistedTackles: 0,
      tacklesForLoss: 0,
      sacks: 0,
      quarterbackHits: 0,
      passesDefended: 0,
      interceptions: 0,
      forcedFumbles: 0,
      fumbleRecoveries: 0,
      defensiveTouchdowns: 0,
      coverageSnaps: 0,
      targetsAllowed: 0,
      receptionsAllowed: 0,
      yardsAllowed: 0,
    },
    kicking: {
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      fieldGoalsMadeShort: 0,
      fieldGoalsAttemptedShort: 0,
      fieldGoalsMadeMid: 0,
      fieldGoalsAttemptedMid: 0,
      fieldGoalsMadeLong: 0,
      fieldGoalsAttemptedLong: 0,
      extraPointsMade: 0,
      extraPointsAttempted: 0,
      longestFieldGoal: 0,
      kickoffTouchbacks: 0,
    },
    punting: {
      punts: 0,
      puntYards: 0,
      netPuntYards: 0,
      fairCatchesForced: 0,
      hangTimeTotalTenths: 0,
      puntsInside20: 0,
      touchbacks: 0,
      longestPunt: 0,
    },
    returns: {
      kickReturns: 0,
      kickReturnYards: 0,
      kickReturnTouchdowns: 0,
      kickReturnFumbles: 0,
      puntReturns: 0,
      puntReturnYards: 0,
      puntReturnTouchdowns: 0,
      puntReturnFumbles: 0,
    },
    ...overrides,
  };
}

describe("fatigue and recovery rules", () => {
  it("adds more fatigue for high-load starters than idle players", () => {
    expect(calculateMatchFatigueDelta({ positionCode: "WR" }, createLine())).toBe(0);
    expect(
      calculateMatchFatigueDelta(
        { positionCode: "WR" },
        createLine({ started: true, snapsOffense: 56 }),
      ),
    ).toBe(15);
  });

  it("recovers tired healthy players faster while respecting lower bounds", () => {
    expect(
      buildRecoveryConditionUpdate(
        {
          fatigue: 82,
          injuryStatus: "HEALTHY",
          morale: 58,
          status: "ACTIVE",
        },
        {
          fatigueRecovery: 12,
          moraleRecovery: 1,
        },
      ),
    ).toEqual({
      fatigue: 63,
      morale: 59,
    });

    expect(
      buildRecoveryConditionUpdate(
        {
          fatigue: 4,
          injuryStatus: "HEALTHY",
          morale: 98,
          status: "ACTIVE",
        },
        {
          fatigueRecovery: 12,
          moraleRecovery: 1,
        },
      ),
    ).toEqual({
      fatigue: 0,
      morale: 99,
    });
  });

  it("soft caps repeated match fatigue accumulation at high fatigue", () => {
    expect(applyMatchFatigueDelta(30, 15)).toBe(45);
    expect(applyMatchFatigueDelta(72, 15)).toBe(82);
    expect(applyMatchFatigueDelta(90, 15)).toBe(96);
  });

  it("stabilizes repeated weekly carryover below permanent max fatigue", () => {
    let fatigue = 58;

    for (let week = 0; week < 8; week += 1) {
      fatigue = applyMatchFatigueDelta(fatigue, 15);
      fatigue = buildRecoveryConditionUpdate(
        {
          fatigue,
          injuryStatus: "HEALTHY",
          morale: 58,
          status: "ACTIVE",
        },
        {
          fatigueRecovery: 12,
          moraleRecovery: 1,
        },
      ).fatigue;
    }

    expect(fatigue).toBeLessThan(70);
  });

  it("turns high fatigue into moderate readiness and snap penalties", () => {
    expect(buildFatigueGameDayProfile({ fatigue: 20 })).toEqual({
      readinessMultiplier: 1,
      snapMultiplier: 1,
    });
    expect(buildFatigueGameDayProfile({ fatigue: 80 })).toEqual({
      readinessMultiplier: 0.96,
      snapMultiplier: 0.968,
    });
    const maxFatigueProfile = buildFatigueGameDayProfile({ fatigue: 99 });
    expect(maxFatigueProfile.readinessMultiplier).toBeCloseTo(0.941);
    expect(maxFatigueProfile.snapMultiplier).toBeCloseTo(0.9452);
  });
});
