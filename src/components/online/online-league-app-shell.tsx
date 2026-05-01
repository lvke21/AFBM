"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import type { AppShellContext } from "@/components/layout/navigation-model";
import type { OnlineLeague } from "@/lib/online/online-league-types";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import type { OnlineUser } from "@/lib/online/online-user-service";

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
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const [league, setLeague] = useState<OnlineLeague | null>(null);
  const [currentUser, setCurrentUser] = useState<OnlineUser | null>(null);
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

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {
      // no active subscription yet
    };

    repository
      .getCurrentUser()
      .then(async (user) => {
        if (!active) {
          return;
        }

        setCurrentUser(user);
        setLeague(await repository.getLeagueById(leagueId));

        if (!active) {
          return;
        }

        unsubscribe = repository.subscribeToLeague(
          leagueId,
          (nextLeague) => {
            if (active) {
              setLeague(nextLeague);
            }
          },
          () => {
            if (active) {
              setLeague(null);
            }
          },
        );
      })
      .catch(() => {
        if (active) {
          setCurrentUser(null);
          setLeague(null);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [leagueId, repository]);

  return <AppShell context={context}>{children}</AppShell>;
}
