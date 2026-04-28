import { beforeEach, describe, expect, it, vi } from "vitest";

import { readActionFeedback } from "@/lib/actions/action-feedback";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  requirePageUserId: vi.fn(),
  revalidatePath: vi.fn(),
  updateRosterAssignmentForUser: vi.fn(),
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

vi.mock("@/modules/teams/application/team-management.service", () => ({
  updateRosterAssignmentForUser: mocks.updateRosterAssignmentForUser,
}));

import { setDevelopmentFocusAction } from "./actions";

function feedbackFromRedirect() {
  const href = String(mocks.redirect.mock.calls[0]?.[0] ?? "");
  const url = new URL(href, "http://localhost");
  const feedback = readActionFeedback(url.searchParams);

  expect(feedback).not.toBeNull();

  return feedback!;
}

describe("setDevelopmentFocusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.updateRosterAssignmentForUser.mockResolvedValue({
      captainFlag: false,
      depthChartSlot: 2,
      developmentFocus: true,
      playerName: "Casey Prospect",
      positionCode: "WR",
      rosterStatus: "BACKUP",
      specialRole: null,
    });
  });

  it("sets development focus and redirects with visible feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("teamId", "team-1");
    formData.set("playerId", "player-1");
    formData.set("depthChartSlot", "2");
    formData.set("rosterStatus", "BACKUP");
    formData.set("developmentFocus", "on");

    await expect(setDevelopmentFocusAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.updateRosterAssignmentForUser).toHaveBeenCalledWith({
      captainFlag: false,
      depthChartSlot: 2,
      developmentFocus: true,
      playerId: "player-1",
      rosterStatus: "BACKUP",
      saveGameId: "save-1",
      specialRole: null,
      teamId: "team-1",
      userId: "user-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/development");

    const feedback = feedbackFromRedirect();

    expect(feedback.tone).toBe("success");
    expect(feedback.effects).toEqual([
      { direction: "up", label: "Entwicklung fokussiert" },
    ]);
    expect(feedback.valueFeedback).toEqual({
      context: "Training Focus",
      impact: "positive",
      reason:
        "Guter Value fuer Entwicklung: Der Spieler bekommt klare Trainingsprioritaet.",
    });
  });

  it("removes development focus without undefined feedback values", async () => {
    mocks.updateRosterAssignmentForUser.mockResolvedValue({
      captainFlag: true,
      depthChartSlot: null,
      developmentFocus: false,
      playerName: "Riley Returner",
      positionCode: "WR",
      rosterStatus: "ROTATION",
      specialRole: "KR",
    });
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("teamId", "team-1");
    formData.set("playerId", "player-2");
    formData.set("rosterStatus", "ROTATION");
    formData.set("captainFlag", "on");
    formData.set("specialRole", "KR");

    await expect(setDevelopmentFocusAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.updateRosterAssignmentForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        captainFlag: true,
        depthChartSlot: null,
        developmentFocus: false,
        specialRole: "KR",
      }),
    );

    const feedback = feedbackFromRedirect();

    expect(feedback.effects).toEqual([{ direction: "neutral", label: "Fokus entfernt" }]);
    expect(feedback.impact).toBe("WR · ROTATION · ohne aktiven Slot");
    expect(feedback.valueFeedback?.impact).toBe("neutral");
    expect(feedback.impact).not.toContain("undefined");
  });
});
