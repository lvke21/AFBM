import { SectionPanel } from "@/components/layout/section-panel";
import { buildScheduleStretchState } from "@/components/dashboard/dashboard-model";
import { buildLineupReadinessState } from "@/components/team/depth-chart-model";
import { GamePlanSummary } from "@/components/match/game-plan-summary";
import { GameFlowNavigation } from "@/components/match/game-flow-navigation";
import { getGameLiveHref, getGameReportHref } from "@/components/match/game-flow-model";
import { GamePreparationPanel } from "@/components/match/game-preparation-panel";
import { buildGamePreviewState } from "@/components/match/game-preview-model";
import { KeyRatingsComparison } from "@/components/match/key-ratings-comparison";
import { MatchPreviewHeader } from "@/components/match/match-preview-header";
import { ReadinessRiskPanel } from "@/components/match/readiness-risk-panel";
import { StartMatchActionArea } from "@/components/match/start-match-action-area";
import { TeamComparisonPanel } from "@/components/match/team-comparison-panel";

import { updateGamePreparationAction } from "../../matches/[matchId]/actions";
import { startGameAction } from "../../week-actions";
import { GameFlowEmptyState } from "../game-flow-empty-state";
import { loadGameFlowData, type GameRoutePageProps } from "../game-flow-data";

export default async function GameSetupPage({ params, searchParams }: GameRoutePageProps) {
  const { managerTeam: managerTeamDetail, match, matchId, savegameId, season, weekState } = await loadGameFlowData({
    params,
    preferredStep: "setup",
    searchParams,
  });
  const seasonHref = season ? `/app/savegames/${savegameId}/league` : null;

  if (!match) {
    return (
      <div className="space-y-8">
        <GameFlowNavigation
          activeStep="setup"
          match={null}
          matchId={null}
          saveGameId={savegameId}
        />
        <GameFlowEmptyState seasonHref={seasonHref} />
      </div>
    );
  }

  const matchupManagerTeam = match.homeTeam.managerControlled
    ? match.homeTeam
    : match.awayTeam.managerControlled
      ? match.awayTeam
      : null;
  const stretch = buildScheduleStretchState({
    season,
    teamId: matchupManagerTeam?.id,
    teamRating: matchupManagerTeam?.overallRating,
  });
  const readiness = buildLineupReadinessState(
    managerTeamDetail?.players ?? [],
    managerTeamDetail?.managerControlled ?? false,
  );
  const previewState = buildGamePreviewState({
    match,
    readiness,
    season,
    teamDetail: managerTeamDetail,
    weekState,
  });
  const liveHref = getGameLiveHref(savegameId, match.id);
  const reportHref = getGameReportHref(savegameId, match.id);
  const dashboardHref = `/app/savegames/${savegameId}#week-loop`;

  return (
    <div className="space-y-8">
      <GameFlowNavigation
        activeStep="setup"
        match={match}
        matchId={matchId}
        saveGameId={savegameId}
      />

      <MatchPreviewHeader match={match} state={previewState} />

      <section className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <TeamComparisonPanel state={previewState} />
        <StartMatchActionArea
          dashboardHref={dashboardHref}
          liveHref={liveHref}
          match={match}
          reportHref={reportHref}
          saveGameId={savegameId}
          startAction={startGameAction}
          state={previewState}
        />
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <ReadinessRiskPanel state={previewState} />
        <KeyRatingsComparison comparisons={previewState.ratingComparisons} />
      </section>

      <GamePlanSummary match={match} state={previewState} />

      <GamePreparationPanel
        saveGameId={savegameId}
        matchId={match.id}
        match={match}
        updateAction={updateGamePreparationAction}
      />

      <SectionPanel
        title="Naechste Gegner"
        description="Einordnung der naechsten Gegner, bevor du den Gameplan finalisierst."
        tone={stretch.label === "Tough Stretch" ? "warning" : "subtle"}
      >
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Kommende Strecke
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{stretch.label}</h3>
          <p className="mt-1 text-sm font-semibold text-white">{stretch.value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{stretch.description}</p>
        </div>
      </SectionPanel>

    </div>
  );
}
