import { notFound } from "next/navigation";

import { InboxList } from "@/components/inbox/inbox-list";
import { buildInboxState, normalizeInboxFilter } from "@/components/inbox/inbox-model";
import { SectionPanel } from "@/components/layout/section-panel";
import { StatCard } from "@/components/ui/stat-card";
import { requirePageUserId } from "@/lib/auth/session";
import { listInboxTaskStatesForUser } from "@/modules/inbox/application/inbox-task.service";
import { getSaveGameFlowSnapshot } from "@/modules/savegames/application/savegame-query.service";
import { getSeasonOverviewForUser } from "@/modules/seasons/application/season-query.service";
import { getTeamDetailForUser } from "@/modules/teams/application/team-query.service";
import { updateInboxTaskOptimisticAction } from "./actions";

type InboxPageProps = {
  params: Promise<{
    savegameId: string;
  }>;
  searchParams?: Promise<{
    filter?: string;
  }>;
};

export default async function InboxPage({ params, searchParams }: InboxPageProps) {
  const { savegameId } = await params;
  const query = (await searchParams) ?? {};
  const filter = normalizeInboxFilter(query.filter);
  const userId = await requirePageUserId();
  const flow = await getSaveGameFlowSnapshot(userId, savegameId);

  if (!flow) {
    notFound();
  }

  const [team, season, taskStates] = await Promise.all([
    flow.featuredTeamId
      ? getTeamDetailForUser(userId, savegameId, flow.featuredTeamId)
      : null,
    flow.currentSeasonId
      ? getSeasonOverviewForUser(userId, savegameId, flow.currentSeasonId)
      : null,
    listInboxTaskStatesForUser(userId, savegameId),
  ]);
  const inbox = buildInboxState({
    filter,
    saveGameId: savegameId,
    season,
    taskStates,
    team,
  });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Offen" value={String(inbox.taskStatusCounts.open)} tone="positive" />
        <StatCard label="Gelesen" value={String(inbox.taskStatusCounts.read)} />
        <StatCard label="Erledigt" value={String(inbox.taskStatusCounts.done)} />
        <StatCard label="Ausgeblendet" value={String(inbox.taskStatusCounts.hidden)} />
      </section>

      <div data-onboarding-key="inbox">
        <InboxList
          saveGameId={savegameId}
          state={inbox}
          updateTaskAction={updateInboxTaskOptimisticAction}
        />
      </div>

      <SectionPanel
        title="Inbox-Regel"
        description="Die Liste priorisiert spielrelevante Blocker, danach Roster/Finanzen, danach reine Ereignisse."
        tone="subtle"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">1. Blocker</p>
            <p className="mt-2 text-sm text-slate-300">
              Laufende Spiele, Depth-Chart-Konflikte und Cap-Probleme stehen immer oben.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">2. GM-Entscheidungen</p>
            <p className="mt-2 text-sm text-slate-300">
              Team Needs, Verletzungen und auslaufende Vertrage fuehren direkt zur passenden Aktion.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">3. Persistenz</p>
            <p className="mt-2 text-sm text-slate-300">
              Gelesen, erledigt, ausgeblendet und Prioritaet bleiben pro Savegame gespeichert.
            </p>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
