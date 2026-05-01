"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  getOnlineLeagues,
  type OnlineLeague,
} from "@/lib/online/online-league-service";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import {
  applyLocalAdminBrowserState,
  getLocalAdminBrowserState,
  type LocalAdminBrowserStatePatch,
} from "@/lib/admin/local-admin-browser-state";
import { AdminFeedbackBanner } from "./admin-feedback-banner";
import { useAdminPendingAction } from "./use-admin-pending-action";

function formatStatus(status: OnlineLeague["status"]) {
  return status;
}

type AdminActionResponse = {
  ok: boolean;
  message: string;
  leagues?: OnlineLeague[];
  localState?: LocalAdminBrowserStatePatch;
};

export function AdminLeagueManager() {
  const [leagues, setLeagues] = useState<OnlineLeague[]>([]);
  const [leagueName, setLeagueName] = useState("");
  const [maxUsers, setMaxUsers] = useState(16);
  const [startWeek, setStartWeek] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "warning">("success");
  const {
    beginAdminAction,
    endAdminAction,
    hasPendingAdminAction,
    pendingAction,
  } = useAdminPendingAction();
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const isFirebaseMode = repository.mode === "firebase";

  function showFeedback(message: string, tone: "success" | "warning" = "success") {
    setFeedback(message);
    setFeedbackTone(tone);
  }

  async function refreshLeagues() {
    try {
      setLeagues(
        isFirebaseMode
          ? await repository.getAvailableLeagues()
          : getOnlineLeagues(),
      );
    } catch {
      setLeagues([]);
      showFeedback("Ligen konnten nicht geladen werden.", "warning");
    }
  }

  useEffect(() => {
    if (isFirebaseMode) {
      return repository.subscribeToAvailableLeagues(setLeagues);
    }

    setLeagues(getOnlineLeagues());

    return undefined;
  }, [isFirebaseMode, repository]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!beginAdminAction("create")) {
      return;
    }

    try {
      const result = await runServerAdminAction("createLeague", {
        name: leagueName,
        maxUsers,
        startWeek,
      });
      await refreshLeagues();
      showFeedback(result.message);
      setLeagueName("");
      setMaxUsers(16);
      setStartWeek(1);
    } catch {
      showFeedback("Liga konnte nicht erstellt werden.", "warning");
    } finally {
      endAdminAction();
    }
  }

  async function handleDeleteLeague(league: OnlineLeague) {
    if (hasPendingAdminAction()) {
      return;
    }

    const confirmed = window.confirm(
      `Liga "${league.name}" wirklich löschen? Diese Aktion entfernt die Liga komplett.`,
    );

    if (!confirmed) {
      return;
    }

    if (!beginAdminAction(`delete:${league.id}`)) {
      return;
    }

    try {
      const result = await runServerAdminAction("deleteLeague", {
        leagueId: league.id,
        reason: "Archived from Admin Control Center",
      });
      repository.clearLastLeagueId(league.id);
      await refreshLeagues();
      showFeedback(result.message);
    } catch {
      showFeedback(`${league.name} konnte nicht gelöscht werden.`, "warning");
    } finally {
      endAdminAction();
    }
  }

  async function handleResetLeague(league: OnlineLeague) {
    if (hasPendingAdminAction()) {
      return;
    }

    const confirmed = window.confirm(
      `Liga "${league.name}" zurücksetzen? Mitglieder, Ready-State und Week-Fortschritt werden entfernt.`,
    );

    if (!confirmed) {
      return;
    }

    if (!beginAdminAction(`reset:${league.id}`)) {
      return;
    }

    try {
      const result = await runServerAdminAction("resetLeague", {
        leagueId: league.id,
        reason: "Reset from Admin Control Center",
      });
      repository.clearLastLeagueId(league.id);
      await refreshLeagues();
      showFeedback(result.message);
    } catch {
      showFeedback(`${league.name} konnte nicht zurückgesetzt werden.`, "warning");
    } finally {
      endAdminAction();
    }
  }

  async function handleDeleteAllLeagues() {
    const confirmed = window.confirm(
      "Alle lokalen Online-Ligen löschen? Diese Debug-Aktion kann nicht rückgängig gemacht werden.",
    );

    if (!confirmed) {
      return;
    }

    await runDebugAction("debugDeleteAllLeagues", "Erfolgreich ausgeführt: Alle lokalen Ligen gelöscht.");
  }

  async function handleAddFakeUser() {
    await runDebugAction("debugAddFakeUser", "Erfolgreich ausgeführt: Fake User hinzugefügt.");
  }

  async function handleFillLeague() {
    await runDebugAction("debugFillLeague", "Erfolgreich ausgeführt: Liga mit 16 Spielern gefüllt.");
  }

  async function handleSetAllReady() {
    await runDebugAction("debugSetAllReady", "Erfolgreich ausgeführt: Alle Spieler ready gesetzt.");
  }

  async function handleResetOnlineState() {
    const confirmed = window.confirm(
      "Lokalen Online-State inklusive lokaler User-ID zurücksetzen?",
    );

    if (!confirmed) {
      return;
    }

    await runDebugAction("debugResetOnlineState", "Erfolgreich ausgeführt: Online State zurückgesetzt.");
  }

  async function runServerAdminAction(
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<AdminActionResponse> {
    const response = await fetch("/admin/api/online/actions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action,
        backendMode: repository.mode,
        localState: !isFirebaseMode ? getLocalAdminBrowserState() : undefined,
        ...payload,
      }),
    });
    const result = (await response.json()) as AdminActionResponse;

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Admin-Aktion konnte nicht ausgeführt werden.");
    }

    applyLocalAdminBrowserState(result.localState);
    return result;
  }

  async function runDebugAction(action: string, successMessage: string) {
    if (!beginAdminAction(action)) {
      return;
    }

    try {
      await runServerAdminAction(action);
      repository.clearLastLeagueId();
      await refreshLeagues();
      showFeedback(successMessage);
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : "Debug-Aktion konnte nicht ausgeführt werden.",
        "warning",
      );
    } finally {
      endAdminAction();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section
        id="liga-erstellen"
        className="rounded-lg border border-amber-200/20 bg-white/[0.035] p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
          Liga erstellen
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Neue Online-Liga</h2>
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">Liga Name</span>
            <input
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={leagueName}
              onChange={(event) => setLeagueName(event.target.value)}
              placeholder="Friday Night League"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-amber-200/60"
            />
          </label>

          <div className={`grid gap-4 ${isFirebaseMode ? "" : "sm:grid-cols-2"}`}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-200">Max Spieler</span>
              <input
                type="number"
                min={1}
                max={16}
                value={maxUsers}
                onChange={(event) => setMaxUsers(Number(event.target.value))}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-200/60"
              />
            </label>

            {!isFirebaseMode ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Start Woche</span>
                <input
                  type="number"
                  min={1}
                  value={startWeek}
                  onChange={(event) => setStartWeek(Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-200/60"
                />
              </label>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={pendingAction !== null}
            className="min-h-12 rounded-lg border border-amber-200/35 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-100/55 hover:bg-amber-300/16 disabled:cursor-wait disabled:opacity-60"
          >
            {pendingAction === "create" ? "Liga wird erstellt..." : "Liga erstellen"}
          </button>
        </form>

        <AdminFeedbackBanner className="mt-4" message={feedback} tone={feedbackTone} />
      </section>

      <section
        id="ligen-verwalten"
        className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
          Ligen verwalten
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {isFirebaseMode ? "Firebase Ligen" : "Lokale Ligen"}
        </h2>

        {leagues.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{league.name}</h3>
                    <p className="mt-1 font-mono text-xs text-slate-500">{league.id}</p>
                  </div>
                  <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                    {formatStatus(league.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-200">
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {league.users.length}/{league.maxUsers} Spieler
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    Week {league.currentWeek}
                  </span>
                </div>

                <div className={`mt-4 grid gap-2 ${isFirebaseMode ? "" : "sm:grid-cols-3"}`}>
                  <Link
                    href={`/admin/league/${league.id}`}
                    aria-label={`Öffnen ${league.name}`}
                    className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-center text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
                  >
                    Öffnen
                  </Link>
                  {!isFirebaseMode ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Löschen ${league.name}`}
                        disabled={pendingAction !== null}
                        onClick={() => handleDeleteLeague(league)}
                        className="rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-300/16 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingAction === `delete:${league.id}` ? "Löscht..." : "Löschen"}
                      </button>
                      <button
                        type="button"
                        aria-label={`Zurücksetzen ${league.name}`}
                        disabled={pendingAction !== null}
                        onClick={() => handleResetLeague(league)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingAction === `reset:${league.id}` ? "Setzt zurück..." : "Zurücksetzen"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-white/15 bg-white/4 p-5 text-sm font-semibold text-slate-300">
            Keine lokalen Ligen vorhanden.
          </div>
        )}
      </section>

      {!isFirebaseMode ? (
        <section
          id="debug-tools"
          className="rounded-lg border border-rose-200/20 bg-rose-300/5 p-5 lg:col-span-2"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200">
            Nur für Entwicklung
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Debug Tools</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Diese Aktionen verändern nur den lokalen Online-State im Browser und haben keinen
            Einfluss auf Singleplayer-Daten.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={handleDeleteAllLeagues}
              className="rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-3 text-sm font-semibold text-rose-50 transition hover:bg-rose-300/16 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Alle Ligen löschen
            </button>
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={handleAddFakeUser}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Fake User hinzufügen
            </button>
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={handleFillLeague}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Liga mit 16 Spielern füllen
            </button>
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={handleSetAllReady}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Alle Spieler ready setzen
            </button>
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={handleResetOnlineState}
              className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-50"
            >
              LocalStorage reset (Online State)
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
