import { describe, expect, it } from "vitest";

import type {
  DefensivePlayDefinition,
  OffensivePlayDefinition,
  PlayAssignment,
} from "../domain/play-library";
import type { PlayerAlignmentSnapshot } from "../domain/pre-snap-structure";
import { resolvePassProtection } from "./pass-protection-resolution";

function player(positionCode: string, index: number): PlayerAlignmentSnapshot {
  const isOffenseLine = ["LT", "LG", "C", "RG", "RT", "TE"].includes(positionCode);
  const isDefenseFront = ["LE", "RE", "DT"].includes(positionCode);

  return {
    playerId: `${positionCode.toLowerCase()}-${index}`,
    teamId: isDefenseFront || ["LOLB", "MLB", "ROLB", "CB", "FS", "SS"].includes(positionCode)
      ? "DEF"
      : "OFF",
    positionCode,
    lineOfScrimmageSide: index % 3 === 0 ? "LEFT" : index % 3 === 1 ? "MIDDLE" : "RIGHT",
    fieldAlignment: isOffenseLine || isDefenseFront ? "CORE" : "BACKFIELD",
    alignmentIndex: index,
    onLineOfScrimmage: isOffenseLine || isDefenseFront,
    inBackfield: !isOffenseLine && !isDefenseFront,
    snapRole: isDefenseFront
      ? "DEFENSIVE_FRONT"
      : ["LOLB", "MLB", "ROLB"].includes(positionCode)
        ? "DEFENSIVE_BOX"
        : ["CB", "FS", "SS"].includes(positionCode)
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
    player("LT", 1),
    player("LG", 2),
    player("C", 3),
    player("RG", 4),
    player("RT", 5),
    player("QB", 6),
    ...(input.extraPlayers ?? []),
  ];

  return {
    id: `off-${input.family.toLowerCase()}`,
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
      explosiveRate: 0.1,
      turnoverSwingRate: 0.05,
      pressureRate: 0.24,
      expectedYards: input.expectedYards ?? 6,
      redZoneValue: 0.45,
    },
    counters: [],
    audibles: [],
    legalityTemplate: {
      formation: {
        id: "off-formation",
        familyId: "gun",
        side: "OFFENSE",
        label: "Gun",
        strength: "BALANCED",
        spacing: "NORMAL",
        tags: [],
      },
      offensePersonnel: {
        id: "off-10",
        side: "OFFENSE",
        label: "10",
        entries: [],
        totalPlayers: 11,
      },
      defensePersonnel: {
        id: "def-nickel",
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
      personnelPackageId: "off-10",
      conceptFamilyId: `concept-${input.family.toLowerCase()}`,
      motionFamilyIds: [],
      protectionFamilyId: "protection-base",
    },
  };
}

function defensePlay(input: {
  family: DefensivePlayDefinition["family"];
  pressureCodes?: string[];
}): DefensivePlayDefinition {
  const defensePlayers = [
    player("LE", 1),
    player("DT", 2),
    player("DT", 3),
    player("RE", 4),
    player("MLB", 5),
    player("LOLB", 6),
    player("ROLB", 7),
    player("CB", 8),
    player("CB", 9),
    player("FS", 10),
    player("SS", 11),
  ];

  return {
    id: `def-${input.family.toLowerCase()}`,
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
        id: "def-formation",
        familyId: "nickel",
        side: "DEFENSE",
        label: "Nickel",
        strength: "BALANCED",
        spacing: "NORMAL",
        tags: [],
      },
      offensePersonnel: {
        id: "off-10",
        side: "OFFENSE",
        label: "10",
        entries: [],
        totalPlayers: 11,
      },
      defensePersonnel: {
        id: "def-nickel",
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
      personnelPackageId: "def-nickel",
      frontFamilyId: "front-even",
      coverageFamilyId: "coverage",
      pressureFamilyId: input.pressureCodes?.length ? "pressure" : null,
      coverageShell: input.family === "ZERO_PRESSURE" ? "ZERO" : "ONE_HIGH",
      pressurePresentation: input.pressureCodes?.length ? "FIVE_MAN" : "FOUR_MAN",
      defensiveConceptTag: null,
    },
  };
}

function resolve(input: {
  offense?: OffensivePlayDefinition;
  defense?: DefensivePlayDefinition;
  passBlocking?: number;
  passRush?: number;
  qbPocketPresence?: number;
  qbAwareness?: number;
} = {}) {
  return resolvePassProtection({
    offensePlay: input.offense ?? offensePlay({ family: "DROPBACK" }),
    defensePlay: input.defense ?? defensePlay({ family: "MAN_COVERAGE" }),
    passBlocking: input.passBlocking ?? 72,
    passRush: input.passRush ?? 72,
    qbPocketPresence: input.qbPocketPresence ?? 72,
    qbAwareness: input.qbAwareness ?? 72,
  });
}

describe("pass protection resolution", () => {
  it("resolves 5 blockers vs 4 rushers with double-team upside", () => {
    const result = resolve();

    expect(result.blockerCount).toBe(5);
    expect(result.rusherCount).toBe(4);
    expect(result.doubleTeamChance).toBeGreaterThan(0);
    expect(result.openBlitzLaneRisk).toBe(0);
    expect(result.pressureLevel).toBeLessThan(0.35);
    expect(result.trace.blockerIds).toHaveLength(5);
    expect(result.trace.rusherIds).toHaveLength(4);
  });

  it("resolves 5 blockers vs 5 rushers as balanced pressure", () => {
    const result = resolve({
      defense: defensePlay({ family: "FIRE_ZONE", pressureCodes: ["MLB"] }),
    });

    expect(result.blockerCount).toBe(5);
    expect(result.rusherCount).toBe(5);
    expect(result.doubleTeamChance).toBe(0);
    expect(result.openBlitzLaneRisk).toBe(0);
    expect(result.pressureLevel).toBeGreaterThan(0.35);
    expect(result.pressureLevel).toBeLessThan(0.6);
  });

  it("resolves 5 blockers vs 6 rushers with possible but not guaranteed open blitz lane", () => {
    const result = resolve({
      defense: defensePlay({ family: "ZERO_PRESSURE", pressureCodes: ["MLB", "LOLB"] }),
    });

    expect(result.blockerCount).toBe(5);
    expect(result.rusherCount).toBe(6);
    expect(result.openBlitzLaneRisk).toBeGreaterThan(0.1);
    expect(result.openBlitzLaneRisk).toBeLessThan(0.6);
    expect(result.pressureLevel).toBeGreaterThan(0.5);
    expect(result.pocketStability).toBeGreaterThan(0.05);
  });

  it("makes blitz more dangerous against deep dropback than against a screen", () => {
    const blitz = defensePlay({ family: "ZERO_PRESSURE", pressureCodes: ["MLB", "LOLB"] });
    const deepPass = resolve({
      offense: offensePlay({ family: "DROPBACK", expectedYards: 11 }),
      defense: blitz,
    });
    const screen = resolve({
      offense: offensePlay({ family: "SCREEN", expectedYards: 2 }),
      defense: blitz,
    });

    expect(deepPass.pressureLevel).toBeGreaterThan(screen.pressureLevel);
    expect(screen.openBlitzLaneRisk).toBeGreaterThan(0);
    expect(screen.pressureLevel).toBeGreaterThan(0.2);
    expect(screen.pocketStability).toBeGreaterThan(deepPass.pocketStability);
    expect(screen.isQuickCounter).toBe(true);
  });

  it("lets elite OL stabilize pressure against a weak rush unit", () => {
    const result = resolve({
      defense: defensePlay({ family: "FIRE_ZONE", pressureCodes: ["MLB"] }),
      passBlocking: 92,
      passRush: 55,
      qbPocketPresence: 84,
      qbAwareness: 82,
    });

    expect(result.protectionAdvantage).toBeGreaterThan(10);
    expect(result.pressureLevel).toBeLessThan(0.35);
    expect(result.pocketStability).toBeGreaterThan(0.55);
  });

  it("lets weak OL struggle against an elite rush unit", () => {
    const result = resolve({
      defense: defensePlay({ family: "FIRE_ZONE", pressureCodes: ["MLB"] }),
      passBlocking: 55,
      passRush: 92,
      qbPocketPresence: 58,
      qbAwareness: 60,
    });

    expect(result.protectionAdvantage).toBeLessThan(-10);
    expect(result.pressureLevel).toBeGreaterThan(0.55);
    expect(result.pocketStability).toBeLessThan(0.25);
  });
});
