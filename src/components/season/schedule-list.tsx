import type { SeasonMatchSummary } from "@/modules/seasons/domain/season.types";
import { groupScheduleByWeek } from "./season-view-model";
import { MatchCard } from "./match-card";

type ScheduleListProps = {
  currentWeek: number;
  matches: SeasonMatchSummary[];
  saveGameId: string;
};

export function ScheduleList({ currentWeek, matches, saveGameId }: ScheduleListProps) {
  const weeks = groupScheduleByWeek(matches);

  if (weeks.length === 0) {
    return (
      <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
        Noch kein Schedule vorhanden.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {weeks.map((week) => (
        <section key={week.week}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Woche {week.week}</h3>
            {week.week === currentWeek ? (
              <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                Aktuell
              </span>
            ) : null}
          </div>
          <div className="grid gap-3">
            {week.matches.map((match) => (
              <MatchCard
                key={match.id}
                currentWeek={currentWeek}
                match={match}
                saveGameId={saveGameId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
