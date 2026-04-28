import { describe, expect, it } from "vitest";

import type {
  DefensivePlayDefinition,
  OffensivePlayDefinition,
  PlayAssignment,
} from "../domain/play-library";
import type { PlayerAlignmentSnapshot } from "../domain/pre-snap-structure";
import {
  type PassRouteDevelopmentTarget,
  resolvePassPlayDevelopment,
  resolveRunPlayDevelopment,
} from "./play-development-engine";

function player(
  positionCode: string,
  index: number,
  overrides: Partial<PlayerAlignmentSnapshot> = {},
): PlayerAlignmentSnapshot {
  const isOffenseLine = ["LT", "LG", "C", "RG", "RT", "TE"].includes(positionCode);
  const isDefenseFront = ["LE", "RE", "DT"].includes(positionCode);
  const isLinebacker = ["LOLB", "MLB", "ROLB"].includes(positionCode);
  const isDefensiveBack = ["CB", "FS", "SS"].includes(positionCode);

  return {
    playerId: `${positionCode.toLowerCase()}-${index}`,
    teamId: isDefenseFront || isLinebacker || isDefensiveBack ? "DEF" : "OFF",
    positionCode,
    lineOfScrimmageSide:
      index % 3 === 0 ? "LEFT" : index % 3 === 1 ? "MIDDLE" : "RIGHT",
    fieldAlignment: isOffenseLine || isDefenseFront ? "CORE" : "BACKFIELD",
    alignmentIndex: index,
    onLineOfScrimmage: isOffenseLine || isDefenseFront,
    inBackfield: !isOffenseLine && !isDefenseFront,
    snapRole: isDefenseFront
      ? "DEFENSIVE_FRONT"
      : isLinebacker
        ? "DEFENSIVE_BOX"
        : isDefensiveBack
          ? "DEFENSIVE_SECONDARY"
          : positionCode === "QB"
            ? "BACKFIELD_QB"
            : isOffenseLine
              ? "INTERIOR_LINE"
              : "BACKFIELD_SKILL",
    receiverDeclaration: "AUTO",
    motion: {
      type: "NONE",
      isInMotionAtSnap: false,
      directionAtSnap: "STATIONARY",
      startedFromSetPosition: true,
    },
    ...overrides,
  };
}

function assignment(
  id: string,
  positionCodes: string[],
  assignmentType: PlayAssignment["assignmentType"],
): PlayAssignment {
  return {
    roleId: id,
    positionCodes,
    assignmentType,
    responsibility: id,
    landmark: null,
    readId: null,
  };
}

function offensePlay(input: {
  family: OffensivePlayDefinition["family"];
  expectedYards?: number;
  assignments?: PlayAssignment[];
  extraPlayers?: PlayerAlignmentSnapshot[];
}): OffensivePlayDefinition {
  const offensePlayers = [
    player("LT", 1, { lineOfScrimmageSide: "LEFT" }),
    player("LG", 2, { lineOfScrimmageSide: "LEFT" }),
    player("C", 3, { lineOfScrimmageSide: "MIDDLE" }),
    player("RG", 4, { lineOfScrimmageSide: "RIGHT" }),
    player("RT", 5, { lineOfScrimmageSide: "RIGHT" }),
    player("QB", 6),
    ...(input.extraPlayers ?? []),
  ];

  return {
    id: `dev-off-${input.family.toLowerCase()}-${input.expectedYards ?? 6}`,
    family: input.family,
    side: "OFFENSE",
    label: input.family,
    supportedRulesets: ["NFL_PRO"],
    situationTags: ["BASE"],
    triggers: [],
    reads: [],
    assignments: input.assignments ?? [],
    expectedMetrics: {
      efficiencyRate: 0.48,
      explosiveRate: input.family === "DROPBACK" ? 0.18 : 0.08,
      turnoverSwingRate: 0.05,
      pressureRate: input.family === "DROPBACK" ? 0.32 : 0.18,
      expectedYards: input.expectedYards ?? 6,
      redZoneValue: 0.45,
    },
    counters: [],
    audibles: [],
    legalityTemplate: {
      formation: {
        id: "dev-off-formation",
        familyId: "gun",
        side: "OFFENSE",
        label: "Gun",
        strength: "BALANCED",
        spacing: "NORMAL",
        tags: [],
      },
      offensePersonnel: {
        id: "dev-off-personnel",
        side: "OFFENSE",
        label: "11",
        entries: [],
        totalPlayers: 11,
      },
      defensePersonnel: {
        id: "dev-def-personnel",
        side: "DEFENSE",
        label: "Nickel",
        entries: [],
        totalPlayers: 11,
      },
      offenseShift: {
        playersShifted: [],
        allPlayersSetForSeconds: 1,
        wasResetAfterShift: true,
      },
      offensePlayers,
      defensePlayers: [],
    },
    structure: {
      formationFamilyId: "gun",
      personnelPackageId: "dev-off-personnel",
      conceptFamilyId: `concept-${input.family.toLowerCase()}`,
      motionFamilyIds: [],
      protectionFamilyId: "protection-base",
    },
  };
}

function defensePlay(input: {
  family: DefensivePlayDefinition["family"];
  pressureCodes?: string[];
  includeSecondLinebacker?: boolean;
  extraPlayers?: PlayerAlignmentSnapshot[];
}): DefensivePlayDefinition {
  const defensePlayers = [
    player("LE", 1, { lineOfScrimmageSide: "LEFT" }),
    player("DT", 2, { lineOfScrimmageSide: "MIDDLE" }),
    player("DT", 3, { lineOfScrimmageSide: "MIDDLE" }),
    player("RE", 4, { lineOfScrimmageSide: "RIGHT" }),
    player("MLB", 5),
    ...(input.includeSecondLinebacker === false ? [] : [player("LOLB", 6)]),
    player("ROLB", 7),
    player("CB", 8),
    player("CB", 9),
    player("FS", 10),
    player("SS", 11),
    ...(input.extraPlayers ?? []),
  ];

  return {
    id: `dev-def-${input.family.toLowerCase()}`,
    family: input.family,
    side: "DEFENSE",
    label: input.family,
    supportedRulesets: ["NFL_PRO"],
    situationTags: ["BASE"],
    triggers: [],
    reads: [],
    assignments: input.pressureCodes?.length
      ? [assignment("pressure", input.pressureCodes, "PRESSURE")]
      : [],
    expectedMetrics: {
      efficiencyRate: 0.44,
      explosiveRate: 0.09,
      turnoverSwingRate: 0.07,
      pressureRate: 0.28,
      expectedYards: 5,
      redZoneValue: 0.42,
    },
    counters: [],
    audibles: [],
    legalityTemplate: {
      formation: {
        id: "dev-def-formation",
        familyId: "nickel",
        side: "DEFENSE",
        label: "Nickel",
        strength: "BALANCED",
        spacing: "NORMAL",
        tags: [],
      },
      offensePersonnel: {
        id: "dev-off-personnel",
        side: "OFFENSE",
        label: "11",
        entries: [],
        totalPlayers: 11,
      },
      defensePersonnel: {
        id: "dev-def-personnel",
        side: "DEFENSE",
        label: "Nickel",
        entries: [],
        totalPlayers: 11,
      },
      offenseShift: {
        playersShifted: [],
        allPlayersSetForSeconds: 1,
        wasResetAfterShift: true,
      },
      offensePlayers: [],
      defensePlayers,
    },
    structure: {
      formationFamilyId: "nickel",
      personnelPackageId: "dev-def-personnel",
      frontFamilyId: "front-even",
      coverageFamilyId: "coverage",
      pressureFamilyId: input.pressureCodes?.length ? "pressure" : null,
      coverageShell: input.family === "ZERO_PRESSURE" ? "ZERO" : "ONE_HIGH",
      pressurePresentation: input.pressureCodes?.length ? "FIVE_MAN" : "FOUR_MAN",
      defensiveConceptTag: null,
    },
  };
}

const neutralQuarterback = {
  POCKET_PRESENCE: 74,
  AWARENESS: 74,
  DECISION_MAKING: 74,
  COMMAND: 74,
  MOBILITY: 70,
};

const neutralLine = {
  PASS_BLOCK: 72,
  FOOTWORK: 72,
  ANCHOR: 72,
  HAND_TECHNIQUE: 72,
};

function routeTarget(input: {
  id: string;
  label?: string;
  routeType: "QUICK_SLANT" | "QUICK_OUT" | "HITCH" | "CROSSER" | "DIG" | "GO" | "POST" | "FADE";
  routeDepth: "QUICK" | "SHORT" | "MEDIUM" | "DEEP";
  baseYards: number;
  receiver?: Partial<PassRouteDevelopmentTarget["receiver"]>;
  defender?: Partial<PassRouteDevelopmentTarget["defender"]>;
}) {
  return {
    id: input.id,
    label: input.label ?? input.id,
    routeType: input.routeType,
    routeDepth: input.routeDepth,
    baseYards: input.baseYards,
    receiver: {
      RELEASE: 76,
      ROUTE_RUNNING: 76,
      SEPARATION: 76,
      CATCHING: 76,
      CONTESTED_CATCH: 74,
      SPEED: 76,
      ACCELERATION: 76,
      YARDS_AFTER_CATCH: 76,
      ...(input.receiver ?? {}),
    },
    defender: {
      PRESS: 74,
      MAN_COVERAGE: 74,
      ZONE_COVERAGE: 74,
      COVERAGE_RANGE: 74,
      BALL_SKILLS: 72,
      PLAY_RECOGNITION: 74,
      TACKLING: 74,
      SPEED: 74,
      ACCELERATION: 74,
      ...(input.defender ?? {}),
    },
  };
}

describe("play development engine", () => {
  it("makes blocker/rusher numbers and pass-rush ratings visibly change pressure", () => {
    const clean = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "DROPBACK", expectedYards: 10 }),
      defensePlay: defensePlay({ family: "MAN_COVERAGE" }),
      offensiveLine: {
        PASS_BLOCK: 90,
        FOOTWORK: 88,
        ANCHOR: 89,
        HAND_TECHNIQUE: 88,
      },
      passRush: {
        PASS_RUSH: 58,
        POWER_MOVES: 58,
        FINESSE_MOVES: 58,
        BLOCK_SHEDDING: 58,
      },
      quarterback: neutralQuarterback,
      decisionSeed: "clean-protection",
    });
    const pressured = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "DROPBACK", expectedYards: 10 }),
      defensePlay: defensePlay({
        family: "ZERO_PRESSURE",
        pressureCodes: ["MLB", "LOLB"],
      }),
      offensiveLine: {
        PASS_BLOCK: 56,
        FOOTWORK: 55,
        ANCHOR: 57,
        HAND_TECHNIQUE: 56,
      },
      passRush: {
        PASS_RUSH: 92,
        POWER_MOVES: 90,
        FINESSE_MOVES: 91,
        BLOCK_SHEDDING: 90,
      },
      quarterback: neutralQuarterback,
      decisionSeed: "bad-protection",
    });

    expect(clean.blockerCount).toBe(5);
    expect(clean.rusherCount).toBe(4);
    expect(pressured.rusherCount).toBe(6);
    expect(clean.doubleTeamChance).toBeGreaterThan(0);
    expect(pressured.openBlitzLaneRisk).toBeGreaterThan(clean.openBlitzLaneRisk);
    expect(pressured.pressureLevel).toBeGreaterThan(clean.pressureLevel);
    expect(pressured.pocketStability).toBeLessThan(clean.pocketStability);
    expect(pressured.trace.stages[0].stage).toBe("PASS_PROTECTION");
  });

  it("uses decision time to gate route availability and pressure outcomes", () => {
    const result = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "DROPBACK", expectedYards: 12 }),
      defensePlay: defensePlay({
        family: "ZERO_PRESSURE",
        pressureCodes: ["MLB", "LOLB"],
      }),
      offensiveLine: {
        PASS_BLOCK: 55,
        FOOTWORK: 56,
        ANCHOR: 55,
        HAND_TECHNIQUE: 55,
      },
      passRush: {
        PASS_RUSH: 91,
        POWER_MOVES: 90,
        FINESSE_MOVES: 91,
        BLOCK_SHEDDING: 89,
      },
      quarterback: {
        POCKET_PRESENCE: 50,
        AWARENESS: 50,
        DECISION_MAKING: 48,
        COMMAND: 49,
        MOBILITY: 55,
      },
      decisionSeed: "decision-gated-route",
    });

    expect(result.decisionTime).toBeLessThan(result.quarterbackDecision.requiredDevelopmentTime);
    expect(result.routeAvailability.DEEP).toBe(false);
    expect(["SACK", "SACK_FUMBLE", "THROWAWAY", "SCRAMBLE"]).toContain(
      result.decisionOutcome,
    );
    expect(result.trace.stages[1].values.outcome).toBe(result.decisionOutcome);
  });

  it("lets screen and quick pass counter blitz without automatic success", () => {
    const blitz = defensePlay({
      family: "ZERO_PRESSURE",
      pressureCodes: ["MLB", "LOLB"],
    });
    const deep = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "DROPBACK", expectedYards: 12 }),
      defensePlay: blitz,
      offensiveLine: neutralLine,
      passRush: {
        PASS_RUSH: 84,
        POWER_MOVES: 82,
        FINESSE_MOVES: 83,
        BLOCK_SHEDDING: 82,
      },
      quarterback: neutralQuarterback,
      decisionSeed: "deep-vs-blitz",
    });
    const screen = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "SCREEN", expectedYards: 1 }),
      defensePlay: blitz,
      offensiveLine: neutralLine,
      passRush: {
        PASS_RUSH: 84,
        POWER_MOVES: 82,
        FINESSE_MOVES: 83,
        BLOCK_SHEDDING: 82,
      },
      quarterback: neutralQuarterback,
      decisionSeed: "screen-vs-blitz",
    });
    const quick = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "QUICK_PASS", expectedYards: 5 }),
      defensePlay: blitz,
      offensiveLine: neutralLine,
      passRush: {
        PASS_RUSH: 84,
        POWER_MOVES: 82,
        FINESSE_MOVES: 83,
        BLOCK_SHEDDING: 82,
      },
      quarterback: neutralQuarterback,
      decisionSeed: "quick-vs-blitz",
    });

    expect(screen.isQuickCounter).toBe(true);
    expect(quick.isQuickCounter).toBe(true);
    expect(screen.pressureLevel).toBeLessThan(deep.pressureLevel);
    expect(quick.pressureLevel).toBeLessThan(deep.pressureLevel);
    expect(screen.openBlitzLaneRisk).toBeGreaterThan(0);
    expect(screen.pressureLevel).toBeGreaterThan(0.05);
    expect(screen.routeAvailability.QUICK).toBe(true);
    expect(screen.sackRisk).toBeGreaterThan(0);
  });

  it("uses lane quality to separate strong run fits from defensive wins", () => {
    const strongRun = resolveRunPlayDevelopment({
      offensePlay: offensePlay({
        family: "GAP_RUN",
        extraPlayers: [player("TE", 7), player("FB", 8)],
      }),
      defensePlay: defensePlay({
        family: "ZONE_COVERAGE",
        includeSecondLinebacker: false,
      }),
      offensiveLine: {
        RUN_BLOCK: 91,
        STRENGTH: 90,
        TOUGHNESS: 90,
        HAND_TECHNIQUE: 89,
        ANCHOR: 88,
      },
      runningBack: {
        VISION: 89,
        ELUSIVENESS: 86,
        BREAK_TACKLE: 90,
      },
      defenseFront: {
        RUN_DEFENSE: 58,
        BLOCK_SHEDDING: 57,
        TACKLING: 58,
        PLAY_RECOGNITION: 57,
      },
      gameplanRunDirection: "INSIDE",
    });
    const defensiveWin = resolveRunPlayDevelopment({
      offensePlay: offensePlay({
        family: "GAP_RUN",
        extraPlayers: [player("TE", 7)],
      }),
      defensePlay: defensePlay({
        family: "RUN_BLITZ",
        extraPlayers: [
          player("SS", 12, {
            fieldAlignment: "CORE",
            snapRole: "DEFENSIVE_BOX",
          }),
        ],
      }),
      offensiveLine: {
        RUN_BLOCK: 55,
        STRENGTH: 56,
        TOUGHNESS: 56,
        HAND_TECHNIQUE: 55,
        ANCHOR: 55,
      },
      runningBack: {
        VISION: 58,
        ELUSIVENESS: 58,
        BREAK_TACKLE: 59,
      },
      defenseFront: {
        RUN_DEFENSE: 92,
        BLOCK_SHEDDING: 91,
        TACKLING: 90,
        PLAY_RECOGNITION: 91,
      },
      gameplanRunDirection: "INSIDE",
    });

    expect(strongRun.blockerCount).toBeGreaterThanOrEqual(6);
    expect(defensiveWin.boxDefenderCount).toBeGreaterThan(strongRun.boxDefenderCount);
    expect(strongRun.laneQuality).toBeGreaterThan(defensiveWin.laneQuality);
    expect(strongRun.expectedYardsModifier).toBeGreaterThan(
      defensiveWin.expectedYardsModifier,
    );
    expect(defensiveWin.negativeYardageRisk).toBeGreaterThan(
      strongRun.negativeYardageRisk,
    );
    expect(strongRun.interpretation).toBe("OPEN_LANE");
    expect(defensiveWin.interpretation).toBe("DEFENSE_ADVANTAGE");
    expect(strongRun.trace.stages[0].stage).toBe("RUN_LANE");
  });

  it("runs press vs release before the route and lets press disrupt quick timing", () => {
    const result = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "QUICK_PASS", expectedYards: 5 }),
      defensePlay: defensePlay({ family: "MAN_COVERAGE" }),
      offensiveLine: {
        PASS_BLOCK: 82,
        FOOTWORK: 82,
        ANCHOR: 82,
        HAND_TECHNIQUE: 82,
      },
      passRush: {
        PASS_RUSH: 62,
        POWER_MOVES: 62,
        FINESSE_MOVES: 62,
        BLOCK_SHEDDING: 62,
      },
      quarterback: {
        ...neutralQuarterback,
        THROW_ACCURACY: 82,
      },
      targets: [
        routeTarget({
          id: "slant",
          label: "Quick Slant",
          routeType: "QUICK_SLANT",
          routeDepth: "QUICK",
          baseYards: 5,
          receiver: {
            RELEASE: 58,
            ROUTE_RUNNING: 62,
            SEPARATION: 60,
            CATCHING: 70,
          },
          defender: {
            PRESS: 94,
            MAN_COVERAGE: 90,
            SPEED: 86,
            ACCELERATION: 88,
          },
        }),
      ],
      decisionSeed: "press-quick-decision",
      pressSeed: "press-quick",
      matchupSeed: "press-quick-matchup",
    });

    expect(result.press).toHaveLength(1);
    expect(result.press[0].press.timingDisruption).toBeGreaterThan(0.35);
    expect(result.press[0].press.routeDevelopmentTimeDelta).toBeGreaterThan(0.1);
    expect(result.press[0].press.separationDelta).toBeLessThan(0);
    expect(result.receiverMatchup?.selectedTarget?.id).toBe("slant");
    expect(result.trace.stages.some((stage) => stage.stage === "PRESS_COVERAGE")).toBe(true);
  });

  it("lets a receiver punish failed press with separation and big-play risk", () => {
    const result = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "DROPBACK", expectedYards: 12 }),
      defensePlay: defensePlay({ family: "MAN_COVERAGE" }),
      offensiveLine: {
        PASS_BLOCK: 90,
        FOOTWORK: 89,
        ANCHOR: 89,
        HAND_TECHNIQUE: 88,
      },
      passRush: {
        PASS_RUSH: 55,
        POWER_MOVES: 55,
        FINESSE_MOVES: 55,
        BLOCK_SHEDDING: 55,
      },
      quarterback: {
        ...neutralQuarterback,
        DECISION_MAKING: 88,
        AWARENESS: 88,
        COMMAND: 88,
        THROW_ACCURACY: 90,
        RISK_TOLERANCE: 88,
      },
      targets: [
        routeTarget({
          id: "go",
          label: "Go Route",
          routeType: "GO",
          routeDepth: "MEDIUM",
          baseYards: 18,
          receiver: {
            RELEASE: 95,
            ROUTE_RUNNING: 92,
            SEPARATION: 92,
            CATCHING: 90,
            CONTESTED_CATCH: 88,
            SPEED: 95,
            ACCELERATION: 94,
            YARDS_AFTER_CATCH: 88,
          },
          defender: {
            PRESS: 52,
            MAN_COVERAGE: 58,
            ZONE_COVERAGE: 58,
            COVERAGE_RANGE: 62,
            BALL_SKILLS: 55,
            PLAY_RECOGNITION: 58,
            SPEED: 78,
            ACCELERATION: 76,
          },
        }),
      ],
      safetyHelp: false,
      gameplan: "AGGRESSIVE",
      decisionSeed: "punish-press-decision",
      pressSeed: "punish-press",
      matchupSeed: "punish-press-matchup",
      random: () => 0.99,
    });

    expect(result.press[0].press.separationDelta).toBeGreaterThan(0);
    expect(result.press[0].press.bigPlayRiskDelta).toBeGreaterThan(0.05);
    expect(result.receiverMatchup?.selectedTarget?.id).toBe("go");
    expect(result.receiverMatchup?.completionProbability).toBeGreaterThan(0.55);
    expect(result.receiverMatchup?.yacYards ?? 0).toBeGreaterThanOrEqual(0);
  });

  it("limits target selection to routes available after QB decision time", () => {
    const result = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "SCREEN", expectedYards: 1 }),
      defensePlay: defensePlay({
        family: "ZERO_PRESSURE",
        pressureCodes: ["MLB", "LOLB"],
      }),
      offensiveLine: neutralLine,
      passRush: {
        PASS_RUSH: 84,
        POWER_MOVES: 82,
        FINESSE_MOVES: 83,
        BLOCK_SHEDDING: 82,
      },
      quarterback: {
        ...neutralQuarterback,
        THROW_ACCURACY: 82,
        RISK_TOLERANCE: 94,
      },
      targets: [
        routeTarget({
          id: "screen",
          label: "RB Screen",
          routeType: "QUICK_OUT",
          routeDepth: "QUICK",
          baseYards: 3,
        }),
        routeTarget({
          id: "deep-shot",
          label: "Deep Shot",
          routeType: "GO",
          routeDepth: "DEEP",
          baseYards: 26,
          receiver: {
            RELEASE: 96,
            ROUTE_RUNNING: 96,
            SEPARATION: 96,
            CATCHING: 94,
            SPEED: 96,
            ACCELERATION: 96,
          },
        }),
      ],
      gameplan: "AGGRESSIVE",
      decisionSeed: "screen-target-limit",
      pressSeed: "screen-target-limit",
      matchupSeed: "screen-target-limit",
    });

    expect(result.routeAvailability.DEEP).toBe(false);
    expect(result.receiverMatchup?.selectedTarget?.id).toBe("screen");
    expect(result.receiverMatchup?.trace.targetSelection).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetId: "deep-shot",
          isAvailable: false,
          score: -999,
        }),
      ]),
    );
  });

  it("makes receiver/defender matchup and pressure affect completion, interception and YAC", () => {
    const cleanEliteReceiver = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "QUICK_PASS", expectedYards: 6 }),
      defensePlay: defensePlay({ family: "MAN_COVERAGE" }),
      offensiveLine: {
        PASS_BLOCK: 92,
        FOOTWORK: 91,
        ANCHOR: 91,
        HAND_TECHNIQUE: 90,
      },
      passRush: {
        PASS_RUSH: 54,
        POWER_MOVES: 54,
        FINESSE_MOVES: 54,
        BLOCK_SHEDDING: 54,
      },
      quarterback: {
        ...neutralQuarterback,
        DECISION_MAKING: 88,
        AWARENESS: 88,
        COMMAND: 88,
        THROW_ACCURACY: 90,
      },
      targets: [
        routeTarget({
          id: "iso",
          label: "Isolation Route",
          routeType: "QUICK_OUT",
          routeDepth: "SHORT",
          baseYards: 8,
          receiver: {
            RELEASE: 92,
            ROUTE_RUNNING: 92,
            SEPARATION: 94,
            CATCHING: 92,
            CONTESTED_CATCH: 90,
            SPEED: 91,
            ACCELERATION: 91,
            YARDS_AFTER_CATCH: 91,
          },
          defender: {
            PRESS: 58,
            MAN_COVERAGE: 58,
            ZONE_COVERAGE: 58,
            COVERAGE_RANGE: 60,
            BALL_SKILLS: 55,
            PLAY_RECOGNITION: 58,
            TACKLING: 58,
          },
        }),
      ],
      decisionSeed: "clean-elite-receiver",
      pressSeed: "clean-elite-receiver",
      matchupSeed: "clean-elite-receiver",
    });
    const pressureEliteDefender = resolvePassPlayDevelopment({
      offensePlay: offensePlay({ family: "QUICK_PASS", expectedYards: 6 }),
      defensePlay: defensePlay({
        family: "FIRE_ZONE",
        pressureCodes: ["MLB"],
      }),
      offensiveLine: {
        PASS_BLOCK: 70,
        FOOTWORK: 69,
        ANCHOR: 70,
        HAND_TECHNIQUE: 69,
      },
      passRush: {
        PASS_RUSH: 84,
        POWER_MOVES: 83,
        FINESSE_MOVES: 83,
        BLOCK_SHEDDING: 82,
      },
      quarterback: {
        ...neutralQuarterback,
        DECISION_MAKING: 70,
        AWARENESS: 70,
        COMMAND: 68,
        THROW_ACCURACY: 68,
      },
      targets: [
        routeTarget({
          id: "iso",
          label: "Isolation Route",
          routeType: "QUICK_SLANT",
          routeDepth: "QUICK",
          baseYards: 6,
          receiver: {
            RELEASE: 60,
            ROUTE_RUNNING: 60,
            SEPARATION: 60,
            CATCHING: 64,
            CONTESTED_CATCH: 60,
          },
          defender: {
            PRESS: 88,
            MAN_COVERAGE: 92,
            ZONE_COVERAGE: 90,
            COVERAGE_RANGE: 91,
            BALL_SKILLS: 92,
            PLAY_RECOGNITION: 91,
            TACKLING: 88,
          },
        }),
      ],
      decisionSeed: "pressure-elite-defender",
      pressSeed: "pressure-elite-defender",
      matchupSeed: "pressure-elite-defender",
      random: () => 0.99,
    });

    expect(cleanEliteReceiver.receiverMatchup).not.toBeNull();
    expect(pressureEliteDefender.receiverMatchup).not.toBeNull();
    expect(cleanEliteReceiver.receiverMatchup?.completionProbability).toBeGreaterThan(
      pressureEliteDefender.receiverMatchup?.completionProbability ?? 0,
    );
    expect(cleanEliteReceiver.receiverMatchup?.interceptionProbability).toBeLessThan(
      pressureEliteDefender.receiverMatchup?.interceptionProbability ?? 0,
    );
    expect(cleanEliteReceiver.receiverMatchup?.yacYards ?? 0).toBeGreaterThanOrEqual(
      pressureEliteDefender.receiverMatchup?.yacYards ?? 0,
    );
    expect(cleanEliteReceiver.passOutcome).toBeDefined();
    expect(
      cleanEliteReceiver.trace.stages.some((stage) => stage.stage === "RECEIVER_MATCHUP"),
    ).toBe(true);
  });
});
