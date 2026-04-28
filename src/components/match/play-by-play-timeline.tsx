import { StatusBadge } from "@/components/ui/status-badge";

import type { LiveSimulationState, LiveTimelineEntry, LiveTimelineHighlight } from "./live-simulation-model";
import { liveEventBadgeLabel, liveEventBorderClass, liveEventDramaturgy } from "./live-event-dramaturgy";

type PlayByPlayTimelineProps = {
  state: LiveSimulationState;
};

function highlightLabel(highlight: LiveTimelineHighlight) {
  return liveEventBadgeLabel(highlight);
}

function borderClass(highlight: LiveTimelineHighlight) {
  return liveEventBorderClass(highlight);
}

function TimelineEntry({ entry }: { entry: LiveTimelineEntry }) {
  const dramaturgy = liveEventDramaturgy(entry);

  return (
    <article className={`rounded-lg border p-4 ${borderClass(entry.highlight)}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {dramaturgy.eyebrow} · {entry.phaseLabel} · Drive {entry.sequence}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{entry.title}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {entry.offenseTeamAbbreviation} Offense vs {entry.defenseTeamAbbreviation} Defense
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {entry.isImportant ? <StatusBadge label={highlightLabel(entry.highlight)} tone={entry.tone} /> : null}
          <StatusBadge label={entry.resultLabel} tone={entry.tone} />
        </div>
      </div>

      {entry.isImportant ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {dramaturgy.momentTitle}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white">
            {dramaturgy.momentDescription}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-slate-200">{entry.description}</p>

      <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-300 sm:grid-cols-2">
        <p className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
          Score {entry.scoreChangeLabel}
        </p>
        <p className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
          {entry.meta}
        </p>
      </div>
      {entry.lineupContext ? (
        <p className="mt-3 rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100">
          {entry.lineupContext}
        </p>
      ) : null}
    </article>
  );
}

export function PlayByPlayTimeline({ state }: PlayByPlayTimelineProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Play-by-Play
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Drive Timeline</h2>
        </div>
        <StatusBadge label={state.driveCountLabel} tone={state.hasTimeline ? "active" : "warning"} />
      </div>

      {state.hasTimeline ? (
        <div className="mt-5 space-y-3">
          {state.timeline.map((entry) => (
            <TimelineEntry key={entry.sequence} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/10 p-5">
          <StatusBadge label="Noch keine Drives" tone="warning" />
          <p className="mt-3 text-sm leading-6 text-amber-50">{state.timelineEmptyMessage}</p>
        </div>
      )}
    </section>
  );
}
