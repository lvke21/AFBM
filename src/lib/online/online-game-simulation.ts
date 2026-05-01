import {
  simulateMatch,
  type MinimalMatchTeam,
} from "@/modules/gameplay/application/minimal-match-simulation";

import type {
  OnlineContractPlayer,
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

function normalizePositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

function getActiveRosterRating(roster: OnlineContractPlayer[] | undefined) {
  const activePlayers = (roster ?? []).filter(
    (player) => player.status === "active" && Number.isFinite(player.overall),
  );

  if (activePlayers.length === 0) {
    return null;
  }

  return Math.round(
    activePlayers.reduce((sum, player) => sum + player.overall, 0) / activePlayers.length,
  );
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

  const rosterRating = getActiveRosterRating(user?.contractRoster);
  const warnings: string[] = [];

  if (rosterRating === null) {
    warnings.push(
      `Team ${teamId} nutzt Rating-Fallback 70, weil kein aktives Online-Roster vorhanden ist.`,
    );
  }

  return {
    id: team?.id ?? user?.teamId ?? teamId,
    name: user?.teamDisplayName ?? user?.teamName ?? team?.name ?? teamId,
    rating: rosterRating ?? 70,
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
      simulationWarnings: warnings.length > 0 ? warnings : undefined,
      status: "completed",
      tiebreakerApplied: simulated.tiebreakerApplied,
      week: game.week,
      winnerTeamId: winnerTeam.id,
      winnerTeamName: winnerTeam.name,
    },
  };
}
