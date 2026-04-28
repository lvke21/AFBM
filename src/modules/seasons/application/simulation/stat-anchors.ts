import {
  ensureCareerStatShell,
  ensureSeasonStatShell,
} from "@/modules/savegames/application/bootstrap/player-stat-shells";

import { seasonSimulationCommandRepository } from "../../infrastructure/simulation/season-simulation.command-repository";
import { seasonSimulationRepository } from "../../infrastructure/simulation/season-simulation.repository";

type WeekSimulationMatch = Awaited<
  ReturnType<typeof seasonSimulationRepository.listWeekMatchesForSimulation>
>[number];

type MissingSimulationAnchor = {
  playerId: string;
  teamId: string;
  needsCareerStat: boolean;
  needsSeasonStat: boolean;
};

export function collectMissingSimulationAnchors(
  matches: WeekSimulationMatch[],
): MissingSimulationAnchor[] {
  const missingByPlayerTeam = new Map<string, MissingSimulationAnchor>();

  for (const match of matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      for (const rosterProfile of team.rosterProfiles) {
        const matchingSeasonStat =
          rosterProfile.player.playerSeasonStats.find(
            (seasonStat) => seasonStat.teamId === team.id,
          ) ?? null;
        const key = `${rosterProfile.player.id}:${team.id}`;
        const existing = missingByPlayerTeam.get(key);

        missingByPlayerTeam.set(key, {
          playerId: rosterProfile.player.id,
          teamId: team.id,
          needsCareerStat:
            (existing?.needsCareerStat ?? false) || rosterProfile.player.careerStat == null,
          needsSeasonStat:
            (existing?.needsSeasonStat ?? false) || matchingSeasonStat == null,
        });
      }
    }
  }

  return [...missingByPlayerTeam.values()].filter(
    (entry) => entry.needsCareerStat || entry.needsSeasonStat,
  );
}

export async function ensureSimulationStatAnchors(input: {
  saveGameId: string;
  seasonId: string;
  matches: WeekSimulationMatch[];
}) {
  const missingAnchors = collectMissingSimulationAnchors(input.matches);

  if (missingAnchors.length === 0) {
    return {
      repairedPlayers: 0,
    };
  }

  await seasonSimulationCommandRepository.runInTransaction(async (tx) => {
    for (const anchor of missingAnchors) {
      if (anchor.needsCareerStat) {
        await ensureCareerStatShell({
          tx,
          saveGameId: input.saveGameId,
          playerId: anchor.playerId,
        });
      }

      if (anchor.needsSeasonStat) {
        await ensureSeasonStatShell({
          tx,
          saveGameId: input.saveGameId,
          seasonId: input.seasonId,
          teamId: anchor.teamId,
          playerId: anchor.playerId,
        });
      }
    }
  });

  return {
    repairedPlayers: missingAnchors.length,
  };
}
