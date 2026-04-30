import { describe, expect, it } from "vitest";

import {
  getTeamIdentityPreview,
  getTeamNamesByCategory,
  normalizeCityDedupeKey,
  resolveTeamIdentitySelection,
  TEAM_IDENTITY_CITIES,
  TEAM_IDENTITY_TEAM_NAMES,
  TEAM_NAME_CATEGORIES,
} from "./team-identity-options";

describe("team-identity-options", () => {
  it("deduplicates cities by slug and normalized writing variants", () => {
    const cityIds = TEAM_IDENTITY_CITIES.map((city) => city.id);
    const normalizedNames = TEAM_IDENTITY_CITIES.map((city) =>
      normalizeCityDedupeKey(city.name),
    );

    expect(new Set(cityIds).size).toBe(cityIds.length);
    expect(new Set(normalizedNames).size).toBe(normalizedNames.length);
    expect(TEAM_IDENTITY_CITIES.filter((city) => city.id === "munchen")).toHaveLength(1);
    expect(TEAM_IDENTITY_CITIES.filter((city) => city.id === "zurich")).toHaveLength(1);
    expect(TEAM_IDENTITY_CITIES.find((city) => city.id === "zurich")).toMatchObject({
      name: "Zürich",
      cityGroups: expect.arrayContaining(["switzerland", "dach"]),
    });
  });

  it("provides unique team name slugs across all categories", () => {
    const teamNameIds = TEAM_IDENTITY_TEAM_NAMES.map((teamName) => teamName.id);

    expect(new Set(teamNameIds).size).toBe(teamNameIds.length);
    expect(getTeamNamesByCategory("identity_city")).toHaveLength(40);
    expect(getTeamNamesByCategory("aggressive_competitive")).toHaveLength(40);
    expect(getTeamNamesByCategory("modern_sports")).toHaveLength(20);
    expect(getTeamNamesByCategory("classic_sports")).toHaveLength(20);
    expect(TEAM_NAME_CATEGORIES).toEqual([
      "identity_city",
      "aggressive_competitive",
      "modern_sports",
      "classic_sports",
    ]);
  });

  it("resolves valid selections and builds the live preview", () => {
    const selection = {
      cityId: "zurich",
      category: "identity_city" as const,
      teamNameId: "forge",
    };

    expect(resolveTeamIdentitySelection(selection)).toEqual({
      cityId: "zurich",
      cityName: "Zürich",
      teamNameId: "forge",
      teamName: "Forge",
      teamCategory: "identity_city",
      teamDisplayName: "Zürich Forge",
    });
    expect(getTeamIdentityPreview(selection)).toBe("Zürich Forge");
  });

  it("rejects invalid or mismatched selections", () => {
    expect(
      resolveTeamIdentitySelection({
        cityId: "",
        category: "identity_city",
        teamNameId: "forge",
      }),
    ).toBeNull();
    expect(
      resolveTeamIdentitySelection({
        cityId: "zurich",
        category: "modern_sports",
        teamNameId: "forge",
      }),
    ).toBeNull();
    expect(
      resolveTeamIdentitySelection({
        cityId: "missing-city",
        category: "identity_city",
        teamNameId: "forge",
      }),
    ).toBeNull();
  });
});
