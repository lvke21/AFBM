"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import type { AppShellContext } from "@/components/layout/navigation-model";
import {
  normalizeOnlineCoreLifecycle,
  type OnlineCoreLifecycleState,
  type OnlineCoreLifecyclePhase,
} from "@/lib/online/online-league-lifecycle";
import type { OnlineLeague } from "@/lib/online/online-league-types";

import {
  OnlineLeagueRouteStateProvider,
  useOnlineLeagueRouteStateValue,
} from "./online-league-route-state";

function getDraftStatusFromLifecycle(lifecycle: OnlineCoreLifecycleState | null) {
  if (!lifecycle) {
    return "completed";
  }

  if (lifecycle.draftStatus === "active") {
    return "active";
  }

  return lifecycle.draftStatus === "not_started" || lifecycle.draftStatus === "missing"
    ? "not_started"
    : "completed";
}

function getOnlineShellLifecycleLabel(phase: OnlineCoreLifecyclePhase) {
  switch (phase) {
    case "blockedConflict":
      return "Statuskonflikt";
    case "draftActive":
      return "Draft läuft";
    case "draftPending":
      return "Draft vorbereitet";
    case "joining":
      return "Liga-Beitritt";
    case "noLeague":
      return "Keine Liga";
    case "noTeam":
      return "Kein Team";
    case "readyComplete":
      return "Simulation bereit";
    case "readyOpen":
      return "Woche offen";
    case "resultsAvailable":
      return "Ergebnisse verfügbar";
    case "rosterInvalid":
      return "Kader prüfen";
    case "seasonComplete":
      return "Saison abgeschlossen";
    case "simulating":
      return "Simulation läuft";
    case "waitingForOthers":
      return "Wartet auf Manager";
    case "weekCompleted":
      return "Woche abgeschlossen";
  }
}

function getTeamRecordLabel(league: OnlineLeague | null, teamId: string) {
  const storedRecord = league?.standings?.find((record) => record.teamId === teamId);

  if (storedRecord) {
    return storedRecord.ties > 0
      ? `${storedRecord.wins}-${storedRecord.losses}-${storedRecord.ties}`
      : `${storedRecord.wins}-${storedRecord.losses}`;
  }

  const record = { wins: 0, losses: 0, ties: 0 };

  for (const result of league?.matchResults ?? []) {
    const isHome = result.homeTeamId === teamId;
    const isAway = result.awayTeamId === teamId;

    if (!isHome && !isAway) {
      continue;
    }

    if (result.homeScore === result.awayScore) {
      record.ties += 1;
    } else if (
      (isHome && result.homeScore > result.awayScore) ||
      (isAway && result.awayScore > result.homeScore)
    ) {
      record.wins += 1;
    } else {
      record.losses += 1;
    }
  }

  return record.ties > 0
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

export function OnlineLeagueAppShell({
  leagueId,
  children,
}: {
  leagueId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const baseHref = `/online/league/${leagueId}`;
  const isDraftRoute = pathname === `${baseHref}/draft`;
  const routeState = useOnlineLeagueRouteStateValue(leagueId, {
    draftPlayerLimit: isDraftRoute ? 120 : undefined,
    includeDraftPlayerPool: isDraftRoute,
  });
  const { league, currentUser } = routeState;
  const lifecycle = normalizeOnlineCoreLifecycle({ currentUser, league, requiresDraft: true });
  const currentLeagueUser = lifecycle?.currentLeagueUser ?? undefined;
  const draftStatus = getDraftStatusFromLifecycle(lifecycle);
  const rosterReady = Boolean(
    currentLeagueUser &&
      lifecycle.readyState?.activeParticipants.some(
        (participant) =>
          participant.userId === currentLeagueUser.userId && !participant.readyBlockedReason,
      ),
  );
  const teamNavigationReady = Boolean(currentLeagueUser);
  const managerTeam = currentLeagueUser
    ? {
        id: currentLeagueUser.teamId,
        name: currentLeagueUser.teamDisplayName ?? currentLeagueUser.teamName,
        abbreviation: currentLeagueUser.teamName.slice(0, 3).toUpperCase(),
        currentRecord: getTeamRecordLabel(league, currentLeagueUser.teamId),
      }
    : null;
  const context: AppShellContext = {
    saveGame: {
      id: leagueId,
      name: league?.name ?? "Online Multiplayer",
      leagueName: "AFBM Online",
    },
    baseHref,
    currentSeason: league
      ? {
          id: `online-season-${league.currentSeason}`,
          year: league.currentSeason ?? 1,
          phase: lifecycle.phase,
          phaseLabel: getOnlineShellLifecycleLabel(lifecycle.phase),
          week: lifecycle.currentWeek ?? league.currentWeek,
        }
      : null,
    managerTeam,
    nextGameHref: league ? `${baseHref}#week-loop` : null,
    online: {
      draftStatus,
      rosterReady,
      teamNavigationReady,
    },
  };

  return (
    <OnlineLeagueRouteStateProvider value={routeState}>
      <AppShell context={context}>{children}</AppShell>
    </OnlineLeagueRouteStateProvider>
  );
}
