import Link from "next/link";

import { SectionPanel } from "@/components/layout/section-panel";
import { CapOverview } from "@/components/team/cap-overview";
import { ContractCapRiskPanel } from "@/components/team/contract-cap-risk-panel";
import { RosterTable } from "@/components/team/roster-table";
import { TeamSectionNavigation } from "@/components/team/team-section-navigation";
import { getCapSummary, getRosterSummary } from "@/components/team/team-overview-model";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils/format";

import { releasePlayerAction } from "../actions";
import {
  loadCanonicalTeamPageData,
  type CanonicalTeamRoutePageProps,
} from "../team-route-data";

function RosterPreparedActionsPanel({
  managerControlled,
  savegameId,
}: {
  managerControlled: boolean;
  savegameId: string;
}) {
  const baseHref = `/app/savegames/${savegameId}/team`;
  const actionClass =
    "inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition";

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Roster Actions
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Naechste Kaderentscheidungen</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Vorbereitete UI-Einstiege fuer die wichtigsten Team-Management-Flows. Neue Logik wurde
        nicht eingefuehrt.
      </p>

      <div className="mt-5 grid gap-2">
        <Link
          href={`${baseHref}/depth-chart`}
          className={`${actionClass} border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15`}
        >
          Starter und Rollen pruefen
        </Link>
        <Link
          href={`${baseHref}/contracts`}
          className={`${actionClass} border-sky-300/25 bg-sky-300/10 text-sky-100 hover:bg-sky-300/15`}
        >
          Contracts und Cap Hits ansehen
        </Link>
        {managerControlled ? (
          <Link
            href={`${baseHref}/trades`}
            className={`${actionClass} border-white/10 bg-white/5 text-white hover:bg-white/10`}
          >
            Trade Board oeffnen
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${actionClass} border-white/10 bg-black/15 text-slate-400`}
          >
            Trades nur Managerteam
          </span>
        )}
      </div>
    </section>
  );
}

export default async function CanonicalTeamRosterPage({
  params,
}: CanonicalTeamRoutePageProps) {
  const { savegameId, team, teamId } = await loadCanonicalTeamPageData(params);
  const rosterSummary = getRosterSummary(team.players);
  const capSummary = getCapSummary(team);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Roster" value={String(rosterSummary.playerCount)} tone="positive" />
        <StatCard label="Starter" value={String(rosterSummary.starters)} />
        <StatCard label="Average OVR" value={String(rosterSummary.averageOverall)} />
        <StatCard label="Injuries" value={String(rosterSummary.injured)} />
        <StatCard label="Cap Space" value={formatCurrency(capSummary.salaryCapSpace)} />
        <StatCard label="Cap Used" value={`${capSummary.capUsagePercent}%`} />
      </section>

      <TeamSectionNavigation saveGameId={savegameId} teamId={teamId} />

      <section className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <SectionPanel
          title="Roster Command"
          description="Kader filtern, Rating- und Statusgruppen vergleichen, Quick Info pruefen und vorhandene Team-Flows oeffnen."
          actions={
            team.managerControlled ? (
              <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100">
                Verwaltbar
              </span>
            ) : (
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
                Readonly
              </span>
            )
          }
        >
          <div data-onboarding-key="roster">
            <RosterTable
              capLimit={capSummary.capLimit}
              managerControlled={team.managerControlled}
              players={team.players}
              releasePlayerAction={releasePlayerAction}
              saveGameId={savegameId}
              teamId={team.id}
            />
          </div>
        </SectionPanel>

        <div className="space-y-5">
          <CapOverview team={team} />
          <ContractCapRiskPanel team={team} />
          <RosterPreparedActionsPanel
            managerControlled={team.managerControlled}
            savegameId={savegameId}
          />
        </div>
      </section>
    </div>
  );
}
