import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { OnlineLeague } from "@/lib/online/online-league-types";

import type { OnlineLeagueDetailState } from "./online-league-detail-model";
import {
  AdminControlsPanel,
  DraftStatusPanel,
  ErrorState,
  LeagueHeader,
  LeagueStatusPanel,
  LoadingState,
  PlayerActionsPanel,
  PrimaryActionPanel,
  ReadyStatePanel,
  TeamOverviewCard,
  WeekResultPanel,
} from "./online-league-dashboard-panels";

type FoundOnlineLeagueDetailState = Extract<OnlineLeagueDetailState, { status: "found" }>;

function render(element: React.ReactElement) {
  return renderToStaticMarkup(element);
}

function createDetailState(
  patch: Partial<FoundOnlineLeagueDetailState> = {},
): FoundOnlineLeagueDetailState {
  return {
    status: "found",
    name: "Test Liga",
    statusLabel: "Saison läuft",
    currentWeekLabel: "Woche 1",
    draftStatusLabel: "Draft abgeschlossen",
    playerCountLabel: "2/16",
    readyProgressLabel: "1/2 aktive Manager bereit",
    allPlayersReady: false,
    allPlayersReadyLabel: null,
    ownTeamName: "Berlin Blitz",
    ownCoachName: "Coach One",
    ownerConfidenceLabel: "72/100",
    ownerExpectationLabel: "Owner erwartet stabile Entwicklung",
    mediaExpectationLabel: "Noch kein Teamziel gesetzt",
    mediaExpectationNarrative: "Kein Medienziel aktiv.",
    jobSecurityLabel: "72/100 · stable",
    jobSecurityExplanation: "Job-Sicherheit ist stabil.",
    inactivityWarningLabel: null,
    primaryAction: {
      title: "Bereit für die Woche setzen",
      description: "Dein Team ist verbunden.",
      ctaLabel: "Bereit für Woche 1",
      href: null,
      kind: "ready",
    },
    currentUserReady: false,
    lifecyclePhase: "readyOpen",
    lifecycleReasons: [],
    readyActionDisabledReason: null,
    nextMatchLabel: "Berlin Blitz vs. Hamburg Harbor",
    waitingLabel: "Warte auf andere Spieler",
    weekFlow: {
      title: "Ligawoche",
      weekLabel: "Woche 1",
      lastScheduledWeekLabel: "Letzte geplante Woche: Woche 3",
      nextWeekLabel: "Aktuelle Woche: Woche 1",
      phaseLabel: "Woche offen",
      statusLabel: "Wartet auf Bereitmeldungen",
      simulationStatusLabel: "Simulation bleibt gesperrt, bis alle aktiven Teams bereit sind.",
      playerReadyStatusLabel: "Du bist noch nicht bereit für Woche 1.",
      waitingStatusLabel: "Prüfe Team und Training.",
      adminProgressLabel: "Der Admin kann simulieren, sobald alle bereit sind.",
      nextMatchLabel: "Berlin Blitz vs. Hamburg Harbor",
      nextActionCtaLabel: "Depth Chart prüfen, bevor du die Woche freigibst.",
      completedResultsLabel: null,
      showStartWeekButton: false,
      startWeekButtonLabel: "Admin-Simulation bereit",
      startWeekHint: "Der Admin schaltet die Liga weiter.",
      lastCompletedWeekLabel: null,
    },
    nextActionLabel: "Depth Chart prüfen, bevor du die Woche freigibst.",
    firstSteps: {
      progressLabel: "1 von 3 erledigt",
      completedCount: 1,
      totalCount: 3,
      items: [
        {
          id: "team",
          label: "Team ansehen",
          description: "Prüfe dein Team.",
          completed: true,
          statusLabel: "Erledigt",
        },
        {
          id: "training",
          label: "Training prüfen oder setzen",
          description: "Prüfe deinen Trainingsplan.",
          completed: false,
          statusLabel: "Offen",
        },
        {
          id: "ready",
          label: "Bereit für die Woche klicken",
          description: "Setze dich bereit.",
          completed: false,
          statusLabel: "Noch nicht bereit",
        },
      ],
    },
    leagueRules: {
      sourceLabel: "Standardregeln",
      compactSummary: "Admin schaltet Wochen weiter.",
      items: ["Der Admin schaltet Wochen weiter."],
      activityRuleLabel: "Standard-Inaktivitätsregeln aktiv.",
    },
    roster: {
      totalPlayersLabel: "42 Spieler",
      starterAverageLabel: "Starter Ø 78",
      depthChart: [
        {
          position: "QB",
          starterName: "A. Starter",
          backupLabel: "Backup: B. Backup",
        },
      ],
    },
    resultSummary: {
      emptyMessage:
        "Sobald die Woche simuliert ist, erscheinen hier Ergebnis, Gegner und Tabelle.",
      emptyTitle: "Woche noch nicht simuliert",
      ownLastGame: null,
      results: [],
      weekLabel: null,
    },
    standings: [
      { teamName: "Berlin Blitz", recordLabel: "1-0", isOwnTeam: true, rankLabel: "#1" },
      { teamName: "Hamburg Harbor", recordLabel: "0-1", rankLabel: "#2" },
    ],
    recentResults: [],
    franchise: null,
    training: null,
    contracts: null,
    trades: null,
    draft: null,
    coaching: null,
    players: [],
    vacantTeams: [],
    ...patch,
  };
}

function createDraftLeague(status: "active" | "completed"): OnlineLeague {
  return {
    id: "league-1",
    name: "Draft Liga",
    status: "active",
    maxUsers: 16,
    currentWeek: 1,
    teams: [{ id: "team-1", name: "Berlin Blitz", abbreviation: "BER" }],
    users: [
      {
        userId: "user-1",
        username: "Coach One",
        joinedAt: "2026-05-01T08:00:00.000Z",
        teamId: "team-1",
        teamName: "Berlin Blitz",
        readyForWeek: false,
      },
    ],
    fantasyDraft: {
      leagueId: "league-1",
      status,
      round: 1,
      pickNumber: 1,
      currentTeamId: status === "active" ? "team-1" : "",
      draftOrder: ["team-1"],
      picks: [],
      availablePlayerIds: [],
      startedAt: "2026-05-01T08:00:00.000Z",
      completedAt: status === "completed" ? "2026-05-01T08:30:00.000Z" : null,
    },
    fantasyDraftPlayerPool: [],
  };
}

describe("online league dashboard panels", () => {
  it("renders loading and error states", () => {
    expect(render(<LoadingState />)).toContain("Liga wird geladen");
    expect(
      render(
        <ErrorState
          copy={{
            kind: "network",
            title: "Online-Liga konnte nicht geladen werden.",
            message: "Netzwerkfehler",
            helper: "Bitte erneut versuchen.",
          }}
          onRetry={() => undefined}
          retryLabel="Liga erneut laden"
        />,
      ),
    ).toContain("Netzwerkfehler");
  });

  it("renders header, team overview and player action states", () => {
    const detailState = createDetailState();

    const header = render(<LeagueHeader detailState={detailState} />);
    expect(header).toContain("Test Liga");
    expect(header).toContain("Draft abgeschlossen");
    expect(render(<TeamOverviewCard
      detailState={detailState}
      isFirebaseMvpMode
      showAdvancedLocalActions={false}
      mediaFeedback={null}
      mediaExpectationGoals={["rebuild", "playoffs", "championship"]}
      onClaimVacantTeam={() => undefined}
      onSetMediaExpectation={() => undefined}
    />)).toContain("Berlin Blitz");
    expect(render(<LeagueStatusPanel detailState={detailState} />)).toContain(
      "Berlin Blitz vs. Hamburg Harbor",
    );
    expect(render(<PlayerActionsPanel detailState={detailState} />)).toContain("Command Center");
  });

  it("renders the primary dashboard action above secondary guidance", () => {
    const detailState = createDetailState();
    const markup = render(
      <PrimaryActionPanel
        detailState={detailState}
        pendingAction={null}
        onReadyForWeek={() => undefined}
      />,
    );

    expect(markup).toContain("Nächste Aktion");
    expect(markup).toContain("Team: Berlin Blitz");
    expect(markup).toContain("Bereit für Woche 1");
  });

  it("renders season-complete guidance without a ready action", () => {
    const detailState = createDetailState({
      currentWeekLabel: "Woche 2",
      lifecyclePhase: "seasonComplete",
      primaryAction: {
        title: "Regular Season abgeschlossen",
        description: "Offseason kommt bald. Bis dahin bleiben Endstand und Ergebnisse sichtbar.",
        ctaLabel: "Endstand ansehen",
        href: "/online/league/league-1#league",
        kind: "link",
      },
      readyActionDisabledReason: "Die Saison ist abgeschlossen.",
      statusLabel: "Saison abgeschlossen",
      weekFlow: {
        ...createDetailState().weekFlow,
        nextWeekLabel: "Regular Season abgeschlossen",
        phaseLabel: "Saison abgeschlossen",
        playerReadyStatusLabel: "Die Saison ist abgeschlossen.",
      },
    });
    const markup = render(
      <PrimaryActionPanel
        detailState={detailState}
        pendingAction={null}
        onReadyForWeek={() => undefined}
      />,
    );

    expect(markup).toContain("Regular Season abgeschlossen");
    expect(markup).toContain("Offseason kommt bald");
    expect(markup).toContain("Endstand ansehen");
    expect(markup).not.toContain("Bereit für Woche");
  });

  it("renders bereit and simulated-week result states", () => {
    const detailState = createDetailState({
      allPlayersReady: true,
      allPlayersReadyLabel: "Alle aktiven Teams sind bereit.",
      currentUserReady: true,
      resultSummary: {
        emptyMessage: "",
        emptyTitle: "",
        ownLastGame: {
          matchId: "match-1",
          opponentLabel: "Gegner: Hamburg Harbor",
          outcomeLabel: "Sieg",
          outcomeTone: "win",
          scoreLabel: "Berlin Blitz 24 - 17 Hamburg Harbor",
          stats: [
            {
              advantage: "own",
              label: "Total Yards",
              opponentValue: "280",
              ownValue: "360",
            },
          ],
          weekLabel: "Saison 1, Woche 1",
          winnerLabel: "Gewinner: Berlin Blitz · Verlierer: Hamburg Harbor",
        },
        results: [
          {
            awayScore: 17,
            awayTeamName: "Hamburg Harbor",
            homeScore: 24,
            homeTeamName: "Berlin Blitz",
            isCurrentUserTeamInvolved: true,
            label: "Berlin Blitz 24 - 17 Hamburg Harbor",
            matchId: "match-1",
            resultLabel: "24 - 17",
            weekLabel: "Saison 1, Woche 1",
            winnerLabel: "Gewinner: Berlin Blitz",
          },
        ],
        weekLabel: "Saison 1, Woche 1",
      },
      recentResults: [
        {
          awayScore: 17,
          awayTeamName: "Hamburg Harbor",
          homeScore: 24,
          homeTeamName: "Berlin Blitz",
          isCurrentUserTeamInvolved: true,
          matchId: "match-1",
          label: "Berlin Blitz 24 - 17 Hamburg Harbor",
          resultLabel: "24 - 17",
          weekLabel: "Saison 1, Woche 1",
          winnerLabel: "Gewinner: Berlin Blitz",
        },
      ],
      weekFlow: {
        ...createDetailState().weekFlow,
        phaseLabel: "Woche abgeschlossen",
        completedResultsLabel: "1 Ergebnis gespeichert",
        lastCompletedWeekLabel: "Zuletzt abgeschlossen: Saison 1, Woche 1.",
      },
    });

    expect(render(<ReadyStatePanel
      detailState={detailState}
      actionFeedback={{ tone: "success", message: "Bereit gespeichert." }}
      readyGuidanceItems={[
        { label: "Team geprüft", completed: true, statusLabel: "Erledigt" },
      ]}
      pendingAction={null}
      onReadyForWeek={() => undefined}
    />)).toContain("Bereit gespeichert");
    expect(render(<WeekResultPanel detailState={detailState} />)).toContain(
      "Berlin Blitz 24 - 17 Hamburg Harbor",
    );
    expect(render(<WeekResultPanel detailState={detailState} />)).toContain("Letztes Spiel");
    expect(render(<WeekResultPanel detailState={detailState} />)).toContain("Gegner: Hamburg Harbor");
    expect(render(<WeekResultPanel detailState={detailState} />)).toContain("Gewinner: Berlin Blitz");
  });

  it("renders standings and reload-safe result summaries together", () => {
    const detailState = createDetailState({
      currentWeekLabel: "Woche 2",
      nextMatchLabel: "Berlin Blitz vs. Munich Riders",
      standings: [
        {
          teamName: "Berlin Blitz",
          recordLabel: "1-0",
          gamesPlayedLabel: "1 Spiele",
          isOwnTeam: true,
          pointsLabel: "24:17 · +7",
          rankLabel: "#1",
        },
        {
          teamName: "Hamburg Harbor",
          recordLabel: "0-1",
          gamesPlayedLabel: "1 Spiele",
          pointsLabel: "17:24 · -7",
          rankLabel: "#2",
        },
      ],
      recentResults: [
        {
          awayScore: 17,
          awayTeamName: "Hamburg Harbor",
          homeScore: 24,
          homeTeamName: "Berlin Blitz",
          isCurrentUserTeamInvolved: true,
          matchId: "match-1",
          label: "Berlin Blitz 24 - 17 Hamburg Harbor",
          resultLabel: "24 - 17",
          weekLabel: "Saison 1, Woche 1",
          winnerLabel: "Gewinner: Berlin Blitz",
        },
      ],
      resultSummary: {
        emptyMessage: "",
        emptyTitle: "",
        ownLastGame: null,
        results: [
          {
            awayScore: 17,
            awayTeamName: "Hamburg Harbor",
            homeScore: 24,
            homeTeamName: "Berlin Blitz",
            isCurrentUserTeamInvolved: true,
            label: "Berlin Blitz 24 - 17 Hamburg Harbor",
            matchId: "match-1",
            resultLabel: "24 - 17",
            weekLabel: "Saison 1, Woche 1",
            winnerLabel: "Gewinner: Berlin Blitz",
          },
        ],
        weekLabel: "Saison 1, Woche 1",
      },
      weekFlow: {
        ...createDetailState().weekFlow,
        weekLabel: "Woche 2",
        nextMatchLabel: "Berlin Blitz vs. Munich Riders",
        lastCompletedWeekLabel: "Zuletzt abgeschlossen: Saison 1, Woche 1.",
      },
    });
    const leaguePanel = render(<LeagueStatusPanel detailState={detailState} />);
    const resultPanel = render(<WeekResultPanel detailState={detailState} />);

    expect(leaguePanel).toContain("Berlin Blitz vs. Munich Riders");
    expect(leaguePanel).toContain("#1");
    expect(leaguePanel).toContain("Dein Team");
    expect(leaguePanel).toContain("24:17 · +7");
    expect(resultPanel).toContain("Berlin Blitz 24 - 17 Hamburg Harbor");
  });

  it("renders clear empty results state before simulation", () => {
    const markup = render(<WeekResultPanel detailState={createDetailState()} />);

    expect(markup).toContain("Woche noch nicht simuliert");
    expect(markup).toContain("Sobald die Woche simuliert ist");
  });

  it("renders active draft state and hides completed draft gate", () => {
    expect(render(<DraftStatusPanel
      league={createDraftLeague("active")}
      currentUser={{ userId: "user-1", username: "Coach One" }}
      pendingPickPlayerId={null}
      feedback={null}
      onPickPlayer={() => undefined}
    />)).toContain("Draft Room");
    expect(render(<DraftStatusPanel
      league={createDraftLeague("completed")}
      currentUser={{ userId: "user-1", username: "Coach One" }}
      pendingPickPlayerId={null}
      feedback={null}
      onPickPlayer={() => undefined}
    />)).toBe("");
  });

  it("does not render a ready button when the season is complete", () => {
    const detailState = createDetailState({
      lifecyclePhase: "seasonComplete",
      readyActionDisabledReason: "Die Saison ist abgeschlossen. Es gibt keine spielbare Woche mehr.",
      nextActionLabel: "Die Saison ist abgeschlossen. Es gibt keine spielbare Woche mehr.",
    });
    const markup = render(
      <ReadyStatePanel
        detailState={detailState}
        actionFeedback={null}
        readyGuidanceItems={[
          { label: "Saison abgeschlossen", completed: true, statusLabel: "Kein Ready nötig" },
        ]}
        pendingAction={null}
        onReadyForWeek={() => undefined}
      />,
    );

    expect(markup).not.toContain("Bereit für Woche 1");
    expect(markup).toContain("Die Saison ist abgeschlossen");
  });

  it("keeps admin controls hidden from the player dashboard", () => {
    expect(render(<AdminControlsPanel />)).toBe("");
  });
});
