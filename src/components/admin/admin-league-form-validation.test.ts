import { describe, expect, it } from "vitest";

import { validateAdminLeagueForm } from "./admin-league-form-validation";

describe("validateAdminLeagueForm", () => {
  it("trims valid league names", () => {
    expect(validateAdminLeagueForm({ name: "  Friday Night League  ", maxUsers: 12 })).toEqual({
      ok: true,
      value: {
        name: "Friday Night League",
        maxUsers: 12,
      },
    });
  });

  it("rejects missing league names", () => {
    expect(validateAdminLeagueForm({ name: "   ", maxUsers: 12 })).toMatchObject({
      ok: false,
      message: "Liga Name ist erforderlich.",
    });
  });

  it("requires max users between 2 and 32", () => {
    expect(validateAdminLeagueForm({ name: "Valid League", maxUsers: 1 })).toMatchObject({
      ok: false,
      message: "Max Spieler muss zwischen 2 und 32 liegen.",
    });
    expect(validateAdminLeagueForm({ name: "Valid League", maxUsers: 33 })).toMatchObject({
      ok: false,
      message: "Max Spieler muss zwischen 2 und 32 liegen.",
    });
  });
});
