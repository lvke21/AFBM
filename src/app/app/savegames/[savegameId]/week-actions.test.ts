import { WeekState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  advanceWeekForUser: vi.fn(),
  finishGameForUser: vi.fn(),
  prepareWeekForUser: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  requirePageUserId: vi.fn(),
  revalidatePath: vi.fn(),
  startGameForUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/session", () => ({
  requirePageUserId: mocks.requirePageUserId,
}));

vi.mock("@/modules/savegames/application/week-flow.service", () => ({
  advanceWeekForUser: mocks.advanceWeekForUser,
  finishGameForUser: mocks.finishGameForUser,
  prepareWeekForUser: mocks.prepareWeekForUser,
  startGameForUser: mocks.startGameForUser,
}));

import {
  advanceWeekAction,
  finishGameAction,
  prepareWeekAction,
  startGameAction,
} from "./week-actions";

describe("prepareWeekAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.prepareWeekForUser.mockResolvedValue({
      currentSeasonId: "season-1",
      phase: "REGULAR_SEASON",
      saveGameId: "save-1",
      week: 1,
      weekState: WeekState.READY,
    });
  });

  it("prepares the week, revalidates dashboard routes and redirects with success feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");

    await expect(prepareWeekAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.prepareWeekForUser).toHaveBeenCalledWith({
      saveGameId: "save-1",
      userId: "user-1",
      weeklyPlan: {
        developmentFocusPlayerIds: [],
        intensity: "BALANCED",
        opponentFocus: "BALANCED",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/game/setup");
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=success");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Woche+bereit");
    expect(mocks.redirect.mock.calls[0][0]).toContain("READY");
  });
});

describe("startGameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.startGameForUser.mockResolvedValue({
      currentSeasonId: "season-1",
      matchId: "match-1",
      phase: "REGULAR_SEASON",
      saveGameId: "save-1",
      week: 1,
      weekState: WeekState.GAME_RUNNING,
    });
  });

  it("starts a READY game, revalidates game routes and redirects with success feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("matchId", "match-1");

    await expect(startGameAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.startGameForUser).toHaveBeenCalledWith({
      matchId: "match-1",
      saveGameId: "save-1",
      userId: "user-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/game/setup");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/game/live");
    expect(mocks.redirect.mock.calls[0][0]).toContain(
      "/app/savegames/save-1/game/live?matchId=match-1",
    );
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=success");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Game+gestartet");
    expect(mocks.redirect.mock.calls[0][0]).toContain("GAME_RUNNING");
  });

  it("redirects with error feedback when the game cannot be started", async () => {
    mocks.startGameForUser.mockRejectedValueOnce(new Error("startGame requires week state READY"));
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("matchId", "match-1");

    await expect(startGameAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.redirect.mock.calls[0][0]).toContain("/app/savegames/save-1");
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=error");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Game+nicht+gestartet");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Match+und+Week-State");
  });
});

describe("finishGameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.finishGameForUser.mockResolvedValue({
      currentSeasonId: "season-1",
      matchId: "match-1",
      phase: "REGULAR_SEASON",
      saveGameId: "save-1",
      week: 1,
      weekState: WeekState.POST_GAME,
    });
  });

  it("finishes a running game from the generated score and redirects with success feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("matchId", "match-1");
    formData.set("homeScore", "99");
    formData.set("awayScore", "0");

    await expect(finishGameAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.finishGameForUser).toHaveBeenCalledWith({
      matchId: "match-1",
      saveGameId: "save-1",
      userId: "user-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/game/live");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/game/report");
    expect(mocks.redirect.mock.calls[0][0]).toContain(
      "/app/savegames/save-1/game/report?matchId=match-1",
    );
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=success");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Game+abgeschlossen");
    expect(mocks.redirect.mock.calls[0][0]).toContain("POST_GAME");
  });

  it("redirects back to Game Center with error feedback when finishing is blocked", async () => {
    mocks.finishGameForUser.mockRejectedValueOnce(
      new Error("finishGame requires week state GAME_RUNNING"),
    );
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("matchId", "match-1");

    await expect(finishGameAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.redirect.mock.calls[0][0]).toContain(
      "/app/savegames/save-1/game/live?matchId=match-1",
    );
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=error");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Game+nicht+abgeschlossen");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Match+und+Week-State");
  });
});

describe("advanceWeekAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.advanceWeekForUser.mockResolvedValue({
      currentSeasonId: "season-1",
      phase: "REGULAR_SEASON",
      saveGameId: "save-1",
      week: 2,
      weekState: WeekState.PRE_WEEK,
    });
  });

  it("advances POST_GAME to the next PRE_WEEK and redirects with success feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");

    await expect(advanceWeekAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.advanceWeekForUser).toHaveBeenCalledWith({
      saveGameId: "save-1",
      userId: "user-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/inbox");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/game/setup");
    expect(mocks.redirect.mock.calls[0][0]).toContain("/app/savegames/save-1");
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=success");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Woche+fortgeschrieben");
    expect(mocks.redirect.mock.calls[0][0]).toContain("PRE_WEEK");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Woche+2");
  });

  it("redirects with error feedback when the week cannot advance", async () => {
    mocks.advanceWeekForUser.mockRejectedValueOnce(new Error("Current week still has open matches"));
    const formData = new FormData();
    formData.set("saveGameId", "save-1");

    await expect(advanceWeekAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.redirect.mock.calls[0][0]).toContain("/app/savegames/save-1");
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=error");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Woche+nicht+fortgeschrieben");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Current+week+still+has+open+matches");
  });
});
