import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { buildFinanceDecisionItems, type FinanceDecisionTone } from "./finance-model";

type FinanceDecisionPanelProps = {
  team: TeamDetail;
};

function toneClasses(tone: FinanceDecisionTone) {
  if (tone === "critical") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-50";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-50";
  }

  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-50";
  }

  return "border-white/10 bg-black/10 text-slate-200";
}

export function FinanceDecisionPanel({ team }: FinanceDecisionPanelProps) {
  const items = buildFinanceDecisionItems(team);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        GM Decisions
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Finanzielle Prioritaeten</h2>
      <p className="mt-2 text-sm text-slate-300">
        Fokusliste fuer Cap, Cash und Vertragsrisiken.
      </p>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className={`rounded-lg border p-4 ${toneClasses(item.tone)}`}>
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-sm text-slate-200">{item.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
