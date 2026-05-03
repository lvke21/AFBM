import type { OnlineCoreLifecycleState } from "@/lib/online/online-league-lifecycle";
import type { OnlineLeague } from "@/lib/online/online-league-types";

export type AdminGmFilter =
  | "all"
  | "active"
  | "warning"
  | "inactive"
  | "removal_eligible"
  | "hot_seat"
  | "vacant";

export type AdminFinanceSort = "revenue" | "attendance" | "fanMood" | "fanPressure" | "cash";

export const GM_FILTERS: Array<{ id: AdminGmFilter; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "active", label: "Aktiv" },
  { id: "warning", label: "Verwarnt" },
  { id: "inactive", label: "Inaktiv" },
  { id: "removal_eligible", label: "Entfernung möglich" },
  { id: "hot_seat", label: "Unter Druck" },
  { id: "vacant", label: "Vakant" },
];

export const FINANCE_SORTS: Array<{ id: AdminFinanceSort; label: string }> = [
  { id: "revenue", label: "Umsatz" },
  { id: "attendance", label: "Attendance" },
  { id: "fanMood", label: "FanMood" },
  { id: "fanPressure", label: "FanPressure" },
  { id: "cash", label: "Cash" },
];

export function adminWeekPhaseLabel(input: {
  allPlayersReady: boolean;
  canSimulate: boolean;
  hasCompletedWeek: boolean;
  league: OnlineLeague;
  lifecycle: OnlineCoreLifecycleState;
  simulationInProgress: boolean;
}) {
  switch (input.lifecycle.phase) {
    case "blockedConflict":
      return "Statuskonflikt blockiert";
    case "draftActive":
      return "Draft läuft";
    case "draftPending":
      return "Draft vorbereitet";
    case "joining":
      return "Liga-Beitritt offen";
    case "noLeague":
      return "Keine Liga geladen";
    case "noTeam":
      return "Kein Team verbunden";
    case "readyComplete":
      return "Simulation möglich";
    case "readyOpen":
    case "waitingForOthers":
      return "Woche offen";
    case "resultsAvailable":
      return "Ergebnisse verfügbar";
    case "rosterInvalid":
      return "Kader nicht simulationsfähig";
    case "seasonComplete":
      return "Saison abgeschlossen";
    case "simulating":
      return "Simulation läuft";
    case "weekCompleted":
      return input.hasCompletedWeek && !input.allPlayersReady
        ? "Nächste Woche offen"
        : "Woche abgeschlossen";
  }
}

export function adminSimulationHint(input: {
  allPlayersReady: boolean;
  blockReasons: string[];
  canSimulate: boolean;
  league: OnlineLeague;
  lifecycle: OnlineCoreLifecycleState;
  missingReadyCount: number;
  simulationInProgress: boolean;
}) {
  switch (input.lifecycle.phase) {
    case "blockedConflict":
      return input.lifecycle.reasons[0] ?? "Lifecycle-Konflikt blockiert die Simulation.";
    case "draftActive":
      return "Fantasy Draft läuft noch. Week-Simulation bleibt gesperrt.";
    case "draftPending":
      return "Fantasy Draft ist noch nicht abgeschlossen.";
    case "joining":
      return "Liga-Beitritt und Team-Zuordnung sind noch nicht abgeschlossen.";
    case "noLeague":
      return "Wähle zuerst eine Liga aus.";
    case "noTeam":
      return "Mindestens ein aktiver Manager hat kein gültiges Team.";
    case "readyComplete":
      return "Alle aktiven Teams sind bereit. Der Admin kann diese Woche einmal simulieren.";
    case "readyOpen":
    case "waitingForOthers":
      return `${input.missingReadyCount} aktive Team${input.missingReadyCount === 1 ? "" : "s"} fehlen noch.`;
    case "resultsAvailable":
      return "Ergebnisse sind verfügbar. Prüfe Results und Standings nach Reload.";
    case "rosterInvalid":
      return input.lifecycle.reasons[0] ?? "Mindestens ein Kader ist nicht simulationsfähig.";
    case "seasonComplete":
      return input.lifecycle.reasons[0] ?? "Die Saison ist abgeschlossen. Es gibt keine spielbare Woche mehr.";
    case "simulating":
      return "Simulation läuft. Mehrfachklicks sind gesperrt, bis die Aktion abgeschlossen ist.";
    case "weekCompleted":
      return "Woche ist abgeschlossen; Ergebnisdetails werden geladen oder geprüft.";
  }
}

function jobSecurityStatus(user: OnlineLeague["users"][number]) {
  return user.jobSecurity?.status ?? "stable";
}

function activityStatus(user: OnlineLeague["users"][number]) {
  return user.activity?.inactiveStatus ?? "active";
}

function averageAttendanceRate(user: OnlineLeague["users"][number]) {
  const history = user.attendanceHistory ?? [];

  return (
    history.reduce((sum, attendance) => sum + attendance.attendanceRate, 0) /
    Math.max(1, history.length)
  );
}

export function filterAdminLeagueUsers(
  users: OnlineLeague["users"],
  filter: AdminGmFilter,
) {
  return users.filter((user) => {
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
}

export function sortAdminFinanceUsers(
  users: OnlineLeague["users"],
  financeSort: AdminFinanceSort,
) {
  return [...users].sort((firstUser, secondUser) => {
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
}
