import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";

import type { PostGameConsequenceItem, PostGameReportState } from "./post-game-report-model";

type PostGameConsequencesPanelProps = {
  state: PostGameReportState;
};

function toneLabel(tone: PostGameConsequenceItem["tone"]) {
  if (tone === "success") {
    return "Worked";
  }

  if (tone === "warning") {
    return "Watch";
  }

  if (tone === "danger") {
    return "Problem";
  }

  if (tone === "active") {
    return "Next";
  }

  return "Read";
}

function ConsequenceCard({
  item,
  primary = false,
}: {
  item: PostGameConsequenceItem;
  primary?: boolean;
}) {
  return (
    <article
      className={[
        "rounded-lg border p-4",
        primary
          ? "border-emerald-300/25 bg-emerald-300/10"
          : "border-white/10 bg-black/15",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {item.label}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
        </div>
        <StatusBadge label={toneLabel(item.tone)} tone={item.tone} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
      {item.href ? (
        <Link
          href={item.href}
          className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Entscheidung oeffnen
        </Link>
      ) : null}
    </article>
  );
}

export function PostGameConsequencesPanel({ state }: PostGameConsequencesPanelProps) {
  const { consequences } = state;

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Post-Game Consequences
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">What This Means For Next Week</h2>
        </div>
        <StatusBadge label="Manager-Fazit" tone="active" />
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <ConsequenceCard item={consequences.decider} primary />
        <ConsequenceCard item={consequences.nextWeek} />
      </div>

      <div className="mt-3">
        <ConsequenceCard item={consequences.attention} />
      </div>
    </section>
  );
}
