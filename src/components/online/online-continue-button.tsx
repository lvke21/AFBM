"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import { buildOnlineContinueState } from "./online-continue-model";
import { getOnlineModeStatusCopy } from "./online-mode-status-model";

export function OnlineContinueButton() {
  const router = useRouter();
  const repository = getOnlineLeagueRepository();
  const modeStatus = getOnlineModeStatusCopy(repository.mode);
  const [feedback, setFeedback] = useState<{
    message: string;
    helper: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleContinue() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const lastLeagueId = repository.getLastLeagueId();
      const league = lastLeagueId ? await repository.getLeagueById(lastLeagueId) : null;
      const continueState = buildOnlineContinueState(lastLeagueId, league);

      if (continueState.status !== "ready") {
        if (continueState.status === "missing-league") {
          repository.clearLastLeagueId(lastLeagueId ?? undefined);
        }

        setFeedback({
          message: continueState.message,
          helper:
            continueState.status === "missing-league"
              ? modeStatus.missingLeagueHelper
              : continueState.helper,
        });
        return;
      }

      router.push(continueState.href);
    } catch {
      setFeedback({
        message: "Online-Liga konnte nicht geladen werden.",
        helper: "Prüfe deine Verbindung oder suche erneut nach einer Liga.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={handleContinue}
        disabled={isLoading}
        className="flex min-h-20 w-full items-center justify-center rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-6 py-5 text-center text-xl font-semibold text-emerald-50 transition hover:border-emerald-200/60 hover:bg-emerald-300/16 disabled:cursor-wait disabled:opacity-70"
      >
        {isLoading ? "Liga wird geladen..." : "Weiterspielen"}
      </button>
      {feedback ? (
        <div
          aria-live="polite"
          className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100"
        >
          <p>{feedback.message}</p>
          <p className="mt-1 text-xs text-amber-100/80">{feedback.helper}</p>
        </div>
      ) : null}
    </div>
  );
}
