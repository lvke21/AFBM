import {
  simulateMatch,
  type MinimalMatchTeam,
} from "@/modules/gameplay/application/minimal-match-simulation";

import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
  OnlineLeague,
  OnlineMatchResult,
} from "./online-league-types";

export type OnlineGameSimulationGame = {
  awayTeamId: string;
  awayTeamName?: string;
  id: string;
  homeTeamId: string;
  homeTeamName?: string;
  season?: number;
  week: number;
};

export type OnlineGameSimulationErrorCode =
  | "invalid_game"
  | "missing_away_team"
  | "missing_home_team";

export type OnlineGameSimulationError = {
  code: OnlineGameSimulationErrorCode;
  message: string;
};

export type OnlineGameSimulationResult = OnlineMatchResult & {
  gameId: string;
  loserTeamId: string;
  loserTeamName: string;
};

export type SimulateOnlineGameResult =
  | {
      ok: true;
      result: OnlineGameSimulationResult;
    }
  | {
      error: OnlineGameSimulationError;
      ok: false;
    };

export type SimulateOnlineGameOptions = {
  simulatedAt?: string;
  simulatedByUserId?: string;
};

type OnlineSimulationTeam = MinimalMatchTeam & {
  id: string;
  name: string;
  warnings: string[];
};

const ONLINE_SIMULATION_REQUIRED_STARTER_POSITIONS = ["QB"] as const;
const MISSING_REQUIRED_STARTER_PENALTY = 8;

function normalizePositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

function clampRating(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getAverageActiveRosterRating(roster: OnlineContractPlayer[]) {
  return Math.round(roster.reduce((sum, player) => sum + player.overall, 0) / roster.length);
}

function addWeightedPlayerRating(
  aggregate: { total: number; weight: number },
  player: OnlineContractPlayer | undefined,
  weight: number,
) {
  if (!player) {
    return;
  }

  aggregate.total += player.overall * weight;
  aggregate.weight += weight;
}

function getDepthChartWeightedRosterRating(
  activePlayers: OnlineContractPlayer[],
  depthChart: OnlineDepthChartEntry[] | undefined,
) {
  if (!depthChart || depthChart.length === 0) {
    return getAverageActiveRosterRating(activePlayers);
  }

  const activePlayersById = new Map(activePlayers.map((player) => [player.playerId, player]));
  const weighted = { total: 0, weight: 0 };
  const usedPlayerIds = new Set<string>();

  for (const entry of depthChart) {
    const starter = activePlayersById.get(entry.starterPlayerId);

    if (starter) {
      addWeightedPlayerRating(weighted, starter, 2.5);
      usedPlayerIds.add(starter.playerId);
    }

    for (const backupPlayerId of entry.backupPlayerIds) {
      const backup = activePlayersById.get(backupPlayerId);

      if (backup) {
        addWeightedPlayerRating(weighted, backup, 0.75);
        usedPlayerIds.add(backup.playerId);
      }
    }
  }

  for (const player of activePlayers) {
    if (!usedPlayerIds.has(player.playerId)) {
      addWeightedPlayerRating(weighted, player, 0.35);
    }
  }

  return weighted.weight > 0
    ? Math.round(weighted.total / weighted.weight)
    : getAverageActiveRosterRating(activePlayers);
}

function getMissingRequiredStarterPositions(
  activePlayers: OnlineContractPlayer[],
  depthChart: OnlineDepthChartEntry[] | undefined,
) {
  const activePlayersById = new Map(activePlayers.map((player) => [player.playerId, player]));
  const activePositions = new Set(activePlayers.map((player) => player.position));

  return ONLINE_SIMULATION_REQUIRED_STARTER_POSITIONS.filter((position) => {
    if (!activePositions.has(position)) {
      return true;
    }

    if (!depthChart || depthChart.length === 0) {
      return false;
    }

    const starterEntry = depthChart.find((entry) => entry.position === position);
    const starter = starterEntry ? activePlayersById.get(starterEntry.starterPlayerId) : null;

    return starter?.position !== position;
  });
}

function getActiveRosterRating(
  roster: OnlineContractPlayer[] | undefined,
  depthChart: OnlineDepthChartEntry[] | undefined,
) {
  const activePlayers = (roster ?? []).filter(
    (player) => player.status === "active" && Number.isFinite(player.overall),
  );

  if (activePlayers.length === 0) {
    return {
      rating: null,
      warnings: [],
    };
  }

  const missingRequiredStarterPositions = getMissingRequiredStarterPositions(
    activePlayers,
    depthChart,
  );
  const penalty = missingRequiredStarterPositions.length * MISSING_REQUIRED_STARTER_PENALTY;
  const baseRating = getDepthChartWeightedRosterRating(activePlayers, depthChart);

  return {
    rating: clampRating(baseRating - penalty),
    warnings: missingRequiredStarterPositions.map(
      (position) =>
        `Team-Staerke erhaelt -${MISSING_REQUIRED_STARTER_PENALTY}, weil kein aktiver ${position}-Starter gesetzt ist.`,
    ),
  };
}

export function adaptOnlineTeamToSimulationTeam(
  league: OnlineLeague,
  teamId: string,
): OnlineSimulationTeam | null {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  const user = league.users.find((candidate) => candidate.teamId === teamId);

  if (!team && !user) {
    return null;
  }

  const rosterRating = getActiveRosterRating(user?.contractRoster, user?.depthChart);
  const warnings: string[] = [...rosterRating.warnings];

  if (rosterRating.rating === null) {
    warnings.push(
      `Team ${teamId} nutzt Rating-Fallback 70, weil kein aktives Online-Roster vorhanden ist.`,
    );
  }

  return {
    id: team?.id ?? user?.teamId ?? teamId,
    name: user?.teamDisplayName ?? user?.teamName ?? team?.name ?? teamId,
    rating: rosterRating.rating ?? 70,
    warnings,
  };
}

export function simulateOnlineGame(
  game: OnlineGameSimulationGame,
  league: OnlineLeague,
  options: SimulateOnlineGameOptions = {},
): SimulateOnlineGameResult {
  if (!game.id || !game.homeTeamId || !game.awayTeamId || game.homeTeamId === game.awayTeamId) {
    return {
      error: {
        code: "invalid_game",
        message: "Online-Game ist ungültig oder enthält ein Self-Matchup.",
      },
      ok: false,
    };
  }

  const homeTeam = adaptOnlineTeamToSimulationTeam(league, game.homeTeamId);

  if (!homeTeam) {
    return {
      error: {
        code: "missing_home_team",
        message: `Home-Team ${game.homeTeamId} wurde in Liga ${league.id} nicht gefunden.`,
      },
      ok: false,
    };
  }

  const awayTeam = adaptOnlineTeamToSimulationTeam(league, game.awayTeamId);

  if (!awayTeam) {
    return {
      error: {
        code: "missing_away_team",
        message: `Away-Team ${game.awayTeamId} wurde in Liga ${league.id} nicht gefunden.`,
      },
      ok: false,
    };
  }

  const season = normalizePositiveInteger(game.season ?? league.currentSeason, 1);
  const simulatedAt = options.simulatedAt ?? new Date().toISOString();
  const simulated = simulateMatch(homeTeam, awayTeam, {
    seed: `online-game:${league.id}:s${season}:w${game.week}:${game.id}`,
  });
  const homeWon = simulated.winner === "A";
  const winnerTeam = homeWon ? homeTeam : awayTeam;
  const loserTeam = homeWon ? awayTeam : homeTeam;
  const warnings = [...homeTeam.warnings, ...awayTeam.warnings];

  return {
    ok: true,
    result: {
      awayScore: simulated.scoreB,
      awayStats: simulated.teamBStats,
      awayTeamId: awayTeam.id,
      awayTeamName: game.awayTeamName ?? awayTeam.name,
      createdAt: simulatedAt,
      gameId: game.id,
      homeScore: simulated.scoreA,
      homeStats: simulated.teamAStats,
      homeTeamId: homeTeam.id,
      homeTeamName: game.homeTeamName ?? homeTeam.name,
      loserTeamId: loserTeam.id,
      loserTeamName: loserTeam.name,
      matchId: game.id,
      season,
      simulatedAt,
      simulatedByUserId: options.simulatedByUserId ?? "admin",
      simulationWarnings: warnings,
      status: "completed",
      tiebreakerApplied: simulated.tiebreakerApplied,
      week: game.week,
      winnerTeamId: winnerTeam.id,
      winnerTeamName: winnerTeam.name,
    },
  };
}
