import { describe, expect, it } from "vitest";

import { resolveCompetitionRuleProfile } from "../domain/competition-rules";
import type { CompetitionRuleset } from "../domain/competition-rules";
import type { GameSituationSnapshot } from "../domain/game-situation";
import type {
  DefensivePlayDefinition,
  OffensivePlayDefinition,
} from "../domain/play-library";
import type {
  OutcomeDistributionPoint,
  ResolutionMatchupSnapshot,
  ResolvedPlayEvent,
} from "../domain/play-resolution";
import type { PreGameXFactorPlan } from "../domain/pre-game-x-factor";
import type { PlayerAlignmentSnapshot } from "../domain/pre-snap-structure";
import { PLAY_LIBRARY_CATALOG, buildDefaultPlaybook } from "../infrastructure";
import { defaultPlaySelectionEngine } from "./play-selection-engine";
import { validatePreSnapStructure } from "./pre-snap-legality-engine";
import {
  DefaultOutcomeResolutionEngine,
  createNeutralResolutionMatchup,
} from "./outcome-resolution-engine";

function requireOffensePlay(playId: string): OffensivePlayDefinition {
  const play = PLAY_LIBRARY_CATALOG.offensePlays.find((entry) => entry.id === playId);

  if (!play) {
    throw new Error(`Missing offense play ${playId}`);
  }

  return play;
}

function requireDefensePlay(playId: string): DefensivePlayDefinition {
  const play = PLAY_LIBRARY_CATALOG.defensePlays.find((entry) => entry.id === playId);

  if (!play) {
    throw new Error(`Missing defense play ${playId}`);
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

function buildJointPreSnap(
  offensePlay: OffensivePlayDefinition,
  defensePlay: DefensivePlayDefinition,
  situation: GameSituationSnapshot,
) {
  return {
    ruleset: situation.ruleset,
    situation,
    formation: offensePlay.legalityTemplate.formation,
    offensePersonnel: offensePlay.legalityTemplate.offensePersonnel,
    defensePersonnel: defensePlay.legalityTemplate.defensePersonnel,
    offenseShift: offensePlay.legalityTemplate.offenseShift,
    offensePlayers: offensePlay.legalityTemplate.offensePlayers,
    defensePlayers: defensePlay.legalityTemplate.defensePlayers,
  };
}

function createResolutionRequest(input: {
  offensePlayId: string;
  defensePlayId: string;
  situation?: Partial<GameSituationSnapshot>;
  matchup?: ResolutionMatchupSnapshot;
  offenseXFactorPlan?: Partial<PreGameXFactorPlan>;
  defenseXFactorPlan?: Partial<PreGameXFactorPlan>;
  resolutionSeed?: string;
}) {
  const offensePlay = requireOffensePlay(input.offensePlayId);
  const defensePlay = requireDefensePlay(input.defensePlayId);
  const situation = createSituation("NFL_PRO", input.situation);
  const preSnapStructure = buildJointPreSnap(offensePlay, defensePlay, situation);
  const selectedPlayCall = defaultPlaySelectionEngine.select({
    situation,
    preSnapStructure,
    offensePlaybook: buildDefaultPlaybook({
      teamId: "OFF",
      ruleset: "NFL_PRO",
    }),
    defensePlaybook: buildDefaultPlaybook({
      teamId: "DEF",
      ruleset: "NFL_PRO",
    }),
    offenseCandidates: [offensePlay],
    defenseCandidates: [defensePlay],
    offenseFatigueMultiplier: 1,
    defenseFatigueMultiplier: 1,
    selectionSeed: `selection-${input.resolutionSeed ?? "default"}`,
  });
  const legality = validatePreSnapStructure(preSnapStructure);

  return {
    situation,
    preSnapStructure,
    selectedPlayCall,
    legality,
    matchupFeatures: [],
    matchup: input.matchup ?? createNeutralResolutionMatchup(),
    offenseXFactorPlan: input.offenseXFactorPlan,
    defenseXFactorPlan: input.defenseXFactorPlan,
    resolutionSeed: input.resolutionSeed ?? "resolution-default",
  };
}

function createResolutionRequestFromPlays(input: {
  offensePlay: OffensivePlayDefinition;
  defensePlay: DefensivePlayDefinition;
  situation?: Partial<GameSituationSnapshot>;
  matchup?: ResolutionMatchupSnapshot;
  offenseXFactorPlan?: Partial<PreGameXFactorPlan>;
  defenseXFactorPlan?: Partial<PreGameXFactorPlan>;
  resolutionSeed?: string;
}) {
  const situation = createSituation("NFL_PRO", input.situation);
  const preSnapStructure = buildJointPreSnap(
    input.offensePlay,
    input.defensePlay,
    situation,
  );
  const selectedPlayCall = defaultPlaySelectionEngine.select({
    situation,
    preSnapStructure,
    offensePlaybook: buildDefaultPlaybook({
      teamId: "OFF",
      ruleset: "NFL_PRO",
    }),
    defensePlaybook: buildDefaultPlaybook({
      teamId: "DEF",
      ruleset: "NFL_PRO",
    }),
    offenseCandidates: [input.offensePlay],
    defenseCandidates: [input.defensePlay],
    offenseFatigueMultiplier: 1,
    defenseFatigueMultiplier: 1,
    selectionSeed: `selection-${input.resolutionSeed ?? "default"}`,
  });
  const legality = validatePreSnapStructure(preSnapStructure);

  return {
    situation,
    preSnapStructure,
    selectedPlayCall,
    legality,
    matchupFeatures: [],
    matchup: input.matchup ?? createNeutralResolutionMatchup(),
    offenseXFactorPlan: input.offenseXFactorPlan,
    defenseXFactorPlan: input.defenseXFactorPlan,
    resolutionSeed: input.resolutionSeed ?? "resolution-default",
  };
}

function distributionProbability(
  distribution: OutcomeDistributionPoint[],
  family: OutcomeDistributionPoint["family"],
) {
  return distribution
    .filter((point) => point.family === family)
    .reduce((sum, point) => sum + point.probability, 0);
}

function strongPassMatchup(): ResolutionMatchupSnapshot {
  const base = createNeutralResolutionMatchup();

  return {
    ...base,
    offense: {
      ...base.offense,
      quarterback: {
        accuracyShort: 87,
        accuracyIntermediate: 86,
        accuracyDeep: 82,
        decision: 88,
        pocketPresence: 84,
        mobility: 78,
        armStrength: 84,
      },
      primaryTarget: {
        routeQuality: 86,
        separation: 87,
        hands: 85,
        ballSkills: 84,
        yardsAfterCatch: 80,
        release: 84,
      },
      offensiveLine: {
        passProtection: 84,
        runBlocking: 74,
        comboBlocking: 74,
        edgeControl: 82,
        communication: 82,
      },
    },
    defense: {
      ...base.defense,
      coverage: {
        manCoverage: 64,
        zoneCoverage: 65,
        leverage: 66,
        ballHawk: 63,
        tackling: 67,
      },
      passRush: {
        pressure: 66,
        edgeRush: 66,
        interiorRush: 65,
        contain: 67,
        finishing: 64,
      },
    },
    context: {
      boxDefenders: 6,
      leverageAdvantage: 0.3,
      coverageTightness: -0.15,
    },
  };
}

function weakPassMatchup(): ResolutionMatchupSnapshot {
  const base = createNeutralResolutionMatchup();

  return {
    ...base,
    offense: {
      ...base.offense,
      quarterback: {
        accuracyShort: 62,
        accuracyIntermediate: 60,
        accuracyDeep: 56,
        decision: 60,
        pocketPresence: 60,
        mobility: 62,
        armStrength: 60,
      },
      primaryTarget: {
        routeQuality: 60,
        separation: 60,
        hands: 61,
        ballSkills: 60,
        yardsAfterCatch: 62,
        release: 59,
      },
      offensiveLine: {
        passProtection: 62,
        runBlocking: 68,
        comboBlocking: 68,
        edgeControl: 61,
        communication: 60,
      },
    },
    defense: {
      ...base.defense,
      coverage: {
        manCoverage: 84,
        zoneCoverage: 85,
        leverage: 84,
        ballHawk: 82,
        tackling: 80,
      },
      passRush: {
        pressure: 84,
        edgeRush: 85,
        interiorRush: 82,
        contain: 80,
        finishing: 84,
      },
    },
    context: {
      boxDefenders: 6.5,
      leverageAdvantage: -0.25,
      coverageTightness: 0.25,
    },
  };
}

function strongRunMatchup(): ResolutionMatchupSnapshot {
  const base = createNeutralResolutionMatchup();

  return {
    ...base,
    offense: {
      ...base.offense,
      primaryRunner: {
        vision: 88,
        acceleration: 86,
        balance: 84,
        ballSecurity: 83,
        power: 82,
      },
      offensiveLine: {
        passProtection: 72,
        runBlocking: 86,
        comboBlocking: 84,
        edgeControl: 82,
        communication: 82,
      },
    },
    defense: {
      ...base.defense,
      front: {
        boxControl: 64,
        runFit: 64,
        leverage: 65,
        pursuit: 66,
        tackling: 68,
        hitPower: 67,
      },
    },
    context: {
      boxDefenders: 6,
      leverageAdvantage: 0.25,
      coverageTightness: 0,
    },
  };
}

function weakRunMatchup(): ResolutionMatchupSnapshot {
  const base = createNeutralResolutionMatchup();

  return {
    ...base,
    offense: {
      ...base.offense,
      primaryRunner: {
        vision: 60,
        acceleration: 61,
        balance: 60,
        ballSecurity: 60,
        power: 58,
      },
      offensiveLine: {
        passProtection: 72,
        runBlocking: 60,
        comboBlocking: 59,
        edgeControl: 60,
        communication: 60,
      },
    },
    defense: {
      ...base.defense,
      front: {
        boxControl: 84,
        runFit: 86,
        leverage: 84,
        pursuit: 82,
        tackling: 84,
        hitPower: 82,
      },
    },
    context: {
      boxDefenders: 7.5,
      leverageAdvantage: -0.25,
      coverageTightness: 0,
    },
  };
}

function batchMetrics(events: ResolvedPlayEvent[]) {
  return {
    averageYards:
      events.reduce((sum, event) => sum + event.yards, 0) / events.length,
    completionRate:
      events.filter((event) => event.path === "PASS" && event.completion).length /
      Math.max(
        1,
        events.filter((event) => event.path === "PASS").length,
      ),
    sackRate:
      events.filter((event) => event.family === "SACK").length / events.length,
    interceptionRate:
      events.filter((event) => event.turnoverType === "INTERCEPTION").length /
      events.length,
    stuffedRate:
      events.filter((event) => event.family === "RUN_STOP").length / events.length,
    explosiveRate:
      events.filter((event) => event.explosive).length / events.length,
    fumbleRate:
      events.filter((event) => event.turnoverType === "FUMBLE").length /
      events.length,
  };
}

describe("outcome resolution engine", () => {
  it("builds and resolves a plausible pass model", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const request = createResolutionRequest({
      offensePlayId: "off-quick-stick-spacing",
      defensePlayId: "def-zone-cover-3-buzz",
      matchup: strongPassMatchup(),
      resolutionSeed: "pass-plausible",
    });
    const distribution = engine.buildDistribution(request);
    const event = engine.resolve(request);

    expect(distribution.reduce((sum, point) => sum + point.probability, 0)).toBeCloseTo(
      1,
      4,
    );
    expect(distribution.some((point) => point.family === "PASS_COMPLETE")).toBe(true);
    expect(event.path).toBe("PASS");
    expect(event.yards).toBeGreaterThanOrEqual(-12);
    expect(event.yards).toBeLessThanOrEqual(65);
    expect(event.value).not.toBeNull();
    expect(event.trace.completionProbability).not.toBeNull();
  });

  it("builds and resolves a plausible run model", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const request = createResolutionRequest({
      offensePlayId: "off-zone-inside-split",
      defensePlayId: "def-match-quarters-poach",
      matchup: strongRunMatchup(),
      resolutionSeed: "run-plausible",
    });
    const distribution = engine.buildDistribution(request);
    const event = engine.resolve(request);

    expect(distribution.reduce((sum, point) => sum + point.probability, 0)).toBeCloseTo(
      1,
      4,
    );
    expect(distribution.some((point) => point.family === "RUN_SUCCESS")).toBe(true);
    expect(event.path).toBe("RUN");
    expect(event.yards).toBeGreaterThanOrEqual(-4);
    expect(event.yards).toBeLessThanOrEqual(36);
    expect(event.value).not.toBeNull();
    expect(event.trace.stuffedProbability).not.toBeNull();
  });

  it("resolves designed quarterback runs through the run path", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const request = createResolutionRequest({
      offensePlayId: "off-qb-draw-empty",
      defensePlayId: "def-match-quarters-poach",
      matchup: strongRunMatchup(),
      resolutionSeed: "qb-run-resolution",
    });
    const distribution = engine.buildDistribution(request);
    const event = engine.resolve(request);

    expect(distribution.some((point) => point.family === "RUN_SUCCESS")).toBe(true);
    expect(event.path).toBe("RUN");
    expect(event.penaltyCode).toBeNull();
    expect(event.trace.stuffedProbability).not.toBeNull();
  });

  it("resolves movement and empty tempo families through the pass path", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const movementEvent = engine.resolve(
      createResolutionRequest({
        offensePlayId: "off-movement-sprint-sail",
        defensePlayId: "def-zone-cover-3-buzz",
        matchup: strongPassMatchup(),
        resolutionSeed: "movement-pass-resolution",
      }),
    );
    const emptyEvent = engine.resolve(
      createResolutionRequest({
        offensePlayId: "off-empty-stick",
        defensePlayId: "def-man-cover-1-robber",
        matchup: strongPassMatchup(),
        resolutionSeed: "empty-tempo-resolution",
      }),
    );

    expect(movementEvent.path).toBe("PASS");
    expect(movementEvent.penaltyCode).toBeNull();
    expect(movementEvent.trace.completionProbability).not.toBeNull();
    expect(emptyEvent.path).toBe("PASS");
    expect(emptyEvent.penaltyCode).toBeNull();
    expect(emptyEvent.trace.completionProbability).not.toBeNull();
  });

  it("applies pass-game X-Factors to protection and turnover probabilities", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const baseRequest = createResolutionRequest({
      offensePlayId: "off-dropback-dagger",
      defensePlayId: "def-sim-pressure-creeper",
      matchup: strongPassMatchup(),
      resolutionSeed: "x-factor-pass-base",
    });
    const protectedRequest = createResolutionRequest({
      offensePlayId: "off-dropback-dagger",
      defensePlayId: "def-sim-pressure-creeper",
      matchup: strongPassMatchup(),
      offenseXFactorPlan: {
        protectionPlan: "MAX_PROTECT",
        offensiveMatchupFocus: "PROTECT_QB",
        turnoverPlan: "PROTECT_BALL",
      },
      resolutionSeed: "x-factor-pass-protected",
    });
    const baseEvent = engine.resolve(baseRequest);
    const protectedEvent = engine.resolve(protectedRequest);
    const baseDistribution = engine.buildDistribution(baseRequest);
    const protectedDistribution = engine.buildDistribution(protectedRequest);

    expect(protectedEvent.trace.pressureProbability).toBeLessThan(
      baseEvent.trace.pressureProbability,
    );
    expect(protectedEvent.trace.sackProbability).toBeLessThan(
      baseEvent.trace.sackProbability,
    );
    expect(protectedEvent.trace.interceptionProbability).toBeLessThan(
      baseEvent.trace.interceptionProbability,
    );
    expect(distributionProbability(protectedDistribution, "SACK")).toBeLessThan(
      distributionProbability(baseDistribution, "SACK"),
    );
    expect(protectedEvent.trace.notes).toEqual(
      expect.arrayContaining([
        "Pre-game protection plan MAX_PROTECT.",
        "Pre-game offensive matchup focus PROTECT_QB.",
        "Pre-game offensive turnover plan PROTECT_BALL.",
      ]),
    );
  });

  it("applies defensive turnover X-Factors as a risk-reward tradeoff", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const baseEvent = engine.resolve(
      createResolutionRequest({
        offensePlayId: "off-dropback-dagger",
        defensePlayId: "def-man-cover-1-robber",
        matchup: strongPassMatchup(),
        resolutionSeed: "x-factor-turnover-base",
      }),
    );
    const huntEvent = engine.resolve(
      createResolutionRequest({
        offensePlayId: "off-dropback-dagger",
        defensePlayId: "def-man-cover-1-robber",
        matchup: strongPassMatchup(),
        defenseXFactorPlan: {
          turnoverPlan: "HUNT_TURNOVERS",
        },
        resolutionSeed: "x-factor-turnover-hunt",
      }),
    );

    expect(huntEvent.trace.interceptionProbability).toBeGreaterThan(
      baseEvent.trace.interceptionProbability,
    );
    expect(huntEvent.trace.explosiveProbability).toBeGreaterThan(
      baseEvent.trace.explosiveProbability,
    );
    expect(huntEvent.trace.notes).toEqual(
      expect.arrayContaining([
        "Pre-game defensive turnover plan HUNT_TURNOVERS.",
      ]),
    );
  });

  it("applies run-game X-Factors to run focus and run-defense counters", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const baseEvent = engine.resolve(
      createResolutionRequest({
        offensePlayId: "off-zone-inside-split",
        defensePlayId: "def-match-quarters-poach",
        matchup: strongRunMatchup(),
        resolutionSeed: "x-factor-run-base",
      }),
    );
    const runFocusEvent = engine.resolve(
      createResolutionRequest({
        offensePlayId: "off-zone-inside-split",
        defensePlayId: "def-match-quarters-poach",
        matchup: strongRunMatchup(),
        offenseXFactorPlan: {
          offensiveFocus: "RUN_FIRST",
          offensiveMatchupFocus: "FEATURE_RB",
        },
        resolutionSeed: "x-factor-run-focus",
      }),
    );
    const stopRunEvent = engine.resolve(
      createResolutionRequest({
        offensePlayId: "off-zone-inside-split",
        defensePlayId: "def-match-quarters-poach",
        matchup: strongRunMatchup(),
        offenseXFactorPlan: {
          offensiveFocus: "RUN_FIRST",
          offensiveMatchupFocus: "FEATURE_RB",
        },
        defenseXFactorPlan: {
          defensiveFocus: "STOP_RUN",
          defensiveMatchupFocus: "ATTACK_WEAK_OL",
        },
        resolutionSeed: "x-factor-stop-run",
      }),
    );

    expect(runFocusEvent.trace.expectedYards).toBeGreaterThan(baseEvent.trace.expectedYards);
    expect(runFocusEvent.trace.explosiveProbability).toBeGreaterThan(
      baseEvent.trace.explosiveProbability,
    );
    expect(runFocusEvent.trace.stuffedProbability).not.toBeNull();
    expect(stopRunEvent.trace.stuffedProbability).not.toBeNull();
    expect(stopRunEvent.trace.stuffedProbability!).toBeGreaterThan(
      runFocusEvent.trace.stuffedProbability!,
    );
    expect(stopRunEvent.trace.expectedYards).toBeLessThan(runFocusEvent.trace.expectedYards);
    expect(stopRunEvent.trace.notes).toEqual(
      expect.arrayContaining([
        "Pre-game offensive focus RUN_FIRST.",
        "Pre-game offensive matchup focus FEATURE_RB.",
        "Pre-game defensive focus STOP_RUN.",
        "Pre-game defensive matchup focus ATTACK_WEAK_OL.",
      ]),
    );
  });

  it("shifts pass outcomes plausibly for strong versus weak players", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const strongEvents: ResolvedPlayEvent[] = [];
    const weakEvents: ResolvedPlayEvent[] = [];

    for (let index = 0; index < 1200; index += 1) {
      strongEvents.push(
        engine.resolve(
          createResolutionRequest({
            offensePlayId: "off-dropback-dagger",
            defensePlayId: "def-man-cover-1-robber",
            matchup: strongPassMatchup(),
            resolutionSeed: `strong-pass-${index}`,
          }),
        ),
      );
      weakEvents.push(
        engine.resolve(
          createResolutionRequest({
            offensePlayId: "off-dropback-dagger",
            defensePlayId: "def-man-cover-1-robber",
            matchup: weakPassMatchup(),
            resolutionSeed: `weak-pass-${index}`,
          }),
        ),
      );
    }

    const strong = batchMetrics(strongEvents);
    const weak = batchMetrics(weakEvents);

    expect(strong.completionRate).toBeGreaterThan(weak.completionRate + 0.12);
    expect(strong.averageYards).toBeGreaterThan(weak.averageYards + 2);
    expect(strong.explosiveRate).toBeGreaterThan(weak.explosiveRate);
    expect(strong.sackRate).toBeLessThan(weak.sackRate);
    expect(strong.interceptionRate).toBeLessThan(weak.interceptionRate);
  });

  it("shifts run outcomes plausibly for strong versus weak players", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const strongEvents: ResolvedPlayEvent[] = [];
    const weakEvents: ResolvedPlayEvent[] = [];

    for (let index = 0; index < 1200; index += 1) {
      strongEvents.push(
        engine.resolve(
          createResolutionRequest({
            offensePlayId: "off-gap-counter-gt",
            defensePlayId: "def-match-quarters-poach",
            matchup: strongRunMatchup(),
            resolutionSeed: `strong-run-${index}`,
          }),
        ),
      );
      weakEvents.push(
        engine.resolve(
          createResolutionRequest({
            offensePlayId: "off-gap-counter-gt",
            defensePlayId: "def-match-quarters-poach",
            matchup: weakRunMatchup(),
            resolutionSeed: `weak-run-${index}`,
          }),
        ),
      );
    }

    const strong = batchMetrics(strongEvents);
    const weak = batchMetrics(weakEvents);

    expect(strong.averageYards).toBeGreaterThan(weak.averageYards + 1.3);
    expect(strong.explosiveRate).toBeGreaterThan(weak.explosiveRate);
    expect(strong.stuffedRate).toBeLessThan(weak.stuffedRate);
    expect(strong.fumbleRate).toBeLessThanOrEqual(0.04);
    expect(weak.fumbleRate).toBeLessThanOrEqual(0.06);
  });

  it("keeps outcomes within sane regression bounds across mixed batches", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const events: ResolvedPlayEvent[] = [];

    for (let index = 0; index < 1600; index += 1) {
      events.push(
        engine.resolve(
          createResolutionRequest({
            offensePlayId:
              index % 2 === 0 ? "off-quick-stick-spacing" : "off-zone-inside-split",
            defensePlayId:
              index % 2 === 0 ? "def-sim-pressure-creeper" : "def-zone-cover-3-buzz",
            matchup:
              index % 2 === 0 ? strongPassMatchup() : strongRunMatchup(),
            resolutionSeed: `mixed-bounds-${index}`,
          }),
        ),
      );
    }

    expect(events.every((event) => event.yards >= -12 && event.yards <= 65)).toBe(true);
    expect(
      events.filter((event) => event.turnoverType === "INTERCEPTION").length / events.length,
    ).toBeLessThan(0.1);
    expect(events.filter((event) => event.family === "SACK").length / events.length).toBeLessThan(
      0.18,
    );
    expect(events.filter((event) => event.explosive).length / events.length).toBeLessThan(0.3);
  });

  it("integrates with selection and legality and annotates value output", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const offensePlaybook = buildDefaultPlaybook({
      teamId: "OFF",
      ruleset: "NFL_PRO",
    });
    const defensePlaybook = buildDefaultPlaybook({
      teamId: "DEF",
      ruleset: "NFL_PRO",
    });
    const situation = createSituation("NFL_PRO", {
      down: 3,
      yardsToGo: 8,
      distanceBucket: "MEDIUM",
      fieldZone: "MIDFIELD",
    });
    const preSnap = buildJointPreSnap(
      requireOffensePlay("off-quick-stick-spacing"),
      requireDefensePlay("def-sim-pressure-creeper"),
      situation,
    );
    const selectedPlayCall = defaultPlaySelectionEngine.select({
      situation,
      preSnapStructure: preSnap,
      offensePlaybook,
      defensePlaybook,
      offenseCandidates: [
        requireOffensePlay("off-quick-stick-spacing"),
        requireOffensePlay("off-dropback-dagger"),
      ],
      defenseCandidates: [
        requireDefensePlay("def-man-cover-1-robber"),
        requireDefensePlay("def-sim-pressure-creeper"),
      ],
      offenseFatigueMultiplier: 1,
      defenseFatigueMultiplier: 1,
      selectionSeed: "resolution-integration-selection",
    });
    const request = {
      situation,
      preSnapStructure: preSnap,
      selectedPlayCall,
      legality: validatePreSnapStructure(preSnap),
      matchupFeatures: [],
      matchup: strongPassMatchup(),
      resolutionSeed: "resolution-integration",
    };
    const event = engine.resolve(request);

    expect(request.legality.isLegal).toBe(true);
    expect(event.penaltyCode).toBeNull();
    expect(event.trace.notes.length).toBeGreaterThan(0);
    expect(event.value).not.toBeNull();
  });

  it("carries optional taxonomy metadata through selection, legality and outcome traces", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const offensePlay: OffensivePlayDefinition = {
      ...requireOffensePlay("off-quick-stick-spacing"),
      id: "off-quick-stick-spacing-empty-jet",
      label: "Quick Stick Spacing Empty Jet",
      variantGroupId: "quick-spacing-empty",
      packageTags: ["10P", "EMPTY", "TEMPO"],
    };
    const defensePlay: DefensivePlayDefinition = {
      ...requireDefensePlay("def-sim-pressure-creeper"),
      id: "def-sim-pressure-creeper-mint",
      label: "Sim Pressure Creeper Mint",
      variantGroupId: "sim-creeper-family",
      packageTags: ["NICKEL", "MINT", "PASSING_DOWN"],
      structure: {
        ...requireDefensePlay("def-sim-pressure-creeper").structure,
        defensiveConceptTag: "FIELD_CREEPER",
      },
    };
    const request = createResolutionRequestFromPlays({
      offensePlay,
      defensePlay,
      matchup: strongPassMatchup(),
      resolutionSeed: "taxonomy-metadata-trace",
    });
    const event = engine.resolve(request);

    expect(request.legality.isLegal).toBe(true);
    expect(event.penaltyCode).toBeNull();
    expect(event.trace.notes).toEqual(
      expect.arrayContaining([
        "Offense variant group quick-spacing-empty.",
        "Offense packages 10P, EMPTY, TEMPO.",
        "Defense variant group sim-creeper-family.",
        "Defense packages NICKEL, MINT, PASSING_DOWN.",
        "Defense concept FIELD_CREEPER.",
      ]),
    );
  });

  it("returns a penalty-style event when legality fails before resolution", () => {
    const engine = new DefaultOutcomeResolutionEngine();
    const baseRequest = createResolutionRequest({
      offensePlayId: "off-zone-inside-split",
      defensePlayId: "def-zone-cover-3-buzz",
      resolutionSeed: "illegal-before-resolution",
    });
    const illegalPreSnap = {
      ...baseRequest.preSnapStructure,
      offensePlayers: baseRequest.preSnapStructure.offensePlayers.map(
        (player: PlayerAlignmentSnapshot) =>
          player.playerId === "lg"
            ? { ...player, receiverDeclaration: "ELIGIBLE" as const }
            : player,
      ),
    };
    const event = engine.resolve({
      ...baseRequest,
      preSnapStructure: illegalPreSnap,
      legality: validatePreSnapStructure(illegalPreSnap),
    });

    expect(event.family).toBe("PENALTY");
    expect(event.penaltyCode).toBe("PRE_SNAP_ILLEGAL");
  });
});
