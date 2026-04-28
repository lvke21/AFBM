import { selectAiTeamStrategy } from "@/modules/gameplay/domain/ai-team-strategy";
import type { PreGameXFactorPlan } from "@/modules/gameplay/domain/pre-game-x-factor";

import { generateMatchStats } from "./match-engine";
import {
  buildProductionSimulationTeam,
  cloneProductionTeam,
  summarize,
} from "./production-qa-suite";
import type {
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationTeamContext,
} from "./simulation.types";

export type SimulationBalancingScenarioId =
  | "medium-vs-medium"
  | "strong-vs-medium"
  | "strong-vs-weak"
  | "weakened-strong-vs-medium";

export type SimulationBalancingScenario = {
  awayTeam: SimulationTeamContext;
  expectedFavoriteTeamId?: string;
  homeTeam: SimulationTeamContext;
  id: SimulationBalancingScenarioId;
  repetitions: number;
};

export type SimulationBalancingScenarioResult = {
  averageAwayScore: number;
  averageHomeScore: number;
  averageTotalScore: number;
  blowoutRate: number;
  favoriteWinRate: number | null;
  maxTotalScore: number;
  scoreStdDev: number;
  scenarioId: SimulationBalancingScenarioId;
  upsetRate: number | null;
};

export type SimulationBalancingRun = {
  results: SimulationBalancingScenarioResult[];
};

function cloneTeamWithId(team: SimulationTeamContext, id: string): SimulationTeamContext {
  const clone = cloneProductionTeam(team);

  return {
    ...clone,
    id,
    abbreviation: id,
    roster: clone.roster.map((player) => ({
      ...player,
      id: `${id}-${player.id}`,
      teamId: id,
    })),
  };
}

function applyAiGameplans(context: SimulationMatchContext): SimulationMatchContext {
  const homeStrategy = selectAiTeamStrategy({
    team: context.homeTeam,
    opponent: context.awayTeam,
    isHomeTeam: true,
  });
  const awayStrategy = selectAiTeamStrategy({
    team: context.awayTeam,
    opponent: context.homeTeam,
    isHomeTeam: false,
  });

  return {
    ...context,
    offenseXFactorPlan: homeStrategy.offenseXFactorPlan,
    defenseXFactorPlan: awayStrategy.defenseXFactorPlan,
    teamGameplans: {
      [context.homeTeam.id]: {
        aiStrategyArchetype: homeStrategy.archetype,
        offenseXFactorPlan: homeStrategy.offenseXFactorPlan,
        defenseXFactorPlan: homeStrategy.defenseXFactorPlan,
      },
      [context.awayTeam.id]: {
        aiStrategyArchetype: awayStrategy.archetype,
        offenseXFactorPlan: awayStrategy.offenseXFactorPlan,
        defenseXFactorPlan: awayStrategy.defenseXFactorPlan,
      },
    },
  };
}

function createScenarioContext(
  scenario: SimulationBalancingScenario,
  index: number,
): SimulationMatchContext {
  return applyAiGameplans({
    matchId: `${scenario.id}-${index + 1}`,
    saveGameId: "simulation-balancing-savegame",
    seasonId: "simulation-balancing-season",
    kind: "REGULAR_SEASON",
    simulationSeed: `simulation-balancing:${scenario.id}:${index + 1}`,
    seasonYear: 2026,
    week: (index % 18) + 1,
    scheduledAt: new Date(Date.UTC(2026, 8, 1 + (index % 28), 18, 0, 0)),
    homeTeam: cloneProductionTeam(scenario.homeTeam),
    awayTeam: cloneProductionTeam(scenario.awayTeam),
  });
}

function teamWon(result: MatchSimulationResult, teamId: string) {
  if (result.homeTeam.teamId === teamId) {
    return result.homeScore > result.awayScore;
  }

  return result.awayScore > result.homeScore;
}

function scoreForTeam(result: MatchSimulationResult, teamId: string) {
  return result.homeTeam.teamId === teamId ? result.homeScore : result.awayScore;
}

function weakenTeam(team: SimulationTeamContext): SimulationTeamContext {
  const clone = cloneProductionTeam(team);

  for (const player of clone.roster) {
    if (player.rosterStatus !== "STARTER") {
      continue;
    }

    player.fatigue = Math.max(player.fatigue, 40);
  }

  return clone;
}

export function createDefaultBalancingScenarios(
  repetitions = 120,
): SimulationBalancingScenario[] {
  const strong = cloneTeamWithId(
    buildProductionSimulationTeam("STR", "Strong City", "Anchors", 4, 84),
    "STR",
  );
  const medium = cloneTeamWithId(
    buildProductionSimulationTeam("MED", "Middle City", "Comets", 2, 76),
    "MED",
  );
  const mediumPeer = cloneTeamWithId(
    buildProductionSimulationTeam("MPR", "Peer City", "Pilots", 6, 75),
    "MPR",
  );
  const weak = cloneTeamWithId(
    buildProductionSimulationTeam("WEK", "Weak City", "Rivals", 3, 68),
    "WEK",
  );

  return [
    {
      id: "strong-vs-weak",
      homeTeam: strong,
      awayTeam: weak,
      expectedFavoriteTeamId: strong.id,
      repetitions,
    },
    {
      id: "medium-vs-medium",
      homeTeam: medium,
      awayTeam: mediumPeer,
      expectedFavoriteTeamId: undefined,
      repetitions,
    },
    {
      id: "strong-vs-medium",
      homeTeam: strong,
      awayTeam: medium,
      expectedFavoriteTeamId: strong.id,
      repetitions,
    },
    {
      id: "weakened-strong-vs-medium",
      homeTeam: weakenTeam(strong),
      awayTeam: medium,
      expectedFavoriteTeamId: strong.id,
      repetitions,
    },
  ];
}

function summarizeScenario(scenario: SimulationBalancingScenario): SimulationBalancingScenarioResult {
  const results = Array.from({ length: scenario.repetitions }, (_, index) =>
    generateMatchStats(createScenarioContext(scenario, index)),
  );
  const totalScores = results.map((result) => result.homeScore + result.awayScore);
  const scoreMargins = results.map((result) => Math.abs(result.homeScore - result.awayScore));
  const homeScores = results.map((result) => result.homeScore);
  const awayScores = results.map((result) => result.awayScore);
  const favoriteWins = scenario.expectedFavoriteTeamId
    ? results.filter((result) => teamWon(result, scenario.expectedFavoriteTeamId ?? "")).length
    : null;
  const favoriteWinRate =
    favoriteWins == null ? null : favoriteWins / Math.max(1, scenario.repetitions);
  const favoriteScore = scenario.expectedFavoriteTeamId
    ? results.map((result) => scoreForTeam(result, scenario.expectedFavoriteTeamId ?? ""))
    : [];
  const opponentScore = scenario.expectedFavoriteTeamId
    ? results.map((result) =>
        scoreForTeam(
          result,
          result.homeTeam.teamId === scenario.expectedFavoriteTeamId
            ? result.awayTeam.teamId
            : result.homeTeam.teamId,
        ),
      )
    : [];
  const favoriteLossesByScore =
    scenario.expectedFavoriteTeamId == null
      ? null
      : favoriteScore.filter((score, index) => score < (opponentScore[index] ?? 0)).length;

  return {
    scenarioId: scenario.id,
    averageHomeScore: Number(summarize(homeScores).avg.toFixed(2)),
    averageAwayScore: Number(summarize(awayScores).avg.toFixed(2)),
    averageTotalScore: Number(summarize(totalScores).avg.toFixed(2)),
    blowoutRate: Number(
      (scoreMargins.filter((margin) => margin >= 24).length / scenario.repetitions).toFixed(3),
    ),
    favoriteWinRate:
      favoriteWinRate == null ? null : Number(favoriteWinRate.toFixed(3)),
    maxTotalScore: Math.max(...totalScores),
    scoreStdDev: Number(summarize(totalScores).stdDev.toFixed(2)),
    upsetRate:
      favoriteLossesByScore == null
        ? null
        : Number((favoriteLossesByScore / scenario.repetitions).toFixed(3)),
  };
}

export function runSimulationBalancingBatch(input?: {
  repetitions?: number;
  scenarios?: SimulationBalancingScenario[];
}): SimulationBalancingRun {
  const scenarios = input?.scenarios ?? createDefaultBalancingScenarios(input?.repetitions);

  return {
    results: scenarios.map((scenario) => summarizeScenario(scenario)),
  };
}

export function describeBalancingPlan(plan: Partial<PreGameXFactorPlan> | null | undefined) {
  return `${plan?.offensiveFocus ?? "BALANCED"}/${plan?.aggression ?? "BALANCED"}/${plan?.tempoPlan ?? "NORMAL"}`;
}
