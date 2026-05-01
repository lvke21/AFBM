import {
  measureAsyncPerformance,
  measureSyncPerformance,
} from "@/lib/observability/performance";
import { createRng, type SeededRng } from "@/lib/random/seeded-rng";
import { MatchStatus, SeasonPhase, type SeasonPhase as SeasonPhaseValue } from "@/modules/shared/domain/enums";

import { assertTeamCanSimulate } from "./simulation/depth-chart";
import {
  assertCurrentSeasonIsActive,
  assertSeasonCanSimulate,
  assertWeekMatchesMatchSeasonPhase,
  buildSeasonTransition,
} from "./simulation/engine-state-machine";
import { generateMatchStats } from "./simulation/match-engine";
import { buildMatchContext } from "../infrastructure/simulation/match-context";
import { persistMatchResult } from "../infrastructure/simulation/match-result-persistence";
import {
  createPlayoffFinal,
  createPlayoffSemifinals,
} from "../infrastructure/simulation/playoff-scheduling";
import {
  completeSimulationOrchestratorStep,
  createSimulationOrchestratorSnapshot,
  failSimulationOrchestratorStep,
  setSimulationOrchestratorMatchIds,
  skipSimulationOrchestratorStep,
  startSimulationOrchestratorStep,
  type SimulationOrchestratorSnapshot,
  type SimulationOrchestratorStepId,
} from "./simulation/simulation-orchestrator";
import { ensureSimulationStatAnchors } from "../infrastructure/simulation/stat-anchors";
import { runWeeklyPreparation } from "../infrastructure/simulation/weekly-preparation";
import { seasonSimulationCommandRepository } from "../infrastructure/simulation/season-simulation.command-repository";
import { seasonSimulationRepository } from "../infrastructure/simulation/season-simulation.repository";

type SimulateSeasonWeekInput = {
  userId: string;
  saveGameId: string;
  seasonId: string;
};

type SimulateSeasonWeekOptions = {
  rng?: SeededRng;
};

type SimulateSeasonWeekResult = {
  seasonId: string;
  simulatedWeek: number;
  simulatedMatchCount: number;
  phase: SeasonPhase;
  nextWeek: number;
  orchestrator: SimulationOrchestratorSnapshot;
};

const WEEK_SIMULATION_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export async function simulateSeasonWeekForUser({
  userId,
  saveGameId,
  seasonId,
}: SimulateSeasonWeekInput, options: SimulateSeasonWeekOptions = {}): Promise<SimulateSeasonWeekResult | null> {
  const season = await seasonSimulationRepository.findSeasonHeaderForUser(
    userId,
    saveGameId,
    seasonId,
  );

  if (!season) {
    return null;
  }

  assertCurrentSeasonIsActive(season.id, season.saveGame.currentSeasonId);
  const seasonIsSimulatable = assertSeasonCanSimulate(season.phase);

  let matches = await seasonSimulationRepository.listWeekMatchesForSimulation(
    saveGameId,
    seasonId,
    season.week,
    [MatchStatus.SCHEDULED],
  );
  let orchestrator = createSimulationOrchestratorSnapshot({
    saveGameId,
    seasonId,
    week: season.week,
    matchIds: matches.map((match) => match.id),
  });

  if (matches.length === 0 || !seasonIsSimulatable) {
    orchestrator = skipRemainingSimulationSteps(
      orchestrator,
      "No scheduled simulatable matches remain for this week",
    );

    return {
      seasonId,
      simulatedWeek: season.week,
      simulatedMatchCount: 0,
      phase: season.phase,
      nextWeek: season.week,
      orchestrator,
    };
  }

  const recoveryCutoff = matches[0]?.scheduledAt;

  if (recoveryCutoff) {
    await runWeeklyPreparation({
      saveGameId,
      seasonId,
      week: season.week,
      recoveryCutoff,
    });

    matches = await seasonSimulationRepository.listWeekMatchesForSimulation(
      saveGameId,
      seasonId,
      season.week,
      [MatchStatus.SCHEDULED],
    );
    orchestrator = setSimulationOrchestratorMatchIds(
      orchestrator,
      matches.map((match) => match.id),
    );
  }

  await ensureSimulationStatAnchors({
    saveGameId,
    seasonId,
    matches,
  });

  matches = await seasonSimulationRepository.listWeekMatchesForSimulation(
    saveGameId,
    seasonId,
    season.week,
    [MatchStatus.SCHEDULED],
  );
  orchestrator = setSimulationOrchestratorMatchIds(
    orchestrator,
    matches.map((match) => match.id),
  );

  const staleBefore = new Date(Date.now() - WEEK_SIMULATION_LOCK_TIMEOUT_MS);
  orchestrator = startSimulationOrchestratorStep(orchestrator, "lock");
  const lockAcquired = await seasonSimulationCommandRepository.runInTransaction(async (tx) => {
    await seasonSimulationCommandRepository.releaseStaleWeekSimulationLocks(
      tx,
      saveGameId,
      seasonId,
      season.week,
      staleBefore,
    );

    const inProgressCount = await seasonSimulationCommandRepository.countWeekMatchesByStatus(
      tx,
      saveGameId,
      seasonId,
      season.week,
      MatchStatus.IN_PROGRESS,
    );

    if (inProgressCount > 0) {
      throw new Error("This season week is already being simulated");
    }

    const scheduledCount = await seasonSimulationCommandRepository.countWeekMatchesByStatus(
      tx,
      saveGameId,
      seasonId,
      season.week,
      MatchStatus.SCHEDULED,
    );

    if (scheduledCount === 0) {
      return false;
    }

    const lockResult = await seasonSimulationCommandRepository.markWeekMatchesInProgress(
      tx,
      saveGameId,
      seasonId,
      season.week,
    );

    if (lockResult.count !== scheduledCount) {
      throw new Error("Unable to lock all scheduled matches for simulation");
    }

    return true;
  });
  orchestrator = lockAcquired
    ? completeSimulationOrchestratorStep(orchestrator, "lock")
    : skipSimulationOrchestratorStep(
        orchestrator,
        "lock",
        "No scheduled matches remained after preparation",
      );

  if (!lockAcquired) {
    orchestrator = skipRemainingSimulationSteps(
      orchestrator,
      "No scheduled matches remained after preparation",
    );

    return {
      seasonId,
      simulatedWeek: season.week,
      simulatedMatchCount: 0,
      phase: season.phase,
      nextWeek: season.week,
      orchestrator,
    };
  }

  let seasonTransition!: {
    phase: SeasonPhaseValue;
    week: number;
    endsAt: Date | undefined;
  };
  let activeOrchestratorStep: SimulationOrchestratorStepId | null = null;

  try {
    matches = await seasonSimulationRepository.listWeekMatchesForSimulation(
      saveGameId,
      seasonId,
      season.week,
      [MatchStatus.IN_PROGRESS],
    );
    orchestrator = setSimulationOrchestratorMatchIds(
      orchestrator,
      matches.map((match) => match.id),
    );
    assertWeekMatchesMatchSeasonPhase(
      season.phase,
      matches.map((match) => ({
        id: match.id,
        kind: match.kind,
        status: MatchStatus.IN_PROGRESS,
      })),
      MatchStatus.IN_PROGRESS,
    );

    const contexts = matches.map((match) => buildMatchContext(season.year, match));
    const simulationStartTime = new Date();

    await seasonSimulationCommandRepository.runInTransaction(async (tx) => {
      for (const context of contexts) {
        await seasonSimulationCommandRepository.markMatchSimulationStarted(
          tx,
          context.matchId,
          context.simulationSeed,
          simulationStartTime,
        );
      }
    });

    activeOrchestratorStep = "simulate";
    orchestrator = startSimulationOrchestratorStep(orchestrator, "simulate");
    for (const context of contexts) {
      assertTeamCanSimulate(context.homeTeam, context.simulationSeed);
      assertTeamCanSimulate(context.awayTeam, context.simulationSeed);
    }

    const results = measureSyncPerformance(
      {
        area: "simulation",
        metadata: {
          matchCount: contexts.length,
          operationScope: "season-week",
          week: season.week,
        },
        operation: "generate-week-match-results",
        resultMetadata: (result) => ({
          resultCount: result.length,
        }),
      },
      () => contexts.map((context) =>
        generateMatchStats(
          context,
          options.rng
            ? options.rng.fork(`match:${context.matchId}:${context.simulationSeed}`)
            : createRng(context.simulationSeed),
        ),
      ),
    );
    orchestrator = completeSimulationOrchestratorStep(orchestrator, "simulate");
    activeOrchestratorStep = null;
    const seasonLengthWeeks = season.saveGame.settings?.seasonLengthWeeks ?? season.week;
    const transitionBaseDate =
      matches[matches.length - 1]?.scheduledAt ?? recoveryCutoff ?? new Date();
    let createdPlayoffs = false;
    let createdFinal = false;
    const transitionTime = new Date();

    activeOrchestratorStep = "persist-game-output";
    orchestrator = startSimulationOrchestratorStep(orchestrator, "persist-game-output");
    await measureAsyncPerformance(
      {
        area: "simulation",
        metadata: {
          matchCount: contexts.length,
          operationScope: "season-week",
          week: season.week,
        },
        operation: "persist-week-match-results",
      },
      () => seasonSimulationCommandRepository.runInTransaction(async (tx) => {
        for (let index = 0; index < contexts.length; index += 1) {
          await persistMatchResult(tx, contexts[index], results[index]);
        }

        if (season.phase === SeasonPhase.REGULAR_SEASON && season.week >= seasonLengthWeeks) {
          createdPlayoffs = await createPlayoffSemifinals(tx, {
            saveGameId,
            seasonId,
            week: season.week + 1,
            baseDate: transitionBaseDate,
          });
        } else if (season.phase === SeasonPhase.PLAYOFFS) {
          createdFinal = await createPlayoffFinal(tx, {
            saveGameId,
            seasonId,
            semifinalWeek: season.week,
            championshipWeek: season.week + 1,
            baseDate: transitionBaseDate,
          });
        }

        seasonTransition = buildSeasonTransition({
          currentPhase: season.phase,
          currentWeek: season.week,
          seasonLengthWeeks,
          createdPlayoffs,
          createdFinal,
          transitionTime,
        });

        await seasonSimulationCommandRepository.updateSeason(tx, season.id, {
          phase: seasonTransition.phase,
          week: seasonTransition.week,
          endsAt: seasonTransition.endsAt,
        });

        await seasonSimulationCommandRepository.touchSaveGame(tx, saveGameId);
      }),
    );
    orchestrator = completeSimulationOrchestratorStep(orchestrator, "persist-game-output");
    activeOrchestratorStep = "persist-stats";
    orchestrator = startSimulationOrchestratorStep(orchestrator, "persist-stats");
    orchestrator = completeSimulationOrchestratorStep(orchestrator, "persist-stats");
    activeOrchestratorStep = null;
    orchestrator = skipSimulationOrchestratorStep(
      orchestrator,
      "generate-readmodels",
      "Prisma readmodels are query-derived after match output and stats persistence",
    );
    orchestrator = completeSimulationOrchestratorStep(orchestrator, "unlock");

    return {
      seasonId,
      simulatedWeek: season.week,
      simulatedMatchCount: results.length,
      phase: seasonTransition.phase,
      nextWeek: seasonTransition.week,
      orchestrator,
    };
  } catch (error) {
    if (activeOrchestratorStep) {
      orchestrator = failSimulationOrchestratorStep(orchestrator, activeOrchestratorStep, error);
    }
    orchestrator = startSimulationOrchestratorStep(orchestrator, "unlock");
    await seasonSimulationCommandRepository.releaseWeekSimulationLock(
      saveGameId,
      seasonId,
      season.week,
    );
    orchestrator = completeSimulationOrchestratorStep(orchestrator, "unlock");
    throw error;
  }
}

export function simulateWeek(
  input: SimulateSeasonWeekInput,
  rng: SeededRng = createRng(`season-week:${input.saveGameId}:${input.seasonId}`),
) {
  return simulateSeasonWeekForUser(input, { rng });
}

function skipRemainingSimulationSteps(
  orchestrator: SimulationOrchestratorSnapshot,
  reason: string,
) {
  return orchestrator.steps
    .filter((step) => step.status === "PENDING")
    .reduce(
      (snapshot, step) => skipSimulationOrchestratorStep(snapshot, step.id, reason),
      orchestrator,
    );
}
