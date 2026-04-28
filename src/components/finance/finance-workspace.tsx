import { CapOverview } from "@/components/team/cap-overview";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { FinanceDecisionPanel } from "./finance-decision-panel";
import { getFinanceWorkspaceSummary } from "./finance-model";
import { FinanceProjectionPanel } from "./finance-projection-panel";
import { FinanceSectionNavigation } from "./finance-section-navigation";

type FinanceWorkspaceProps = {
  saveGameId: string;
  team: TeamDetail;
};

export function FinanceWorkspace({ saveGameId, team }: FinanceWorkspaceProps) {
  const summary = getFinanceWorkspaceSummary(team);

  return (
    <div className="space-y-8">
      <FinanceSectionNavigation saveGameId={saveGameId} />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Cap Space"
          value={formatCurrency(team.salaryCapSpace)}
          tone={team.salaryCapSpace >= 0 ? "positive" : "default"}
        />
        <StatCard label="Cash" value={formatCurrency(team.cashBalance)} />
        <StatCard label="Cap Used" value={`${summary.capSummary.capUsagePercent}%`} />
        <StatCard label="Contracts" value={String(summary.contractSummary.contractCount)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <CapOverview team={team} />
        <FinanceDecisionPanel team={team} />
      </section>

      <FinanceProjectionPanel team={team} />
    </div>
  );
}
