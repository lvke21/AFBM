import { notFound } from "next/navigation";

import { FreeAgentBoard } from "@/components/free-agency/free-agent-board";
import { SectionPanel } from "@/components/layout/section-panel";
import { StatCard } from "@/components/ui/stat-card";
import { sortTeamNeeds } from "@/components/team/team-overview-model";
import { requirePageUserId } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils/format";
import { getFreeAgentMarketForUser } from "@/modules/teams/application/team-management.service";
import { signFreeAgentAction } from "./actions";

type FreeAgentsPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function FreeAgentsPage({ params }: FreeAgentsPageProps) {
  const { savegameId } = await params;
  const userId = await requirePageUserId();
  const market = await getFreeAgentMarketForUser(userId, savegameId);

  if (!market) {
    notFound();
  }

  const sortedNeeds = sortTeamNeeds(market.managerTeam.needs).slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Manager Team" value={market.managerTeam.abbreviation} tone="positive" />
        <StatCard label="Cap Space" value={formatCurrency(market.managerTeam.salaryCapSpace)} />
        <StatCard label="Cash" value={formatCurrency(market.managerTeam.cashBalance)} />
        <StatCard
          label="Roster"
          value={`${market.managerTeam.rosterCount}/${market.managerTeam.activeLimit}`}
        />
        <StatCard label="Free Agents" value={String(market.players.length)} />
      </section>

      <SectionPanel
        title="Team Needs"
        description="Die wichtigsten Bedarfspunkte fuer den Markt. Signings werden gegen Cap Space und Cash geprueft."
      >
        <div className="mb-5 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          Schemes: {market.managerTeam.schemes.offense ?? "n/a"} ·{" "}
          {market.managerTeam.schemes.defense ?? "n/a"} ·{" "}
          {market.managerTeam.schemes.specialTeams ?? "n/a"}
        </div>

        {sortedNeeds.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-5">
            {sortedNeeds.map((need) => (
              <div key={need.positionCode} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {need.positionCode}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{need.positionName}</p>
                <p className="mt-2 text-sm text-slate-300">
                  Bedarf {need.needScore} · Starter {need.starterAverage}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Scheme Fit {need.starterSchemeFit ?? "-"} · {need.playerCount}/
                  {need.targetCount}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/8 p-4 text-sm text-emerald-50">
            Keine priorisierten Team Needs vorhanden.
          </div>
        )}
      </SectionPanel>

      <SectionPanel
        title="Free Agency"
        description="Sortierbares Board mit Angebotserstellung, Cap-Pruefung und direkter Verpflichtung."
      >
        <FreeAgentBoard
          market={market}
          saveGameId={savegameId}
          signAction={signFreeAgentAction}
        />
      </SectionPanel>
    </div>
  );
}
