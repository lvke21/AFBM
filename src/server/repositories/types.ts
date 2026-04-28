import type { matchRepositoryFirestore } from "./matchRepository.firestore";
import type { matchRepositoryPrisma } from "./matchRepository.prisma";
import type { playerRepositoryFirestore } from "./playerRepository.firestore";
import type { playerRepositoryPrisma } from "./playerRepository.prisma";
import type { saveGameRepositoryFirestore } from "./saveGameRepository.firestore";
import type { saveGameRepositoryPrisma } from "./saveGameRepository.prisma";
import type { seasonRepositoryFirestore } from "./seasonRepository.firestore";
import type { statsRepositoryFirestore } from "./statsRepository.firestore";
import type { matchPreparationRepositoryPrisma, seasonRepositoryPrisma, seasonSimulationCommandRepositoryPrisma, seasonSimulationRepositoryPrisma } from "./seasonRepository.prisma";
import type { statsRepositoryPrisma } from "./statsRepository.prisma";
import type { teamRepositoryFirestore } from "./teamRepository.firestore";
import type { teamManagementRepositoryPrisma, teamRepositoryPrisma } from "./teamRepository.prisma";
import type { weekRepositoryFirestore } from "./weekRepository.firestore";
import type { weekRepositoryPrisma } from "./weekRepository.prisma";

export type DataBackend = "prisma" | "firestore";

export type SaveGameRepository = typeof saveGameRepositoryPrisma | typeof saveGameRepositoryFirestore;
export type TeamRepository = typeof teamRepositoryPrisma | typeof teamRepositoryFirestore;
export type TeamManagementRepository = typeof teamManagementRepositoryPrisma;
export type PlayerRepository = typeof playerRepositoryPrisma | typeof playerRepositoryFirestore;
export type SeasonRepository = typeof seasonRepositoryPrisma | typeof seasonRepositoryFirestore;
export type WeekRepository = typeof weekRepositoryPrisma | typeof weekRepositoryFirestore;
export type SeasonSimulationRepository = typeof seasonSimulationRepositoryPrisma;
export type SeasonSimulationCommandRepository =
  typeof seasonSimulationCommandRepositoryPrisma;
export type MatchPreparationRepository = typeof matchPreparationRepositoryPrisma;
export type MatchRepository = typeof matchRepositoryPrisma | typeof matchRepositoryFirestore;
export type StatsRepository = typeof statsRepositoryPrisma | typeof statsRepositoryFirestore;

export type AppRepositories = {
  backend: DataBackend;
  saveGames: SaveGameRepository;
  teams: TeamRepository;
  teamManagement: TeamManagementRepository;
  players: PlayerRepository;
  seasons: SeasonRepository;
  weeks: WeekRepository;
  seasonSimulation: SeasonSimulationRepository;
  seasonSimulationCommands: SeasonSimulationCommandRepository;
  matchPreparation: MatchPreparationRepository;
  matches: MatchRepository;
  stats: StatsRepository;
};
