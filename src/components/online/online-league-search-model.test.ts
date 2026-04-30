import { describe, expect, it } from "vitest";

import { ONLINE_MVP_TEAM_POOL, type OnlineLeague } from "@/lib/online/online-league-service";

import { suggestTeamIdentityForLeagues, toLeagueSearchCard } from "./online-league-search-model";

describe("toLeagueSearchCard", () => {
  it("builds display data for an available league", () => {
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      users: [
        {
          userId: "user-1",
          username: "Coach_1001",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
        },
        {
          userId: "user-2",
          username: "Coach_1002",
          joinedAt: "2026-04-29T19:01:00.000Z",
          teamId: "nyt-titans",
          teamName: "New York Titans",
          readyForWeek: false,
        },
        {
          userId: "user-3",
          username: "Coach_1003",
          joinedAt: "2026-04-29T19:02:00.000Z",
          teamId: "mia-cyclones",
          teamName: "Miami Cyclones",
          readyForWeek: false,
        },
      ],
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      maxUsers: 16,
      status: "waiting",
    };

    expect(toLeagueSearchCard(league)).toEqual({
      id: "global-test-league",
      name: "Global Test League",
      playerCountLabel: "3/16",
      statusLabel: "Wartet auf Spieler",
      canJoin: true,
    });
  });

  it("returns null when no league is available", () => {
    expect(toLeagueSearchCard(null)).toBeNull();
  });

  it("marks active or full leagues as not joinable", () => {
    const activeLeague: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      users: [],
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      maxUsers: 16,
      status: "active",
    };
    const fullLeague: OnlineLeague = {
      ...activeLeague,
      users: Array.from({ length: 16 }, (_, index) => ({
        userId: `user-${index}`,
        username: `Coach_${1000 + index}`,
        joinedAt: "2026-04-29T19:00:00.000Z",
        teamId: ONLINE_MVP_TEAM_POOL[index]?.id ?? `team-${index}`,
        teamName: ONLINE_MVP_TEAM_POOL[index]?.name ?? `Team ${index}`,
        readyForWeek: false,
      })),
      status: "waiting",
    };

    expect(toLeagueSearchCard(activeLeague)?.canJoin).toBe(false);
    expect(toLeagueSearchCard(activeLeague)?.statusLabel).toBe("Saison läuft");
    expect(toLeagueSearchCard(fullLeague)?.canJoin).toBe(false);
  });

  it("suggests a free team identity for visible joinable leagues", () => {
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      users: [
        {
          userId: "user-1",
          username: "Coach_1001",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "team-1",
          teamName: "Aachen Skyline",
          cityId: "aachen",
          teamCategory: "identity_city",
          teamNameId: "skyline",
          teamDisplayName: "Aachen Skyline",
          readyForWeek: false,
        },
      ],
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      maxUsers: 16,
      status: "waiting",
    };

    const suggestion = suggestTeamIdentityForLeagues([league]);

    expect(suggestion.status).toBe("ready");
    expect(suggestion).toMatchObject({
      status: "ready",
      cityName: expect.any(String),
      teamName: expect.any(String),
      teamDisplayName: expect.not.stringMatching(/^Aachen Skyline$/),
    });
  });
});
