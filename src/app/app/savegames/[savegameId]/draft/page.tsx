import { notFound } from "next/navigation";

import { DraftOverviewScreen } from "@/components/draft/draft-overview-screen";
import { StatCard } from "@/components/ui/stat-card";
import { requirePageUserId } from "@/lib/auth/session";
import { getDraftOverviewForUser } from "@/modules/draft/application/draft-query.service";

import { pickDraftPlayerAction } from "./actions";

type DraftPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function DraftPage({ params }: DraftPageProps) {
  const { savegameId } = await params;
  const userId = await requirePageUserId();
  const overview = await getDraftOverviewForUser(userId, savegameId);

  if (!overview) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Draft Class" value={overview.draftClass?.name ?? "n/a"} />
        <StatCard label="Status" value={overview.draftClass?.status ?? "n/a"} />
        <StatCard label="Prospects" value={String(overview.summary.totalProspects)} />
        <StatCard
          label="Scouted"
          value={`${overview.summary.basicScouted + overview.summary.focusedScouted}`}
        />
      </section>

      <DraftOverviewScreen
        overview={overview}
        pickDraftPlayerAction={pickDraftPlayerAction}
      />
    </div>
  );
}
