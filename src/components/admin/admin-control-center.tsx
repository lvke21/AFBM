"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminLeagueManager } from "@/components/admin/admin-league-manager";
import { useFirebaseAuthState } from "@/components/auth/firebase-auth-provider";
import { getFirebaseAdminActionHeaders } from "@/lib/admin/admin-api-client";
import { isAdminUid } from "@/lib/admin/admin-uid-allowlist";
import {
  applyLocalAdminBrowserState,
  getLocalAdminBrowserState,
  type LocalAdminBrowserStatePatch,
} from "@/lib/admin/local-admin-browser-state";
import { getFirebaseClientConfig } from "@/lib/firebase/client";
import { getOnlineFirebaseAuth } from "@/lib/online/auth/online-auth";
import { getOnlineBackendMode } from "@/lib/online/online-league-repository-provider";
import { getOnlineLeagueWeekReadyState } from "@/lib/online/online-league-week-service";
import { getCurrentWeekGames } from "@/lib/online/online-league-week-simulation";
import type { OnlineLeague } from "@/lib/online/online-league-types";

type HighlightTarget = "create" | "leagues" | null;
type HubPendingAction = "simulate-week" | "complete-week" | null;
type AdminActionResponse = {
  ok: boolean;
  message: string;
  league?: OnlineLeague | null;
  localState?: LocalAdminBrowserStatePatch;
};

function AdminActionButton({
  children,
  description,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  description: string;
  onClick: () => void;
  tone?: "default" | "safe" | "warning" | "debug";
}) {
  const toneClass = {
    debug: "border-violet-200/25 bg-violet-300/10 text-violet-50 hover:border-violet-200/45 hover:bg-violet-300/16",
    default: "border-white/10 bg-white/5 text-white hover:border-emerald-200/35 hover:bg-white/8",
    safe: "border-emerald-200/25 bg-emerald-300/10 text-emerald-50 hover:border-emerald-200/45 hover:bg-emerald-300/16",
    warning: "border-amber-200/25 bg-amber-300/10 text-amber-50 hover:border-amber-200/45 hover:bg-amber-300/16",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-20 w-full flex-col items-start justify-center rounded-lg border px-4 py-4 text-left transition focus-visible:border-emerald-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/35 ${toneClass}`}
    >
      <span className="text-base font-semibold">{children}</span>
      <span className="mt-1 text-xs font-medium leading-5 opacity-80">{description}</span>
    </button>
  );
}

function focusElement(id: string) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => element.focus({ preventScroll: true }), 250);
}

function getCurrentWeekScheduledGameCount(league: OnlineLeague) {
  const currentWeekGames = getCurrentWeekGames(league);

  if (currentWeekGames.length > 0) {
    return currentWeekGames.length;
  }

  return (league.schedule ?? []).filter((game) => game.week === league.currentWeek).length;
}

function getAdminHubWeekBlockReason(league: OnlineLeague | null) {
  if (!league) {
    return "Wähle zuerst eine Liga aus.";
  }

  const readyState = getOnlineLeagueWeekReadyState(league);
  const currentWeekGameCount = getCurrentWeekScheduledGameCount(league);

  if (league.status !== "active") {
    return "Liga ist noch nicht aktiv.";
  }

  if (league.fantasyDraft && league.fantasyDraft.status !== "completed") {
    return "Fantasy Draft ist noch nicht abgeschlossen.";
  }

  if (currentWeekGameCount === 0) {
    return "Für die aktuelle Woche sind keine Games vorhanden.";
  }

  if (!readyState.canSimulate) {
    return readyState.missingParticipants.length > 0
      ? `${readyState.missingParticipants.length} aktive Team${readyState.missingParticipants.length === 1 ? "" : "s"} fehlen noch im Ready-State.`
      : "Week-Simulation ist aktuell gesperrt.";
  }

  return null;
}

export function AdminControlCenter() {
  const router = useRouter();
  const authState = useFirebaseAuthState();
  const [selectedLeague, setSelectedLeague] = useState<OnlineLeague | null>(null);
  const [leagueCount, setLeagueCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget>(null);
  const [debugVisible, setDebugVisible] = useState(false);
  const [claimAdmin, setClaimAdmin] = useState<boolean | null>(null);
  const [pendingHubAction, setPendingHubAction] = useState<HubPendingAction>(null);
  const backendMode = getOnlineBackendMode();
  const uid = authState.user?.uid ?? null;
  const uidAllowlisted = isAdminUid(uid);
  const readyState = selectedLeague ? getOnlineLeagueWeekReadyState(selectedLeague) : null;
  const selectedLeagueGameCount = selectedLeague
    ? getCurrentWeekScheduledGameCount(selectedLeague)
    : 0;
  const selectedLeagueBlockReason = getAdminHubWeekBlockReason(selectedLeague);
  const canRunSelectedLeagueWeekAction = Boolean(selectedLeague && !selectedLeagueBlockReason);

  const handleLeaguesChange = useCallback((nextLeagues: OnlineLeague[]) => {
    setLeagueCount(nextLeagues.length);
    setSelectedLeague((current) => {
      if (!current) {
        return null;
      }

      return nextLeagues.find((league) => league.id === current.id) ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function readAdminClaim() {
      if (!uid || backendMode !== "firebase") {
        setClaimAdmin(null);
        return;
      }

      try {
        const firebaseUser = getOnlineFirebaseAuth().currentUser;

        if (!firebaseUser || firebaseUser.uid !== uid) {
          setClaimAdmin(null);
          return;
        }

        const token = await firebaseUser.getIdTokenResult();

        if (!cancelled) {
          setClaimAdmin(token.claims.admin === true);
        }
      } catch {
        if (!cancelled) {
          setClaimAdmin(null);
        }
      }
    }

    void readAdminClaim();

    return () => {
      cancelled = true;
    };
  }, [backendMode, uid]);

  function flashHighlight(target: HighlightTarget) {
    setHighlightTarget(target);

    window.setTimeout(() => {
      setHighlightTarget((current) => (current === target ? null : current));
    }, 1800);
  }

  function handleManageLeagues() {
    setNotice(
      leagueCount > 0
        ? "Firebase Ligen ist markiert. Wähle eine Liga aus oder öffne sie direkt."
        : "Keine Ligen vorhanden. Du kannst zuerst eine neue Online-Liga erstellen.",
    );
    flashHighlight("leagues");
    focusElement("ligen-verwalten");
  }

  function handleCreateLeague() {
    setNotice("Neue Online-Liga ist markiert. Das Feld Liga Name ist bereit.");
    flashHighlight("create");
    focusElement("liga-erstellen");
    window.setTimeout(() => document.getElementById("admin-league-name-input")?.focus(), 320);
  }

  function handleSimulationAndWeek() {
    if (!selectedLeague) {
      setNotice("Wähle zuerst eine Liga aus.");
      flashHighlight("leagues");
      focusElement("ligen-verwalten");
      return;
    }

    router.push(`/admin/league/${selectedLeague.id}`);
  }

  function handleDebugTools() {
    setDebugVisible(true);
    setNotice("Debug Tools sind geöffnet.");
    window.setTimeout(() => focusElement("admin-debug-tools"), 0);
  }

  async function runHubAdminAction(
    action: "simulateWeek",
    payload: Record<string, unknown>,
  ): Promise<AdminActionResponse> {
    const response = await fetch("/admin/api/online/actions", {
      method: "POST",
      headers: await getFirebaseAdminActionHeaders(),
      body: JSON.stringify({
        action,
        backendMode,
        localState: backendMode !== "firebase" ? getLocalAdminBrowserState() : undefined,
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

  async function runSelectedLeagueWeekAction(kind: Exclude<HubPendingAction, null>) {
    if (!selectedLeague || pendingHubAction) {
      return;
    }

    const blockReason = getAdminHubWeekBlockReason(selectedLeague);

    if (blockReason) {
      setNotice(blockReason);
      return;
    }

    const actionLabel = kind === "complete-week" ? "Woche abschließen" : "Woche simulieren";
    const actionImpact =
      kind === "complete-week"
        ? [
            "Diese Aktion simuliert die aktuelle Woche, speichert Ergebnisse und erhöht danach den Week-State, sofern die Admin API die Woche erfolgreich abschließt.",
            "Sie verändert Liga-Daten, Team-Records und gespeicherte Game Results.",
          ].join("\n")
        : [
            "Diese Aktion simuliert alle Games der aktuellen Woche und speichert die Ergebnisse.",
            "Sie verändert Liga-Daten, Team-Records und gespeicherte Game Results.",
          ].join("\n");
    const confirmed = window.confirm(
      [
        `${actionLabel} für "${selectedLeague.name}"?`,
        "",
        actionImpact,
        "",
        `Liga: ${selectedLeague.id}`,
        `Saison/Woche: S${selectedLeague.currentSeason ?? 1} W${selectedLeague.currentWeek}`,
        `Games diese Woche: ${getCurrentWeekScheduledGameCount(selectedLeague)}`,
        "",
        "Die Aktion läuft serverseitig über die Admin API und soll nicht doppelt für dieselbe Woche ausgeführt werden.",
      ].join("\n"),
    );

    if (!confirmed) {
      return;
    }

    setPendingHubAction(kind);
    setNotice(`${actionLabel} läuft...`);

    try {
      const result = await runHubAdminAction("simulateWeek", {
        leagueId: selectedLeague.id,
        season: selectedLeague.currentSeason ?? 1,
        week: selectedLeague.currentWeek,
      });

      if (result.league) {
        setSelectedLeague(result.league);
      }

      setNotice(result.message || `${actionLabel} wurde ausgeführt.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${actionLabel} konnte nicht ausgeführt werden.`);
    } finally {
      setPendingHubAction(null);
    }
  }

  function handleSelectedLeagueChange(league: OnlineLeague) {
    setSelectedLeague(league);
    setNotice(`${league.name} ist für Simulation & Woche ausgewählt.`);
  }

  return (
    <AdminAuthGate>
      <main className="min-h-screen bg-[#07111d] text-white">
        <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%),radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_32%)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col">
            <header className="pt-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                Adminmodus
              </p>
              <h1
                className="mt-3 text-5xl font-semibold text-white sm:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Admin Control Center
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Du steuerst die Liga. Jede Entscheidung beeinflusst alle Spieler.
              </p>
            </header>

            <section className="py-8">
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-6">
                <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                      Ligen
                    </p>
                    <div className="mt-3 grid gap-3">
                      <AdminActionButton
                        description="Liste fokussieren, vorhandene Ligen prüfen und eine aktive Liga auswählen."
                        onClick={handleManageLeagues}
                        tone="safe"
                      >
                        Ligen verwalten
                      </AdminActionButton>
                      <AdminActionButton
                        description="Formular öffnen und eine neue Online-Liga vorbereiten."
                        onClick={handleCreateLeague}
                      >
                        Liga erstellen
                      </AdminActionButton>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                      Betrieb
                    </p>
                    <div className="mt-3 grid gap-3">
                      <AdminActionButton
                        description="Öffnet die ausgewählte Liga für Week-State, Simulation und Abschluss."
                        onClick={handleSimulationAndWeek}
                        tone="warning"
                      >
                        Simulation & Woche
                      </AdminActionButton>
                      <AdminActionButton
                        description="Zeigt Memberships, unzugewiesene Teams und aktuelle Admin-Umgebung."
                        onClick={handleDebugTools}
                        tone="debug"
                      >
                        Debug Tools
                      </AdminActionButton>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href="/app/savegames"
                    className="flex min-h-12 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/35"
                  >
                    Zurück zum Hauptmenü
                  </Link>
                </div>

                {notice ? (
                  <div className="mt-4 rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50">
                    {notice}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="pb-12">
              <AdminHubOverview
                canRunWeekAction={canRunSelectedLeagueWeekAction}
                currentWeekGameCount={selectedLeagueGameCount}
                league={selectedLeague}
                pendingHubAction={pendingHubAction}
                readyCount={readyState?.readyCount ?? 0}
                requiredReadyCount={readyState?.requiredCount ?? 0}
                weekBlockReason={selectedLeagueBlockReason}
                onCompleteWeek={() => void runSelectedLeagueWeekAction("complete-week")}
                onDebug={() => {
                  setDebugVisible(true);
                  window.setTimeout(() => focusElement("admin-debug-tools"), 0);
                }}
                onDraftCheck={() => {
                  if (!selectedLeague) {
                    setNotice("Wähle zuerst eine Liga aus.");
                    return;
                  }

                  setNotice(
                    `Draft-Status ${selectedLeague.name}: ${selectedLeague.fantasyDraft?.status ?? "completed"}.`,
                  );
                }}
                onSimulateWeek={() => void runSelectedLeagueWeekAction("simulate-week")}
              />

              <AdminLeagueManager
                highlightedSection={highlightTarget}
                selectedLeagueId={selectedLeague?.id ?? null}
                onLeaguesChange={handleLeaguesChange}
                onSelectedLeagueChange={handleSelectedLeagueChange}
              />

              {debugVisible ? (
                <AdminDebugPanel
                  backendMode={backendMode}
                  claimAdmin={claimAdmin}
                  league={selectedLeague}
                  uid={uid}
                  uidAllowlisted={uidAllowlisted}
                />
              ) : null}
            </section>
          </div>
        </div>
      </main>
    </AdminAuthGate>
  );
}

function AdminHubOverview({
  canRunWeekAction,
  currentWeekGameCount,
  league,
  pendingHubAction,
  readyCount,
  requiredReadyCount,
  weekBlockReason,
  onCompleteWeek,
  onDebug,
  onDraftCheck,
  onSimulateWeek,
}: {
  canRunWeekAction: boolean;
  currentWeekGameCount: number;
  league: OnlineLeague | null;
  pendingHubAction: HubPendingAction;
  readyCount: number;
  requiredReadyCount: number;
  weekBlockReason: string | null;
  onCompleteWeek: () => void;
  onDebug: () => void;
  onDraftCheck: () => void;
  onSimulateWeek: () => void;
}) {
  const draftStatus = league?.fantasyDraft?.status ?? "completed";
  const statusTone = weekBlockReason ? "text-amber-100" : "text-emerald-100";

  return (
    <section className="mb-6 rounded-lg border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Aktuelle Liga
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {league ? league.name : "Keine aktive Liga ausgewählt"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {league
              ? "Prüfe zuerst Status, Woche, Draft und Teams. Kritische Aktionen bleiben gesperrt, bis alle Voraussetzungen erfüllt sind."
              : "Wähle unten eine Liga aus, um zentrale Admin-Aktionen freizuschalten."}
          </p>
        </div>
        {league ? (
          <Link
            href={`/admin/league/${league.id}`}
            className="w-fit rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16"
          >
            Liga öffnen
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <OverviewMetric label="Liga ID" value={league?.id ?? "Nicht ausgewählt"} />
        <OverviewMetric label="Status" value={league?.status ?? "n/a"} />
        <OverviewMetric label="Teams" value={league ? String(league.teams.length) : "0"} />
        <OverviewMetric
          label="Memberships"
          value={league ? `${league.users.length}/${league.maxUsers}` : "0/0"}
        />
        <OverviewMetric
          label="Week-State"
          value={league ? `S${league.currentSeason ?? 1} W${league.currentWeek} · ${league.weekStatus ?? "pre_week"}` : "n/a"}
        />
        <OverviewMetric label="Draft-State" value={draftStatus} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <p className="font-semibold text-white">Safety Check</p>
          <p className="mt-2">
            Ready: {readyCount}/{requiredReadyCount} · Games aktuelle Woche: {currentWeekGameCount}
          </p>
          {weekBlockReason ? (
            <p className={`mt-2 ${statusTone}`}>{weekBlockReason}</p>
          ) : (
            <p className={`mt-2 ${statusTone}`}>
              Simulation und Abschluss sind freigegeben. Vor Ausführung erscheint ein Confirm Dialog.
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
          <button
            type="button"
            disabled={!canRunWeekAction || pendingHubAction !== null}
            onClick={onSimulateWeek}
            className="rounded-lg border border-sky-200/25 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="block">
              {pendingHubAction === "simulate-week" ? "Simulation läuft..." : "Woche simulieren"}
            </span>
            <span className="mt-1 block text-xs font-medium leading-5 opacity-80">
              Simulation · schreibt Ergebnisse und Records
            </span>
          </button>
          <button
            type="button"
            disabled={!canRunWeekAction || pendingHubAction !== null}
            onClick={onCompleteWeek}
            className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="block">
              {pendingHubAction === "complete-week" ? "Abschluss läuft..." : "Woche abschließen"}
            </span>
            <span className="mt-1 block text-xs font-medium leading-5 opacity-80">
              Week-State · nur nach Confirm ausführen
            </span>
          </button>
          <button
            type="button"
            disabled={!league}
            onClick={onDebug}
            className="rounded-lg border border-violet-200/25 bg-violet-300/10 px-4 py-3 text-sm font-semibold text-violet-50 transition hover:bg-violet-300/16 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="block">Debug-Status anzeigen</span>
            <span className="mt-1 block text-xs font-medium leading-5 opacity-80">
              Debug · Memberships und Team-Zuweisungen
            </span>
          </button>
          <button
            type="button"
            disabled={!league}
            onClick={onDraftCheck}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="block">Draft-Status prüfen</span>
            <span className="mt-1 block text-xs font-medium leading-5 opacity-80">
              Aktuell: {draftStatus}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

function AdminDebugPanel({
  backendMode,
  claimAdmin,
  league,
  uid,
  uidAllowlisted,
}: {
  backendMode: string;
  claimAdmin: boolean | null;
  league: OnlineLeague | null;
  uid: string | null;
  uidAllowlisted: boolean;
}) {
  const firebaseProjectId = readFirebaseProjectId();
  const adminLabel =
    claimAdmin === true
      ? "Admin via Custom Claim"
      : uidAllowlisted
        ? "Admin via UID-Allowlist"
        : "Kein Adminstatus erkannt";
  const debugState = league ? buildAdminHubDebugState(league, uid) : null;

  return (
    <section
      id="admin-debug-tools"
      tabIndex={-1}
      className="mt-6 rounded-lg border border-sky-200/20 bg-sky-300/5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-sky-200/35"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
        Debug Tools
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Admin Debug Snapshot</h2>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <DebugItem label="Aktuelle User UID" value={uid ?? "Nicht angemeldet"} />
        <DebugItem label="Adminstatus" value={adminLabel} />
        <DebugItem label="Claim admin" value={claimAdmin === null ? "Unbekannt" : String(claimAdmin)} />
        <DebugItem label="UID-Allowlist" value={String(uidAllowlisted)} />
        <DebugItem label="Backend-Modus" value={backendMode} />
        <DebugItem label="Firebase Projekt" value={firebaseProjectId} />
        <DebugItem label="Deploy Env" value={process.env.NEXT_PUBLIC_AFBM_DEPLOY_ENV ?? "Nicht gesetzt"} />
        <DebugItem label="Build Env" value={process.env.NODE_ENV} />
      </dl>

      {debugState ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <DebugList
            emptyLabel="Keine kaputten Membership-Referenzen erkannt."
            items={debugState.brokenMemberships}
            label="Broken Memberships"
          />
          <DebugList
            emptyLabel="Keine unassigned Teams erkannt."
            items={debugState.unassignedTeams}
            label="Unassigned Teams"
          />
          <DebugList
            emptyLabel="Keine Teams mit assignedUserId ohne Membership erkannt."
            items={debugState.assignedTeamsWithoutMembership}
            label="assignedUserId ohne Membership"
          />
          <DebugList
            emptyLabel="Aktueller User ist keiner ausgewählten Liga-Membership zugeordnet."
            items={debugState.currentUserConnections}
            label="User-Team-Verbindung"
          />
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Wähle eine Liga aus, um Membership- und Team-Verbindungen zu prüfen.
        </p>
      )}
    </section>
  );
}

function buildAdminHubDebugState(league: OnlineLeague, currentUid: string | null) {
  const teamsById = new Map(league.teams.map((team) => [team.id, team]));
  const usersByTeamId = new Map(league.users.map((user) => [user.teamId, user]));
  const usersById = new Map(league.users.map((user) => [user.userId, user]));
  const orphanedMemberships = league.users
    .filter((user) => !teamsById.has(user.teamId))
    .map((user) => `${user.username} -> ${user.teamId}`);
  const usersWithoutTeamAssignment = league.users
    .filter((user) => !user.teamId)
    .map((user) => `${user.username} -> keine teamId`);
  const brokenMemberships = [...orphanedMemberships, ...usersWithoutTeamAssignment];
  const unassignedTeams = league.teams
    .filter((team) => !team.assignedUserId && !usersByTeamId.has(team.id))
    .map((team) => `${team.name} (${team.id})`);
  const assignedTeamsWithoutMembership = league.teams
    .filter((team) => team.assignedUserId && !usersById.has(team.assignedUserId))
    .map((team) => `${team.name} -> ${team.assignedUserId}`);
  const currentUserConnections = currentUid
    ? league.users
        .filter((user) => user.userId === currentUid)
        .map((user) => `${user.username} -> ${user.teamDisplayName ?? user.teamName} (${user.teamId})`)
    : [];

  return {
    assignedTeamsWithoutMembership,
    brokenMemberships,
    currentUserConnections,
    unassignedTeams,
  };
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DebugList({
  emptyLabel,
  items,
  label,
}: {
  emptyLabel: string;
  items: string[];
  label: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {items.map((item) => (
            <li key={item} className="rounded-md border border-white/10 bg-[#07111d]/60 px-3 py-2 font-mono text-xs text-slate-100">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-300">{emptyLabel}</p>
      )}
    </div>
  );
}

function readFirebaseProjectId() {
  try {
    return getFirebaseClientConfig().projectId || "Nicht gesetzt";
  } catch {
    return "Nicht gesetzt";
  }
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-2 break-words font-mono text-sm text-slate-100">{value}</dd>
    </div>
  );
}
