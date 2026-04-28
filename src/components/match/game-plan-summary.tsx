import { StatusBadge } from "@/components/ui/status-badge";

import type { GamePreviewMatch, GamePreviewState } from "./game-preview-model";

type GamePlanSummaryProps = {
  match: GamePreviewMatch;
  state: GamePreviewState;
};

function schemeName(team: GamePreviewMatch["homeTeam"], key: keyof GamePreviewMatch["homeTeam"]["schemes"]) {
  return team.schemes[key]?.name ?? "Nicht gesetzt";
}

function planValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value.replaceAll("_", " ") : "Balanced";
}

export function GamePlanSummary({ match, state }: GamePlanSummaryProps) {
  const managerTeam =
    match.homeTeam.managerControlled ? match.homeTeam : match.awayTeam.managerControlled ? match.awayTeam : null;
  const offensePlan = managerTeam?.xFactorPlan?.offense as Record<string, unknown> | null | undefined;
  const defensePlan = managerTeam?.xFactorPlan?.defense as Record<string, unknown> | null | undefined;

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Spielplan
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Dein Plan fuer den Kickoff</h2>
        </div>
        <StatusBadge label={state.gameplanLocked ? "Festgelegt" : "Aenderbar"} tone={state.gameplanLocked ? "warning" : "active"} />
      </div>

      {managerTeam ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-lg border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Grundidee
            </p>
            <dl className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="flex justify-between gap-4">
                <dt>Offense</dt>
                <dd className="text-right font-semibold text-white">{schemeName(managerTeam, "offense")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Defense</dt>
                <dd className="text-right font-semibold text-white">{schemeName(managerTeam, "defense")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Special Teams</dt>
                <dd className="text-right font-semibold text-white">{schemeName(managerTeam, "specialTeams")}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-lg border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Offensive Intent
            </p>
            <h3 className="mt-3 text-lg font-semibold text-white">
              {planValue(offensePlan?.offensiveFocus)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Protection: {planValue(offensePlan?.protectionPlan)} · Tempo: {planValue(offensePlan?.tempoPlan)}
            </p>
          </article>

          <article className="rounded-lg border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Defensive Intent
            </p>
            <h3 className="mt-3 text-lg font-semibold text-white">
              {planValue(defensePlan?.defensiveFocus)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Matchup: {planValue(defensePlan?.defensiveMatchupFocus)} · Risk:{" "}
              {planValue(defensePlan?.aggression)}
            </p>
          </article>
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-white/10 bg-black/15 p-4 text-sm text-slate-400">
          Gameplan Summary erscheint, sobald ein Manager-Team Teil des Matches ist.
        </p>
      )}
    </section>
  );
}
