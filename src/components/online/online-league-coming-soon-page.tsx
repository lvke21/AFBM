"use client";

import Link from "next/link";

import { getOnlineRecoveryCopy } from "@/lib/online/error-recovery";

import { ErrorState, LoadingState } from "./online-league-dashboard-panels";
import { getOnlineLeagueComingSoonCopy } from "./online-league-coming-soon-model";
import { useOnlineLeagueRouteState } from "./online-league-route-state";

export function OnlineLeagueComingSoonPage({
  feature,
  leagueId,
}: {
  feature: string;
  leagueId: string;
}) {
  const { loaded, loadError, retryLoad } = useOnlineLeagueRouteState();
  const copy = getOnlineLeagueComingSoonCopy(feature);

  if (!loaded) {
    return <LoadingState />;
  }

  if (loadError) {
    return (
      <ErrorState
        copy={getOnlineRecoveryCopy(loadError, {
          title: "Multiplayer-Bereich nicht verfügbar",
          message: loadError,
          helper: "Zurück zum Dashboard und erneut öffnen.",
        })}
        onRetry={retryLoad}
        retryLabel="Bereich erneut laden"
      />
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
        Coming Soon
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-white">{copy.title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
        {copy.description}
      </p>
      <p className="mt-4 rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold leading-6 text-amber-50">
        {copy.currentMvpHint}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/online/league/${leagueId}`}
          className="rounded-lg border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-center text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
        >
          Zurück zum Dashboard
        </Link>
        <Link
          href={`/online/league/${leagueId}#week-loop`}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/10"
        >
          Spielablauf ansehen
        </Link>
      </div>
    </section>
  );
}
