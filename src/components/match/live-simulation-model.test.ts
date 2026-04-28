import { describe, expect, it } from "vitest";

import type { TeamDetail } from "@/modules/teams/domain/team.types";

import { buildLiveSimulationState, type LiveSimulationMatch } from "./live-simulation-model";

function createMatch(overrides: Partial<LiveSimulationMatch> = {}): LiveSimulationMatch {
  return {
    id: "match-1",
    kind: "REGULAR_SEASON",
    scheduledAt: new Date("2026-09-06T18:00:00Z"),
    simulationCompletedAt: null,
    simulationStartedAt: new Date("2026-09-06T18:10:00Z"),
    status: "IN_PROGRESS",
    stadiumName: "E2E Field",
    summary: "Die Simulation laeuft.",
    week: 1,
    homeTeam: {
      abbreviation: "BOS",
      managerControlled: true,
      name: "Boston Guardians",
      score: 14,
      stats: null,
    },
    awayTeam: {
      abbreviation: "NYT",
      managerControlled: false,
      name: "New York Titans",
      score: 10,
      stats: null,
    },
    leaders: {},
    drives: [
      {
        defenseTeamAbbreviation: "NYT",
        endedScore: "7-0",
        offenseTeamAbbreviation: "BOS",
        passAttempts: 5,
        phaseLabel: "Q1",
        plays: 8,
        pointsScored: 7,
        primaryDefenderName: null,
        primaryPlayerName: "Alex Carter",
        redZoneTrip: true,
        resultType: "TOUCHDOWN",
        rushAttempts: 3,
        sequence: 2,
        startedScore: "0-0",
        summary: "Boston beendet den Drive mit einem Touchdown.",
        totalYards: 72,
        turnover: false,
      },
      {
        defenseTeamAbbreviation: "BOS",
        endedScore: "7-0",
        offenseTeamAbbreviation: "NYT",
        passAttempts: 3,
        phaseLabel: "Q1",
        plays: 4,
        pointsScored: 0,
        primaryDefenderName: "Mason Reed",
        primaryPlayerName: null,
        redZoneTrip: false,
        resultType: "INTERCEPTION",
        rushAttempts: 1,
        sequence: 1,
        startedScore: "0-0",
        summary: "New York wirft eine Interception.",
        totalYards: 18,
        turnover: true,
      },
    ],
    ...overrides,
  };
}

function createTeamDetail(overrides: Partial<TeamDetail> = {}): TeamDetail {
  return {
    id: "team-home",
    name: "Boston Guardians",
    abbreviation: "BOS",
    cashBalance: 1000000,
    conferenceName: "Atlantic",
    contractOutlook: {
      activeCapCommitted: 0,
      expiringCap: 0,
      expiringPlayers: [],
    },
    currentRecord: "2-1",
    divisionName: "Eastern",
    managerControlled: true,
    morale: 62,
    overallRating: 78,
    players: [],
    recentDecisionEvents: [],
    recentFinanceEvents: [],
    salaryCapSpace: 42000000,
    schemes: {
      defense: "Zone",
      offense: "West Coast",
      specialTeams: "Field Position",
    },
    teamNeeds: [],
    ...overrides,
  };
}

describe("buildLiveSimulationState", () => {
  it("builds a readable live scoreboard, situation and chronological timeline", () => {
    const state = buildLiveSimulationState({
      canFinishGame: true,
      match: createMatch(),
      weekState: "GAME_RUNNING",
    });

    expect(state.scoreLine).toBe("BOS 14 : 10 NYT");
    expect(state.control.canFinishGame).toBe(true);
    expect(state.situation.phaseLabel).toBe("Q1");
    expect(state.situation.possessionLabel).toBe("Letzte Possession: BOS");
    expect(state.situation.sourceLabel).toBe("Drive Details");
    expect(state.storyline.currentGameState.title).toBe("Enges Spiel");
    expect(state.storyline.keyDrive.title).toBe("Touchdown-Drive als Ausrufezeichen");
    expect(state.storyline.momentumSignal.title).toBe("Momentum wackelt");
    expect(state.storyline.watchNext.title).toBe("Stop nach Score");
    expect(state.timeline.map((entry) => entry.sequence)).toEqual([1, 2]);
    expect(state.timeline[0]?.highlight).toBe("turnover");
    expect(state.timeline[1]?.highlight).toBe("touchdown");
  });

  it("adds lineup context to important live timeline entries", () => {
    const state = buildLiveSimulationState({
      canFinishGame: true,
      match: createMatch(),
      teamDetail: createTeamDetail({
        recentDecisionEvents: [
          {
            id: "lineup-1",
            description:
              "Alex Carter: QB #2 -> #1 - Positionsstaerke 74 -> 82 (+8) - Bewertung: Passing leicht verbessert.",
            occurredAt: new Date("2026-09-05T12:00:00Z"),
            playerName: "Alex Carter",
            title: "Depth Chart Reihenfolge angepasst",
            type: "DEPTH_CHART",
          },
        ],
      }),
      weekState: "GAME_RUNNING",
    });

    expect(state.timeline[1]?.lineupContext).toBe(
      "Lineup-Kontext: Neuer Fokus Alex Carter war an diesem wichtigen Drive beteiligt.",
    );
    expect(state.storyline.managerImpact.title).toBe("Alex Carter im Fokus");
    expect(state.storyline.managerImpact.description).toContain("Drive 2");
  });

  it("keeps scheduled matches stable with fallback context and no timeline", () => {
    const state = buildLiveSimulationState({
      canFinishGame: false,
      match: createMatch({
        drives: [],
        homeTeam: {
          abbreviation: "BOS",
          name: "Boston Guardians",
          score: null,
          stats: null,
        },
        awayTeam: {
          abbreviation: "NYT",
          name: "New York Titans",
          score: null,
          stats: null,
        },
        status: "SCHEDULED",
      }),
      weekState: "PRE_WEEK",
    });

    expect(state.scoreLine).toBe("BOS - : - NYT");
    expect(state.hasTimeline).toBe(false);
    expect(state.situation.sourceLabel).toBe("Game State");
    expect(state.timelineEmptyMessage).toContain("Drive-Zusammenfassungen");
    expect(state.storyline.keyDrive.title).toBe("Wartet auf den ersten Drive");
    expect(state.control.primaryLabel).toBe("Wartet auf Match-Start");
  });

  it("surfaces completed matches as report-oriented control state", () => {
    const state = buildLiveSimulationState({
      canFinishGame: false,
      match: createMatch({
        status: "COMPLETED",
        simulationCompletedAt: new Date("2026-09-06T20:30:00Z"),
      }),
      weekState: "POST_GAME",
    });

    expect(state.statusLabel).toBe("Beendet");
    expect(state.control.primaryLabel).toBe("Report pruefen");
    expect(state.momentumIndicators[0]?.value).toBe("BOS");
    expect(state.storyline.currentGameState.title).toBe("Finale Phase");
    expect(state.storyline.watchNext.title).toBe("Auswertung und naechste Woche");
  });

  it("keeps manager impact credible when no lineup decision matches the live game", () => {
    const state = buildLiveSimulationState({
      canFinishGame: true,
      match: createMatch(),
      teamDetail: createTeamDetail(),
      weekState: "GAME_RUNNING",
    });

    expect(state.storyline.managerImpact.title).toBe("Kein klares Entscheidungssignal");
    expect(state.storyline.managerImpact.description).toContain("gespeicherte Entscheidung");
  });
});
