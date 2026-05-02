"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useFirebaseAuthState } from "@/components/auth/firebase-auth-provider";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { SaveGameDetail, SaveGameListItem } from "@/modules/savegames/domain/savegame.types";

type SaveGameListResponseItem = Omit<SaveGameListItem, "updatedAt"> & {
  updatedAt: string;
};

type SaveGameDetailResponse = Omit<SaveGameDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type SaveGameDeleteCapability = {
  enabled: boolean;
  reason: string | null;
};

type SaveGameListResponse = {
  capabilities?: {
    deleteSaveGame?: SaveGameDeleteCapability;
  };
  items?: SaveGameListResponseItem[];
};

type DetailState =
  | { status: "loading" }
  | { status: "ready"; detail: SaveGameDetailResponse }
  | { status: "error"; message: string };

const ACTIVE_SAVEGAME_STORAGE_KEY = "afbm.savegames.activeSaveGameId";

export function SavegamesListSection() {
  const router = useRouter();
  const authState = useFirebaseAuthState();
  const [saveGames, setSaveGames] = useState<SaveGameListResponseItem[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteCapability, setDeleteCapability] = useState<SaveGameDeleteCapability>({
    enabled: false,
    reason: "Lade Savegame-Berechtigungen...",
  });
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [detailsById, setDetailsById] = useState<Record<string, DetailState>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authState.isAuthenticated) {
      setSaveGames([]);
      setLoadState("idle");
      setErrorMessage(null);
      setFeedbackMessage(null);
      setOpenDetailId(null);
      setDetailsById({});
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

        return (await response.json()) as SaveGameListResponse;
      })
      .then((body) => {
        setSaveGames(body.items ?? []);
        setDeleteCapability(
          body.capabilities?.deleteSaveGame ?? {
            enabled: false,
            reason: "Löschen ist in dieser Umgebung nicht freigegeben.",
          },
        );
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

  function continueSaveGame(saveGame: SaveGameListResponseItem) {
    window.localStorage.setItem(ACTIVE_SAVEGAME_STORAGE_KEY, saveGame.id);
    router.push(`/app/savegames/${saveGame.id}`);
  }

  async function toggleDetails(saveGame: SaveGameListResponseItem) {
    setFeedbackMessage(null);

    if (openDetailId === saveGame.id) {
      setOpenDetailId(null);
      return;
    }

    setOpenDetailId(saveGame.id);

    if (detailsById[saveGame.id]?.status === "ready") {
      return;
    }

    setDetailsById((current) => ({
      ...current,
      [saveGame.id]: { status: "loading" },
    }));

    try {
      const response = await fetch(`/api/savegames/${saveGame.id}`);

      if (!response.ok) {
        throw new Error(`Details konnten nicht geladen werden (${response.status}).`);
      }

      const detail = (await response.json()) as SaveGameDetailResponse;
      setDetailsById((current) => ({
        ...current,
        [saveGame.id]: {
          detail,
          status: "ready",
        },
      }));
    } catch (error) {
      setDetailsById((current) => ({
        ...current,
        [saveGame.id]: {
          message: error instanceof Error ? error.message : "Details konnten nicht geladen werden.",
          status: "error",
        },
      }));
    }
  }

  async function deleteSaveGame(saveGame: SaveGameListResponseItem) {
    setFeedbackMessage(null);

    if (!deleteCapability.enabled) {
      setFeedbackMessage(
        deleteCapability.reason ?? "Löschen ist in dieser Umgebung nicht freigegeben.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Franchise "${saveGame.name}" wirklich löschen? Der Spielstand wird aus deiner Liste entfernt.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(saveGame.id);

    try {
      const response = await fetch(`/api/savegames/${saveGame.id}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? `Savegame konnte nicht gelöscht werden (${response.status}).`);
      }

      setSaveGames((current) => current.filter((item) => item.id !== saveGame.id));
      setDetailsById((current) => {
        const next = { ...current };
        delete next[saveGame.id];
        return next;
      });
      setOpenDetailId((current) => (current === saveGame.id ? null : current));

      if (window.localStorage.getItem(ACTIVE_SAVEGAME_STORAGE_KEY) === saveGame.id) {
        window.localStorage.removeItem(ACTIVE_SAVEGAME_STORAGE_KEY);
      }

      setFeedbackMessage(`Franchise "${saveGame.name}" wurde aus deiner Liste entfernt.`);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Savegame konnte nicht gelöscht werden.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const primarySaveGame = saveGames[0] ?? null;

  return (
    <section id="franchises" className="glass-panel scroll-mt-6 rounded-lg p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Fortsetzen
          </p>
          <h2
            className="mt-2 text-3xl font-semibold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Deine Franchises
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {authState.isAuthenticated
              ? "Setze dort fort, wo du zuletzt aufgehört hast, oder öffne eine andere Karriere."
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
        <div className="grid gap-3 rounded-lg border border-rose-200/25 bg-rose-300/10 p-6 text-rose-100">
          <p>{errorMessage ?? "Savegames konnten nicht geladen werden."}</p>
          <button
            type="button"
            onClick={() => {
              setLoadState("idle");
              window.location.reload();
            }}
            className="w-fit rounded-full border border-rose-100/30 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-100/10"
          >
            Erneut versuchen
          </button>
        </div>
      ) : null}

      {feedbackMessage ? (
        <div className="mb-4 rounded-lg border border-amber-200/25 bg-amber-300/10 p-4 text-sm text-amber-100">
          {feedbackMessage}
        </div>
      ) : null}

      {authState.isAuthenticated && loadState === "ready" && !deleteCapability.enabled ? (
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Löschen deaktiviert:{" "}
          {deleteCapability.reason ?? "Diese Umgebung erlaubt keine Savegame-Löschung."}
        </div>
      ) : null}

      {authState.isAuthenticated && loadState === "ready" && primarySaveGame ? (
        <article className="mb-5 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Zuletzt aktualisiert
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-white">
                {primarySaveGame.name}
              </h3>
              <p className="mt-2 text-sm text-emerald-50/85">
                {primarySaveGame.leagueName} · {primarySaveGame.currentSeasonLabel}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-emerald-50/85">
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {primarySaveGame.teamCount} Teams
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {primarySaveGame.playerCount} Spieler
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Aktualisiert am {formatDate(primarySaveGame.updatedAt)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => continueSaveGame(primarySaveGame)}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              Fortsetzen
            </button>
          </div>
        </article>
      ) : null}

      {authState.isAuthenticated && loadState === "ready" && saveGames.length > 0 ? (
        <div className="grid gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
            Alle Franchises
          </p>
          {saveGames.map((saveGame) => {
            const detailState = detailsById[saveGame.id];
            const detailsOpen = openDetailId === saveGame.id;
            const deleting = deletingId === saveGame.id;

            return (
              <article
                key={saveGame.id}
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

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => continueSaveGame(saveGame)}
                    className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    Fortsetzen
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleDetails(saveGame)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/25"
                  >
                    {detailsOpen ? "Details ausblenden" : "Details anzeigen"}
                  </button>
                  <button
                    type="button"
                    disabled={deleting || !deleteCapability.enabled}
                    title={!deleteCapability.enabled ? deleteCapability.reason ?? undefined : undefined}
                    onClick={() => void deleteSaveGame(saveGame)}
                    className="rounded-full border border-rose-200/30 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/10 focus:outline-none focus:ring-2 focus:ring-rose-200/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? "Lösche..." : "Löschen"}
                  </button>
                </div>

                {detailsOpen ? (
                  <SaveGameDetailsPanel detailState={detailState ?? { status: "loading" }} />
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {authState.isAuthenticated && loadState === "ready" && saveGames.length === 0 ? (
        <div className="rounded-lg border border-dashed border-emerald-200/25 bg-emerald-300/8 p-6 text-slate-200">
          <h3 className="text-2xl font-semibold text-white">Noch keine Karriere vorhanden</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Starte eine neue Franchise, um dein erstes Team zu übernehmen. Danach erscheint hier
            dein Fortsetzen-Button.
          </p>
          <a
            href="#new-career"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/18"
          >
            Neue Karriere starten
          </a>
        </div>
      ) : null}
    </section>
  );
}

function SaveGameDetailsPanel({ detailState }: { detailState: DetailState }) {
  if (detailState.status === "loading") {
    return (
      <div className="mt-5 rounded-lg border border-white/10 bg-black/15 p-4 text-sm text-slate-200">
        Details werden geladen...
      </div>
    );
  }

  if (detailState.status === "error") {
    return (
      <div className="mt-5 rounded-lg border border-rose-200/25 bg-rose-300/10 p-4 text-sm text-rose-100">
        {detailState.message}
      </div>
    );
  }

  const { detail } = detailState;
  const managerTeam = detail.teams.find((team) => team.managerControlled);

  return (
    <div className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-black/15 p-4 text-sm text-slate-200">
      <div className="grid gap-3 md:grid-cols-3">
        <DetailMetric label="Liga" value={detail.leagueName} />
        <DetailMetric label="Erstellt" value={formatDate(detail.createdAt)} />
        <DetailMetric label="Week-State" value={detail.weekState} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DetailMetric
          label="Aktuelle Saison"
          value={
            detail.currentSeason
              ? `${detail.currentSeason.year} · ${detail.currentSeason.phase} · Woche ${detail.currentSeason.week}`
              : "Kein Saisonstatus"
          }
        />
        <DetailMetric
          label="Manager-Team"
          value={managerTeam ? `${managerTeam.name} (${managerTeam.abbreviation})` : "Nicht gesetzt"}
        />
        <DetailMetric
          label="Salary Cap"
          value={detail.settings ? formatCurrency(detail.settings.salaryCap) : "Nicht gesetzt"}
        />
      </div>

      <div>
        <p className="mb-2 font-semibold text-white">Teams</p>
        <div className="grid gap-2 md:grid-cols-2">
          {detail.teams.slice(0, 8).map((team) => (
            <div
              key={team.id}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-slate-200"
            >
              <span className="font-medium text-white">{team.name}</span>
              <span className="ml-2 text-slate-400">
                {team.currentRecord} · Roster {team.rosterSize}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-slate-100">{value}</p>
    </div>
  );
}
