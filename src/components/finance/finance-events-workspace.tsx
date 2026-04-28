import { FinanceEventList } from "@/components/team/finance-event-list";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { FinanceSectionNavigation } from "./finance-section-navigation";
import { getFinanceEventSummary } from "./finance-model";

type FinanceEventsWorkspaceProps = {
  saveGameId: string;
  team: TeamDetail;
};

export function FinanceEventsWorkspace({ saveGameId, team }: FinanceEventsWorkspaceProps) {
  const summary = getFinanceEventSummary(team.recentFinanceEvents);

  return (
    <div className="space-y-8">
      <FinanceSectionNavigation saveGameId={saveGameId} />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Events" value={String(summary.eventCount)} />
        <StatCard label="Cash Impact" value={formatCurrency(summary.totalCashImpact)} />
        <StatCard label="Cap Impact" value={formatCurrency(summary.totalCapImpact)} />
        <StatCard
          label="Letztes Event"
          value={summary.latestEventLabel}
          tone={summary.eventCount > 0 ? "positive" : "default"}
        />
      </section>

      <FinanceEventList events={team.recentFinanceEvents} />
    </div>
  );
}
