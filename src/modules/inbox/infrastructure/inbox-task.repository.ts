import type { InboxTaskPriority, InboxTaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const inboxTaskRepository = {
  async listForUser(userId: string, saveGameId: string) {
    const saveGame = await prisma.saveGame.findFirst({
      where: {
        id: saveGameId,
        userId,
      },
      select: {
        inboxTaskStates: {
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            completedAt: true,
            hiddenAt: true,
            priorityOverride: true,
            readAt: true,
            status: true,
            taskKey: true,
            updatedAt: true,
          },
        },
      },
    });

    return saveGame?.inboxTaskStates ?? [];
  },

  async saveForUser(input: {
    userId: string;
    saveGameId: string;
    taskKey: string;
    status?: InboxTaskStatus;
    priorityOverride?: InboxTaskPriority | null;
    readAt?: Date | null;
    completedAt?: Date | null;
    hiddenAt?: Date | null;
  }) {
    const saveGame = await prisma.saveGame.findFirst({
      where: {
        id: input.saveGameId,
        userId: input.userId,
      },
      select: {
        id: true,
      },
    });

    if (!saveGame) {
      throw new Error("Inbox savegame context not found");
    }

    return prisma.inboxTaskState.upsert({
      where: {
        saveGameId_taskKey: {
          saveGameId: input.saveGameId,
          taskKey: input.taskKey,
        },
      },
      create: {
        completedAt: input.completedAt,
        hiddenAt: input.hiddenAt,
        priorityOverride: input.priorityOverride,
        readAt: input.readAt,
        saveGameId: input.saveGameId,
        status: input.status ?? "OPEN",
        taskKey: input.taskKey,
      },
      update: {
        completedAt: input.completedAt,
        hiddenAt: input.hiddenAt,
        priorityOverride: input.priorityOverride,
        readAt: input.readAt,
        status: input.status,
      },
    });
  },
};
