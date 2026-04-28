import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { requirePageUserId } from "@/lib/auth/session";
import { listSaveGames } from "@/modules/savegames/application/savegame-query.service";

export default async function DashboardPage() {
  const userId = await requirePageUserId();
  const saveGames = await listSaveGames(userId);

  const totalTeams = saveGames.reduce((sum, item) => sum + item.teamCount, 0);
  const totalPlayers = saveGames.reduce((sum, item) => sum + item.playerCount, 0);
  const recentSaveGame = saveGames[0] ?? null;

  if (recentSaveGame) {
    redirect(`/app/savegames/${recentSaveGame.id}`);
  }

  return (
    <AppShell>
      <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Savegames" value={String(saveGames.length)} tone="positive" />
        <StatCard label="Persistierte Teams" value={String(totalTeams)} />
        <StatCard label="Persistierte Spieler" value={String(totalPlayers)} />
      </section>

      <SectionCard
        title="Neues Spiel starten"
        description="Sobald ein Savegame existiert, fuehrt /app direkt ins Manager-Dashboard."
      >
        <div className="rounded-lg border border-dashed border-white/15 bg-white/4 p-6 text-slate-200">
          Noch kein Savegame vorhanden. Lege zuerst einen Spielstand an; danach startet
          die App direkt im Dashboard mit der naechsten Manager-Aktion.
          <div className="mt-5">
            <Link
              href="/app/savegames"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/22"
            >
              Savegame anlegen
            </Link>
          </div>
        </div>
      </SectionCard>
      </div>
    </AppShell>
  );
}
