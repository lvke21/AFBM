import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import {
  requireDefaultLeagueDefinition,
} from "@/modules/shared/infrastructure/reference-data";

import { bootstrapSaveGameWorld } from "./bootstrap/bootstrap-savegame-world.service";

const createSaveGameSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(3).max(60),
  managerTeamAbbreviation: z.string().trim().min(2).max(5).optional(),
});

const SALARY_CAP = 255_000_000;
const INITIAL_SEASON_LENGTH_WEEKS = 14;

function buildSeasonStartDate(year: number) {
  return new Date(Date.UTC(year, 8, 1, 18, 0, 0));
}

export async function createSaveGame(input: unknown) {
  const parsed = createSaveGameSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const league = await requireDefaultLeagueDefinition(tx);
    const seasonYear = new Date().getUTCFullYear();

    const saveGame = await tx.saveGame.create({
      data: {
        userId: parsed.userId,
        name: parsed.name,
        leagueDefinitionId: league.id,
      },
    });

    await tx.saveGameSetting.create({
      data: {
        saveGameId: saveGame.id,
        salaryCap: SALARY_CAP,
        activeRosterLimit: 53,
        practiceSquadSize: 12,
        seasonLengthWeeks: INITIAL_SEASON_LENGTH_WEEKS,
      },
    });

    const season = await tx.season.create({
      data: {
        saveGameId: saveGame.id,
        year: seasonYear,
        phase: "REGULAR_SEASON",
        week: 1,
        startsAt: buildSeasonStartDate(seasonYear),
      },
    });

    await tx.saveGame.update({
      where: { id: saveGame.id },
      data: {
        currentSeasonId: season.id,
      },
    });

    await bootstrapSaveGameWorld({
      tx,
      saveGameId: saveGame.id,
      season,
      leagueDefinitionId: league.id,
      managerTeamAbbreviation: parsed.managerTeamAbbreviation,
    });

    return {
      id: saveGame.id,
      currentSeasonId: season.id,
    };
  });
}
