"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import type { AppShellContext } from "@/components/layout/navigation-model";
import type { OnlineLeague } from "@/lib/online/online-league-types";

import {
  OnlineLeagueRouteStateProvider,
  useOnlineLeagueRouteStateValue,
} from "./online-league-route-state";

function hasPlayableRoster(user: OnlineLeague["users"][number] | undefined) {
  const activeRosterCount =
    user?.contractRoster?.filter((player) => player.status === "active").length ?? 0;

  return activeRosterCount >= 53 && Boolean(user?.depthChart?.length);
}

function getDraftStatus(league: OnlineLeague | null) {
  return league?.fantasyDraft?.status ?? "completed";
}

export function OnlineLeagueAppShell({
  leagueId,
  children,
}: {
  leagueId: string;
  children: ReactNode;
}) {
  const routeState = useOnlineLeagueRouteStateValue(leagueId);
  const { league, currentUser } = routeState;
  const baseHref = `/online/league/${leagueId}`;
  const currentLeagueUser = league?.users.find((user) => user.userId === currentUser?.userId);
  const draftStatus = getDraftStatus(league);
  const rosterReady = hasPlayableRoster(currentLeagueUser);
  const teamNavigationReady = Boolean(currentLeagueUser && rosterReady && draftStatus === "completed");
  const managerTeam = teamNavigationReady && currentLeagueUser
    ? {
        id: currentLeagueUser.teamId,
        name: currentLeagueUser.teamDisplayName ?? currentLeagueUser.teamName,
        abbreviation: currentLeagueUser.teamName.slice(0, 3).toUpperCase(),
        currentRecord: "0-0",
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
          phase: league.weekStatus ?? "pre_week",
          week: league.currentWeek,
        }
      : null,
    managerTeam,
    nextGameHref: teamNavigationReady ? `${baseHref}#week-loop` : null,
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
