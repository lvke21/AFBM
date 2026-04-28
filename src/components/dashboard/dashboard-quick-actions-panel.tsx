import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";

import type { DashboardQuickAction } from "./dashboard-model";

type DashboardQuickActionsPanelProps = {
  actions: DashboardQuickAction[];
};

function toneClass(action: DashboardQuickAction) {
  if (!action.href) {
    return "border-white/10 bg-black/15 text-slate-400";
  }

  if (action.tone === "primary") {
    return "border-sky-300/30 bg-sky-300/10 text-sky-50 hover:bg-sky-300/15";
  }

  if (action.tone === "success") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/15";
  }

  if (action.tone === "warning") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-50 hover:bg-amber-300/15";
  }

  return "border-white/10 bg-white/5 text-white hover:bg-white/10";
}

function renderAction(action: DashboardQuickAction) {
  const className = `block rounded-lg border p-4 transition ${toneClass(action)}`;
  const statusLabel = action.href ? (action.href.startsWith("#") ? "Oeffnen" : "Bereit") : "Noch offen";
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{action.title}</h3>
        <StatusBadge label={statusLabel} tone={action.href ? "success" : "neutral"} />
      </div>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-300">{action.description}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {action.href ? action.label : action.disabledReason}
      </p>
    </>
  );

  if (!action.href) {
    return (
      <div key={action.title} className={className} aria-disabled="true">
        {content}
      </div>
    );
  }

  if (action.href.startsWith("#")) {
    return (
      <a key={action.title} href={action.href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link key={action.title} href={action.href} className={className}>
      {content}
    </Link>
  );
}

export function DashboardQuickActionsPanel({ actions }: DashboardQuickActionsPanelProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Schnelle Aktionen
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Direkt zur naechsten Entscheidung</h2>
        </div>
        <StatusBadge
          label={`${actions.filter((action) => action.href).length}/${actions.length} bereit`}
          tone="active"
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {actions.map(renderAction)}
      </div>
    </section>
  );
}
