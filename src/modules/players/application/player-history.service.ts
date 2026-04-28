import type { Prisma } from "@prisma/client";

import type { PlayerHistoryEventType } from "@/modules/shared/domain/enums";

type CreatePlayerHistoryEventInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  playerId: string;
  seasonId?: string | null;
  teamId?: string | null;
  type: PlayerHistoryEventType;
  week?: number | null;
  title: string;
  description?: string | null;
  occurredAt?: Date;
};

export async function createPlayerHistoryEvent({
  tx,
  saveGameId,
  playerId,
  seasonId,
  teamId,
  type,
  week,
  title,
  description,
  occurredAt,
}: CreatePlayerHistoryEventInput) {
  return tx.playerHistoryEvent.create({
    data: {
      saveGameId,
      playerId,
      seasonId: seasonId ?? undefined,
      teamId: teamId ?? undefined,
      type,
      week: week ?? undefined,
      title,
      description: description ?? undefined,
      occurredAt,
    },
  });
}
