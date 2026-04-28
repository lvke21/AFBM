import { describe, expect, it } from "vitest";

import {
  buildBoxScoreRows,
  buildDriveLogState,
  buildEngineDecisionPanelState,
  buildMatchFeedbackState,
  buildMatchupExplanationState,
  buildMoralVictoryState,
  buildPostGameSummaryState,
  buildScoreboardState,
  buildTopPerformerCards,
  buildUnderdogObjectiveState,
  buildWhyGameOutcomeState,
  type MatchReport,
} from "./match-report-model";

function createMatch(overrides: Partial<MatchReport> = {}): MatchReport {
  return {
    status: "COMPLETED",
    stadiumName: "Harbor Field",
    summary: "Boston gewann ueber Ballkontrolle und Red-Zone-Effizienz.",
    homeTeam: {
      name: "Boston Guardians",
      abbreviation: "BOS",
      managerControlled: true,
      overallRating: 78,
      score: 27,
      stats: {
        firstDowns: 21,
        totalYards: 386,
        passingYards: 241,
        rushingYards: 145,
        turnovers: 1,
        explosivePlays: 5,
        redZoneTrips: 4,
        redZoneTouchdowns: 3,
      },
      schemes: {
        offense: {
          name: "West Coast",
        },
      },
      xFactorPlan: {
        offense: {
          offensiveFocus: "PASS_FIRST",
          protectionPlan: "FAST_RELEASE",
        },
        defense: {
          defensiveFocus: "LIMIT_PASS",
          defensiveMatchupFocus: "DOUBLE_WR1",
        },
      },
    },
    awayTeam: {
      name: "New York Titans",
      abbreviation: "NYT",
      gameplanSummary: {
        aggression: "aggressive",
        aiStrategyArchetype: "UNDERDOG_VARIANCE",
        defenseFocus: "limit pass",
        label: "underdog variance",
        offenseFocus: "pass first",
        summary: "AI/Gameplan: underdog variance, pass first, aggressive, hurry up.",
      },
      managerControlled: false,
      overallRating: 72,
      score: 20,
      stats: {
        firstDowns: 18,
        totalYards: 331,
        passingYards: 220,
        rushingYards: 111,
        turnovers: 2,
        explosivePlays: 3,
        redZoneTrips: 3,
        redZoneTouchdowns: 1,
      },
    },
    leaders: {
      passing: {
        fullName: "Alex Carter",
        teamAbbreviation: "BOS",
        positionCode: "QB",
        passingYards: 241,
        rushingYards: 12,
        receivingYards: 0,
        tackles: 0,
        sacks: 0,
        interceptions: 0,
        fieldGoalsMade: 0,
        puntsInside20: 0,
      },
      rushing: null,
    },
    drives: [
      {
        sequence: 1,
        phaseLabel: "Q1",
        offenseTeamAbbreviation: "BOS",
        defenseTeamAbbreviation: "NYT",
        startedScore: "0-0",
        endedScore: "7-0",
        plays: 8,
        passAttempts: 5,
        rushAttempts: 3,
        totalYards: 74,
        resultType: "TOUCHDOWN",
        turnover: false,
        redZoneTrip: true,
        summary: "Boston beendet den Drive mit einem Touchdown.",
        pointsScored: 7,
        primaryPlayerName: "Alex Carter",
        primaryDefenderName: null,
        engineDecisionSummary:
          "Quick Pass gegen erwarteten Druck: stabile Protection, kurzes Target verfuegbar.",
        developerDebugAvailable: true,
      },
    ],
    ...overrides,
  };
}

describe("match report model", () => {
  it("builds a scoreboard state from completed match data", () => {
    const state = buildScoreboardState(createMatch());

    expect(state.homeScore).toBe(27);
    expect(state.awayScore).toBe(20);
    expect(state.hasFinalScore).toBe(true);
    expect(state.statusLabel).toBe("COMPLETED");
  });

  it("builds a BoxScore with stable rows and red-zone values", () => {
    const rows = buildBoxScoreRows(createMatch());

    expect(rows).toEqual([
      { label: "First Downs", home: 21, away: 18 },
      { label: "Total Yards", home: 386, away: 331 },
      { label: "Passing Yards", home: 241, away: 220 },
      { label: "Rushing Yards", home: 145, away: 111 },
      { label: "Turnovers", home: 1, away: 2 },
      { label: "Explosive Plays", home: 5, away: 3 },
      { label: "Red Zone TD", home: "3/4", away: "1/3" },
    ]);
  });

  it("keeps top performer cards and DriveLog data readable", () => {
    const match = createMatch();

    expect(buildTopPerformerCards(match.leaders)).toEqual([
      {
        category: "passing",
        leader: match.leaders.passing,
        isEmpty: false,
      },
      {
        category: "rushing",
        leader: null,
        isEmpty: true,
      },
    ]);
    expect(buildDriveLogState(match.drives).hasDrives).toBe(true);
    expect(buildDriveLogState(match.drives).hasEngineExplanations).toBe(true);
  });

  it("builds a compact engine decision panel without overloading the drive log", () => {
    const panel = buildEngineDecisionPanelState(createMatch().drives);

    expect(panel.hasExplanations).toBe(true);
    expect(panel.developerDebugAvailable).toBe(true);
    expect(panel.explainedDrives[0]).toEqual({
      sequence: 1,
      label: "BOS Drive 1",
      playCall:
        "Pass Call: Der Drive war klar passlastig, die Offense suchte schnelle Yards oder musste aufholen.",
      pressure:
        "Niedrig: Die Offense blieb im Rhythmus und gewann genug Raum pro Play.",
      decisionTime:
        "Ausreichend: Die Offense bekam genug Zeit fuer entwickelte Targets oder klare Entscheidungen.",
      keyReasons: [
        "5 Passes / 3 Runs zeigen die Spielidee des Drives.",
        "Scoring Drive: 7 Punkte bestaetigen, dass die Offense den Plan verwerten konnte.",
        "Explosivitaet: Hoher Raumgewinn pro Play machte den Drive effizient.",
        "Schluesselspieler Offense: Alex Carter.",
      ],
      sourceNote:
        "Aus dem gespeicherten Drive-Verlauf abgeleitet: Play-Mix, Ergebnis, Punkte, Turnover, Red-Zone und Yards.",
      developerDebugAvailable: true,
    });
  });

  it("explains why the manager team won without exposing technical raw values", () => {
    const state = buildWhyGameOutcomeState(createMatch());

    expect(state.perspective).toBe("won");
    expect(state.verdict).toBe("Du hast gewonnen: Turnovers war der wichtigste Faktor.");
    expect(state.keyFactors.map((factor) => factor.label)).toEqual([
      "Turnovers",
      "Red Zone",
      "Ratings & Matchups",
      "Gameplan & X-Factor",
    ]);
    expect(state.keyFactors[0]).toEqual({
      label: "Turnovers",
      weight: 18,
      winnerValue: "1",
      loserValue: "2",
      explanation:
        "Boston Guardians schuetzte den Ball etwas besser und vermied den teuren Fehler.",
    });
    expect(state.insights).toEqual([
      {
        label: "Ball gesichert",
        explanation: "Dein Team machte weniger teure Fehler und bekam stabilere Drives.",
        tone: "positive",
      },
      {
        label: "Offense effizient",
        explanation: "Gute Feldpositionen wurden haeufiger in Punkte verwandelt.",
        tone: "positive",
      },
      {
        label: "Matchup gewonnen",
        explanation: "Dein Team gewann genug direkte Duelle fuer Raumgewinn und Big Plays.",
        tone: "positive",
      },
    ]);
  });

  it("explains why the manager team lost with simple plausible insights", () => {
    const state = buildWhyGameOutcomeState(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          score: 17,
          stats: {
            ...createMatch().homeTeam.stats!,
            totalYards: 280,
            turnovers: 3,
            redZoneTouchdowns: 1,
            redZoneTrips: 3,
            explosivePlays: 2,
          },
        },
        awayTeam: {
          ...createMatch().awayTeam,
          score: 27,
          stats: {
            ...createMatch().awayTeam.stats!,
            totalYards: 360,
            turnovers: 1,
            redZoneTouchdowns: 3,
            redZoneTrips: 4,
            explosivePlays: 5,
          },
        },
      }),
    );

    expect(state.perspective).toBe("lost");
    expect(state.insights.length).toBeGreaterThanOrEqual(1);
    expect(state.insights.length).toBeLessThanOrEqual(3);
    expect(state.insights.map((insight) => insight.label)).toContain("Ballverluste zu teuer");
    expect(state.insights.map((insight) => insight.label)).toContain("Offense ineffizient");
    expect(state.insights.every((insight) => insight.explanation.length > 0)).toBe(true);
  });

  it("maps manager gameplan decisions into concise report feedback", () => {
    const state = buildWhyGameOutcomeState(createMatch());
    const gameplan = state.keyFactors.find((factor) => factor.label === "Gameplan & X-Factor");

    expect(gameplan?.explanation).toContain("Manager-Entscheidung");
    expect(gameplan?.explanation).toContain("pass first");
    expect(gameplan?.explanation).toContain("fast release");
    expect(gameplan?.explanation).toContain("Defensiver Plan");
  });

  it("builds a compact feedback summary without requiring every data source", () => {
    const feedback = buildMatchFeedbackState(createMatch());

    expect(feedback.items.map((item) => item.label)).toEqual([
      "Match-Ergebnis",
      "Moral Victory",
      "Dein Gameplan",
      "AI/Gameplan",
      "BOS Wirkung",
      "NYT Wirkung",
      "Drive-Erklaerung",
    ]);
    expect(feedback.items[1]?.explanation).toContain("Kein Reward-Hinweis");
    expect(feedback.items[2]?.explanation).toContain("Manager-Entscheidung");
    expect(feedback.items[3]?.explanation).toContain("underdog variance");
  });

  it("builds a compact post-game summary with the next action", () => {
    const state = buildPostGameSummaryState(createMatch());

    expect(state.result).toBe("Gewonnen 27:20");
    expect(state.insight).toBe("Sieg: Aufstellung und Gameplan haben genug Vorteile erzeugt.");
    expect(state.nextActionLabel).toBe("Naechste Aktion pruefen");
    expect(state.tone).toBe("positive");
  });

  it("keeps the post-game summary stable before final scores exist", () => {
    const state = buildPostGameSummaryState(
      createMatch({
        status: "SCHEDULED",
        homeTeam: {
          ...createMatch().homeTeam,
          score: null,
        },
        awayTeam: {
          ...createMatch().awayTeam,
          score: null,
        },
      }),
    );

    expect(state.result).toBe("Noch kein finales Ergebnis");
    expect(state.insight).toBe("Die kompakte Auswertung erscheint, sobald das Spiel abgeschlossen ist.");
    expect(state.nextActionLabel).toBe("Setup pruefen");
  });

  it("marks a close underdog loss as a moral victory in the report model", () => {
    const state = buildMoralVictoryState(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          overallRating: 68,
          score: 17,
          stats: {
            ...createMatch().homeTeam.stats!,
            totalYards: 301,
            turnovers: 1,
          },
        },
        awayTeam: {
          ...createMatch().awayTeam,
          overallRating: 82,
          score: 24,
          stats: {
            ...createMatch().awayTeam.stats!,
            turnovers: 1,
          },
        },
      }),
    );

    expect(state.assessment?.expectation.category).toBe("heavy underdog");
    expect(state.assessment?.status).toBe("moral victory");
    expect(state.assessment?.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(["CLOSE_UNDERDOG_LOSS", "BLOWOUT_AVOIDED"]),
    );
  });

  it("evaluates underdog objectives in the post-game report model", () => {
    const state = buildUnderdogObjectiveState(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          overallRating: 68,
          score: 17,
          stats: {
            ...createMatch().homeTeam.stats!,
            turnovers: 1,
          },
        },
        awayTeam: {
          ...createMatch().awayTeam,
          overallRating: 82,
          score: 31,
        },
      }),
    );

    expect(state.assessment?.objectives.map((objective) => [objective.title, objective.status])).toEqual([
      ["Keep It Close", "fulfilled"],
      ["Protect The Ball", "fulfilled"],
      ["Overperform Offense", "fulfilled"],
      ["Limit Their Offense", "partial"],
    ]);
    expect(state.assessment?.rebuildSignal).toBe(true);
  });

  it("does not create underdog objectives for favorites", () => {
    const state = buildUnderdogObjectiveState(createMatch());

    expect(state.assessment?.expectation.category).toBe("favorite");
    expect(state.assessment?.objectives).toEqual([]);
  });

  it("builds an underdog post-game explanation with compact drivers", () => {
    const state = buildMatchupExplanationState(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          overallRating: 68,
          score: 17,
          stats: {
            ...createMatch().homeTeam.stats!,
            totalYards: 301,
            turnovers: 1,
            explosivePlays: 2,
          },
        },
        awayTeam: {
          ...createMatch().awayTeam,
          overallRating: 82,
          score: 24,
          stats: {
            ...createMatch().awayTeam.stats!,
            totalYards: 355,
            turnovers: 1,
            explosivePlays: 4,
          },
        },
      }),
    );

    expect(state.expectationLabel).toBe("heavy underdog");
    expect(state.resultLabel).toBe("Ueber Erwartung");
    expect(state.reasons.map((reason) => reason.label)).toEqual([
      "Rating / Matchup",
      "Ergebnis vs Erwartung",
      "Turnovers",
      "On-Field Wirkung",
      "Gameplan / AI",
    ]);
    expect(state.reasons).toHaveLength(5);
  });

  it("builds a favorite explanation without treating a narrow win as a moral victory", () => {
    const state = buildMatchupExplanationState(createMatch());

    expect(state.expectationLabel).toBe("favorite");
    expect(state.resultLabel).toBe("Im Rahmen der Erwartung");
    expect(state.summary).toContain("Boston Guardians gewann");
    expect(state.reasons.find((reason) => reason.label === "Rating / Matchup")?.tone).toBe(
      "positive",
    );
  });

  it("marks an underdog upset clearly", () => {
    const state = buildMoralVictoryState(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          overallRating: 68,
          score: 23,
        },
        awayTeam: {
          ...createMatch().awayTeam,
          overallRating: 82,
          score: 20,
        },
      }),
    );

    expect(state.assessment?.status).toBe("upset");
    expect(state.assessment?.moraleDelta).toBe(2);
    expect(state.assessment?.progressionXpBonus).toBe(6);
  });

  it("explains an upset as clearly above expectation", () => {
    const state = buildMatchupExplanationState(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          overallRating: 68,
          score: 23,
        },
        awayTeam: {
          ...createMatch().awayTeam,
          overallRating: 82,
          score: 20,
        },
      }),
    );

    expect(state.expectationLabel).toBe("heavy underdog");
    expect(state.resultLabel).toBe("Klar ueber Erwartung");
    expect(state.summary).toContain("Upset geschafft");
  });

  it("shows an explicit fallback when historical AI gameplan data is missing", () => {
    const feedback = buildMatchFeedbackState(
      createMatch({
        awayTeam: {
          ...createMatch().awayTeam,
          gameplanSummary: null,
          xFactorPlan: undefined,
        },
      }),
    );

    expect(feedback.items.find((item) => item.label === "AI/Gameplan")?.explanation).toBe(
      "AI-/Gameplan-Zusammenfassung nicht verfuegbar.",
    );
  });

  it("keeps feedback summary safe when final stats are missing", () => {
    const match = createMatch({
      status: "SCHEDULED",
      homeTeam: {
        ...createMatch().homeTeam,
        score: null,
        stats: null,
      },
      awayTeam: {
        ...createMatch().awayTeam,
        score: null,
        stats: null,
      },
      drives: [],
    });
    const feedback = buildMatchFeedbackState(match);

    expect(feedback.items.find((item) => item.label === "Match-Ergebnis")).toBeUndefined();
    expect(feedback.items.find((item) => item.label === "Moral Victory")?.value).toBe("favorite");
    expect(feedback.items.find((item) => item.label === "Underdog Objectives")).toBeUndefined();
    expect(feedback.items.find((item) => item.label === "BOS Verfassung")?.value).toBe(
      "Noch keine Teamwerte",
    );
    expect(feedback.items.find((item) => item.label === "Drive-Erklaerung")?.value).toBe(
      "0 Drives",
    );

    const explanation = buildMatchupExplanationState(match);

    expect(explanation.resultLabel).toBe("Noch nicht gespielt");
    expect(explanation.reasons.find((reason) => reason.label === "Turnovers")).toBeUndefined();
    expect(explanation.reasons.find((reason) => reason.label === "On-Field Wirkung")).toBeUndefined();
  });

  it("keeps why-won/lost empty for unfinished games", () => {
    const state = buildWhyGameOutcomeState(
      createMatch({
        status: "SCHEDULED",
        homeTeam: {
          ...createMatch().homeTeam,
          score: null,
          stats: null,
        },
        awayTeam: {
          ...createMatch().awayTeam,
          score: null,
          stats: null,
        },
        drives: [],
      }),
    );

    expect(state.perspective).toBe("neutral");
    expect(state.keyFactors).toEqual([]);
    expect(state.insights).toEqual([]);
    expect(state.emptyMessage).toContain("nach dem finalen Ergebnis");
  });

  it("keeps completed games from falling into an empty insight state", () => {
    const state = buildWhyGameOutcomeState(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          score: 14,
          stats: null,
        },
        awayTeam: {
          ...createMatch().awayTeam,
          score: 10,
          stats: null,
        },
        drives: [],
      }),
    );

    expect(state.keyFactors).toHaveLength(1);
    expect(state.insights).toEqual([
      {
        label: "Entscheidende Situationen gewonnen",
        explanation: "Dein Team war in den wichtigsten Momenten stabiler.",
        tone: "positive",
      },
    ]);
  });

  it("represents empty scheduled games without misleading stats", () => {
    const emptyMatch = createMatch({
      status: "SCHEDULED",
      summary: "Dieses Match ist noch nicht abgeschlossen.",
      homeTeam: {
        ...createMatch().homeTeam,
        score: null,
        stats: null,
      },
      awayTeam: {
        ...createMatch().awayTeam,
        score: null,
        stats: null,
      },
      leaders: {
        passing: null,
        rushing: null,
      },
      drives: [],
    });

    const scoreboard = buildScoreboardState(emptyMatch);

    expect(scoreboard.homeScore).toBe("-");
    expect(scoreboard.awayScore).toBe("-");
    expect(scoreboard.hasFinalScore).toBe(false);
    expect(buildBoxScoreRows(emptyMatch)[0]).toEqual({
      label: "First Downs",
      home: "-",
      away: "-",
    });
    expect(buildTopPerformerCards(emptyMatch.leaders).every((card) => card.isEmpty)).toBe(true);
    expect(buildDriveLogState(emptyMatch.drives).hasDrives).toBe(false);
    expect(buildEngineDecisionPanelState(emptyMatch.drives).hasExplanations).toBe(false);
  });
});
