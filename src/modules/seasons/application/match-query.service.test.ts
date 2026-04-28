import { describe, expect, it } from "vitest";

import { toMatchPlayerLine, toMatchTeamSummary } from "./match-query.service";

function createMatchLine(overrides: Record<string, unknown> = {}) {
  return {
    player: {
      id: "player-1",
      firstName: "Current",
      lastName: "Player",
      rosterProfile: {
        primaryPosition: {
          code: "WR",
        },
      },
    },
    teamId: "team-1",
    snapshotFullName: null,
    snapshotPositionCode: null,
    snapshotTeamAbbreviation: null,
    passing: null,
    rushing: {
      yards: 48,
      touchdowns: 1,
    },
    receiving: {
      yards: 112,
      touchdowns: 2,
    },
    defensive: null,
    kicking: null,
    punting: null,
    returns: null,
    ...overrides,
  } as Parameters<typeof toMatchPlayerLine>[0];
}

describe("toMatchPlayerLine", () => {
  it("prefers persisted historical snapshots over live roster data", () => {
    const playerLine = toMatchPlayerLine(
      createMatchLine({
        snapshotFullName: "Historic Captain",
        snapshotPositionCode: "QB",
        snapshotTeamAbbreviation: "HIS",
      }),
      "CUR",
    );

    expect(playerLine.fullName).toBe("Historic Captain");
    expect(playerLine.positionCode).toBe("QB");
    expect(playerLine.teamAbbreviation).toBe("HIS");
  });

  it("falls back to current player data for older match rows without snapshots", () => {
    const playerLine = toMatchPlayerLine(createMatchLine(), "CUR");

    expect(playerLine.fullName).toBe("Current Player");
    expect(playerLine.positionCode).toBe("WR");
    expect(playerLine.teamAbbreviation).toBe("CUR");
    expect(playerLine.receivingYards).toBe(112);
  });
});

describe("toMatchTeamSummary", () => {
  it("maps game-preparation fields from the match team record", () => {
    const team = toMatchTeamSummary(
      {
        id: "team-1",
        city: "Boston",
        nickname: "Guardians",
        abbreviation: "BOS",
        managerControlled: true,
        overallRating: 82,
        morale: 61,
        offensiveSchemeFit: {
          code: "WEST_COAST",
          name: "West Coast",
        },
        defensiveSchemeFit: {
          code: "ZONE_DISCIPLINE",
          name: "Zone Discipline",
        },
        specialTeamsSchemeFit: null,
      },
      null,
      null,
    );

    expect(team.name).toBe("Boston Guardians");
    expect(team.managerControlled).toBe(true);
    expect(team.overallRating).toBe(82);
    expect(team.schemes.offense?.code).toBe("WEST_COAST");
    expect(team.schemes.defense?.name).toBe("Zone Discipline");
    expect(team.schemes.specialTeams).toBeNull();
  });

  it("maps persisted gameplan summaries and tolerates older rows without them", () => {
    const team = toMatchTeamSummary(
      {
        id: "team-1",
        city: "Boston",
        nickname: "Guardians",
        abbreviation: "BOS",
        managerControlled: false,
        overallRating: 82,
        morale: 61,
        offensiveSchemeFit: null,
        defensiveSchemeFit: null,
        specialTeamsSchemeFit: null,
      },
      24,
      {
        id: "stat-1",
        saveGameId: "save-1",
        matchId: "match-1",
        teamId: "team-1",
        firstDowns: 18,
        totalYards: 331,
        turnovers: 1,
        penalties: 5,
        timeOfPossessionSeconds: 1760,
        passingYards: 221,
        rushingYards: 110,
        sacks: 2,
        explosivePlays: 3,
        redZoneTrips: 3,
        redZoneTouchdowns: 2,
        gameplanSummary: {
          aiStrategyArchetype: "FAVORITE_CONTROL",
          label: "favorite control",
          summary: "AI/Gameplan: favorite control, run first, conservative, slow.",
          offenseFocus: "run first",
          defenseFocus: "stop run",
          aggression: "conservative",
        },
      },
    );

    expect(team.gameplanSummary).toEqual({
      aggression: "conservative",
      aiStrategyArchetype: "FAVORITE_CONTROL",
      defenseFocus: "stop run",
      label: "favorite control",
      offenseFocus: "run first",
      summary: "AI/Gameplan: favorite control, run first, conservative, slow.",
    });

    const olderTeam = toMatchTeamSummary(
      {
        id: "team-2",
        city: "New York",
        nickname: "Titans",
        abbreviation: "NYT",
        managerControlled: false,
        overallRating: 72,
        morale: 55,
        offensiveSchemeFit: null,
        defensiveSchemeFit: null,
        specialTeamsSchemeFit: null,
      },
      17,
      null,
    );

    expect(olderTeam.gameplanSummary).toBeNull();
  });
});
