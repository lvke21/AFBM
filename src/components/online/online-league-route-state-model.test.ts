import { describe, expect, it } from "vitest";

import type { OnlineLeague } from "@/lib/online/online-league-types";
import type { OnlineUser } from "@/lib/online/online-user-service";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
} from "@/lib/online/types";
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
});
