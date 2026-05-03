"use client";

import { useState } from "react";

import { getOnlineRecoveryCopy } from "@/lib/online/error-recovery";
import { normalizeOnlineCoreLifecycle } from "@/lib/online/online-league-lifecycle";

import {
  DraftStatusPanel,
  ErrorState,
  LoadingState,
} from "./online-league-dashboard-panels";
import { useOnlineLeagueRouteState } from "./online-league-route-state";

type ActionFeedback = {
  tone: "success" | "warning";
  message: string;
} | null;

export function OnlineLeagueDraftPage({ leagueId }: { leagueId: string }) {
  const {
    repository,
    league,
    setLeague,
    currentUser,
    loaded,
    loadError,
    retryLoad,
  } = useOnlineLeagueRouteState();
  const [feedback, setFeedback] = useState<ActionFeedback>(null);
  const [pendingPickPlayerId, setPendingPickPlayerId] = useState<string | null>(null);

  async function handlePickPlayer(playerId: string) {
    const currentLeagueUser =
      league?.users.find((user) => user.userId === currentUser?.userId) ?? null;

    if (!currentUser || !currentLeagueUser || pendingPickPlayerId) {
      return;
    }

    setPendingPickPlayerId(playerId);
    setFeedback(null);

    try {
      const result = await repository.makeFantasyDraftPick(
        leagueId,
        currentLeagueUser.teamId,
        playerId,
      );

      if (result.league) {
        setLeague(result.league);
      }

      setFeedback({
        tone: result.status === "success" || result.status === "completed" ? "success" : "warning",
        message: result.message,
      });
    } catch (error) {
      setFeedback({
        tone: "warning",
        message:
          error instanceof Error
            ? error.message
            : "Pick konnte nicht gespeichert werden. Bitte versuche es erneut.",
      });
    } finally {
      setPendingPickPlayerId(null);
    }
  }

  if (!loaded) {
    return <LoadingState />;
  }

  if (loadError) {
    return (
      <ErrorState
        copy={getOnlineRecoveryCopy(loadError, {
          title: "Draft nicht verfügbar",
          message: loadError,
          helper: "Zurück zum Dashboard und erneut öffnen.",
        })}
        onRetry={retryLoad}
        retryLabel="Draft erneut laden"
      />
    );
  }

  const lifecycle =
    league && currentUser
      ? normalizeOnlineCoreLifecycle({
          currentUser,
          league,
          requiresDraft: Boolean(league.fantasyDraft),
        })
      : null;

  if (!lifecycle || lifecycle.draftStatus === "missing" || lifecycle.draftStatus === "completed") {
    const completedPickCount = league?.fantasyDraft?.picks.length ?? 0;

    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Draft
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Draft abgeschlossen</h2>
        <p className="mt-2 text-sm text-slate-300">
          Der Fantasy Draft ist abgeschlossen. Roster und Depth Charts sind im Dashboard verfügbar.
        </p>
        <p className="mt-3 w-fit rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
          {completedPickCount} Picks gespeichert
        </p>
      </section>
    );
  }

  return (
    <DraftStatusPanel
      league={league}
      currentUser={currentUser}
      pendingPickPlayerId={pendingPickPlayerId}
      feedback={feedback}
      onPickPlayer={handlePickPlayer}
    />
  );
}
