import { describe, expect, it } from "vitest";

import { collectMissingSimulationAnchors } from "./stat-anchors";

function createWeekMatch() {
  return [
    {
      homeTeam: {
        id: "team-home",
        rosterProfiles: [
          {
            player: {
              id: "player-home",
              careerStat: null,
              playerSeasonStats: [
                {
                  id: "season-other",
                  teamId: "old-team",
                },
              ],
            },
          },
        ],
      },
      awayTeam: {
        id: "team-away",
        rosterProfiles: [
          {
            player: {
              id: "player-away",
              careerStat: {
                id: "career-away",
              },
              playerSeasonStats: [
                {
                  id: "season-away",
                  teamId: "team-away",
                },
              ],
            },
          },
        ],
      },
    },
  ] as Parameters<typeof collectMissingSimulationAnchors>[0];
}

describe("collectMissingSimulationAnchors", () => {
  it("flags missing career stats and wrong-team season shells for simulation players", () => {
    const missing = collectMissingSimulationAnchors(createWeekMatch());

    expect(missing).toEqual([
      {
        playerId: "player-home",
        teamId: "team-home",
        needsCareerStat: true,
        needsSeasonStat: true,
      },
    ]);
  });
});
