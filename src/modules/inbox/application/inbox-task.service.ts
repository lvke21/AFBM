import type { InboxTaskPriority, InboxTaskStatus } from "@/modules/shared/domain/enums";
import type {
  InboxTaskOperation,
  PersistedInboxTaskPriority,
  PersistedInboxTaskState,
  PersistedInboxTaskStatus,
} from "../domain/inbox-task.types";
import { inboxTaskRepository } from "../infrastructure/inbox-task.repository";

const STATUS_TO_DOMAIN: Record<InboxTaskStatus, PersistedInboxTaskStatus> = {
  DONE: "done",
  HIDDEN: "hidden",
  OPEN: "open",
  READ: "read",
};

const PRIORITY_TO_DOMAIN: Record<InboxTaskPriority, PersistedInboxTaskPriority> = {
  CRITICAL: "critical",
  HIGH: "high",
  LOW: "low",
  MEDIUM: "medium",
};

const PRIORITY_TO_PRISMA: Record<PersistedInboxTaskPriority, InboxTaskPriority> = {
  critical: "CRITICAL",
  high: "HIGH",
  low: "LOW",
  medium: "MEDIUM",
};

function toDomainPriority(priority: InboxTaskPriority | null): PersistedInboxTaskPriority | null {
  return priority ? PRIORITY_TO_DOMAIN[priority] : null;
}

function normalizePriority(value: string | null | undefined): PersistedInboxTaskPriority | null {
  if (value === "critical" || value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return null;
}

export async function listInboxTaskStatesForUser(
  userId: string,
  saveGameId: string,
): Promise<PersistedInboxTaskState[]> {
  const rows = await inboxTaskRepository.listForUser(userId, saveGameId);

  return rows.map((row) => ({
    completedAt: row.completedAt,
    hiddenAt: row.hiddenAt,
    priorityOverride: toDomainPriority(row.priorityOverride),
    readAt: row.readAt,
    status: STATUS_TO_DOMAIN[row.status],
    taskKey: row.taskKey,
    updatedAt: row.updatedAt,
  }));
}

export async function updateInboxTaskStateForUser(input: {
  userId: string;
  saveGameId: string;
  taskKey: string;
  operation: InboxTaskOperation;
  priority?: string | null;
}) {
  const now = new Date();
  const priority = normalizePriority(input.priority);
  const baseInput = {
    saveGameId: input.saveGameId,
    taskKey: input.taskKey,
    userId: input.userId,
  };

  if (input.operation === "read") {
    await inboxTaskRepository.saveForUser({
      ...baseInput,
      completedAt: null,
      hiddenAt: null,
      readAt: now,
      status: "READ",
    });
    return;
  }

  if (input.operation === "done") {
    await inboxTaskRepository.saveForUser({
      ...baseInput,
      completedAt: now,
      hiddenAt: null,
      readAt: now,
      status: "DONE",
    });
    return;
  }

  if (input.operation === "hide") {
    await inboxTaskRepository.saveForUser({
      ...baseInput,
      completedAt: null,
      hiddenAt: now,
      readAt: now,
      status: "HIDDEN",
    });
    return;
  }

  if (input.operation === "open") {
    await inboxTaskRepository.saveForUser({
      ...baseInput,
      completedAt: null,
      hiddenAt: null,
      readAt: null,
      status: "OPEN",
    });
    return;
  }

  if (input.operation === "priority") {
    if (!priority) {
      throw new Error("Invalid inbox priority");
    }

    await inboxTaskRepository.saveForUser({
      ...baseInput,
      priorityOverride: PRIORITY_TO_PRISMA[priority],
    });
    return;
  }

  if (input.operation === "reset-priority") {
    await inboxTaskRepository.saveForUser({
      ...baseInput,
      priorityOverride: null,
    });
  }
}
