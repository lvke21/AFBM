import { notFound } from "next/navigation";

import { requirePageUserId } from "@/lib/auth/session";
import { getSaveGameFlowSnapshot } from "@/modules/savegames/application/savegame-query.service";

export type CanonicalLeagueRouteParams = {
  savegameId: string;
};

export type CanonicalLeagueRoutePageProps = {
  params: Promise<CanonicalLeagueRouteParams>;
};

export async function resolveCurrentSeasonRouteParams(
  params: Promise<CanonicalLeagueRouteParams>,
) {
  const { savegameId } = await params;
  const userId = await requirePageUserId();
  const flow = await getSaveGameFlowSnapshot(userId, savegameId);
  const seasonId = flow?.currentSeasonId ?? flow?.saveGame.currentSeason?.id ?? null;

  if (!flow || !seasonId) {
    notFound();
  }

  return {
    savegameId,
    seasonId,
  };
}
