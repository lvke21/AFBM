import { describe, expect, it } from "vitest";

import { resolveCompetitionRuleProfile } from "../domain/competition-rules";
import type { CompetitionRuleset } from "../domain/competition-rules";
import type { GameSituationSnapshot } from "../domain/game-situation";
import type { Playbook } from "../domain/playbook";
import type {
  DefensivePlayDefinition,
  OffensivePlayDefinition,
} from "../domain/play-library";
import type {
  PlaySelectionContext,
  SideSelectionTrace,
} from "../domain/play-selection";
import { PLAY_LIBRARY_CATALOG, buildDefaultPlaybook } from "../infrastructure";
import { buildPreSnapStructureForPlay } from "./play-library-service";
import {
  DefaultPlaySelectionEngine,
  classifySelectionSituation,
  createSelectionStrategyProfile,
} from "./play-selection-engine";

const BATCH_DISTRIBUTION_TIMEOUT_MS = 15_000;

function requireOffensePlay(playId: string): OffensivePlayDefinition {
  const play = PLAY_LIBRARY_CATALOG.offensePlays.find((entry) => entry.id === playId);

  if (!play) {
    throw new Error(`Missing offense play ${playId}`);
  }

  return play;
}

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
    clockBucket: "MIDDLE",
    scoreBucket: "TIED",
    offenseScore: 14,
    defenseScore: 14,
    secondsRemainingInQuarter: 540,
    secondsRemainingInGame: 1980,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
    tempoProfile: "NORMAL",
    possessionTeamId: "offense",
    defenseTeamId: "defense",
    ...overrides,
  };
}

function createContext(
  overrides: Omit<Partial<PlaySelectionContext>, "situation"> & {
    situation?: Partial<GameSituationSnapshot>;
  } = {},
): PlaySelectionContext {
  const { situation: situationOverrides, ...restOverrides } = overrides;
  const ruleset = situationOverrides?.ruleset ?? "NFL_PRO";
  const situation = createSituation(ruleset, situationOverrides);
  const offensePlaybook = buildDefaultPlaybook({
    teamId: "TEAM-A",
    ruleset,
  });
  const defensePlaybook = buildDefaultPlaybook({
    teamId: "TEAM-B",
    ruleset,
  });
  const basePreSnap = buildPreSnapStructureForPlay(
    requireOffensePlay("off-zone-inside-split"),
    situation,
  );

  return {
    preSnapStructure: basePreSnap,
    offensePlaybook,
    defensePlaybook,
    offenseCandidates: PLAY_LIBRARY_CATALOG.offensePlays,
    defenseCandidates: PLAY_LIBRARY_CATALOG.defensePlays,
    offenseFatigueMultiplier: 1,
    defenseFatigueMultiplier: 1,
    offenseProfile: createSelectionStrategyProfile({
      side: "OFFENSE",
      mode: "BALANCED",
      schemeCode: "BALANCED_OFFENSE",
    }),
    defenseProfile: createSelectionStrategyProfile({
      side: "DEFENSE",
      mode: "BALANCED",
      schemeCode: "FOUR_THREE_FRONT",
    }),
    selectionSeed: "play-selection-test",
    ...restOverrides,
    situation,
  };
}

function candidateProbability<T extends OffensivePlayDefinition | DefensivePlayDefinition>(
  trace: SideSelectionTrace<T>,
  playId: string,
) {
  return (
    trace.evaluatedCandidates.find((candidate) => candidate.play.id === playId)
      ?.selectionProbability ?? 0
  );
}

function combinedProbability<T extends OffensivePlayDefinition | DefensivePlayDefinition>(
  trace: SideSelectionTrace<T>,
  predicate: (playId: string) => boolean,
) {
  return trace.evaluatedCandidates
    .filter((candidate) => predicate(candidate.play.id))
    .reduce((sum, candidate) => sum + candidate.selectionProbability, 0);
}

function combinedFamilyProbability<T extends OffensivePlayDefinition | DefensivePlayDefinition>(
  trace: SideSelectionTrace<T>,
  families: string[],
) {
  return trace.evaluatedCandidates
    .filter((candidate) => families.includes(candidate.play.family))
    .reduce((sum, candidate) => sum + candidate.selectionProbability, 0);
}

describe("play selection engine", () => {
  it("handles 1st & 10 neutral situations with legal, explainable menus", () => {
    const engine = new DefaultPlaySelectionEngine();
    const result = engine.select(
      createContext({
        situation: {
          down: 1,
          yardsToGo: 10,
          distanceBucket: "MEDIUM",
          fieldZone: "MIDFIELD",
          clockBucket: "MIDDLE",
        },
        selectionSeed: "neutral-1st-and-10",
      }),
    );

    expect(["ZONE_RUN", "GAP_RUN", "OPTION_RPO"]).toContain(result.offense.play.family);
    expect(
      [
        "MATCH_COVERAGE",
        "ZONE_COVERAGE",
        "SIMULATED_PRESSURE",
        "THREE_HIGH_PACKAGE",
        "RUN_BLITZ",
      ].includes(result.defense.play.family),
    ).toBe(true);
    expect(result.trace.offense.contextPreSnapLegal).toBe(true);
    expect(result.trace.offense.evaluatedCandidates.length).toBeGreaterThan(3);
    expect(
      result.trace.offense.evaluatedCandidates.reduce(
        (sum, candidate) => sum + candidate.selectionProbability,
        0,
      ),
    ).toBeCloseTo(1, 5);
    expect(
      combinedFamilyProbability(result.trace.offense, [
        "ZONE_RUN",
        "GAP_RUN",
        "OPTION_RPO",
      ]),
    ).toBeGreaterThan(0.5);
  });

  it("boosts shot or breaker concepts on 2nd & short", () => {
    const engine = new DefaultPlaySelectionEngine();
    const neutral = engine.select(
      createContext({
        situation: {
          down: 1,
          yardsToGo: 10,
          distanceBucket: "MEDIUM",
          fieldZone: "MIDFIELD",
        },
        selectionSeed: "neutral-shot-baseline",
      }),
    );
    const shotWindow = engine.select(
      createContext({
        situation: {
          down: 2,
          yardsToGo: 2,
          distanceBucket: "SHORT",
          fieldZone: "MIDFIELD",
        },
        selectionSeed: "shot-window",
      }),
    );
    const neutralShot = combinedFamilyProbability(neutral.trace.offense, [
      "DROPBACK",
      "PLAY_ACTION",
      "MOVEMENT_PASS",
      "OPTION_RPO",
    ]);
    const breakerShot = combinedFamilyProbability(shotWindow.trace.offense, [
      "DROPBACK",
      "PLAY_ACTION",
      "MOVEMENT_PASS",
      "OPTION_RPO",
    ]);

    expect(breakerShot).toBeGreaterThan(neutralShot);
    expect(
      ["DROPBACK", "PLAY_ACTION", "MOVEMENT_PASS", "OPTION_RPO"].includes(
        shotWindow.offense.play.family,
      ),
    ).toBe(true);
  });

  it("changes the 3rd-down menu for short, medium and long situations", () => {
    const engine = new DefaultPlaySelectionEngine();
    const thirdShort = engine.select(
      createContext({
        situation: {
          down: 3,
          yardsToGo: 2,
          distanceBucket: "SHORT",
          fieldZone: "MIDFIELD",
        },
        selectionSeed: "third-short",
      }),
    );
    const thirdMedium = engine.select(
      createContext({
        situation: {
          down: 3,
          yardsToGo: 6,
          distanceBucket: "MEDIUM",
          fieldZone: "MIDFIELD",
        },
        selectionSeed: "third-medium",
      }),
    );
    const thirdLong = engine.select(
      createContext({
        situation: {
          down: 3,
          yardsToGo: 11,
          distanceBucket: "LONG",
          fieldZone: "MIDFIELD",
        },
        selectionSeed: "third-long",
      }),
    );

    expect(
      combinedFamilyProbability(thirdShort.trace.offense, [
        "ZONE_RUN",
        "GAP_RUN",
        "DESIGNED_QB_RUN",
        "OPTION_RPO",
        "QUICK_PASS",
      ]),
    ).toBeGreaterThan(0.55);
    expect(
      combinedFamilyProbability(thirdMedium.trace.offense, [
        "QUICK_PASS",
        "DROPBACK",
        "SCREEN",
        "MOVEMENT_PASS",
        "EMPTY_TEMPO",
      ]),
    ).toBeGreaterThan(0.55);
    expect(
      combinedFamilyProbability(thirdLong.trace.offense, [
        "QUICK_PASS",
        "DROPBACK",
        "SCREEN",
        "MOVEMENT_PASS",
        "EMPTY_TEMPO",
      ]),
    ).toBeGreaterThan(0.7);
    expect(
      combinedFamilyProbability(thirdLong.trace.defense, [
        "MAN_COVERAGE",
        "FIRE_ZONE",
        "SIMULATED_PRESSURE",
        "ZERO_PRESSURE",
        "DROP_EIGHT",
        "BRACKET_SPECIALTY",
        "THREE_HIGH_PACKAGE",
      ]),
    ).toBeGreaterThan(0.75);
  });

  it("prioritizes red-zone offense and dedicated red-zone defense packages", () => {
    const engine = new DefaultPlaySelectionEngine();
    const result = engine.select(
      createContext({
        situation: {
          down: 2,
          yardsToGo: 6,
          distanceBucket: "MEDIUM",
          fieldZone: "LOW_RED_ZONE",
          ballOnYardLine: 92,
        },
        selectionSeed: "red-zone",
      }),
    );

    expect(
      combinedFamilyProbability(result.trace.offense, [
        "GAP_RUN",
        "QUICK_PASS",
        "PLAY_ACTION",
        "ZONE_RUN",
        "DESIGNED_QB_RUN",
        "MOVEMENT_PASS",
      ]),
    ).toBeGreaterThan(0.6);
    expect(result.trace.defense.evaluatedCandidates[0]?.play.family).toBe(
      "RED_ZONE_PACKAGE",
    );
  });

  it("identifies four-down territory and rewards keep-live calls", () => {
    const situation = createSituation("NFL_PRO", {
      down: 3,
      yardsToGo: 3,
      distanceBucket: "SHORT",
      fieldZone: "PLUS_TERRITORY",
      ballOnYardLine: 62,
      clockBucket: "LATE",
      offenseScore: 20,
      defenseScore: 23,
      secondsRemainingInGame: 250,
      offenseTimeouts: 1,
    });
    const conservativeProfile = createSelectionStrategyProfile({
      side: "OFFENSE",
      mode: "CONSERVATIVE",
      schemeCode: "BALANCED_OFFENSE",
    });
    const aggressiveProfile = createSelectionStrategyProfile({
      side: "OFFENSE",
      mode: "AGGRESSIVE",
      schemeCode: "BALANCED_OFFENSE",
    });
    const conservative = new DefaultPlaySelectionEngine().select(
      createContext({
        situation,
        offenseProfile: conservativeProfile,
        selectionSeed: "four-down-conservative",
      }),
    );
    const aggressive = new DefaultPlaySelectionEngine().select(
      createContext({
        situation,
        offenseProfile: aggressiveProfile,
        selectionSeed: "four-down-aggressive",
      }),
    );

    expect(
      classifySelectionSituation({
        side: "OFFENSE",
        situation,
      }).isFourDownTerritory,
    ).toBe(true);
    expect(
      combinedProbability(aggressive.trace.offense, (playId) =>
        ["off-rpo-glance-bubble", "off-quick-stick-spacing", "off-gap-counter-gt"].includes(
          playId,
        ),
      ),
    ).toBeGreaterThan(
      combinedProbability(conservative.trace.offense, (playId) =>
        ["off-rpo-glance-bubble", "off-quick-stick-spacing", "off-gap-counter-gt"].includes(
          playId,
        ),
      ),
    );
  });

  it("leans into quick-game and dropback answers in two-minute drill", () => {
    const engine = new DefaultPlaySelectionEngine();
    const result = engine.select(
      createContext({
        situation: {
          quarter: 4,
          down: 2,
          yardsToGo: 8,
          distanceBucket: "MEDIUM",
          fieldZone: "PLUS_TERRITORY",
          ballOnYardLine: 64,
          clockBucket: "TWO_MINUTE",
          scoreBucket: "TRAILING",
          offenseScore: 24,
          defenseScore: 28,
          secondsRemainingInQuarter: 92,
          secondsRemainingInGame: 92,
          offenseTimeouts: 1,
          tempoProfile: "TWO_MINUTE",
        },
        selectionSeed: "two-minute",
      }),
    );

    expect(
      combinedFamilyProbability(result.trace.offense, [
        "QUICK_PASS",
        "DROPBACK",
        "SCREEN",
        "MOVEMENT_PASS",
        "EMPTY_TEMPO",
      ]),
    ).toBeGreaterThan(0.7);
    expect(
      combinedFamilyProbability(result.trace.defense, [
        "ZONE_COVERAGE",
        "THREE_HIGH_PACKAGE",
        "DROP_EIGHT",
        "MAN_COVERAGE",
        "BRACKET_SPECIALTY",
        "SIMULATED_PRESSURE",
      ]),
    ).toBeGreaterThan(0.8);
  });

  it("shifts risk appetite between conservative and aggressive profiles", () => {
    const situation = createSituation("NFL_PRO", {
      down: 2,
      yardsToGo: 2,
      distanceBucket: "SHORT",
      fieldZone: "MIDFIELD",
    });
    const conservative = new DefaultPlaySelectionEngine().select(
      createContext({
        situation,
        offenseProfile: createSelectionStrategyProfile({
          side: "OFFENSE",
          mode: "CONSERVATIVE",
          schemeCode: "BALANCED_OFFENSE",
        }),
        defenseProfile: createSelectionStrategyProfile({
          side: "DEFENSE",
          mode: "CONSERVATIVE",
          schemeCode: "FOUR_THREE_FRONT",
        }),
        selectionSeed: "risk-conservative",
      }),
    );
    const aggressive = new DefaultPlaySelectionEngine().select(
      createContext({
        situation,
        offenseProfile: createSelectionStrategyProfile({
          side: "OFFENSE",
          mode: "AGGRESSIVE",
          schemeCode: "BALANCED_OFFENSE",
        }),
        defenseProfile: createSelectionStrategyProfile({
          side: "DEFENSE",
          mode: "AGGRESSIVE",
          schemeCode: "PRESS_MAN",
        }),
        selectionSeed: "risk-aggressive",
      }),
    );

    expect(
      combinedProbability(aggressive.trace.offense, (playId) =>
        ["off-dropback-dagger", "off-play-action-boot-flood"].includes(playId),
      ),
    ).toBeGreaterThan(
      combinedProbability(conservative.trace.offense, (playId) =>
        ["off-dropback-dagger", "off-play-action-boot-flood"].includes(playId),
      ),
    );
    expect(
      combinedProbability(aggressive.trace.defense, (playId) =>
        [
          "def-zero-double-a-pressure",
          "def-fire-zone-boundary",
          "def-sim-pressure-creeper",
        ].includes(playId),
      ),
    ).toBeGreaterThan(
      combinedProbability(conservative.trace.defense, (playId) =>
        [
          "def-zero-double-a-pressure",
          "def-fire-zone-boundary",
          "def-sim-pressure-creeper",
        ].includes(playId),
      ),
    );
  });

  it("applies pre-game X-Factors to offensive selection menus", () => {
    const engine = new DefaultPlaySelectionEngine();
    const runPlan = engine.select(
      createContext({
        offenseXFactorPlan: {
          offensiveFocus: "RUN_FIRST",
          aggression: "CONSERVATIVE",
          tempoPlan: "SLOW",
          protectionPlan: "MAX_PROTECT",
          offensiveMatchupFocus: "FEATURE_RB",
          turnoverPlan: "PROTECT_BALL",
        },
        selectionSeed: "x-factor-run-first",
      }),
    );
    const passPlan = engine.select(
      createContext({
        offenseXFactorPlan: {
          offensiveFocus: "PASS_FIRST",
          aggression: "AGGRESSIVE",
          tempoPlan: "HURRY_UP",
          protectionPlan: "FAST_RELEASE",
          offensiveMatchupFocus: "FEATURE_WR",
          turnoverPlan: "HUNT_TURNOVERS",
        },
        selectionSeed: "x-factor-pass-first",
      }),
    );

    const runFamilies = ["ZONE_RUN", "GAP_RUN", "DESIGNED_QB_RUN", "OPTION_RPO"];
    const passFamilies = [
      "QUICK_PASS",
      "DROPBACK",
      "PLAY_ACTION",
      "MOVEMENT_PASS",
      "SCREEN",
      "EMPTY_TEMPO",
    ];
    const xFactorReasons = passPlan.trace.offense.evaluatedCandidates.flatMap(
      (candidate) =>
        candidate.modifiers
          .filter((modifier) => modifier.source === "X_FACTOR")
          .map((modifier) => modifier.reason),
    );

    expect(combinedFamilyProbability(runPlan.trace.offense, runFamilies)).toBeGreaterThan(
      combinedFamilyProbability(passPlan.trace.offense, runFamilies),
    );
    expect(combinedFamilyProbability(passPlan.trace.offense, passFamilies)).toBeGreaterThan(
      combinedFamilyProbability(runPlan.trace.offense, passFamilies),
    );
    expect(xFactorReasons).toEqual(
      expect.arrayContaining([
        "Pre-game offensive focus PASS_FIRST.",
        "Pre-game aggression AGGRESSIVE.",
        "Pre-game tempo plan HURRY_UP.",
        "Pre-game protection plan FAST_RELEASE.",
        "Pre-game offensive matchup focus FEATURE_WR.",
        "Pre-game turnover plan HUNT_TURNOVERS.",
      ]),
    );
  });

  it("applies pre-game X-Factors to defensive selection menus", () => {
    const engine = new DefaultPlaySelectionEngine();
    const stopRunPlan = engine.select(
      createContext({
        defenseXFactorPlan: {
          defensiveFocus: "STOP_RUN",
          aggression: "AGGRESSIVE",
          defensiveMatchupFocus: "ATTACK_WEAK_OL",
          turnoverPlan: "HUNT_TURNOVERS",
        },
        selectionSeed: "x-factor-stop-run",
      }),
    );
    const limitPassPlan = engine.select(
      createContext({
        defenseXFactorPlan: {
          defensiveFocus: "LIMIT_PASS",
          aggression: "CONSERVATIVE",
          defensiveMatchupFocus: "DOUBLE_WR1",
          turnoverPlan: "PROTECT_BALL",
        },
        selectionSeed: "x-factor-limit-pass",
      }),
    );

    const pressureFamilies = ["RUN_BLITZ", "FIRE_ZONE", "SIMULATED_PRESSURE", "ZERO_PRESSURE"];
    const coverageFamilies = [
      "MATCH_COVERAGE",
      "ZONE_COVERAGE",
      "MAN_COVERAGE",
      "DROP_EIGHT",
      "BRACKET_SPECIALTY",
      "THREE_HIGH_PACKAGE",
    ];
    const xFactorReasons = stopRunPlan.trace.defense.evaluatedCandidates.flatMap(
      (candidate) =>
        candidate.modifiers
          .filter((modifier) => modifier.source === "X_FACTOR")
          .map((modifier) => modifier.reason),
    );

    expect(combinedFamilyProbability(stopRunPlan.trace.defense, pressureFamilies)).toBeGreaterThan(
      combinedFamilyProbability(limitPassPlan.trace.defense, pressureFamilies),
    );
    expect(combinedFamilyProbability(limitPassPlan.trace.defense, coverageFamilies)).toBeGreaterThan(
      combinedFamilyProbability(stopRunPlan.trace.defense, coverageFamilies),
    );
    expect(xFactorReasons).toEqual(
      expect.arrayContaining([
        "Pre-game defensive focus STOP_RUN.",
        "Pre-game aggression AGGRESSIVE.",
        "Pre-game defensive matchup focus ATTACK_WEAK_OL.",
        "Pre-game turnover plan HUNT_TURNOVERS.",
      ]),
    );
  });

  it("applies self-scout penalties and surprise bonuses to overused calls", () => {
    const engine = new DefaultPlaySelectionEngine();
    const baseline = engine.select(
      createContext({
        selectionSeed: "self-scout-baseline",
      }),
    );
    const withMemory = engine.select(
      createContext({
        offenseUsageMemory: {
          totalCalls: 100,
          playCallCounts: {
            "off-zone-inside-split": 36,
            "off-gap-counter-gt": 18,
            "off-rpo-glance-bubble": 16,
          },
          familyCallCounts: {
            ZONE_RUN: 36,
            GAP_RUN: 18,
            OPTION_RPO: 16,
          },
          recentPlayIds: [
            "off-zone-inside-split",
            "off-zone-inside-split",
            "off-gap-counter-gt",
          ],
          recentFamilyCalls: ["ZONE_RUN", "ZONE_RUN", "GAP_RUN"],
        },
        selectionSeed: "self-scout-memory",
      }),
    );

    expect(candidateProbability(withMemory.trace.offense, "off-zone-inside-split")).toBeLessThan(
      candidateProbability(baseline.trace.offense, "off-zone-inside-split"),
    );
    expect(candidateProbability(withMemory.trace.offense, "off-dropback-dagger")).toBeGreaterThan(
      candidateProbability(baseline.trace.offense, "off-dropback-dagger"),
    );
  });

  it("penalizes sibling variants when a variant group is overexposed", () => {
    const engine = new DefaultPlaySelectionEngine();
    const overusedVariant: OffensivePlayDefinition = {
      ...requireOffensePlay("off-dropback-dagger"),
      id: "off-dropback-dagger-y-cross",
      label: "Dropback Y Cross",
      variantGroupId: "dropback-intermediate-breakers",
      packageTags: ["11P", "SHOTGUN", "TRIPS"],
    };
    const alternateVariant: OffensivePlayDefinition = {
      ...requireOffensePlay("off-dropback-dagger"),
      id: "off-dropback-dagger-dino",
      label: "Dropback Dino",
      variantGroupId: "dropback-vertical-isolation",
      packageTags: ["11P", "SHOTGUN", "DOUBLES"],
    };
    const offenseCandidates = [overusedVariant, alternateVariant];
    const baseline = engine.select(
      createContext({
        offenseCandidates,
        selectionSeed: "variant-group-baseline",
      }),
    );
    const withMemory = engine.select(
      createContext({
        offenseCandidates,
        offenseUsageMemory: {
          totalCalls: 100,
          playCallCounts: {
            "off-dropback-dagger": 12,
          },
          familyCallCounts: {
            DROPBACK: 22,
          },
          variantGroupCallCounts: {
            "dropback-intermediate-breakers": 30,
          },
          recentPlayIds: ["off-dropback-dagger"],
          recentVariantGroups: [
            "dropback-intermediate-breakers",
            "dropback-intermediate-breakers",
          ],
          recentFamilyCalls: ["DROPBACK", "DROPBACK"],
        },
        selectionSeed: "variant-group-memory",
      }),
    );

    expect(
      candidateProbability(withMemory.trace.offense, overusedVariant.id),
    ).toBeLessThan(candidateProbability(baseline.trace.offense, overusedVariant.id));
    expect(
      candidateProbability(withMemory.trace.offense, overusedVariant.id),
    ).toBeLessThan(candidateProbability(withMemory.trace.offense, alternateVariant.id));
    expect(
      withMemory.trace.offense.rejectedCandidates.map((candidate) => candidate.playId),
    ).not.toContain(overusedVariant.id);
  });

  it("never chooses illegal plays and records the rejection in the trace", () => {
    const engine = new DefaultPlaySelectionEngine();
    const invalidPlay: OffensivePlayDefinition = {
      ...requireOffensePlay("off-zone-inside-split"),
      id: "off-zone-inside-split-illegal",
      label: "Inside Zone Split Illegal",
      legalityTemplate: {
        ...requireOffensePlay("off-zone-inside-split").legalityTemplate,
        offensePlayers: requireOffensePlay("off-zone-inside-split").legalityTemplate.offensePlayers.map(
          (player) =>
            player.playerId === "lg"
              ? { ...player, receiverDeclaration: "ELIGIBLE" }
              : player,
        ),
      },
    };
    const playbook: Playbook = {
      ...buildDefaultPlaybook({
        teamId: "TEAM-A",
        ruleset: "NFL_PRO",
      }),
      offensePolicies: [
        {
          id: "illegal-priority",
          side: "OFFENSE" as const,
          label: "Illegal Priority",
          situation: {
            downs: [1 as const],
          },
          candidates: [
            { referenceId: invalidPlay.id, referenceType: "PLAY" as const, weight: 9 },
            { referenceId: "off-quick-stick-spacing", referenceType: "PLAY" as const, weight: 1 },
          ],
        },
      ],
    };
    const result = engine.select(
      createContext({
        offensePlaybook: playbook,
        offenseCandidates: [...PLAY_LIBRARY_CATALOG.offensePlays, invalidPlay],
        selectionSeed: "illegal-candidate",
      }),
    );

    expect(result.offense.play.id).not.toBe(invalidPlay.id);
    expect(result.trace.offense.rejectedCandidates.map((candidate) => candidate.playId)).toContain(
      invalidPlay.id,
    );
  });

  it("lets an aggressive offensive coordinator expand deep and tempo calls", () => {
    const engine = new DefaultPlaySelectionEngine();
    const baseline = engine.select(
      createContext({
        selectionSeed: "coordinator-oc-aggressive-baseline",
      }),
    );
    const aggressive = engine.select(
      createContext({
        offenseCoordinator: {
          runPassLean: 0.8,
          aggressiveness: 0.9,
          tempo: 0.7,
          targetPreference: "FEATURE_WR",
          deepShotFrequency: 0.92,
        },
        offenseTeamStrength: {
          passOffense: 88,
        },
        opponentWeaknessForOffense: {
          secondary: 86,
        },
        selectionSeed: "coordinator-oc-aggressive",
      }),
    );
    const baselineAggressiveMenu = combinedFamilyProbability(baseline.trace.offense, [
      "DROPBACK",
      "PLAY_ACTION",
      "EMPTY_TEMPO",
    ]);
    const aggressiveMenu = combinedFamilyProbability(aggressive.trace.offense, [
      "DROPBACK",
      "PLAY_ACTION",
      "EMPTY_TEMPO",
    ]);

    expect(aggressiveMenu).toBeGreaterThan(baselineAggressiveMenu);
    expect(
      aggressive.trace.offense.evaluatedCandidates.some((candidate) =>
        candidate.modifiers.some((modifier) => modifier.source === "COORDINATOR"),
      ),
    ).toBe(true);
  });

  it("lets a conservative offensive coordinator protect floor and run/pass balance", () => {
    const engine = new DefaultPlaySelectionEngine();
    const baseline = engine.select(
      createContext({
        situation: {
          down: 2,
          yardsToGo: 4,
          distanceBucket: "SHORT",
        },
        selectionSeed: "coordinator-oc-conservative-baseline",
      }),
    );
    const conservative = engine.select(
      createContext({
        situation: {
          down: 2,
          yardsToGo: 4,
          distanceBucket: "SHORT",
        },
        offenseCoordinator: {
          runPassLean: -0.7,
          aggressiveness: -0.9,
          tempo: -0.4,
          targetPreference: "FEATURE_RB",
          deepShotFrequency: 0.16,
        },
        offenseTeamStrength: {
          runOffense: 84,
        },
        opponentWeaknessForOffense: {
          runDefense: 82,
        },
        selectionSeed: "coordinator-oc-conservative",
      }),
    );
    const baselineControlMenu = combinedFamilyProbability(baseline.trace.offense, [
      "ZONE_RUN",
      "GAP_RUN",
      "SCREEN",
      "QUICK_PASS",
    ]);
    const conservativeControlMenu = combinedFamilyProbability(conservative.trace.offense, [
      "ZONE_RUN",
      "GAP_RUN",
      "SCREEN",
      "QUICK_PASS",
    ]);
    const baselineDeepMenu = combinedFamilyProbability(baseline.trace.offense, [
      "DROPBACK",
      "PLAY_ACTION",
    ]);
    const conservativeDeepMenu = combinedFamilyProbability(conservative.trace.offense, [
      "DROPBACK",
      "PLAY_ACTION",
    ]);

    expect(conservativeControlMenu).toBeGreaterThan(baselineControlMenu);
    expect(conservativeDeepMenu).toBeLessThan(baselineDeepMenu);
  });

  it("lets a blitz-heavy defensive coordinator raise pressure families", () => {
    const engine = new DefaultPlaySelectionEngine();
    const baseline = engine.select(
      createContext({
        situation: {
          down: 3,
          yardsToGo: 8,
          distanceBucket: "LONG",
        },
        selectionSeed: "coordinator-dc-blitz-baseline",
      }),
    );
    const blitzHeavy = engine.select(
      createContext({
        situation: {
          down: 3,
          yardsToGo: 8,
          distanceBucket: "LONG",
        },
        defenseCoordinator: {
          blitzFrequency: 0.94,
          aggressiveness: 0.85,
          coveragePreference: "MAN",
        },
        defenseTeamStrength: {
          passRush: 88,
        },
        opponentWeaknessForDefense: {
          offensiveLine: 86,
        },
        defenseXFactorPlan: {
          defensiveMatchupFocus: "ATTACK_WEAK_OL",
        },
        selectionSeed: "coordinator-dc-blitz",
      }),
    );
    const baselinePressure = combinedFamilyProbability(baseline.trace.defense, [
      "ZERO_PRESSURE",
      "FIRE_ZONE",
      "SIMULATED_PRESSURE",
      "RUN_BLITZ",
    ]);
    const blitzPressure = combinedFamilyProbability(blitzHeavy.trace.defense, [
      "ZERO_PRESSURE",
      "FIRE_ZONE",
      "SIMULATED_PRESSURE",
      "RUN_BLITZ",
    ]);

    expect(blitzPressure).toBeGreaterThan(baselinePressure);
    expect(
      blitzHeavy.trace.defense.evaluatedCandidates.some((candidate) =>
        candidate.modifiers.some((modifier) => modifier.source === "GAMEPLAN"),
      ),
    ).toBe(true);
  });

  it("lets a press-heavy defensive coordinator raise man and bracket calls", () => {
    const engine = new DefaultPlaySelectionEngine();
    const baseline = engine.select(
      createContext({
        selectionSeed: "coordinator-dc-press-baseline",
      }),
    );
    const pressHeavy = engine.select(
      createContext({
        defenseCoordinator: {
          pressFrequency: 0.96,
          aggressiveness: 0.35,
          coveragePreference: "PRESS",
        },
        defenseTeamStrength: {
          coverage: 88,
        },
        defenseXFactorPlan: {
          defensiveMatchupFocus: "DOUBLE_WR1",
        },
        selectionSeed: "coordinator-dc-press",
      }),
    );
    const baselinePress = combinedFamilyProbability(baseline.trace.defense, [
      "MAN_COVERAGE",
      "ZERO_PRESSURE",
      "BRACKET_SPECIALTY",
    ]);
    const pressMenu = combinedFamilyProbability(pressHeavy.trace.defense, [
      "MAN_COVERAGE",
      "ZERO_PRESSURE",
      "BRACKET_SPECIALTY",
    ]);

    expect(pressMenu).toBeGreaterThan(baselinePress);
  });

  it("uses gameplan hooks to answer a strong pass rush with quick and screen calls", () => {
    const engine = new DefaultPlaySelectionEngine();
    const baseline = engine.select(
      createContext({
        situation: {
          down: 3,
          yardsToGo: 9,
          distanceBucket: "LONG",
        },
        defenseProfile: createSelectionStrategyProfile({
          side: "DEFENSE",
          mode: "AGGRESSIVE",
          schemeCode: "THREE_FOUR_FRONT",
        }),
        selectionSeed: "coordinator-strong-rush-baseline",
      }),
    );
    const adjusted = engine.select(
      createContext({
        situation: {
          down: 3,
          yardsToGo: 9,
          distanceBucket: "LONG",
        },
        defenseProfile: createSelectionStrategyProfile({
          side: "DEFENSE",
          mode: "AGGRESSIVE",
          schemeCode: "THREE_FOUR_FRONT",
        }),
        offenseCoordinator: {
          screenQuickVsBlitz: 0.96,
        },
        offenseXFactorPlan: {
          protectionPlan: "FAST_RELEASE",
          offensiveMatchupFocus: "PROTECT_QB",
        },
        opponentWeaknessForOffense: {
          passRush: 92,
        },
        selectionSeed: "coordinator-strong-rush-adjusted",
      }),
    );
    const baselineAnswers = combinedFamilyProbability(baseline.trace.offense, [
      "QUICK_PASS",
      "SCREEN",
      "MOVEMENT_PASS",
      "OPTION_RPO",
      "EMPTY_TEMPO",
    ]);
    const adjustedAnswers = combinedFamilyProbability(adjusted.trace.offense, [
      "QUICK_PASS",
      "SCREEN",
      "MOVEMENT_PASS",
      "OPTION_RPO",
      "EMPTY_TEMPO",
    ]);

    expect(adjustedAnswers).toBeGreaterThan(baselineAnswers);
    expect(
      combinedFamilyProbability(adjusted.trace.offense, ["DROPBACK"]),
    ).toBeLessThan(combinedFamilyProbability(baseline.trace.offense, ["DROPBACK"]));
  });

  it("uses gameplan hooks to attack a weak secondary with deeper concepts", () => {
    const engine = new DefaultPlaySelectionEngine();
    const baseline = engine.select(
      createContext({
        situation: {
          down: 2,
          yardsToGo: 3,
          distanceBucket: "SHORT",
        },
        selectionSeed: "coordinator-weak-secondary-baseline",
      }),
    );
    const adjusted = engine.select(
      createContext({
        situation: {
          down: 2,
          yardsToGo: 3,
          distanceBucket: "SHORT",
        },
        offenseCoordinator: {
          runPassLean: 0.65,
          aggressiveness: 0.65,
          targetPreference: "FEATURE_WR",
          deepShotFrequency: 0.94,
        },
        offenseXFactorPlan: {
          offensiveMatchupFocus: "FEATURE_WR",
          aggression: "AGGRESSIVE",
        },
        opponentWeaknessForOffense: {
          secondary: 94,
        },
        selectionSeed: "coordinator-weak-secondary-adjusted",
      }),
    );
    const baselineShots = combinedFamilyProbability(baseline.trace.offense, [
      "DROPBACK",
      "PLAY_ACTION",
      "MOVEMENT_PASS",
    ]);
    const adjustedShots = combinedFamilyProbability(adjusted.trace.offense, [
      "DROPBACK",
      "PLAY_ACTION",
      "MOVEMENT_PASS",
    ]);

    expect(adjustedShots).toBeGreaterThan(baselineShots);
  });

  it("shows stable, situation-appropriate batch distributions", () => {
    const engine = new DefaultPlaySelectionEngine();
    const neutralCounts = new Map<string, number>();
    const longCounts = new Map<string, number>();
    const iterations = 400;

    for (let index = 0; index < iterations; index += 1) {
      const neutral = engine.select(
        createContext({
          selectionSeed: `batch-neutral-${index}`,
        }),
      );
      const long = engine.select(
        createContext({
          situation: {
            down: 3,
            yardsToGo: 11,
            distanceBucket: "LONG",
            fieldZone: "MIDFIELD",
          },
          selectionSeed: `batch-third-long-${index}`,
        }),
      );

      neutralCounts.set(
        neutral.offense.play.id,
        (neutralCounts.get(neutral.offense.play.id) ?? 0) + 1,
      );
      longCounts.set(
        long.offense.play.id,
        (longCounts.get(long.offense.play.id) ?? 0) + 1,
      );
    }

    const neutralRunHeavy = [...neutralCounts.entries()]
      .filter(([playId]) =>
        ["ZONE_RUN", "GAP_RUN", "DESIGNED_QB_RUN", "OPTION_RPO"].includes(
          requireOffensePlay(playId).family,
        ),
      )
      .reduce((sum, [, count]) => sum + count, 0);
    const neutralPassHeavy = [...neutralCounts.entries()]
      .filter(([playId]) =>
        [
          "QUICK_PASS",
          "DROPBACK",
          "PLAY_ACTION",
          "MOVEMENT_PASS",
          "SCREEN",
          "EMPTY_TEMPO",
        ].includes(requireOffensePlay(playId).family),
      )
      .reduce((sum, [, count]) => sum + count, 0);
    const longPassHeavy = [...longCounts.entries()]
      .filter(([playId]) =>
        [
          "QUICK_PASS",
          "DROPBACK",
          "SCREEN",
          "MOVEMENT_PASS",
          "EMPTY_TEMPO",
        ].includes(requireOffensePlay(playId).family),
      )
      .reduce((sum, [, count]) => sum + count, 0);

    expect(neutralRunHeavy).toBeGreaterThan(neutralPassHeavy);
    expect(longPassHeavy).toBeGreaterThan(220);
    expect(neutralCounts.size).toBeGreaterThanOrEqual(6);
    expect(longCounts.size).toBeGreaterThanOrEqual(5);
  }, BATCH_DISTRIBUTION_TIMEOUT_MS);
});
