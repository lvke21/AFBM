import Link from "next/link";

import { SectionPanel } from "@/components/layout/section-panel";
import { RosterDecisionInboxPanel } from "@/components/inbox/roster-decision-inbox-panel";
import { buildRosterDecisionInbox } from "@/components/inbox/roster-decision-model";
import { TeamCard } from "@/components/team/team-card";
import { TeamNeedsPanel } from "@/components/team/team-needs-panel";
import { TeamSectionNavigation } from "@/components/team/team-section-navigation";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import {
  getCapSummary,
  getContractTableSummary,
  getRosterSummary,
} from "@/components/team/team-overview-model";
import {
  getTeamFreeAgencyHref,
  loadCanonicalTeamPageData,
  type CanonicalTeamRoutePageProps,
} from "./team-route-data";

function TeamAreaCard({
  description,
  href,
  kicker,
  metric,
  title,
}: {
  description: string;
  href: string;
  kicker: string;
  metric: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-emerald-300/30 hover:bg-emerald-300/8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {kicker}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
      <p className="mt-4 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm font-semibold text-emerald-100">
        {metric}
      </p>
    </Link>
  );
}

export default async function CanonicalTeamPage({ params }: CanonicalTeamRoutePageProps) {
  const { savegameId, team, teamId } = await loadCanonicalTeamPageData(params);
  const freeAgencyHref = getTeamFreeAgencyHref(savegameId, team.managerControlled);
  const baseHref = `/app/savegames/${savegameId}/team`;
  const financeHref = `/app/savegames/${savegameId}/finance`;
  const rosterSummary = getRosterSummary(team.players);
  const capSummary = getCapSummary(team);
  const contractSummary = getContractTableSummary(team.players);
  const topNeed = [...team.teamNeeds].sort((left, right) => right.needScore - left.needScore)[0];
  const rosterDecisionInbox = buildRosterDecisionInbox({
    saveGameId: savegameId,
    team,
  });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Team" value={team.abbreviation} tone="positive" />
        <StatCard label="Record" value={team.currentRecord} />
        <StatCard label="Overall" value={String(team.overallRating)} />
        <StatCard label="Cap Space" value={formatCurrency(team.salaryCapSpace)} />
      </section>

      <TeamSectionNavigation saveGameId={savegameId} teamId={teamId} />

      <TeamCard freeAgencyHref={freeAgencyHref} team={team} />

      <RosterDecisionInboxPanel decisions={rosterDecisionInbox} />

      <SectionPanel
        title="Team Command Center"
        description="Die Teamseite bleibt auf Kader, Depth Chart und sportliche Identitaet fokussiert. Finance ist ein eigener Arbeitsbereich."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TeamAreaCard
            description="Kader filtern, sortieren, Spielerprofile oeffnen und Release-Aktionen ausloesen."
            href={`${baseHref}/roster`}
            kicker="Roster"
            metric={`${rosterSummary.playerCount} Spieler · AVG ${rosterSummary.averageOverall}`}
            title="Kader verwalten"
          />
          <TeamAreaCard
            description="Starter, Backups, KR/PR, Captain-Rollen und Development Focus pflegen."
            href={`${baseHref}/depth-chart`}
            kicker="Depth Chart"
            metric={`${rosterSummary.starters} Starter · ${rosterSummary.injured} verletzt`}
            title="Depth Chart steuern"
          />
          <TeamAreaCard
            description="Cap Space, Cash, Vertraege und Finanzereignisse im eigenstaendigen GM-Workspace analysieren."
            href={financeHref}
            kicker="Finance"
            metric={`${capSummary.capUsagePercent}% Cap gebunden`}
            title="Finanzen steuern"
          />
          <TeamAreaCard
            description="Spielervertraege, Laufzeiten, Cap Hits und auslaufende Bindungen rosterbezogen pruefen."
            href={`${baseHref}/contracts`}
            kicker="Contracts"
            metric={`${contractSummary.contractCount} Vertraege`}
            title="Vertraege pruefen"
          />
          <TeamAreaCard
            description="Eigene Spieler und potenzielle Zielspieler visuell gegenueberstellen, ohne Trades auszufuehren."
            href={`${baseHref}/trades`}
            kicker="Trades"
            metric="Board · Targets · Cap"
            title="Trade Board vorbereiten"
          />
          <TeamAreaCard
            description="Zusammenhalt, Morale, Unit Fit und Risiko-Signale fuer Offense und Defense sichtbar machen."
            href={`${baseHref}/chemistry`}
            kicker="Chemistry"
            metric={`${team.morale} Morale`}
            title="Team-Zusammenhalt verstehen"
          />
          <TeamAreaCard
            description="Star-Spieler, Aktivierungsbedingungen und sichtbare X-Factor-Effekte pruefen."
            href={`${baseHref}/x-factor`}
            kicker="X-Factor"
            metric="Stars · Conditions · Effects"
            title="Star-Effekte ansehen"
          />
          <TeamAreaCard
            description="Offense, Defense und Special Teams Identity mit Team Needs abgleichen."
            href={`${baseHref}/schemes`}
            kicker="Schemes"
            metric={topNeed ? `Top Need ${topNeed.positionCode} · ${topNeed.needScore}` : "Keine akuten Needs"}
            title="Identity setzen"
          />
          <TeamAreaCard
            description="Strategische Tendenzen und Vorlagen fuer die naechste Spielvorbereitung buendeln."
            href={`${baseHref}/gameplan`}
            kicker="Gameplan"
            metric={team.schemes.offense ?? "Balanced"}
            title="Strategie planen"
          />
        </div>
      </SectionPanel>

      <TeamNeedsPanel
        compact
        freeAgencyHref={freeAgencyHref}
        needs={team.teamNeeds}
      />
    </div>
  );
}
