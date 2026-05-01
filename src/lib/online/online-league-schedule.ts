import type {
  OnlineLeagueScheduleMatch,
  OnlineLeagueTeam,
} from "./online-league-types";

export const ONLINE_LEAGUE_SCHEDULE_TEAM_COUNT = 16;
export const ONLINE_LEAGUE_REGULAR_SEASON_WEEKS = ONLINE_LEAGUE_SCHEDULE_TEAM_COUNT - 1;
export const ONLINE_LEAGUE_REGULAR_SEASON_GAMES_PER_WEEK =
  ONLINE_LEAGUE_SCHEDULE_TEAM_COUNT / 2;

export class OnlineLeagueScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnlineLeagueScheduleError";
  }
}

export function canCreateOnlineLeagueSchedule(teams: OnlineLeagueTeam[]) {
  return teams.length === ONLINE_LEAGUE_SCHEDULE_TEAM_COUNT;
}

function getStableTeamPool(teams: OnlineLeagueTeam[]) {
  const teamIds = new Set<string>();

  for (const team of teams) {
    if (!team.id.trim()) {
      throw new OnlineLeagueScheduleError("Online league schedule requires teams with IDs.");
    }

    if (teamIds.has(team.id)) {
      throw new OnlineLeagueScheduleError(
        `Online league schedule cannot contain duplicate team ID ${team.id}.`,
      );
    }

    teamIds.add(team.id);
  }

  if (!canCreateOnlineLeagueSchedule(teams)) {
    throw new OnlineLeagueScheduleError(
      `Online league schedule requires exactly ${ONLINE_LEAGUE_SCHEDULE_TEAM_COUNT} teams for the Regular Season MVP.`,
    );
  }

  return [...teams].sort((left, right) => left.id.localeCompare(right.id));
}

function rotateRoundRobinTeams(teams: OnlineLeagueTeam[]) {
  const fixedTeam = teams[0];
  const rotatingTeams = teams.slice(1);
  const lastTeam = rotatingTeams[rotatingTeams.length - 1];

  return [
    fixedTeam,
    lastTeam,
    ...rotatingTeams.slice(0, rotatingTeams.length - 1),
  ];
}

export function createOnlineLeagueSchedule(
  leagueId: string,
  teams: OnlineLeagueTeam[],
): OnlineLeagueScheduleMatch[] {
  let weeklyTeamOrder = getStableTeamPool(teams);
  const schedule: OnlineLeagueScheduleMatch[] = [];

  for (let weekIndex = 0; weekIndex < ONLINE_LEAGUE_REGULAR_SEASON_WEEKS; weekIndex += 1) {
    const week = weekIndex + 1;

    for (
      let gameIndex = 0;
      gameIndex < ONLINE_LEAGUE_REGULAR_SEASON_GAMES_PER_WEEK;
      gameIndex += 1
    ) {
      const leftTeam = weeklyTeamOrder[gameIndex];
      const rightTeam = weeklyTeamOrder[weeklyTeamOrder.length - 1 - gameIndex];
      const swapHomeAway =
        gameIndex === 0 ? weekIndex % 2 === 1 : (weekIndex + gameIndex) % 2 === 1;
      const homeTeam = swapHomeAway ? rightTeam : leftTeam;
      const awayTeam = swapHomeAway ? leftTeam : rightTeam;

      if (homeTeam.id === awayTeam.id) {
        throw new OnlineLeagueScheduleError(
          `Online league schedule created a self-matchup for ${homeTeam.id}.`,
        );
      }

      schedule.push({
        awayTeamName: awayTeam.id,
        homeTeamName: homeTeam.id,
        id: `${leagueId}-s1-w${week}-g${String(gameIndex + 1).padStart(2, "0")}`,
        week,
      });
    }

    weeklyTeamOrder = rotateRoundRobinTeams(weeklyTeamOrder);
  }

  return schedule;
}
