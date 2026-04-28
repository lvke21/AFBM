import { ScoutingLevel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  requirePageUserId: vi.fn(),
  revalidatePath: vi.fn(),
  scoutProspectForUser: vi.fn(),
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

vi.mock("@/modules/draft/application/scouting-command.service", () => ({
  scoutProspectForUser: mocks.scoutProspectForUser,
}));

import { scoutProspectAction } from "./actions";

describe("scoutProspectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUserId.mockResolvedValue("user-1");
    mocks.scoutProspectForUser.mockResolvedValue({
      changed: true,
      draftPlayerId: "draft-player-1",
      nextLevel: ScoutingLevel.BASIC,
      previousLevel: ScoutingLevel.NONE,
      prospectName: "Cole Harrison",
    });
  });

  it("scouts a prospect and redirects with visible success feedback", async () => {
    const formData = new FormData();
    formData.set("saveGameId", "save-1");
    formData.set("draftPlayerId", "draft-player-1");

    await expect(scoutProspectAction(formData)).rejects.toThrow("NEXT_REDIRECT:");

    expect(mocks.scoutProspectForUser).toHaveBeenCalledWith({
      userId: "user-1",
      saveGameId: "save-1",
      draftPlayerId: "draft-player-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/app/savegames/save-1/development/scouting",
    );
    expect(mocks.redirect.mock.calls[0][0]).toContain("feedback=success");
    expect(mocks.redirect.mock.calls[0][0]).toContain("Prospect+gescoutet");
  });
});
