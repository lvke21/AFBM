import { describe, expect, it } from "vitest";

import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineDraftAvailablePlayerDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "../../src/lib/online/types";
import type { OnlineContractPlayer } from "../../src/lib/online/online-league-types";
import {
  collectProtectedManagerAssignments,
  createAutoDraftPlan,
  validateAutoDraft,
} from "./multiplayer-auto-draft-staging";

const now = "2026-05-01T12:00:00.000Z";
const rosterTargets: Record<string, number> = {
  QB: 3,
  RB: 4,
  WR: 7,
  TE: 3,
  OL: 10,
  DL: 8,
  LB: 6,
  CB: 6,
  S: 4,
  K: 1,
  P: 1,
};

function team(id: string, assignedUserId?: string): FirestoreOnlineTeamDoc {
  return {
    id,
    teamName: id,
    displayName: id,
    assignedUserId,
    status: assignedUserId ? "assigned" : "ai",
    contractRoster: [],
    depthChart: [],
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

function mirror(userId: string, teamId: string): FirestoreLeagueMemberMirrorDoc {
  return {
    id: `afbm-multiplayer-test-league_${userId}`,
    leagueId: "afbm-multiplayer-test-league",
    leagueSlug: "afbm-multiplayer-test-league",
    uid: userId,
    userId,
    role: "GM",
    status: "ACTIVE",
    teamId,
    createdAt: now,
    updatedAt: now,
  };
}

function player(playerId: string, position: string, overall: number): FirestoreOnlineDraftAvailablePlayerDoc {
  const base: OnlineContractPlayer = {
    playerId,
    playerName: `Player ${playerId}`,
    position,
    age: 24,
    overall,
    potential: overall + 2,
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
    status: "free_agent",
  };

  return {
    ...base,
    displayName: base.playerName,
    draftRunId: "multiplayer-player-pool-v1",
    seedKey: "afbm-multiplayer-test-league-v1",
    testData: true,
    leagueSlug: "afbm-multiplayer-test-league",
    createdBySeed: true,
  };
}

function playerPool() {
  return Object.entries(rosterTargets).flatMap(([position, count]) =>
    Array.from({ length: count * 8 }, (_, index) => player(`${position}-${index + 1}`, position, 90 - (index % 30))),
  );
}

describe("multiplayer auto-draft staging manager protection", () => {
  it("collects existing manager assignments by assignedUserId and requires matching membership and mirror", () => {
    const teams = [team("solothurn-guardians", "KFy5PrqAzzP7vRbfP4wIDamzbh43")];
    const memberships = [membership("KFy5PrqAzzP7vRbfP4wIDamzbh43", "solothurn-guardians")];
    const mirrors = [mirror("KFy5PrqAzzP7vRbfP4wIDamzbh43", "solothurn-guardians")];

    const result = collectProtectedManagerAssignments({ teams, memberships, mirrors });

    expect(result.issues).toEqual([]);
    expect(result.protectedAssignments).toEqual([
      {
        teamId: "solothurn-guardians",
        assignedUserId: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
        membershipUserId: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
        membershipTeamId: "solothurn-guardians",
        mirrorId: "afbm-multiplayer-test-league_KFy5PrqAzzP7vRbfP4wIDamzbh43",
        mirrorTeamId: "solothurn-guardians",
        mirrorUserId: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
      },
    ]);
  });

  it("blocks auto-draft when membership points protected user to a different team", () => {
    const result = collectProtectedManagerAssignments({
      teams: [team("solothurn-guardians", "KFy5PrqAzzP7vRbfP4wIDamzbh43")],
      memberships: [membership("KFy5PrqAzzP7vRbfP4wIDamzbh43", "basel-rhinos")],
      mirrors: [mirror("KFy5PrqAzzP7vRbfP4wIDamzbh43", "solothurn-guardians")],
    });

    expect(result.protectedAssignments).toEqual([]);
    expect(result.issues).toEqual([
      "Membership team mismatch for user KFy5PrqAzzP7vRbfP4wIDamzbh43: team has solothurn-guardians, membership has basel-rhinos.",
    ]);
  });

  it("draft plan distributes players but keeps user assignments out of the plan", () => {
    const teams = [
      team("solothurn-guardians", "KFy5PrqAzzP7vRbfP4wIDamzbh43"),
      team("basel-rhinos"),
      team("bern-wolves"),
    ];
    const plan = createAutoDraftPlan({
      existingTeams: teams,
      availablePlayers: playerPool(),
      picks: [],
    });

    expect(plan.teams.find((entry) => entry.id === "solothurn-guardians")?.assignedUserId).toBe(
      "KFy5PrqAzzP7vRbfP4wIDamzbh43",
    );
    expect(plan.rostersByTeamId.get("solothurn-guardians")).toHaveLength(53);
    expect(plan.picks.every((pick) => pick.pickedByUserId === "server-auto-draft-backfill")).toBe(true);
  });

  it("validates protected team, membership, and mirror invariants after draft planning", () => {
    const teams = [team("solothurn-guardians", "KFy5PrqAzzP7vRbfP4wIDamzbh43"), team("basel-rhinos")];
    const memberships = [membership("KFy5PrqAzzP7vRbfP4wIDamzbh43", "solothurn-guardians")];
    const mirrors = [mirror("KFy5PrqAzzP7vRbfP4wIDamzbh43", "basel-rhinos")];
    const protectedAssignments = [
      {
        teamId: "solothurn-guardians",
        assignedUserId: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
        membershipUserId: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
        membershipTeamId: "solothurn-guardians",
        mirrorId: "afbm-multiplayer-test-league_KFy5PrqAzzP7vRbfP4wIDamzbh43",
        mirrorTeamId: "solothurn-guardians",
        mirrorUserId: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
      },
    ];
    const plan = createAutoDraftPlan({
      existingTeams: teams,
      availablePlayers: playerPool(),
      picks: [],
    });

    const validation = validateAutoDraft({
      teams: plan.teams,
      memberships,
      mirrors,
      preservedManagerTeams: protectedAssignments,
      plan,
    });

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain("League member mirror changed for user KFy5PrqAzzP7vRbfP4wIDamzbh43.");
  });
});
