import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/status-badge";

import type { DashboardAction } from "./dashboard-model";

type NextActionPanelProps = {
  action: DashboardAction;
  actionSlot?: ReactNode;
  contextLabel: string;
};

function actionToneLabel(tone: DashboardAction["tone"]) {
  if (tone === "positive") {
    return "Recommended";
  }

  if (tone === "warning") {
    return "Attention";
  }

  return "Open";
}

function actionToneClass(tone: DashboardAction["tone"]) {
  if (tone === "positive") {
    return "border-emerald-300/45 bg-emerald-300/14 shadow-[0_22px_70px_rgba(16,185,129,0.16)]";
  }

  if (tone === "warning") {
    return "border-amber-300/30 bg-amber-300/10";
  }

  return "border-white/10 bg-white/5";
}

export function NextActionPanel({ action, actionSlot, contextLabel }: NextActionPanelProps) {
  return (
    <section id="next-action" className={`rounded-lg border p-6 ${actionToneClass(action.tone)}`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Next Best Action" tone={action.tone === "warning" ? "warning" : "success"} />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {contextLabel}
            </span>
          </div>
          <h2
            className="mt-3 text-3xl font-semibold text-white md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {action.title}
          </h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-200">{action.message}</p>
        </div>

        <div className="flex flex-col gap-2 lg:min-w-72">
          {action.href?.startsWith("#") ? (
            <a
              href={action.href}
              data-primary-action="true"
              className="inline-flex min-h-14 items-center justify-center rounded-lg border border-emerald-200/50 bg-emerald-300/20 px-5 py-3 text-base font-semibold text-emerald-50 transition hover:bg-emerald-300/28"
            >
              {action.label}
            </a>
          ) : action.href ? (
            <Link
              href={action.href}
              data-primary-action="true"
              className="inline-flex min-h-14 items-center justify-center rounded-lg border border-emerald-200/50 bg-emerald-300/20 px-5 py-3 text-base font-semibold text-emerald-50 transition hover:bg-emerald-300/28"
            >
              {action.label}
            </Link>
          ) : actionSlot ? (
            actionSlot
          ) : (
            <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-slate-300">
              Kein direkter Link
            </span>
          )}
          <span className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {actionToneLabel(action.tone)}
          </span>
        </div>
      </div>
    </section>
  );
}
