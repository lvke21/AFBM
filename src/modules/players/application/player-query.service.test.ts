import { describe, expect, it } from "vitest";

import type { PlayerDetailRecord } from "@/modules/players/infrastructure/player.repository";

import { selectSeasonSnapshot } from "./player-query.service";

function createSeasonStat(overrides: Record<string, unknown> = {}) {
  return {
    season: {
      id: "season-2026",
      year: 2026,
    },
    team: {
      id: "team-1",
      abbreviation: "BOS",
      city: "Boston",
      nickname: "Guardians",
    },
    gamesPlayed: 3,
    gamesStarted: 2,
    snapsOffense: 132,
    snapsDefense: 0,
    snapsSpecialTeams: 12,
    passing: null,
    rushing: {
      attempts: 0,
      yards: 0,
      touchdowns: 0,
      fumbles: 0,
      longestRush: 0,
    },
    receiving: {
      targets: 14,
      receptions: 9,
      yards: 128,
      touchdowns: 1,
      drops: 0,
      longestReception: 24,
      yardsAfterCatch: 31,
    },
    blocking: null,
    defensive: null,
    kicking: null,
    punting: null,
    returns: null,
    ...overrides,
  };
}

function createPlayerRecord(overrides: Record<string, unknown> = {}): PlayerDetailRecord {
  return {
    saveGame: {
      currentSeason: {
        id: "season-2026",
        year: 2026,
      },
    },
    rosterProfile: {
      team: {
        id: "team-1",
        city: "Boston",
        nickname: "Guardians",
        abbreviation: "BOS",
        offensiveSchemeFit: null,
        defensiveSchemeFit: null,
        specialTeamsSchemeFit: null,
      },
    },
    playerSeasonStats: [createSeasonStat()],
    ...overrides,
  } as unknown as PlayerDetailRecord;
}

describe("selectSeasonSnapshot", () => {
  it("prefers the current team stat block in the active season", () => {
    const snapshot = selectSeasonSnapshot(
      createPlayerRecord({
        playerSeasonStats: [
          createSeasonStat({
            team: {
              id: "team-2",
              abbreviation: "NYT",
              city: "New York",
              nickname: "Titans",
            },
            gamesPlayed: 5,
          }),
          createSeasonStat(),
        ],
      }),
    );

    expect(snapshot?.label).toBe("Aktuelle Team-Saison");
    expect(snapshot?.isCurrentTeamSeason).toBe(true);
    expect(snapshot?.teamName).toBe("Boston Guardians");
    expect(snapshot?.gamesPlayed).toBe(3);
  });

  it("synthesizes a zeroed current team season when the stat shell is still missing", () => {
    const snapshot = selectSeasonSnapshot(
      createPlayerRecord({
        playerSeasonStats: [
          createSeasonStat({
            season: {
              id: "season-2025",
              year: 2025,
            },
            team: {
              id: "team-2",
              abbreviation: "NYT",
              city: "New York",
              nickname: "Titans",
            },
            gamesPlayed: 11,
          }),
        ],
      }),
    );

    expect(snapshot?.label).toBe("Aktuelle Team-Saison");
    expect(snapshot?.teamName).toBe("Boston Guardians");
    expect(snapshot?.gamesPlayed).toBe(0);
    expect(snapshot?.receiving.yards).toBe(0);
  });

  it("falls back to the latest recorded season for free agents", () => {
    const snapshot = selectSeasonSnapshot(
      createPlayerRecord({
        rosterProfile: {
          team: null,
        },
        playerSeasonStats: [
          createSeasonStat({
            season: {
              id: "season-2025",
              year: 2025,
            },
            team: {
              id: "team-2",
              abbreviation: "NYT",
              city: "New York",
              nickname: "Titans",
            },
            gamesPlayed: 12,
          }),
        ],
      }),
    );

    expect(snapshot?.label).toBe("Letzte verknuepfte Saison");
    expect(snapshot?.isCurrentTeamSeason).toBe(false);
    expect(snapshot?.teamName).toBe("New York Titans");
    expect(snapshot?.gamesPlayed).toBe(12);
  });
});
