import { notFound } from "next/navigation";

import { requirePageUserId } from "@/lib/auth/session";
import { getSaveGameFlowSnapshot } from "@/modules/savegames/application/savegame-query.service";
import { getTeamDetailForUser } from "@/modules/teams/application/team-query.service";

export type CanonicalTeamRouteParams = {
  savegameId: string;
};

export type CanonicalTeamRoutePageProps = {
  params: Promise<CanonicalTeamRouteParams>;
};

export async function resolveManagerTeamRouteParams(
  params: Promise<CanonicalTeamRouteParams>,
) {
  const { savegameId } = await params;
  const userId = await requirePageUserId();
  const flow = await getSaveGameFlowSnapshot(userId, savegameId);

  if (!flow) {
    notFound();
  }

  const managerTeam =
    flow.saveGame.teams.find((team) => team.managerControlled) ??
    flow.saveGame.teams.find((team) => team.id === flow.featuredTeamId) ??
    flow.saveGame.teams[0] ??
    null;

  if (!managerTeam) {
    notFound();
  }

  return {
    savegameId,
    teamId: managerTeam.id,
  };
}

export async function loadCanonicalTeamPageData(params: Promise<CanonicalTeamRouteParams>) {
  const { savegameId, teamId } = await resolveManagerTeamRouteParams(params);
  const userId = await requirePageUserId();
  const team = await getTeamDetailForUser(userId, savegameId, teamId);

  if (!team) {
    notFound();
  }

  return {
    savegameId,
    team,
    teamId,
  };
}

export function getTeamFreeAgencyHref(savegameId: string, managerControlled: boolean) {
  return managerControlled ? `/app/savegames/${savegameId}/finance/free-agency` : null;
}
