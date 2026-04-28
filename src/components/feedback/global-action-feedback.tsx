"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { readActionFeedback } from "@/lib/actions/action-feedback";
import type { ActionEffectDirection } from "@/lib/actions/action-feedback";

function feedbackClasses(tone: "success" | "error") {
  if (tone === "error") {
    return {
      container: "border-rose-300/30 bg-rose-300/10 text-rose-50",
      kicker: "text-rose-200",
      button: "border-rose-200/25 text-rose-100 hover:bg-rose-200/10",
    };
  }

  return {
    container: "border-emerald-300/30 bg-emerald-300/10 text-emerald-50",
    kicker: "text-emerald-200",
    button: "border-emerald-200/25 text-emerald-100 hover:bg-emerald-200/10",
  };
}

function effectSymbol(direction: ActionEffectDirection) {
  if (direction === "up") {
    return "↑";
  }

  if (direction === "down") {
    return "↓";
  }

  return "=";
}

function effectClasses(direction: ActionEffectDirection) {
  if (direction === "up") {
    return "border-emerald-200/25 bg-emerald-200/10 text-emerald-50";
  }

  if (direction === "down") {
    return "border-rose-200/25 bg-rose-200/10 text-rose-50";
  }

  return "border-white/10 bg-black/15 text-slate-100";
}

export function GlobalActionFeedback() {
  const searchParams = useSearchParams();
  const feedback = readActionFeedback(searchParams);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  if (!feedback) {
    return null;
  }

  const feedbackKey = [
    feedback.tone,
    feedback.title,
    feedback.message,
    feedback.impact ?? "",
    JSON.stringify(feedback.valueFeedback ?? null),
    JSON.stringify(feedback.effects ?? []),
    feedback.actionHref ?? "",
    feedback.actionLabel ?? "",
  ].join(":");

  if (dismissedKey === feedbackKey) {
    return null;
  }

  const classes = feedbackClasses(feedback.tone);

  return (
    <section
      aria-live="polite"
      className={`mb-6 rounded-lg border p-4 shadow-sm ${classes.container}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${classes.kicker}`}>
            {feedback.tone === "success" ? "Aktion erfolgreich" : "Aktion fehlgeschlagen"}
          </p>
          <h2 className="mt-2 text-base font-semibold text-white">{feedback.title}</h2>
          <p className="mt-1 text-sm text-slate-100">{feedback.message}</p>
          {feedback.effects && feedback.effects.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {feedback.effects.map((effect) => (
                <span
                  key={`${effect.direction}-${effect.label}`}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${effectClasses(
                    effect.direction,
                  )}`}
                >
                  <span aria-hidden="true">{effectSymbol(effect.direction)}</span>
                  {effect.label}
                </span>
              ))}
            </div>
          ) : null}
          {feedback.impact ? (
            <p className="mt-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm text-white">
              {feedback.impact}
            </p>
          ) : null}
          {feedback.valueFeedback ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                Value Feedback · {feedback.valueFeedback.impact}
              </p>
              <p className="mt-1">{feedback.valueFeedback.reason}</p>
              {feedback.valueFeedback.context ? (
                <p className="mt-1 text-xs text-slate-300">{feedback.valueFeedback.context}</p>
              ) : null}
            </div>
          ) : null}
          {feedback.actionHref && feedback.actionLabel ? (
            <Link
              href={feedback.actionHref}
              className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              {feedback.actionLabel}
            </Link>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setDismissedKey(feedbackKey)}
          className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${classes.button}`}
        >
          Schliessen
        </button>
      </div>
    </section>
  );
}
