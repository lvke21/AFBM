import Link from "next/link";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";

import type { GamePreviewMatch, GamePreviewState } from "./game-preview-model";

type StartMatchActionAreaProps = {
  dashboardHref: string;
  liveHref: string;
  match: GamePreviewMatch;
  reportHref: string;
  saveGameId: string;
  startAction: (formData: FormData) => Promise<void>;
  state: GamePreviewState;
};

function lockedReasonCopy(reason: string | null) {
  if (!reason) {
    return "Match starten wird freigeschaltet, sobald alle Voraussetzungen erfuellt sind.";
  }

  if (reason.includes("Week State")) {
    return "Bereite die Woche zuerst im Dashboard/Week Loop vor. Danach wird Match starten freigeschaltet.";
  }

  if (reason.includes("Depth Chart")) {
    return "Vor dem Kickoff ist eine echte Aufstellungswahl noetig. Entscheide zwischen aktueller Staerke, Stabilitaet oder Potenzial.";
  }

  return reason;
}

export function StartMatchActionArea({
  dashboardHref,
  liveHref,
  match,
  reportHref,
  saveGameId,
  startAction,
  state,
}: StartMatchActionAreaProps) {
  const reportReady = match.status === "COMPLETED";
  const liveReady = match.status === "IN_PROGRESS";
  const depthChartBlocked =
    state.startBlockedReason?.includes("Depth Chart") ||
    state.startBlockedReason?.includes("wichtige Starter");
  const helperCopy = state.canStartMatch
    ? state.startWarning ?? "Dein Team ist bereit. Der naechste Klick fuehrt ins Spiel."
    : lockedReasonCopy(state.startBlockedReason);
  const isWarningStart = state.canStartMatch && Boolean(state.startWarning);

  return (
    <section
      className="h-fit rounded-lg border border-sky-300/25 bg-sky-300/10 p-5"
      data-onboarding-key="game-start"
    >
      <div className="grid gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Kickoff" tone="active" />
            <StatusBadge
              label={state.canStartMatch ? (isWarningStart ? "Risiko" : "Bereit") : "Noch offen"}
              tone={state.canStartMatch ? (isWarningStart ? "warning" : "success") : "warning"}
            />
          </div>
          <h2
            className="mt-3 text-2xl font-semibold text-white md:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {state.canStartMatch
              ? isWarningStart
                ? "Trotz Aufstellungsrisiko starten"
                : "Match starten"
              : "Vor dem Kickoff fehlt noch etwas"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {helperCopy}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {state.canStartMatch ? (
            <form action={startAction} className="[&>button]:w-full">
              <input type="hidden" name="saveGameId" value={saveGameId} />
              <input type="hidden" name="matchId" value={match.id} />
              <FormSubmitButton pendingLabel="Match startet...">
                {state.primaryActionLabel}
              </FormSubmitButton>
            </form>
          ) : (
            <Link
              href={
                depthChartBlocked
                  ? dashboardHref.replace("#week-loop", "/team/depth-chart")
                  : dashboardHref
              }
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {depthChartBlocked
                ? "Depth Chart oeffnen"
                : "Week Loop vorbereiten"}
            </Link>
          )}
          <div className="grid gap-2">
            {liveReady ? (
              <Link
                href={liveHref}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
              >
                Game Center oeffnen
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-slate-400"
              >
                Game Center nach Start
              </span>
            )}
            {reportReady ? (
              <Link
                href={reportHref}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
              >
                Report oeffnen
              </Link>
            ) : (
              <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-slate-400">
                Report nach Spielende
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
