import React from "react";
import Link from "next/link";

import { GlossaryTerm } from "./online-glossary";
import { OnlineModeStatus } from "./online-mode-status";
import type { OnlineLeagueDetailState } from "./online-league-detail-model";

type FoundOnlineLeagueDetailState = Extract<OnlineLeagueDetailState, { status: "found" }>;

type ReadyGuidanceItem = {
  label: string;
  completed: boolean;
  statusLabel: string;
};

type ActionFeedback = {
  tone: "success" | "warning";
  message: string;
};

export function OnlineLeagueLoadingState() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-slate-200">
      Liga wird geladen...
    </div>
  );
}

export function OnlineLeagueHeader({
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

export function OnlineLeagueActionFeedback({
  feedback,
}: {
  feedback: ActionFeedback | null;
}) {
  if (!feedback) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
        feedback.tone === "success"
          ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
          : "border-amber-200/25 bg-amber-300/10 text-amber-100"
      }`}
    >
      {feedback.message}
    </div>
  );
}

export function OnlineLeagueAllReadyNotice({
  label,
}: {
  label: string | null;
}) {
  if (!label) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
      {label}
    </div>
  );
}

export function OnlineLeagueFirstSteps({
  detailState,
  readyGuidanceItems,
  pendingAction,
  onReadyForWeek,
}: {
  detailState: FoundOnlineLeagueDetailState;
  readyGuidanceItems: ReadyGuidanceItem[];
  pendingAction: string | null;
  onReadyForWeek: (ready: boolean) => void;
}) {
  const showReadyButton = detailState.lifecyclePhase !== "seasonComplete";

  return (
    <section
      aria-labelledby="first-steps-title"
      className="mt-6 rounded-lg border border-emerald-200/45 bg-emerald-300/12 p-5 shadow-xl shadow-emerald-950/30"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Erste Schritte
          </p>
          <h2 id="first-steps-title" className="mt-2 text-2xl font-semibold text-white">
            Was jetzt tun?
          </h2>
        </div>
        <p className="w-fit rounded-full border border-emerald-100/25 bg-emerald-50/10 px-3 py-1 text-sm font-semibold text-emerald-50">
          {detailState.firstSteps.progressLabel}
        </p>
      </div>

      <ol className="mt-5 grid gap-3 lg:grid-cols-3">
        {detailState.firstSteps.items.map((step, index) => (
          <li
            key={step.id}
            className={`rounded-lg border p-4 ${
              step.completed
                ? "border-emerald-200/35 bg-emerald-200/12"
                : "border-white/10 bg-[#07111d]/70"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                  step.completed
                    ? "border-emerald-100/45 bg-emerald-300/25 text-emerald-50"
                    : "border-white/15 bg-white/5 text-slate-200"
                }`}
              >
                {step.completed ? "✓" : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold text-white">{step.label}</p>
                <p className="mt-2 text-sm leading-6 text-emerald-50/85">
                  {step.description}
                </p>
                <p
                  className={`mt-3 text-xs font-semibold uppercase tracking-[0.14em] ${
                    step.completed ? "text-emerald-200" : "text-amber-200"
                  }`}
                >
                  {step.statusLabel}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-lg border border-emerald-100/25 bg-[#07111d]/70 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
              <GlossaryTerm term="readyState">Bereit-Status</GlossaryTerm>
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Bereit heißt: Deine Woche ist freigegeben
            </h3>
            <p className="mt-3 text-sm leading-6 text-emerald-50/85">
              Wenn du bereit bist, wartest du auf die anderen <GlossaryTerm term="manager">Manager</GlossaryTerm> oder den Admin.
              Du kannst auch später noch Änderungen machen, solange die Woche nicht simuliert wurde.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {readyGuidanceItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    item.completed
                      ? "border-emerald-200/30 bg-emerald-300/10 text-emerald-50"
                      : "border-amber-200/25 bg-amber-300/10 text-amber-100"
                  }`}
                >
                  <span aria-hidden="true">{item.completed ? "✓ " : "• "}</span>
                  {item.label === "Strategie/Depth Chart optional geprüft" ? (
                    <>
                      Strategie/<GlossaryTerm term="depthChart">Depth Chart</GlossaryTerm> optional geprüft
                    </>
                  ) : (
                    item.label
                  )}
                  <span className="mt-1 block text-xs uppercase tracking-[0.14em] opacity-80">
                    {item.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-2 lg:min-w-48">
            {showReadyButton ? (
              <button
                type="button"
                disabled={
                  !detailState.ownTeamName ||
                  pendingAction !== null ||
                  Boolean(detailState.readyActionDisabledReason)
                }
                onClick={() => onReadyForWeek(!detailState.currentUserReady)}
                aria-busy={pendingAction === "ready"}
                className={`w-fit rounded-lg border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-400 ${
                  detailState.currentUserReady
                    ? "border-amber-100/35 bg-amber-200/12 text-amber-50 hover:bg-amber-200/18"
                    : "border-emerald-100/35 bg-emerald-200/18 text-emerald-50 hover:bg-emerald-200/24"
                }`}
              >
                {pendingAction === "ready"
                  ? "Speichert..."
                  : detailState.currentUserReady
                    ? "Bereit zurücknehmen"
                    : `Bereit für ${detailState.currentWeekLabel}`}
              </button>
            ) : null}
            <p className="text-sm font-semibold text-emerald-50/80">
              {detailState.readyActionDisabledReason ?? detailState.nextActionLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OnlineLeagueRulesSection({
  detailState,
  expertMode,
}: {
  detailState: FoundOnlineLeagueDetailState;
  expertMode: boolean;
}) {
  return (
    <section className="mt-6 rounded-lg border border-amber-200/30 bg-amber-300/10 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
            Liga-Regeln
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Admin, Bereit-Status und Inaktivität
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-50/85">
            {expertMode
              ? detailState.leagueRules.compactSummary
              : "Diese Hinweise gelten, damit Admin-Eingriffe und Teamfreigaben früh verständlich sind."}
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-100/25 bg-amber-50/10 px-3 py-1 text-xs font-semibold text-amber-50">
          {detailState.leagueRules.sourceLabel}
        </span>
      </div>

      <ul className={`mt-4 grid gap-2 ${expertMode ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
        {detailState.leagueRules.items.map((rule) => (
          <li
            key={rule}
            className="rounded-lg border border-amber-100/20 bg-[#07111d]/65 px-3 py-2 text-sm font-semibold leading-6 text-amber-50"
          >
            {rule}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-6 text-slate-200">
        {detailState.leagueRules.activityRuleLabel}
      </p>
    </section>
  );
}

export function OnlineLeagueWeekFlowSection({
  detailState,
}: {
  detailState: FoundOnlineLeagueDetailState;
}) {
  return (
    <section
      id="week-loop"
      className="mt-8 scroll-mt-24 rounded-lg border border-sky-200/20 bg-[#07111d]/80 p-5"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
            {detailState.weekFlow.title}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {detailState.weekFlow.weekLabel}
          </h2>
          <p className="mt-3 w-fit rounded-full border border-sky-100/25 bg-sky-200/10 px-3 py-1 text-sm font-semibold text-sky-50">
            {detailState.weekFlow.phaseLabel}
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-300">
            {detailState.weekFlow.nextWeekLabel} · {detailState.weekFlow.lastScheduledWeekLabel}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Dein Bereit-Status
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {detailState.weekFlow.playerReadyStatusLabel}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <GlossaryTerm term="weekSimulation">Simulation</GlossaryTerm>
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {detailState.weekFlow.simulationStatusLabel}
            </p>
            {detailState.weekFlow.lastCompletedWeekLabel ? (
              <p className="mt-2 text-xs font-semibold text-slate-300">
                {detailState.weekFlow.lastCompletedWeekLabel}
              </p>
            ) : null}
            {detailState.weekFlow.completedResultsLabel ? (
              <p className="mt-1 text-xs font-semibold text-emerald-200">
                {detailState.weekFlow.completedResultsLabel}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Wartestatus
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {detailState.weekFlow.waitingStatusLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <p className="rounded-lg border border-sky-200/20 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-sky-50">
          {detailState.readyProgressLabel}
        </p>
        <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
          {detailState.weekFlow.adminProgressLabel}
        </p>
        <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
          Nächste Partie: {detailState.weekFlow.nextMatchLabel}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Nächste Aktion
        </p>
        <p className="mt-2 text-sm font-semibold text-white">
          {detailState.weekFlow.nextActionCtaLabel}
        </p>
      </div>

      {detailState.resultSummary.results.length > 0 ? (
        <div className="mt-4 rounded-lg border border-emerald-200/20 bg-emerald-300/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
            Ergebnisse {detailState.resultSummary.weekLabel ? `· ${detailState.resultSummary.weekLabel}` : ""}
          </p>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {detailState.resultSummary.results.map((result) => (
              <p
                key={result.matchId}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  result.isCurrentUserTeamInvolved
                    ? "border-emerald-100/35 bg-emerald-200/15 text-emerald-50"
                    : "border-white/10 bg-[#07111d]/70 text-emerald-50"
                }`}
              >
                {result.label}
                <span className="mt-1 block text-xs text-emerald-100/75">
                  {result.winnerLabel}
                  {result.isCurrentUserTeamInvolved ? " · Dein Spiel" : ""}
                </span>
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/5 px-4 py-3">
          <p className="text-sm font-semibold text-white">
            {detailState.resultSummary.emptyTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {detailState.resultSummary.emptyMessage}
          </p>
        </div>
      )}

      {detailState.weekFlow.showStartWeekButton ? (
        <div className="mt-5 rounded-lg border border-sky-200/25 bg-sky-300/10 px-4 py-3">
          <p className="text-sm font-semibold text-sky-50">
            {detailState.weekFlow.startWeekButtonLabel}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {detailState.weekFlow.startWeekHint}
          </p>
        </div>
      ) : null}
    </section>
  );
}
