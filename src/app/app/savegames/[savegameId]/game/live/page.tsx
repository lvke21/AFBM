import { GameFlowNavigation } from "@/components/match/game-flow-navigation";
import { getGameReportHref, getGameSetupHref } from "@/components/match/game-flow-model";
import { LiveSimulationFlow } from "@/components/match/live-simulation-flow";
import { buildLiveSimulationState } from "@/components/match/live-simulation-model";

import { finishGameAction } from "../../week-actions";
import { GameFlowEmptyState } from "../game-flow-empty-state";
import { loadGameFlowData, type GameRoutePageProps } from "../game-flow-data";

export default async function GameLivePage({ params, searchParams }: GameRoutePageProps) {
  const { managerTeam, match, matchId, savegameId, season, weekState } = await loadGameFlowData({
    params,
    preferredStep: "live",
    searchParams,
  });
  const seasonHref = season ? `/app/savegames/${savegameId}/league` : null;

  if (!match) {
    return (
      <div className="space-y-8">
        <GameFlowNavigation
          activeStep="live"
          match={null}
          matchId={null}
          saveGameId={savegameId}
        />
        <GameFlowEmptyState seasonHref={seasonHref} />
      </div>
    );
  }

  const reportHref = getGameReportHref(savegameId, match.id);
  const setupHref = getGameSetupHref(savegameId, match.id);
  const canFinishGame = weekState === "GAME_RUNNING" && match.status === "IN_PROGRESS";
  const liveState = buildLiveSimulationState({
    canFinishGame,
    match,
    teamDetail: managerTeam,
    weekState,
  });

  return (
    <div className="space-y-8">
      <GameFlowNavigation
        activeStep="live"
        match={match}
        matchId={matchId}
        saveGameId={savegameId}
      />

      <LiveSimulationFlow
        finishAction={finishGameAction}
        match={match}
        reportHref={reportHref}
        saveGameId={savegameId}
        setupHref={setupHref}
        state={liveState}
      />
    </div>
  );
}
