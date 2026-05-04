import React from "react";
import Link from "next/link";

import type {
  OnlineLeague,
  OnlineMediaExpectationGoal,
} from "@/lib/online/online-league-types";
import { normalizeOnlineCoreLifecycle } from "@/lib/online/online-league-lifecycle";
import type { OnlineUser } from "@/lib/online/online-user-service";
import type { OnlineRecoveryCopy } from "@/lib/online/error-recovery";

import { GlossaryTerm } from "./online-glossary";
import { OnlineFantasyDraftRoom } from "./online-fantasy-draft-room";
import type { OnlineLeagueDetailState } from "./online-league-detail-model";
import { OnlineModeStatus } from "./online-mode-status";
import { OnlineRecoveryPanel } from "./online-recovery-panel";
import {
  OnlineLeagueActionFeedback,
  OnlineLeagueAllReadyNotice,
  OnlineLeagueFirstSteps,
  OnlineLeagueLoadingState,
} from "./online-league-overview-sections";

type FoundOnlineLeagueDetailState = Extract<OnlineLeagueDetailState, { status: "found" }>;

type ActionFeedback = {
  tone: "success" | "warning";
  message: string;
};

type ReadyGuidanceItem = {
  label: string;
  completed: boolean;
  statusLabel: string;
};

export function LoadingState() {
  return <OnlineLeagueLoadingState />;
}

export function ErrorState({
  copy,
  onRetry,
  retryLabel,
}: {
  copy: OnlineRecoveryCopy;
  onRetry: () => void;
  retryLabel: string;
}) {
  return <OnlineRecoveryPanel copy={copy} onRetry={onRetry} retryLabel={retryLabel} />;
}

export function LeagueHeader({
  detailState,
}: {
  detailState: FoundOnlineLeagueDetailState;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Online Liga
        </p>
        <h1
          className="mt-2 text-4xl font-semibold text-white sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {detailState.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-200">
          <span className="rounded-full border border-white/10 px-3 py-1">
            {detailState.statusLabel}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            {detailState.currentWeekLabel}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            {detailState.draftStatusLabel}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            {detailState.playerCountLabel} Spieler
          </span>
        </div>
        <OnlineModeStatus context="dashboard" compact />
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <Link
          href="/online"
          className="w-fit rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
        >
          Zurück zum Onlinebereich
        </Link>
        <span className="w-fit rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50">
          {detailState.currentUserReady
            ? `Du bist bereit für ${detailState.currentWeekLabel}`
            : "Noch nicht bereit"}
        </span>
      </div>
    </div>
  );
}

export function ReadyStatePanel({
  detailState,
  actionFeedback,
  readyGuidanceItems,
  pendingAction,
  onReadyForWeek,
}: {
  detailState: FoundOnlineLeagueDetailState;
  actionFeedback: ActionFeedback | null;
  readyGuidanceItems: ReadyGuidanceItem[];
  pendingAction: string | null;
  onReadyForWeek: (ready: boolean) => void;
}) {
  return (
    <>
      <OnlineLeagueActionFeedback feedback={actionFeedback} />
      <OnlineLeagueAllReadyNotice label={detailState.allPlayersReadyLabel} />
      <OnlineLeagueFirstSteps
        detailState={detailState}
        readyGuidanceItems={readyGuidanceItems}
        pendingAction={pendingAction}
        onReadyForWeek={onReadyForWeek}
      />
    </>
  );
}

export function PrimaryActionPanel({
  detailState,
  pendingAction,
  onReadyForWeek,
}: {
  detailState: FoundOnlineLeagueDetailState;
  pendingAction: string | null;
  onReadyForWeek: (ready: boolean) => void;
}) {
  const action = detailState.primaryAction;

  return (
    <section className="mt-6 rounded-lg border border-emerald-200/35 bg-emerald-300/10 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Nächste Aktion
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{action.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/85">
            {action.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-slate-100">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Team: {detailState.ownTeamName ?? "nicht verbunden"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {detailState.currentWeekLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {detailState.draftStatusLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {detailState.currentUserReady ? "Ready gesetzt" : "Ready offen"}
            </span>
          </div>
        </div>
        {action.kind === "ready" ? (
          <button
            type="button"
            disabled={pendingAction !== null || Boolean(detailState.readyActionDisabledReason)}
            onClick={() => onReadyForWeek(true)}
            aria-busy={pendingAction === "ready"}
            className="w-fit rounded-lg border border-emerald-100/35 bg-emerald-200/18 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-200/24 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-400"
          >
            {pendingAction === "ready" ? "Speichert..." : action.ctaLabel}
          </button>
        ) : action.href && action.ctaLabel ? (
          <Link
            href={action.href}
            className="w-fit rounded-lg border border-emerald-100/35 bg-emerald-200/18 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-200/24"
          >
            {action.ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function TeamOverviewCard({
  detailState,
  isFirebaseMvpMode,
  showAdvancedLocalActions,
  mediaFeedback,
  mediaExpectationGoals,
  onClaimVacantTeam,
  onSetMediaExpectation,
}: {
  detailState: FoundOnlineLeagueDetailState;
  isFirebaseMvpMode: boolean;
  showAdvancedLocalActions: boolean;
  mediaFeedback: string | null;
  mediaExpectationGoals: OnlineMediaExpectationGoal[];
  onClaimVacantTeam: (teamId: string) => void;
  onSetMediaExpectation: (goal: OnlineMediaExpectationGoal) => void;
}) {
  return (
    <section className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
        Dein Team
      </p>
      {detailState.ownTeamName ? (
        <>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            {detailState.ownTeamName}
          </h2>
          <p className="mt-2 text-sm text-emerald-100">
            Coach: {detailState.ownCoachName}
          </p>
          {showAdvancedLocalActions ? (
            <div className="mt-4 grid gap-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                <GlossaryTerm term="owner">Owner</GlossaryTerm> / Job-Sicherheit
              </p>
              <p className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 font-semibold text-emerald-50">
                <GlossaryTerm term="ownerConfidence">Owner Confidence</GlossaryTerm>: {detailState.ownerConfidenceLabel}
              </p>
              <p className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 font-semibold text-emerald-50">
                Job Security: {detailState.jobSecurityLabel}
              </p>
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200">
                {detailState.ownerExpectationLabel}
              </p>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-slate-200">
                <p className="font-semibold text-white">
                  Media: {detailState.mediaExpectationLabel}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {detailState.mediaExpectationNarrative}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {mediaExpectationGoals.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => onSetMediaExpectation(goal)}
                      className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
                    >
                      {goal === "rebuild"
                        ? "Rebuild"
                        : goal === "playoffs"
                          ? "Playoffs"
                          : "Championship"}
                    </button>
                  ))}
                </div>
                {mediaFeedback ? (
                  <p className="mt-3 text-xs font-semibold text-emerald-100">
                    {mediaFeedback}
                  </p>
                ) : null}
              </div>
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200">
                {detailState.jobSecurityExplanation}
              </p>
              {detailState.inactivityWarningLabel ? (
                <p className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-2 font-semibold text-amber-100">
                  {detailState.inactivityWarningLabel}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-50">
              Team ist bereit für die ersten Schritte.
              {!isFirebaseMvpMode ? (
                <>
                  {" "}
                  <GlossaryTerm term="owner">Owner</GlossaryTerm>- und Job-Sicherheitsdetails liegen im Expertenmodus.
                </>
              ) : null}
            </p>
          )}
        </>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-emerald-200/25 p-4 text-sm text-emerald-100">
          Tritt der Liga bei, um dein Team zu erhalten.
          {!isFirebaseMvpMode && detailState.vacantTeams.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {detailState.vacantTeams.map((team) => (
                <button
                  key={team.teamId}
                  type="button"
                  onClick={() => onClaimVacantTeam(team.teamId)}
                  className="rounded-lg border border-emerald-200/30 bg-emerald-300/10 px-3 py-2 text-left text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
                >
                  Vakantes Team übernehmen: {team.teamName}
                </button>
              ))}
            </div>
          ) : null}
          {isFirebaseMvpMode && detailState.vacantTeams.length > 0 ? (
            <p className="mt-4 rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-50">
              Vakante Teams werden im Firebase-MVP durch den Admin zugewiesen.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function LeagueStatusPanel({
  detailState,
}: {
  detailState: FoundOnlineLeagueDetailState;
}) {
  return (
    <section id="league" className="rounded-lg border border-white/10 bg-[#07111d]/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
        Ligaübersicht
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">
        Nächste Partie: {detailState.nextMatchLabel}
      </h2>
      <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
        {detailState.waitingLabel}
      </p>
      <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
        {detailState.readyProgressLabel}
      </p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Standings
          </p>
          {detailState.standings.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {detailState.standings.slice(0, 4).map((standing) => (
                <div
                  key={standing.teamName}
                  className={`grid gap-1 rounded-lg border px-3 py-2 text-sm sm:grid-cols-[1fr_auto] ${
                    standing.isOwnTeam
                      ? "border-emerald-200/35 bg-emerald-300/10"
                      : "border-white/10 bg-[#07111d]/70"
                  }`}
                >
                  <span className="font-semibold text-white">
                    <span className="mr-2 font-mono text-slate-400">{standing.rankLabel}</span>
                    {standing.teamName}
                    {standing.isOwnTeam ? (
                      <span className="ml-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                        Dein Team
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-slate-300">{standing.recordLabel}</span>
                  {standing.pointsLabel ? (
                    <span className="text-xs font-semibold text-slate-400 sm:col-span-2">
                      {standing.pointsLabel}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-300">
              Standings werden nach den ersten gespeicherten Ergebnissen aufgebaut.
            </p>
          )}
        </div>
        <WeekResultPanel detailState={detailState} />
      </div>
    </section>
  );
}

export function WeekResultPanel({
  detailState,
}: {
  detailState: FoundOnlineLeagueDetailState;
}) {
  const { resultSummary } = detailState;
  const outcomeToneClass =
    resultSummary.ownLastGame?.outcomeTone === "win"
      ? "border-emerald-200/35 bg-emerald-300/10 text-emerald-50"
      : resultSummary.ownLastGame?.outcomeTone === "loss"
        ? "border-amber-200/30 bg-amber-300/10 text-amber-50"
        : "border-sky-200/30 bg-sky-300/10 text-sky-50";

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Ergebnisse
      </p>
      {resultSummary.ownLastGame ? (
        <div className={`mt-3 rounded-lg border px-4 py-3 ${outcomeToneClass}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
            Letztes Spiel · {resultSummary.ownLastGame.weekLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {resultSummary.ownLastGame.outcomeLabel}
          </p>
          <p className="mt-2 text-sm font-semibold">
            {resultSummary.ownLastGame.scoreLabel}
          </p>
          <p className="mt-1 text-sm font-semibold opacity-85">
            {resultSummary.ownLastGame.opponentLabel}
          </p>
          <p className="mt-1 text-xs font-semibold opacity-80">
            {resultSummary.ownLastGame.winnerLabel}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {resultSummary.ownLastGame.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-white/10 bg-[#07111d]/55 px-3 py-2 text-xs"
              >
                <p className="font-semibold uppercase tracking-[0.14em] opacity-70">
                  {stat.label}
                </p>
                <p className="mt-1 font-semibold text-white">
                  Du: {stat.ownValue}
                </p>
                <p className="mt-1 opacity-80">Gegner: {stat.opponentValue}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-white/15 bg-[#07111d]/60 px-4 py-3">
          <p className="text-sm font-semibold text-white">{resultSummary.emptyTitle}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {resultSummary.emptyMessage}
          </p>
        </div>
      )}
      {resultSummary.results.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Ergebnisliste {resultSummary.weekLabel ? `· ${resultSummary.weekLabel}` : ""}
          </p>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-200">
            {resultSummary.results.map((result) => (
              <div
                key={result.matchId}
                className={`rounded-lg border px-3 py-2 ${
                  result.isCurrentUserTeamInvolved
                    ? "border-emerald-200/30 bg-emerald-300/10 text-emerald-50"
                    : "border-white/10 bg-[#07111d]/70"
                }`}
              >
                <p>{result.label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {result.winnerLabel}
                  {result.isCurrentUserTeamInvolved ? " · Dein Spiel" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PlayerActionsPanel({
  detailState,
}: {
  detailState: FoundOnlineLeagueDetailState;
}) {
  return (
    <section className="mt-8 rounded-lg border border-emerald-200/20 bg-[#07111d]/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
        Command Center
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Was jetzt wichtig ist</h2>
      <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100">
        {detailState.nextActionLabel}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Kader
          </p>
          {detailState.roster ? (
            <>
              <p className="mt-2 text-lg font-semibold text-white">
                {detailState.roster.totalPlayersLabel}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {detailState.roster.starterAverageLabel} · <GlossaryTerm term="starter">Starter</GlossaryTerm>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-300">
              Noch kein Team-Kader geladen.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Standings
          </p>
          {detailState.standings.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {detailState.standings.slice(0, 4).map((standing) => (
                <div
                  key={standing.teamName}
                  className={`grid gap-1 rounded-lg px-2 py-1 text-sm sm:grid-cols-[1fr_auto] ${
                    standing.isOwnTeam ? "bg-emerald-300/10" : ""
                  }`}
                >
                  <span className="font-semibold text-white">
                    <span className="mr-2 font-mono text-slate-400">{standing.rankLabel}</span>
                    {standing.teamName}
                    {standing.isOwnTeam ? (
                      <span className="ml-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                        Dein Team
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-slate-300">{standing.recordLabel}</span>
                  {standing.pointsLabel ? (
                    <span className="text-xs font-semibold text-slate-500 sm:col-span-2">
                      {standing.pointsLabel}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-300">
              Noch keine Tabellenstände.
            </p>
          )}
        </div>

        <WeekResultPanel detailState={detailState} />
      </div>

      {detailState.roster && detailState.roster.depthChart.length > 0 ? (
        <div
          id="depth-chart"
          className="mt-5 scroll-mt-24 rounded-lg border border-white/10 bg-white/5 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            <GlossaryTerm term="depthChart">Depth Chart</GlossaryTerm>
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {detailState.roster.depthChart.map((entry, index) => (
              <div
                key={entry.position}
                className="rounded-lg border border-white/10 bg-[#07111d]/70 px-3 py-2"
              >
                <p className="text-sm font-semibold text-white">
                  {entry.position}: {entry.starterName}
                </p>
                <p className="mt-1 text-xs text-slate-400">{entry.backupLabel}</p>
                {entry.backupLabel === "Keine Backups" && index === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    <GlossaryTerm term="backup">Backup</GlossaryTerm>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function DraftStatusPanel({
  league,
  currentUser,
  pendingPickPlayerId,
  feedback,
  onPickPlayer,
}: {
  league: OnlineLeague | null;
  currentUser: OnlineUser | null;
  pendingPickPlayerId: string | null;
  feedback: ActionFeedback | null;
  onPickPlayer: (playerId: string) => void;
}) {
  const lifecycle =
    league && currentUser
      ? normalizeOnlineCoreLifecycle({
          currentUser,
          league,
          requiresDraft: Boolean(league.fantasyDraft),
        })
      : null;

  if (
    !league ||
    !currentUser ||
    !lifecycle ||
    lifecycle.draftStatus === "missing" ||
    lifecycle.draftStatus === "completed"
  ) {
    return null;
  }

  return (
    <OnlineFantasyDraftRoom
      league={league}
      currentUser={currentUser}
      pendingPickPlayerId={pendingPickPlayerId}
      feedback={feedback}
      onPickPlayer={onPickPlayer}
    />
  );
}

export function AdminControlsPanel() {
  return null;
}
