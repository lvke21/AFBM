import { describe, expect, it } from "vitest";

import { buildPlayerRole } from "./player-role-model";

describe("player role model", () => {
  it("labels slot-one starters as starter fits", () => {
    const role = buildPlayerRole({
      age: 27,
      depthChartSlot: 1,
      positionCode: "QB",
      positionOverall: 82,
      potentialRating: 85,
      rosterStatus: "STARTER",
      schemeFitScore: 74,
    });

    expect(role.category).toBe("starter-fit");
    expect(role.description).toBe("Kann als Starter sinnvoll eingesetzt werden.");
  });

  it("labels young high-upside players as development upside", () => {
    const role = buildPlayerRole({
      age: 22,
      positionCode: "WR",
      positionOverall: 68,
      potentialRating: 80,
      rosterStatus: "BACKUP",
    });

    expect(role.category).toBe("development-upside");
    expect(role.description).toBe("Junger Spieler mit sichtbarem Entwicklungspotenzial.");
    expect(role.summary).toContain("+12");
  });

  it("labels backups without upside signals as depth", () => {
    const role = buildPlayerRole({
      age: 28,
      depthChartSlot: 3,
      positionCode: "CB",
      positionOverall: 70,
      potentialRating: 72,
      rosterStatus: "BACKUP",
    });

    expect(role.category).toBe("depth");
    expect(role.description).toBe("Kader-Tiefe fuer Rotation, Backup oder Absicherung.");
  });

  it("labels specialists by primary or return role", () => {
    expect(buildPlayerRole({ positionCode: "K", positionOverall: 75 }).category).toBe(
      "specialist",
    );
    expect(
      buildPlayerRole({
        positionCode: "WR",
        secondaryPositionCode: "PR",
        positionOverall: 72,
      }).category,
    ).toBe("specialist");
  });

  it("keeps stable fallbacks with missing evaluation data", () => {
    const role = buildPlayerRole({});

    expect(role.category).toBe("depth");
    expect(role.description).toBe("Kader-Tiefe fuer Rotation, Backup oder Absicherung.");
    expect(role.summary).toBe("OVR -");
    expect(role.reasons).toEqual(["Reliable roster depth"]);
  });

  it("keeps a short explanation for every role", () => {
    const roles = [
      buildPlayerRole({ depthChartSlot: 1, positionCode: "QB", positionOverall: 82 }),
      buildPlayerRole({ age: 22, positionOverall: 68, potentialRating: 80 }),
      buildPlayerRole({ positionCode: "CB", positionOverall: 70 }),
      buildPlayerRole({ positionCode: "K", positionOverall: 75 }),
    ];

    expect(new Set(roles.map((role) => role.category))).toEqual(
      new Set(["starter-fit", "development-upside", "depth", "specialist"]),
    );
    expect(roles.every((role) => role.description.length > 0)).toBe(true);
  });
});
