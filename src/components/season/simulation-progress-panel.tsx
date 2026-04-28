import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { SeasonOverview } from "@/modules/seasons/domain/season.types";
import { getCurrentWeekSummary } from "./season-view-model";

type SimulationProgressPanelProps = {
  advanceToNextSeasonAction: (formData: FormData) => Promise<void>;
  saveGameId: string;
  season: SeasonOverview;
  simulateSeasonWeekAction: (formData: FormData) => Promise<void>;
};

export function SimulationProgressPanel({
  advanceToNextSeasonAction,
  saveGameId,
  season,
  simulateSeasonWeekAction,
}: SimulationProgressPanelProps) {
  const summary = getCurrentWeekSummary(season);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-300">Fortschritt Woche {season.week}</span>
          <span className="font-semibold text-white">{summary.progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-emerald-300"
            style={{ width: `${summary.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs text-slate-400">Matches</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {summary.currentWeekMatches.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs text-slate-400">Geplant</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {summary.scheduledMatches.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs text-slate-400">Laeuft</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {summary.inProgressMatches.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-xs text-slate-400">Abgeschlossen</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {summary.completedMatches.length}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-300">
          {summary.inProgressMatches.length > 0 ? (
            <p>
              Eine Simulation laeuft bereits. Weitere Starts sind gesperrt, bis die Woche
              abgeschlossen oder der Lock abgelaufen ist.
            </p>
          ) : summary.canSimulateWeek ? (
            <p>{summary.scheduledMatches.length} Matchups koennen jetzt simuliert werden.</p>
          ) : season.phase === "OFFSEASON" ? (
            <p>Die Saison ist abgeschlossen.</p>
          ) : (
            <p>In der aktuellen Woche sind keine offenen Matches mehr vorhanden.</p>
          )}
        </div>

        {summary.canSimulateWeek ? (
          <form action={simulateSeasonWeekAction}>
            <input type="hidden" name="saveGameId" value={saveGameId} />
            <input type="hidden" name="seasonId" value={season.id} />
            <FormSubmitButton pendingLabel="Woche wird simuliert...">
              Woche simulieren
            </FormSubmitButton>
          </form>
        ) : season.phase === "OFFSEASON" ? (
          <form action={advanceToNextSeasonAction}>
            <input type="hidden" name="saveGameId" value={saveGameId} />
            <input type="hidden" name="seasonId" value={season.id} />
            <FormSubmitButton pendingLabel="Neue Saison wird vorbereitet...">
              Naechste Saison starten
            </FormSubmitButton>
          </form>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-500"
          >
            Simulation gesperrt
          </button>
        )}
      </div>
    </div>
  );
}
