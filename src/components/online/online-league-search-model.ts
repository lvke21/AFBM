import type { OnlineLeague } from "@/lib/online/online-league-types";
import {
  getTeamNamesByCategory,
  resolveTeamIdentitySelection,
  TEAM_IDENTITY_CITIES,
  TEAM_NAME_CATEGORIES,
  type TeamIdentitySelection,
} from "@/lib/online/team-identity-options";

export type LeagueSearchCard = {
  id: string;
  name: string;
  playerCountLabel: string;
  statusLabel: string;
  canJoin: boolean;
};

export type TeamIdentitySuggestion =
  | {
      status: "ready";
      selection: TeamIdentitySelection;
      cityName: string;
      teamName: string;
      teamDisplayName: string;
    }
  | {
      status: "unavailable";
      message: string;
    };

function getStatusLabel(status: OnlineLeague["status"]) {
  return status === "waiting" ? "Wartet auf Spieler" : "Saison läuft";
}

export function toLeagueSearchCard(league: OnlineLeague | null): LeagueSearchCard | null {
  if (!league) {
    return null;
  }

  return {
    id: league.id,
    name: league.name,
    playerCountLabel: `${league.users.length}/${league.maxUsers}`,
    statusLabel: getStatusLabel(league.status),
    canJoin: league.status === "waiting" && league.users.length < league.maxUsers,
  };
}

function getUsedTeamIdentityKeys(leagues: OnlineLeague[]) {
  const usedDisplayNames = new Set<string>();
  const usedIdentityIds = new Set<string>();

  leagues.forEach((league) => {
    league.users.forEach((user) => {
      usedDisplayNames.add((user.teamDisplayName ?? user.teamName).toLowerCase());

      if (user.cityId && user.teamNameId) {
        usedIdentityIds.add(`${user.cityId}:${user.teamNameId}`);
      }
    });
  });

  return {
    usedDisplayNames,
    usedIdentityIds,
  };
}

export function suggestTeamIdentityForLeagues(
  leagues: OnlineLeague[],
): TeamIdentitySuggestion {
  const joinableLeagues = leagues.filter(
    (league) => league.status === "waiting" && league.users.length < league.maxUsers,
  );
  const leaguesToCheck = joinableLeagues.length > 0 ? joinableLeagues : leagues;
  const { usedDisplayNames, usedIdentityIds } = getUsedTeamIdentityKeys(leaguesToCheck);

  for (const city of TEAM_IDENTITY_CITIES) {
    for (const category of TEAM_NAME_CATEGORIES) {
      for (const teamName of resolveTeamIdentityCandidates(category)) {
        const selection: TeamIdentitySelection = {
          cityId: city.id,
          category,
          teamNameId: teamName.id,
        };
        const resolvedIdentity = resolveTeamIdentitySelection(selection);

        if (!resolvedIdentity) {
          continue;
        }

        const displayNameTaken = usedDisplayNames.has(
          resolvedIdentity.teamDisplayName.toLowerCase(),
        );
        const identityTaken = usedIdentityIds.has(
          `${resolvedIdentity.cityId}:${resolvedIdentity.teamNameId}`,
        );

        if (!displayNameTaken && !identityTaken) {
          return {
            status: "ready",
            selection,
            cityName: resolvedIdentity.cityName,
            teamName: resolvedIdentity.teamName,
            teamDisplayName: resolvedIdentity.teamDisplayName,
          };
        }
      }
    }
  }

  return {
    status: "unavailable",
    message:
      "Für die sichtbaren Ligen konnte kein freier Teamvorschlag gefunden werden. Bitte wähle manuell.",
  };
}

function resolveTeamIdentityCandidates(category: TeamIdentitySelection["category"]) {
  return getTeamNamesByCategory(category);
}
