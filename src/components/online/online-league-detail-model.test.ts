import { describe, expect, it } from "vitest";

import { ONLINE_MVP_TEAM_POOL } from "@/lib/online/online-league-constants";
import type { OnlineLeague } from "@/lib/online/online-league-types";

import {
  getOnlineLeaguePriceChangeHint,
  toOnlineLeagueDetailState,
} from "./online-league-detail-model";

describe("toOnlineLeagueDetailState", () => {
  it("builds detail state with player list and current user marker", () => {
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
        {
          userId: "user-2",
          username: "Coach_5678",
          joinedAt: "2026-04-29T19:01:00.000Z",
          teamId: "nyt-titans",
          teamName: "New York Titans",
          readyForWeek: false,
        },
      ],
    };

    expect(
      toOnlineLeagueDetailState(league, { userId: "user-2", username: "Coach_5678" }),
    ).toMatchObject({
      status: "found",
      name: "Global Test League",
      statusLabel: "Wartet auf Spieler",
      currentWeekLabel: "Week 1",
      playerCountLabel: "2/16",
      readyProgressLabel: "1/2 aktive Teams bereit",
      allPlayersReady: false,
      allPlayersReadyLabel: null,
      ownTeamName: "New York Titans",
      ownCoachName: "Coach_5678",
      jobSecurityLabel: "72/100 · stable",
      currentUserReady: false,
      firstSteps: {
        progressLabel: "0 von 3 erledigt",
        completedCount: 0,
        totalCount: 3,
        items: [
          {
            id: "team",
            label: "Team ansehen",
            completed: false,
            statusLabel: "Offen",
          },
          {
            id: "training",
            label: "Training prüfen oder setzen",
            completed: false,
            statusLabel: "Noch kein GM-Plan",
          },
          {
            id: "ready",
            label: "Bereit für die Woche klicken",
            completed: false,
            statusLabel: "Noch nicht bereit",
          },
        ],
      },
      nextMatchLabel: "Nächste Partie wird nach Ligastart erstellt",
      waitingLabel: "Warte auf andere Spieler",
      weekFlow: {
        title: "Ligawoche",
        weekLabel: "Week 1",
        phaseLabel: "Woche offen",
        statusLabel: "Wartet auf Ready-States",
        simulationStatusLabel: "Simulation bleibt gesperrt, bis alle aktiven Teams ready sind.",
        playerReadyStatusLabel: "Du bist noch nicht bereit für Week 1.",
        waitingStatusLabel: "Prüfe Team und Training. Setze dich bereit, wenn deine Woche passt.",
        adminProgressLabel:
          "Sobald alle Spieler bereit sind, kann der Admin die Woche simulieren.",
        nextMatchLabel: "Spielplan wird im nächsten Schritt erstellt",
        nextActionCtaLabel: "Depth Chart prüfen, bevor du die Woche freigibst.",
        showStartWeekButton: false,
        startWeekButtonLabel: "Admin simuliert die Woche",
        startWeekHint:
          "Der Admin schaltet die Liga weiter. Danach beginnt die nächste Week mit zurückgesetztem Ready-State.",
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
          readyLabel: "Ready",
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
      playerCountLabel: "0/16",
      readyProgressLabel: "0/0 aktive Teams bereit",
      weekFlow: {
        statusLabel: "Wartet auf Ready-States",
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
      status: "waiting",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
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

  it("detects when all current members are ready", () => {
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
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        status: "found",
        allPlayersReady: true,
        allPlayersReadyLabel: "Alle Spieler sind bereit. Der Admin kann die Woche simulieren.",
        currentUserReady: true,
        readyProgressLabel: "1/1 aktive Teams bereit",
        weekFlow: {
          phaseLabel: "Simulation möglich",
          statusLabel: "Alle Spieler bereit",
          simulationStatusLabel: "Alle aktiven Teams sind ready. Der Admin kann simulieren.",
          playerReadyStatusLabel: "Du bist bereit für Week 1.",
          waitingStatusLabel: "Alle Spieler sind bereit. Es wartet nur noch der Liga-Admin.",
          adminProgressLabel:
            "Sobald alle Spieler bereit sind, kann der Admin die Woche simulieren.",
          nextMatchLabel: "Spielplan wird im nächsten Schritt erstellt",
          nextActionCtaLabel: "Depth Chart prüfen, bevor du die Woche freigibst.",
          showStartWeekButton: true,
          startWeekButtonLabel: "Admin simuliert die Woche",
          startWeekHint:
            "Der Admin schaltet die Liga weiter. Danach beginnt die nächste Week mit zurückgesetztem Ready-State.",
        },
      });
  });

  it("shows completed week results and prepares the next ready cycle", () => {
    const league: OnlineLeague = {
      id: "completed-week-league",
      name: "Completed Week League",
      maxUsers: 2,
      status: "active",
      teams: ONLINE_MVP_TEAM_POOL.slice(0, 2),
      currentWeek: 2,
      currentSeason: 1,
      weekStatus: "pre_week",
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
        },
        {
          userId: "user-2",
          username: "Coach_5678",
          joinedAt: "2026-04-29T19:01:00.000Z",
          teamId: "nyt-titans",
          teamName: "New York Titans",
          readyForWeek: false,
        },
      ],
    };

    expect(toOnlineLeagueDetailState(league, { userId: "user-1", username: "Coach_1234" }))
      .toMatchObject({
        status: "found",
        currentWeekLabel: "Week 2",
        readyProgressLabel: "0/2 aktive Teams bereit",
        weekFlow: {
          phaseLabel: "Nächste Woche offen",
          simulationStatusLabel:
            "Die letzte Woche ist abgeschlossen. Die neue Woche wartet auf Ready-States.",
          lastCompletedWeekLabel: "Zuletzt abgeschlossen: Season 1, Week 1.",
          completedResultsLabel: "1 Ergebnis gespeichert",
        },
        recentResults: [
          {
            matchId: "match-1",
            label: "Boston Guardians 24 - 17 New York Titans",
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
        weekLabel: "Week 1",
        nextMatchLabel: "Boston Guardians vs. New York Titans",
      },
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
          "Warnung ab 2, inaktiv ab 3, Admin-Prüfung ab 4 verpassten Week Actions.",
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
