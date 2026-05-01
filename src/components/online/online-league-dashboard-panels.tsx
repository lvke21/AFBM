import React from "react";
import Link from "next/link";

import type {
  OnlineLeague,
  OnlineMediaExpectationGoal,
} from "@/lib/online/online-league-types";
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
          Zurück zum Online Hub
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
    <section className="rounded-lg border border-white/10 bg-[#07111d]/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
        Nächste Partie
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{detailState.nextMatchLabel}</h2>
      <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
        {detailState.waitingLabel}
      </p>
      <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
        {detailState.readyProgressLabel}
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Demnächst
      </p>
    </section>
  );
}

export function WeekResultPanel({
  detailState,
}: {
  detailState: FoundOnlineLeagueDetailState;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Letzte Ergebnisse
      </p>
      {detailState.recentResults.length > 0 ? (
        <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-200">
          {detailState.recentResults.map((result) => (
            <p key={result.matchId}>{result.label}</p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold text-slate-300">
          Noch keine Online-Ergebnisse.
        </p>
      )}
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
          <div className="mt-3 grid gap-2">
            {detailState.standings.slice(0, 4).map((standing) => (
              <div
                key={standing.teamName}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-semibold text-white">{standing.teamName}</span>
                <span className="font-mono text-slate-300">{standing.recordLabel}</span>
              </div>
            ))}
          </div>
        </div>

        <WeekResultPanel detailState={detailState} />
      </div>

      {detailState.roster && detailState.roster.depthChart.length > 0 ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
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
  if (!league || !currentUser || !league.fantasyDraft || league.fantasyDraft.status === "completed") {
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
