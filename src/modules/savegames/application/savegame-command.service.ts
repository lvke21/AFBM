import { z } from "zod";

const createSaveGameSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(3).max(60),
  managerTeamAbbreviation: z.string().trim().min(2).max(5).optional(),
});

const SALARY_CAP = 255_000_000;
const INITIAL_SEASON_LENGTH_WEEKS = 14;
const FIRESTORE_OFFLINE_CREATE_DISABLED_MESSAGE =
  "Offline-Karrieren koennen in dieser Firestore-Staging-Umgebung aktuell nicht neu erstellt werden. Bestehende Firestore-Spielstaende bleiben erreichbar.";
const LEGACY_PRISMA_NOT_CONFIGURED_MESSAGE =
  "Offline-Karriere konnte nicht erstellt werden, weil der Legacy-Prisma-Speicher in dieser Umgebung nicht aktiv ist.";
const FIRESTORE_OFFLINE_DELETE_DISABLED_MESSAGE =
  "Firestore-Spielstaende werden in dieser Umgebung nicht ueber den Savegames-Screen geloescht. Die Daten bleiben unveraendert.";
const LEGACY_PRISMA_DELETE_NOT_CONFIGURED_MESSAGE =
  "Offline-Karriere konnte nicht geloescht werden, weil der Legacy-Prisma-Speicher in dieser Umgebung nicht aktiv ist.";

type CreateSaveGameInput = z.infer<typeof createSaveGameSchema>;

const deleteSaveGameSchema = z.object({
  userId: z.string().min(1),
  saveGameId: z.string().min(1),
});

type DeleteSaveGameInput = z.infer<typeof deleteSaveGameSchema>;

export class SaveGameCreationUnavailableError extends Error {
  constructor(message = FIRESTORE_OFFLINE_CREATE_DISABLED_MESSAGE) {
    super(message);
    this.name = "SaveGameCreationUnavailableError";
  }
}

export class SaveGameDeletionUnavailableError extends Error {
  constructor(message = FIRESTORE_OFFLINE_DELETE_DISABLED_MESSAGE) {
    super(message);
    this.name = "SaveGameDeletionUnavailableError";
  }
}

export class SaveGameNotFoundError extends Error {
  constructor(message = "Savegame wurde nicht gefunden oder gehoert nicht zu diesem Benutzer.") {
    super(message);
    this.name = "SaveGameNotFoundError";
  }
}

function buildSeasonStartDate(year: number) {
  return new Date(Date.UTC(year, 8, 1, 18, 0, 0));
}

export function getOfflineSaveGameCreateAvailability(
  env: Record<string, string | undefined> = process.env,
) {
  const backend = env.DATA_BACKEND?.trim();

  if (backend === "firestore") {
    return {
      enabled: false,
      reason: FIRESTORE_OFFLINE_CREATE_DISABLED_MESSAGE,
    };
  }

  if (backend && backend !== "prisma") {
    return {
      enabled: false,
      reason: `Offline-Karriere konnte nicht erstellt werden, weil DATA_BACKEND="${backend}" nicht unterstuetzt wird.`,
    };
  }

  if (!env.DATABASE_URL?.trim()) {
    return {
      enabled: false,
      reason: LEGACY_PRISMA_NOT_CONFIGURED_MESSAGE,
    };
  }

  return {
    enabled: true,
    reason: null,
  };
}

export function getOfflineSaveGameDeleteAvailability(
  env: Record<string, string | undefined> = process.env,
) {
  const backend = env.DATA_BACKEND?.trim();

  if (backend === "firestore") {
    return {
      enabled: false,
      reason: FIRESTORE_OFFLINE_DELETE_DISABLED_MESSAGE,
    };
  }

  if (backend && backend !== "prisma") {
    return {
      enabled: false,
      reason: `Offline-Karriere konnte nicht geloescht werden, weil DATA_BACKEND="${backend}" nicht unterstuetzt wird.`,
    };
  }

  if (!env.DATABASE_URL?.trim()) {
    return {
      enabled: false,
      reason: LEGACY_PRISMA_DELETE_NOT_CONFIGURED_MESSAGE,
    };
  }

  return {
    enabled: true,
    reason: null,
  };
}

function isPrismaDatabaseUrlError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("DATABASE_URL") ||
      error.message.includes("schema.prisma") ||
      error.message.includes("PrismaClientInitializationError"))
  );
}

export function isSaveGameCreationUnavailableError(
  error: unknown,
): error is SaveGameCreationUnavailableError {
  return error instanceof SaveGameCreationUnavailableError || isPrismaDatabaseUrlError(error);
}

export function isSaveGameDeletionUnavailableError(
  error: unknown,
): error is SaveGameDeletionUnavailableError {
  return error instanceof SaveGameDeletionUnavailableError || isPrismaDatabaseUrlError(error);
}

export function isSaveGameNotFoundError(error: unknown): error is SaveGameNotFoundError {
  return error instanceof SaveGameNotFoundError;
}

export function saveGameCreationErrorMessage(error: unknown) {
  if (error instanceof SaveGameCreationUnavailableError) {
    return error.message;
  }

  if (isPrismaDatabaseUrlError(error)) {
    return LEGACY_PRISMA_NOT_CONFIGURED_MESSAGE;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Die Aktion konnte nicht abgeschlossen werden.";
}

export function saveGameDeletionErrorMessage(error: unknown) {
  if (error instanceof SaveGameDeletionUnavailableError || error instanceof SaveGameNotFoundError) {
    return error.message;
  }

  if (isPrismaDatabaseUrlError(error)) {
    return LEGACY_PRISMA_DELETE_NOT_CONFIGURED_MESSAGE;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Die Aktion konnte nicht abgeschlossen werden.";
}

async function createPrismaSaveGame(parsed: CreateSaveGameInput) {
  const [{ prisma }, { requireDefaultLeagueDefinition }, { bootstrapSaveGameWorld }] =
    await Promise.all([
      import("@/lib/db/prisma"),
      import("@/modules/shared/infrastructure/reference-data"),
      import("./bootstrap/bootstrap-savegame-world.service"),
    ]);

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

export async function createSaveGame(input: unknown) {
  const parsed = createSaveGameSchema.parse(input);
  const availability = getOfflineSaveGameCreateAvailability();

  if (!availability.enabled) {
    throw new SaveGameCreationUnavailableError(availability.reason ?? undefined);
  }

  return createPrismaSaveGame(parsed);
}

async function archivePrismaSaveGame(parsed: DeleteSaveGameInput) {
  const { saveGameRepository } = await import(
    "@/modules/savegames/infrastructure/savegame.repository"
  );

  return saveGameRepository.archiveForUser(parsed.userId, parsed.saveGameId);
}

export async function deleteSaveGame(input: unknown) {
  const parsed = deleteSaveGameSchema.parse(input);
  const availability = getOfflineSaveGameDeleteAvailability();

  if (!availability.enabled) {
    throw new SaveGameDeletionUnavailableError(availability.reason ?? undefined);
  }

  const archived = await archivePrismaSaveGame(parsed);

  if (!archived) {
    throw new SaveGameNotFoundError();
  }

  return {
    id: parsed.saveGameId,
  };
}
