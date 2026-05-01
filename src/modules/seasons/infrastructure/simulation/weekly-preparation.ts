import { createPlayerHistoryEvent } from "@/modules/players/application/player-history.service";
import { PlayerHistoryEventType } from "@/modules/shared/domain/enums";
import { buildWeeklyRecoveryUpdate } from "@/modules/seasons/application/simulation/player-condition";

import { seasonSimulationCommandRepository } from "./season-simulation.command-repository";

type WeeklyPreparationInput = {
  saveGameId: string;
  seasonId: string;
  week: number;
  recoveryCutoff: Date;
};

export async function runWeeklyPreparation({
  saveGameId,
  seasonId,
  week,
  recoveryCutoff,
}: WeeklyPreparationInput) {
  const recoveredPlayers = await seasonSimulationCommandRepository.listRecoveredPlayers(
    saveGameId,
    recoveryCutoff,
  );

  if (recoveredPlayers.length > 0) {
    await seasonSimulationCommandRepository.runInTransaction(async (tx) => {
      await seasonSimulationCommandRepository.clearRecoveredPlayers(
        tx,
        saveGameId,
        recoveryCutoff,
      );

      for (const player of recoveredPlayers) {
        await createPlayerHistoryEvent({
          tx,
          saveGameId,
          playerId: player.id,
          seasonId,
          teamId: player.rosterProfile?.teamId ?? null,
          type: PlayerHistoryEventType.RECOVERY,
          week,
          occurredAt: recoveryCutoff,
          title: "Medizinisch freigegeben",
          description: `${player.firstName} ${player.lastName} ist wieder voll einsatzfaehig.`,
        });
      }
    });
  }

  const playersForRecovery =
    await seasonSimulationCommandRepository.listPlayersForWeeklyRecovery(saveGameId);

  if (playersForRecovery.length > 0) {
    await seasonSimulationCommandRepository.runInTransaction(async (tx) => {
      for (const player of playersForRecovery) {
        await seasonSimulationCommandRepository.updatePlayer(
          tx,
          player.id,
          buildWeeklyRecoveryUpdate(player),
        );
      }
    });
  }
}
