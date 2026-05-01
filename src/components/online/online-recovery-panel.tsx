"use client";

import React from "react";
import Link from "next/link";

import type { OnlineRecoveryCopy } from "@/lib/online/error-recovery";

type OnlineRecoveryPanelProps = {
  copy: OnlineRecoveryCopy;
  tone?: "warning" | "error";
  retryLabel?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
};

export function OnlineRecoveryPanel({
  copy,
  tone = "warning",
  retryLabel = "Erneut versuchen",
  onRetry,
  backHref = "/online",
  backLabel = "Zurueck zum Online Hub",
}: OnlineRecoveryPanelProps) {
  const toneClass =
    tone === "error"
      ? "border-rose-200/25 bg-rose-300/10 text-rose-100"
      : "border-amber-200/25 bg-amber-300/10 text-amber-100";
  const actionClass =
    tone === "error"
      ? "border-rose-100/25 text-rose-50 hover:bg-rose-100/10"
      : "border-amber-100/25 text-amber-50 hover:bg-amber-100/10";

  return (
    <section aria-live="polite" className={`w-full rounded-lg border p-6 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
        Multiplayer Recovery
      </p>
      <h1
        className="mt-2 text-3xl font-semibold text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {copy.title}
      </h1>
      <p className="mt-3 text-sm leading-6 opacity-90">{copy.message}</p>
      <p className="mt-2 text-sm leading-6 opacity-80">{copy.helper}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${actionClass}`}
          >
            {retryLabel}
          </button>
        ) : null}
        <Link
          href={backHref}
          className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${actionClass}`}
        >
          {backLabel}
        </Link>
      </div>
    </section>
  );
}
