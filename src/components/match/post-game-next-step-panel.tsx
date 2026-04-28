import Link from "next/link";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";

import type { PostGameReportState } from "./post-game-report-model";

type PostGameNextStepPanelProps = {
  advanceWeekAction: (formData: FormData) => Promise<void>;
  dashboardHref: string;
  saveGameId: string;
  setupHref: string;
  state: PostGameReportState;
};

export function PostGameNextStepPanel({
  advanceWeekAction,
  dashboardHref,
  saveGameId,
  setupHref,
  state,
}: PostGameNextStepPanelProps) {
  const next = state.nextStep;

  return (
    <section className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Naechster Schritt
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{next.title}</h2>
        </div>
        <StatusBadge label={state.hasFinalScore ? "Nach dem Spiel" : "Vorschau"} tone={state.hasFinalScore ? "success" : "warning"} />
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/15 p-4">
        <p className="text-sm font-semibold text-white">{next.progress}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{next.motivation}</p>
        <p className="mt-3 text-sm font-semibold text-emerald-100">{next.nextTask}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {next.action?.kind === "advance-week" ? (
          <form action={advanceWeekAction} className="[&>button]:w-full">
            <input type="hidden" name="saveGameId" value={saveGameId} />
            <FormSubmitButton pendingLabel="Naechste Woche wird geladen...">
              {next.action.label}
            </FormSubmitButton>
          </form>
        ) : next.action?.href ? (
          <Link
            href={next.action.href}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
          >
            {next.action.label}
          </Link>
        ) : (
          <Link
            href={setupHref}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Setup oeffnen
          </Link>
        )}

        <Link
          href={dashboardHref}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Dashboard
        </Link>
      </div>
    </section>
  );
}
