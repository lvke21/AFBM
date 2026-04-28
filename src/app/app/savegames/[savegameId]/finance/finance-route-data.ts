import { notFound } from "next/navigation";

import { requirePageUserId } from "@/lib/auth/session";
import { getSaveGameFlowSnapshot } from "@/modules/savegames/application/savegame-query.service";
import { getTeamDetailForUser } from "@/modules/teams/application/team-query.service";

export async function getFinanceRouteTeam(savegameId: string) {
  const userId = await requirePageUserId();
  const flow = await getSaveGameFlowSnapshot(userId, savegameId);

  if (!flow) {
    notFound();
  }

  const managerTeam =
    flow.saveGame.teams.find((team) => team.managerControlled) ??
    flow.saveGame.teams.find((team) => team.id === flow.featuredTeamId) ??
    null;
  const team = managerTeam
    ? await getTeamDetailForUser(userId, savegameId, managerTeam.id)
    : null;

  if (!team) {
    notFound();
  }

  return team;
}
