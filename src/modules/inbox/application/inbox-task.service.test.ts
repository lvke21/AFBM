import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { inboxTaskRepository } from "../infrastructure/inbox-task.repository";
import {
  listInboxTaskStatesForUser,
  updateInboxTaskStateForUser,
} from "./inbox-task.service";

vi.mock("../infrastructure/inbox-task.repository", () => ({
  inboxTaskRepository: {
    listForUser: vi.fn(),
    saveForUser: vi.fn(),
  },
}));

const mockedInboxTaskRepository = vi.mocked(inboxTaskRepository);

describe("inbox task service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps persisted backend statuses to domain statuses", async () => {
    mockedInboxTaskRepository.listForUser.mockResolvedValue([
      {
        completedAt: null,
        hiddenAt: null,
        priorityOverride: null,
        readAt: null,
        status: "OPEN",
        taskKey: "open-task",
        updatedAt: new Date("2026-09-10T10:00:00Z"),
      },
      {
        completedAt: null,
        hiddenAt: null,
        priorityOverride: null,
        readAt: new Date("2026-09-10T10:30:00Z"),
        status: "READ",
        taskKey: "read-task",
        updatedAt: new Date("2026-09-10T10:30:00Z"),
      },
      {
        completedAt: new Date("2026-09-10T11:00:00Z"),
        hiddenAt: null,
        priorityOverride: "HIGH",
        readAt: new Date("2026-09-10T11:00:00Z"),
        status: "DONE",
        taskKey: "done-task",
        updatedAt: new Date("2026-09-10T11:00:00Z"),
      },
    ]);

    const states = await listInboxTaskStatesForUser("user-1", "save-1");

    expect(states.map((state) => state.status)).toEqual(["open", "read", "done"]);
    expect(states[2].priorityOverride).toBe("high");
  });

  it("persists open, read and done status transitions with matching timestamps", async () => {
    await updateInboxTaskStateForUser({
      operation: "read",
      saveGameId: "save-1",
      taskKey: "task-1",
      userId: "user-1",
    });
    await updateInboxTaskStateForUser({
      operation: "done",
      saveGameId: "save-1",
      taskKey: "task-1",
      userId: "user-1",
    });
    await updateInboxTaskStateForUser({
      operation: "open",
      saveGameId: "save-1",
      taskKey: "task-1",
      userId: "user-1",
    });

    expect(mockedInboxTaskRepository.saveForUser).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        completedAt: null,
        hiddenAt: null,
        readAt: new Date("2026-09-10T12:00:00Z"),
        status: "READ",
      }),
    );
    expect(mockedInboxTaskRepository.saveForUser).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        completedAt: new Date("2026-09-10T12:00:00Z"),
        hiddenAt: null,
        readAt: new Date("2026-09-10T12:00:00Z"),
        status: "DONE",
      }),
    );
    expect(mockedInboxTaskRepository.saveForUser).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        completedAt: null,
        hiddenAt: null,
        readAt: null,
        status: "OPEN",
      }),
    );
  });
});
