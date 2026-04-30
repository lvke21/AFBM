"use client";

import { useMemo } from "react";

import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import { getOnlineModeStatusCopy } from "./online-mode-status-model";

type OnlineModeStatusProps = {
  context?: "hub" | "dashboard";
  compact?: boolean;
  role?: string;
};

export function OnlineModeStatus({
  context = "hub",
  compact = false,
  role = "GM",
}: OnlineModeStatusProps) {
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const statusCopy = getOnlineModeStatusCopy(repository.mode, role);
  const description =
    context === "dashboard" ? statusCopy.dashboardDescription : statusCopy.description;

  return (
    <div className={compact ? "grid gap-2" : "mt-4 grid gap-3"}>
      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            statusCopy.mode === "firebase"
              ? "border-emerald-200/35 bg-emerald-300/10 text-emerald-100"
              : "border-amber-200/35 bg-amber-300/10 text-amber-100"
          }`}
        >
          {statusCopy.primaryBadge}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
          {statusCopy.syncBadge}
        </span>
        <span className="rounded-full border border-sky-200/25 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
          {statusCopy.roleBadge}
        </span>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-slate-300">
        {description}
      </p>
    </div>
  );
}
