import { describe, expect, it } from "vitest";

import type { OnlineLeague } from "@/lib/online/online-league-types";
import type { OnlineUser } from "@/lib/online/online-user-service";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
} from "@/lib/online/types";
import {
  shouldAttemptOnlineLeagueRouteJoin,
  validateOnlineLeagueRouteState,
} from "./online-league-route-state-model";

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

function firestoreLeague(): FirestoreOnlineLeagueDoc {
  return {
    id: "league-1",
    name: "Route State League",
    status: "active",
    createdByUserId: "admin-user",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T08:00:00.000Z",
    maxTeams: 16,
    memberCount: 1,
    currentWeek: 1,
    currentSeason: 1,
    settings: { onlineBackbone: true },
    version: 1,
  };
}

function firestoreMembership(
  patch: Partial<FirestoreOnlineMembershipDoc> = {},
): FirestoreOnlineMembershipDoc {
  return {
    userId: USER.userId,
    username: USER.username,
    displayName: USER.username,
    role: "gm",
    teamId: "team-1",
    joinedAt: "2026-05-01T08:00:00.000Z",
    lastSeenAt: "2026-05-01T08:00:00.000Z",
    ready: false,
    status: "active",
    ...patch,
  };
}

function firestoreTeam(patch: Partial<FirestoreOnlineTeamDoc> = {}): FirestoreOnlineTeamDoc {
  return {
    id: "team-1",
    teamName: "Berlin Blitz",
    displayName: "Berlin Blitz",
    assignedUserId: USER.userId,
    status: "assigned",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T08:00:00.000Z",
    ...patch,
  };
}

function mappedFirestoreLeague(
  teamPatch: Partial<FirestoreOnlineTeamDoc> = {},
  membershipPatch: Partial<FirestoreOnlineMembershipDoc> = {},
) {
  return mapFirestoreSnapshotToOnlineLeague({
    league: firestoreLeague(),
    memberships: [firestoreMembership(membershipPatch)],
    teams: [firestoreTeam(teamPatch)],
  });
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
      message: "Dein aktueller Online-Account ist in dieser Liga nicht als Manager eingetragen.",
      requiresSearch: true,
    });
  });

  it("attempts route join only when the signed-in user has no loaded membership", () => {
    expect(shouldAttemptOnlineLeagueRouteJoin({ league: null, user: USER })).toBe(true);
    expect(shouldAttemptOnlineLeagueRouteJoin({
      league: league({ users: [] }),
      user: USER,
    })).toBe(true);
    expect(shouldAttemptOnlineLeagueRouteJoin({ league: league(), user: USER })).toBe(false);
    expect(shouldAttemptOnlineLeagueRouteJoin({ league: league(), user: null })).toBe(false);
  });

  it("does not silently rejoin when only the team projection points at the user", () => {
    const teamOnlyLeague = league({
      users: [],
      teams: [
        {
          id: "team-1",
          name: "Berlin Blitz",
          abbreviation: "BER",
          assignedUserId: USER.userId,
          assignmentStatus: "assigned",
        },
      ],
    });

    expect(validateOnlineLeagueRouteState({
      league: teamOnlyLeague,
      user: USER,
    })).toMatchObject({
      message:
        "Membership-Projektion inkonsistent: Team team-1 zeigt auf deinen Account, aber deine Membership fehlt.",
      requiresSearch: true,
    });
    expect(shouldAttemptOnlineLeagueRouteJoin({
      league: teamOnlyLeague,
      user: USER,
    })).toBe(false);
  });

  it("does not use an admin account as a substitute for player membership", () => {
    expect(validateOnlineLeagueRouteState({
      league: league({
        users: [
          {
            userId: "player-user",
            username: "Player Coach",
            joinedAt: "2026-05-01T08:00:00.000Z",
            teamId: "team-1",
            teamName: "Berlin Blitz",
            readyForWeek: false,
          },
        ],
      }),
      user: { userId: "admin-user", username: "Admin" },
    })).toMatchObject({
      message: "Dein aktueller Online-Account ist in dieser Liga nicht als Manager eingetragen.",
      requiresSearch: true,
    });
  });

  it("keeps the same membership and team assignment valid after a reload fetch", () => {
    const firstLoad = mappedFirestoreLeague();
    const reloaded = mappedFirestoreLeague();

    expect(validateOnlineLeagueRouteState({ league: firstLoad, user: USER })).toBeNull();
    expect(validateOnlineLeagueRouteState({ league: reloaded, user: USER })).toBeNull();
    expect(reloaded.users.find((user) => user.userId === USER.userId)).toMatchObject({
      teamId: "team-1",
      teamName: "Berlin Blitz",
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

  it("blocks vacant team links before subpages render team-specific content", () => {
    expect(validateOnlineLeagueRouteState({
      league: league({
        users: [
          {
            userId: USER.userId,
            username: USER.username,
            joinedAt: "2026-05-01T08:00:00.000Z",
            teamId: "team-1",
            teamName: "Berlin Blitz",
            readyForWeek: false,
            teamStatus: "vacant",
          },
        ],
      }),
      user: USER,
    })).toMatchObject({
      message: "Dein Spieler ist vorhanden, aber kein aktives Team ist zugeordnet.",
      requiresSearch: true,
    });
  });

  it("blocks stale team links when the membership points to a missing team document", () => {
    expect(validateOnlineLeagueRouteState({
      league: league({
        teams: [{ id: "other-team", name: "Other Team", abbreviation: "OTH" }],
      }),
      user: USER,
    })).toMatchObject({
      message: "Dein Spieler ist vorhanden, aber kein aktives Team ist zugeordnet.",
      requiresSearch: true,
    });
  });

  it("accepts a correct membership/team projection even when the global mirror is absent", () => {
    expect(validateOnlineLeagueRouteState({
      league: mappedFirestoreLeague(),
      user: USER,
    })).toBeNull();
  });

  it("blocks stale team projections before route content renders", () => {
    expect(validateOnlineLeagueRouteState({
      league: mappedFirestoreLeague({ assignedUserId: "old-user" }),
      user: USER,
    })).toMatchObject({
      message: "Membership-Projektion inkonsistent: Team-Zuordnung weicht von deiner Membership ab.",
      requiresSearch: true,
    });
  });

  it("blocks assigned teams whose assignedUserId projection is missing", () => {
    expect(validateOnlineLeagueRouteState({
      league: mappedFirestoreLeague({ assignedUserId: null, status: "assigned" }),
      user: USER,
    })).toMatchObject({
      message: "Membership-Projektion inkonsistent: Team-Zuordnung weicht von deiner Membership ab.",
      requiresSearch: true,
    });
  });

  it("keeps rejoin valid after simulation reload when membership and team projection stay aligned", () => {
    const simulatedReload = mappedFirestoreLeague(
      {},
      { ready: false },
    );

    expect(validateOnlineLeagueRouteState({
      league: {
        ...simulatedReload,
        currentWeek: 2,
        matchResults: [
          {
            matchId: "match-1",
            season: 1,
            week: 1,
            homeTeamId: "team-1",
            awayTeamId: "team-2",
            homeTeamName: "Berlin Blitz",
            awayTeamName: "Paris Guardians",
            homeScore: 21,
            awayScore: 14,
            homeStats: {
              firstDowns: 20,
              passingYards: 220,
              rushingYards: 120,
              totalYards: 340,
              turnovers: 1,
            },
            awayStats: {
              firstDowns: 18,
              passingYards: 200,
              rushingYards: 80,
              totalYards: 280,
              turnovers: 2,
            },
            winnerTeamId: "team-1",
            winnerTeamName: "Berlin Blitz",
            loserTeamId: "team-2",
            loserTeamName: "Paris Guardians",
            tiebreakerApplied: false,
            simulatedAt: "2026-05-01T09:00:00.000Z",
            simulatedByUserId: "admin-user",
            status: "completed",
            createdAt: "2026-05-01T09:00:00.000Z",
          },
        ],
        standings: [
          {
            teamId: "team-1",
            gamesPlayed: 1,
            wins: 1,
            losses: 0,
            ties: 0,
            pointsFor: 21,
            pointsAgainst: 14,
            pointDifferential: 7,
          },
        ],
      },
      user: USER,
    })).toBeNull();
  });
});
