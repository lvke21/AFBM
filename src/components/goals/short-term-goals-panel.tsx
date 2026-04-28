import Link from "next/link";

import { SectionPanel } from "@/components/layout/section-panel";

import type { ShortTermGoalsState } from "./short-term-goals-model";

type ShortTermGoalsPanelProps = {
  state: ShortTermGoalsState;
};

function toneClass(tone: ShortTermGoalsState["goals"][number]["tone"]) {
  if (tone === "critical") {
    return "border-rose-300/25 bg-rose-300/10";
  }

  if (tone === "important") {
    return "border-amber-300/25 bg-amber-300/10";
  }

  return "border-white/10 bg-white/5";
}

export function ShortTermGoalsPanel({ state }: ShortTermGoalsPanelProps) {
  return (
    <SectionPanel
      title={state.title}
      description="Kleine Ziele fuer die naechsten Wochen. Keine Rewards, nur Orientierung."
    >
      {state.goals.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {state.goals.map((goal) => (
            <article key={goal.id} className={`rounded-lg border p-4 ${toneClass(goal.tone)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Ziel
              </p>
              <h3 className="mt-2 text-base font-semibold text-white">{goal.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{goal.description}</p>
              <Link
                href={goal.href}
                className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                {goal.actionLabel}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{state.emptyMessage}</p>
      )}
    </SectionPanel>
  );
}
