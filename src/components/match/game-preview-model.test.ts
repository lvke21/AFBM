import { describe, expect, it } from "vitest";

import type { LineupReadinessState } from "@/components/team/depth-chart-model";
import type { SeasonOverview } from "@/modules/seasons/domain/season.types";
import type { TeamDetail } from "@/modules/teams/domain/team.types";

import { buildGamePreviewState, type GamePreviewMatch } from "./game-preview-model";

function createMatch(overrides: Partial<GamePreviewMatch> = {}): GamePreviewMatch {
  return {
    id: "match-1",
    kind: "REGULAR_SEASON",
    scheduledAt: new Date("2026-09-06T18:00:00Z"),
    stadiumName: "Harbor Field",
    status: "SCHEDULED",
    week: 1,
    homeTeam: {
      id: "team-home",
      name: "Boston Guardians",
      abbreviation: "BOS",
      managerControlled: true,
      morale: 62,
      overallRating: 74,
      schemes: {
        offense: { code: "WEST_COAST", name: "West Coast" },
        defense: { code: "ZONE", name: "Zone" },
        specialTeams: { code: "FIELD_POSITION", name: "Field Position" },
      },
      xFactorPlan: {
        offense: { offensiveFocus: "PASS_FIRST", protectionPlan: "STANDARD" },
        defense: { defensiveFocus: "LIMIT_PASS", defensiveMatchupFocus: "DOUBLE_WR1" },
      },
    },
    awayTeam: {
      id: "team-away",
      name: "New York Titans",
      abbreviation: "NYT",
      managerControlled: false,
      morale: 58,
      overallRating: 71,
      schemes: {
        offense: { code: "POWER_RUN", name: "Power Run" },
        defense: { code: "FOUR_THREE", name: "4-3 Front" },
        specialTeams: null,
      },
    },
    ...overrides,
  };
}

function createSeason(): SeasonOverview {
  return {
    championName: null,
    id: "season-1",
    matches: [],
    phase: "REGULAR_SEASON",
    playoffPicture: [],
    standings: [
      {
        teamId: "team-home",
        name: "Boston Guardians",
        abbreviation: "BOS",
        overallRating: 74,
        record: "2-1",
        pointsFor: 64,
        pointsAgainst: 51,
        touchdownsFor: 8,
        turnoversForced: 3,
        turnoversCommitted: 2,
        turnoverDifferential: 1,
        passingYards: 650,
        rushingYards: 330,
        sacks: 7,
        explosivePlays: 9,
        redZoneTrips: 8,
        redZoneTouchdowns: 5,
      },
      {
        teamId: "team-away",
        name: "New York Titans",
        abbreviation: "NYT",
        overallRating: 71,
        record: "1-2",
        pointsFor: 54,
        pointsAgainst: 68,
        touchdownsFor: 6,
        turnoversForced: 2,
        turnoversCommitted: 4,
        turnoverDifferential: -2,
        passingYards: 590,
        rushingYards: 310,
        sacks: 5,
        explosivePlays: 6,
        redZoneTrips: 6,
        redZoneTouchdowns: 3,
      },
    ],
    week: 1,
    year: 2026,
  };
}

function createReadiness(overrides: Partial<LineupReadinessState> = {}): LineupReadinessState {
  return {
    title: "Spieltag-Bereitschaft",
    status: "ready",
    statusLabel: "Bereit",
    summary: "Alle Starterrollen sind besetzt.",
    conflicts: [],
    emptyStarterPositions: [],
    coreEmptyStarterPositions: [],
    secondaryEmptyStarterPositions: [],
    autoFillPlayers: [],
    metrics: [],
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
    overallRating: 74,
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

function lineupDecisionEvent() {
  return {
    id: "event-lineup",
    type: "DEPTH_CHART",
    title: "Depth Chart Reihenfolge angepasst",
    description:
      "Casey Starter: WR #2 -> #1 · Positionsstaerke 74 -> 82 (+8) · Bewertung: Passing leicht verbessert.",
    occurredAt: new Date("2026-09-02T12:00:00Z"),
    playerName: "Casey Starter",
  };
}

describe("buildGamePreviewState", () => {
  it("builds matchup records, ratings and a locked start reason before READY", () => {
    const state = buildGamePreviewState({
      match: createMatch(),
      readiness: createReadiness(),
      season: createSeason(),
      teamDetail: createTeamDetail(),
      weekState: "PRE_WEEK",
    });

    expect(state.homeTeam.record).toBe("2-1");
    expect(state.awayTeam.record).toBe("1-2");
    expect(state.contextLine).toContain("REGULAR SEASON");
    expect(state.readinessItems.find((item) => item.label === "Week State")?.value).toBe("PRE WEEK");
    expect(state.canStartMatch).toBe(false);
    expect(state.startBlockedReason).toContain("PRE_WEEK");
    expect(state.ratingComparisons.find((item) => item.label === "Team OVR")?.edge).toBe("home");
  });

  it("allows the primary start action in dev flow even without a fresh depth-chart choice", () => {
    const state = buildGamePreviewState({
      match: createMatch(),
      readiness: createReadiness(),
      season: createSeason(),
      teamDetail: createTeamDetail(),
      weekState: "READY",
    });

    expect(state.canStartMatch).toBe(true);
    expect(state.primaryActionLabel).toBe("Match starten");
    expect(state.startBlockedReason).toBeNull();
    expect(state.startWarning).toContain("nichts an der Aufstellung geaendert");
  });

  it("allows the primary start action when week, match and core lineup are ready", () => {
    const state = buildGamePreviewState({
      match: createMatch(),
      readiness: createReadiness(),
      season: createSeason(),
      teamDetail: createTeamDetail({
        recentDecisionEvents: [lineupDecisionEvent()],
      }),
      weekState: "READY",
    });

    expect(state.canStartMatch).toBe(true);
    expect(state.primaryActionLabel).toBe("Match starten");
    expect(state.startBlockedReason).toBeNull();
  });

  it("keeps core position gaps as hard blockers", () => {
    const state = buildGamePreviewState({
      match: createMatch(),
      readiness: createReadiness({
        status: "blocked",
        statusLabel: "Blockiert",
        summary: "1 wichtiger Starter fehlt.",
        coreEmptyStarterPositions: [
          {
            players: [],
            positionCode: "QB",
            positionName: "Quarterback",
            slots: [{ players: [], slot: 1 }],
            unassignedPlayers: [],
          },
        ],
      }),
      season: createSeason(),
      teamDetail: createTeamDetail(),
      weekState: "READY",
    });

    expect(state.canStartMatch).toBe(false);
    expect(state.startBlockedReason).toContain("wichtige Starter");
  });

  it("surfaces lineup and roster risks from existing data", () => {
    const state = buildGamePreviewState({
      match: createMatch(),
      readiness: createReadiness({
        status: "check",
        statusLabel: "Pruefen",
        summary: "Dein Team ist nicht optimal aufgestellt. 2 Ersatzspieler muessen einspringen.",
        secondaryEmptyStarterPositions: [
          {
            players: [],
            positionCode: "LG",
            positionName: "Left Guard",
            slots: [{ players: [], slot: 1 }],
            unassignedPlayers: [],
          },
          {
            players: [],
            positionCode: "LS",
            positionName: "Long Snapper",
            slots: [{ players: [], slot: 1 }],
            unassignedPlayers: [],
          },
        ],
        autoFillPlayers: [
          {
            id: "dev-auto-fill-lg-1",
            internalTag: "DEV_AUTO_FILL",
            name: "Dev Auto-Fill LG",
            overall: 62,
            positionCode: "LG",
            positionName: "Left Guard",
          },
          {
            id: "dev-auto-fill-ls-2",
            internalTag: "DEV_AUTO_FILL",
            name: "Dev Auto-Fill LS",
            overall: 62,
            positionCode: "LS",
            positionName: "Long Snapper",
          },
        ],
      }),
      season: createSeason(),
      teamDetail: createTeamDetail({
        teamNeeds: [
          {
            needScore: 8,
            playerCount: 2,
            positionCode: "DT",
            positionName: "Defensive Tackle",
            starterAverage: 60,
            starterSchemeFit: 58,
            targetCount: 3,
          },
        ],
      }),
      weekState: "READY",
    });

    expect(state.riskSignals.map((signal) => signal.label)).toContain("Aufstellungsrisiko");
    expect(state.riskSignals.map((signal) => signal.label)).toContain("Team Need");
    expect(state.readinessItems.find((item) => item.label === "Depth Chart")?.tone).toBe("warning");
  });

  it("shows lineup changes since the last completed match as preview context", () => {
    const state = buildGamePreviewState({
      match: createMatch(),
      readiness: createReadiness(),
      season: {
        ...createSeason(),
        matches: [
          {
            id: "match-previous",
            awayScore: 17,
            awayTeamId: "team-away",
            awayTeamName: "New York Titans",
            homeScore: 24,
            homeTeamId: "team-home",
            homeTeamName: "Boston Guardians",
            kind: "REGULAR_SEASON",
            scheduledAt: new Date("2026-09-01T18:00:00Z"),
            status: "COMPLETED",
            week: 0,
          },
        ],
      },
      teamDetail: createTeamDetail({
        recentDecisionEvents: [
          lineupDecisionEvent(),
        ],
      }),
      weekState: "READY",
    });

    const signal = state.strengthSignals.find((item) => item.label === "Aufstellung angepasst");

    expect(signal?.value).toBe("Seit letztem Spiel");
    expect(signal?.description).toContain("Positionsstaerke 74 -> 82");
    expect(signal?.tone).toBe("positive");
  });

  it("warns in the preview when the latest lineup decision was negative", () => {
    const state = buildGamePreviewState({
      match: createMatch(),
      readiness: createReadiness(),
      season: createSeason(),
      teamDetail: createTeamDetail({
        recentDecisionEvents: [
          {
            id: "event-lineup-risk",
            type: "DEPTH_CHART",
            title: "Depth Chart Reihenfolge angepasst",
            description:
              "Evan Stone: QB #1 -> #2 - Positionsstaerke 78 -> offen (n/a) - Bewertung: Passing Risiko steigt.",
            occurredAt: new Date("2026-09-02T12:00:00Z"),
            playerName: "Evan Stone",
          },
        ],
      }),
      weekState: "READY",
    });

    const signal = state.riskSignals.find((item) => item.label === "Aufstellungsrisiko");

    expect(signal?.value).toBe("Risiko offen");
    expect(signal?.description).toContain("Passing Risiko steigt");
  });
});
