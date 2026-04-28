import { StatusBadge } from "@/components/ui/status-badge";

import type { DashboardDecisionFeedbackItem } from "./dashboard-model";

type DecisionFeedbackAreaProps = {
  items: DashboardDecisionFeedbackItem[];
};

function impactTone(impact: DashboardDecisionFeedbackItem["impact"]) {
  if (impact === "positive") {
    return "success" as const;
  }

  if (impact === "negative") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function sourceTone(source: DashboardDecisionFeedbackItem["source"]) {
  if (source === "Action") {
    return "active" as const;
  }

  if (source === "UI-Fixture") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function sourceLabel(source: DashboardDecisionFeedbackItem["source"]) {
  if (source === "Action") {
    return "Aus deiner Historie";
  }

  if (source === "UI-Fixture") {
    return "Noch keine Aktionen";
  }

  return "Empfehlung";
}

export function DecisionFeedbackArea({ items }: DecisionFeedbackAreaProps) {
  const hasActionHistory = items.some((item) => item.source === "Action");

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Decision Feedback
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Impact & Value Signals</h2>
        </div>
        <StatusBadge
          label={hasActionHistory ? "Aktuelle Historie" : "Bereit fuer erste Aktion"}
          tone="active"
        />
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <article key={`${item.source}-${item.title}`} className="rounded-lg border border-white/10 bg-black/15 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={item.impact} tone={impactTone(item.impact)} />
                <StatusBadge label={sourceLabel(item.source)} tone={sourceTone(item.source)} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{item.reason}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.context}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
