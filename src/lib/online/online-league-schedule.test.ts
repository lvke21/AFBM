import { describe, expect, it } from "vitest";

import { ONLINE_MVP_TEAM_POOL } from "./online-league-constants";
import { createOnlineLeague } from "./online-league-service";
import {
  createOnlineLeagueSchedule,
  ONLINE_LEAGUE_REGULAR_SEASON_GAMES_PER_WEEK,
  ONLINE_LEAGUE_REGULAR_SEASON_WEEKS,
  ONLINE_LEAGUE_SCHEDULE_TEAM_COUNT,
  OnlineLeagueScheduleError,
} from "./online-league-schedule";

class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }

  removeItem(key: string) {
    this.items.delete(key);
  }
}

function gamesByWeek(schedule: ReturnType<typeof createOnlineLeagueSchedule>) {
  return schedule.reduce((weeks, game) => {
    const games = weeks.get(game.week) ?? [];
    games.push(game);
    weeks.set(game.week, games);
    return weeks;
  }, new Map<number, typeof schedule>());
}

describe("online league schedule", () => {
  it("creates a 16-team Regular Season MVP schedule", () => {
    const schedule = createOnlineLeagueSchedule("league-1", ONLINE_MVP_TEAM_POOL);
    const weeks = gamesByWeek(schedule);

    expect(ONLINE_MVP_TEAM_POOL).toHaveLength(ONLINE_LEAGUE_SCHEDULE_TEAM_COUNT);
    expect(schedule).toHaveLength(
      ONLINE_LEAGUE_REGULAR_SEASON_WEEKS * ONLINE_LEAGUE_REGULAR_SEASON_GAMES_PER_WEEK,
    );
    expect(weeks.size).toBe(ONLINE_LEAGUE_REGULAR_SEASON_WEEKS);
    expect([...weeks.values()].every((games) => games.length === 8)).toBe(true);
  });

  it("does not double-book teams inside a week", () => {
    const schedule = createOnlineLeagueSchedule("league-1", ONLINE_MVP_TEAM_POOL);

    for (const [week, games] of gamesByWeek(schedule)) {
      const weeklyTeamIds = games.flatMap((game) => [
        game.awayTeamName,
        game.homeTeamName,
      ]);

      expect(new Set(weeklyTeamIds).size, `week ${week}`).toBe(weeklyTeamIds.length);
    }
  });

  it("does not create self-matchups", () => {
    const schedule = createOnlineLeagueSchedule("league-1", ONLINE_MVP_TEAM_POOL);

    expect(schedule.every((game) => game.awayTeamName !== game.homeTeamName)).toBe(true);
  });

  it("is reproducible and independent from input order", () => {
    const forwardSchedule = createOnlineLeagueSchedule("league-1", ONLINE_MVP_TEAM_POOL);
    const reversedSchedule = createOnlineLeagueSchedule(
      "league-1",
      [...ONLINE_MVP_TEAM_POOL].reverse(),
    );

    expect(reversedSchedule).toEqual(forwardSchedule);
  });

  it("fails clearly for leagues without exactly 16 teams", () => {
    expect(() =>
      createOnlineLeagueSchedule("small-league", ONLINE_MVP_TEAM_POOL.slice(0, 8)),
    ).toThrow(OnlineLeagueScheduleError);
  });

  it("stores a generated schedule on new 16-team online leagues", () => {
    const league = createOnlineLeague(
      { maxUsers: 16, name: "Scheduled Online League" },
      new MemoryStorage(),
    );

    expect(league.schedule).toHaveLength(
      ONLINE_LEAGUE_REGULAR_SEASON_WEEKS * ONLINE_LEAGUE_REGULAR_SEASON_GAMES_PER_WEEK,
    );
  });

  it("leaves smaller leagues unscheduled for a pending simulation state", () => {
    const league = createOnlineLeague(
      { maxUsers: 8, name: "Pending Schedule League" },
      new MemoryStorage(),
    );

    expect(league.schedule).toEqual([]);
  });
});
