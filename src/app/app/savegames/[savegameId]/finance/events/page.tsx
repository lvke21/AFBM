import { FinanceEventsWorkspace } from "@/components/finance/finance-events-workspace";
import { getFinanceRouteTeam } from "../finance-route-data";

type FinanceEventsPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function FinanceEventsPage({ params }: FinanceEventsPageProps) {
  const { savegameId } = await params;
  const team = await getFinanceRouteTeam(savegameId);

  return <FinanceEventsWorkspace saveGameId={savegameId} team={team} />;
}
