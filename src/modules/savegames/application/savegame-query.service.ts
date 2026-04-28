import { formatRecord } from "@/lib/utils/format";
import type {
  SaveGameDetail,
  SaveGameFlowSnapshot,
  SaveGameListItem,
} from "@/modules/savegames/domain/savegame.types";
import { getRepositories } from "@/server/repositories";

export async function listSaveGames(userId: string): Promise<SaveGameListItem[]> {
  const saveGames = await getRepositories().saveGames.listByUser(userId);

  return saveGames.map((saveGame) => ({
    id: saveGame.id,
    name: saveGame.name,
    status: saveGame.status,
    weekState: saveGame.weekState,
    leagueName: saveGame.leagueDefinition.name,
    currentSeasonLabel: saveGame.currentSeason
      ? `${saveGame.currentSeason.year} · ${saveGame.currentSeason.phase} · Woche ${saveGame.currentSeason.week}`
      : "Kein Saisonstatus",
    teamCount: saveGame._count.teams,
    playerCount: saveGame._count.players,
    updatedAt: saveGame.updatedAt,
  }));
}

export async function getSaveGameDetail(
  userId: string,
  saveGameId: string,
): Promise<SaveGameDetail | null> {
  const saveGame = await getRepositories().saveGames.findByIdForUser(userId, saveGameId);

  if (!saveGame) {
    return null;
  }

  return {
    id: saveGame.id,
    name: saveGame.name,
    status: saveGame.status,
    weekState: saveGame.weekState,
    leagueName: saveGame.leagueDefinition.name,
    createdAt: saveGame.createdAt,
    updatedAt: saveGame.updatedAt,
    currentSeason: saveGame.currentSeason
      ? {
          id: saveGame.currentSeason.id,
          year: saveGame.currentSeason.year,
          phase: saveGame.currentSeason.phase,
          week: saveGame.currentSeason.week,
        }
      : null,
    settings: saveGame.settings
      ? {
          salaryCap: Number(saveGame.settings.salaryCap),
          activeRosterLimit: saveGame.settings.activeRosterLimit,
          practiceSquadSize: saveGame.settings.practiceSquadSize,
          seasonLengthWeeks: saveGame.settings.seasonLengthWeeks,
        }
      : null,
    teams: saveGame.teams.map((team) => ({
      id: team.id,
      name: `${team.city} ${team.nickname}`,
      abbreviation: team.abbreviation,
      conferenceName: team.conferenceDefinition.name,
      divisionName: team.divisionDefinition.name,
      managerControlled: team.managerControlled,
      overallRating: team.overallRating,
      rosterSize: team._count.rosterProfiles,
      salaryCapSpace: Number(team.salaryCapSpace),
      currentRecord: team.teamSeasonStats[0]
        ? formatRecord(
            team.teamSeasonStats[0].wins,
            team.teamSeasonStats[0].losses,
            team.teamSeasonStats[0].ties,
          )
        : "0-0",
    })),
    seasons: saveGame.seasons.map((season) => ({
      id: season.id,
      year: season.year,
      phase: season.phase,
      week: season.week,
      matchCount: season._count.matches,
    })),
  };
}

export async function getSaveGameFlowSnapshot(
  userId: string,
  saveGameId: string,
): Promise<SaveGameFlowSnapshot | null> {
  const saveGame = await getSaveGameDetail(userId, saveGameId);

  if (!saveGame) {
    return null;
  }

  const featuredTeam = saveGame.teams.find((team) => team.managerControlled) ?? saveGame.teams[0];
  const currentSeason = saveGame.currentSeason;

  return {
    saveGame,
    featuredTeamId: featuredTeam?.id ?? null,
    currentSeasonId: currentSeason?.id ?? null,
  };
}
