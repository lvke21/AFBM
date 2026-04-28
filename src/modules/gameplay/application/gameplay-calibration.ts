import type {
  CalibrationExpectation,
  CalibrationObservation,
} from "../domain/calibration";
import {
  resolveCompetitionRuleProfile,
  type CompetitionRuleset,
} from "../domain/competition-rules";
import type { GameSituationSnapshot } from "../domain/game-situation";
import type {
  DefensivePlayDefinition,
  DefensivePlayFamily,
  OffensivePlayDefinition,
  OffensivePlayFamily,
} from "../domain/play-library";
import type {
  SelectionMode,
  SelectionUsageMemory,
} from "../domain/play-selection";
import type {
  ResolvedPlayEvent,
  ResolutionMatchupSnapshot,
} from "../domain/play-resolution";
import { PLAY_LIBRARY_CATALOG, buildDefaultPlaybook } from "../infrastructure";
import { buildPreSnapStructureForPlay } from "./play-library-service";
import {
  DefaultPlaySelectionEngine,
  createSelectionStrategyProfile,
} from "./play-selection-engine";
import {
  DefaultOutcomeResolutionEngine,
  createNeutralResolutionMatchup,
} from "./outcome-resolution-engine";
import { validatePreSnapStructure } from "./pre-snap-legality-engine";

const RECENT_USAGE_WINDOW = 12;
const BASE_OFFENSE_PLAY_ID = "off-zone-inside-split";

type OutcomeCounters = {
  plays: number;
  yards: number;
  successes: number;
  turnovers: number;
  illegalPreSnap: number;
  passPlays: number;
  completions: number;
  sacks: number;
  interceptions: number;
  explosivePasses: number;
  runPlays: number;
  explosiveRuns: number;
};

type SelectionCounters = {
  offensePlayCounts: Record<string, number>;
  defensePlayCounts: Record<string, number>;
  offenseFamilyCounts: Partial<Record<OffensivePlayFamily, number>>;
  defenseFamilyCounts: Partial<Record<DefensivePlayFamily, number>>;
};

export type GameplayBatchMetrics = {
  plays: number;
  yardsPerPlay: number;
  successRate: number;
  turnoverRate: number;
  illegalPreSnapRate: number;
  runRate: number;
  completionRate: number;
  sackRate: number;
  interceptionRate: number;
  explosiveRunRate: number;
  explosivePassRate: number;
};

export type GameplaySelectionSummary = {
  offensePlayShares: Record<string, number>;
  defensePlayShares: Record<string, number>;
  offenseFamilyShares: Partial<Record<OffensivePlayFamily, number>>;
  defenseFamilyShares: Partial<Record<DefensivePlayFamily, number>>;
};

export type GameplayCalibrationScenario = {
  id: string;
  label: string;
  ruleset: CompetitionRuleset;
  iterations: number;
  situation: GameSituationSnapshot;
  offenseMode?: SelectionMode;
  defenseMode?: SelectionMode;
  offenseSchemeCode?: string | null;
  defenseSchemeCode?: string | null;
  matchup?: ResolutionMatchupSnapshot;
  offenseUsageMemory?: SelectionUsageMemory;
  defenseUsageMemory?: SelectionUsageMemory;
};

export type GameplayCalibrationScenarioReport = {
  scenario: GameplayCalibrationScenario;
  metrics: GameplayBatchMetrics;
  selection: GameplaySelectionSummary;
};

export type GameplayCalibrationReport = {
  ruleset: CompetitionRuleset;
  scenarios: GameplayCalibrationScenarioReport[];
  aggregate: GameplayBatchMetrics;
  observations: CalibrationObservation[];
};

function baseOutcomeCounters(): OutcomeCounters {
  return {
    plays: 0,
    yards: 0,
    successes: 0,
    turnovers: 0,
    illegalPreSnap: 0,
    passPlays: 0,
    completions: 0,
    sacks: 0,
    interceptions: 0,
    explosivePasses: 0,
    runPlays: 0,
    explosiveRuns: 0,
  };
}

function baseSelectionCounters(): SelectionCounters {
  return {
    offensePlayCounts: {},
    defensePlayCounts: {},
    offenseFamilyCounts: {},
    defenseFamilyCounts: {},
  };
}

function cloneUsageMemory(memory?: SelectionUsageMemory): SelectionUsageMemory | undefined {
  if (!memory) {
    return undefined;
  }

  return {
    totalCalls: memory.totalCalls,
    playCallCounts: { ...memory.playCallCounts },
    familyCallCounts: { ...memory.familyCallCounts },
    recentPlayIds: [...memory.recentPlayIds],
    recentFamilyCalls: [...memory.recentFamilyCalls],
  };
}

function appendUsageMemory<TFamily extends OffensivePlayFamily | DefensivePlayFamily>(
  memory: SelectionUsageMemory | undefined,
  input: {
    playId: string;
    family: TFamily;
  },
) {
  const nextMemory = cloneUsageMemory(memory) ?? {
    totalCalls: 0,
    playCallCounts: {},
    familyCallCounts: {},
    recentPlayIds: [],
    recentFamilyCalls: [],
  };

  nextMemory.totalCalls += 1;
  nextMemory.playCallCounts[input.playId] =
    (nextMemory.playCallCounts[input.playId] ?? 0) + 1;
  nextMemory.familyCallCounts[input.family] =
    (nextMemory.familyCallCounts[input.family] ?? 0) + 1;
  nextMemory.recentPlayIds = [...nextMemory.recentPlayIds, input.playId].slice(
    -RECENT_USAGE_WINDOW,
  );
  nextMemory.recentFamilyCalls = [...nextMemory.recentFamilyCalls, input.family].slice(
    -RECENT_USAGE_WINDOW,
  );

  return nextMemory;
}

function incrementRecordCount<TKey extends string>(
  counts: Partial<Record<TKey, number>>,
  key: TKey,
) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function normalizeShares<TFamily extends string>(
  counts: Partial<Record<TFamily, number>>,
  total: number,
) {
  if (total === 0) {
    return {};
  }

  return Object.fromEntries(
    (Object.entries(counts) as Array<[TFamily, number]>).map(([key, value]) => [
      key,
      value / total,
    ]),
  ) as Partial<Record<TFamily, number>>;
}

function normalizeRecordShares(
  counts: Record<string, number>,
  total: number,
) {
  if (total === 0) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, value / total]),
  );
}

function deriveMetrics(counters: OutcomeCounters): GameplayBatchMetrics {
  return {
    plays: counters.plays,
    yardsPerPlay: counters.yards / Math.max(1, counters.plays),
    successRate: counters.successes / Math.max(1, counters.plays),
    turnoverRate: counters.turnovers / Math.max(1, counters.plays),
    illegalPreSnapRate: counters.illegalPreSnap / Math.max(1, counters.plays),
    runRate: counters.runPlays / Math.max(1, counters.plays),
    completionRate: counters.completions / Math.max(1, counters.passPlays),
    sackRate: counters.sacks / Math.max(1, counters.passPlays),
    interceptionRate: counters.interceptions / Math.max(1, counters.passPlays),
    explosiveRunRate: counters.explosiveRuns / Math.max(1, counters.runPlays),
    explosivePassRate: counters.explosivePasses / Math.max(1, counters.passPlays),
  };
}

function deriveSelectionSummary(
  counters: SelectionCounters,
  total: number,
): GameplaySelectionSummary {
  return {
    offensePlayShares: normalizeRecordShares(counters.offensePlayCounts, total),
    defensePlayShares: normalizeRecordShares(counters.defensePlayCounts, total),
    offenseFamilyShares: normalizeShares(counters.offenseFamilyCounts, total),
    defenseFamilyShares: normalizeShares(counters.defenseFamilyCounts, total),
  };
}

function mergeOutcomeCounters(
  aggregate: OutcomeCounters,
  current: OutcomeCounters,
) {
  aggregate.plays += current.plays;
  aggregate.yards += current.yards;
  aggregate.successes += current.successes;
  aggregate.turnovers += current.turnovers;
  aggregate.illegalPreSnap += current.illegalPreSnap;
  aggregate.passPlays += current.passPlays;
  aggregate.completions += current.completions;
  aggregate.sacks += current.sacks;
  aggregate.interceptions += current.interceptions;
  aggregate.explosivePasses += current.explosivePasses;
  aggregate.runPlays += current.runPlays;
  aggregate.explosiveRuns += current.explosiveRuns;
}

function requireOffensePlay(playId: string): OffensivePlayDefinition {
  const play = PLAY_LIBRARY_CATALOG.offensePlays.find((entry) => entry.id === playId);

  if (!play) {
    throw new Error(`Missing offense play ${playId}`);
  }

  return play;
}

function createCalibrationContextSituation(
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

function observeEvent(counters: OutcomeCounters, event: ResolvedPlayEvent) {
  counters.plays += 1;
  counters.yards += event.yards;

  if (event.success) {
    counters.successes += 1;
  }

  if (event.turnover) {
    counters.turnovers += 1;
  }

  if (event.family === "PENALTY") {
    counters.illegalPreSnap += 1;
  }

  if (event.path === "PASS") {
    counters.passPlays += 1;

    if (event.completion) {
      counters.completions += 1;
    }

    if (event.family === "SACK") {
      counters.sacks += 1;
    }

    if (event.turnoverType === "INTERCEPTION") {
      counters.interceptions += 1;
    }

    if (event.explosive) {
      counters.explosivePasses += 1;
    }

    return;
  }

  counters.runPlays += 1;

  if (event.explosive) {
    counters.explosiveRuns += 1;
  }
}

function recordSelection(
  counters: SelectionCounters,
  offensePlay: OffensivePlayDefinition,
  defensePlay: DefensivePlayDefinition,
) {
  counters.offensePlayCounts[offensePlay.id] =
    (counters.offensePlayCounts[offensePlay.id] ?? 0) + 1;
  counters.defensePlayCounts[defensePlay.id] =
    (counters.defensePlayCounts[defensePlay.id] ?? 0) + 1;
  incrementRecordCount(counters.offenseFamilyCounts, offensePlay.family);
  incrementRecordCount(counters.defenseFamilyCounts, defensePlay.family);
}

export function createDefaultCalibrationExpectations(
  ruleset: CompetitionRuleset,
): CalibrationExpectation[] {
  if (ruleset === "NFL_PRO") {
    return [
      {
        metric: "YARDS_PER_PLAY",
        lowerBound: 4.3,
        upperBound: 6.2,
        minimumSampleSize: 1200,
      },
      {
        metric: "COMPLETION_RATE",
        lowerBound: 0.55,
        upperBound: 0.74,
        minimumSampleSize: 400,
      },
      {
        metric: "RUN_RATE",
        lowerBound: 0.32,
        upperBound: 0.58,
        minimumSampleSize: 1200,
      },
      {
        metric: "SACK_RATE",
        lowerBound: 0.04,
        upperBound: 0.13,
        minimumSampleSize: 400,
      },
      {
        metric: "INTERCEPTION_RATE",
        lowerBound: 0.012,
        upperBound: 0.055,
        minimumSampleSize: 400,
      },
      {
        metric: "TURNOVER_RATE",
        lowerBound: 0.015,
        upperBound: 0.08,
        minimumSampleSize: 1200,
      },
      {
        metric: "EXPLOSIVE_RUN_RATE",
        lowerBound: 0.06,
        upperBound: 0.18,
        minimumSampleSize: 350,
      },
      {
        metric: "EXPLOSIVE_PASS_RATE",
        lowerBound: 0.07,
        upperBound: 0.22,
        minimumSampleSize: 400,
      },
    ];
  }

  return [];
}

export function buildCalibrationObservations(
  metrics: GameplayBatchMetrics,
): CalibrationObservation[] {
  return [
    {
      metric: "YARDS_PER_PLAY",
      value: metrics.yardsPerPlay,
      sampleSize: metrics.plays,
    },
    {
      metric: "COMPLETION_RATE",
      value: metrics.completionRate,
      sampleSize: Math.round(metrics.plays * (1 - metrics.runRate)),
    },
    {
      metric: "RUN_RATE",
      value: metrics.runRate,
      sampleSize: metrics.plays,
    },
    {
      metric: "SACK_RATE",
      value: metrics.sackRate,
      sampleSize: Math.round(metrics.plays * (1 - metrics.runRate)),
    },
    {
      metric: "INTERCEPTION_RATE",
      value: metrics.interceptionRate,
      sampleSize: Math.round(metrics.plays * (1 - metrics.runRate)),
    },
    {
      metric: "TURNOVER_RATE",
      value: metrics.turnoverRate,
      sampleSize: metrics.plays,
    },
    {
      metric: "EXPLOSIVE_RUN_RATE",
      value: metrics.explosiveRunRate,
      sampleSize: Math.round(metrics.plays * metrics.runRate),
    },
    {
      metric: "EXPLOSIVE_PASS_RATE",
      value: metrics.explosivePassRate,
      sampleSize: Math.round(metrics.plays * (1 - metrics.runRate)),
    },
  ];
}

export function createDefaultCalibrationScenarios(
  ruleset: CompetitionRuleset,
): GameplayCalibrationScenario[] {
  return [
    {
      id: "early-down-neutral",
      label: "1st & 10 Neutral",
      ruleset,
      iterations: 600,
      situation: createCalibrationContextSituation(ruleset),
    },
    {
      id: "shot-window",
      label: "2nd & Short Breaker",
      ruleset,
      iterations: 250,
      situation: createCalibrationContextSituation(ruleset, {
        down: 2,
        yardsToGo: 2,
        distanceBucket: "SHORT",
        fieldZone: "MIDFIELD",
      }),
    },
    {
      id: "third-short",
      label: "3rd & Short",
      ruleset,
      iterations: 250,
      situation: createCalibrationContextSituation(ruleset, {
        down: 3,
        yardsToGo: 2,
        distanceBucket: "SHORT",
        fieldZone: "MIDFIELD",
      }),
    },
    {
      id: "third-medium",
      label: "3rd & Medium",
      ruleset,
      iterations: 250,
      situation: createCalibrationContextSituation(ruleset, {
        down: 3,
        yardsToGo: 6,
        distanceBucket: "MEDIUM",
        fieldZone: "MIDFIELD",
      }),
    },
    {
      id: "third-long",
      label: "3rd & Long",
      ruleset,
      iterations: 250,
      situation: createCalibrationContextSituation(ruleset, {
        down: 3,
        yardsToGo: 11,
        distanceBucket: "LONG",
        fieldZone: "MIDFIELD",
      }),
    },
    {
      id: "red-zone",
      label: "Red Zone",
      ruleset,
      iterations: 220,
      situation: createCalibrationContextSituation(ruleset, {
        down: 2,
        yardsToGo: 6,
        distanceBucket: "MEDIUM",
        fieldZone: "LOW_RED_ZONE",
        ballOnYardLine: 92,
      }),
    },
    {
      id: "four-down-territory",
      label: "Four-down Territory",
      ruleset,
      iterations: 100,
      situation: createCalibrationContextSituation(ruleset, {
        down: 3,
        yardsToGo: 3,
        distanceBucket: "SHORT",
        fieldZone: "PLUS_TERRITORY",
        ballOnYardLine: 62,
        clockBucket: "LATE",
        scoreBucket: "TRAILING",
        offenseScore: 20,
        defenseScore: 23,
        secondsRemainingInGame: 250,
        offenseTimeouts: 1,
      }),
      offenseMode: "BALANCED",
      defenseMode: "BALANCED",
    },
    {
      id: "two-minute",
      label: "Two Minute",
      ruleset,
      iterations: 80,
      situation: createCalibrationContextSituation(ruleset, {
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
      }),
    },
  ];
}

export function simulateGameplayCalibrationScenario(input: {
  scenario: GameplayCalibrationScenario;
  selectionEngine?: DefaultPlaySelectionEngine;
  outcomeEngine?: DefaultOutcomeResolutionEngine;
}) {
  const selectionEngine =
    input.selectionEngine ?? new DefaultPlaySelectionEngine();
  const outcomeEngine =
    input.outcomeEngine ?? new DefaultOutcomeResolutionEngine();
  const offensePlaybook = buildDefaultPlaybook({
    teamId: "OFF",
    ruleset: input.scenario.ruleset,
  });
  const defensePlaybook = buildDefaultPlaybook({
    teamId: "DEF",
    ruleset: input.scenario.ruleset,
  });
  const basePreSnap = buildPreSnapStructureForPlay(
    requireOffensePlay(BASE_OFFENSE_PLAY_ID),
    input.scenario.situation,
  );
  const outcomeCounters = baseOutcomeCounters();
  const selectionCounters = baseSelectionCounters();
  let offenseUsageMemory = cloneUsageMemory(input.scenario.offenseUsageMemory);
  let defenseUsageMemory = cloneUsageMemory(input.scenario.defenseUsageMemory);
  const matchup = input.scenario.matchup ?? createNeutralResolutionMatchup();

  for (let index = 0; index < input.scenario.iterations; index += 1) {
    const selectedPlayCall = selectionEngine.select({
      situation: input.scenario.situation,
      preSnapStructure: basePreSnap,
      offensePlaybook,
      defensePlaybook,
      offenseCandidates: PLAY_LIBRARY_CATALOG.offensePlays,
      defenseCandidates: PLAY_LIBRARY_CATALOG.defensePlays,
      offenseFatigueMultiplier: 1,
      defenseFatigueMultiplier: 1,
      offenseProfile: createSelectionStrategyProfile({
        side: "OFFENSE",
        mode: input.scenario.offenseMode ?? "BALANCED",
        schemeCode: input.scenario.offenseSchemeCode ?? "BALANCED_OFFENSE",
      }),
      defenseProfile: createSelectionStrategyProfile({
        side: "DEFENSE",
        mode: input.scenario.defenseMode ?? "BALANCED",
        schemeCode: input.scenario.defenseSchemeCode ?? "FOUR_THREE_FRONT",
      }),
      offenseUsageMemory,
      defenseUsageMemory,
      selectionSeed: `${input.scenario.id}:selection:${index}`,
    });
    const jointPreSnap = buildJointPreSnap(
      selectedPlayCall.offense.play,
      selectedPlayCall.defense.play,
      input.scenario.situation,
    );
    const legality = validatePreSnapStructure(jointPreSnap);
    const event = outcomeEngine.resolve({
      situation: input.scenario.situation,
      preSnapStructure: jointPreSnap,
      selectedPlayCall,
      legality,
      matchupFeatures: [],
      matchup,
      resolutionSeed: `${input.scenario.id}:resolution:${index}`,
    });

    recordSelection(
      selectionCounters,
      selectedPlayCall.offense.play,
      selectedPlayCall.defense.play,
    );
    observeEvent(outcomeCounters, event);
    offenseUsageMemory = appendUsageMemory(offenseUsageMemory, {
      playId: selectedPlayCall.offense.play.id,
      family: selectedPlayCall.offense.play.family,
    });
    defenseUsageMemory = appendUsageMemory(defenseUsageMemory, {
      playId: selectedPlayCall.defense.play.id,
      family: selectedPlayCall.defense.play.family,
    });
  }

  return {
    scenario: input.scenario,
    metrics: deriveMetrics(outcomeCounters),
    selection: deriveSelectionSummary(selectionCounters, input.scenario.iterations),
  } satisfies GameplayCalibrationScenarioReport;
}

export function simulateGameplayCalibrationReport(input: {
  ruleset: CompetitionRuleset;
  scenarios?: GameplayCalibrationScenario[];
  selectionEngine?: DefaultPlaySelectionEngine;
  outcomeEngine?: DefaultOutcomeResolutionEngine;
}) {
  const scenarios = input.scenarios ?? createDefaultCalibrationScenarios(input.ruleset);
  const aggregateOutcome = baseOutcomeCounters();
  const reports = scenarios.map((scenario) =>
    simulateGameplayCalibrationScenario({
      scenario,
      selectionEngine: input.selectionEngine,
      outcomeEngine: input.outcomeEngine,
    }),
  );

  for (const report of reports) {
    const counters = {
      plays: report.metrics.plays,
      yards: report.metrics.yardsPerPlay * report.metrics.plays,
      successes: report.metrics.successRate * report.metrics.plays,
      turnovers: report.metrics.turnoverRate * report.metrics.plays,
      illegalPreSnap: report.metrics.illegalPreSnapRate * report.metrics.plays,
      passPlays: (1 - report.metrics.runRate) * report.metrics.plays,
      completions:
        report.metrics.completionRate *
        (1 - report.metrics.runRate) *
        report.metrics.plays,
      sacks:
        report.metrics.sackRate *
        (1 - report.metrics.runRate) *
        report.metrics.plays,
      interceptions:
        report.metrics.interceptionRate *
        (1 - report.metrics.runRate) *
        report.metrics.plays,
      explosivePasses:
        report.metrics.explosivePassRate *
        (1 - report.metrics.runRate) *
        report.metrics.plays,
      runPlays: report.metrics.runRate * report.metrics.plays,
      explosiveRuns:
        report.metrics.explosiveRunRate *
        report.metrics.runRate *
        report.metrics.plays,
    };

    mergeOutcomeCounters(aggregateOutcome, counters);
  }

  const aggregate = deriveMetrics(aggregateOutcome);

  return {
    ruleset: input.ruleset,
    scenarios: reports,
    aggregate,
    observations: buildCalibrationObservations(aggregate),
  } satisfies GameplayCalibrationReport;
}
