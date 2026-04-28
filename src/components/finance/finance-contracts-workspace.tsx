import { ContractTable } from "@/components/team/contract-table";
import { CapOverview } from "@/components/team/cap-overview";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { FinanceSectionNavigation } from "./finance-section-navigation";
import { getFinanceProjection, getFinanceWorkspaceSummary } from "./finance-model";

type FinanceContractsWorkspaceProps = {
  extendContractAction?: (formData: FormData) => Promise<void>;
  releaseContractPlayerAction?: (formData: FormData) => Promise<void>;
  saveGameId: string;
  team: TeamDetail;
};

export function FinanceContractsWorkspace({
  extendContractAction,
  releaseContractPlayerAction,
  saveGameId,
  team,
}: FinanceContractsWorkspaceProps) {
  const summary = getFinanceWorkspaceSummary(team);
  const projection = getFinanceProjection(team);

  return (
    <div className="space-y-8">
      <FinanceSectionNavigation saveGameId={saveGameId} />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Contracts" value={String(summary.contractSummary.contractCount)} />
        <StatCard
          label="Total Cap Hit"
          value={formatCurrency(summary.contractSummary.totalCapHit)}
        />
        <StatCard label="Expiring Cap" value={formatCurrency(projection.expiringCap)} />
        <StatCard label="Expiring Players" value={String(projection.expiringPlayers)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1fr)]">
        <CapOverview team={team} />
        <ContractTable
          extendContractAction={extendContractAction}
          releaseContractPlayerAction={releaseContractPlayerAction}
          saveGameId={saveGameId}
          team={team}
        />
      </section>
    </div>
  );
}
