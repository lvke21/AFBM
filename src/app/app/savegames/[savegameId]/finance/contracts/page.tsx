import { FinanceContractsWorkspace } from "@/components/finance/finance-contracts-workspace";
import {
  extendContractAction,
  releaseContractPlayerAction,
} from "../../team/actions";
import { getFinanceRouteTeam } from "../finance-route-data";

type FinanceContractsPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function FinanceContractsPage({
  params,
}: FinanceContractsPageProps) {
  const { savegameId } = await params;
  const team = await getFinanceRouteTeam(savegameId);

  return (
    <FinanceContractsWorkspace
      extendContractAction={extendContractAction}
      releaseContractPlayerAction={releaseContractPlayerAction}
      saveGameId={savegameId}
      team={team}
    />
  );
}
