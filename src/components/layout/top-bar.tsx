import Link from "next/link";
import React from "react";

import type { AppShellContext } from "./navigation-model";

type TopBarProps = {
  context: AppShellContext;
};

export function TopBar({ context }: TopBarProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
      <div className="min-w-0">
        <Link href="/app" className="eyebrow">
          AFBM Manager
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="font-semibold text-white">
            {context.saveGame?.name ?? "Kein Savegame geoeffnet"}
          </span>
          {context.currentSeason ? (
            <span>
              {context.currentSeason.year} ·{" "}
              {context.currentSeason.phaseLabel ?? context.currentSeason.phase} · Woche{" "}
              {context.currentSeason.week}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Manager-Team</p>
          <p className="mt-1 font-semibold text-white">
            {context.managerTeam
              ? `${context.managerTeam.abbreviation} · ${context.managerTeam.currentRecord}`
              : "Nicht gesetzt"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Liga</p>
          <p className="mt-1 font-semibold text-white">
            {context.saveGame?.leagueName ?? "Savegames"}
          </p>
        </div>
      </div>
    </header>
  );
}
