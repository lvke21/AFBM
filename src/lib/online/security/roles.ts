import type {
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "../types";

export class OnlineAuthorizationError extends Error {
  constructor(message = "Online action is not allowed.") {
    super(message);
    this.name = "OnlineAuthorizationError";
  }
}

function getMembership(
  userId: string,
  memberships: FirestoreOnlineMembershipDoc[],
): FirestoreOnlineMembershipDoc | null {
  return memberships.find((membership) => membership.userId === userId) ?? null;
}

export function assertActiveMembership(
  userId: string,
  leagueId: string,
  memberships: FirestoreOnlineMembershipDoc[],
) {
  const membership = getMembership(userId, memberships);

  if (!membership || membership.status !== "active") {
    throw new OnlineAuthorizationError(`User ${userId} is not an active member of ${leagueId}.`);
  }

  return membership;
}

export function assertLeagueMember(
  userId: string,
  leagueId: string,
  memberships: FirestoreOnlineMembershipDoc[],
) {
  return assertActiveMembership(userId, leagueId, memberships);
}

export function assertLeagueAdmin(
  userId: string,
  leagueId: string,
  memberships: FirestoreOnlineMembershipDoc[],
  league?: Pick<FirestoreOnlineLeagueDoc, "createdByUserId">,
) {
  const membership = getMembership(userId, memberships);

  if (
    league?.createdByUserId !== userId &&
    (!membership || membership.status !== "active" || membership.role !== "admin")
  ) {
    throw new OnlineAuthorizationError(`User ${userId} is not an admin of ${leagueId}.`);
  }

  return membership;
}

export function assertTeamOwner(
  userId: string,
  leagueId: string,
  teamId: string,
  teams: FirestoreOnlineTeamDoc[],
) {
  const team = teams.find((candidate) => candidate.id === teamId);

  if (!team || team.assignedUserId !== userId || team.status !== "assigned") {
    throw new OnlineAuthorizationError(
      `User ${userId} does not control team ${teamId} in ${leagueId}.`,
    );
  }

  return team;
}
