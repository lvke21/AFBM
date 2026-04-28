import { StatusBadge } from "@/components/ui/status-badge";

import type { PostGameReportState, TeamImpactItem } from "./post-game-report-model";

type TeamImpactPanelProps = {
  state: PostGameReportState;
};

function sourceTone(source: TeamImpactItem["sourceLabel"]) {
  if (source === "Data") {
    return "success" as const;
  }

  if (source === "Derived") {
    return "active" as const;
  }

  return "warning" as const;
}

function sourceLabel(source: TeamImpactItem["sourceLabel"]) {
  if (source === "Data") {
    return "Spielstatistik";
  }

  if (source === "Derived") {
    return "Spielanalyse";
  }

  return "Begrenzte Daten";
}

export function TeamImpactPanel({ state }: TeamImpactPanelProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Was das Spiel gezeigt hat
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Was du fuer naechste Woche mitnimmst</h2>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {state.teamImpact.map((item) => (
          <article key={item.label} className="rounded-lg border border-white/10 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {item.label}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">{item.value}</h3>
              </div>
              <StatusBadge label={sourceLabel(item.sourceLabel)} tone={sourceTone(item.sourceLabel)} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
