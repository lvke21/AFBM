import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";

import type { PostGameMotivationGoal } from "./post-game-report-model";

type PostGameMotivationPanelProps = {
  goal: PostGameMotivationGoal;
};

export function PostGameMotivationPanel({ goal }: PostGameMotivationPanelProps) {
  return (
    <section className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={goal.label} tone={goal.tone} />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
              Fix fuer naechste Woche
            </span>
          </div>
          <h2
            className="mt-3 text-2xl font-semibold text-white md:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {goal.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{goal.description}</p>
        </div>

        <Link
          href={goal.actionHref}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-emerald-200/45 bg-emerald-300/15 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/22"
        >
          {goal.actionLabel}
        </Link>
      </div>
    </section>
  );
}
