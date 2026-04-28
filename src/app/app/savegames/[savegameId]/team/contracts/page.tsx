import Link from "next/link";

import { CapOverview } from "@/components/team/cap-overview";
import { ContractCapRiskPanel } from "@/components/team/contract-cap-risk-panel";
import { ContractTable } from "@/components/team/contract-table";
import { TeamSectionNavigation } from "@/components/team/team-section-navigation";
import {
  getCapSummary,
  getContractTableSummary,
} from "@/components/team/team-overview-model";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import {
  extendContractAction,
  releaseContractPlayerAction,
} from "../actions";

import {
  loadCanonicalTeamPageData,
  type CanonicalTeamRoutePageProps,
} from "../team-route-data";

export default async function CanonicalTeamContractsPage({
  params,
}: CanonicalTeamRoutePageProps) {
  const { savegameId, team, teamId } = await loadCanonicalTeamPageData(params);
  const contractSummary = getContractTableSummary(team.players);
  const capSummary = getCapSummary(team);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Contracts"
          value={String(contractSummary.contractCount)}
          tone="positive"
        />
        <StatCard label="Total Cap Hit" value={formatCurrency(contractSummary.totalCapHit)} />
        <StatCard label="Cap Used" value={`${capSummary.capUsagePercent}%`} />
        <StatCard
          label="Expiring"
          description="Kommende Verpflichtungen aus auslaufenden Bindungen."
          value={String(team.contractOutlook.expiringPlayers.length)}
          meta={formatCurrency(team.contractOutlook.expiringCap)}
          tone={team.contractOutlook.expiringPlayers.length > 0 ? "warning" : "positive"}
        />
      </section>

      <TeamSectionNavigation saveGameId={savegameId} teamId={teamId} />

      <section className="rounded-lg border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Contract Decision Layer
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Leistung, Entwicklung und Kosten abwaegen
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Pruefe zuerst, ob Cap Space fuer den Spieler reicht, ob seine Rolle den Cap Hit
              rechtfertigt und ob ein guenstiger Entwicklungsspieler dieselbe Entscheidung
              uebernehmen kann.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              href={`/app/savegames/${savegameId}/team/roster`}
            >
              Roster
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/15"
              href={`/app/savegames/${savegameId}/development`}
            >
              Development
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <CapOverview team={team} />
        <ContractCapRiskPanel team={team} />
      </section>

      <ContractTable
        extendContractAction={extendContractAction}
        releaseContractPlayerAction={releaseContractPlayerAction}
        saveGameId={savegameId}
        team={team}
      />
    </div>
  );
}
