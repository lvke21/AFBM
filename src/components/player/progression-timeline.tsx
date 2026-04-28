import { formatDate } from "@/lib/utils/format";
import type { PlayerDetail } from "@/modules/players/domain/player.types";
import { getTimelineState } from "./player-detail-model";

type ProgressionTimelineProps = {
  history: PlayerDetail["history"];
};

export function ProgressionTimeline({ history }: ProgressionTimelineProps) {
  const state = getTimelineState(history);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Timeline
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Progression Timeline</h2>

      {state.isEmpty ? (
        <div className="mt-5 rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
          {state.message}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {state.events.map((event) => (
            <div key={event.id} className="rounded-lg border border-white/8 bg-black/10 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{event.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {event.type}
                    {event.week ? ` · Woche ${event.week}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-500">{formatDate(event.occurredAt)}</p>
              </div>
              {event.description ? (
                <p className="mt-3 text-sm text-slate-300">{event.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
