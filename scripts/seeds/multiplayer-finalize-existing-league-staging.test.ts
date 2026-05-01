import { describe, expect, it } from "vitest";

import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "../../src/lib/online/types";
import type { OnlineContractPlayer } from "../../src/lib/online/online-league-types";
import {
  buildFinalizeExistingLeaguePlan,
  createLeagueMemberMirror,
  validateRosterState,
} from "./multiplayer-finalize-existing-league-staging";

const now = "2026-05-01T12:00:00.000Z";

function player(playerId: string, teamId?: string): OnlineContractPlayer & { teamId?: string } {
  return {
    playerId,
    playerName: `Player ${playerId}`,
    position: "WR",
    age: 24,
    overall: 70,
    potential: 74,
    developmentPath: "solid",
    developmentProgress: 0,
    xFactors: [],
    contract: {
      salaryPerYear: 1_000_000,
      yearsRemaining: 1,
      totalValue: 1_000_000,
      guaranteedMoney: 100_000,
      signingBonus: 50_000,
      contractType: "regular",
      capHitPerYear: 1_000_000,
      deadCapPerYear: 100_000,
    },
    status: "active",
    teamId,
  };
}

function team(id: string, assignedUserId?: string): FirestoreOnlineTeamDoc {
  return {
    id,
    teamName: id,
    displayName: id,
    assignedUserId,
    status: assignedUserId ? "assigned" : "ai",
    contractRoster: Array.from({ length: 53 }, (_, index) => player(`${id}-${index + 1}`, id)),
    createdAt: now,
    updatedAt: now,
  };
}

function membership(userId: string, teamId: string): FirestoreOnlineMembershipDoc {
  return {
    userId,
    username: userId,
    role: "gm",
    teamId,
    joinedAt: now,
    lastSeenAt: now,
    ready: true,
    status: "active",
    displayName: userId,
  };
}

function eightTeams() {
  return [
    team("basel-rhinos", "manager-1"),
    team("bern-wolves", "manager-2"),
    team("zurich-guardians"),
    team("geneva-falcons"),
    team("lausanne-lions"),
    team("winterthur-titans"),
    team("st-gallen-bears"),
    team("lucerne-hawks"),
  ];
}

describe("multiplayer finalize existing staging league", () => {
  it("plans missing mirror and managerUserId repairs without changing roster ownership", () => {
    const teams = eightTeams();
    const memberships = [membership("manager-1", "basel-rhinos"), membership("manager-2", "bern-wolves")];
    const existingMirror = createLeagueMemberMirror({
      leagueId: "afbm-multiplayer-test-league",
      leagueSlug: "afbm-multiplayer-test-league",
      membership: memberships[0],
      now,
    });

    const plan = buildFinalizeExistingLeaguePlan({
      teams,
      memberships,
      mirrors: [existingMirror],
      now,
    });

    expect(plan.unsafeIssues).toEqual([]);
    expect(plan.membershipRepairs).toEqual([
      {
        userId: "manager-1",
        teamId: "basel-rhinos",
        repairedMirror: false,
        repairedTeamAssignment: true,
      },
      {
        userId: "manager-2",
        teamId: "bern-wolves",
        repairedMirror: true,
        repairedTeamAssignment: true,
      },
    ]);
    expect(plan.managerTeamsRetained).toHaveLength(2);
  });

  it("blocks conflicting team manager assignments", () => {
    const teams = eightTeams();
    teams[0] = { ...teams[0], assignedUserId: "someone-else" };

    const plan = buildFinalizeExistingLeaguePlan({
      teams,
      memberships: [membership("manager-1", "basel-rhinos")],
      mirrors: [],
      now,
    });

    expect(plan.unsafeIssues).toContain("manager-1:assignedUserId-conflict:basel-rhinos:someone-else");
  });

  it("validates complete rosters and duplicate players", () => {
    const teams = eightTeams();
    teams[1] = {
      ...teams[1],
      contractRoster: [player("basel-rhinos-1", "basel-rhinos"), ...teams[1].contractRoster!.slice(1)],
    };

    const validation = validateRosterState(teams);

    expect(validation.teamCount).toBe(8);
    expect(validation.teamsWithCompleteRosters).toBe(8);
    expect(validation.duplicatePlayerIds).toEqual(["basel-rhinos-1"]);
    expect(validation.invalidRosterReferences).toEqual(["bern-wolves:basel-rhinos-1:teamId-basel-rhinos"]);
  });

  it("plans roster teamId repairs when active players miss teamId", () => {
    const teams = eightTeams();
    teams[2] = {
      ...teams[2],
      contractRoster: teams[2].contractRoster!.map((entry) => {
        const { teamId: _ignored, ...rest } = entry as OnlineContractPlayer & { teamId?: string };
        void _ignored;
        return rest;
      }),
    };

    const plan = buildFinalizeExistingLeaguePlan({
      teams,
      memberships: [],
      mirrors: [] as FirestoreLeagueMemberMirrorDoc[],
      now,
    });

    expect(plan.unsafeIssues).toEqual([]);
    expect(plan.rosterRepairs).toContainEqual({
      teamId: "zurich-guardians",
      repairedPlayerTeamIds: 53,
    });
  });
});
