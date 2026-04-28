import { StatusBadge } from "@/components/ui/status-badge";

import type { PostGameCausalityItem, PostGameReportState } from "./post-game-report-model";

type PostGameCausalityPanelProps = {
  state: PostGameReportState;
};

const itemOrder: Array<keyof PostGameReportState["causality"]> = [
  "gameSummary",
  "keyFactor",
  "turningPoint",
  "nextWeek",
];

function sourceTone(source: PostGameCausalityItem["sourceLabel"]) {
  if (source === "Data") {
    return "success" as const;
  }

  if (source === "Derived") {
    return "active" as const;
  }

  return "warning" as const;
}

function sourceLabel(source: PostGameCausalityItem["sourceLabel"]) {
  if (source === "Data") {
    return "Spielstatistik";
  }

  if (source === "Derived") {
    return "Spielanalyse";
  }

  return "Begrenzte Daten";
}

function toneClasses(tone: PostGameCausalityItem["tone"]) {
  if (tone === "success") {
    return "border-emerald-300/25 bg-emerald-300/10";
  }

  if (tone === "danger") {
    return "border-rose-300/25 bg-rose-300/10";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10";
  }

  if (tone === "active") {
    return "border-sky-300/25 bg-sky-300/10";
  }

  return "border-white/10 bg-black/15";
}

function CausalityCard({ item }: { item: PostGameCausalityItem }) {
  return (
    <article className={`rounded-lg border p-4 ${toneClasses(item.tone)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {item.label}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
        </div>
        <StatusBadge label={sourceLabel(item.sourceLabel)} tone={sourceTone(item.sourceLabel)} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
    </article>
  );
}

export function PostGameCausalityPanel({ state }: PostGameCausalityPanelProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Warum das Spiel so lief
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Die wichtigsten Ursachen</h2>
        </div>
        <StatusBadge label="Analyse" tone="active" />
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-4">
        {itemOrder.map((key) => (
          <CausalityCard key={key} item={state.causality[key]} />
        ))}
      </div>
    </section>
  );
}
