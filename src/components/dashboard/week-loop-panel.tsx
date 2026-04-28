import Link from "next/link";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import {
  buildWeekLoopDashboardAction,
  buildWeekLoopFeedbackItems,
  type DashboardWeekState,
} from "./dashboard-model";

type WeekLoopPanelProps = {
  advanceWeekAction: (formData: FormData) => Promise<void>;
  developmentFocusCandidates?: TeamPlayerSummary[];
  gameHref: string | null;
  prepareWeekAction: (formData: FormData) => Promise<void>;
  saveGameId: string;
  weekLabel: string;
  weekState: DashboardWeekState;
};

export function WeekLoopPanel({
  advanceWeekAction,
  developmentFocusCandidates = [],
  gameHref,
  prepareWeekAction,
  saveGameId,
  weekLabel,
  weekState,
}: WeekLoopPanelProps) {
  const action = buildWeekLoopDashboardAction({ gameHref, weekState });
  const feedbackItems = buildWeekLoopFeedbackItems({
    developmentFocusCount: developmentFocusCandidates.filter((player) => player.developmentFocus).length,
    weekState,
  });

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Wochenablauf
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">{action.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{action.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-sky-100">
              {weekState === "PRE_WEEK"
                ? "Woche vorbereiten"
                : weekState === "READY"
                  ? "Bereit"
                  : weekState === "GAME_RUNNING"
                    ? "Spiel laeuft"
                    : "Nach dem Spiel"}
            </span>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-slate-200">
              {weekLabel}
            </span>
          </div>
        </div>

        {action.kind === "prepare" ? (
          <form action={prepareWeekAction} className="w-full max-w-xl space-y-4 lg:w-[32rem]">
            <input type="hidden" name="saveGameId" value={saveGameId} />
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["RECOVERY", "Recovery", "Fatigue -16, Morale +3"],
                ["BALANCED", "Balanced", "Fatigue +2, Morale +0"],
                ["INTENSE", "Intense", "Fatigue +10, Morale -2"],
              ].map(([value, label, impact]) => (
                <label
                  key={value}
                  className="min-h-24 rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-slate-200"
                >
                  <input
                    className="mr-2 accent-emerald-300"
                    type="radio"
                    name="weeklyPlanIntensity"
                    value={value}
                    defaultChecked={value === "BALANCED"}
                  />
                  <span className="font-semibold text-white">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{impact}</span>
                </label>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["BALANCED", "Opponent Balanced"],
                ["OFFENSE", "Offense Prep"],
                ["DEFENSE", "Defense Prep"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-slate-200"
                >
                  <input
                    className="mr-2 accent-emerald-300"
                    type="radio"
                    name="weeklyOpponentFocus"
                    value={value}
                    defaultChecked={value === "BALANCED"}
                  />
                  {label}
                </label>
              ))}
            </div>
            {developmentFocusCandidates.length > 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Development Focus
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {developmentFocusCandidates.map((player) => (
                    <label
                      key={player.id}
                      className="min-h-20 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300"
                    >
                      <input
                        className="mr-2 accent-emerald-300"
                        type="checkbox"
                        name="developmentFocusPlayerId"
                        value={player.id}
                        defaultChecked={player.developmentFocus}
                      />
                      <span className="font-semibold text-white">{player.fullName}</span>
                      <span className="mt-1 block text-slate-400">
                        {player.positionCode} · OVR {player.positionOverall} · POT{" "}
                        {player.potentialRating}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <FormSubmitButton pendingLabel="Woche wird vorbereitet...">
              {action.label}
            </FormSubmitButton>
          </form>
        ) : action.kind === "advance-week" ? (
          <form action={advanceWeekAction}>
            <input type="hidden" name="saveGameId" value={saveGameId} />
            <FormSubmitButton pendingLabel="Naechste Woche wird geladen...">
              {action.label}
            </FormSubmitButton>
          </form>
        ) : action.href ? (
          <Link
            href={action.href}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-200/40 bg-emerald-200/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-white/15"
          >
            {action.label}
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-black/15 px-4 py-2 text-sm font-semibold text-slate-300">
            Kein Match verfuegbar
          </span>
        )}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {feedbackItems.map((item) => (
          <div key={item.label} className="rounded-lg border border-white/10 bg-black/15 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
