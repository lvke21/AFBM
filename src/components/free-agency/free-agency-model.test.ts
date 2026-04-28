import { describe, expect, it } from "vitest";

import {
  buildFreeAgentOfferPreview,
  getDefaultOffer,
  sortFreeAgents,
} from "./free-agency-model";
import type { FreeAgentMarketPlayer } from "@/modules/teams/application/team-management.shared";

function player(id: string, overrides: Partial<FreeAgentMarketPlayer>): FreeAgentMarketPlayer {
  return {
    id,
    fullName: id,
    age: 25,
    yearsPro: 3,
    positionCode: "WR",
    positionName: "Wide Receiver",
    archetypeName: null,
    schemeFitName: null,
    positionOverall: 75,
    potentialRating: 80,
    physicalOverall: 75,
    mentalOverall: 75,
    projectedCapHit: 1_000_000,
    schemeFitScore: 70,
    teamNeedScore: 50,
    spotlightRatings: [],
    ...overrides,
  };
}

describe("free agency model", () => {
  it("sorts free agents by need, value, fit or overall", () => {
    const players = [
      player("best-fit", { schemeFitScore: 95, teamNeedScore: 40, positionOverall: 79 }),
      player("best-need", { teamNeedScore: 90, schemeFitScore: 50, positionOverall: 76 }),
      player("best-ovr", { positionOverall: 91, teamNeedScore: 60, schemeFitScore: 60 }),
      player("best-value", {
        age: 23,
        positionOverall: 78,
        potentialRating: 86,
        projectedCapHit: 5_000_000,
        schemeFitScore: 88,
        teamNeedScore: 85,
      }),
    ];

    expect(sortFreeAgents(players, "need").map((entry) => entry.id)).toEqual([
      "best-need",
      "best-value",
      "best-ovr",
      "best-fit",
    ]);
    expect(sortFreeAgents(players, "value").map((entry) => entry.id)[0]).toBe("best-value");
    expect(sortFreeAgents(players, "fit").map((entry) => entry.id)).toEqual([
      "best-fit",
      "best-value",
      "best-ovr",
      "best-need",
    ]);
    expect(sortFreeAgents(players, "overall").map((entry) => entry.id)).toEqual([
      "best-ovr",
      "best-fit",
      "best-value",
      "best-need",
    ]);
  });

  it("previews cap and cash affordability", () => {
    const preview = buildFreeAgentOfferPreview({
      capSpace: 1_000_000,
      cashBalance: 100_000,
      player: player("target", { positionOverall: 90 }),
      yearlySalary: 2_000_000,
      years: 2,
    });

    expect(preview.canAffordCap).toBe(false);
    expect(preview.canAffordCash).toBe(false);
    expect(preview.capAfterSigning).toBeLessThan(0);
    expect(preview.cashAfterSigning).toBeLessThan(0);
    expect(preview.capImpact).toBeLessThan(0);
    expect(preview.cashImpact).toBeLessThan(0);
    expect(preview.value.label).toBeDefined();
  });

  it("evaluates offer quality and rejection risk", () => {
    const weakOffer = buildFreeAgentOfferPreview({
      capSpace: 30_000_000,
      cashBalance: 30_000_000,
      player: player("target", {
        positionOverall: 88,
        schemeFitScore: 20,
        teamNeedScore: 20,
      }),
      yearlySalary: 850_000,
      years: 1,
    });
    const strongOffer = buildFreeAgentOfferPreview({
      capSpace: 30_000_000,
      cashBalance: 30_000_000,
      player: player("target", {
        positionOverall: 88,
        schemeFitScore: 90,
        teamNeedScore: 90,
      }),
      yearlySalary: 14_000_000,
      years: 4,
    });

    expect(weakOffer.evaluation.playerCanReject).toBe(true);
    expect(weakOffer.evaluation.label).toBe("Schlechtes Angebot");
    expect(strongOffer.evaluation.playerCanReject).toBe(false);
    expect(strongOffer.evaluation.label).toBe("Gutes Angebot");
  });

  it("builds a practical default offer", () => {
    expect(getDefaultOffer(player("target", { positionOverall: 80 }))).toEqual({
      years: 2,
      yearlySalary: 9_600_000,
    });
  });
});
