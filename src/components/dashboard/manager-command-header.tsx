import { StatusBadge } from "@/components/ui/status-badge";

import type { DashboardStatusTone, DashboardWeekState } from "./dashboard-model";

type ManagerCommandHeaderProps = {
  leagueName: string;
  record: string;
  saveGameName: string;
  teamName: string;
  updatedAtLabel: string;
  weekLabel: string;
  weekState: DashboardWeekState;
  weekTone: DashboardStatusTone;
};

function weekStateLabel(weekState: DashboardWeekState) {
  if (weekState === "PRE_WEEK") {
    return "Woche vorbereiten";
  }

  if (weekState === "GAME_RUNNING") {
    return "Spiel laeuft";
  }

  if (weekState === "POST_GAME") {
    return "Nach dem Spiel";
  }

  return "Bereit";
}

export function ManagerCommandHeader({
  leagueName,
  record,
  saveGameName,
  teamName,
  updatedAtLabel,
  weekLabel,
  weekState,
  weekTone,
}: ManagerCommandHeaderProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(47,140,255,0.18),rgba(7,17,29,0.88)_45%,rgba(61,220,151,0.10))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="GM Buero" tone="active" />
            <StatusBadge label={weekStateLabel(weekState)} tone={weekTone} />
          </div>
          <h1
            className="mt-5 text-4xl font-semibold text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {teamName}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {saveGameName} · {leagueName} · {weekLabel}. Das Dashboard priorisiert die
            naechste Manager-Aktion, Teamzustand und Game-Flow-Bereitschaft.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Bilanz
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{record}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Woche
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{weekLabel}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Aktualisiert
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white">{updatedAtLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
