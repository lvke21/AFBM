import { describe, expect, it } from "vitest";

import type { TeamDetail } from "@/modules/teams/domain/team.types";

import { buildPostGameReportState, type PostGameReportMatch } from "./post-game-report-model";

function createMatch(overrides: Partial<PostGameReportMatch> = {}): PostGameReportMatch {
  return {
    id: "match-1",
    kind: "REGULAR_SEASON",
    scheduledAt: new Date("2026-09-06T18:00:00Z"),
    simulationCompletedAt: new Date("2026-09-06T20:00:00Z"),
    simulationStartedAt: new Date("2026-09-06T18:10:00Z"),
    status: "COMPLETED",
    stadiumName: "Harbor Field",
    summary: "Boston gewann ueber Ballkontrolle und Red-Zone-Effizienz.",
    week: 1,
    homeTeam: {
      abbreviation: "BOS",
      managerControlled: true,
      name: "Boston Guardians",
      overallRating: 78,
      score: 27,
      stats: {
        explosivePlays: 5,
        firstDowns: 21,
        passingYards: 241,
        redZoneTouchdowns: 3,
        redZoneTrips: 4,
        rushingYards: 145,
        totalYards: 386,
        turnovers: 1,
      },
    },
    awayTeam: {
      abbreviation: "NYT",
      managerControlled: false,
      name: "New York Titans",
      overallRating: 72,
      score: 20,
      stats: {
        explosivePlays: 3,
        firstDowns: 18,
        passingYards: 220,
        redZoneTouchdowns: 1,
        redZoneTrips: 3,
        rushingYards: 111,
        totalYards: 331,
        turnovers: 2,
      },
    },
    leaders: {
      passing: {
        fieldGoalsMade: 0,
        fullName: "Alex Carter",
        interceptions: 0,
        passingYards: 241,
        positionCode: "QB",
        puntsInside20: 0,
        receivingYards: 0,
        rushingYards: 12,
        sacks: 0,
        tackles: 0,
        teamAbbreviation: "BOS",
      },
    },
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
        sequence: 1,
        startedScore: "0-0",
        summary: "Boston beendet den Drive mit einem Touchdown.",
        totalYards: 74,
        turnover: false,
      },
      {
        defenseTeamAbbreviation: "BOS",
        endedScore: "7-0",
        offenseTeamAbbreviation: "NYT",
        passAttempts: 3,
        phaseLabel: "Q2",
        plays: 5,
        pointsScored: 0,
        primaryDefenderName: "Mason Reed",
        primaryPlayerName: null,
        redZoneTrip: false,
        resultType: "INTERCEPTION",
        rushAttempts: 2,
        sequence: 2,
        startedScore: "7-0",
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

function createTeamPlayer(
  overrides: Partial<TeamDetail["players"][number]> = {},
): TeamDetail["players"][number] {
  return {
    age: 24,
    archetypeName: "Balanced",
    captainFlag: false,
    currentContract: {
      capHit: 2_000_000,
      signingBonus: 500_000,
      yearlySalary: 1_500_000,
      years: 3,
    },
    depthChartSlot: 1,
    detailRatings: [],
    developmentFocus: false,
    fatigue: 30,
    fullName: "Test Player",
    heightCm: 188,
    id: "player-1",
    injuryName: null,
    injuryStatus: "HEALTHY",
    keyAttributes: {
      awareness: 70,
      coverageRange: 70,
      discipline: 70,
      durability: 70,
      hands: 70,
      kickConsistency: 70,
      leadership: 70,
      linebackerCoverage: 70,
      linebackerManCoverage: 70,
      linebackerZoneCoverage: 70,
      mobility: 70,
      returnVision: 70,
      snapAccuracy: 70,
      snapVelocity: 70,
      speed: 70,
      strength: 70,
    },
    mentalOverall: 70,
    morale: 60,
    physicalOverall: 70,
    positionCode: "QB",
    positionGroupName: "Offense",
    positionName: "Quarterback",
    positionOverall: 72,
    potentialRating: 78,
    rosterStatus: "STARTER",
    schemeFitName: "Fit",
    schemeFitScore: 65,
    seasonLine: {
      fieldGoalsAttempted: 0,
      fieldGoalsMade: 0,
      gamesPlayed: 1,
      interceptions: 0,
      passesDefended: 0,
      passingInterceptions: 0,
      passingTouchdowns: 0,
      passingYards: 0,
      punts: 0,
      puntsInside20: 0,
      receivingTouchdowns: 0,
      receivingYards: 0,
      receptions: 0,
      receptionsAllowed: 0,
      returnFumbles: 0,
      returnTouchdowns: 0,
      returnYards: 0,
      rushingTouchdowns: 0,
      rushingYards: 0,
      sacks: 0,
      tackles: 0,
      targetsAllowed: 0,
      yardsAllowed: 0,
    },
    secondaryPositionCode: null,
    secondaryPositionName: null,
    status: "ACTIVE",
    weightKg: 100,
    yearsPro: 2,
    ...overrides,
  };
}

describe("buildPostGameReportState", () => {
  it("builds a compact final score, stat comparison and key moments", () => {
    const state = buildPostGameReportState({
      match: createMatch(),
      saveGameId: "save-1",
      weekState: "POST_GAME",
    });

    expect(state.hasFinalScore).toBe(true);
    expect(state.scoreHeader.resultLabel).toBe("Boston Guardians gewinnt");
    expect(state.scoreHeader.contextMetrics.map((metric) => metric.value)).toContain("386:331");
    expect(state.stats.find((row) => row.label === "Turnovers")?.edge).toBe("home");
    expect(state.stats.find((row) => row.label === "Turnovers")?.sourceLabel).toBe("Data");
    expect(state.keyMoments.map((moment) => moment.highlight)).toEqual(["touchdown", "turnover"]);
    expect(state.causality.gameSummary).toMatchObject({
      label: "Game Summary",
      sourceLabel: "Data",
      title: "Score + Verlauf",
      value: "27:20",
    });
    expect(state.causality.gameSummary.description).toContain("BOS gewann 27:20");
    expect(state.causality.keyFactor).toMatchObject({
      label: "Key Factor",
      sourceLabel: "Data",
      title: "Turnovers",
      value: "1 vs 2",
    });
    expect(state.causality.keyFactor.description).toContain("Turnover");
    expect(state.causality.turningPoint).toMatchObject({
      label: "Turning Point",
      sourceLabel: "Data",
      title: "Q2 · Drive 2",
      value: "INTERCEPTION",
    });
    expect(state.causality.nextWeek.label).toBe("What it means next week");
    expect(state.nextStep.action?.kind).toBe("advance-week");
    expect(state.motivationGoal).toMatchObject({
      actionHref: "/app/savegames/save-1/team/depth-chart",
      title: "Red Zone schaerfen",
    });
    expect(state.consequences.decider.title).toBe("Ballverluste kontrolliert");
    expect(state.consequences.nextWeek.title).toBe("Fokus in die naechste Woche mitnehmen");
  });

  it("creates one clear post-game motivation goal from the biggest fix", () => {
    const turnoverState = buildPostGameReportState({
      match: createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          stats: {
            ...createMatch().homeTeam.stats!,
            turnovers: 3,
          },
        },
      }),
      saveGameId: "save-1",
      weekState: "POST_GAME",
    });

    expect(turnoverState.motivationGoal.title).toBe("Turnovers reduzieren");
    expect(turnoverState.motivationGoal.actionHref).toBe("/app/savegames/save-1/team/depth-chart");

    const defenseState = buildPostGameReportState({
      match: createMatch({
        awayTeam: {
          ...createMatch().awayTeam,
          stats: {
            ...createMatch().awayTeam.stats!,
            passingYards: 220,
            totalYards: 460,
          },
        },
        homeTeam: {
          ...createMatch().homeTeam,
          stats: {
            ...createMatch().homeTeam.stats!,
            passingYards: 260,
            redZoneTouchdowns: 2,
            redZoneTrips: 2,
            totalYards: 360,
            turnovers: 0,
          },
        },
      }),
      saveGameId: "save-1",
      weekState: "POST_GAME",
    });

    expect(defenseState.motivationGoal.title).toBe("Defense verbessern");
    expect(defenseState.motivationGoal.actionHref).toBe("/app/savegames/save-1/team/roster");
  });

  it("selects player of the game from existing leaders", () => {
    const state = buildPostGameReportState({
      match: createMatch(),
      saveGameId: "save-1",
      weekState: "POST_GAME",
    });

    expect(state.playerOfGame.name).toBe("Alex Carter");
    expect(state.playerOfGame.statLine).toContain("241 Pass Yards");
    expect(state.playerOfGame.isFallback).toBe(false);
  });

  it("adds derived lineup outcome and key moment context when a depth-chart change preceded the game", () => {
    const state = buildPostGameReportState({
      match: createMatch(),
      saveGameId: "save-1",
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
      weekState: "POST_GAME",
    });

    expect(state.teamImpact[0]).toMatchObject({
      label: "Aufstellungseffekt",
      sourceLabel: "Derived",
      value: "Ausgezahlt",
    });
    expect(state.teamImpact[0]?.description).toContain(
      "Neue Lineup-Entscheidung hatte Einfluss auf das Spiel",
    );
    expect(state.keyMoments[0]?.lineupContext).toContain("Alex Carter");
    expect(state.consequences.nextWeek.title).toBe("Lineup erst einmal bestaetigen");
  });

  it("surfaces run game, receiver matchup and defense pressure as separate position impacts", () => {
    const state = buildPostGameReportState({
      match: createMatch(),
      saveGameId: "save-1",
      teamDetail: createTeamDetail({
        players: [
          createTeamPlayer({ fullName: "Power Back", id: "rb-1", positionCode: "RB", positionOverall: 76 }),
          createTeamPlayer({ fullName: "Wide Target", id: "wr-1", positionCode: "WR", positionOverall: 74 }),
          createTeamPlayer({ fullName: "Edge Rusher", id: "le-1", positionCode: "LE", positionOverall: 75 }),
        ],
      }),
      weekState: "POST_GAME",
    });

    expect(state.teamImpact.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Run Game", "WR Matchup", "Defense Pressure"]),
    );
    expect(state.teamImpact.find((item) => item.label === "Run Game")?.value).toBe("Run Game stark");
    expect(state.teamImpact.find((item) => item.label === "WR Matchup")?.value).toBe("WR Matchup Vorteil");
    expect(state.teamImpact.find((item) => item.label === "Defense Pressure")?.value).toBe("Defense Pressure schwach");
  });

  it("surfaces post-game attention from fatigue, contracts and development signals", () => {
    const fatiguedState = buildPostGameReportState({
      match: createMatch(),
      saveGameId: "save-1",
      teamDetail: createTeamDetail({
        players: [
          createTeamPlayer({
            fatigue: 76,
            fullName: "Tired Starter",
            id: "tired",
            positionCode: "RB",
          }),
        ],
      }),
      weekState: "POST_GAME",
    });

    expect(fatiguedState.consequences.attention.title).toBe("RB: Belastung pruefen");
    expect(fatiguedState.consequences.attention.href).toBe("/app/savegames/save-1/players/tired");

    const contractState = buildPostGameReportState({
      match: createMatch(),
      saveGameId: "save-1",
      teamDetail: createTeamDetail({
        contractOutlook: {
          activeCapCommitted: 10_000_000,
          expiringCap: 5_000_000,
          expiringPlayers: [
            {
              capHit: 5_000_000,
              fullName: "Expiring Guard",
              id: "guard",
              positionCode: "G",
              years: 1,
            },
          ],
        },
      }),
      weekState: "POST_GAME",
    });

    expect(contractState.consequences.attention.title).toBe("G: Vertrag laeuft aus");
    expect(contractState.consequences.attention.href).toBe("/app/savegames/save-1/team/contracts");

    const developmentState = buildPostGameReportState({
      match: createMatch(),
      saveGameId: "save-1",
      teamDetail: createTeamDetail({
        players: [
          createTeamPlayer({
            fullName: "Young Corner",
            id: "young-cb",
            positionCode: "CB",
            positionOverall: 68,
            potentialRating: 78,
          }),
        ],
      }),
      weekState: "POST_GAME",
    });

    expect(developmentState.consequences.attention.title).toBe("CB: Entwicklung aktivieren");
    expect(developmentState.consequences.attention.href).toBe("/app/savegames/save-1/development");
  });

  it("keeps preview reports stable without scores, stats or leaders", () => {
    const state = buildPostGameReportState({
      match: createMatch({
        awayTeam: {
          abbreviation: "NYT",
          name: "New York Titans",
          score: null,
          stats: null,
        },
        drives: [],
        homeTeam: {
          abbreviation: "BOS",
          managerControlled: true,
          name: "Boston Guardians",
          score: null,
          stats: null,
        },
        leaders: {},
        status: "SCHEDULED",
      }),
      saveGameId: "save-1",
      weekState: "PRE_WEEK",
    });

    expect(state.hasFinalScore).toBe(false);
    expect(state.scoreHeader.scoreLine).toBe("BOS - : - NYT");
    expect(state.scoreHeader.contextMetrics.find((metric) => metric.label === "Red Zone TD")?.value).toBe("-");
    expect(state.playerOfGame.isFallback).toBe(true);
    expect(state.keyMoments).toEqual([]);
    expect(state.stats.every((row) => row.sourceLabel === "Fallback")).toBe(true);
    expect(state.teamImpact[0]?.sourceLabel).toBe("Fallback");
    expect(state.causality.gameSummary.sourceLabel).toBe("Fallback");
    expect(state.causality.keyFactor.description).toContain("Noch kein belastbarer Hauptfaktor");
    expect(state.causality.turningPoint.description).toContain("vermeidet deshalb eine erfundene");
    expect(state.consequences.decider.title).toBe("Ergebnis noch offen");
  });
});
