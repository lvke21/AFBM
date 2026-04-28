import { GameFlowNavigation } from "@/components/match/game-flow-navigation";
import { getGameSetupHref } from "@/components/match/game-flow-model";
import { PlayerOfGamePanel } from "@/components/match/player-of-game-panel";
import { PostGameCausalityPanel } from "@/components/match/post-game-causality-panel";
import { PostGameConsequencesPanel } from "@/components/match/post-game-consequences-panel";
import { PostGameKeyMoments } from "@/components/match/post-game-key-moments";
import { PostGameMotivationPanel } from "@/components/match/post-game-motivation-panel";
import { PostGameNextStepPanel } from "@/components/match/post-game-next-step-panel";
import { buildPostGameReportState } from "@/components/match/post-game-report-model";
import { PostGameScoreHeader } from "@/components/match/post-game-score-header";
import { TeamImpactPanel } from "@/components/match/team-impact-panel";
import { TeamStatsComparisonPanel } from "@/components/match/team-stats-comparison-panel";

import { GameFlowEmptyState } from "../game-flow-empty-state";
import { loadGameFlowData, type GameRoutePageProps } from "../game-flow-data";
import { advanceWeekAction } from "../../week-actions";

export default async function GameReportPage({ params, searchParams }: GameRoutePageProps) {
  const { managerTeam, match, matchId, savegameId, season, weekState } = await loadGameFlowData({
    params,
    preferredStep: "report",
    searchParams,
  });
  const seasonHref = season ? `/app/savegames/${savegameId}/league` : null;

  if (!match) {
    return (
      <div className="space-y-8">
        <GameFlowNavigation
          activeStep="report"
          match={null}
          matchId={null}
          saveGameId={savegameId}
        />
        <GameFlowEmptyState seasonHref={seasonHref} />
      </div>
    );
  }

  const reportState = buildPostGameReportState({
    match,
    saveGameId: savegameId,
    teamDetail: managerTeam,
    weekState,
  });
  const dashboardHref = `/app/savegames/${savegameId}`;
  const setupHref = getGameSetupHref(savegameId, match.id);

  return (
    <div className="space-y-8">
      <GameFlowNavigation
        activeStep="report"
        match={match}
        matchId={matchId}
        saveGameId={savegameId}
      />

      <PostGameScoreHeader match={match} state={reportState} />

      <PostGameMotivationPanel goal={reportState.motivationGoal} />

      <PostGameCausalityPanel state={reportState} />

      <PostGameConsequencesPanel state={reportState} />

      <section className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <TeamStatsComparisonPanel match={match} state={reportState} />
        <PlayerOfGamePanel state={reportState} />
      </section>

      <PostGameKeyMoments state={reportState} />

      <TeamImpactPanel state={reportState} />

      <PostGameNextStepPanel
        advanceWeekAction={advanceWeekAction}
        dashboardHref={dashboardHref}
        saveGameId={savegameId}
        setupHref={setupHref}
        state={reportState}
      />
    </div>
  );
}
