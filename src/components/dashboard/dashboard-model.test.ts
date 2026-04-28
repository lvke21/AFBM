import { describe, expect, it } from "vitest";

import {
  buildDashboardAction,
  buildDashboardDecisionFeedbackItems,
  buildDashboardQuickActions,
  buildPostGameContextLine,
  buildRebuildProgressState,
  buildTeamDevelopmentState,
  buildTeamContextState,
  buildTeamProfileState,
  buildWeekLoopFeedbackItems,
  buildWeekLoopDashboardAction,
  getDashboardWeekStateTone,
  getFreeAgencyHref,
  getGameCenterHref,
  getMatchHref,
  getSeasonHref,
  getTeamHref,
  selectNextDashboardMatch,
} from "./dashboard-model";
import type { SeasonOverview } from "@/modules/seasons/domain/season.types";
import type { TeamDetail } from "@/modules/teams/domain/team.types";

const baseSeason: SeasonOverview = {
  id: "season-1",
  year: 2026,
  phase: "REGULAR_SEASON",
  week: 2,
  championName: null,
  playoffPicture: [],
  standings: [],
  matches: [
    {
      id: "completed-current",
      week: 2,
      kind: "REGULAR_SEASON",
      scheduledAt: new Date("2026-09-10T18:00:00Z"),
      status: "COMPLETED",
      homeTeamId: "team-a",
      homeTeamName: "Alpha",
      awayTeamId: "team-b",
      awayTeamName: "Beta",
      homeScore: 21,
      awayScore: 17,
    },
    {
      id: "manager-current",
      week: 2,
      kind: "REGULAR_SEASON",
      scheduledAt: new Date("2026-09-11T18:00:00Z"),
      status: "SCHEDULED",
      homeTeamId: "team-user",
      homeTeamName: "User Team",
      awayTeamId: "team-c",
      awayTeamName: "Charlie",
      homeScore: null,
      awayScore: null,
    },
    {
      id: "manager-next",
      week: 3,
      kind: "REGULAR_SEASON",
      scheduledAt: new Date("2026-09-18T18:00:00Z"),
      status: "SCHEDULED",
      homeTeamId: "team-d",
      homeTeamName: "Delta",
      awayTeamId: "team-user",
      awayTeamName: "User Team",
      homeScore: null,
      awayScore: null,
    },
  ],
};

const baseTeam: TeamDetail = {
  id: "team-user",
  name: "User Team",
  abbreviation: "USR",
  conferenceName: "East",
  divisionName: "North",
  managerControlled: true,
  schemes: {
    offense: "Balanced",
    defense: "Zone",
    specialTeams: "Field Position",
  },
  overallRating: 80,
  morale: 70,
  cashBalance: 1000000,
  salaryCapSpace: 200000,
  currentRecord: "1-0",
  contractOutlook: {
    activeCapCommitted: 100000,
    expiringCap: 0,
    expiringPlayers: [],
  },
  recentFinanceEvents: [],
  recentDecisionEvents: [],
  teamNeeds: [
    {
      positionCode: "OL",
      positionName: "Offensive Line",
      starterAverage: 68,
      starterSchemeFit: 62,
      playerCount: 4,
      targetCount: 5,
      needScore: 7,
    },
  ],
  players: [],
};

const youngPlayer: TeamDetail["players"][number] = {
  id: "young-1",
  fullName: "Kai Rivers",
  age: 22,
  yearsPro: 1,
  heightCm: 188,
  weightKg: 95,
  positionCode: "WR",
  positionName: "Wide Receiver",
  secondaryPositionCode: null,
  secondaryPositionName: null,
  positionGroupName: "Offense",
  archetypeName: null,
  schemeFitName: null,
  rosterStatus: "STARTER",
  depthChartSlot: 1,
  captainFlag: false,
  developmentFocus: true,
  schemeFitScore: 72,
  positionOverall: 68,
  potentialRating: 82,
  physicalOverall: 70,
  mentalOverall: 66,
  detailRatings: [],
  status: "ACTIVE",
  injuryStatus: "HEALTHY",
  injuryName: null,
  morale: 70,
  fatigue: 24,
  keyAttributes: {
    speed: 78,
    strength: 58,
    awareness: 64,
    leadership: 50,
    discipline: 60,
    durability: 74,
    mobility: 76,
    hands: 72,
    coverageRange: 0,
    linebackerCoverage: 0,
    linebackerManCoverage: 0,
    linebackerZoneCoverage: 0,
    kickConsistency: 0,
    returnVision: 0,
    snapAccuracy: 0,
    snapVelocity: 0,
  },
  currentContract: null,
  seasonLine: {
    gamesPlayed: 4,
    passingYards: 0,
    passingTouchdowns: 0,
    passingInterceptions: 0,
    rushingYards: 25,
    rushingTouchdowns: 0,
    receivingYards: 220,
    receptions: 17,
    receivingTouchdowns: 2,
    tackles: 0,
    sacks: 0,
    passesDefended: 0,
    interceptions: 0,
    targetsAllowed: 0,
    receptionsAllowed: 0,
    yardsAllowed: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    punts: 0,
    puntsInside20: 0,
    returnYards: 0,
    returnTouchdowns: 0,
    returnFumbles: 0,
  },
};

describe("dashboard model", () => {
  it("builds stable dashboard hrefs", () => {
    expect(getTeamHref("save-1", "team-1")).toBe("/app/savegames/save-1/team");
    expect(getTeamHref("save-1", null)).toBeNull();
    expect(getSeasonHref("save-1", "season-1")).toBe("/app/savegames/save-1/league");
    expect(getFreeAgencyHref("save-1")).toBe("/app/savegames/save-1/finance/free-agency");
    expect(getGameCenterHref("save-1", "match-1")).toBe(
      "/app/savegames/save-1/game/live?matchId=match-1",
    );
    expect(getMatchHref("save-1", "match-1")).toBe(
      "/app/savegames/save-1/game/report?matchId=match-1",
    );
  });

  it("prefers the manager team's scheduled current-week match", () => {
    expect(selectNextDashboardMatch(baseSeason, "team-user")?.id).toBe("manager-current");
  });

  it("falls back to the next scheduled match when the current week is done", () => {
    const season: SeasonOverview = {
      ...baseSeason,
      matches: baseSeason.matches.map((match) =>
        match.week === 2 ? { ...match, status: "COMPLETED" } : match,
      ),
    };

    expect(selectNextDashboardMatch(season, "team-user")?.id).toBe("manager-next");
  });

  it("creates a Free Agency action when manager team needs exist", () => {
    const action = buildDashboardAction({
      saveGameId: "save-1",
      team: baseTeam,
      season: baseSeason,
      nextMatch: selectNextDashboardMatch(baseSeason, baseTeam.id),
    });

    expect(action.title).toContain("OL");
    expect(action.href).toBe("/app/savegames/save-1/finance/free-agency");
    expect(action.tone).toBe("warning");
  });

  it("prioritizes Gameplan preparation over team needs when week state is READY", () => {
    const nextMatch = selectNextDashboardMatch(baseSeason, baseTeam.id);
    const action = buildDashboardAction({
      saveGameId: "save-1",
      team: baseTeam,
      season: baseSeason,
      nextMatch,
      weekState: "READY",
    });

    expect(action.title).toBe("Gameplan vorbereiten");
    expect(action.href).toBe("/app/savegames/save-1/game/setup?matchId=manager-current");
    expect(action.label).toBe("Jetzt vorbereiten");
    expect(action.tone).toBe("positive");
  });

  it("prioritizes week preparation over roster needs in PRE_WEEK", () => {
    const nextMatch = selectNextDashboardMatch(baseSeason, baseTeam.id);
    const action = buildDashboardAction({
      saveGameId: "save-1",
      team: baseTeam,
      season: baseSeason,
      nextMatch,
      weekState: "PRE_WEEK",
    });

    expect(action.title).toBe("Woche vorbereiten");
    expect(action.href).toBeNull();
    expect(action.label).toBe("Woche vorbereiten");
    expect(action.message).toContain("Du bist GM");
    expect(action.tone).toBe("positive");
  });


  it("creates a match action when the roster has no active needs", () => {
    const team: TeamDetail = {
      ...baseTeam,
      teamNeeds: [],
    };
    const nextMatch = selectNextDashboardMatch(baseSeason, team.id);

    const action = buildDashboardAction({
      saveGameId: "save-1",
      team,
      season: baseSeason,
      nextMatch,
    });

    expect(action.title).toBe("Naechstes Spiel vorbereiten");
    expect(action.href).toBe("/app/savegames/save-1/game/setup?matchId=manager-current");
    expect(action.label).toBe("Zum Spiel");
    expect(action.tone).toBe("positive");
  });

  it("builds a prepare CTA only for PRE_WEEK", () => {
    const action = buildWeekLoopDashboardAction({
      gameHref: "/app/savegames/save-1/game/setup?matchId=match-1",
      weekState: "PRE_WEEK",
    });

    expect(action.kind).toBe("prepare");
    expect(action.href).toBeNull();
    expect(action.label).toBe("Woche vorbereiten");
  });

  it("explains weekly plan effects and development focus in PRE_WEEK", () => {
    const feedback = buildWeekLoopFeedbackItems({
      developmentFocusCount: 2,
      weekState: "PRE_WEEK",
    });

    expect(feedback.map((item) => item.label)).toEqual([
      "Weekly Plan",
      "Player Progression",
      "Fatigue & Injuries",
    ]);
    expect(feedback[0]?.message).toContain("Recovery senkt Fatigue");
    expect(feedback[1]?.message).toContain("2 Fokus-Spieler");
  });

  it("routes READY state toward Game Setup instead of preparing again", () => {
    const action = buildWeekLoopDashboardAction({
      gameHref: "/app/savegames/save-1/game/setup?matchId=match-1",
      weekState: "READY",
    });

    expect(action.kind).toBe("game-setup");
    expect(action.href).toBe("/app/savegames/save-1/game/setup?matchId=match-1");
    expect(action.label).toBe("Gameplan vorbereiten");
  });

  it("creates an advance-week CTA for POST_GAME", () => {
    const action = buildWeekLoopDashboardAction({
      gameHref: "/app/savegames/save-1/game/report?matchId=match-1",
      weekState: "POST_GAME",
    });

    expect(action.kind).toBe("advance-week");
    expect(action.href).toBeNull();
    expect(action.label).toBe("Naechste Woche");
  });

  it("maps week states to command-center badge tones", () => {
    expect(getDashboardWeekStateTone("PRE_WEEK")).toBe("warning");
    expect(getDashboardWeekStateTone("READY")).toBe("success");
    expect(getDashboardWeekStateTone("GAME_RUNNING")).toBe("active");
    expect(getDashboardWeekStateTone("POST_GAME")).toBe("success");
  });

  it("builds quick actions with visible disabled reasons instead of dead links", () => {
    const nextMatch = selectNextDashboardMatch(baseSeason, baseTeam.id);
    const actions = buildDashboardQuickActions({
      freeAgencyHref: null,
      matchHref: "/app/savegames/save-1/game/setup?matchId=manager-current",
      nextMatch,
      seasonHref: "/app/savegames/save-1/league",
      team: baseTeam,
      teamHref: "/app/savegames/save-1/team",
      weekState: "PRE_WEEK",
    });

    expect(actions.find((action) => action.title === "Week Flow")?.href).toBe("#week-loop");
    expect(actions.find((action) => action.title === "Game Preview")?.href).toBeNull();
    expect(actions.find((action) => action.title === "Game Preview")?.disabledReason).toContain(
      "Zuerst",
    );
    expect(actions.find((action) => action.title === "Roster Value")?.disabledReason).toContain(
      "usergesteuertes Team",
    );
  });

  it("builds decision feedback items with explicit derived and fixture sources", () => {
    const action = buildDashboardAction({
      saveGameId: "save-1",
      team: baseTeam,
      season: baseSeason,
      nextMatch: selectNextDashboardMatch(baseSeason, baseTeam.id),
      weekState: "READY",
    });
    const items = buildDashboardDecisionFeedbackItems({
      action,
      team: baseTeam,
      weekState: "READY",
    });

    expect(items.map((item) => item.source)).toContain("Derived");
    expect(items.map((item) => item.source)).toContain("UI-Fixture");
    expect(items.every((item) => item.title && item.reason && item.context)).toBe(true);
    expect(items.find((item) => item.title === "OL Value Signal")?.impact).toBe("neutral");
  });

  it("builds decision feedback history from recent roster actions", () => {
    const action = buildDashboardAction({
      saveGameId: "save-1",
      team: baseTeam,
      season: baseSeason,
      nextMatch: selectNextDashboardMatch(baseSeason, baseTeam.id),
      weekState: "READY",
    });
    const items = buildDashboardDecisionFeedbackItems({
      action,
      decisionEvents: [
        {
          id: "event-1",
          type: "DEPTH_CHART",
          title: "Depth Chart Reihenfolge angepasst",
          description:
            "Casey Starter: WR #2 -> #1 · Positionsstaerke 74 -> 82 (+8) · Bewertung: Passing leicht verbessert.",
          occurredAt: new Date("2026-09-01T12:00:00Z"),
          playerName: "Casey Starter",
        },
        {
          id: "event-2",
          type: "RELEASE",
          title: "Aus dem Kader entlassen",
          description: "Cap Savings: 1000000 USD. Dead Cap: 0 USD.",
          occurredAt: new Date("2026-09-01T11:00:00Z"),
          playerName: "Riley Cut",
        },
      ],
      team: baseTeam,
      weekState: "READY",
    });

    expect(items.map((item) => item.source)).toContain("Action");
    expect(items.map((item) => item.source)).not.toContain("UI-Fixture");
    expect(items.find((item) => item.title === "Lineup geändert")?.impact).toBe("positive");
    expect(items.find((item) => item.title === "Lineup geändert")?.reason).toBe(
      "Passing leicht verbessert",
    );
    expect(items.find((item) => item.title === "Spieler entlassen")?.impact).toBe("positive");
  });

  it("adds a post-game lineup retrospective from the latest completed result", () => {
    const action = buildDashboardAction({
      saveGameId: "save-1",
      team: baseTeam,
      season: baseSeason,
      nextMatch: null,
      weekState: "POST_GAME",
    });
    const season: SeasonOverview = {
      ...baseSeason,
      matches: [
        ...baseSeason.matches,
        {
          id: "manager-completed",
          week: 2,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-12T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-c",
          awayTeamName: "Charlie",
          homeScore: 28,
          awayScore: 17,
        },
      ],
    };
    const items = buildDashboardDecisionFeedbackItems({
      action,
      season,
      team: {
        ...baseTeam,
        recentDecisionEvents: [
          {
            id: "event-1",
            type: "DEPTH_CHART",
            title: "Depth Chart Reihenfolge angepasst",
            description:
              "Casey Starter: WR #2 -> #1 - Positionsstaerke 74 -> 82 (+8) - Bewertung: Passing leicht verbessert.",
            occurredAt: new Date("2026-09-11T12:00:00Z"),
            playerName: "Casey Starter",
          },
        ],
      },
      weekState: "POST_GAME",
    });

    expect(items.find((item) => item.title === "Lineup Rueckblick")).toMatchObject({
      impact: "positive",
      reason: "Letzte Lineup-Aenderung hat sich im Ergebnis ausgezahlt.",
      source: "Derived",
    });
  });

  it("prioritizes next week loading over roster needs when week state is POST_GAME", () => {
    const action = buildDashboardAction({
      saveGameId: "save-1",
      team: baseTeam,
      season: baseSeason,
      nextMatch: selectNextDashboardMatch(baseSeason, baseTeam.id),
      weekState: "POST_GAME",
    });

    expect(action.title).toBe("Naechste Woche laden");
    expect(action.href).toBeNull();
    expect(action.label).toBe("Naechste Woche");
    expect(action.tone).toBe("positive");
  });

  it("recognizes rebuild milestones from rolling match history and young upside", () => {
    const season: SeasonOverview = {
      ...baseSeason,
      matches: [
        {
          id: "g1",
          week: 1,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-01T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-a",
          awayTeamName: "Alpha",
          homeScore: 7,
          awayScore: 35,
        },
        {
          id: "g2",
          week: 2,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-08T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-b",
          homeTeamName: "Beta",
          awayTeamId: "team-user",
          awayTeamName: "User Team",
          homeScore: 24,
          awayScore: 17,
        },
        {
          id: "g3",
          week: 3,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-15T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-c",
          awayTeamName: "Charlie",
          homeScore: 21,
          awayScore: 20,
        },
        {
          id: "g4",
          week: 4,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-22T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-d",
          awayTeamName: "Delta",
          homeScore: 24,
          awayScore: 20,
        },
      ],
    };
    const team: TeamDetail = {
      ...baseTeam,
      overallRating: 70,
      players: [youngPlayer],
    };

    const state = buildRebuildProgressState({ season, team });

    expect(state.metrics.find((metric) => metric.label === "Team Overall")?.value).toBe("70");
    expect(state.metrics.find((metric) => metric.label === "Recent PPG")?.value).toBe("17.3");
    expect(state.milestones.find((milestone) => milestone.title === "Erstes knappes Spiel erreicht")?.status).toBe("achieved");
    expect(state.milestones.find((milestone) => milestone.title === "Junger Kern mit Upside")?.status).toBe("achieved");
    expect(state.milestones.find((milestone) => milestone.title === "Ueber Erwartung gespielt")?.status).toBe("achieved");
  });

  it("recognizes form streaks and a tough upcoming stretch", () => {
    const season: SeasonOverview = {
      ...baseSeason,
      week: 5,
      standings: [
        {
          teamId: "team-user",
          name: "User Team",
          abbreviation: "USR",
          overallRating: 70,
          record: "1-3",
          pointsFor: 0,
          pointsAgainst: 0,
          touchdownsFor: 0,
          turnoversForced: 0,
          turnoversCommitted: 0,
          turnoverDifferential: 0,
          passingYards: 0,
          rushingYards: 0,
          sacks: 0,
          explosivePlays: 0,
          redZoneTrips: 0,
          redZoneTouchdowns: 0,
        },
        ...["team-e", "team-f", "team-g"].map((teamId, index) => ({
          teamId,
          name: `Opponent ${index + 1}`,
          abbreviation: `O${index + 1}`,
          overallRating: [82, 79, 74][index]!,
          record: "0-0",
          pointsFor: 0,
          pointsAgainst: 0,
          touchdownsFor: 0,
          turnoversForced: 0,
          turnoversCommitted: 0,
          turnoverDifferential: 0,
          passingYards: 0,
          rushingYards: 0,
          sacks: 0,
          explosivePlays: 0,
          redZoneTrips: 0,
          redZoneTouchdowns: 0,
        })),
      ],
      matches: [
        {
          id: "g1",
          week: 1,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-01T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-a",
          awayTeamName: "Alpha",
          homeScore: 31,
          awayScore: 10,
        },
        {
          id: "g2",
          week: 2,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-08T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-b",
          homeTeamName: "Beta",
          awayTeamId: "team-user",
          awayTeamName: "User Team",
          homeScore: 24,
          awayScore: 20,
        },
        {
          id: "g3",
          week: 3,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-15T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-c",
          awayTeamName: "Charlie",
          homeScore: 17,
          awayScore: 20,
        },
        {
          id: "g4",
          week: 4,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-22T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-d",
          homeTeamName: "Delta",
          awayTeamId: "team-user",
          awayTeamName: "User Team",
          homeScore: 21,
          awayScore: 17,
        },
        ...["team-e", "team-f", "team-g"].map((teamId, index) => ({
          id: `next-${index + 1}`,
          week: 5 + index,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date(`2026-10-0${index + 1}T18:00:00Z`),
          status: "SCHEDULED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: teamId,
          awayTeamName: `Opponent ${index + 1}`,
          homeScore: null,
          awayScore: null,
        })),
      ],
    };
    const state = buildTeamContextState({
      season,
      team: {
        ...baseTeam,
        overallRating: 70,
        teamNeeds: [],
      },
    });

    expect(state.streaks.find((streak) => streak.label === "Losing Streak")?.value).toBe("3 L");
    expect(state.streaks.find((streak) => streak.label === "Close Game Streak")?.value).toBe("3");
    expect(state.stretch.label).toBe("Tough Stretch");
    expect(state.stretch.value).toBe("78.3 avg OVR");
    expect(state.metrics.find((metric) => metric.label === "AP33/AP36 Signals")?.value).toBe("4");
  });

  it("shows team development progress across multiple weeks", () => {
    const season: SeasonOverview = {
      ...baseSeason,
      week: 7,
      matches: [
        {
          id: "g1",
          week: 1,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-01T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-a",
          awayTeamName: "Alpha",
          homeScore: 7,
          awayScore: 24,
        },
        {
          id: "g2",
          week: 2,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-08T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-b",
          awayTeamName: "Beta",
          homeScore: 10,
          awayScore: 24,
        },
        {
          id: "g3",
          week: 3,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-15T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-c",
          homeTeamName: "Charlie",
          awayTeamId: "team-user",
          awayTeamName: "User Team",
          homeScore: 31,
          awayScore: 14,
        },
        {
          id: "g4",
          week: 4,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-22T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-d",
          awayTeamName: "Delta",
          homeScore: 21,
          awayScore: 20,
        },
        {
          id: "g5",
          week: 5,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-29T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-e",
          homeTeamName: "Echo",
          awayTeamId: "team-user",
          awayTeamName: "User Team",
          homeScore: 20,
          awayScore: 20,
        },
        {
          id: "g6",
          week: 6,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-10-06T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-f",
          awayTeamName: "Foxtrot",
          homeScore: 24,
          awayScore: 21,
        },
      ],
    };
    const state = buildTeamDevelopmentState({
      season,
      team: {
        ...baseTeam,
        teamNeeds: [
          {
            positionCode: "CB",
            positionName: "Cornerback",
            starterAverage: 76,
            starterSchemeFit: 72,
            playerCount: 5,
            targetCount: 5,
            needScore: 2,
          },
        ],
        players: [
          {
            ...youngPlayer,
            id: "value-1",
            age: 25,
            positionCode: "CB",
            positionName: "Cornerback",
            positionOverall: 82,
            potentialRating: 85,
            schemeFitScore: 90,
            currentContract: {
              years: 2,
              yearlySalary: 2_000_000,
              signingBonus: 500_000,
              capHit: 2_500_000,
            },
          },
        ],
      },
    });

    expect(state.summary).toContain("verbessert");
    expect(state.indicators).toContainEqual(
      expect.objectContaining({ direction: "up", label: "Team insgesamt stabiler" }),
    );
    expect(state.indicators).toContainEqual(
      expect.objectContaining({ direction: "up", label: "Secondary verbessert" }),
    );
    expect(state.indicators).toContainEqual(
      expect.objectContaining({ direction: "up", label: "Value verbessert" }),
    );
  });

  it("keeps team development consistent for weak current signals", () => {
    const season: SeasonOverview = {
      ...baseSeason,
      matches: [
        {
          id: "g1",
          week: 1,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-01T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-a",
          awayTeamName: "Alpha",
          homeScore: 3,
          awayScore: 31,
        },
        {
          id: "g2",
          week: 2,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-08T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-b",
          homeTeamName: "Beta",
          awayTeamId: "team-user",
          awayTeamName: "User Team",
          homeScore: 28,
          awayScore: 10,
        },
      ],
    };
    const state = buildTeamDevelopmentState({
      season,
      team: {
        ...baseTeam,
        teamNeeds: [
          {
            positionCode: "WR",
            positionName: "Wide Receiver",
            starterAverage: 61,
            starterSchemeFit: 55,
            playerCount: 2,
            targetCount: 5,
            needScore: 9,
          },
        ],
        players: [],
      },
    });

    expect(state.indicators).toContainEqual(
      expect.objectContaining({ direction: "down", label: "Team verliert Boden" }),
    );
    expect(state.indicators).toContainEqual(
      expect.objectContaining({ direction: "down", label: "Offense weiterhin Schwachpunkt" }),
    );
    expect(state.indicators.find((indicator) => indicator.label === "Value noch unklar")?.direction).toBe("neutral");
  });

  it("keeps team development safe with missing or small teamsets", () => {
    const empty = buildTeamDevelopmentState({ season: null, team: null });
    const sparse = buildTeamDevelopmentState({
      season: baseSeason,
      team: {
        ...baseTeam,
        players: [],
        teamNeeds: [],
      },
    });

    expect(empty.indicators).toEqual([]);
    expect(empty.emptyMessage).toContain("Team-Entwicklung");
    expect(sparse.indicators).toHaveLength(3);
    expect(sparse.indicators.find((indicator) => indicator.label === "Value noch unklar")?.direction).toBe("neutral");
  });

  it("builds a clear team profile from existing roster and scheme data", () => {
    const player = (
      id: string,
      positionCode: string,
      positionName: string,
      positionOverall: number,
    ): TeamDetail["players"][number] => ({
      ...youngPlayer,
      id,
      fullName: id,
      positionCode,
      positionName,
      positionOverall,
      potentialRating: positionOverall,
      status: "ACTIVE",
    });
    const state = buildTeamProfileState({
      ...baseTeam,
      schemes: {
        ...baseTeam.schemes,
        offense: "West Coast Pass",
      },
      players: [
        player("qb", "QB", "Quarterback", 70),
        player("wr", "WR", "Wide Receiver", 71),
        player("rb", "RB", "Running Back", 69),
        player("cb", "CB", "Cornerback", 83),
        player("fs", "FS", "Free Safety", 82),
        player("dt", "DT", "Defensive Tackle", 81),
      ],
      teamNeeds: [],
    });

    expect(state.traits).toHaveLength(2);
    expect(state.traits.map((trait) => trait.label)).toEqual(["starke Defense", "unausgeglichen"]);
    expect(state.summary).toContain("starke Defense");
  });

  it("uses pass-oriented as a simple profile when it is not contradicted by team shape", () => {
    const state = buildTeamProfileState({
      ...baseTeam,
      schemes: {
        ...baseTeam.schemes,
        offense: "Spread Pass",
      },
      players: [
        {
          ...youngPlayer,
          id: "qb",
          positionCode: "QB",
          positionName: "Quarterback",
          positionOverall: 76,
          potentialRating: 78,
        },
        {
          ...youngPlayer,
          id: "wr",
          positionCode: "WR",
          positionName: "Wide Receiver",
          positionOverall: 77,
          potentialRating: 79,
        },
        {
          ...youngPlayer,
          id: "rb",
          positionCode: "RB",
          positionName: "Running Back",
          positionOverall: 71,
          potentialRating: 73,
        },
      ],
      teamNeeds: [],
    });

    expect(state.traits.map((trait) => trait.label)).toContain("passorientiert");
    expect(state.traits.map((trait) => trait.label)).not.toContain("laufstark");
  });

  it("keeps team profile stable for small teams", () => {
    const sparse = buildTeamProfileState({
      ...baseTeam,
      players: [],
      teamNeeds: [],
    });
    const missing = buildTeamProfileState(null);

    expect(sparse.traits).toHaveLength(1);
    expect(sparse.traits[0]?.label).toBe("ausgeglichen");
    expect(missing.traits).toEqual([]);
  });

  it("resets streaks correctly when a losing streak ends", () => {
    const season: SeasonOverview = {
      ...baseSeason,
      matches: [
        {
          id: "g1",
          week: 1,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-01T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-a",
          awayTeamName: "Alpha",
          homeScore: 13,
          awayScore: 20,
        },
        {
          id: "g2",
          week: 2,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-08T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-b",
          homeTeamName: "Beta",
          awayTeamId: "team-user",
          awayTeamName: "User Team",
          homeScore: 24,
          awayScore: 17,
        },
        {
          id: "g3",
          week: 3,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-15T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-c",
          awayTeamName: "Charlie",
          homeScore: 21,
          awayScore: 17,
        },
      ],
    };
    const state = buildTeamContextState({ season, team: baseTeam });

    expect(state.streaks[0]).toMatchObject({
      label: "Win Streak",
      value: "1 W",
    });
    expect(buildPostGameContextLine({
      season,
      teamId: "team-user",
      matchId: "g3",
    })).toBe("3rd close game in a row.");
  });

  it("keeps team context safe with sparse data", () => {
    const state = buildTeamContextState({ season: null, team: null });

    expect(state.streaks).toEqual([]);
    expect(state.stretch.label).toBe("Unknown Stretch");
    expect(buildPostGameContextLine({ season: null, teamId: "team-user", matchId: "g1" })).toBeNull();
  });

  it("does not create false positive trend milestones without enough comparison data", () => {
    const season: SeasonOverview = {
      ...baseSeason,
      matches: [
        {
          id: "g1",
          week: 1,
          kind: "REGULAR_SEASON",
          scheduledAt: new Date("2026-09-01T18:00:00Z"),
          status: "COMPLETED",
          homeTeamId: "team-user",
          homeTeamName: "User Team",
          awayTeamId: "team-a",
          awayTeamName: "Alpha",
          homeScore: 3,
          awayScore: 31,
        },
      ],
    };
    const state = buildRebuildProgressState({ season, team: baseTeam });

    expect(state.milestones.find((milestone) => milestone.title === "Offense-Trend steigt")?.status).toBe("locked");
    expect(state.milestones.find((milestone) => milestone.title === "Blowouts reduziert")?.status).toBe("locked");
    expect(state.milestones.find((milestone) => milestone.title === "Erstes knappes Spiel erreicht")?.status).toBe("in-progress");
  });

  it("keeps rebuild state safe when season or team data is missing", () => {
    const state = buildRebuildProgressState({ season: null, team: null });

    expect(state.metrics).toEqual([]);
    expect(state.milestones).toEqual([]);
    expect(state.emptyMessage).toContain("Rebuild-Fortschritt");
  });

  it("keeps sparse dashboard team and season records actionable", () => {
    const sparseSeason = {
      id: "season-1",
      phase: "REGULAR_SEASON",
      week: 1,
    } as SeasonOverview;
    const sparseTeam = {
      id: "team-user",
      managerControlled: true,
      name: "User Team",
    } as TeamDetail;
    const action = buildDashboardAction({
      saveGameId: "save-1",
      season: sparseSeason,
      team: sparseTeam,
      nextMatch: selectNextDashboardMatch(sparseSeason, sparseTeam.id),
    });

    expect(action.title).toBe("Saisonstatus pruefen");
    expect(action.href).toBe("/app/savegames/save-1/league");
  });
});
