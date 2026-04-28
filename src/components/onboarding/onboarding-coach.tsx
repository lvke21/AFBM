"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { AppShellContext } from "@/components/layout/navigation-model";
import {
  buildOnboardingSteps,
  isOnboardingComplete,
  mergeCompletedOnboardingSteps,
  nextOnboardingStep,
  onboardingStorageKey,
  routeStepId,
} from "./onboarding-model";

type OnboardingCoachProps = {
  context: AppShellContext;
};

function readCompletedSteps(storageKey: string) {
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw) as unknown;

    return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeCompletedSteps(storageKey: string, completed: Set<string>) {
  window.localStorage.setItem(storageKey, JSON.stringify([...completed]));
}

export function OnboardingCoach({ context }: OnboardingCoachProps) {
  const pathname = usePathname();
  const saveGameId = context.saveGame?.id ?? null;
  const steps = useMemo(
    () =>
      buildOnboardingSteps({
        nextGameHref: context.nextGameHref,
        saveGameId,
      }),
    [context.nextGameHref, saveGameId],
  );
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const storageKey = saveGameId ? onboardingStorageKey(saveGameId) : null;

  useEffect(() => {
    if (!storageKey) {
      setCompletedSteps(new Set());
      setDismissed(false);
      return;
    }

    const stored = readCompletedSteps(storageKey);

    setCompletedSteps(stored);
    setDismissed(isOnboardingComplete(stored));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || dismissed) {
      return;
    }

    const routeStep = pathname.includes("/game/setup") ? null : routeStepId(pathname);
    const nextCompleted = mergeCompletedOnboardingSteps(completedSteps, routeStep);

    if (nextCompleted.size !== completedSteps.size) {
      writeCompletedSteps(storageKey, nextCompleted);
      setCompletedSteps(nextCompleted);
    }
  }, [completedSteps, dismissed, pathname, storageKey]);

  useEffect(() => {
    document.documentElement.dataset.onboardingTarget = dismissed
      ? ""
      : nextOnboardingStep(steps, completedSteps)?.targetKey ?? "";

    return () => {
      document.documentElement.dataset.onboardingTarget = "";
    };
  }, [completedSteps, dismissed, steps]);

  if (!storageKey || steps.length === 0 || dismissed) {
    return null;
  }

  const activeStep = nextOnboardingStep(steps, completedSteps);

  if (!activeStep) {
    return (
      <aside className="fixed bottom-4 right-4 z-40 max-w-sm rounded-lg border border-emerald-300/30 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl shadow-black/40">
        <p className="font-semibold text-white">Erstes Spiel gestartet</p>
        <p className="mt-2 text-slate-300">Jetzt kannst du dein Team weiter verbessern.</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100"
        >
          Verstanden
        </button>
      </aside>
    );
  }

  const progress = `${Math.min(completedSteps.size + 1, steps.length)}/${steps.length}`;

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[min(calc(100vw-2rem),380px)] rounded-lg border border-emerald-300/30 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl shadow-black/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Einstieg {progress}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">{activeStep.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
        >
          Spaeter
        </button>
      </div>
      <p className="mt-3 leading-6 text-slate-300">{activeStep.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {activeStep.href ? (
          <Link
            href={activeStep.href}
            className="inline-flex min-h-10 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
          >
            {activeStep.actionLabel}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => {
            const nextCompleted = new Set(completedSteps);
            nextCompleted.add(activeStep.id);
            writeCompletedSteps(storageKey, nextCompleted);
            setCompletedSteps(nextCompleted);
          }}
          className="inline-flex min-h-10 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Schritt erledigt
        </button>
      </div>
    </aside>
  );
}
