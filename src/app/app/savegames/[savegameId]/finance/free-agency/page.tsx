import FreeAgentsPage from "../../free-agents/page";

type FinanceFreeAgencyPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function FinanceFreeAgencyPage({
  params,
}: FinanceFreeAgencyPageProps) {
  return FreeAgentsPage({ params });
}
