import { beforeEach, describe, expect, it, vi } from "vitest";

import { readActionFeedback } from "@/lib/actions/action-feedback";

const mocks = vi.hoisted(() => ({
  executeTradeOfferForUser: vi.fn(),
  extendPlayerContractForUser: vi.fn(),
  moveDepthChartPlayerForUser: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  releasePlayerForUser: vi.fn(),
  requirePageUserId: vi.fn(),
  revalidatePath: vi.fn(),
  updateRosterAssignmentForUser: vi.fn(),
  updateTeamSchemesForUser: vi.fn(),
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
  executeTradeOfferForUser: mocks.executeTradeOfferForUser,
  extendPlayerContractForUser: mocks.extendPlayerContractForUser,
  moveDepthChartPlayerForUser: mocks.moveDepthChartPlayerForUser,
  releasePlayerForUser: mocks.releasePlayerForUser,
  updateRosterAssignmentForUser: mocks.updateRosterAssignmentForUser,
  updateTeamSchemesForUser: mocks.updateTeamSchemesForUser,
}));

import {
  executeTradeOfferAction,
  moveDepthChartPlayerAction,
  updateRosterAssignmentAction,
} from "./actions";

function feedbackFromRedirect() {
  const href = String(mocks.redirect.mock.calls[0]?.[0] ?? "");
  const url = new URL(href, "http://localhost");
  const feedback = readActionFeedback(url.searchParams);

  expect(feedback).not.toBeNull();

  return feedback!;
}

describe("executeTradeOfferAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.executeTradeOfferForUser.mockResolvedValue({
      managerPlayerName: "Casey Starter",
      targetPlayerName: "Riley Upgrade",
      review: {
        managerValueScore: 84,
        partnerValueScore: 72,
        reasons: ["Schlechter Fit fuer Team Need wurde verbessert."],
        status: "Accepted",
      },
    });
  });

  it("redirects with structured positive value feedback for accepted trades", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("teamId", "team-1");
    formData.set("kind", "player-player");
    formData.set("managerPlayerId", "player-out");
    formData.set("targetPlayerId", "player-in");
    formData.set("partnerTeamId", "team-2");

    await expect(executeTradeOfferAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.executeTradeOfferForUser).toHaveBeenCalledWith({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      kind: "player-player",
      managerPlayerId: "player-out",
      targetPlayerId: "player-in",
      partnerTeamId: "team-2",
    });

    const feedback = feedbackFromRedirect();

    expect(feedback.tone).toBe("success");
    expect(feedback.effects).toContainEqual({ direction: "up", label: "Guter Value" });
    expect(feedback.effects).toContainEqual({ direction: "up", label: "Value verbessert" });
    expect(feedback.valueFeedback).toEqual({
      impact: "positive",
      reason: "Der erhaltene Value liegt klar ueber dem abgegebenen Value.",
      context: "Schlechter Fit fuer Team Need wurde verbessert.",
    });
    expect(feedback.impact).not.toContain("undefined");
  });

  it("redirects rejected trades with stable fallback feedback", async () => {
    mocks.executeTradeOfferForUser.mockRejectedValue(new Error("Trade nicht akzeptiert"));
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("teamId", "team-1");

    await expect(executeTradeOfferAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    const feedback = feedbackFromRedirect();

    expect(feedback.tone).toBe("error");
    expect(feedback.valueFeedback).toBeNull();
    expect(feedback.effects).toEqual([{ direction: "neutral", label: "Keine Aenderung" }]);
    expect(feedback.impact).toBe("Roster, Contracts, Cap und Depth Chart bleiben unveraendert.");
  });
});

describe("updateRosterAssignmentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.updateRosterAssignmentForUser.mockResolvedValue({
      captainFlag: false,
      depthChartSlot: 1,
      developmentFocus: false,
      playerName: "Casey Starter",
      playerOverall: 82,
      positionCode: "WR",
      previousDepthChartSlot: 2,
      rosterStatus: "STARTER",
      specialRole: null,
      starterOverallAfter: 82,
      starterOverallBefore: 74,
    });
  });

  it("redirects roster changes with structured role value feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("teamId", "team-1");
    formData.set("playerId", "player-1");
    formData.set("depthChartSlot", "1");
    formData.set("rosterStatus", "STARTER");

    await expect(updateRosterAssignmentAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    const feedback = feedbackFromRedirect();

    expect(feedback.tone).toBe("success");
    expect(feedback.effects).toContainEqual({ direction: "up", label: "Starter verbessert" });
    expect(feedback.effects).toContainEqual({ direction: "up", label: "Positions-OVR +8" });
    expect(feedback.valueFeedback).toEqual({
      impact: "positive",
      reason: "Guter Value fuer aktuelle Rolle: Der Spieler ist als Starter klar eingeordnet.",
      context: "Roster-Change",
    });
    expect(feedback.impact).toContain("Positionsstaerke 74 -> 82 (+8)");
    expect(feedback.impact).not.toContain("undefined");
  });
});

describe("moveDepthChartPlayerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.moveDepthChartPlayerForUser.mockResolvedValue({
      currentSlot: 2,
      depthChartSlot: 1,
      playerName: "Casey Starter",
      playerOverall: 82,
      positionCode: "WR",
      rosterStatus: "BACKUP",
      starterOverallAfter: 82,
      starterOverallBefore: 74,
      swappedWithPlayerName: "Riley Target",
      swappedWithPlayerOverall: 74,
    });
  });

  it("redirects slot moves with visible decision feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("teamId", "team-1");
    formData.set("playerId", "player-1");
    formData.set("currentSlot", "2");
    formData.set("targetSlot", "1");
    formData.set("targetPlayerId", "player-2");

    await expect(moveDepthChartPlayerAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.moveDepthChartPlayerForUser).toHaveBeenCalledWith({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-1",
      currentSlot: 2,
      targetSlot: 1,
      targetPlayerId: "player-2",
    });

    const feedback = feedbackFromRedirect();

    expect(feedback.tone).toBe("success");
    expect(feedback.effects).toEqual([
      { direction: "up", label: "Prioritaet erhoeht" },
      { direction: "up", label: "Positions-OVR +8" },
    ]);
    expect(feedback.impact).toBe(
      "WR · Slot #2 -> #1 · Tausch mit Riley Target (74 OVR) · Positionsstaerke 74 -> 82 (+8) · Bewertung: Passing leicht verbessert.",
    );
    expect(feedback.valueFeedback).toEqual({
      impact: "positive",
      reason:
        "Passing leicht verbessert: Der neue Slot-1-Wert liegt ueber der vorherigen Positionsstaerke.",
      context: "WR Depth Chart",
    });
  });
});
