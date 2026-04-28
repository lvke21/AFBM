import { SectionPanel } from "@/components/layout/section-panel";
import { DepthChartView } from "@/components/team/depth-chart-view";
import { TeamSectionNavigation } from "@/components/team/team-section-navigation";
import { getRosterSummary } from "@/components/team/team-overview-model";
import { StatCard } from "@/components/ui/stat-card";

import { moveDepthChartPlayerAction, updateRosterAssignmentAction } from "../actions";
import {
  loadCanonicalTeamPageData,
  type CanonicalTeamRoutePageProps,
} from "../team-route-data";

export default async function CanonicalTeamDepthChartPage({
  params,
}: CanonicalTeamRoutePageProps) {
  const { savegameId, team, teamId } = await loadCanonicalTeamPageData(params);
  const rosterSummary = getRosterSummary(team.players);
  const unassignedPlayers = team.players.filter((player) => !player.depthChartSlot).length;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Starter" value={String(rosterSummary.starters)} tone="positive" />
        <StatCard label="Unassigned" value={String(unassignedPlayers)} />
        <StatCard label="Injuries" value={String(rosterSummary.injured)} />
        <StatCard label="Roster" value={String(rosterSummary.playerCount)} />
      </section>

      <TeamSectionNavigation saveGameId={savegameId} teamId={teamId} />

      <SectionPanel
        title="Depth Chart & Assignments"
        description="Starter, Slot-Reihenfolge, Spezialrollen, Captain-Rollen und Development Focus verwalten."
      >
        <div data-onboarding-key="depth-chart">
          <DepthChartView
            managerControlled={team.managerControlled}
            players={team.players}
            saveGameId={savegameId}
            teamId={team.id}
            moveDepthChartPlayerAction={moveDepthChartPlayerAction}
            updateRosterAssignmentAction={updateRosterAssignmentAction}
          />
        </div>
      </SectionPanel>
    </div>
  );
}
