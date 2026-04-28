import Link from "next/link";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";

import type { LiveSimulationMatch, LiveSimulationState } from "./live-simulation-model";

type LiveControlPanelProps = {
  finishAction: (formData: FormData) => Promise<void>;
  match: LiveSimulationMatch;
  reportHref: string;
  saveGameId: string;
  setupHref: string;
  state: LiveSimulationState;
};

function statusTone(status: string) {
  if (status === "IN_PROGRESS") {
    return "warning" as const;
  }

  if (status === "COMPLETED") {
    return "success" as const;
  }

  return "neutral" as const;
}

export function LiveControlPanel({
  finishAction,
  match,
  reportHref,
  saveGameId,
  setupHref,
  state,
}: LiveControlPanelProps) {
  const reportReady = match.status === "COMPLETED";
  const { control } = state;

  return (
    <section className="h-fit rounded-lg border border-sky-300/25 bg-sky-300/10 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Control
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{control.primaryLabel}</h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatusBadge label={control.statusLabel} tone={statusTone(match.status)} />
          <StatusBadge label={control.weekStateLabel} tone={control.canFinishGame ? "success" : "warning"} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{control.primaryDescription}</p>

      {control.canFinishGame ? (
        <form action={finishAction} className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-black/15 p-4">
          <input type="hidden" name="saveGameId" value={saveGameId} />
          <input type="hidden" name="matchId" value={match.id} />
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Automatisch berechnet
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {match.homeTeam.abbreviation} {match.homeTeam.score ?? "-"} : {match.awayTeam.score ?? "-"}{" "}
              {match.awayTeam.abbreviation}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Der Score kommt aus den gespeicherten Drives. Keine manuelle Eingabe noetig.
            </p>
          </div>
          <div className="[&>button]:w-full">
            <FormSubmitButton pendingLabel="Report wird geoeffnet...">
              Zum Match Report
            </FormSubmitButton>
          </div>
        </form>
      ) : (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/15 p-4">
          <StatusBadge label="Noch nicht bereit" tone="warning" />
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {control.blockedReason ?? "Keine Live-Aktion verfuegbar."}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href={setupHref}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Setup oeffnen
        </Link>
        {reportReady ? (
          <Link
            href={reportHref}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
          >
            Finalen Report oeffnen
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-slate-400"
          >
            Report nach Spielende
          </span>
        )}
      </div>
    </section>
  );
}
