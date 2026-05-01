"use client";

import { useEffect, useMemo, useState } from "react";

import type { OnlineLeague } from "@/lib/online/online-league-types";
import { getOnlineRecoveryCopy } from "@/lib/online/error-recovery";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import type { OnlineUser } from "@/lib/online/online-user-service";

import {
  DraftStatusPanel,
  ErrorState,
  LoadingState,
} from "./online-league-dashboard-panels";

type ActionFeedback = {
  tone: "success" | "warning";
  message: string;
} | null;

export function OnlineLeagueDraftPage({ leagueId }: { leagueId: string }) {
  const [league, setLeague] = useState<OnlineLeague | null>(null);
  const [currentUser, setCurrentUser] = useState<OnlineUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);
  const [pendingPickPlayerId, setPendingPickPlayerId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const repository = useMemo(() => getOnlineLeagueRepository(), []);

  function handleRetryLoad() {
    setLoaded(false);
    setLoadError(null);
    setReloadToken((currentToken) => currentToken + 1);
  }

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {
      // no active subscription yet
    };

    setLoaded(false);
    setLoadError(null);

    repository
      .getCurrentUser()
      .then(async (user) => {
        if (!active) {
          return;
        }

        setCurrentUser(user);
        const initialLeague = await repository.getLeagueById(leagueId);

        if (!active) {
          return;
        }

        setLeague(initialLeague);
        setLoaded(true);
        unsubscribe = repository.subscribeToLeague(
          leagueId,
          (nextLeague) => {
            if (active) {
              setLeague(nextLeague);
            }
          },
          (error) => {
            if (active) {
              setLoadError(error.message || "Draftdaten konnten nicht geladen werden.");
            }
          },
        );
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const recovery = getOnlineRecoveryCopy(error, {
          title: "Draftdaten konnten nicht geladen werden.",
          message: "Draftdaten konnten nicht geladen werden.",
          helper: "Bitte lade die Seite neu.",
        });

        setLoadError(`${recovery.message} ${recovery.helper}`);
        setLoaded(true);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [leagueId, repository, reloadToken]);

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
        onRetry={handleRetryLoad}
        retryLabel="Draft erneut laden"
      />
    );
  }

  if (!league?.fantasyDraft || league.fantasyDraft.status === "completed") {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Draft
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Draftboard nicht aktiv</h2>
        <p className="mt-2 text-sm text-slate-300">
          Der Draft ist aktuell nicht aktiv oder bereits abgeschlossen.
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
