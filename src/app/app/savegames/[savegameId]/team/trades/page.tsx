import { SectionPanel } from "@/components/layout/section-panel";
import { TeamSectionNavigation } from "@/components/team/team-section-navigation";
import { TradeBoard } from "@/components/trades/trade-board";
import { getTradeMarketForUser } from "@/modules/teams/application/team-management.service";
import { requirePageUserId } from "@/lib/auth/session";
import {
  loadCanonicalTeamPageData,
  type CanonicalTeamRoutePageProps,
} from "../team-route-data";

export default async function TeamTradesPage({ params }: CanonicalTeamRoutePageProps) {
  const { savegameId, teamId } = await loadCanonicalTeamPageData(params);
  const userId = await requirePageUserId();
  const market = await getTradeMarketForUser(userId, savegameId);

  return (
    <div className="space-y-8">
      <TeamSectionNavigation saveGameId={savegameId} teamId={teamId} />

      <SectionPanel
        title="Trade Board"
        description="Spieler visuell gegenueberstellen und Trade-Ideen vorbereiten. Keine Trade-Ausfuehrung auf diesem Screen."
      >
        <TradeBoard market={market} saveGameId={savegameId} />
      </SectionPanel>
    </div>
  );
}
