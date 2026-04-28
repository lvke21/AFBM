import { beforeEach, describe, expect, it, vi } from "vitest";

import { readActionFeedback } from "@/lib/actions/action-feedback";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  requirePageUserId: vi.fn(),
  revalidatePath: vi.fn(),
  signFreeAgentForUser: vi.fn(),
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
  signFreeAgentForUser: mocks.signFreeAgentForUser,
}));

import { signFreeAgentAction } from "./actions";

function feedbackFromRedirect() {
  const href = String(mocks.redirect.mock.calls[0]?.[0] ?? "");
  const url = new URL(href, "http://localhost");
  const feedback = readActionFeedback(url.searchParams);

  expect(feedback).not.toBeNull();

  return feedback!;
}

describe("signFreeAgentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.signFreeAgentForUser.mockResolvedValue({
      capHit: 3_100_000,
      depthChartSlot: 2,
      playerName: "Alex Free",
      rosterStatus: "BACKUP",
      signingBonus: 600_000,
      valueLabel: "Great Value",
      valueReason: "Guter Value fuer aktuelle Rolle",
      valueScore: 88,
    });
  });

  it("redirects with structured positive value feedback for good signings", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("teamId", "team-1");
    formData.set("playerId", "player-1");
    formData.set("years", "2");
    formData.set("yearlySalary", "2500000");

    await expect(signFreeAgentAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.signFreeAgentForUser).toHaveBeenCalledWith({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-1",
      years: 2,
      yearlySalary: 2_500_000,
    });

    const feedback = feedbackFromRedirect();

    expect(feedback.tone).toBe("success");
    expect(feedback.effects).toContainEqual({ direction: "up", label: "Guter Value" });
    expect(feedback.valueFeedback).toEqual({
      impact: "positive",
      reason: "Der bestehende Value Score sieht Fit, Leistung und Kosten klar positiv.",
      context: "Guter Value fuer aktuelle Rolle Rolle BACKUP · Slot #2",
    });
    expect(feedback.impact).toContain("Cap Hit");
    expect(feedback.impact).not.toContain("undefined");
  });

  it("keeps rejected signings neutral without structured value feedback", async () => {
    mocks.signFreeAgentForUser.mockRejectedValue(new Error("Not enough salary cap space"));
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("teamId", "team-1");
    formData.set("playerId", "player-1");

    await expect(signFreeAgentAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    const feedback = feedbackFromRedirect();

    expect(feedback.tone).toBe("error");
    expect(feedback.valueFeedback).toBeNull();
    expect(feedback.impact).toBe("Kader, Cap Space und Cash bleiben unveraendert.");
  });
});
