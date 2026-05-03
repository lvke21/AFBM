import { describe, expect, it } from "vitest";

import { getOnlineLeagueComingSoonCopy } from "./online-league-coming-soon-model";

describe("online league coming soon copy", () => {
  it("explains non-MVP multiplayer features without pretending they work", () => {
    expect(getOnlineLeagueComingSoonCopy("contracts-cap")).toMatchObject({
      shortLabel: "Contracts/Cap",
      currentMvpHint: expect.stringContaining("Nicht Teil des aktuellen Multiplayer MVP"),
    });
    expect(getOnlineLeagueComingSoonCopy("development")).toMatchObject({
      shortLabel: "Development",
      currentMvpHint: expect.stringContaining("Nicht Teil des aktuellen Multiplayer MVP"),
    });
    expect(getOnlineLeagueComingSoonCopy("training")).toMatchObject({
      shortLabel: "Training",
      currentMvpHint: expect.stringContaining("Nicht Teil des aktuellen Multiplayer MVP"),
    });
    expect(getOnlineLeagueComingSoonCopy("trade-board")).toMatchObject({
      shortLabel: "Trade Board",
      currentMvpHint: expect.stringContaining("Nicht Teil des aktuellen Multiplayer MVP"),
    });
    expect(getOnlineLeagueComingSoonCopy("inbox")).toMatchObject({
      shortLabel: "Inbox",
      currentMvpHint: expect.stringContaining("Nicht Teil des aktuellen Multiplayer MVP"),
    });
    expect(getOnlineLeagueComingSoonCopy("finance")).toMatchObject({
      shortLabel: "Finance",
      currentMvpHint: expect.stringContaining("Nicht Teil des aktuellen Multiplayer MVP"),
    });
  });

  it("handles unknown feature slugs with a safe fallback", () => {
    expect(getOnlineLeagueComingSoonCopy("unknown")).toMatchObject({
      feature: "unknown",
      title: "Bereich noch nicht verfügbar",
    });
  });
});
