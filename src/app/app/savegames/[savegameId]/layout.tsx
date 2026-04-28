import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getGameFlowHref,
  selectRelevantGameFlowMatch,
} from "@/components/match/game-flow-model";
import { requirePageUserId } from "@/lib/auth/session";
import { getSaveGameFlowSnapshot } from "@/modules/savegames/application/savegame-query.service";
import { getSeasonOverviewForUser } from "@/modules/seasons/application/season-query.service";

type SaveGameLayoutProps = {
  children: ReactNode;
  params: Promise<{
    savegameId: string;
  }>;
};

export default async function SaveGameLayout({ children, params }: SaveGameLayoutProps) {
  const { savegameId } = await params;
  const userId = await requirePageUserId();
  const flow = await getSaveGameFlowSnapshot(userId, savegameId);

  if (!flow) {
    notFound();
  }

  const managerTeam =
    flow.saveGame.teams.find((team) => team.managerControlled) ??
    flow.saveGame.teams[0] ??
    null;
  const currentSeason = flow.currentSeasonId
    ? await getSeasonOverviewForUser(userId, savegameId, flow.currentSeasonId)
    : null;
  const nextGameMatch = selectRelevantGameFlowMatch(currentSeason, managerTeam?.id);

  return (
    <AppShell
      context={{
        saveGame: {
          id: flow.saveGame.id,
          name: flow.saveGame.name,
          leagueName: flow.saveGame.leagueName,
        },
        currentSeason: flow.saveGame.currentSeason,
        managerTeam: managerTeam
          ? {
              id: managerTeam.id,
              name: managerTeam.name,
              abbreviation: managerTeam.abbreviation,
              currentRecord: managerTeam.currentRecord,
            }
          : null,
        nextGameHref: getGameFlowHref(flow.saveGame.id, nextGameMatch),
      }}
    >
      {children}
    </AppShell>
  );
}
