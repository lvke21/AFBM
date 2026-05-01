"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useFirebaseAuthState } from "@/components/auth/firebase-auth-provider";
import { formatDate } from "@/lib/utils/format";
import type { SaveGameListItem } from "@/modules/savegames/domain/savegame.types";

type SaveGameListResponseItem = Omit<SaveGameListItem, "updatedAt"> & {
  updatedAt: string;
};

export function SavegamesListSection() {
  const authState = useFirebaseAuthState();
  const [saveGames, setSaveGames] = useState<SaveGameListResponseItem[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authState.isAuthenticated) {
      setSaveGames([]);
      setLoadState("idle");
      setErrorMessage(null);
      return;
    }

    const abortController = new AbortController();

    setLoadState("loading");
    setErrorMessage(null);

    fetch("/api/savegames", {
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Savegames konnten nicht geladen werden (${response.status}).`);
        }

        return (await response.json()) as { items?: SaveGameListResponseItem[] };
      })
      .then((body) => {
        setSaveGames(body.items ?? []);
        setLoadState("ready");
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        setSaveGames([]);
        setLoadState("error");
        setErrorMessage(error instanceof Error ? error.message : "Savegames konnten nicht geladen werden.");
      });

    return () => abortController.abort();
  }, [authState.isAuthenticated]);

  return (
    <section className="glass-panel rounded-lg p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Deine Karriere
          </p>
          <h2
            className="mt-2 text-3xl font-semibold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Vorhandene Franchises
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {authState.isAuthenticated
              ? "Setze eine bestehende Offline-Karriere fort oder starte oben eine neue."
              : "Melde dich an, um zu spielen."}
          </p>
        </div>
      </div>

      {!authState.isAuthenticated ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/4 p-6 text-slate-200">
          Melde dich an, um deine Franchises zu laden.
        </div>
      ) : null}

      {authState.isAuthenticated && loadState === "loading" ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-slate-200">
          Savegames werden geladen...
        </div>
      ) : null}

      {authState.isAuthenticated && loadState === "error" ? (
        <div className="rounded-lg border border-rose-200/25 bg-rose-300/10 p-6 text-rose-100">
          {errorMessage ?? "Savegames konnten nicht geladen werden."}
        </div>
      ) : null}

      {authState.isAuthenticated && loadState === "ready" && saveGames.length > 0 ? (
        <div className="grid gap-4">
          {saveGames.map((saveGame) => (
            <Link
              key={saveGame.id}
              href={`/app/savegames/${saveGame.id}`}
              className="rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-emerald-300/35 hover:bg-white/8"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm text-emerald-300">{saveGame.leagueName}</p>
                  <h3 className="mt-1 text-2xl font-semibold text-white">{saveGame.name}</h3>
                  <p className="mt-2 text-sm text-slate-300">{saveGame.currentSeasonLabel}</p>
                </div>
                <div className="text-sm text-slate-300">
                  Aktualisiert am {formatDate(saveGame.updatedAt)}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {saveGame.teamCount} Teams
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {saveGame.playerCount} Spieler
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Status: {saveGame.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {authState.isAuthenticated && loadState === "ready" && saveGames.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/4 p-6 text-slate-200">
          Noch keine Offline-Franchise vorhanden.
        </div>
      ) : null}
    </section>
  );
}
