import { formatRecord } from "@/lib/utils/format";
import type { SeasonOverview } from "@/modules/seasons/domain/season.types";
import { getRepositories } from "@/server/repositories";

import { resolveDecisiveWinnerTeamId } from "./simulation/engine-state-machine";

export async function getSeasonOverview(
  saveGameId: string,
  seasonId: string,
): Promise<SeasonOverview | null> {
  const season = await getRepositories().seasons.findBySaveGame(saveGameId, seasonId);

  if (!season) {
    return null;
  }

  const playoffMatches = season.matches.filter((match) => match.kind === "PLAYOFF");
  const championshipMatch =
    [...playoffMatches]
      .sort((left, right) => right.week - left.week)
      .find(
        (match) =>
          match.status === "COMPLETED" &&
          match.homeScore != null &&
          match.awayScore != null,
      ) ?? null;

  return {
    id: season.id,
    year: season.year,
    phase: season.phase,
    week: season.week,
    championName: championshipMatch
      ? (() => {
          const winnerId = resolveDecisiveWinnerTeamId({
            homeTeamId: championshipMatch.homeTeam.id,
            awayTeamId: championshipMatch.awayTeam.id,
            homeScore: championshipMatch.homeScore,
            awayScore: championshipMatch.awayScore,
          });

          if (winnerId === championshipMatch.homeTeam.id) {
            return `${championshipMatch.homeTeam.city} ${championshipMatch.homeTeam.nickname}`;
          }

          if (winnerId === championshipMatch.awayTeam.id) {
            return `${championshipMatch.awayTeam.city} ${championshipMatch.awayTeam.nickname}`;
          }

          return null;
        })()
      : null,
    playoffPicture: season.teamSeasonStats.slice(0, 4).map((standing, index) => ({
      seed: index + 1,
      teamId: standing.team.id,
      name: `${standing.team.city} ${standing.team.nickname}`,
      record: formatRecord(standing.wins, standing.losses, standing.ties),
    })),
    standings: season.teamSeasonStats.map((standing) => ({
      teamId: standing.team.id,
      name: `${standing.team.city} ${standing.team.nickname}`,
      abbreviation: standing.team.abbreviation,
      overallRating: standing.team.overallRating,
      record: formatRecord(standing.wins, standing.losses, standing.ties),
      pointsFor: standing.pointsFor,
      pointsAgainst: standing.pointsAgainst,
      touchdownsFor: standing.touchdownsFor,
      turnoversForced: standing.turnoversForced,
      turnoversCommitted: standing.turnoversCommitted,
      turnoverDifferential: standing.turnoversForced - standing.turnoversCommitted,
      passingYards: standing.passingYards,
      rushingYards: standing.rushingYards,
      sacks: standing.sacks,
      explosivePlays: standing.explosivePlays,
      redZoneTrips: standing.redZoneTrips,
      redZoneTouchdowns: standing.redZoneTouchdowns,
    })),
    matches: season.matches.map((match) => ({
      id: match.id,
      week: match.week,
      kind: match.kind,
      scheduledAt: match.scheduledAt,
      status: match.status,
      homeTeamId: match.homeTeam.id,
      homeTeamName: `${match.homeTeam.city} ${match.homeTeam.nickname}`,
      awayTeamId: match.awayTeam.id,
      awayTeamName: `${match.awayTeam.city} ${match.awayTeam.nickname}`,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    })),
  };
}

export async function getSeasonOverviewForUser(
  userId: string,
  saveGameId: string,
  seasonId: string,
): Promise<SeasonOverview | null> {
  const season = await getRepositories().seasons.findOwnedByUser(
    userId,
    saveGameId,
    seasonId,
  );

  if (!season) {
    return null;
  }

  const playoffMatches = season.matches.filter((match) => match.kind === "PLAYOFF");
  const championshipMatch =
    [...playoffMatches]
      .sort((left, right) => right.week - left.week)
      .find(
        (match) =>
          match.status === "COMPLETED" &&
          match.homeScore != null &&
          match.awayScore != null,
      ) ?? null;

  return {
    id: season.id,
    year: season.year,
    phase: season.phase,
    week: season.week,
    championName: championshipMatch
      ? (() => {
          const winnerId = resolveDecisiveWinnerTeamId({
            homeTeamId: championshipMatch.homeTeam.id,
            awayTeamId: championshipMatch.awayTeam.id,
            homeScore: championshipMatch.homeScore,
            awayScore: championshipMatch.awayScore,
          });

          if (winnerId === championshipMatch.homeTeam.id) {
            return `${championshipMatch.homeTeam.city} ${championshipMatch.homeTeam.nickname}`;
          }

          if (winnerId === championshipMatch.awayTeam.id) {
            return `${championshipMatch.awayTeam.city} ${championshipMatch.awayTeam.nickname}`;
          }

          return null;
        })()
      : null,
    playoffPicture: season.teamSeasonStats.slice(0, 4).map((standing, index) => ({
      seed: index + 1,
      teamId: standing.team.id,
      name: `${standing.team.city} ${standing.team.nickname}`,
      record: formatRecord(standing.wins, standing.losses, standing.ties),
    })),
    standings: season.teamSeasonStats.map((standing) => ({
      teamId: standing.team.id,
      name: `${standing.team.city} ${standing.team.nickname}`,
      abbreviation: standing.team.abbreviation,
      overallRating: standing.team.overallRating,
      record: formatRecord(standing.wins, standing.losses, standing.ties),
      pointsFor: standing.pointsFor,
      pointsAgainst: standing.pointsAgainst,
      touchdownsFor: standing.touchdownsFor,
      turnoversForced: standing.turnoversForced,
      turnoversCommitted: standing.turnoversCommitted,
      turnoverDifferential: standing.turnoversForced - standing.turnoversCommitted,
      passingYards: standing.passingYards,
      rushingYards: standing.rushingYards,
      sacks: standing.sacks,
      explosivePlays: standing.explosivePlays,
      redZoneTrips: standing.redZoneTrips,
      redZoneTouchdowns: standing.redZoneTouchdowns,
    })),
    matches: season.matches.map((match) => ({
      id: match.id,
      week: match.week,
      kind: match.kind,
      scheduledAt: match.scheduledAt,
      status: match.status,
      homeTeamId: match.homeTeam.id,
      homeTeamName: `${match.homeTeam.city} ${match.homeTeam.nickname}`,
      awayTeamId: match.awayTeam.id,
      awayTeamName: `${match.awayTeam.city} ${match.awayTeam.nickname}`,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    })),
  };
}
