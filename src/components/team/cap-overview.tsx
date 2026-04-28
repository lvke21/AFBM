import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { getCapSummary } from "./team-overview-model";

type CapOverviewProps = {
  team: TeamDetail;
};

export function CapOverview({ team }: CapOverviewProps) {
  const capSummary = getCapSummary(team);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Finanzielle Lage
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Cap Overview</h2>

      <div className="mt-5 space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300">Cap gebunden</span>
            <span className="font-semibold text-white">{capSummary.capUsagePercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-emerald-300"
              style={{ width: `${capSummary.capUsagePercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Cap Limit berechnet aus gebundenem Cap plus verfuegbarem Cap Space.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/8 bg-black/10 p-4">
            <p className="text-xs text-slate-400">Cap Limit</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatCurrency(capSummary.capLimit)}
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/10 p-4">
            <p className="text-xs text-slate-400">Aktiv gebunden</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatCurrency(capSummary.activeCapCommitted)}
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/10 p-4">
            <p className="text-xs text-slate-400">Cap Space</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatCurrency(capSummary.salaryCapSpace)}
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/10 p-4">
            <p className="text-xs text-slate-400">Cash</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatCurrency(team.cashBalance)}
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/10 p-4">
            <p className="text-xs text-slate-400">Auslaufend</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatCurrency(team.contractOutlook.expiringCap)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-sm font-semibold text-white">Naechste Vertragsrisiken</p>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            {team.contractOutlook.expiringPlayers.length > 0 ? (
              team.contractOutlook.expiringPlayers.slice(0, 5).map((player) => (
                <p key={player.id}>
                  {player.fullName} · {player.positionCode} · {player.years} Jahr ·{" "}
                  {formatCurrency(player.capHit)}
                </p>
              ))
            ) : (
              <p>Keine kurzfristig auslaufenden Vertraege.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
