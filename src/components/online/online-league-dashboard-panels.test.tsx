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
    currentWeekLabel: "Week 1",
    playerCountLabel: "2/16",
    readyProgressLabel: "1/2 aktive Teams bereit",
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
    currentUserReady: false,
    nextMatchLabel: "Berlin Blitz vs. Hamburg Harbor",
    waitingLabel: "Warte auf andere Spieler",
    weekFlow: {
      title: "Ligawoche",
      weekLabel: "Week 1",
      phaseLabel: "Woche offen",
      statusLabel: "Wartet auf Ready-States",
      simulationStatusLabel: "Simulation bleibt gesperrt, bis alle aktiven Teams ready sind.",
      playerReadyStatusLabel: "Du bist noch nicht bereit für Week 1.",
      waitingStatusLabel: "Prüfe Team und Training.",
      adminProgressLabel: "Der Admin kann simulieren, sobald alle bereit sind.",
      nextMatchLabel: "Berlin Blitz vs. Hamburg Harbor",
      nextActionCtaLabel: "Depth Chart prüfen, bevor du die Woche freigibst.",
      completedResultsLabel: null,
      showStartWeekButton: false,
      startWeekButtonLabel: "Admin simuliert die Woche",
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
    standings: [
      { teamName: "Berlin Blitz", recordLabel: "1-0" },
      { teamName: "Hamburg Harbor", recordLabel: "0-1" },
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

    expect(render(<LeagueHeader detailState={detailState} />)).toContain("Test Liga");
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

  it("renders ready and simulated-week result states", () => {
    const detailState = createDetailState({
      allPlayersReady: true,
      allPlayersReadyLabel: "Alle aktiven Teams sind bereit.",
      currentUserReady: true,
      recentResults: [
        {
          matchId: "match-1",
          label: "Berlin Blitz 24 - 17 Hamburg Harbor",
        },
      ],
      weekFlow: {
        ...createDetailState().weekFlow,
        phaseLabel: "Woche abgeschlossen",
        completedResultsLabel: "1 Ergebnis gespeichert",
        lastCompletedWeekLabel: "Zuletzt abgeschlossen: Season 1, Week 1.",
      },
    });

    expect(render(<ReadyStatePanel
      detailState={detailState}
      actionFeedback={{ tone: "success", message: "Ready gespeichert." }}
      readyGuidanceItems={[
        { label: "Team geprüft", completed: true, statusLabel: "Erledigt" },
      ]}
      pendingAction={null}
      onReadyForWeek={() => undefined}
    />)).toContain("Ready gespeichert");
    expect(render(<WeekResultPanel detailState={detailState} />)).toContain(
      "Berlin Blitz 24 - 17 Hamburg Harbor",
    );
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

  it("keeps admin controls hidden from the player dashboard", () => {
    expect(render(<AdminControlsPanel />)).toBe("");
  });
});
