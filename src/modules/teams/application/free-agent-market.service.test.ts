import { describe, expect, it } from "vitest";

import type { FreeAgentMarketPlayer } from "./team-management.shared";
import { rankFreeAgentMarketPlayers } from "./free-agent-market.service";

function createMarketPlayer(
  id: string,
  overrides: Partial<FreeAgentMarketPlayer>,
): FreeAgentMarketPlayer {
  return {
    id,
    fullName: `Player ${id}`,
    age: 25,
    yearsPro: 3,
    positionCode: "WR",
    positionName: "Wide Receiver",
    archetypeName: null,
    schemeFitName: null,
    positionOverall: 80,
    potentialRating: 82,
    physicalOverall: 81,
    mentalOverall: 78,
    projectedCapHit: 5_000_000,
    schemeFitScore: 75,
    teamNeedScore: 70,
    spotlightRatings: [],
    ...overrides,
  };
}

describe("rankFreeAgentMarketPlayers", () => {
  it("sorts by team need, then scheme fit, then overall, then age", () => {
    const ranked = rankFreeAgentMarketPlayers([
      createMarketPlayer("older-tiebreak", {
        teamNeedScore: 88,
        schemeFitScore: 82,
        positionOverall: 86,
        age: 29,
      }),
      createMarketPlayer("best-need", {
        teamNeedScore: 92,
        schemeFitScore: 70,
        positionOverall: 78,
        age: 31,
      }),
      createMarketPlayer("best-fit", {
        teamNeedScore: 88,
        schemeFitScore: 91,
        positionOverall: 84,
        age: 27,
      }),
      createMarketPlayer("best-overall", {
        teamNeedScore: 88,
        schemeFitScore: 82,
        positionOverall: 91,
        age: 30,
      }),
      createMarketPlayer("youngest-tiebreak", {
        teamNeedScore: 88,
        schemeFitScore: 82,
        positionOverall: 86,
        age: 24,
      }),
    ]);

    expect(ranked.map((player) => player.id)).toEqual([
      "best-need",
      "best-fit",
      "best-overall",
      "youngest-tiebreak",
      "older-tiebreak",
    ]);
  });
});
