import { StatusBadge } from "@/components/ui/status-badge";

import type { GamePreviewState, GamePreviewTeamCard } from "./game-preview-model";

type TeamComparisonPanelProps = {
  state: GamePreviewState;
};

function TeamCard({ team }: { team: GamePreviewTeamCard }) {
  return (
    <article className="rounded-lg border border-white/10 bg-black/15 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {team.location}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{team.name}</h3>
        </div>
        {team.isManagerTeam ? <StatusBadge label="Dein Team" tone="success" /> : null}
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bilanz
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-white">{team.record}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            OVR
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-white">{team.overallRating}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Moral
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-white">{team.morale}</dd>
        </div>
      </dl>
    </article>
  );
}

export function TeamComparisonPanel({ state }: TeamComparisonPanelProps) {
  return (
    <section className="h-fit rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Teamvergleich
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Duell vor dem Kickoff</h2>
        </div>
        <StatusBadge label={state.managerTeam ? "Dein Spiel" : "Neutrales Spiel"} tone="active" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <TeamCard team={state.homeTeam} />
        <TeamCard team={state.awayTeam} />
      </div>

      <p className="mt-4 rounded-lg border border-white/10 bg-black/15 p-4 text-sm leading-6 text-slate-300">
        {state.matchupSummary}
      </p>
    </section>
  );
}
