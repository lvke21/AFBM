import { notFound } from "next/navigation";

import {
  selectGameFlowMatchForStep,
  type GameFlowStep,
} from "@/components/match/game-flow-model";
import { requirePageUserId } from "@/lib/auth/session";
import { getSaveGameFlowSnapshot } from "@/modules/savegames/application/savegame-query.service";
import { getMatchDetailForUser } from "@/modules/seasons/application/match-query.service";
import { getSeasonOverviewForUser } from "@/modules/seasons/application/season-query.service";
import { getTeamDetailForUser } from "@/modules/teams/application/team-query.service";

export type GameRouteParams = {
  savegameId: string;
};

export type GameRouteSearchParams = {
  matchId?: string;
};

export type GameRoutePageProps = {
  params: Promise<GameRouteParams>;
  searchParams?: Promise<GameRouteSearchParams>;
};

export async function loadGameFlowData({
  params,
  preferredStep,
  searchParams,
}: {
  params: Promise<GameRouteParams>;
  preferredStep: GameFlowStep;
  searchParams?: Promise<GameRouteSearchParams>;
}) {
  const { savegameId } = await params;
  const query = (await searchParams) ?? {};
  const userId = await requirePageUserId();
  const flow = await getSaveGameFlowSnapshot(userId, savegameId);

  if (!flow) {
    notFound();
  }

  const managerTeamId = flow.featuredTeamId;
  const season = flow.currentSeasonId
    ? await getSeasonOverviewForUser(userId, savegameId, flow.currentSeasonId)
    : null;
  const managerTeam = managerTeamId
    ? await getTeamDetailForUser(userId, savegameId, managerTeamId)
    : null;
  const selectedMatch = query.matchId
    ? null
    : selectGameFlowMatchForStep(season, managerTeamId, preferredStep);
  const matchId = query.matchId ?? selectedMatch?.id ?? null;
  const match = matchId ? await getMatchDetailForUser(userId, savegameId, matchId) : null;

  if (matchId && !match) {
    notFound();
  }

  return {
    match,
    matchId,
    managerTeam,
    savegameId,
    season,
    weekState: flow.saveGame.weekState,
  };
}
