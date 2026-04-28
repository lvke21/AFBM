import type { Prisma } from "@prisma/client";

type CreateInitialPlayerStatShellsInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  seasonId: string;
  teamId: string;
  playerId: string;
};

export async function createInitialPlayerStatShells({
  tx,
  saveGameId,
  seasonId,
  teamId,
  playerId,
}: CreateInitialPlayerStatShellsInput) {
  const [careerStat, seasonStat] = await Promise.all([
    ensureCareerStatShell({
      tx,
      saveGameId,
      playerId,
    }),
    ensureSeasonStatShell({
      tx,
      saveGameId,
      seasonId,
      teamId,
      playerId,
    }),
  ]);
  void careerStat;
  void seasonStat;
}

type CreateSeasonStatShellsInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  seasonId: string;
  teamId: string;
  playerId: string;
  seasonStatId?: string;
};

export async function createSeasonStatShells({
  tx,
  saveGameId,
  seasonId,
  teamId,
  playerId,
  seasonStatId,
}: CreateSeasonStatShellsInput) {
  const seasonStat =
    seasonStatId != null
      ? { id: seasonStatId }
      : await tx.playerSeasonStat.create({
          data: {
            saveGameId,
            seasonId,
            playerId,
            teamId,
          },
        });

  await Promise.all([
    tx.playerSeasonPassingStat.create({
      data: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonRushingStat.create({
      data: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonReceivingStat.create({
      data: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonBlockingStat.create({
      data: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonDefensiveStat.create({
      data: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonKickingStat.create({
      data: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonPuntingStat.create({
      data: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonReturnStat.create({
      data: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
  ]);
}

type EnsureCareerStatShellInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  playerId: string;
};

export async function ensureCareerStatShell({
  tx,
  saveGameId,
  playerId,
}: EnsureCareerStatShellInput) {
  const careerStat = await tx.playerCareerStat.upsert({
    where: {
      playerId_saveGameId: {
        playerId,
        saveGameId,
      },
    },
    update: {},
    create: {
      saveGameId,
      playerId,
    },
  });

  await Promise.all([
    tx.playerCareerPassingStat.upsert({
      where: {
        playerCareerStatId: careerStat.id,
      },
      update: {},
      create: {
        playerCareerStatId: careerStat.id,
      },
    }),
    tx.playerCareerRushingStat.upsert({
      where: {
        playerCareerStatId: careerStat.id,
      },
      update: {},
      create: {
        playerCareerStatId: careerStat.id,
      },
    }),
    tx.playerCareerReceivingStat.upsert({
      where: {
        playerCareerStatId: careerStat.id,
      },
      update: {},
      create: {
        playerCareerStatId: careerStat.id,
      },
    }),
    tx.playerCareerBlockingStat.upsert({
      where: {
        playerCareerStatId: careerStat.id,
      },
      update: {},
      create: {
        playerCareerStatId: careerStat.id,
      },
    }),
    tx.playerCareerDefensiveStat.upsert({
      where: {
        playerCareerStatId: careerStat.id,
      },
      update: {},
      create: {
        playerCareerStatId: careerStat.id,
      },
    }),
    tx.playerCareerKickingStat.upsert({
      where: {
        playerCareerStatId: careerStat.id,
      },
      update: {},
      create: {
        playerCareerStatId: careerStat.id,
      },
    }),
    tx.playerCareerPuntingStat.upsert({
      where: {
        playerCareerStatId: careerStat.id,
      },
      update: {},
      create: {
        playerCareerStatId: careerStat.id,
      },
    }),
    tx.playerCareerReturnStat.upsert({
      where: {
        playerCareerStatId: careerStat.id,
      },
      update: {},
      create: {
        playerCareerStatId: careerStat.id,
      },
    }),
  ]);

  return careerStat;
}

type EnsureSeasonStatShellInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  seasonId: string;
  teamId: string;
  playerId: string;
};

export async function ensureSeasonStatShell({
  tx,
  saveGameId,
  seasonId,
  teamId,
  playerId,
}: EnsureSeasonStatShellInput) {
  const seasonStat = await tx.playerSeasonStat.upsert({
    where: {
      seasonId_playerId_teamId: {
        seasonId,
        playerId,
        teamId,
      },
    },
    update: {},
    create: {
      saveGameId,
      seasonId,
      playerId,
      teamId,
    },
  });

  await Promise.all([
    tx.playerSeasonPassingStat.upsert({
      where: {
        playerSeasonStatId: seasonStat.id,
      },
      update: {},
      create: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonRushingStat.upsert({
      where: {
        playerSeasonStatId: seasonStat.id,
      },
      update: {},
      create: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonReceivingStat.upsert({
      where: {
        playerSeasonStatId: seasonStat.id,
      },
      update: {},
      create: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonBlockingStat.upsert({
      where: {
        playerSeasonStatId: seasonStat.id,
      },
      update: {},
      create: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonDefensiveStat.upsert({
      where: {
        playerSeasonStatId: seasonStat.id,
      },
      update: {},
      create: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonKickingStat.upsert({
      where: {
        playerSeasonStatId: seasonStat.id,
      },
      update: {},
      create: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonPuntingStat.upsert({
      where: {
        playerSeasonStatId: seasonStat.id,
      },
      update: {},
      create: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
    tx.playerSeasonReturnStat.upsert({
      where: {
        playerSeasonStatId: seasonStat.id,
      },
      update: {},
      create: {
        playerSeasonStatId: seasonStat.id,
      },
    }),
  ]);

  return seasonStat;
}
