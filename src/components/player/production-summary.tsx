import type { PlayerDetail } from "@/modules/players/domain/player.types";

type ProductionSummaryProps = {
  career: PlayerDetail["career"];
  latestSeason: PlayerDetail["latestSeason"];
};

function averageHangTime(totalTenths: number, punts: number) {
  if (totalTenths <= 0 || punts <= 0) {
    return "0.0s";
  }

  return `${(totalTenths / punts / 10).toFixed(1)}s`;
}

export function ProductionSummary({ career, latestSeason }: ProductionSummaryProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-lg border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Season
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Season Snapshot</h2>
        {latestSeason ? (
          <div className="mt-5 space-y-3 text-sm text-slate-200">
            <p>
              {latestSeason.label} · {latestSeason.year} · {latestSeason.teamName}
            </p>
            <p className="text-slate-400">
              GP {latestSeason.gamesPlayed} / GS {latestSeason.gamesStarted} · Snaps OFF{" "}
              {latestSeason.snapsOffense} · DEF {latestSeason.snapsDefense} · ST{" "}
              {latestSeason.snapsSpecialTeams}
            </p>
            <p>
              Passing {latestSeason.passing.completions}/{latestSeason.passing.attempts} ·{" "}
              {latestSeason.passing.yards} YDS · TD {latestSeason.passing.touchdowns} · INT{" "}
              {latestSeason.passing.interceptions}
            </p>
            <p>
              Rushing {latestSeason.rushing.attempts} ATT · {latestSeason.rushing.yards} YDS ·
              TD {latestSeason.rushing.touchdowns} · FUM {latestSeason.rushing.fumbles}
            </p>
            <p>
              Receiving {latestSeason.receiving.receptions}/{latestSeason.receiving.targets} ·{" "}
              {latestSeason.receiving.yards} YDS · TD {latestSeason.receiving.touchdowns} · YAC{" "}
              {latestSeason.receiving.yardsAfterCatch}
            </p>
            <p>
              Blocking PB {latestSeason.blocking.passBlockSnaps} · RB{" "}
              {latestSeason.blocking.runBlockSnaps} · Sacks Allowed{" "}
              {latestSeason.blocking.sacksAllowed}
            </p>
            <p>
              Defense Tackles {latestSeason.defensive.tackles} · Sacks{" "}
              {latestSeason.defensive.sacks} · PD {latestSeason.defensive.passesDefended} · INT{" "}
              {latestSeason.defensive.interceptions}
            </p>
            <p>
              Kicking FG {latestSeason.kicking.fieldGoalsMade}/
              {latestSeason.kicking.fieldGoalsAttempted} · XP{" "}
              {latestSeason.kicking.extraPointsMade}/
              {latestSeason.kicking.extraPointsAttempted} · Punts {latestSeason.punting.punts} ·
              Hang {averageHangTime(latestSeason.punting.hangTimeTotalTenths, latestSeason.punting.punts)}
            </p>
            <p>
              Returns KR {latestSeason.returns.kickReturns}/
              {latestSeason.returns.kickReturnYards} · PR {latestSeason.returns.puntReturns}/
              {latestSeason.returns.puntReturnYards}
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
            Noch keine verknuepfte Saisonstatistik.
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Career
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Karriere</h2>
        {career ? (
          <div className="mt-5 space-y-3 text-sm text-slate-200">
            <p>
              GP {career.gamesPlayed} / GS {career.gamesStarted} · Snaps OFF{" "}
              {career.snapsOffense} · DEF {career.snapsDefense} · ST {career.snapsSpecialTeams}
            </p>
            <p>
              Passing {career.passing.completions}/{career.passing.attempts} ·{" "}
              {career.passing.yards} YDS · TD {career.passing.touchdowns} · INT{" "}
              {career.passing.interceptions}
            </p>
            <p>
              Rushing {career.rushing.attempts} ATT · {career.rushing.yards} YDS · TD{" "}
              {career.rushing.touchdowns} · FUM {career.rushing.fumbles}
            </p>
            <p>
              Receiving {career.receiving.receptions}/{career.receiving.targets} ·{" "}
              {career.receiving.yards} YDS · TD {career.receiving.touchdowns} · YAC{" "}
              {career.receiving.yardsAfterCatch}
            </p>
            <p>
              Blocking PB {career.blocking.passBlockSnaps} · RB {career.blocking.runBlockSnaps} ·
              Pressures Allowed {career.blocking.pressuresAllowed}
            </p>
            <p>
              Defense Tackles {career.defensive.tackles} · Sacks {career.defensive.sacks} · PD{" "}
              {career.defensive.passesDefended} · INT {career.defensive.interceptions}
            </p>
            <p>
              Kicking FG {career.kicking.fieldGoalsMade}/{career.kicking.fieldGoalsAttempted} · XP{" "}
              {career.kicking.extraPointsMade}/{career.kicking.extraPointsAttempted} · Punts{" "}
              {career.punting.punts} · Hang{" "}
              {averageHangTime(career.punting.hangTimeTotalTenths, career.punting.punts)}
            </p>
            <p>
              Returns KR TD {career.returns.kickReturnTouchdowns} · KR FUM{" "}
              {career.returns.kickReturnFumbles} · PR TD {career.returns.puntReturnTouchdowns} ·
              PR FUM {career.returns.puntReturnFumbles}
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
            Noch keine Karriereaggregate vorhanden.
          </div>
        )}
      </div>
    </section>
  );
}
