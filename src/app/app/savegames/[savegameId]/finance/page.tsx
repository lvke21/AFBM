import { FinanceWorkspace } from "@/components/finance/finance-workspace";
import { getFinanceRouteTeam } from "./finance-route-data";

type FinancePageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function FinancePage({ params }: FinancePageProps) {
  const { savegameId } = await params;
  const team = await getFinanceRouteTeam(savegameId);

  return <FinanceWorkspace saveGameId={savegameId} team={team} />;
}
