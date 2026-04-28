import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { DashboardWeekState } from "@/components/dashboard/dashboard-model";

import {
  buildPostGameContinuationState,
  type PostGameContinuationAction,
} from "./post-game-continuation-model";
import type { MatchReport } from "./match-report-model";

type PostGameContinuationPanelProps = {
  advanceWeekAction: (formData: FormData) => Promise<void>;
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">;
  saveGameId: string;
  weekState: DashboardWeekState;
};

function ContinuationCta({
  action,
  advanceWeekAction,
  saveGameId,
}: {
  action: PostGameContinuationAction;
  advanceWeekAction: (formData: FormData) => Promise<void>;
  saveGameId: string;
}) {
  if (action.kind === "advance-week") {
    return (
      <form action={advanceWeekAction}>
        <input type="hidden" name="saveGameId" value={saveGameId} />
        <FormSubmitButton pendingLabel="Naechste Woche wird geladen...">
          {action.label}
        </FormSubmitButton>
      </form>
    );
  }

  return action.href ? (
    <Link
      href={action.href}
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
    >
      {action.label}
    </Link>
  ) : null;
}

export function PostGameContinuationPanel({
  advanceWeekAction,
  match,
  saveGameId,
  weekState,
}: PostGameContinuationPanelProps) {
  const state = buildPostGameContinuationState({ match, saveGameId, weekState });

  if (!state.action) {
    return null;
  }

  return (
    <SectionCard
      title={state.title}
      description="Der direkte Anschluss nach dem Spiel: Fortschritt sehen, Aufgabe starten, Loop fortsetzen."
    >
      <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
          Fortschritt
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">{state.progress}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-200">{state.motivation}</p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-white">{state.nextTask}</p>
          <ContinuationCta
            action={state.action}
            advanceWeekAction={advanceWeekAction}
            saveGameId={saveGameId}
          />
        </div>
      </div>
    </SectionCard>
  );
}
