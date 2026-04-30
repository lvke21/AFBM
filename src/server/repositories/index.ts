import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import { logDataBackendConfiguration } from "./firestoreOperationalLogger";
import { matchRepositoryFirestore } from "./matchRepository.firestore";
import { matchRepositoryPrisma } from "./matchRepository.prisma";
import { playerRepositoryFirestore } from "./playerRepository.firestore";
import { playerRepositoryPrisma } from "./playerRepository.prisma";
import { saveGameRepositoryFirestore } from "./saveGameRepository.firestore";
import { saveGameRepositoryPrisma } from "./saveGameRepository.prisma";
import {
  matchPreparationRepositoryPrisma,
  seasonRepositoryPrisma,
  seasonSimulationCommandRepositoryPrisma,
  seasonSimulationRepositoryPrisma,
} from "./seasonRepository.prisma";
import { seasonRepositoryFirestore } from "./seasonRepository.firestore";
import { statsRepositoryFirestore } from "./statsRepository.firestore";
import { statsRepositoryPrisma } from "./statsRepository.prisma";
import { teamRepositoryFirestore } from "./teamRepository.firestore";
import {
  teamManagementRepositoryPrisma,
  teamRepositoryPrisma,
} from "./teamRepository.prisma";
import type { AppRepositories, DataBackend } from "./types";
import { weekRepositoryFirestore } from "./weekRepository.firestore";
import { weekRepositoryPrisma } from "./weekRepository.prisma";

function resolveDataBackend(): DataBackend {
  const configuredBackend = process.env.DATA_BACKEND?.trim();

  if (configuredBackend === "prisma") {
    return "prisma";
  }

  if (configuredBackend === "firestore") {
    try {
      assertFirestoreEmulatorOnly();
    } catch (error) {
      logDataBackendConfiguration({
        backend: configuredBackend,
        reason: error instanceof Error ? error.message : "firestore-backend-guard-failed",
      });
      throw error;
    }
    return "firestore";
  }

  if (!configuredBackend) {
    try {
      assertFirestoreEmulatorOnly();
      return "firestore";
    } catch (error) {
      logDataBackendConfiguration({
        backend: "prisma",
        reason:
          error instanceof Error
            ? `firestore-primary-unavailable-fallback-to-prisma: ${error.message}`
            : "firestore-primary-unavailable-fallback-to-prisma",
      });
      return "prisma";
    }
  }

  logDataBackendConfiguration({
    backend: configuredBackend,
    reason: "unsupported-data-backend",
  });
  throw new Error(
    `Unsupported DATA_BACKEND "${configuredBackend}". Use "prisma" or "firestore".`,
  );
}

const repositories: AppRepositories = {
  backend: "prisma",
  saveGames: saveGameRepositoryPrisma,
  teams: teamRepositoryPrisma,
  teamManagement: teamManagementRepositoryPrisma,
  players: playerRepositoryPrisma,
  seasons: seasonRepositoryPrisma,
  weeks: weekRepositoryPrisma,
  seasonSimulation: seasonSimulationRepositoryPrisma,
  seasonSimulationCommands: seasonSimulationCommandRepositoryPrisma,
  matchPreparation: matchPreparationRepositoryPrisma,
  matches: matchRepositoryPrisma,
  stats: statsRepositoryPrisma,
};

export function getRepositories(): AppRepositories {
  const backend = resolveDataBackend();

  return {
    ...repositories,
    backend,
    saveGames: backend === "firestore" ? saveGameRepositoryFirestore : repositories.saveGames,
    teams: backend === "firestore" ? teamRepositoryFirestore : repositories.teams,
    players: backend === "firestore" ? playerRepositoryFirestore : repositories.players,
    seasons: backend === "firestore" ? seasonRepositoryFirestore : repositories.seasons,
    weeks: backend === "firestore" ? weekRepositoryFirestore : repositories.weeks,
    matches: backend === "firestore" ? matchRepositoryFirestore : repositories.matches,
    stats: backend === "firestore" ? statsRepositoryFirestore : repositories.stats,
  };
}

export function getActiveDataBackend(): DataBackend {
  return resolveDataBackend();
}

export type { AppRepositories, DataBackend } from "./types";
