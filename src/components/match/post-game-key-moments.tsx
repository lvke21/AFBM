import { StatusBadge } from "@/components/ui/status-badge";

import type { PostGameReportState, ReportKeyMoment } from "./post-game-report-model";

type PostGameKeyMomentsProps = {
  state: PostGameReportState;
};

function highlightLabel(highlight: ReportKeyMoment["highlight"]) {
  if (highlight === "touchdown") {
    return "TD";
  }

  if (highlight === "turnover") {
    return "Turnover";
  }

  if (highlight === "field-goal") {
    return "FG";
  }

  if (highlight === "big-play") {
    return "Big Play";
  }

  if (highlight === "red-zone") {
    return "Red Zone";
  }

  return "Drive";
}

function momentClass(highlight: ReportKeyMoment["highlight"]) {
  if (highlight === "touchdown" || highlight === "big-play") {
    return "border-emerald-300/35 bg-emerald-300/10";
  }

  if (highlight === "turnover") {
    return "border-red-300/35 bg-red-300/10";
  }

  if (highlight === "field-goal" || highlight === "red-zone") {
    return "border-amber-300/35 bg-amber-300/10";
  }

  return "border-white/10 bg-black/15";
}

export function PostGameKeyMoments({ state }: PostGameKeyMomentsProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Key Moments
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Why The Game Turned</h2>
        </div>
        <StatusBadge label={`${state.keyMoments.length} Moments`} tone={state.keyMoments.length > 0 ? "active" : "warning"} />
      </div>

      {state.keyMoments.length > 0 ? (
        <div className="mt-5 space-y-3">
          {state.keyMoments.map((moment) => (
            <article key={moment.sequence} className={`rounded-lg border p-4 ${momentClass(moment.highlight)}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {moment.phaseLabel} · {moment.scoreChangeLabel}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{moment.title}</h3>
                </div>
                <StatusBadge label={highlightLabel(moment.highlight)} tone={moment.tone} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">{moment.description}</p>
              <p className="mt-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-slate-300">
                {moment.meta}
              </p>
              {moment.lineupContext ? (
                <p className="mt-3 rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100">
                  {moment.lineupContext}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/10 p-5">
          <StatusBadge label="Noch keine Drives" tone="warning" />
          <p className="mt-3 text-sm leading-6 text-amber-50">{state.keyMomentsEmptyMessage}</p>
        </div>
      )}
    </section>
  );
}
