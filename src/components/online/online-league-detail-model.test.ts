import { describe, expect, it } from "vitest";

import { ONLINE_MVP_TEAM_POOL } from "@/lib/online/online-league-constants";
import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
  OnlineLeague,
} from "@/lib/online/online-league-types";

import {
  getOnlineLeaguePriceChangeHint,
  toOnlineLeagueDetailState,
} from "./online-league-detail-model";

function testRoster(playerId = "player-1"): OnlineContractPlayer[] {
  return [
    {
      playerId,
      playerName: "A. Starter",
      position: "QB",
      age: 25,
      overall: 80,
      potential: 84,
      developmentPath: "solid",
      developmentProgress: 0,
      xFactors: [],
      contract: {
        salaryPerYear: 1_000_000,
        totalValue: 1_000_000,
        capHitPerYear: 1_000_000,
        signingBonus: 0,
        deadCapPerYear: 0,
        contractType: "regular",
        yearsRemaining: 1,
        guaranteedMoney: 0,
      },
      status: "active",
    },
  ];
}

function testDepthChart(playerId = "player-1"): OnlineDepthChartEntry[] {
  return [
    {
      backupPlayerIds: [],
      position: "QB",
      starterPlayerId: playerId,
      updatedAt: "2026-05-02T10:00:00.000Z",
    },
  ];
}

describe("toOnlineLeagueDetailState", () => {
  it("builds detail state with player list and current user marker", () => {
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T08:00:00.000Z",
        currentTeamId: "",
        draftOrder: ["bos-guardians"],
        leagueId: "global-test-league",
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T07:00:00.000Z",
        status: "completed",
      },
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: true,
          readyAt: "2026-04-29T19:05:00.000Z",
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
          weeklyTrainingPlans: [
            {
              planId: "plan-1",
              leagueId: "global-test-league",
              teamId: "bos-guardians",
              submittedByUserId: "user-1",
              season: 1,
              week: 1,
              intensity: "normal",
              primaryFocus: "balanced",
              riskTolerance: "medium",
              youngPlayerPriority: 50,
              veteranMaintenance: 50,
              submittedAt: "2026-04-29T19:04:00.000Z",
              source: "gm_submitted",
            },
          ],
        },
        {
          userId: "user-2",
          username: "Coach_5678",
          joinedAt: "2026-04-29T19:01:00.000Z",
          teamId: "nyt-titans",
          teamName: "New York Titans",
          readyForWeek: false,
          contractRoster: testRoster("player-2"),
          depthChart: testDepthChart("player-2"),
        },
      ],
    };

    expect(
      toOnlineLeagueDetailState(league, { userId: "user-2", username: "Coach_5678" }),
    ).toMatchObject({
      status: "found",
      name: "Global Test League",
      statusLabel: "Saison läuft",
      currentWeekLabel: "Woche 1",
      draftStatusLabel: "Draft abgeschlossen",
      playerCountLabel: "2/16",
      readyProgressLabel: "1/2 aktive Manager bereit",
      allPlayersReady: false,
      allPlayersReadyLabel: null,
      ownTeamName: "New York Titans",
      ownCoachName: "Coach_5678",
      jobSecurityLabel: "72/100 · stable",
      currentUserReady: false,
      readyActionDisabledReason: null,
      firstSteps: {
        progressLabel: "1 von 3 erledigt",
        completedCount: 1,
        totalCount: 3,
        items: [
          {
            id: "team",
            label: "Team ansehen",
            completed: true,
            statusLabel: "Erledigt",
          },
          {
            id: "training",
            label: "Training prüfen oder setzen",
            completed: false,
            statusLabel: "Noch kein Manager-Plan",
          },
          {
            id: "ready",
            label: "Bereit für die Woche klicken",
            completed: false,
            statusLabel: "Noch nicht bereit",
          },
        ],
      },
      nextMatchLabel: "Spielplan wird im nächsten Schritt erstellt",
      waitingLabel: "Warte auf andere Spieler",
      weekFlow: {
        title: "Ligawoche",
        weekLabel: "Woche 1",
          phaseLabel: "Woche offen",
          statusLabel: "Wartet auf Bereitmeldungen",
          simulationStatusLabel: "Simulation bleibt gesperrt, bis alle aktiven Teams bereit sind.",
          playerReadyStatusLabel: "Du bist noch nicht bereit für Woche 1.",
          waitingStatusLabel: "Prüfe Team und Training. Setze dich bereit, wenn deine Woche passt.",
          adminProgressLabel:
            "Sobald alle aktiven Manager bereit sind, kann der Admin die Woche simulieren.",
          nextMatchLabel: "Spielplan wird im nächsten Schritt erstellt",
          nextActionCtaLabel: "Bereit für die aktuelle Woche setzen.",
        showStartWeekButton: false,
        startWeekButtonLabel: "Admin-Simulation bereit",
        startWeekHint:
          "Der Admin schaltet die Liga weiter. Danach beginnt die nächste Woche mit zurückgesetztem Bereit-Status.",
      },
      leagueRules: {
        sourceLabel: "Standardregeln",
        items: [
          "Der Admin schaltet Wochen weiter.",
          "Spieler setzen sich pro Woche auf bereit.",
          "Bei längerer Inaktivität kann der Admin ein Team vakant setzen.",
          "Regeln können je Liga variieren.",
        ],
      },
      players: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          teamStatus: "occupied",
          readyForWeek: true,
          readyAt: "2026-04-29T19:05:00.000Z",
          readyLabel: "Bereit",
          isCurrentUser: false,
        },
        {
          userId: "user-2",
          username: "Coach_5678",
          joinedAt: "2026-04-29T19:01:00.000Z",
          teamId: "nyt-titans",
          teamName: "New York Titans",
          teamStatus: "occupied",
          readyForWeek: false,
          readyLabel: "Nicht bereit",
          isCurrentUser: true,
        },
      ],
      vacantTeams: [],
    });
  });

  it("treats an assigned team without active players as missing roster state", () => {
    const league: OnlineLeague = {
      id: "no-roster-league",
      name: "No Roster League",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      users: [
        {
          userId: "user-no-roster",
          username: "NoRosterGM",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
          contractRoster: [],
          depthChart: [],
        },
      ],
    };

    expect(
      toOnlineLeagueDetailState(league, {
        userId: "user-no-roster",
        username: "NoRosterGM",
      }),
    ).toMatchObject({
      status: "found",
      roster: null,
      readyActionDisabledReason: "Bereit gesperrt: Dein Team hat kein Roster.",
    });
  });

  it("shows concrete bereit blockers for unplayable rosters and invalid depth charts", () => {
    const baseLeague: OnlineLeague = {
      id: "ready-ui-blockers-league",
      name: "Bereit UI Blockers League",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
      ],
    };
    const currentUser = { userId: "user-1", username: "Coach_1234" };

    expect(
      toOnlineLeagueDetailState(
        {
          ...baseLeague,
          users: [
            {
              ...baseLeague.users[0],
              contractRoster: testRoster().map((player) => ({ ...player, overall: 0 })),
              depthChart: [],
            },
          ],
        },
        currentUser,
      ),
    ).toMatchObject({
      readyActionDisabledReason: "Bereit gesperrt: Dein Roster ist nicht simulationsfähig.",
    });
    expect(
      toOnlineLeagueDetailState(
        {
          ...baseLeague,
          users: [
            {
              ...baseLeague.users[0],
              depthChart: testDepthChart("missing-player"),
            },
          ],
        },
        currentUser,
      ),
    ).toMatchObject({
      readyActionDisabledReason:
        "Bereit gesperrt: Depth Chart ist ungültig. Bitte prüfe Starter und Backups.",
    });
  });

  it("surfaces lifecycle conflicts instead of showing a happy ready path", () => {
    const league: OnlineLeague = {
      id: "conflicting-results-league",
      name: "Conflicting Results League",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 2),
      currentWeek: 1,
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T08:00:00.000Z",
        currentTeamId: "",
        draftOrder: ["bos-guardians"],
        leagueId: "conflicting-results-league",
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T07:00:00.000Z",
        status: "completed",
      },
      matchResults: [
        {
          awayScore: 17,
          awayStats: {
            firstDowns: 10,
            passingYards: 180,
            rushingYards: 90,
            totalYards: 270,
            turnovers: 1,
          },
          awayTeamId: "nyt-titans",
          awayTeamName: "New York Titans",
          createdAt: "2026-05-02T11:00:00.000Z",
          homeScore: 24,
          homeStats: {
            firstDowns: 14,
            passingYards: 220,
            rushingYards: 110,
            totalYards: 330,
            turnovers: 0,
          },
          homeTeamId: "bos-guardians",
          homeTeamName: "Boston Guardians",
          matchId: "match-1",
          season: 1,
          simulatedAt: "2026-05-02T11:00:00.000Z",
          simulatedByUserId: "admin-1",
          status: "completed",
          tiebreakerApplied: false,
          week: 1,
          winnerTeamId: "bos-guardians",
          winnerTeamName: "Boston Guardians",
        },
      ],
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: true,
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        lifecyclePhase: "blockedConflict",
        readyActionDisabledReason:
          "s1-w1 hat Completion-Signale ohne kanonischen completedWeeks-Eintrag.",
        weekFlow: {
          phaseLabel: "Statuskonflikt blockiert",
          simulationStatusLabel:
            "s1-w1 hat Completion-Signale ohne kanonischen completedWeeks-Eintrag.",
          showStartWeekButton: false,
        },
      });
  });

  it("keeps own team empty when the current user is not a league member", () => {
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "waiting",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      users: [],
    };

    expect(
      toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }),
    ).toMatchObject({
      status: "found",
      ownTeamName: null,
      ownCoachName: null,
      currentUserReady: false,
      readyActionDisabledReason: "Kein Manager-Team verbunden.",
      playerCountLabel: "0/16",
      readyProgressLabel: "0/0 aktive Manager bereit",
      weekFlow: {
        statusLabel: "Wartet auf Bereitmeldungen",
        playerReadyStatusLabel: "Du hast in dieser Liga noch kein Team.",
        nextMatchLabel: "Spielplan wird im nächsten Schritt erstellt",
        showStartWeekButton: false,
      },
    });
  });

  it("uses the selected team display name when present", () => {
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T08:00:00.000Z",
        currentTeamId: "",
        draftOrder: ["bos-guardians"],
        leagueId: "global-test-league",
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T07:00:00.000Z",
        status: "completed",
      },
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "zurich-forge",
          teamName: "Forge",
          cityId: "zurich",
          cityName: "Zürich",
          teamNameId: "forge",
          teamCategory: "identity_city",
          teamDisplayName: "Zürich Forge",
          readyForWeek: false,
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        status: "found",
        ownTeamName: "Zürich Forge",
        players: [
          {
            teamName: "Zürich Forge",
          },
        ],
      });
  });

  it("detects when all current members are bereit", () => {
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T08:00:00.000Z",
        currentTeamId: "",
        draftOrder: ["bos-guardians"],
        leagueId: "global-test-league",
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T07:00:00.000Z",
        status: "completed",
      },
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: true,
          readyAt: "2026-04-29T19:05:00.000Z",
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        status: "found",
        allPlayersReady: true,
        allPlayersReadyLabel: "Alle aktiven Manager sind bereit. Der Admin kann die Woche simulieren.",
        currentUserReady: true,
        readyActionDisabledReason: null,
        readyProgressLabel: "1/1 aktive Manager bereit",
        weekFlow: {
          phaseLabel: "Simulation möglich",
          statusLabel: "Alle aktiven Manager bereit",
          simulationStatusLabel: "Alle aktiven Teams sind bereit. Der Admin kann simulieren.",
          playerReadyStatusLabel: "Du bist bereit für Woche 1.",
          waitingStatusLabel: "Alle aktiven Manager sind bereit. Es wartet nur noch der Liga-Admin.",
          adminProgressLabel:
            "Sobald alle aktiven Manager bereit sind, kann der Admin die Woche simulieren.",
          nextMatchLabel: "Spielplan wird im nächsten Schritt erstellt",
          nextActionCtaLabel:
            "Alle aktiven Manager sind bereit. Der Liga-Admin kann die Woche simulieren.",
          showStartWeekButton: true,
          startWeekButtonLabel: "Admin-Simulation bereit",
          startWeekHint:
            "Der Admin schaltet die Liga weiter. Danach beginnt die nächste Woche mit zurückgesetztem Bereit-Status.",
        },
      });
  });

  it("derives current user readiness from the active bereit-state participants", () => {
    const league: OnlineLeague = {
      id: "inactive-ready-league",
      name: "Inactive Bereit League",
      maxUsers: 16,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 1),
      currentWeek: 1,
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: true,
          jobSecurity: {
            score: 0,
            status: "fired",
            lastUpdatedWeek: 1,
            lastUpdatedSeason: 1,
            gmPerformanceHistory: [],
          },
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        currentUserReady: false,
        readyActionDisabledReason: "Dieser Manager ist für die aktuelle Woche nicht aktiv.",
        readyProgressLabel: "0/0 aktive Manager bereit",
        firstSteps: {
          items: [
            {},
            {},
            {
              id: "ready",
              completed: false,
              statusLabel: "Noch nicht bereit",
            },
          ],
        },
        weekFlow: {
          playerReadyStatusLabel: "Du bist noch nicht bereit für Woche 1.",
        },
      });
  });

  it("shows completed week results and prepares the next bereit cycle", () => {
    const league: OnlineLeague = {
      id: "completed-week-league",
      name: "Completed Woche League",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 2),
      currentWeek: 2,
      currentSeason: 1,
      weekStatus: "pre_week",
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T07:00:00.000Z",
        currentTeamId: "",
        draftOrder: ["bos-guardians", "nyt-titans"],
        leagueId: "completed-week-league",
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T06:00:00.000Z",
        status: "completed",
      },
      completedWeeks: [
        {
          weekKey: "s1-w1",
          season: 1,
          week: 1,
          status: "completed",
          resultMatchIds: ["match-1"],
          completedAt: "2026-05-01T08:00:00.000Z",
          simulatedByUserId: "firebase-admin-test",
          nextSeason: 1,
          nextWeek: 2,
        },
      ],
      matchResults: [
        {
          matchId: "match-1",
          season: 1,
          week: 1,
          homeTeamId: "bos-guardians",
          awayTeamId: "nyt-titans",
          homeTeamName: "Boston Guardians",
          awayTeamName: "New York Titans",
          homeScore: 24,
          awayScore: 17,
          homeStats: {
            totalYards: 360,
            passingYards: 220,
            rushingYards: 140,
            turnovers: 1,
            firstDowns: 21,
          },
          awayStats: {
            totalYards: 318,
            passingYards: 205,
            rushingYards: 113,
            turnovers: 2,
            firstDowns: 18,
          },
          winnerTeamId: "bos-guardians",
          winnerTeamName: "Boston Guardians",
          tiebreakerApplied: false,
          simulatedAt: "2026-05-01T08:00:00.000Z",
          simulatedByUserId: "firebase-admin-test",
          status: "completed",
          createdAt: "2026-05-01T08:00:00.000Z",
        },
      ],
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
        {
          userId: "user-2",
          username: "Coach_5678",
          joinedAt: "2026-04-29T19:01:00.000Z",
          teamId: "nyt-titans",
          teamName: "New York Titans",
          readyForWeek: false,
          contractRoster: testRoster("player-2"),
          depthChart: testDepthChart("player-2"),
        },
      ],
    };

    const detailState = toOnlineLeagueDetailState(league, {
      userId: "user-1",
      username: "Coach_1234",
    });
    const reloadedDetailState = toOnlineLeagueDetailState(
      JSON.parse(JSON.stringify(league)) as OnlineLeague,
      {
        userId: "user-1",
        username: "Coach_1234",
      },
    );

    expect(detailState)
      .toMatchObject({
        status: "found",
        currentWeekLabel: "Woche 2",
        readyProgressLabel: "0/2 aktive Manager bereit",
        weekFlow: {
          phaseLabel: "Woche offen",
          simulationStatusLabel:
            "Simulation bleibt gesperrt, bis alle aktiven Teams bereit sind.",
          lastCompletedWeekLabel: "Zuletzt abgeschlossen: Saison 1, Woche 1.",
          completedResultsLabel: "1 Ergebnis gespeichert",
        },
        resultSummary: {
          weekLabel: "Saison 1, Woche 1",
          ownLastGame: {
            opponentLabel: "Gegner: New York Titans",
            outcomeLabel: "Sieg",
            scoreLabel: "Boston Guardians 24 - 17 New York Titans",
            winnerLabel: "Gewinner: Boston Guardians · Verlierer: New York Titans",
          },
          results: [
            {
              matchId: "match-1",
              isCurrentUserTeamInvolved: true,
              winnerLabel: "Gewinner: Boston Guardians",
              weekLabel: "Saison 1, Woche 1",
            },
          ],
        },
        recentResults: [
          {
            matchId: "match-1",
            label: "Boston Guardians 24 - 17 New York Titans",
          },
        ],
      });
    expect(detailState.status === "found" ? detailState.resultSummary.ownLastGame?.stats : [])
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "Total Yards",
            ownValue: "360",
            opponentValue: "318",
          }),
        ]),
      );
    expect(reloadedDetailState.status === "found" ? reloadedDetailState.resultSummary : null)
      .toEqual(detailState.status === "found" ? detailState.resultSummary : null);
  });

  it("orders recent results by latest season, week and simulation time", () => {
    const league: OnlineLeague = {
      id: "ordered-results-league",
      name: "Ordered Results League",
      maxUsers: 16,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 2),
      currentWeek: 4,
      currentSeason: 1,
      users: [],
      matchResults: [
        {
          matchId: "older-week",
          season: 1,
          week: 2,
          homeTeamId: "bos-guardians",
          awayTeamId: "nyt-titans",
          homeTeamName: "Boston Guardians",
          awayTeamName: "New York Titans",
          homeScore: 10,
          awayScore: 7,
          homeStats: {
            firstDowns: 14,
            passingYards: 180,
            rushingYards: 90,
            totalYards: 270,
            turnovers: 1,
          },
          awayStats: {
            firstDowns: 11,
            passingYards: 150,
            rushingYards: 80,
            totalYards: 230,
            turnovers: 2,
          },
          winnerTeamId: "bos-guardians",
          winnerTeamName: "Boston Guardians",
          tiebreakerApplied: false,
          simulatedAt: "2026-05-01T08:00:00.000Z",
          simulatedByUserId: "admin",
          status: "completed",
          createdAt: "2026-05-01T08:00:00.000Z",
        },
        {
          matchId: "latest-week",
          season: 1,
          week: 3,
          homeTeamId: "bos-guardians",
          awayTeamId: "nyt-titans",
          homeTeamName: "Boston Guardians",
          awayTeamName: "New York Titans",
          homeScore: 21,
          awayScore: 17,
          homeStats: {
            firstDowns: 18,
            passingYards: 220,
            rushingYards: 110,
            totalYards: 330,
            turnovers: 1,
          },
          awayStats: {
            firstDowns: 16,
            passingYards: 205,
            rushingYards: 95,
            totalYards: 300,
            turnovers: 2,
          },
          winnerTeamId: "bos-guardians",
          winnerTeamName: "Boston Guardians",
          tiebreakerApplied: false,
          simulatedAt: "2026-05-01T09:00:00.000Z",
          simulatedByUserId: "admin",
          status: "completed",
          createdAt: "2026-05-01T09:00:00.000Z",
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, null)).toMatchObject({
      resultSummary: {
        weekLabel: "Saison 1, Woche 3",
        results: [
          {
            matchId: "latest-week",
          },
        ],
      },
      recentResults: [
        {
          matchId: "latest-week",
        },
        {
          matchId: "older-week",
        },
      ],
    });
  });

  it("tracks first-step checklist progress from existing league data", () => {
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "waiting",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: true,
          readyAt: "2026-04-29T19:05:00.000Z",
          contractRoster: [
            {
              playerId: "player-1",
              playerName: "A. Starter",
              position: "QB",
              age: 25,
              overall: 80,
              potential: 84,
              developmentPath: "solid",
              developmentProgress: 0,
              xFactors: [],
              contract: {
                salaryPerYear: 1_000_000,
                totalValue: 1_000_000,
                capHitPerYear: 1_000_000,
                signingBonus: 0,
                deadCapPerYear: 0,
                contractType: "regular",
                yearsRemaining: 1,
                guaranteedMoney: 0,
              },
              status: "active",
            },
          ],
          weeklyTrainingPlans: [
            {
              planId: "plan-1",
              leagueId: "global-test-league",
              teamId: "bos-guardians",
              submittedByUserId: "user-1",
              season: 1,
              week: 1,
              intensity: "normal",
              primaryFocus: "balanced",
              riskTolerance: "medium",
              youngPlayerPriority: 50,
              veteranMaintenance: 50,
              submittedAt: "2026-04-29T19:04:00.000Z",
              source: "gm_submitted",
            },
          ],
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        status: "found",
        firstSteps: {
          progressLabel: "3 von 3 erledigt",
          completedCount: 3,
          totalCount: 3,
          items: [
            {
              id: "team",
              completed: true,
              statusLabel: "Erledigt",
            },
            {
              id: "training",
              completed: true,
              statusLabel: "Plan gespeichert",
            },
            {
              id: "ready",
              completed: true,
              statusLabel: "Bereit",
            },
          ],
        },
      });
  });

  it("blocks bereit toggles while the current week is simulating", () => {
    const league: OnlineLeague = {
      id: "simulating-week-league",
      name: "Simulating Woche League",
      maxUsers: 16,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 1),
      currentWeek: 1,
      weekStatus: "simulating",
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: true,
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        currentUserReady: true,
        readyActionDisabledReason: "Bereit-Status ist während der Simulation gesperrt.",
        weekFlow: {
          phaseLabel: "Simulation läuft",
        },
      });
  });

  it("blocks bereit toggles for completed weeks and active drafts", () => {
    const baseUser = {
      userId: "user-1",
      username: "Coach_1234",
      joinedAt: "2026-04-29T19:00:00.000Z",
      teamId: "bos-guardians",
      teamName: "Boston Guardians",
      readyForWeek: false,
    };
    const baseLeague: OnlineLeague = {
      id: "ready-blocking-league",
      name: "Bereit Blocking League",
      maxUsers: 16,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 1),
      currentWeek: 2,
      users: [baseUser],
    };

    expect(
      toOnlineLeagueDetailState(
        {
          ...baseLeague,
          completedWeeks: [
            {
              completedAt: "2026-05-02T11:00:00.000Z",
              nextSeason: 1,
              nextWeek: 3,
              resultMatchIds: [],
              season: 1,
              simulatedByUserId: "admin-1",
              status: "completed",
              week: 2,
              weekKey: "s1-w2",
            },
          ],
          weekStatus: "completed",
        },
        { userId: "user-1", username: "Coach_1234" },
      ),
    ).toMatchObject({
      readyActionDisabledReason: "Diese Woche ist bereits abgeschlossen.",
    });
    expect(
      toOnlineLeagueDetailState(
        {
          ...baseLeague,
          completedWeeks: [
            {
              completedAt: "2026-05-02T11:00:00.000Z",
              nextSeason: 1,
              nextWeek: 2,
              resultMatchIds: ["game-1"],
              season: 1,
              simulatedByUserId: "admin-1",
              status: "completed",
              week: 1,
              weekKey: "s1-w1",
            },
          ],
          currentWeek: 2,
          matchResults: [
            {
              awayScore: 17,
              awayStats: { firstDowns: 0, passingYards: 0, rushingYards: 0, totalYards: 0, turnovers: 0 },
              awayTeamId: "away",
              awayTeamName: "Away",
              createdAt: "2026-05-02T11:00:00.000Z",
              homeScore: 24,
              homeStats: { firstDowns: 0, passingYards: 0, rushingYards: 0, totalYards: 0, turnovers: 0 },
              homeTeamId: "bos-guardians",
              homeTeamName: "Boston Guardians",
              loserTeamId: "away",
              loserTeamName: "Away",
              matchId: "game-1",
              season: 1,
              simulatedAt: "2026-05-02T11:00:00.000Z",
              simulatedByUserId: "admin-1",
              status: "completed",
              tiebreakerApplied: false,
              week: 1,
              winnerTeamId: "bos-guardians",
              winnerTeamName: "Boston Guardians",
            },
          ],
          schedule: [
            {
              awayTeamName: "Away",
              homeTeamName: "Boston Guardians",
              id: "game-1",
              week: 1,
            },
          ],
          weekStatus: "season_complete",
        },
        { userId: "user-1", username: "Coach_1234" },
      ),
    ).toMatchObject({
      firstSteps: {
        progressLabel: "Saison abgeschlossen",
      },
      primaryAction: {
        ctaLabel: "Endstand ansehen",
        description: "Offseason kommt bald. Bis dahin bleiben Endstand und Ergebnisse sichtbar.",
        title: "Regular Season abgeschlossen",
      },
      readyActionDisabledReason: "Die Saison ist abgeschlossen. Offseason kommt bald.",
      statusLabel: "Saison abgeschlossen",
      weekFlow: {
        nextWeekLabel: "Regular Season abgeschlossen",
        phaseLabel: "Saison abgeschlossen",
      },
    });
    expect(
      toOnlineLeagueDetailState(
        {
          ...baseLeague,
          fantasyDraft: {
            leagueId: "ready-blocking-league",
            status: "active",
            round: 1,
            pickNumber: 1,
            currentTeamId: "bos-guardians",
            draftOrder: ["bos-guardians"],
            picks: [],
            availablePlayerIds: [],
            startedAt: "2026-05-01T08:00:00.000Z",
            completedAt: null,
          },
        },
        { userId: "user-1", username: "Coach_1234" },
      ),
    ).toMatchObject({
      draftStatusLabel: "Draft läuft",
      readyActionDisabledReason: "Bereit-Status ist während des Drafts gesperrt.",
      weekFlow: {
        phaseLabel: "Draft läuft",
      },
    });
  });

  it("unlocks dashboard flow after a completed draft reload", () => {
    const league: OnlineLeague = {
      id: "draft-completed-reload",
      name: "Draft Completed Reload",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 2),
      currentWeek: 1,
      weekStatus: "pre_week",
      schedule: [
        {
          id: "match-1",
          week: 1,
          homeTeamName: "Boston Guardians",
          awayTeamName: "New York Titans",
        },
      ],
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T08:30:00.000Z",
        currentTeamId: "",
        draftOrder: ["bos-guardians", "nyt-titans"],
        leagueId: "draft-completed-reload",
        pickNumber: 2,
        picks: [
          {
            pickNumber: 1,
            round: 1,
            teamId: "bos-guardians",
            playerId: "player-1",
            pickedByUserId: "user-1",
            timestamp: "2026-05-01T08:01:00.000Z",
          },
          {
            pickNumber: 2,
            round: 1,
            teamId: "nyt-titans",
            playerId: "player-2",
            pickedByUserId: "user-2",
            timestamp: "2026-05-01T08:02:00.000Z",
          },
        ],
        round: 1,
        startedAt: "2026-05-01T08:00:00.000Z",
        status: "completed",
      },
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
        {
          userId: "user-2",
          username: "Coach_5678",
          joinedAt: "2026-04-29T19:01:00.000Z",
          teamId: "nyt-titans",
          teamName: "New York Titans",
          readyForWeek: false,
          contractRoster: testRoster("player-2"),
          depthChart: testDepthChart("player-2"),
        },
      ],
    };

    expect(
      toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }),
    ).toMatchObject({
      status: "found",
      draftStatusLabel: "Draft abgeschlossen",
      lifecyclePhase: "readyOpen",
      readyActionDisabledReason: null,
      roster: {
        totalPlayersLabel: "1 aktive Spieler",
      },
      weekFlow: {
        phaseLabel: "Woche offen",
        nextMatchLabel: "Boston Guardians vs. New York Titans",
        simulationStatusLabel: "Simulation bleibt gesperrt, bis alle aktiven Teams bereit sind.",
      },
    });
  });

  it("shows an existing week one schedule placeholder match when available", () => {
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "waiting",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      schedule: [
        {
          id: "week-1-match-1",
          week: 1,
          homeTeamName: "Boston Guardians",
          awayTeamName: "New York Titans",
        },
      ],
      users: [],
    };

    expect(toOnlineLeagueDetailState(league, null)).toMatchObject({
      status: "found",
      weekFlow: {
        weekLabel: "Woche 1",
        nextMatchLabel: "Boston Guardians vs. New York Titans",
      },
    });
  });

  it("prefers the current user's scheduled game and stored standings", () => {
    const league: OnlineLeague = {
      id: "scheduled-user-league",
      name: "Scheduled User League",
      maxUsers: 16,
      status: "active",
      teams: [
        { id: "team-1", name: "Boston Guardians", abbreviation: "BOS" },
        { id: "team-2", name: "Zürich Forge", abbreviation: "ZUR" },
      ],
      currentWeek: 3,
      schedule: [
        {
          id: "week-3-match-1",
          week: 3,
          homeTeamName: "Boston Guardians",
          awayTeamName: "New York Titans",
        },
        {
          id: "week-3-match-2",
          week: 3,
          homeTeamName: "Geneva Falcons",
          awayTeamName: "Zürich Forge",
        },
      ],
      standings: [
        {
          teamId: "team-2",
          wins: 1,
          losses: 1,
          ties: 0,
          gamesPlayed: 2,
          pointsFor: 41,
          pointsAgainst: 38,
          pointDifferential: 3,
        },
        {
          teamId: "team-1",
          wins: 2,
          losses: 0,
          ties: 0,
          gamesPlayed: 2,
          pointsFor: 55,
          pointsAgainst: 31,
          pointDifferential: 24,
        },
      ],
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "team-2",
          teamName: "Forge",
          teamDisplayName: "Zürich Forge",
          readyForWeek: false,
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        nextMatchLabel: "Geneva Falcons vs. Zürich Forge",
        weekFlow: {
          nextMatchLabel: "Geneva Falcons vs. Zürich Forge",
        },
        standings: [
          {
            rankLabel: "#1",
            teamName: "Boston Guardians",
            recordLabel: "2-0",
            pointsLabel: "55:31 · +24",
          },
          {
            isOwnTeam: true,
            rankLabel: "#2",
            teamName: "Zürich Forge",
            recordLabel: "1-1",
            pointsLabel: "41:38 · +3",
          },
        ],
      });
  });

  it("shows stored activity rules when league settings are available", () => {
    const league: OnlineLeague = {
      id: "activity-rules-league",
      name: "Activity Rules League",
      maxUsers: 16,
      status: "waiting",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      leagueSettings: {
        gmActivityRules: {
          warningAfterMissedWeeks: 2,
          inactiveAfterMissedWeeks: 3,
          removalEligibleAfterMissedWeeks: 4,
          autoVacateAfterMissedWeeks: false,
        },
        financeRules: {
          enableStadiumFinance: true,
          enableFanPressure: true,
          enableMerchRevenue: true,
          equalMediaRevenue: true,
          revenueSharingEnabled: true,
          revenueSharingPercentage: 10,
          ownerBailoutEnabled: true,
          minCashFloor: 0,
          maxTicketPriceLevel: 100,
          allowStadiumUpgrades: false,
        },
      },
      users: [],
    };

    expect(toOnlineLeagueDetailState(league, null)).toMatchObject({
      status: "found",
      leagueRules: {
        sourceLabel: "Gespeicherte Ligaregeln",
        compactSummary:
          "Warnung ab 2, inaktiv ab 3, Admin-Prüfung ab 4 verpassten Wochenaktionen.",
        activityRuleLabel:
          "Automatisches Vakantsetzen ist nicht aktiv; Admin-Entscheidungen bleiben manuell.",
      },
    });
  });

  it("keeps contract warning inputs available in the dashboard state", () => {
    const league: OnlineLeague = {
      id: "contracts-league",
      name: "Contracts League",
      maxUsers: 16,
      status: "waiting",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
          salaryCap: {
            capLimit: 200_000_000,
            activeSalary: 150_000_000,
            currentCapUsage: 160_000_000,
            deadCap: 10_000_000,
            availableCap: 40_000_000,
            softBufferLimit: 190_000_000,
            capRiskLevel: "healthy",
          },
          contractRoster: [
            {
              playerId: "player-1",
              playerName: "A. Starter",
              position: "QB",
              age: 25,
              overall: 82,
              potential: 86,
              developmentPath: "star",
              developmentProgress: 0.35,
              xFactors: [],
              status: "active",
              contract: {
                salaryPerYear: 20_000_000,
                totalValue: 84_000_000,
                capHitPerYear: 22_000_000,
                signingBonus: 8_000_000,
                deadCapPerYear: 4_000_000,
                contractType: "star",
                yearsRemaining: 4,
                guaranteedMoney: 8_000_000,
              },
            },
          ],
        },
      ],
    };

    expect(
      toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }),
    ).toMatchObject({
      status: "found",
      contracts: {
        availableCap: 40_000_000,
        deadCap: 10_000_000,
        players: [
          {
            playerId: "player-1",
            capHitPerYear: 22_000_000,
            signingBonus: 8_000_000,
            deadCapPerYear: 4_000_000,
            yearsRemaining: 4,
          },
        ],
      },
    });
  });

  it("points the primary action to the draft when the current user is on the clock", () => {
    const league: OnlineLeague = {
      id: "draft-action-league",
      name: "Draft Action League",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 2),
      currentWeek: 1,
      fantasyDraft: {
        availablePlayerIds: ["player-1"],
        completedAt: null,
        currentTeamId: "bos-guardians",
        draftOrder: ["bos-guardians", "nyt-titans"],
        leagueId: "draft-action-league",
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T07:00:00.000Z",
        status: "active",
      },
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
      ],
    };

    expect(
      toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }),
    ).toMatchObject({
      primaryAction: {
        title: "Du bist im Draft am Zug",
        ctaLabel: "Zum Pick",
        href: "/online/league/draft-action-league/draft",
        kind: "link",
      },
    });
  });

  it("opens week, roster and depth navigation after completed draft", () => {
    const league: OnlineLeague = {
      id: "completed-draft-action-league",
      name: "Completed Draft Action League",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 2),
      currentWeek: 1,
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T08:00:00.000Z",
        currentTeamId: "",
        draftOrder: ["bos-guardians", "nyt-titans"],
        leagueId: "completed-draft-action-league",
        pickNumber: 2,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T07:00:00.000Z",
        status: "completed",
      },
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
      ],
    };

    expect(
      toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }),
    ).toMatchObject({
      primaryAction: {
        title: "Bereit für die Woche setzen",
        ctaLabel: "Bereit für Woche 1",
        kind: "ready",
      },
      readyActionDisabledReason: null,
    });
  });

  it("does not offer ready as the primary action after the scheduled season is complete", () => {
    const league: OnlineLeague = {
      id: "season-complete-action-league",
      name: "Season Complete Action League",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 2),
      currentWeek: 2,
      weekStatus: "pre_week",
      completedWeeks: [
        {
          completedAt: "2026-05-01T08:00:00.000Z",
          nextSeason: 1,
          nextWeek: 2,
          resultMatchIds: [],
          season: 1,
          simulatedByUserId: "admin",
          status: "completed",
          week: 1,
          weekKey: "s1-w1",
        },
      ],
      lastSimulatedWeekKey: "s1-w1",
      schedule: [
        {
          id: "week-1-match-1",
          week: 1,
          homeTeamName: "Boston Guardians",
          awayTeamName: "New York Titans",
        },
      ],
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T08:00:00.000Z",
        currentTeamId: "",
        draftOrder: ["bos-guardians", "nyt-titans"],
        leagueId: "season-complete-action-league",
        pickNumber: 2,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T07:00:00.000Z",
        status: "completed",
      },
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
          contractRoster: testRoster(),
          depthChart: testDepthChart(),
        },
      ],
    };

    expect(
      toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }),
    ).toMatchObject({
      lifecyclePhase: "seasonComplete",
      primaryAction: {
        title: "Regular Season abgeschlossen",
        ctaLabel: "Endstand ansehen",
        href: "/online/league/season-complete-action-league#league",
        kind: "link",
      },
    });
  });

  it("returns a missing state for invalid league ids", () => {
    expect(toOnlineLeagueDetailState(null, null)).toEqual({
      status: "missing",
      message: "Liga konnte nicht gefunden werden.",
    });
  });
});

describe("getOnlineLeaguePriceChangeHint", () => {
  it("explains critical ticket prices without changing economy values", () => {
    expect(getOnlineLeaguePriceChangeHint("ticket", 84)).toEqual({
      tone: "critical",
      label: "Kritisch",
      text: "Ticketpreise sind sehr hoch. Das kann Fan-Stimmung und Nachfrage belasten.",
    });
  });

  it("explains low merch prices as fan-friendly but lower revenue per sale", () => {
    expect(getOnlineLeaguePriceChangeHint("merch", 20)).toEqual({
      tone: "neutral",
      label: "Neutral",
      text: "Merch-Preise sind sehr niedrig. Das kann Fans helfen, senkt aber Erlöse pro Verkauf.",
    });
  });
});
