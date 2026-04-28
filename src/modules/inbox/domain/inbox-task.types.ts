export type PersistedInboxTaskStatus = "open" | "read" | "done" | "hidden";

export type PersistedInboxTaskPriority = "critical" | "high" | "medium" | "low";

export type PersistedInboxTaskState = {
  taskKey: string;
  status: PersistedInboxTaskStatus;
  priorityOverride: PersistedInboxTaskPriority | null;
  readAt: Date | null;
  completedAt: Date | null;
  hiddenAt: Date | null;
  updatedAt: Date;
};

export type InboxTaskOperation =
  | "read"
  | "done"
  | "hide"
  | "open"
  | "priority"
  | "reset-priority";
