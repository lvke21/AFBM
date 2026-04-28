import { StatusBadge } from "@/components/ui/status-badge";

import type { PostGameReportState } from "./post-game-report-model";

type PlayerOfGamePanelProps = {
  state: PostGameReportState;
};

export function PlayerOfGamePanel({ state }: PlayerOfGamePanelProps) {
  const player = state.playerOfGame;

  return (
    <section className="h-fit rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Player Of The Game
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{player.name}</h2>
        </div>
        <StatusBadge label={player.isFallback ? "Noch keine Spielerdaten" : "Gespeichert"} tone={player.isFallback ? "warning" : "success"} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Team / Position
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {player.teamAbbreviation} · {player.position}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Stat Line
          </p>
          <p className="mt-3 text-lg font-semibold text-white">{player.statLine}</p>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-white/10 bg-black/15 p-4 text-sm leading-6 text-slate-300">
        {player.context}
      </p>
    </section>
  );
}
