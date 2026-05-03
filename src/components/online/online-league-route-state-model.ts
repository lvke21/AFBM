import type { OnlineLeague } from "@/lib/online/online-league-types";
import { getMissingPlayerRecoveryCopy, getMissingTeamRecoveryCopy } from "@/lib/online/error-recovery";
import type { OnlineUser } from "@/lib/online/online-user-service";

export type OnlineLeagueRouteValidationIssue = {
  message: string;
  requiresSearch: boolean;
};

export function validateOnlineLeagueRouteState(input: {
  league: OnlineLeague | null;
  user: OnlineUser | null;
}): OnlineLeagueRouteValidationIssue | null {
  if (!input.user) {
    return {
      message: "Online-Identitaet nicht verfuegbar.",
      requiresSearch: false,
    };
  }

  if (!input.league) {
    return {
      message: "Die Online-Liga ist fuer diesen Account nicht erreichbar.",
      requiresSearch: true,
    };
  }

  const leagueUser = input.league.users.find((user) => user.userId === input.user?.userId);

  if (!leagueUser) {
    return {
      message: getMissingPlayerRecoveryCopy().message,
      requiresSearch: true,
    };
  }

  if (!leagueUser.teamId) {
    return {
      message: getMissingTeamRecoveryCopy().message,
      requiresSearch: true,
    };
  }

  if (leagueUser.teamStatus === "vacant") {
    return {
      message: getMissingTeamRecoveryCopy().message,
      requiresSearch: true,
    };
  }

  const assignedTeamExists = input.league.teams.some((team) => team.id === leagueUser.teamId);

  if (!assignedTeamExists) {
    return {
      message: getMissingTeamRecoveryCopy().message,
      requiresSearch: true,
    };
  }

  const assignedTeam = input.league.teams.find((team) => team.id === leagueUser.teamId);
  const teamProjectionUserId = assignedTeam?.assignedUserId;

  if (
    (teamProjectionUserId && teamProjectionUserId !== leagueUser.userId) ||
    (assignedTeam?.assignmentStatus === "assigned" && teamProjectionUserId === null)
  ) {
    return {
      message: "Membership-Projektion inkonsistent: Team-Zuordnung weicht von deiner Membership ab.",
      requiresSearch: true,
    };
  }

  return null;
}
