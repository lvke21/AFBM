import type { Prisma } from "@prisma/client";

import type { TeamFinanceEventType } from "@/modules/shared/domain/enums";

type RecordTeamFinanceEventInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  teamId: string;
  playerId?: string | null;
  seasonId?: string | null;
  type: TeamFinanceEventType;
  amount: number;
  capImpact?: number;
  description: string;
  occurredAt?: Date;
};

export async function recordTeamFinanceEvent({
  tx,
  saveGameId,
  teamId,
  playerId = null,
  seasonId = null,
  type,
  amount,
  capImpact = 0,
  description,
  occurredAt = new Date(),
}: RecordTeamFinanceEventInput) {
  const updatedTeam = await tx.team.update({
    where: {
      id: teamId,
    },
    data: {
      cashBalance: {
        increment: amount,
      },
    },
    select: {
      cashBalance: true,
    },
  });

  await tx.teamFinanceEvent.create({
    data: {
      saveGameId,
      teamId,
      playerId,
      seasonId,
      type,
      amount,
      capImpact,
      cashBalanceAfter: updatedTeam.cashBalance,
      description,
      occurredAt,
    },
  });

  return Number(updatedTeam.cashBalance);
}
