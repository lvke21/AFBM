"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getOnlineLeagueById,
  ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
  ONLINE_LEAGUES_STORAGE_KEY,
  type OnlineLeague,
} from "@/lib/online/online-league-service";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import {
  ONLINE_USERNAME_STORAGE_KEY,
  ONLINE_USER_ID_STORAGE_KEY,
} from "@/lib/online/online-user-service";

function readyLabel(readyForWeek: boolean) {
  return readyForWeek ? "Ready" : "Nicht bereit";
}

function statusLabel(status: OnlineLeague["status"]) {
  return status === "waiting" ? "Wartet auf Spieler" : "Saison läuft";
}

function teamDisplayName(user: OnlineLeague["users"][number]) {
  return user.teamDisplayName ?? user.teamName;
}

function jobSecurityScore(user: OnlineLeague["users"][number]) {
  return user.jobSecurity?.score ?? 72;
}

function jobSecurityStatus(user: OnlineLeague["users"][number]) {
  return user.jobSecurity?.status ?? "stable";
}

function activityStatus(user: OnlineLeague["users"][number]) {
  return user.activity?.inactiveStatus ?? "active";
}

function missedWeeklyActions(user: OnlineLeague["users"][number]) {
  return user.activity?.missedWeeklyActions ?? 0;
}

function lastLeagueActionAt(user: OnlineLeague["users"][number]) {
  return user.activity?.lastLeagueActionAt ?? user.joinedAt;
}

function formatUserList(users: OnlineLeague["users"]) {
  if (users.length === 0) {
    return "Niemand";
  }

  return users.map((user) => user.username).join(", ");
}

function getAdminLeagueRulesSummary(league: OnlineLeague) {
  const activityRules = league.leagueSettings?.gmActivityRules;

  if (!activityRules) {
    return {
      sourceLabel: "Standardregeln",
      activityLabel:
        "Keine konkreten Inaktivitätsfristen gespeichert. Admin-Eingriffe sollten begründet und sichtbar kommuniziert werden.",
    };
  }

  return {
    sourceLabel: "Gespeicherte Ligaregeln",
    activityLabel:
      `Warnung ab ${activityRules.warningAfterMissedWeeks}, inaktiv ab ${activityRules.inactiveAfterMissedWeeks}, ` +
      `Admin-Prüfung ab ${activityRules.removalEligibleAfterMissedWeeks} verpassten Week Actions.`,
  };
}

type AdminGmFilter =
  | "all"
  | "active"
  | "warning"
  | "inactive"
  | "removal_eligible"
  | "hot_seat"
  | "vacant";

const GM_FILTERS: Array<{ id: AdminGmFilter; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "active", label: "Active" },
  { id: "warning", label: "Warning" },
  { id: "inactive", label: "Inactive" },
  { id: "removal_eligible", label: "Removal eligible" },
  { id: "hot_seat", label: "Hot seat" },
  { id: "vacant", label: "Vacant" },
];

type AdminFinanceSort = "revenue" | "attendance" | "fanMood" | "fanPressure" | "cash";

const FINANCE_SORTS: Array<{ id: AdminFinanceSort; label: string }> = [
  { id: "revenue", label: "Revenue" },
  { id: "attendance", label: "Attendance" },
  { id: "fanMood", label: "FanMood" },
  { id: "fanPressure", label: "FanPressure" },
  { id: "cash", label: "Cash" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-CH").format(Math.round(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function averageAttendanceRate(user: OnlineLeague["users"][number]) {
  const history = user.attendanceHistory ?? [];

  return (
    history.reduce((sum, attendance) => sum + attendance.attendanceRate, 0) /
    Math.max(1, history.length)
  );
}

function getFinanceWarnings(user: OnlineLeague["users"][number]) {
  const warnings: string[] = [];
  const fanMood = user.fanbaseProfile?.fanMood ?? 60;
  const fanPressure = user.fanPressure?.fanPressureScore ?? 0;
  const cashBalance = user.financeProfile?.cashBalance ?? 0;
  const attendanceHistory = user.attendanceHistory ?? [];
  const latestAttendance = attendanceHistory[0]?.attendanceRate ?? averageAttendanceRate(user);

  if (fanMood < 30) {
    warnings.push("FanMood kritisch");
  }

  if (cashBalance < 1_000_000) {
    warnings.push("CashBalance kritisch");
  }

  if (latestAttendance < 0.55 && attendanceHistory.length > 0) {
    warnings.push("Attendance stark gefallen");
  }

  if (fanPressure >= 70 || jobSecurityStatus(user) === "hot_seat") {
    warnings.push("GM unter Druck");
  }

  return warnings.length > 0 ? warnings.join(" · ") : "Keine Warnung";
}

function getTrainingPlanStatus(user: OnlineLeague["users"][number], league: OnlineLeague) {
  const season = user.jobSecurity?.lastUpdatedSeason ?? 1;
  const currentPlan = user.weeklyTrainingPlans?.find(
    (plan) => plan.season === season && plan.week === league.currentWeek,
  );

  if (!currentPlan) {
    return {
      label: "Kein Plan",
      detail: "Auto-Default im Week Flow",
    };
  }

  return {
    label: currentPlan.source === "gm_submitted" ? "Gesetzt" : "Auto",
    detail: `${currentPlan.intensity}/${currentPlan.primaryFocus}`,
  };
}

function getLastTrainingActivity(user: OnlineLeague["users"][number]) {
  const planAt = user.weeklyTrainingPlans?.[0]?.submittedAt;
  const outcomeAt = user.trainingOutcomes?.[0]?.createdAt;

  return planAt ?? outcomeAt ?? "Keine Aktivität";
}

type AdminActionResponse = {
  ok: boolean;
  message: string;
  league?: OnlineLeague | null;
  localState?: {
    leaguesJson: string | null;
    lastLeagueId: string | null;
  };
};

function getLocalAdminState() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return {
    leaguesJson: window.localStorage.getItem(ONLINE_LEAGUES_STORAGE_KEY),
    lastLeagueId: window.localStorage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY),
    userId: window.localStorage.getItem(ONLINE_USER_ID_STORAGE_KEY),
    username: window.localStorage.getItem(ONLINE_USERNAME_STORAGE_KEY),
  };
}

function applyLocalAdminState(localState: AdminActionResponse["localState"]) {
  if (typeof window === "undefined" || !localState) {
    return;
  }

  if (localState.leaguesJson) {
    window.localStorage.setItem(ONLINE_LEAGUES_STORAGE_KEY, localState.leaguesJson);
  } else {
    window.localStorage.removeItem(ONLINE_LEAGUES_STORAGE_KEY);
  }

  if (localState.lastLeagueId) {
    window.localStorage.setItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY, localState.lastLeagueId);
  } else {
    window.localStorage.removeItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY);
  }
}

export function AdminLeagueDetail({ leagueId }: { leagueId: string }) {
  const [league, setLeague] = useState<OnlineLeague | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "warning">("success");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [filter, setFilter] = useState<AdminGmFilter>("all");
  const [financeSort, setFinanceSort] = useState<AdminFinanceSort>("revenue");
  const repository = useMemo(() => getOnlineLeagueRepository(), []);

  useEffect(() => {
    if (repository.mode === "firebase") {
      return repository.subscribeToLeague(
        leagueId,
        (nextLeague) => {
          setLeague(nextLeague);
          setLoaded(true);
        },
        () => {
          setLeague(null);
          setLoaded(true);
        },
      );
    }

    setLeague(getOnlineLeagueById(leagueId));
    setLoaded(true);

    return undefined;
  }, [leagueId, repository]);

  function updateLeague(
    nextLeague: OnlineLeague | null,
    message: string,
    tone: "success" | "warning" = "success",
  ) {
    setLeague(nextLeague);
    setFeedback(nextLeague ? message : "Liga konnte nicht gefunden werden.");
    setFeedbackTone(nextLeague ? tone : "warning");
  }

  async function requestAdminAction(
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
        leagueId,
        localState: repository.mode === "local" ? getLocalAdminState() : undefined,
        ...payload,
      }),
    });
    const result = (await response.json()) as AdminActionResponse;

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Admin-Aktion konnte nicht ausgeführt werden.");
    }

    applyLocalAdminState(result.localState);
    return result;
  }

  async function runAdminAction(
    actionId: string,
    action: () => Promise<AdminActionResponse>,
    successMessage: string,
  ) {
    if (pendingAction) {
      return;
    }

    setPendingAction(actionId);

    try {
      const result = await action();
      updateLeague(result.league ?? null, result.message || successMessage);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Admin-Aktion konnte nicht ausgeführt werden.",
      );
      setFeedbackTone("warning");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSetAllReady() {
    await runAdminAction(
      "set-all-ready",
      () => requestAdminAction("setAllReady"),
      "Alle Spieler wurden auf Ready gesetzt.",
    );
  }

  async function handleStartLeague() {
    await runAdminAction(
      "start-league",
      () => requestAdminAction("startLeague"),
      "Liga wurde gestartet.",
    );
  }

  async function handleRemovePlayer(userId: string, username: string) {
    const confirmed = window.confirm(`${username} wirklich aus der Liga entfernen?`);

    if (!confirmed) {
      return;
    }

    await runAdminAction(
      `remove-player:${userId}`,
      () =>
        requestAdminAction("removePlayer", {
          targetUserId: userId,
          reason: "Removed from Admin Control Center",
        }),
      `${username} wurde aus der Liga entfernt.`,
    );
  }

  async function handleSimulateWeek() {
    const confirmed = window.confirm(
      `Week ${league?.currentWeek ?? ""} simulieren? Danach beginnt die nächste Week und die Ready-States werden zurückgesetzt.`,
    );

    if (!confirmed) {
      return;
    }

    await runAdminAction(
      "simulate-week",
      () => requestAdminAction("simulateWeek"),
      "Die Woche wurde simuliert. Die nächste Week ist vorbereitet.",
    );
  }

  function handleApplyRevenueSharing() {
    void runAdminAction(
      "revenue-sharing",
      () => requestAdminAction("applyRevenueSharing"),
      "Revenue Sharing wurde angewendet.",
    );
  }

  function handleResetTrainingPlan(user: OnlineLeague["users"][number]) {
    const season = user.jobSecurity?.lastUpdatedSeason ?? 1;

    void runAdminAction(
      `reset-training:${user.userId}`,
      () =>
        requestAdminAction("resetTrainingPlan", {
          targetUserId: user.userId,
          season,
          week: league?.currentWeek ?? 1,
        }),
      `Trainingsplan für ${user.username} wurde zurückgesetzt.`,
    );
  }

  function handleMissedWeek(userId: string, username: string) {
    void runAdminAction(
      `missed-week:${userId}`,
      () => requestAdminAction("recordMissedWeek", { targetUserId: userId }),
      `${username}: verpasste Woche erfasst.`,
    );
  }

  function handleWarnGm(userId: string, username: string) {
    const message = window.prompt(`Warnung an ${username}`, "Bitte Week Action nachholen.");

    if (!message) {
      return;
    }

    const deadline = window.prompt("Frist ISO-Datum", new Date().toISOString());

    if (!deadline) {
      return;
    }

    void runAdminAction(
      `warn:${userId}`,
      () =>
        requestAdminAction("warnGm", {
          targetUserId: userId,
          message,
          deadlineAt: deadline,
        }),
      `${username} wurde verwarnt.`,
    );
  }

  function handleAuthorizeRemoval(userId: string, username: string) {
    const reason = window.prompt(`Grund für Entlassungs-Ermächtigung von ${username}`);

    if (!reason) {
      return;
    }

    void runAdminAction(
      `authorize-removal:${userId}`,
      () => requestAdminAction("authorizeRemoval", { targetUserId: userId, reason }),
      `Entlassung für ${username} wurde ermächtigt.`,
    );
  }

  function handleAdminRemoveGm(userId: string, username: string) {
    const reason = window.prompt(`Pflichtgrund für direkte Admin-Entfernung von ${username}`);

    if (!reason) {
      return;
    }

    const confirmed = window.confirm(`${username} direkt entfernen und Team vakant setzen?`);

    if (!confirmed) {
      return;
    }

    void runAdminAction(
      `admin-remove:${userId}`,
      () => requestAdminAction("adminRemoveGm", { targetUserId: userId, reason }),
      `${username} wurde entfernt und das Team ist vakant.`,
    );
  }

  function handleMarkVacant(userId: string, username: string) {
    const reason = window.prompt(`Pflichtgrund, um ${username}s Team vakant zu setzen`);

    if (!reason) {
      return;
    }

    const confirmed = window.confirm(`${username}s Team wirklich vakant setzen?`);

    if (!confirmed) {
      return;
    }

    void runAdminAction(
      `mark-vacant:${userId}`,
      () => requestAdminAction("markVacant", { targetUserId: userId, reason }),
      `${username}s Team wurde als vakant markiert.`,
    );
  }

  if (!loaded) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-slate-200">
        Liga wird geladen...
      </div>
    );
  }

  if (!league) {
    return (
      <section className="rounded-lg border border-amber-200/25 bg-amber-300/10 p-6 text-amber-100">
        <h1
          className="text-3xl font-semibold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Liga konnte nicht gefunden werden.
        </h1>
        <Link
          href="/admin"
          className="mt-6 inline-flex rounded-lg border border-amber-100/25 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/10"
        >
          Zurück zum Admin Hub
        </Link>
      </section>
    );
  }

  const filteredUsers = league.users.filter((user) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "hot_seat") {
      return (
        jobSecurityStatus(user) === "hot_seat" ||
        jobSecurityStatus(user) === "termination_risk"
      );
    }

    if (filter === "vacant") {
      return user.teamStatus === "vacant";
    }

    return activityStatus(user) === filter;
  });
  const financeUsers = [...league.users].sort((firstUser, secondUser) => {
    switch (financeSort) {
      case "attendance":
        return averageAttendanceRate(secondUser) - averageAttendanceRate(firstUser);
      case "fanMood":
        return (secondUser.fanbaseProfile?.fanMood ?? 0) - (firstUser.fanbaseProfile?.fanMood ?? 0);
      case "fanPressure":
        return (
          (secondUser.fanPressure?.fanPressureScore ?? 0) -
          (firstUser.fanPressure?.fanPressureScore ?? 0)
        );
      case "cash":
        return (secondUser.financeProfile?.cashBalance ?? 0) - (firstUser.financeProfile?.cashBalance ?? 0);
      case "revenue":
      default:
      return (secondUser.financeProfile?.totalRevenue ?? 0) - (firstUser.financeProfile?.totalRevenue ?? 0);
    }
  });
  const readyUsers = league.users.filter((user) => user.readyForWeek);
  const missingReadyUsers = league.users.filter((user) => !user.readyForWeek);
  const allPlayersReady = league.users.length > 0 && missingReadyUsers.length === 0;
  const leagueRulesSummary = getAdminLeagueRulesSummary(league);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
            Admin Liga
          </p>
          <h1
            className="mt-2 text-4xl font-semibold text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {league.name}
          </h1>
          <p className="mt-3 font-mono text-xs text-slate-500">{league.id}</p>
        </div>

        <Link
          href="/admin"
          className="w-fit rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
        >
          Zurück zum Admin Hub
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Status
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{statusLabel(league.status)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Woche
          </p>
          <p className="mt-2 text-lg font-semibold text-white">Week {league.currentWeek}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Spieler
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {league.users.length}/{league.maxUsers}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Teams
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{league.teams.length}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          disabled={league.users.length === 0 || pendingAction !== null}
          onClick={handleSetAllReady}
          className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pendingAction === "set-all-ready" ? "Setzt Ready..." : "Alle Spieler auf Ready setzen"}
        </button>
        <button
          type="button"
          disabled={league.status === "active" || pendingAction !== null}
          onClick={handleStartLeague}
          className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pendingAction === "start-league" ? "Startet..." : "Liga starten"}
        </button>
        <button
          type="button"
          disabled={pendingAction !== null || league.weekStatus === "simulating"}
          onClick={handleSimulateWeek}
          className="rounded-lg border border-sky-200/25 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pendingAction === "simulate-week" ? "Simulation läuft..." : "Simulation starten"}
        </button>
        <Link
          href={`/online/league/${league.id}`}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/8"
        >
          Spieleransicht öffnen
        </Link>
        <button
          type="button"
          disabled={league.users.length === 0 || pendingAction !== null}
          onClick={handleApplyRevenueSharing}
          className="rounded-lg border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-55"
        >
          Revenue Sharing anwenden
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-sky-200/20 bg-sky-300/10 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
              Simulationssteuerung
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Week {league.currentWeek} bereit machen
            </h2>
            <p className="mt-2 text-sm leading-6 text-sky-50/85">
              Der Liga-Admin schaltet die Woche weiter. Sobald alle Spieler bereit sind,
              kann die Simulation gestartet werden.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                Ready
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {readyUsers.length}/{league.users.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-50/85">
                {formatUserList(readyUsers)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200/25 bg-amber-300/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
                Fehlt noch
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {missingReadyUsers.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-50/85">
                {formatUserList(missingReadyUsers)}
              </p>
            </div>
          </div>
          <p
            className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
              allPlayersReady
                ? "border-emerald-200/30 bg-emerald-300/10 text-emerald-50"
                : "border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            {allPlayersReady
              ? "Alle Spieler sind bereit. Simulation starten ist möglich."
              : "Noch nicht alle Spieler sind bereit. Der Admin kann bei Bedarf trotzdem eingreifen."}
          </p>
        </div>
      </section>

      {feedback ? (
        <div
          aria-live="polite"
          className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
            feedbackTone === "success"
              ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
              : "border-amber-200/25 bg-amber-300/10 text-amber-100"
          }`}
        >
          {feedback}
        </div>
      ) : null}

      <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Finanz- und Franchise-Übersicht
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Stadion, Fans und Cashflow
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {FINANCE_SORTS.map((sortOption) => (
              <button
                key={sortOption.id}
                type="button"
                aria-pressed={financeSort === sortOption.id}
                onClick={() => setFinanceSort(sortOption.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  financeSort === sortOption.id
                    ? "border-cyan-200/45 bg-cyan-300/12 text-cyan-50"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                }`}
              >
                {sortOption.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">FanMood</th>
                <th className="px-4 py-3">FanPressure</th>
                <th className="px-4 py-3">CashBalance</th>
                <th className="px-4 py-3">Season P/L</th>
                <th className="px-4 py-3">Warnungen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {financeUsers.length > 0 ? (
                financeUsers.map((user) => (
                  <tr key={user.userId} className="bg-[#07111d]/65">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{teamDisplayName(user)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {user.stadiumProfile?.name ?? "Stadium pending"}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-200">
                      {formatCurrency(user.financeProfile?.totalRevenue ?? 0)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-200">
                        {Math.round(averageAttendanceRate(user) * 100)}%
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {user.attendanceHistory?.[0]
                          ? formatNumber(user.attendanceHistory[0].attendance)
                          : "Keine Daten"}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-200">
                      {user.fanbaseProfile?.fanMood ?? 0}/100
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-200">
                      {user.fanPressure?.fanPressureScore ?? 0}/100
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-200">
                      {formatCurrency(user.financeProfile?.cashBalance ?? 0)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-200">
                      {formatCurrency(user.financeProfile?.seasonProfitLoss ?? 0)}
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-amber-100">
                      {getFinanceWarnings(user)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center font-semibold text-slate-300" colSpan={8}>
                    Noch keine Franchise-Daten vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-amber-200/25 bg-amber-300/10 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
              Liga-Regeln
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Adminrolle und Inaktivität
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-50/85">
              Der Admin schaltet Wochen weiter, Spieler setzen sich pro Woche bereit,
              und bei längerer Inaktivität kann ein Team vakant gesetzt werden.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-100/25 bg-amber-50/10 px-3 py-1 text-xs font-semibold text-amber-50">
            {leagueRulesSummary.sourceLabel}
          </span>
        </div>
        <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200">
          {leagueRulesSummary.activityLabel}
        </p>
      </section>

      <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
          Training Status
        </p>
        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Letzte Aktivität</th>
                <th className="px-4 py-3">Letztes Outcome</th>
                <th className="px-4 py-3">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {league.users.length > 0 ? (
                league.users.map((user) => {
                  const trainingStatus = getTrainingPlanStatus(user, league);
                  const lastOutcome = user.trainingOutcomes?.[0];

                  return (
                    <tr key={user.userId} className="bg-[#07111d]/65">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{teamDisplayName(user)}</p>
                        <p className="mt-1 text-xs text-slate-500">{user.username}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-200">{trainingStatus.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{trainingStatus.detail}</p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-400">
                        {getLastTrainingActivity(user)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-200">
                          {lastOutcome
                            ? `Prep ${lastOutcome.preparationBonus}, Fatigue ${lastOutcome.fatigueDelta}`
                            : "Noch kein Outcome"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {lastOutcome
                            ? `Chem ${lastOutcome.chemistryDelta}, Injury ${lastOutcome.injuryRiskDelta}`
                            : "Wird im Week Flow erzeugt"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          disabled={pendingAction !== null}
                          onClick={() => handleResetTrainingPlan(user)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Plan zurücksetzen
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center font-semibold text-slate-300" colSpan={5}>
                    Noch keine Teams mit Training-Status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
          GM Kontrolle
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {GM_FILTERS.map((gmFilter) => (
            <button
              key={gmFilter.id}
              type="button"
              aria-pressed={filter === gmFilter.id}
              onClick={() => setFilter(gmFilter.id)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                filter === gmFilter.id
                  ? "border-amber-200/45 bg-amber-300/12 text-amber-50"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
              }`}
            >
              {gmFilter.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Job Security</th>
              <th className="px-4 py-3">Aktivität</th>
              <th className="px-4 py-3">Ready-State</th>
              <th className="px-4 py-3">Join Zeitpunkt</th>
              <th className="px-4 py-3">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.userId} className="bg-[#07111d]/65">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{user.username}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{user.userId}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-200">{teamDisplayName(user)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {user.teamStatus === "vacant" ? "Vakant" : "Besetzt"} · {user.controlledBy}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{jobSecurityScore(user)}/100</p>
                    <p className="mt-1 text-xs text-slate-400">{jobSecurityStatus(user)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{activityStatus(user)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Missed: {missedWeeklyActions(user)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Last action: {lastLeagueActionAt(user)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        user.readyForWeek
                          ? "border-emerald-200/30 text-emerald-100"
                          : "border-white/10 text-slate-300"
                      }`}
                    >
                      {readyLabel(user.readyForWeek)}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-400">
                    {user.joinedAt}
                  </td>
                  <td className="px-4 py-4">
                    <div className="grid min-w-44 gap-2">
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => handleMissedWeek(user.userId, user.username)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Verpasste Woche +1
                      </button>
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => handleWarnGm(user.userId, user.username)}
                        className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Verwarnen
                      </button>
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => handleAuthorizeRemoval(user.userId, user.username)}
                        className="rounded-lg border border-sky-200/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-sky-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Entlassung ermächtigen
                      </button>
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => handleAdminRemoveGm(user.userId, user.username)}
                        className="rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        GM entfernen
                      </button>
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => handleMarkVacant(user.userId, user.username)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Team vakant setzen
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Spieler entfernen ${user.username}`}
                      disabled={pendingAction !== null}
                      onClick={() => handleRemovePlayer(user.userId, user.username)}
                      className="mt-2 rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Legacy entfernen
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-center font-semibold text-slate-300" colSpan={7}>
                  Keine GMs für diesen Filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Logs
        </p>
        {league.logs && league.logs.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {league.logs.map((logEntry) => (
              <div
                key={logEntry.id}
                className="rounded-lg border border-white/10 bg-[#07111d]/70 px-4 py-3"
              >
                <p className="text-sm font-semibold text-white">{logEntry.message}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {logEntry.createdAt}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/4 p-4 text-sm font-semibold text-slate-300">
            Noch keine Admin-Logs vorhanden.
          </div>
        )}
      </section>
    </section>
  );
}
