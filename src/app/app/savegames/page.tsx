import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { CreateSaveGameForm } from "@/components/ui/create-savegame-form";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageUserId } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/format";
import { listSaveGames } from "@/modules/savegames/application/savegame-query.service";

export default async function SaveGamesPage() {
  const userId = await requirePageUserId();
  const saveGames = await listSaveGames(userId);

  return (
    <AppShell>
      <div className="space-y-8">
      <SectionCard
        title="Savegames anlegen"
        description="Ein Savegame kapselt den kompletten dynamischen Zustand: Teams, Spieler, Vertraege, Saison, Matches und Statistiken."
      >
        <CreateSaveGameForm />
      </SectionCard>

      <SectionCard
        title="Vorhandene Savegames"
        description="Jeder Spielstand ist isoliert und kann spaeter unabhaengig simuliert, trainiert oder finanziell weiterentwickelt werden."
      >
        {saveGames.length > 0 ? (
          <div className="grid gap-4">
            {saveGames.map((saveGame) => (
              <Link
                key={saveGame.id}
                href={`/app/savegames/${saveGame.id}`}
                className="rounded-lg border border-white/10 bg-white/5 p-5 transition hover:bg-white/8"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-emerald-300">{saveGame.leagueName}</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">
                      {saveGame.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {saveGame.currentSeasonLabel}
                    </p>
                  </div>
                  <div className="text-sm text-slate-300">
                    Aktualisiert am {formatDate(saveGame.updatedAt)}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {saveGame.teamCount} Teams
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {saveGame.playerCount} Spieler
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    Status: {saveGame.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-white/4 p-6 text-slate-200">
            Noch keine Savegames vorhanden.
          </div>
        )}
      </SectionCard>
      </div>
    </AppShell>
  );
}
