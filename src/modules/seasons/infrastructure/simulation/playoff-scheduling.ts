import { Prisma } from "@prisma/client";

import { resolveDecisiveWinnerTeamId } from "@/modules/seasons/application/simulation/engine-state-machine";
import { seasonSimulationCommandRepository } from "./season-simulation.command-repository";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export async function createPlayoffSemifinals(
  tx: Prisma.TransactionClient,
  input: {
    saveGameId: string;
    seasonId: string;
    week: number;
    baseDate: Date;
  },
) {
  const standings = await seasonSimulationCommandRepository.listPlayoffStandings(
    tx,
    input.seasonId,
  );

  if (standings.length < 4) {
    return false;
  }

  const existing = await seasonSimulationCommandRepository.countPlayoffMatches(
    tx,
    input.seasonId,
    input.week,
  );

  if (existing > 0) {
    return true;
  }

  const matchups = [
    { home: standings[0].team.id, away: standings[3].team.id },
    { home: standings[1].team.id, away: standings[2].team.id },
  ];

  await Promise.all(
    matchups.map((matchup, index) =>
      seasonSimulationCommandRepository.createMatch(tx, {
        saveGameId: input.saveGameId,
        seasonId: input.seasonId,
        week: input.week,
        kind: "PLAYOFF",
        homeTeamId: matchup.home,
        awayTeamId: matchup.away,
        scheduledAt: addDays(input.baseDate, 7 + index),
        stadiumName: "Playoff Football",
      }),
    ),
  );

  return true;
}

export async function createPlayoffFinal(
  tx: Prisma.TransactionClient,
  input: {
    saveGameId: string;
    seasonId: string;
    semifinalWeek: number;
    championshipWeek: number;
    baseDate: Date;
  },
) {
  const existing = await seasonSimulationCommandRepository.countPlayoffMatches(
    tx,
    input.seasonId,
    input.championshipWeek,
  );

  if (existing > 0) {
    return true;
  }

  const semifinals = await seasonSimulationCommandRepository.listCompletedPlayoffMatches(
    tx,
    input.seasonId,
    input.semifinalWeek,
  );

  if (semifinals.length < 2) {
    return false;
  }

  const winnerIds = semifinals.map((match) => {
    const winnerId = resolveDecisiveWinnerTeamId({
      homeTeamId: match.homeTeam.id,
      awayTeamId: match.awayTeam.id,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    });

    if (!winnerId) {
      throw new Error(`Playoff semifinal ${match.id} ended without a decisive winner`);
    }

    return winnerId;
  });
  const winnerStats = await seasonSimulationCommandRepository.listWinnerSeasonStats(
    tx,
    input.seasonId,
    winnerIds,
  );
  const homeTeamId = winnerStats[0]?.teamId ?? winnerIds[0];
  const awayTeamId =
    winnerStats.find((entry) => entry.teamId !== homeTeamId)?.teamId ?? winnerIds[1];

  await seasonSimulationCommandRepository.createMatch(tx, {
    saveGameId: input.saveGameId,
    seasonId: input.seasonId,
    week: input.championshipWeek,
    kind: "PLAYOFF",
    homeTeamId,
    awayTeamId,
    scheduledAt: addDays(input.baseDate, 7),
    stadiumName: "Championship Bowl",
  });

  return true;
}
