import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { getFinanceEventListState } from "./team-overview-model";

type FinanceEventListProps = {
  events: TeamDetail["recentFinanceEvents"];
};

function impactClass(direction: string) {
  if (direction === "negative") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  }

  if (direction === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

export function FinanceEventList({ events }: FinanceEventListProps) {
  const state = getFinanceEventListState(events);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Finance Events
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Finanzhistorie</h2>

      {state.isEmpty ? (
        <div className="mt-5 rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
          {state.message}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {state.events.map((event) => (
            <div key={event.id} className="rounded-lg border border-white/8 bg-black/10 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {event.description ?? event.type}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {event.playerName ?? "Team"} · {formatDate(event.occurredAt)}
                  </p>
                </div>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-200">
                  {event.type}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className={`rounded-lg border px-3 py-2 text-xs ${impactClass(event.cashImpactDirection)}`}>
                  Cash {formatCurrency(event.amount)}
                </div>
                <div className={`rounded-lg border px-3 py-2 text-xs ${impactClass(event.capImpactDirection)}`}>
                  Cap {formatCurrency(event.capImpact)}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  Cash danach {formatCurrency(event.cashBalanceAfter)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
