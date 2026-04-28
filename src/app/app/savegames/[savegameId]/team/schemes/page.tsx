import { SchemeSelector } from "@/components/team/scheme-selector";
import { TeamNeedsPanel } from "@/components/team/team-needs-panel";
import { TeamSectionNavigation } from "@/components/team/team-section-navigation";
import { StatCard } from "@/components/ui/stat-card";

import { updateTeamSchemesAction } from "../actions";
import {
  getTeamFreeAgencyHref,
  loadCanonicalTeamPageData,
  type CanonicalTeamRoutePageProps,
} from "../team-route-data";

export default async function CanonicalTeamSchemesPage({
  params,
}: CanonicalTeamRoutePageProps) {
  const { savegameId, team, teamId } = await loadCanonicalTeamPageData(params);
  const freeAgencyHref = getTeamFreeAgencyHref(savegameId, team.managerControlled);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Offense" value={team.schemes.offense ?? "n/a"} tone="positive" />
        <StatCard label="Defense" value={team.schemes.defense ?? "n/a"} />
        <StatCard label="Special Teams" value={team.schemes.specialTeams ?? "n/a"} />
      </section>

      <TeamSectionNavigation saveGameId={savegameId} teamId={teamId} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SchemeSelector
          saveGameId={savegameId}
          team={team}
          updateAction={updateTeamSchemesAction}
        />
        <TeamNeedsPanel
          freeAgencyHref={freeAgencyHref}
          needs={team.teamNeeds}
        />
      </section>
    </div>
  );
}
