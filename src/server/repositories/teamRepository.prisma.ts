import { teamRepository } from "@/modules/teams/infrastructure/team.repository";
import { teamManagementRepository } from "@/modules/teams/infrastructure/team-management.repository";

export const teamRepositoryPrisma = teamRepository;
export const teamManagementRepositoryPrisma = teamManagementRepository;
