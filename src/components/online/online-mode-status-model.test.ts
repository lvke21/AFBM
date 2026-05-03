import { describe, expect, it } from "vitest";

import { getOnlineModeStatusCopy } from "./online-mode-status-model";

describe("getOnlineModeStatusCopy", () => {
  it("marks local mode as offline test data", () => {
    expect(getOnlineModeStatusCopy("local")).toMatchObject({
      primaryBadge: "Lokaler Testmodus",
      syncBadge: "Offline/Testdaten",
      roleBadge: "Rolle: Manager",
      description:
        "Du spielst im lokalen Testmodus. Daten bleiben auf diesem Gerät und werden nicht online synchronisiert.",
    });
  });

  it("marks firebase mode as live multiplayer", () => {
    expect(getOnlineModeStatusCopy("firebase")).toMatchObject({
      primaryBadge: "Live Multiplayer",
      syncBadge: "Online verbunden",
      roleBadge: "Rolle: Manager",
      description:
        "Du spielst im Live-Multiplayer. Ligaänderungen werden mit anderen Spielern synchronisiert.",
    });
  });
});
