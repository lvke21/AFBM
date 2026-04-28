import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils/format";

import type { LiveSimulationMatch, LiveSimulationState } from "./live-simulation-model";

type LiveMatchHeaderProps = {
  match: LiveSimulationMatch;
  state: LiveSimulationState;
};

function statusTone(status: string) {
  if (status === "IN_PROGRESS") {
    return "warning" as const;
  }

  if (status === "COMPLETED") {
    return "success" as const;
  }

  return "active" as const;
}

export function LiveMatchHeader({ match, state }: LiveMatchHeaderProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(245,185,66,0.16),rgba(7,17,29,0.94)_45%,rgba(47,140,255,0.12))] p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Live-Spiel" tone="active" />
            <StatusBadge label={state.statusLabel} tone={statusTone(match.status)} />
          </div>
          <h1
            className="mt-5 text-3xl font-semibold text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {state.homeTeam.name}
          </h1>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Heim · {state.homeTeam.abbreviation}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/25 px-6 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Woche {match.week} · {state.situation.phaseLabel}
          </p>
          <p
            className="mt-4 text-5xl font-semibold text-white md:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {state.homeTeam.score} : {state.awayTeam.score}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {formatDate(match.scheduledAt)}
            {match.stadiumName ? ` · ${match.stadiumName}` : ""}
          </p>
        </div>

        <div className="xl:text-right">
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <StatusBadge label={state.driveCountLabel} tone="neutral" />
            {state.awayTeam.isManagerTeam ? <StatusBadge label="Dein Team" tone="success" /> : null}
          </div>
          <h2
            className="mt-5 text-3xl font-semibold text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {state.awayTeam.name}
          </h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Auswaerts · {state.awayTeam.abbreviation}
          </p>
        </div>
      </div>
    </section>
  );
}
