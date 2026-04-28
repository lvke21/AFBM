import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils/format";
import type { SaveGameDetail } from "@/modules/savegames/domain/savegame.types";
import type { SeasonOverview } from "@/modules/seasons/domain/season.types";

type LeagueSnapshotPanelProps = {
  completedCurrentWeekMatches: number;
  currentSeason: SeasonOverview | null;
  managerTeamId: string | null | undefined;
  openCurrentWeekMatches: number;
  saveGame: SaveGameDetail;
};

export function LeagueSnapshotPanel({
  completedCurrentWeekMatches,
  currentSeason,
  managerTeamId,
  openCurrentWeekMatches,
  saveGame,
}: LeagueSnapshotPanelProps) {
  const standings = currentSeason?.standings.slice(0, 5) ?? [];

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            League Snapshot
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">{saveGame.leagueName}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {saveGame.teams.length} Teams · {saveGame.seasons.length} Saison(en)
          </p>
        </div>
        <StatusBadge label={currentSeason?.phase ?? "No Season"} tone={currentSeason ? "active" : "neutral"} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Week</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {currentSeason ? `W${currentSeason.week}` : "n/a"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Open</p>
          <p className="mt-2 text-2xl font-semibold text-white">{openCurrentWeekMatches}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cap</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {saveGame.settings ? formatCurrency(saveGame.settings.salaryCap) : "n/a"}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/10 bg-black/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <span>Team</span>
          <span>Record</span>
          <span>OVR</span>
        </div>
        {standings.length > 0 ? (
          standings.map((standing) => {
            const isManagerTeam = standing.teamId === managerTeamId;

            return (
              <div
                key={standing.teamId}
                className={`grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/8 px-4 py-3 text-sm last:border-b-0 ${
                  isManagerTeam ? "bg-emerald-300/10 text-emerald-50" : "bg-black/10 text-slate-200"
                }`}
              >
                <span className="font-semibold">{standing.name}</span>
                <span>{standing.record}</span>
                <span>{standing.overallRating}</span>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-5 text-sm text-slate-400">
            Standings erscheinen, sobald Saison-Daten geladen sind.
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Aktuelle Woche: {completedCurrentWeekMatches} abgeschlossen · {openCurrentWeekMatches} offen.
      </p>
    </section>
  );
}
