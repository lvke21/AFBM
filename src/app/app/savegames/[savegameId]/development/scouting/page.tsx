import { notFound } from "next/navigation";

import { DraftScoutingBoard } from "@/components/draft/draft-scouting-board";
import { SectionPanel } from "@/components/layout/section-panel";
import { StatCard } from "@/components/ui/stat-card";
import { requirePageUserId } from "@/lib/auth/session";
import { getDraftOverviewForUser } from "@/modules/draft/application/draft-query.service";
import { scoutProspectAction } from "./actions";

type DevelopmentScoutingPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function DevelopmentScoutingPage({
  params,
}: DevelopmentScoutingPageProps) {
  const { savegameId } = await params;
  const userId = await requirePageUserId();
  const board = await getDraftOverviewForUser(userId, savegameId);

  if (!board) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Draft Class" value={board.draftClass?.name ?? "n/a"} />
        <StatCard label="Prospects" value={String(board.summary.totalProspects)} />
        <StatCard
          label="Scouted"
          value={`${board.summary.basicScouted + board.summary.focusedScouted}`}
        />
      </section>

      <SectionPanel
        title="Scouting / Draft"
        description="Prospects schrittweise scouten: Basic zeigt Overall/Risk, Focused zeigt Potential und Detailhinweise."
        tone="subtle"
      >
        <DraftScoutingBoard
          board={board}
          saveGameId={savegameId}
          scoutProspectAction={scoutProspectAction}
        />
      </SectionPanel>
    </div>
  );
}
