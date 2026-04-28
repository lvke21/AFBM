import { notFound } from "next/navigation";

import { ScheduleList } from "@/components/season/schedule-list";
import { SimulationProgressPanel } from "@/components/season/simulation-progress-panel";
import { StandingsTable } from "@/components/season/standings-table";
import { SectionPanel } from "@/components/layout/section-panel";
import { StatCard } from "@/components/ui/stat-card";
import { requirePageUserId } from "@/lib/auth/session";
import { getSeasonOverviewForUser } from "@/modules/seasons/application/season-query.service";
import {
  advanceToNextSeasonAction,
  simulateSeasonWeekAction,
} from "./actions";

type SeasonPageProps = {
  params: Promise<{
    savegameId: string;
    seasonId: string;
  }>;
};

export default async function SeasonPage({ params }: SeasonPageProps) {
  const { savegameId, seasonId } = await params;
  const userId = await requirePageUserId();
  const season = await getSeasonOverviewForUser(userId, savegameId, seasonId);

  if (!season) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Saison" value={String(season.year)} tone="positive" />
        <StatCard label="Phase" value={season.phase} />
        <StatCard label="Aktuelle Woche" value={String(season.week)} />
        <StatCard label="Matches" value={String(season.matches.length)} />
      </section>

      {season.championName ? (
        <SectionPanel
          title="Champion"
          description="Sobald das letzte Playoff abgeschlossen ist, bleibt der Champion direkt sichtbar."
          tone="warning"
        >
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-5">
            <p className="text-sm text-amber-100">Titelgewinner</p>
            <p className="mt-2 text-2xl font-semibold text-white">{season.championName}</p>
          </div>
        </SectionPanel>
      ) : null}

      <SectionPanel
        title="Playoff Picture"
        description="Die Top-4 der aktuellen Standings dienen als Seed-Grundlage fuer die Playoffs."
      >
        {season.playoffPicture.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-4">
            {season.playoffPicture.map((entry) => (
              <div key={entry.teamId} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Seed {entry.seed}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{entry.name}</p>
                <p className="mt-2 text-sm text-slate-300">{entry.record}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
            Noch kein Playoff Picture vorhanden.
          </div>
        )}
      </SectionPanel>

      <SectionPanel
        title="Woche simulieren"
        description="Zeigt Fortschritt, verhindert doppelte Starts und verarbeitet offene Matches der aktuellen Woche."
      >
        <SimulationProgressPanel
          advanceToNextSeasonAction={advanceToNextSeasonAction}
          saveGameId={savegameId}
          season={season}
          simulateSeasonWeekAction={simulateSeasonWeekAction}
        />
      </SectionPanel>

      <SectionPanel
        title="Standings"
        description="Tabelle mit Record, Punkten, Turnovers, Yards, Sacks und Red-Zone-Effizienz."
      >
        <StandingsTable saveGameId={savegameId} standings={season.standings} />
      </SectionPanel>

      <SectionPanel
        title="Schedule"
        description="Alle Saison-Matches nach Woche gruppiert. Jede Match-Karte fuehrt direkt zum Matchbericht."
      >
        <ScheduleList
          currentWeek={season.week}
          matches={season.matches}
          saveGameId={savegameId}
        />
      </SectionPanel>
    </div>
  );
}
