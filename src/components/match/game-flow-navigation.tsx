import Link from "next/link";

import {
  getGameFlowStatus,
  getGameFlowStatusLabel,
  getGameFlowStepLabel,
  getGameLiveHref,
  getGameReportHref,
  getGameSetupHref,
  type GameFlowStep,
} from "./game-flow-model";
import type { MatchReport } from "./match-report-model";

type GameFlowNavigationProps = {
  activeStep: GameFlowStep;
  match: Pick<MatchReport, "status" | "homeTeam" | "awayTeam"> | null;
  matchId: string | null;
  saveGameId: string;
};

const STEPS: GameFlowStep[] = ["setup", "live", "report"];

function stepHref(saveGameId: string, step: GameFlowStep, matchId: string | null) {
  if (step === "live") {
    return getGameLiveHref(saveGameId, matchId);
  }

  if (step === "report") {
    return getGameReportHref(saveGameId, matchId);
  }

  return getGameSetupHref(saveGameId, matchId);
}

function statusClasses(status: ReturnType<typeof getGameFlowStatus>) {
  if (status === "live") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  if (status === "finished") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  return "border-sky-300/30 bg-sky-300/10 text-sky-100";
}

function stepAccess(
  step: GameFlowStep,
  active: boolean,
  status: ReturnType<typeof getGameFlowStatus>,
) {
  if (active || step === "setup") {
    return { enabled: true, helper: active ? "Aktuell" : "Review" };
  }

  if (step === "live") {
    return status === "pre"
      ? { enabled: false, helper: "Nach Start" }
      : { enabled: true, helper: status === "live" ? "Jetzt" : "Review" };
  }

  return status === "finished"
    ? { enabled: true, helper: "Jetzt" }
    : { enabled: false, helper: "Nach Spielende" };
}

export function GameFlowNavigation({
  activeStep,
  match,
  matchId,
  saveGameId,
}: GameFlowNavigationProps) {
  const status = getGameFlowStatus(match?.status ?? "SCHEDULED");

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Spielablauf
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {match
              ? `${match.homeTeam.abbreviation} vs ${match.awayTeam.abbreviation}`
              : "Kein Spiel ausgewaehlt"}
          </h2>
        </div>
        <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${statusClasses(status)}`}>
          {getGameFlowStatusLabel(status)}
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const active = step === activeStep;
          const access = stepAccess(step, active, status);
          const className = [
            "rounded-lg border px-4 py-3 transition",
            active
              ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-50"
              : access.enabled
                ? "border-white/10 bg-black/10 text-slate-300 hover:bg-white/8 hover:text-white"
                : "cursor-not-allowed border-white/10 bg-black/15 text-slate-500",
          ].join(" ");
          const content = (
            <>
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Schritt {index + 1} · {access.helper}
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {getGameFlowStepLabel(step)}
              </span>
            </>
          );

          if (!access.enabled) {
            return (
              <span
                key={step}
                aria-disabled="true"
                className={className}
                title={`${getGameFlowStepLabel(step)} wird ${access.helper.toLowerCase()} verfuegbar.`}
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={step}
              href={stepHref(saveGameId, step, matchId)}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
