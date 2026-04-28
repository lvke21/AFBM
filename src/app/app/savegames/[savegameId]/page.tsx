import { notFound } from "next/navigation";

import { DashboardQuickActionsPanel } from "@/components/dashboard/dashboard-quick-actions-panel";
import { DecisionFeedbackArea } from "@/components/dashboard/decision-feedback-area";
import { LeagueSnapshotPanel } from "@/components/dashboard/league-snapshot-panel";
import { ManagerCommandHeader } from "@/components/dashboard/manager-command-header";
import { NextActionPanel } from "@/components/dashboard/next-action-panel";
import { TeamSnapshotPanel } from "@/components/dashboard/team-snapshot-panel";
import {
  buildDashboardAction,
  buildDashboardDecisionFeedbackItems,
  buildDashboardQuickActions,
  buildRebuildProgressState,
  buildTeamDevelopmentState,
  buildTeamContextState,
  buildTeamProfileState,
  getDashboardWeekStateTone,
  getFreeAgencyHref,
  getSeasonHref,
  getTeamHref,
  selectNextDashboardMatch,
} from "@/components/dashboard/dashboard-model";
import { MatchCard } from "@/components/dashboard/match-card";
import { RebuildProgressPanel } from "@/components/dashboard/rebuild-progress-panel";
import { TeamDevelopmentPanel } from "@/components/dashboard/team-development-panel";
import { TeamContextPanel } from "@/components/dashboard/team-context-panel";
import { TeamProfilePanel } from "@/components/dashboard/team-profile-panel";
import { WeekLoopPanel } from "@/components/dashboard/week-loop-panel";
import { ShortTermGoalsPanel } from "@/components/goals/short-term-goals-panel";
import { buildShortTermGoalsState } from "@/components/goals/short-term-goals-model";
import { RosterDecisionInboxPanel } from "@/components/inbox/roster-decision-inbox-panel";
import { buildRosterDecisionInbox } from "@/components/inbox/roster-decision-model";
import { getGameFlowHref } from "@/components/match/game-flow-model";
import { TeamNeedsPanel } from "@/components/team/team-needs-panel";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { StatCard } from "@/components/ui/stat-card";
import { requirePageUserId } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getSaveGameFlowSnapshot } from "@/modules/savegames/application/savegame-query.service";
import { getSeasonOverviewForUser } from "@/modules/seasons/application/season-query.service";
import { getTeamDetailForUser } from "@/modules/teams/application/team-query.service";
import { advanceWeekAction, prepareWeekAction } from "./week-actions";

type SaveGameDetailPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function SaveGameDetailPage({
  params,
}: SaveGameDetailPageProps) {
  const { savegameId } = await params;
  const userId = await requirePageUserId();
  const flow = await getSaveGameFlowSnapshot(userId, savegameId);

  if (!flow) {
    notFound();
  }

  const saveGame = flow.saveGame;

  const [featuredTeam, currentSeason] = await Promise.all([
    flow.featuredTeamId
      ? getTeamDetailForUser(userId, savegameId, flow.featuredTeamId)
      : null,
    flow.currentSeasonId
      ? getSeasonOverviewForUser(userId, savegameId, flow.currentSeasonId)
      : null,
  ]);

  const featuredPlayer = featuredTeam?.players[0] ?? null;
  const managerTeamId = featuredTeam?.id ?? flow.featuredTeamId;
  const teamHref = getTeamHref(savegameId, managerTeamId);
  const featuredPlayerHref = featuredPlayer
    ? `/app/savegames/${savegameId}/players/${featuredPlayer.id}`
    : null;
  const seasonHref = getSeasonHref(savegameId, currentSeason?.id);
  const freeAgencyHref = featuredTeam?.managerControlled ? getFreeAgencyHref(savegameId) : null;
  const nextMatch = selectNextDashboardMatch(currentSeason, managerTeamId);
  const matchHref = nextMatch ? getGameFlowHref(savegameId, nextMatch) : null;
  const weekLabel = currentSeason
    ? `${currentSeason.year} · Woche ${currentSeason.week}`
    : "Keine Saison";
  const dashboardAction = buildDashboardAction({
    saveGameId: savegameId,
    team: featuredTeam,
    season: currentSeason,
    nextMatch,
    weekState: saveGame.weekState,
  });
  const quickActions = buildDashboardQuickActions({
    freeAgencyHref,
    matchHref,
    nextMatch,
    seasonHref,
    team: featuredTeam,
    teamHref,
    weekState: saveGame.weekState,
  });
  const decisionFeedbackItems = buildDashboardDecisionFeedbackItems({
    action: dashboardAction,
    season: currentSeason,
    team: featuredTeam,
    weekState: saveGame.weekState,
  });
  const weekTone = getDashboardWeekStateTone(saveGame.weekState);
  const rebuildProgress = buildRebuildProgressState({
    season: currentSeason,
    team: featuredTeam,
  });
  const teamContext = buildTeamContextState({
    season: currentSeason,
    team: featuredTeam,
  });
  const teamDevelopment = buildTeamDevelopmentState({
    season: currentSeason,
    team: featuredTeam,
  });
  const teamProfile = buildTeamProfileState(featuredTeam);
  const rosterDecisionInbox = buildRosterDecisionInbox({
    saveGameId: savegameId,
    team: featuredTeam,
  });
  const shortTermGoals = buildShortTermGoalsState({
    saveGameId: savegameId,
    team: featuredTeam,
  });
  const currentWeekMatches =
    currentSeason?.matches.filter((match) => match.week === currentSeason.week) ?? [];
  const openCurrentWeekMatches = currentWeekMatches.filter(
    (match) => match.status === "SCHEDULED",
  ).length;
  const completedCurrentWeekMatches = currentWeekMatches.filter(
    (match) => match.status === "COMPLETED",
  ).length;
  const developmentFocusCandidates = [...(featuredTeam?.players ?? [])]
    .filter((player) => player.status === "ACTIVE")
    .sort((left, right) => {
      const leftUpside = left.potentialRating - left.positionOverall;
      const rightUpside = right.potentialRating - right.positionOverall;

      if (rightUpside !== leftUpside) {
        return rightUpside - leftUpside;
      }

      return right.potentialRating - left.potentialRating;
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <NextActionPanel
        action={dashboardAction}
        contextLabel={
          currentSeason ? `${currentSeason.phase} · Woche ${currentSeason.week}` : "No season"
        }
        actionSlot={
          saveGame.weekState === "PRE_WEEK" ? (
            <form action={prepareWeekAction} className="[&>button]:min-h-14 [&>button]:w-full [&>button]:rounded-lg [&>button]:px-5 [&>button]:py-3 [&>button]:text-base">
              <input type="hidden" name="saveGameId" value={savegameId} />
              <input type="hidden" name="weeklyPlanIntensity" value="BALANCED" />
              <input type="hidden" name="weeklyOpponentFocus" value="BALANCED" />
              {developmentFocusCandidates
                .filter((player) => player.developmentFocus)
                .map((player) => (
                  <input
                    key={player.id}
                    type="hidden"
                    name="developmentFocusPlayerId"
                    value={player.id}
                  />
                ))}
              <FormSubmitButton primaryAction pendingLabel="Woche wird vorbereitet...">
                {dashboardAction.label}
              </FormSubmitButton>
            </form>
          ) : saveGame.weekState === "POST_GAME" ? (
            <form action={advanceWeekAction}>
              <input type="hidden" name="saveGameId" value={savegameId} />
              <FormSubmitButton pendingLabel="Naechste Woche wird geladen...">
                {dashboardAction.label}
              </FormSubmitButton>
            </form>
          ) : undefined
        }
      />

      <ManagerCommandHeader
        leagueName={saveGame.leagueName}
        record={featuredTeam?.currentRecord ?? "n/a"}
        saveGameName={saveGame.name}
        teamName={featuredTeam?.name ?? "Franchise Hub"}
        updatedAtLabel={formatDate(saveGame.updatedAt)}
        weekLabel={weekLabel}
        weekState={saveGame.weekState}
        weekTone={weekTone}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description={
            featuredTeam
              ? `${featuredTeam.conferenceName} · ${featuredTeam.divisionName}`
              : "Teamdaten fehlen."
          }
          label="Team OVR"
          meta={featuredTeam?.abbreviation}
          size="hero"
          tone={featuredTeam ? "positive" : "warning"}
          value={featuredTeam ? String(featuredTeam.overallRating) : "n/a"}
        />
        <StatCard
          description="Aktuelle Bilanz aus den abgeschlossenen Spielen."
          label="Record"
          value={featuredTeam?.currentRecord ?? "n/a"}
        />
        <StatCard
          description="Week State steuert Preview, Simulation und Wochenabschluss."
          label="Week State"
          meta={currentSeason ? `W${currentSeason.week}` : undefined}
          tone={
            weekTone === "active" ? "active" : weekTone === "warning" ? "warning" : "positive"
          }
          value={saveGame.weekState}
        />
        <StatCard
          description={
            featuredTeam
              ? "Aktueller Spielraum fuer Roster Moves."
              : "Kein Team ausgewaehlt; Ligawert wird angezeigt."
          }
          label="Cap Space"
          value={
            featuredTeam
              ? formatCurrency(featuredTeam.salaryCapSpace)
              : saveGame.settings
                ? formatCurrency(saveGame.settings.salaryCap)
                : "n/a"
          }
        />
      </section>

      <DashboardQuickActionsPanel actions={quickActions} />

      <section className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <div id="week-loop">
            <WeekLoopPanel
              advanceWeekAction={advanceWeekAction}
              developmentFocusCandidates={developmentFocusCandidates}
              gameHref={matchHref}
              prepareWeekAction={prepareWeekAction}
              saveGameId={savegameId}
              weekLabel={weekLabel}
              weekState={saveGame.weekState}
            />
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
            <TeamProfilePanel state={teamProfile} />
            <TeamDevelopmentPanel state={teamDevelopment} />
          </div>

          <TeamContextPanel state={teamContext} />
          <ShortTermGoalsPanel state={shortTermGoals} />
        </div>

        <aside className="space-y-5 xl:col-span-4">
          <MatchCard
            match={nextMatch}
            matchHref={matchHref}
            seasonHref={seasonHref}
            managerTeamId={managerTeamId}
          />
          <TeamSnapshotPanel
            featuredPlayer={featuredPlayer}
            playerHref={featuredPlayerHref}
            team={featuredTeam}
            teamHref={teamHref}
          />
          <TeamNeedsPanel
            compact
            needs={featuredTeam?.teamNeeds ?? []}
            freeAgencyHref={freeAgencyHref}
            teamHref={teamHref}
          />
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <LeagueSnapshotPanel
          completedCurrentWeekMatches={completedCurrentWeekMatches}
          currentSeason={currentSeason}
          managerTeamId={managerTeamId}
          openCurrentWeekMatches={openCurrentWeekMatches}
          saveGame={saveGame}
        />
        <DecisionFeedbackArea items={decisionFeedbackItems} />
      </section>

      <section className="grid items-start gap-5 2xl:grid-cols-[1fr_1fr]">
        <RebuildProgressPanel state={rebuildProgress} />
        <RosterDecisionInboxPanel decisions={rosterDecisionInbox} />
      </section>
    </div>
  );
}
