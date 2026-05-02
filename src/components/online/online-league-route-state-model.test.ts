import { describe, expect, it } from "vitest";

import type { OnlineLeague } from "@/lib/online/online-league-types";
import type { OnlineUser } from "@/lib/online/online-user-service";
import { validateOnlineLeagueRouteState } from "./online-league-route-state-model";

const USER: OnlineUser = {
  userId: "user-1",
  username: "Coach One",
};

function league(patch: Partial<OnlineLeague> = {}): OnlineLeague {
  return {
    id: "league-1",
    name: "Route State League",
    status: "active",
    maxUsers: 16,
    currentWeek: 1,
    currentSeason: 1,
    users: [
      {
        userId: USER.userId,
        username: USER.username,
        joinedAt: "2026-05-01T08:00:00.000Z",
        teamId: "team-1",
        teamName: "Berlin Blitz",
        readyForWeek: false,
      },
    ],
    teams: [{ id: "team-1", name: "Berlin Blitz", abbreviation: "BER" }],
    ...patch,
  };
}

describe("online league route state model", () => {
  it("accepts a loaded league only when the current user has a valid team assignment", () => {
    expect(validateOnlineLeagueRouteState({ league: league(), user: USER })).toBeNull();
  });

  it("requires the search flow for missing leagues and missing memberships", () => {
    expect(validateOnlineLeagueRouteState({ league: null, user: USER })).toMatchObject({
      requiresSearch: true,
    });
    expect(validateOnlineLeagueRouteState({
      league: league({ users: [] }),
      user: USER,
    })).toMatchObject({
      message: "Dein aktueller Online-Account ist in dieser Liga nicht als GM eingetragen.",
      requiresSearch: true,
    });
  });

  it("blocks missing team assignments but keeps auth failures retryable", () => {
    expect(validateOnlineLeagueRouteState({
      league: league({
        users: [
          {
            userId: USER.userId,
            username: USER.username,
            joinedAt: "2026-05-01T08:00:00.000Z",
            teamId: "",
            teamName: "",
            readyForWeek: false,
          },
        ],
      }),
      user: USER,
    })).toMatchObject({
      message: "Dein Spieler ist vorhanden, aber kein aktives Team ist zugeordnet.",
      requiresSearch: true,
    });
    expect(validateOnlineLeagueRouteState({ league: league(), user: null })).toMatchObject({
      requiresSearch: false,
    });
  });
});
