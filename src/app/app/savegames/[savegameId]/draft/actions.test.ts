import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pickDraftPlayerForUser: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  requirePageUserId: vi.fn(),
  revalidatePath: vi.fn(),
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

vi.mock("@/modules/draft/application/draft-pick.service", () => ({
  pickDraftPlayerForUser: mocks.pickDraftPlayerForUser,
}));

import { pickDraftPlayerAction } from "./actions";

describe("pickDraftPlayerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.pickDraftPlayerForUser.mockResolvedValue({
      draftPlayerId: "draft-player-1",
      pickNumber: 1,
      prospectName: "Cole Harrison",
      round: 1,
      teamId: "team-1",
    });
  });

  it("picks a prospect and redirects with visible success feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("draftPlayerId", "draft-player-1");

    await expect(pickDraftPlayerAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.pickDraftPlayerForUser).toHaveBeenCalledWith({
      userId: "user-1",
      saveGameId: "save-1",
      draftPlayerId: "draft-player-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/savegames/save-1/draft");
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=success");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Prospect+gedraftet");
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedbackActionHref");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Roster+und+Needs+pruefen");
  });

  it("redirects with error feedback when the pick is blocked", async () => {
    mocks.pickDraftPlayerForUser.mockRejectedValue(
      new Error("Draft prospect is no longer available"),
    );
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("draftPlayerId", "draft-player-1");

    await expect(pickDraftPlayerAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=error");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Pick+nicht+abgeschlossen");
  });
});
