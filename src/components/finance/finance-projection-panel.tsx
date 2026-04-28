import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { getFinanceProjection } from "./finance-model";

type FinanceProjectionPanelProps = {
  team: TeamDetail;
};

export function FinanceProjectionPanel({ team }: FinanceProjectionPanelProps) {
  const projection = getFinanceProjection(team);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Prognose
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Naechster Cap-Ausblick</h2>
          <p className="mt-2 text-sm text-slate-300">
            Einfache Projektion auf Basis aktiver Cap-Hits und auslaufender Vertraege.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm font-semibold text-emerald-100">
          {projection.projectedUsagePercent}% projiziert gebunden
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs text-slate-400">Projizierter aktiver Cap</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatCurrency(projection.projectedActiveCap)}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs text-slate-400">Projizierter Cap Space</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatCurrency(projection.projectedCapSpace)}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs text-slate-400">Auslaufender Cap</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatCurrency(projection.expiringCap)}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs text-slate-400">Auslaufende Spieler</p>
          <p className="mt-2 text-lg font-semibold text-white">{projection.expiringPlayers}</p>
        </div>
      </div>
    </section>
  );
}
