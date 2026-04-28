import { seasonRepository } from "@/modules/seasons/infrastructure/season.repository";
import { matchPreparationRepository } from "@/modules/seasons/infrastructure/match-preparation.repository";
import { seasonSimulationCommandRepository } from "@/modules/seasons/infrastructure/simulation/season-simulation.command-repository";
import { seasonSimulationRepository } from "@/modules/seasons/infrastructure/simulation/season-simulation.repository";

export const seasonRepositoryPrisma = seasonRepository;
export const matchPreparationRepositoryPrisma = matchPreparationRepository;
export const seasonSimulationRepositoryPrisma = seasonSimulationRepository;
export const seasonSimulationCommandRepositoryPrisma = seasonSimulationCommandRepository;
