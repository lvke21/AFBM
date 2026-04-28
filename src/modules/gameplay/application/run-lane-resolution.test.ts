import { describe, expect, it } from "vitest";

import type {
  DefensivePlayDefinition,
  OffensivePlayDefinition,
  PlayAssignment,
} from "../domain/play-library";
import type { PlayerAlignmentSnapshot } from "../domain/pre-snap-structure";
import { resolveRunLane, type RunDirection } from "./run-lane-resolution";

function player(
  positionCode: string,
  index: number,
  overrides: Partial<PlayerAlignmentSnapshot> = {},
): PlayerAlignmentSnapshot {
  const isOffenseLine = ["LT", "LG", "C", "RG", "RT", "TE"].includes(positionCode);
  const isDefenseFront = ["LE", "RE", "DT"].includes(positionCode);
  const isLinebacker = ["LOLB", "MLB", "ROLB"].includes(positionCode);
  const isSafety = ["FS", "SS"].includes(positionCode);

  return {
    playerId: `${positionCode.toLowerCase()}-${index}`,
    teamId: isDefenseFront || isLinebacker || isSafety || positionCode === "CB"
      ? "DEF"
      : "OFF",
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
        : isSafety || positionCode === "CB"
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
  family?: OffensivePlayDefinition["family"];
  assignments?: PlayAssignment[];
  extraPlayers?: PlayerAlignmentSnapshot[];
  expectedYards?: number;
} = {}): OffensivePlayDefinition {
  const offensePlayers = [
    player("LT", 1, { lineOfScrimmageSide: "LEFT" }),
    player("LG", 2, { lineOfScrimmageSide: "LEFT" }),
    player("C", 3, { lineOfScrimmageSide: "MIDDLE" }),
    player("RG", 4, { lineOfScrimmageSide: "RIGHT" }),
    player("RT", 5, { lineOfScrimmageSide: "RIGHT" }),
    player("QB", 6),
    ...(input.extraPlayers ?? []),
  ];
  const family = input.family ?? "ZONE_RUN";

  return {
    id: `off-${family.toLowerCase()}`,
    family,
    side: "OFFENSE",
    label: family,
    supportedRulesets: ["NFL_PRO"],
    situationTags: ["BASE"],
    triggers: [],
    reads: [],
    assignments: input.assignments ?? [],
    expectedMetrics: {
      efficiencyRate: 0.48,
      explosiveRate: 0.1,
      turnoverSwingRate: 0.04,
      pressureRate: 0.18,
      expectedYards: input.expectedYards ?? 5,
      redZoneValue: 0.45,
    },
    counters: [],
    audibles: [],
    legalityTemplate: {
      formation: {
        id: "off-formation",
        familyId: "singleback",
        side: "OFFENSE",
        label: "Singleback",
        strength: "BALANCED",
        spacing: "NORMAL",
        tags: [],
      },
      offensePersonnel: {
        id: "off-11",
        side: "OFFENSE",
        label: "11",
        entries: [],
        totalPlayers: 11,
      },
      defensePersonnel: {
        id: "def-base",
        side: "DEFENSE",
        label: "Base",
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
      formationFamilyId: "singleback",
      personnelPackageId: "off-11",
      conceptFamilyId: `concept-${family.toLowerCase()}`,
      motionFamilyIds: [],
      protectionFamilyId: "run-fit",
    },
  };
}

function defensePlay(input: {
  family?: DefensivePlayDefinition["family"];
  extraPlayers?: PlayerAlignmentSnapshot[];
  assignments?: PlayAssignment[];
  includeSecondLinebacker?: boolean;
} = {}): DefensivePlayDefinition {
  const family = input.family ?? "ZONE_COVERAGE";
  const defensePlayers = [
    player("LE", 1, { lineOfScrimmageSide: "LEFT" }),
    player("DT", 2, { lineOfScrimmageSide: "MIDDLE" }),
    player("DT", 3, { lineOfScrimmageSide: "MIDDLE" }),
    player("RE", 4, { lineOfScrimmageSide: "RIGHT" }),
    player("MLB", 5),
    ...(input.includeSecondLinebacker === false ? [] : [player("LOLB", 6)]),
    ...(input.extraPlayers ?? []),
    player("CB", 8),
    player("CB", 9),
    player("FS", 10),
    player("SS", 11),
  ];

  return {
    id: `def-${family.toLowerCase()}`,
    family,
    side: "DEFENSE",
    label: family,
    supportedRulesets: ["NFL_PRO"],
    situationTags: ["BASE"],
    triggers: [],
    reads: [],
    assignments: input.assignments ?? [],
    expectedMetrics: {
      efficiencyRate: 0.44,
      explosiveRate: 0.08,
      turnoverSwingRate: 0.05,
      pressureRate: 0.22,
      expectedYards: 4,
      redZoneValue: 0.42,
    },
    counters: [],
    audibles: [],
    legalityTemplate: {
      formation: {
        id: "def-formation",
        familyId: "base",
        side: "DEFENSE",
        label: "Base",
        strength: "BALANCED",
        spacing: "NORMAL",
        tags: [],
      },
      offensePersonnel: {
        id: "off-11",
        side: "OFFENSE",
        label: "11",
        entries: [],
        totalPlayers: 11,
      },
      defensePersonnel: {
        id: "def-base",
        side: "DEFENSE",
        label: "Base",
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
      formationFamilyId: "base",
      personnelPackageId: "def-base",
      frontFamilyId: "front-even",
      coverageFamilyId: "coverage",
      pressureFamilyId: family === "RUN_BLITZ" ? "run-blitz" : null,
      coverageShell: "ONE_HIGH",
      pressurePresentation: family === "RUN_BLITZ" ? "FIVE_MAN" : "FOUR_MAN",
      defensiveConceptTag: null,
    },
  };
}

function resolve(input: {
  offense?: OffensivePlayDefinition;
  defense?: DefensivePlayDefinition;
  runBlocking?: number;
  strength?: number;
  toughness?: number;
  rbVision?: number;
  rbElusiveness?: number;
  rbBreakTackle?: number;
  defenseRunDefense?: number;
  blockShedding?: number;
  tackling?: number;
  playRecognition?: number;
  direction?: RunDirection;
} = {}) {
  return resolveRunLane({
    offensePlay: input.offense ?? offensePlay(),
    defensePlay: input.defense ?? defensePlay(),
    runBlocking: input.runBlocking ?? 72,
    strength: input.strength ?? 72,
    toughness: input.toughness ?? 72,
    rbVision: input.rbVision ?? 72,
    rbElusiveness: input.rbElusiveness ?? 72,
    rbBreakTackle: input.rbBreakTackle ?? 72,
    defenseRunDefense: input.defenseRunDefense ?? 72,
    blockShedding: input.blockShedding ?? 72,
    tackling: input.tackling ?? 72,
    playRecognition: input.playRecognition ?? 72,
    gameplanRunDirection: input.direction ?? "INSIDE",
  });
}

describe("run lane resolution", () => {
  it("resolves 6 blockers vs 5 box defenders with open-lane upside", () => {
    const result = resolve({
      offense: offensePlay({
        extraPlayers: [player("TE", 7)],
      }),
      defense: defensePlay({
        includeSecondLinebacker: false,
      }),
    });

    expect(result.blockerCount).toBe(6);
    expect(result.boxDefenderCount).toBe(5);
    expect(result.laneQuality).toBeGreaterThan(0.45);
    expect(result.openLaneChance).toBeGreaterThan(0.15);
    expect(result.trace.blockerIds).toHaveLength(6);
  });

  it("resolves 6 blockers vs 6 box defenders as a neutral creator lane", () => {
    const result = resolve({
      offense: offensePlay({
        extraPlayers: [player("TE", 7)],
      }),
      defense: defensePlay(),
    });

    expect(result.blockerCount).toBe(6);
    expect(result.boxDefenderCount).toBe(6);
    expect(result.blockerAdvantage).toBeGreaterThan(-8);
    expect(result.blockerAdvantage).toBeLessThan(8);
    expect(result.rbCreationChance).toBeGreaterThan(0.15);
  });

  it("resolves 6 blockers vs 7 box defenders with negative-play risk", () => {
    const result = resolve({
      offense: offensePlay({
        extraPlayers: [player("TE", 7)],
      }),
      defense: defensePlay({
        extraPlayers: [
          player("SS", 12, {
            fieldAlignment: "CORE",
            snapRole: "DEFENSIVE_BOX",
          }),
        ],
      }),
    });

    expect(result.blockerCount).toBe(6);
    expect(result.boxDefenderCount).toBe(7);
    expect(result.stuffedRisk).toBeGreaterThan(0.25);
    expect(result.negativeYardageRisk).toBeGreaterThan(0.1);
  });

  it("lets an elite RB create behind a weak OL when the lane is neutral", () => {
    const weakLineEliteBack = resolve({
      offense: offensePlay({
        extraPlayers: [player("TE", 7)],
      }),
      runBlocking: 56,
      strength: 58,
      toughness: 60,
      rbVision: 94,
      rbElusiveness: 92,
      rbBreakTackle: 91,
    });
    const weakLineWeakBack = resolve({
      offense: offensePlay({
        extraPlayers: [player("TE", 7)],
      }),
      runBlocking: 56,
      strength: 58,
      toughness: 60,
      rbVision: 54,
      rbElusiveness: 55,
      rbBreakTackle: 56,
    });

    expect(weakLineEliteBack.rbCreationChance).toBeGreaterThan(
      weakLineWeakBack.rbCreationChance,
    );
    expect(weakLineEliteBack.expectedYardsModifier).toBeGreaterThan(
      weakLineWeakBack.expectedYardsModifier,
    );
    expect(weakLineEliteBack.stuffedRisk).toBeLessThan(weakLineWeakBack.stuffedRisk);
  });

  it("lets a weak RB benefit from elite OL without becoming automatic", () => {
    const weakBackEliteLine = resolve({
      offense: offensePlay({
        extraPlayers: [player("TE", 7)],
      }),
      runBlocking: 94,
      strength: 92,
      toughness: 91,
      rbVision: 54,
      rbElusiveness: 55,
      rbBreakTackle: 56,
    });
    const weakBackWeakLine = resolve({
      offense: offensePlay({
        extraPlayers: [player("TE", 7)],
      }),
      runBlocking: 56,
      strength: 58,
      toughness: 60,
      rbVision: 54,
      rbElusiveness: 55,
      rbBreakTackle: 56,
    });

    expect(weakBackEliteLine.laneQuality).toBeGreaterThan(weakBackWeakLine.laneQuality);
    expect(weakBackEliteLine.openLaneChance).toBeGreaterThan(
      weakBackWeakLine.openLaneChance,
    );
    expect(weakBackEliteLine.rbCreationChance).toBeLessThan(0.35);
  });

  it("makes a strong run defense dangerous against inside run", () => {
    const strongInsideDefense = resolve({
      offense: offensePlay({
        family: "GAP_RUN",
        extraPlayers: [player("TE", 7)],
      }),
      defense: defensePlay({
        family: "RUN_BLITZ",
        extraPlayers: [
          player("SS", 12, {
            fieldAlignment: "CORE",
            snapRole: "DEFENSIVE_BOX",
          }),
        ],
      }),
      defenseRunDefense: 92,
      blockShedding: 91,
      tackling: 90,
      playRecognition: 92,
      direction: "INSIDE",
    });
    const normalDefense = resolve({
      offense: offensePlay({
        family: "GAP_RUN",
        extraPlayers: [player("TE", 7)],
      }),
      direction: "INSIDE",
    });

    expect(strongInsideDefense.laneQuality).toBeLessThan(normalDefense.laneQuality);
    expect(strongInsideDefense.stuffedRisk).toBeGreaterThan(normalDefense.stuffedRisk);
    expect(strongInsideDefense.expectedYardsModifier).toBeLessThan(
      normalDefense.expectedYardsModifier,
    );
  });

  it("rewards outside run with fast perimeter help", () => {
    const outsideWithReceivers = resolve({
      offense: offensePlay({
        family: "ZONE_RUN",
        assignments: [assignment("perimeter", ["WR"], "RUN_BLOCK")],
        extraPlayers: [
          player("TE", 7),
          player("WR", 8, { lineOfScrimmageSide: "LEFT", fieldAlignment: "WIDE" }),
          player("WR", 9, { lineOfScrimmageSide: "RIGHT", fieldAlignment: "WIDE" }),
        ],
      }),
      rbVision: 84,
      rbElusiveness: 91,
      rbBreakTackle: 76,
      direction: "OUTSIDE_LEFT",
    });
    const insideSamePlayers = resolve({
      offense: offensePlay({
        family: "ZONE_RUN",
        assignments: [assignment("perimeter", ["WR"], "RUN_BLOCK")],
        extraPlayers: [
          player("TE", 7),
          player("WR", 8, { lineOfScrimmageSide: "LEFT", fieldAlignment: "WIDE" }),
          player("WR", 9, { lineOfScrimmageSide: "RIGHT", fieldAlignment: "WIDE" }),
        ],
      }),
      rbVision: 84,
      rbElusiveness: 91,
      rbBreakTackle: 76,
      direction: "INSIDE",
    });

    expect(outsideWithReceivers.blockerCount).toBeGreaterThan(
      insideSamePlayers.blockerCount,
    );
    expect(outsideWithReceivers.openLaneChance).toBeGreaterThan(
      insideSamePlayers.openLaneChance,
    );
    expect(outsideWithReceivers.expectedYardsModifier).toBeGreaterThan(
      insideSamePlayers.expectedYardsModifier,
    );
  });

  it("returns debug trace factors for run reports", () => {
    const result = resolve({
      offense: offensePlay({
        extraPlayers: [player("TE", 7)],
      }),
    });

    expect(result.trace.notes.join(" ")).toContain("run lane");
    expect(result.trace.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "blockerPower" }),
        expect.objectContaining({ label: "defenseFit" }),
        expect.objectContaining({ label: "rbCreation" }),
      ]),
    );
  });
});
