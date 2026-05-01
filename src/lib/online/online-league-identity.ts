import type { OnlineLeague } from "./online-league-types";
import type { TeamIdentitySelection } from "./team-identity-options";

export function getTeamIdentityId(
  selection: Pick<TeamIdentitySelection, "cityId" | "teamNameId">,
) {
  return `${selection.cityId}-${selection.teamNameId}`;
}

export function hasTeamDisplayName(league: OnlineLeague, teamDisplayName: string) {
  return league.users.some((user) => {
    const existingDisplayName = user.teamDisplayName ?? user.teamName;

    return existingDisplayName.toLowerCase() === teamDisplayName.toLowerCase();
  });
}
