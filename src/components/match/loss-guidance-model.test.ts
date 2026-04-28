import { describe, expect, it } from "vitest";

import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

import { buildLossGuidanceState } from "./loss-guidance-model";
import type { MatchReport } from "./match-report-model";

function createMatch(overrides: Partial<MatchReport> = {}): MatchReport {
  return {
    status: "COMPLETED",
    stadiumName: "Harbor Field",
    summary: "New York gewann das Spiel.",
    homeTeam: {
      name: "Boston Guardians",
      abbreviation: "BOS",
      managerControlled: true,
      overallRating: 74,
      score: 17,
      stats: {
        firstDowns: 17,
        totalYards: 280,
        passingYards: 191,
        rushingYards: 89,
        turnovers: 3,
        explosivePlays: 2,
        redZoneTrips: 3,
        redZoneTouchdowns: 1,
      },
    },
    awayTeam: {
      name: "New York Titans",
      abbreviation: "NYT",
      managerControlled: false,
      overallRating: 79,
      score: 27,
      stats: {
        firstDowns: 21,
        totalYards: 360,
        passingYards: 240,
        rushingYards: 120,
        turnovers: 1,
        explosivePlays: 5,
        redZoneTrips: 4,
        redZoneTouchdowns: 3,
      },
    },
    leaders: {},
    drives: [],
    ...overrides,
  };
}

function createPlayer(overrides: Partial<TeamPlayerSummary>): TeamPlayerSummary {
  return {
    id: overrides.id ?? `${overrides.positionCode ?? "QB"}-1`,
    fullName: overrides.fullName ?? "Test Player",
    positionCode: overrides.positionCode ?? "QB",
    positionName: overrides.positionName ?? "Quarterback",
    positionOverall: overrides.positionOverall ?? 70,
    rosterStatus: overrides.rosterStatus ?? "STARTER",
    depthChartSlot: "depthChartSlot" in overrides ? (overrides.depthChartSlot ?? null) : 1,
  } as TeamPlayerSummary;
}

function createTeam(overrides: Partial<Pick<TeamDetail, "players" | "teamNeeds">> = {}) {
  return {
    players: overrides.players ?? [],
    teamNeeds: overrides.teamNeeds ?? [],
  };
}

describe("loss guidance model", () => {
  it("does not show guidance when the manager team did not lose", () => {
    const state = buildLossGuidanceState({
      match: createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          score: 27,
        },
        awayTeam: {
          ...createMatch().awayTeam,
          score: 17,
        },
      }),
      managerTeam: createTeam(),
      saveGameId: "save-1",
    });

    expect(state.items).toEqual([]);
  });

  it("prioritizes missing starters after a loss", () => {
    const state = buildLossGuidanceState({
      match: createMatch(),
      managerTeam: createTeam({
        players: [
          createPlayer({
            id: "qb-1",
            positionCode: "QB",
            positionName: "Quarterback",
            depthChartSlot: null,
          }),
        ],
      }),
      saveGameId: "save-1",
    });

    expect(state.items[0]).toMatchObject({
      title: "Starter fehlt auf Position QB",
      actionLabel: "Starter setzen",
      href: "/app/savegames/save-1/team/depth-chart",
      source: "depth-chart",
    });
    expect(state.items[0]?.description).toContain("Slot-1-Spieler");
  });

  it("uses the highest team need for a concrete improvement path", () => {
    const state = buildLossGuidanceState({
      match: createMatch(),
      managerTeam: createTeam({
        players: [],
        teamNeeds: [
          {
            positionCode: "WR",
            positionName: "Wide Receiver",
            starterAverage: 66,
            starterSchemeFit: 62,
            playerCount: 4,
            targetCount: 5,
            needScore: 6,
          },
          {
            positionCode: "CB",
            positionName: "Cornerback",
            starterAverage: 61,
            starterSchemeFit: 58,
            playerCount: 3,
            targetCount: 5,
            needScore: 9,
          },
        ],
      }),
      saveGameId: "save-1",
    });

    expect(state.items[0]).toMatchObject({
      title: "Secondary verstaerken",
      actionLabel: "Spieler suchen",
      href: "/app/savegames/save-1/finance/free-agency",
      source: "team-need",
    });
    expect(state.items[0]?.description).toContain("Cornerback");
  });

  it("still gives a specific match-insight action for sparse old data", () => {
    const state = buildLossGuidanceState({
      match: createMatch(),
      managerTeam: createTeam(),
      saveGameId: "save-1",
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      title: "Ball sichern",
      actionLabel: "Setup oeffnen",
      source: "match-insight",
    });
    expect(state.items[0]?.description).not.toBe("");
  });

  it("limits loss guidance to two supportive next steps", () => {
    const state = buildLossGuidanceState({
      match: createMatch(),
      managerTeam: createTeam({
        players: [
          createPlayer({
            id: "qb-1",
            positionCode: "QB",
            positionName: "Quarterback",
            depthChartSlot: null,
          }),
        ],
        teamNeeds: [
          {
            positionCode: "CB",
            positionName: "Cornerback",
            starterAverage: 61,
            starterSchemeFit: 58,
            playerCount: 3,
            targetCount: 5,
            needScore: 9,
          },
        ],
      }),
      saveGameId: "save-1",
    });

    expect(state.items).toHaveLength(2);
    expect(state.summary).toContain("Kein Vorwurf");
  });
});
