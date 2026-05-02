import type { OnlineMatchResult } from "@/lib/online/online-league-types";
import type { OnlineLeagueTeamRecord } from "@/lib/online/online-league-week-simulation";

type AdminCompletedWeekSummary = {
  season: number;
  week: number;
};

export type AdminDisplayedWeekGame = {
  awayTeamName: string;
  homeTeamName: string;
  id: string;
  status: string;
};

export type AdminStandingDisplayRow = OnlineLeagueTeamRecord & {
  teamName: string;
};

type AdminDebugItem = {
  label: string;
  value: string;
};

export function AdminLeagueSummaryCards({
  currentWeek,
  lastCompletedWeek,
  maxUsers,
  statusText,
  teamCount,
  userCount,
  weekPhaseLabel,
}: {
  currentWeek: number;
  lastCompletedWeek?: AdminCompletedWeekSummary;
  maxUsers: number;
  statusText: string;
  teamCount: number;
  userCount: number;
  weekPhaseLabel: string;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Status
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{statusText}</p>
        <p className="mt-2 text-xs font-semibold text-amber-100">{weekPhaseLabel}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Woche
        </p>
        <p className="mt-2 text-lg font-semibold text-white">Week {currentWeek}</p>
        {lastCompletedWeek ? (
          <p className="mt-2 text-xs font-semibold text-slate-400">
            Zuletzt abgeschlossen: S{lastCompletedWeek.season} W{lastCompletedWeek.week}
          </p>
        ) : null}
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Spieler
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          {userCount}/{maxUsers}
        </p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Teams
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{teamCount}</p>
      </div>
    </div>
  );
}

export function AdminLeagueWeekDataCards({
  currentWeek,
  games,
  recentSimulatedGames,
  standings,
}: {
  currentWeek: number;
  games: AdminDisplayedWeekGame[];
  recentSimulatedGames: OnlineMatchResult[];
  standings: AdminStandingDisplayRow[];
}) {
  return (
    <>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-white/10 bg-[#07111d]/55 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Games der aktuellen Woche
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Week {currentWeek}
              </h3>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
              {games.length} Games
            </span>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {games.length > 0 ? (
              games.map((game) => (
                <div
                  key={game.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-white">
                    {game.awayTeamName} @ {game.homeTeamName}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{game.id}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-amber-200/25 bg-amber-300/10 p-3 text-sm font-semibold text-amber-50 lg:col-span-2">
                Für die aktuelle Woche ist kein Schedule geladen.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#07111d]/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Standings / Records
          </p>
          <div className="mt-4 space-y-2">
            {standings.length > 0 ? (
              standings.map((record) => (
                <div
                  key={record.teamId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-white">
                    {record.teamName}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-300">
                    {record.wins}-{record.losses}
                    {record.ties > 0 ? `-${record.ties}` : ""} · GP {record.gamesPlayed} ·
                    {" "}DIFF {record.pointDifferential >= 0 ? "+" : ""}
                    {record.pointDifferential}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-white/15 p-3 text-sm text-slate-400">
                Noch keine Record-Daten vorhanden.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-[#07111d]/55 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Bereits simulierte Games
        </p>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {recentSimulatedGames.length > 0 ? (
            recentSimulatedGames.map((result) => (
              <p
                key={`${result.season}-${result.week}-${result.matchId}`}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
              >
                <span className="font-semibold text-white">
                  S{result.season} W{result.week}
                </span>{" "}
                {result.homeTeamName} {result.homeScore} - {result.awayScore}{" "}
                {result.awayTeamName}
              </p>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-white/15 p-3 text-sm text-slate-400 lg:col-span-2">
              Noch keine simulierten Games gespeichert.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export function AdminLeagueDebugSnapshot({ items }: { items: AdminDebugItem[] }) {
  return (
    <section className="mt-6 rounded-lg border border-violet-200/20 bg-violet-300/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
        Debug-Informationen
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Admin League Snapshot</h2>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {item.label}
            </dt>
            <dd className="mt-2 break-words font-mono text-sm text-slate-100">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
