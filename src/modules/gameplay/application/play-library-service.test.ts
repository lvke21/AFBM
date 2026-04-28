import { describe, expect, it } from "vitest";

import { resolveCompetitionRuleProfile } from "../domain/competition-rules";
import type { CompetitionRuleset } from "../domain/competition-rules";
import type { GameSituationSnapshot } from "../domain/game-situation";
import {
  DEFENSIVE_PLAY_FAMILIES,
  DEFENSIVE_PLAY_FAMILY_GROUPS,
  OFFENSIVE_PLAY_FAMILY_GROUPS,
  OFFENSIVE_PLAY_FAMILIES,
  type DefensivePlayDefinition,
  type OffensivePlayDefinition,
  type PlayCallDefinition,
} from "../domain/play-library";
import type {
  PersonnelPackage,
  PlayerAlignmentSnapshot,
  PreSnapStructureSnapshot,
} from "../domain/pre-snap-structure";
import { buildDefaultPlaybook } from "../infrastructure";
import {
  DEFENSIVE_FAMILY_BLUEPRINTS,
  PLAY_LIBRARY_CATALOG,
} from "../infrastructure/play-library";
import { validatePreSnapStructure } from "./pre-snap-legality-engine";
import {
  buildPreSnapStructureForPlay,
  findPlayById,
  getSituationalPlayMatches,
  parseSerializedPlayLibraryCatalog,
  serializePlayLibraryCatalog,
  validatePlayDefinition,
  validatePlayLibraryCatalog,
} from "./play-library-service";

function createSituation(
  ruleset: CompetitionRuleset,
  overrides: Partial<GameSituationSnapshot> = {},
): GameSituationSnapshot {
  const profile = resolveCompetitionRuleProfile(ruleset);

  return {
    ruleset,
    hashMarkProfile: profile.hashMarks,
    quarter: 2,
    down: 1,
    yardsToGo: 10,
    ballOnYardLine: 50,
    distanceBucket: "MEDIUM",
    fieldZone: "MIDFIELD",
    clockBucket: "EARLY",
    scoreBucket: "TIED",
    offenseScore: 14,
    defenseScore: 14,
    secondsRemainingInQuarter: 600,
    secondsRemainingInGame: 2400,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
    tempoProfile: "NORMAL",
    possessionTeamId: "offense",
    defenseTeamId: "defense",
    ...overrides,
  };
}

function requirePlay(playId: string): PlayCallDefinition {
  const play = findPlayById(playId, PLAY_LIBRARY_CATALOG);

  if (!play) {
    throw new Error(`Missing play ${playId} in catalog`);
  }

  return play;
}

function requireOffensePlay(playId: string): OffensivePlayDefinition {
  const play = PLAY_LIBRARY_CATALOG.offensePlays.find((entry) => entry.id === playId);

  if (!play) {
    throw new Error(`Missing offense play ${playId} in catalog`);
  }

  return play;
}

function requireDefensePlay(playId: string): DefensivePlayDefinition {
  const play = PLAY_LIBRARY_CATALOG.defensePlays.find((entry) => entry.id === playId);

  if (!play) {
    throw new Error(`Missing defense play ${playId} in catalog`);
  }

  return play;
}

function listCatalogPlays(): PlayCallDefinition[] {
  return [
    ...PLAY_LIBRARY_CATALOG.offensePlays,
    ...PLAY_LIBRARY_CATALOG.defensePlays,
  ];
}

function incrementCount(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function expectedPersonnelCounts(personnel: PersonnelPackage): Record<string, number> {
  return Object.fromEntries(
    [...personnel.entries]
      .sort((left, right) => left.positionCode.localeCompare(right.positionCode))
      .map((entry) => [entry.positionCode, entry.quantity]),
  );
}

function resolveOffensePersonnelBucket(player: PlayerAlignmentSnapshot): string | null {
  switch (player.positionCode) {
    case "QB":
      return "QB";
    case "RB":
    case "HB":
    case "FB":
      return "RB";
    case "WR":
      return "WR";
    case "TE":
      return "TE";
    case "LT":
    case "LG":
    case "C":
    case "RG":
    case "RT":
    case "OL":
      return "OL";
    default:
      if (player.snapRole === "BACKFIELD_QB") {
        return "QB";
      }

      if (player.snapRole === "INTERIOR_LINE") {
        return "OL";
      }

      return null;
  }
}

function resolveDefensePersonnelBucket(player: PlayerAlignmentSnapshot): string | null {
  switch (player.positionCode) {
    case "LE":
    case "RE":
    case "DE":
    case "DT":
    case "NT":
    case "DL":
      return "DL";
    case "LB":
    case "MLB":
    case "ILB":
    case "OLB":
    case "LOLB":
    case "ROLB":
    case "SLB":
    case "WLB":
      return "LB";
    case "CB":
    case "DB":
    case "FS":
    case "SS":
    case "S":
    case "NB":
      return "DB";
    default:
      if (player.snapRole === "DEFENSIVE_FRONT") {
        return "DL";
      }

      if (player.snapRole === "DEFENSIVE_BOX") {
        return "LB";
      }

      if (player.snapRole === "DEFENSIVE_SECONDARY") {
        return "DB";
      }

      return null;
  }
}

function actualPersonnelCounts(
  side: "OFFENSE" | "DEFENSE",
  players: PlayerAlignmentSnapshot[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const player of players) {
    const bucket =
      side === "OFFENSE"
        ? resolveOffensePersonnelBucket(player)
        : resolveDefensePersonnelBucket(player);

    if (bucket) {
      incrementCount(counts, bucket);
    } else {
      incrementCount(counts, `UNRESOLVED:${player.positionCode}`);
    }
  }

  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function personnelCountComparison(
  snapshot: PreSnapStructureSnapshot,
  side: "OFFENSE" | "DEFENSE",
) {
  const personnel =
    side === "OFFENSE" ? snapshot.offensePersonnel : snapshot.defensePersonnel;
  const players = side === "OFFENSE" ? snapshot.offensePlayers : snapshot.defensePlayers;

  return {
    personnelId: personnel.id,
    expected: expectedPersonnelCounts(personnel),
    actual: actualPersonnelCounts(side, players),
  };
}

function collectStringContentIssues(
  value: unknown,
  path: string,
  issues: { empty: string[]; placeholder: string[] },
): void {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      issues.empty.push(path);
    }

    if (/^(todo|tbd|dummy|placeholder)$/i.test(trimmed)) {
      issues.placeholder.push(path);
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectStringContentIssues(entry, `${path}[${index}]`, issues),
    );
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) =>
      collectStringContentIssues(entry, `${path}.${key}`, issues),
    );
  }
}

function buildSemanticPlaySignature(play: PlayCallDefinition): string {
  return JSON.stringify({
    side: play.side,
    family: play.family,
    variantGroupId: play.variantGroupId ?? null,
    packageTags: play.packageTags ? [...play.packageTags].sort() : [],
    supportedRulesets: [...play.supportedRulesets].sort(),
    situationTags: [...play.situationTags].sort(),
    triggers: play.triggers
      .map((trigger) => ({
        id: trigger.id,
        label: trigger.label,
        priority: trigger.priority,
        filter: {
          rulesets: [...(trigger.filter.rulesets ?? [])].sort(),
          downs: [...(trigger.filter.downs ?? [])].sort(),
          distanceBuckets: [...(trigger.filter.distanceBuckets ?? [])].sort(),
          fieldZones: [...(trigger.filter.fieldZones ?? [])].sort(),
          clockBuckets: [...(trigger.filter.clockBuckets ?? [])].sort(),
          scoreBuckets: [...(trigger.filter.scoreBuckets ?? [])].sort(),
          tempoProfiles: [...(trigger.filter.tempoProfiles ?? [])].sort(),
          personnelPackages: [...(trigger.filter.personnelPackages ?? [])].sort(),
        },
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    reads: play.reads.map((read) => ({
      id: read.id,
      order: read.order,
      label: read.label,
      type: read.type,
      actorRoleId: read.actorRoleId,
      description: read.description,
    })),
    assignments: play.assignments
      .map((assignment) => ({
        roleId: assignment.roleId,
        positionCodes: [...assignment.positionCodes].sort(),
        assignmentType: assignment.assignmentType,
        responsibility: assignment.responsibility,
        landmark: assignment.landmark,
        readId: assignment.readId,
      }))
      .sort((left, right) => left.roleId.localeCompare(right.roleId)),
    structure:
      play.side === "OFFENSE"
        ? {
            formationFamilyId: play.structure.formationFamilyId,
            personnelPackageId: play.structure.personnelPackageId,
            conceptFamilyId: play.structure.conceptFamilyId,
            motionFamilyIds: [...play.structure.motionFamilyIds].sort(),
            protectionFamilyId: play.structure.protectionFamilyId,
          }
        : {
            formationFamilyId: play.structure.formationFamilyId,
            personnelPackageId: play.structure.personnelPackageId,
            frontFamilyId: play.structure.frontFamilyId,
            coverageFamilyId: play.structure.coverageFamilyId,
            pressureFamilyId: play.structure.pressureFamilyId,
            coverageShell: play.structure.coverageShell,
            pressurePresentation: play.structure.pressurePresentation,
            defensiveConceptTag: play.structure.defensiveConceptTag ?? null,
          },
    expectedMetrics: play.expectedMetrics,
  });
}

describe("play library service", () => {
  it("validates the shipped play library catalog end-to-end", () => {
    const validation = validatePlayLibraryCatalog(PLAY_LIBRARY_CATALOG);
    const totalPlays =
      PLAY_LIBRARY_CATALOG.offensePlays.length + PLAY_LIBRARY_CATALOG.defensePlays.length;

    expect(validation.isValid).toBe(true);
    expect(validation.issues).toHaveLength(0);
    expect(validation.playResults).toHaveLength(totalPlays);
    expect(validation.playResults.every((result) => result.isValid)).toBe(true);
  });

  it("serializes and parses the catalog as JSON-compatible configuration", () => {
    const serialized = serializePlayLibraryCatalog(PLAY_LIBRARY_CATALOG);
    const parsed = parseSerializedPlayLibraryCatalog(serialized);

    expect(serialized).toContain("\"off-zone-inside-split\"");
    expect(parsed.offensePlays).toHaveLength(PLAY_LIBRARY_CATALOG.offensePlays.length);
    expect(parsed.defensePlays).toHaveLength(PLAY_LIBRARY_CATALOG.defensePlays.length);
  });

  it("rejects missing required play fields", () => {
    const malformedPlay = {
      id: "broken-play",
      side: "OFFENSE",
      family: "ZONE_RUN",
      triggers: [],
      assignments: [],
      expectedMetrics: null,
      structure: null,
      legalityTemplate: null,
      supportedRulesets: [],
      situationTags: [],
    };
    const validation = validatePlayDefinition(malformedPlay, PLAY_LIBRARY_CATALOG);

    expect(validation.isValid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "MISSING_LABEL",
        "MISSING_SUPPORTED_RULESETS",
        "MISSING_SITUATION_TAGS",
        "MISSING_TRIGGERS",
        "MISSING_READS",
        "MISSING_ASSIGNMENTS",
        "MISSING_COUNTERS",
        "MISSING_AUDIBLES",
        "MISSING_EXPECTED_METRICS",
        "MISSING_STRUCTURE",
        "MISSING_LEGALITY_TEMPLATE",
      ]),
    );
  });

  it("rejects illegal offensive and defensive structure combinations", () => {
    const invalidOffense = {
      ...requirePlay("off-zone-inside-split"),
      structure: {
        ...requirePlay("off-zone-inside-split").structure,
        conceptFamilyId: "concept-screen",
      },
    };
    const invalidDefense = {
      ...requirePlay("def-zero-double-a-pressure"),
      structure: {
        ...requirePlay("def-zero-double-a-pressure").structure,
        coverageShell: "TWO_HIGH",
      },
    };
    const offenseValidation = validatePlayDefinition(
      invalidOffense,
      PLAY_LIBRARY_CATALOG,
    );
    const defenseValidation = validatePlayDefinition(
      invalidDefense,
      PLAY_LIBRARY_CATALOG,
    );

    expect(offenseValidation.isValid).toBe(false);
    expect(offenseValidation.issues.map((issue) => issue.code)).toContain(
      "FAMILY_STRUCTURE_MISMATCH",
    );
    expect(defenseValidation.isValid).toBe(false);
    expect(defenseValidation.issues.map((issue) => issue.code)).toContain(
      "PRESSURE_SHELL_MISMATCH",
    );
  });

  it("rejects broken audible and read references", () => {
    const basePlay = requirePlay("off-quick-stick-spacing");
    const invalidPlay = {
      ...basePlay,
      assignments: basePlay.assignments.map((assignment, index) =>
        index === 0 ? { ...assignment, readId: "missing-read" } : assignment,
      ),
      audibles: basePlay.audibles.map((audible, index) =>
        index === 0 ? { ...audible, triggerId: "missing-trigger" } : audible,
      ),
    };
    const validation = validatePlayDefinition(invalidPlay, PLAY_LIBRARY_CATALOG);

    expect(validation.isValid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["INVALID_READ_REFERENCE", "INVALID_TRIGGER_REFERENCE"]),
    );
  });

  it("builds legality-compatible pre-snap snapshots for representative offense and defense plays", () => {
    const offensePlay = requirePlay("off-rpo-glance-bubble");
    const defensePlay = requirePlay("def-red-zone-bracket-goal-line");
    const offenseSnapshot = buildPreSnapStructureForPlay(
      offensePlay,
      createSituation("NFL_PRO"),
    );
    const defenseSnapshot = buildPreSnapStructureForPlay(
      defensePlay,
      createSituation("COLLEGE", {
        down: 2,
        yardsToGo: 3,
        distanceBucket: "SHORT",
        fieldZone: "GOAL_TO_GO",
        ballOnYardLine: 97,
      }),
    );

    expect(validatePreSnapStructure(offenseSnapshot).isLegal).toBe(true);
    expect(validatePreSnapStructure(defenseSnapshot).isLegal).toBe(true);
  });

  it("builds fresh pre-snap snapshots so caller mutations cannot alter catalog templates", () => {
    const play = requirePlay("off-empty-choice");
    const firstSnapshot = buildPreSnapStructureForPlay(
      play,
      createSituation("NFL_PRO"),
    );
    const originalPosition = firstSnapshot.offensePlayers[0]?.positionCode;

    if (!firstSnapshot.offensePlayers[0] || !originalPosition) {
      throw new Error("Expected an offensive player in the empty snapshot");
    }

    firstSnapshot.offensePlayers[0].positionCode = "TE";

    const secondSnapshot = buildPreSnapStructureForPlay(
      play,
      createSituation("NFL_PRO"),
    );

    expect(secondSnapshot.offensePlayers[0]?.positionCode).toBe(originalPosition);
    expect(validatePreSnapStructure(secondSnapshot).isLegal).toBe(true);
  });

  it("validates builder personnel counts for the known regression structures", () => {
    const checks: Array<{
      playId: string;
      ruleset: CompetitionRuleset;
      side: "OFFENSE" | "DEFENSE";
      expectedPersonnelId: string;
    }> = [
      {
        playId: "off-rpo-glance-bubble",
        ruleset: "NFL_PRO",
        side: "OFFENSE",
        expectedPersonnelId: "off-11",
      },
      {
        playId: "off-quick-slant-flat",
        ruleset: "NFL_PRO",
        side: "OFFENSE",
        expectedPersonnelId: "off-11",
      },
      {
        playId: "off-screen-wr-tunnel",
        ruleset: "NFL_PRO",
        side: "OFFENSE",
        expectedPersonnelId: "off-11",
      },
      {
        playId: "def-fire-zone-boundary",
        ruleset: "NFL_PRO",
        side: "DEFENSE",
        expectedPersonnelId: "def-nickel-335",
      },
      {
        playId: "def-match-palms-read",
        ruleset: "NFL_PRO",
        side: "DEFENSE",
        expectedPersonnelId: "def-nickel-335",
      },
      {
        playId: "def-zone-cover-6-boundary-cloud",
        ruleset: "NFL_PRO",
        side: "DEFENSE",
        expectedPersonnelId: "def-nickel-335",
      },
      {
        playId: "def-sim-double-mug-robber",
        ruleset: "NFL_PRO",
        side: "DEFENSE",
        expectedPersonnelId: "def-nickel-335",
      },
      {
        playId: "def-drop8-tampa-fence",
        ruleset: "NFL_PRO",
        side: "DEFENSE",
        expectedPersonnelId: "def-nickel-335",
      },
      {
        playId: "def-bracket-palms-cut",
        ruleset: "NFL_PRO",
        side: "DEFENSE",
        expectedPersonnelId: "def-nickel-335",
      },
      {
        playId: "def-three-high-middle-poach",
        ruleset: "COLLEGE",
        side: "DEFENSE",
        expectedPersonnelId: "def-nickel-335",
      },
      {
        playId: "def-zero-nickel-overload",
        ruleset: "NFL_PRO",
        side: "DEFENSE",
        expectedPersonnelId: "def-bear-515",
      },
      {
        playId: "def-run-blitz-bear-plug",
        ruleset: "NFL_PRO",
        side: "DEFENSE",
        expectedPersonnelId: "def-bear-515",
      },
    ];

    const failures = checks.flatMap((check) => {
      const snapshot = buildPreSnapStructureForPlay(
        requirePlay(check.playId),
        createSituation(check.ruleset),
      );
      const comparison = personnelCountComparison(snapshot, check.side);
      const countsMatch =
        JSON.stringify(comparison.expected) === JSON.stringify(comparison.actual);

      return comparison.personnelId === check.expectedPersonnelId && countsMatch
        ? []
        : [
            {
              playId: check.playId,
              side: check.side,
              expectedPersonnelId: check.expectedPersonnelId,
              ...comparison,
            },
          ];
    });

    expect(failures).toEqual([]);
  });

  it("matches offensive and defensive plays by situation and trigger priority", () => {
    const offenseMatches = getSituationalPlayMatches({
      side: "OFFENSE",
      situation: createSituation("NFL_PRO", {
        down: 1,
        yardsToGo: 6,
        distanceBucket: "MEDIUM",
        fieldZone: "MIDFIELD",
      }),
    });
    const defenseMatches = getSituationalPlayMatches({
      side: "DEFENSE",
      situation: createSituation("COLLEGE", {
        down: 2,
        yardsToGo: 2,
        distanceBucket: "SHORT",
        fieldZone: "GOAL_TO_GO",
        ballOnYardLine: 97,
      }),
    });

    expect(offenseMatches[0]?.play.id).toBe("off-rpo-glance-bubble");
    expect(offenseMatches.map((match) => match.play.id)).toContain(
      "off-zone-inside-split",
    );
    expect(defenseMatches[0]?.play.id).toBe("def-red-zone-bracket-goal-line");
    expect(defenseMatches[0]?.matchedTriggerIds).toContain(
      "red-zone-package-window",
    );
  });

  it("preserves optional taxonomy metadata without breaking validation or serialization", () => {
    const baseOffensePlay = requireOffensePlay("off-zone-inside-split");
    const baseDefensePlay = requireDefensePlay("def-match-quarters-poach");
    const enrichedOffensePlay = {
      ...baseOffensePlay,
      variantGroupId: "zone-core",
      packageTags: ["RUN_CORE", "CONDENSED"],
    };
    const enrichedDefensePlay = {
      ...baseDefensePlay,
      packageTags: ["SPLIT_SAFETY", "PASSING_DOWN"],
      structure: {
        ...baseDefensePlay.structure,
        defensiveConceptTag: "QUARTERS_POACH",
      },
    };
    const enrichedCatalog = {
      ...PLAY_LIBRARY_CATALOG,
      offensePlays: PLAY_LIBRARY_CATALOG.offensePlays.map((play) =>
        play.id === enrichedOffensePlay.id ? enrichedOffensePlay : play,
      ),
      defensePlays: PLAY_LIBRARY_CATALOG.defensePlays.map((play) =>
        play.id === enrichedDefensePlay.id ? enrichedDefensePlay : play,
      ),
    };
    const offenseValidation = validatePlayDefinition(
      enrichedOffensePlay,
      enrichedCatalog,
    );
    const defenseValidation = validatePlayDefinition(
      enrichedDefensePlay,
      enrichedCatalog,
    );
    const reparsedCatalog = parseSerializedPlayLibraryCatalog(
      serializePlayLibraryCatalog(enrichedCatalog),
    );
    const reparsedOffensePlay = findPlayById(
      enrichedOffensePlay.id,
      reparsedCatalog,
    );
    const reparsedDefensePlay = findPlayById(
      enrichedDefensePlay.id,
      reparsedCatalog,
    );

    expect(offenseValidation.isValid).toBe(true);
    expect(defenseValidation.isValid).toBe(true);
    expect(reparsedOffensePlay?.variantGroupId).toBe("zone-core");
    expect(reparsedOffensePlay?.packageTags).toEqual(
      expect.arrayContaining(["RUN_CORE", "CONDENSED"]),
    );
    expect(reparsedDefensePlay?.packageTags).toEqual(
      expect.arrayContaining(["SPLIT_SAFETY", "PASSING_DOWN"]),
    );
    expect(
      reparsedDefensePlay?.side === "DEFENSE"
        ? reparsedDefensePlay.structure.defensiveConceptTag
        : null,
    ).toBe("QUARTERS_POACH");
  });

  it("ships structured offense family scaffolds and wires them into the default playbooks", () => {
    const defaultPlaybook = buildDefaultPlaybook({
      teamId: "TEAM-A",
      ruleset: "NFL_PRO",
    });

    expect(OFFENSIVE_PLAY_FAMILY_GROUPS.RUN).toEqual(
      expect.arrayContaining(["ZONE_RUN", "GAP_RUN", "DESIGNED_QB_RUN"]),
    );
    expect(OFFENSIVE_PLAY_FAMILY_GROUPS.PASS).toEqual(
      expect.arrayContaining([
        "QUICK_PASS",
        "DROPBACK",
        "PLAY_ACTION",
        "MOVEMENT_PASS",
        "SCREEN",
        "EMPTY_TEMPO",
      ]),
    );
    expect(OFFENSIVE_PLAY_FAMILY_GROUPS.RPO).toEqual(["OPTION_RPO"]);
    expect(
      PLAY_LIBRARY_CATALOG.offensiveConceptFamilies,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "concept-designed-qb-run",
          family: "DESIGNED_QB_RUN",
        }),
        expect.objectContaining({
          id: "concept-movement-pass",
          family: "MOVEMENT_PASS",
        }),
        expect.objectContaining({
          id: "concept-empty-tempo",
          family: "EMPTY_TEMPO",
        }),
      ]),
    );
    expect(
      defaultPlaybook.offensePolicies.some((policy) =>
        policy.candidates.some(
          (candidate) => candidate.referenceId === "DESIGNED_QB_RUN",
        ),
      ),
    ).toBe(true);
    expect(
      defaultPlaybook.offensePolicies.some((policy) =>
        policy.candidates.some(
          (candidate) => candidate.referenceId === "MOVEMENT_PASS",
        ),
      ),
    ).toBe(true);
    expect(
      defaultPlaybook.offensePolicies.some((policy) =>
        policy.candidates.some(
          (candidate) => candidate.referenceId === "EMPTY_TEMPO",
        ),
      ),
    ).toBe(true);
    expect(
      PLAY_LIBRARY_CATALOG.offensePlays.some((play) =>
        [
          "DESIGNED_QB_RUN",
          "MOVEMENT_PASS",
          "EMPTY_TEMPO",
        ].includes(play.family),
      ),
    ).toBe(true);
  });

  it("ships structured defense family scaffolds across coverages, pressures, fronts, and playbooks", () => {
    const defaultPlaybook = buildDefaultPlaybook({
      teamId: "TEAM-A",
      ruleset: "NFL_PRO",
    });

    expect(DEFENSIVE_PLAY_FAMILY_GROUPS.COVERAGE).toEqual(
      expect.arrayContaining([
        "MATCH_COVERAGE",
        "ZONE_COVERAGE",
        "MAN_COVERAGE",
        "BRACKET_SPECIALTY",
      ]),
    );
    expect(DEFENSIVE_PLAY_FAMILY_GROUPS.PRESSURE).toEqual(
      expect.arrayContaining([
        "ZERO_PRESSURE",
        "FIRE_ZONE",
        "SIMULATED_PRESSURE",
        "RUN_BLITZ",
      ]),
    );
    expect(DEFENSIVE_PLAY_FAMILY_GROUPS.STRUCTURE).toEqual(
      expect.arrayContaining([
        "DROP_EIGHT",
        "THREE_HIGH_PACKAGE",
        "RED_ZONE_PACKAGE",
      ]),
    );
    expect(DEFENSIVE_FAMILY_BLUEPRINTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          family: "DROP_EIGHT",
          bucket: "STRUCTURE",
          frontFamilyIds: expect.arrayContaining(["front-tite", "front-okie"]),
          coverageFamilyIds: expect.arrayContaining([
            "coverage-cover-6",
            "coverage-palms-c7",
          ]),
        }),
        expect.objectContaining({
          family: "RUN_BLITZ",
          bucket: "PRESSURE",
          pressureFamilyIds: expect.arrayContaining([
            "pressure-cross-dog",
            "pressure-bear-plug",
          ]),
        }),
        expect.objectContaining({
          family: "BRACKET_SPECIALTY",
          bucket: "COVERAGE",
          coverageFamilyIds: expect.arrayContaining(["coverage-red-zone-bracket"]),
        }),
        expect.objectContaining({
          family: "THREE_HIGH_PACKAGE",
          bucket: "STRUCTURE",
          frontFamilyIds: expect.arrayContaining(["front-tite", "front-okie"]),
        }),
      ]),
    );
    expect(
      defaultPlaybook.defensePolicies.some((policy) =>
        policy.candidates.some((candidate) => candidate.referenceId === "DROP_EIGHT"),
      ),
    ).toBe(true);
    expect(
      defaultPlaybook.defensePolicies.some((policy) =>
        policy.candidates.some((candidate) => candidate.referenceId === "RUN_BLITZ"),
      ),
    ).toBe(true);
    expect(
      defaultPlaybook.defensePolicies.some((policy) =>
        policy.candidates.some((candidate) => candidate.referenceId === "BRACKET_SPECIALTY"),
      ),
    ).toBe(true);
    expect(
      defaultPlaybook.defensePolicies.some((policy) =>
        policy.candidates.some(
          (candidate) => candidate.referenceId === "THREE_HIGH_PACKAGE",
        ),
      ),
    ).toBe(true);
  });

  it("ships a materially expanded offense library with depth across every family", () => {
    const offenseFamilyCounts = Object.fromEntries(
      OFFENSIVE_PLAY_FAMILIES.map((family) => [
        family,
        PLAY_LIBRARY_CATALOG.offensePlays.filter((play) => play.family === family).length,
      ]),
    ) as Record<(typeof OFFENSIVE_PLAY_FAMILIES)[number], number>;

    expect(PLAY_LIBRARY_CATALOG.offensePlays.length).toBeGreaterThanOrEqual(28);
    expect(
      Object.values(offenseFamilyCounts).every((count) => count >= 2),
    ).toBe(true);
    expect(offenseFamilyCounts.ZONE_RUN).toBeGreaterThanOrEqual(3);
    expect(offenseFamilyCounts.GAP_RUN).toBeGreaterThanOrEqual(3);
    expect(offenseFamilyCounts.OPTION_RPO).toBeGreaterThanOrEqual(3);
    expect(offenseFamilyCounts.QUICK_PASS).toBeGreaterThanOrEqual(4);
    expect(offenseFamilyCounts.DROPBACK).toBeGreaterThanOrEqual(4);
    expect(offenseFamilyCounts.PLAY_ACTION).toBeGreaterThanOrEqual(3);
    expect(offenseFamilyCounts.SCREEN).toBeGreaterThanOrEqual(3);
  });

  it("ships a materially expanded defense library with valid depth across every family", () => {
    const defenseFamilyCounts = Object.fromEntries(
      DEFENSIVE_PLAY_FAMILIES.map((family) => [
        family,
        PLAY_LIBRARY_CATALOG.defensePlays.filter((play) => play.family === family).length,
      ]),
    ) as Record<(typeof DEFENSIVE_PLAY_FAMILIES)[number], number>;

    expect(PLAY_LIBRARY_CATALOG.defensePlays.length).toBeGreaterThanOrEqual(26);
    expect(
      Object.values(defenseFamilyCounts).every((count) => count >= 2),
    ).toBe(true);
    expect(defenseFamilyCounts.MATCH_COVERAGE).toBeGreaterThanOrEqual(3);
    expect(defenseFamilyCounts.ZONE_COVERAGE).toBeGreaterThanOrEqual(3);
    expect(defenseFamilyCounts.MAN_COVERAGE).toBeGreaterThanOrEqual(3);
    expect(defenseFamilyCounts.FIRE_ZONE).toBeGreaterThanOrEqual(3);
    expect(defenseFamilyCounts.RED_ZONE_PACKAGE).toBeGreaterThanOrEqual(2);
  });

  it("ships fully populated play definitions without empty content or placeholders", () => {
    const plays = listCatalogPlays();
    const missingRequiredFields: string[] = [];
    const stringIssues = {
      empty: [] as string[],
      placeholder: [] as string[],
    };

    for (const play of plays) {
      if (!Array.isArray(play.reads) || play.reads.length === 0) {
        missingRequiredFields.push(`${play.id}:reads`);
      }

      if (!Array.isArray(play.counters)) {
        missingRequiredFields.push(`${play.id}:counters`);
      }

      if (!Array.isArray(play.audibles)) {
        missingRequiredFields.push(`${play.id}:audibles`);
      }

      collectStringContentIssues(play, play.id, stringIssues);
    }

    expect(missingRequiredFields).toEqual([]);
    expect(stringIssues.empty).toEqual([]);
    expect(stringIssues.placeholder).toEqual([]);
  });

  it("does not ship duplicate play definitions without meaningful structural differences", () => {
    const duplicateGroups = Array.from(
      listCatalogPlays().reduce((groups, play) => {
        const signature = buildSemanticPlaySignature(play);
        const existing = groups.get(signature) ?? [];

        existing.push(play.id);
        groups.set(signature, existing);

        return groups;
      }, new Map<string, string[]>()),
    )
      .map(([, playIds]) => playIds)
      .filter((playIds) => playIds.length > 1);

    expect(duplicateGroups).toEqual([]);
  });
});
