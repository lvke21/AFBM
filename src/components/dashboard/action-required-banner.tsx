import Link from "next/link";

import type { DashboardAction } from "./dashboard-model";

type ActionRequiredBannerProps = {
  action: DashboardAction;
};

export function ActionRequiredBanner({ action }: ActionRequiredBannerProps) {
  const toneClass =
    action.tone === "warning"
      ? "border-amber-300/30 bg-amber-300/10 text-amber-50"
      : action.tone === "positive"
        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-50"
        : "border-white/10 bg-white/5 text-white";

  const actionClass =
    action.tone === "warning"
      ? "border-amber-200/40 bg-amber-200/15 text-amber-50"
      : action.tone === "positive"
        ? "border-emerald-200/40 bg-emerald-200/15 text-emerald-50"
        : "border-white/15 bg-white/10 text-white";

  return (
    <section className={`rounded-lg border p-5 ${toneClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
            Naechste beste Aktion
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{action.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 opacity-85">{action.message}</p>
        </div>
        {action.href ? (
          <Link
            href={action.href}
            data-primary-action="true"
            className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-white/15 ${actionClass}`}
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
