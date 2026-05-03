"use client";

import Link from "next/link";

import { getOnlineRecoveryCopy } from "@/lib/online/error-recovery";

import { ErrorState, LoadingState } from "./online-league-dashboard-panels";
import {
  getOnlineLeagueRouteFallbackHref,
  type OnlineLeagueRouteFallbackResolution,
} from "./online-league-route-fallback-model";
import { useOnlineLeagueRouteState } from "./online-league-route-state";

export function OnlineLeagueRouteFallbackPage({
  leagueId,
  resolution,
}: {
  leagueId: string;
  resolution: OnlineLeagueRouteFallbackResolution;
}) {
  const { loaded, loadError, retryLoad } = useOnlineLeagueRouteState();
  const dashboardHref = `/online/league/${leagueId}`;

  if (!loaded) {
    return <LoadingState />;
  }

  if (loadError) {
    return (
      <ErrorState
        copy={getOnlineRecoveryCopy(loadError, {
          title: "Multiplayer-Seite nicht verfügbar",
          message: loadError,
          helper: "Zurück zum Dashboard und erneut öffnen.",
        })}
        onRetry={retryLoad}
        retryLabel="Seite erneut laden"
      />
    );
  }

  const bestHref = getOnlineLeagueRouteFallbackHref(leagueId, resolution);
  const unknownLabel = resolution.type === "unknown" ? resolution.pathLabel : "dieser Bereich";

  return (
    <section className="rounded-lg border border-amber-200/25 bg-amber-300/10 p-5 text-amber-50 shadow-2xl shadow-black/30 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
        Navigation
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-white">
        Multiplayer-Bereich nicht direkt geöffnet
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 opacity-90">
        {unknownLabel} ist keine eigenständige Multiplayer-Seite. Nutze den passenden
        Dashboard-Bereich, damit Liga, Team und Week-State im selben Kontext bleiben.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={bestHref}
          className="rounded-lg border border-amber-100/25 px-4 py-3 text-sm font-semibold transition hover:bg-amber-100/10"
        >
          Passenden Bereich öffnen
        </Link>
        <Link
          href={dashboardHref}
          className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Zurück zum Dashboard
        </Link>
      </div>
    </section>
  );
}
