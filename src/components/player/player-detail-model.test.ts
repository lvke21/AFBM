import { describe, expect, it } from "vitest";

import {
  getAttributeGroupState,
  getContractSummaryState,
  getCoreRatingItems,
  getPlayerDecisionLayer,
  getPlayerDecisionEvaluation,
  getPerformanceSnapshotItems,
  getPlayerPositionLabel,
  getPlayerStatusLabel,
  getPlayerTeamLabel,
  getTimelineState,
} from "./player-detail-model";

type DecisionLayerPlayer = Parameters<typeof getPlayerDecisionLayer>[0];
type DecisionLayerRoster = NonNullable<DecisionLayerPlayer["roster"]>;

function createDecisionRoster(overrides: Partial<DecisionLayerRoster> = {}): DecisionLayerRoster {
  return {
    archetypeName: null,
    captainFlag: false,
    depthChartSlot: 1,
    developmentFocus: false,
    injuryRisk: 35,
    positionGroupName: "Offense",
    practiceSquadEligible: null,
    primaryPositionCode: "QB",
    primaryPositionName: "Quarterback",
    rosterStatus: "STARTER",
    schemeFitName: null,
    secondaryPositionCode: null,
    secondaryPositionName: null,
    ...overrides,
  };
}

function createDecisionPlayer(
  overrides: Partial<DecisionLayerPlayer> = {},
): DecisionLayerPlayer {
  return {
    age: 27,
    evaluation: {
      defensiveOverall: null,
      mentalOverall: 77,
      offensiveOverall: 80,
      physicalOverall: 78,
      positionOverall: 80,
      potentialRating: 82,
      specialTeamsOverall: null,
    },
    fatigue: 35,
    id: "player-1",
    injuryStatus: "HEALTHY",
    roster: createDecisionRoster(),
    schemeFitScore: 68,
    ...overrides,
  };
}

describe("player detail model", () => {
  it("handles players without team or roster", () => {
    expect(getPlayerTeamLabel({ team: null })).toBe("Free Agent");
    expect(getPlayerPositionLabel({ roster: null })).toBe("Keine Position");
  });

  it("formats status with injury context only when needed", () => {
    expect(
      getPlayerStatusLabel({
        status: "ACTIVE",
        injuryStatus: "HEALTHY",
        injuryName: null,
      }),
    ).toBe("ACTIVE");
    expect(
      getPlayerStatusLabel({
        status: "ACTIVE",
        injuryStatus: "QUESTIONABLE",
        injuryName: "Hamstring",
      }),
    ).toBe("ACTIVE · QUESTIONABLE");
  });

  it("returns a clean no-contract state", () => {
    const state = getContractSummaryState(null);

    expect(state.hasContract).toBe(false);
    expect(state.title).toBe("Kein aktiver Vertrag");
  });

  it("filters empty attribute groups", () => {
    const state = getAttributeGroupState([
      {
        category: "GENERAL",
        label: "General",
        attributes: [],
      },
    ]);

    expect(state.isEmpty).toBe(true);
    expect(state.message).toBe("Keine Attribute fuer diesen Spieler vorhanden.");
  });

  it("sorts timeline events newest first and handles empty history", () => {
    expect(getTimelineState([]).isEmpty).toBe(true);
    expect(
      getTimelineState([
        {
          id: "old",
          type: "DEVELOPMENT",
          week: null,
          title: "Old",
          description: null,
          occurredAt: new Date("2025-01-01T00:00:00Z"),
        },
        {
          id: "new",
          type: "INJURY",
          week: 3,
          title: "New",
          description: null,
          occurredAt: new Date("2025-02-01T00:00:00Z"),
        },
      ]).events.map((event) => event.id),
    ).toEqual(["new", "old"]);
  });

  it("builds core rating items from player evaluation", () => {
    expect(
      getCoreRatingItems({
        defensiveOverall: null,
        mentalOverall: 76,
        offensiveOverall: 81,
        physicalOverall: 79,
        positionOverall: 82,
        potentialRating: 88,
        specialTeamsOverall: null,
      }),
    ).toEqual([
      { label: "OVR", value: 82 },
      { label: "POT", value: 88 },
      { label: "PHY", value: 79 },
      { label: "MENT", value: 76 },
      { label: "OFF", value: 81 },
      { label: "DEF", value: "n/a" },
      { label: "ST", value: "n/a" },
    ]);
  });

  it("labels the simple GM evaluation for starters, backups and prospects", () => {
    expect(
      getPlayerDecisionEvaluation({
        age: 27,
        evaluation: {
          defensiveOverall: null,
          mentalOverall: 78,
          offensiveOverall: 82,
          physicalOverall: 80,
          positionOverall: 82,
          potentialRating: 84,
          specialTeamsOverall: null,
        },
        roster: {
          archetypeName: null,
          captainFlag: false,
          depthChartSlot: 1,
          developmentFocus: false,
          injuryRisk: 30,
          positionGroupName: "Offense",
          practiceSquadEligible: null,
          primaryPositionCode: "QB",
          primaryPositionName: "Quarterback",
          rosterStatus: "STARTER",
          schemeFitName: null,
          secondaryPositionCode: null,
          secondaryPositionName: null,
        },
        schemeFitScore: 74,
      }).label,
    ).toBe("Starker Starter");

    expect(
      getPlayerDecisionEvaluation({
        age: 29,
        evaluation: {
          defensiveOverall: null,
          mentalOverall: 68,
          offensiveOverall: 70,
          physicalOverall: 72,
          positionOverall: 70,
          potentialRating: 72,
          specialTeamsOverall: null,
        },
        roster: {
          archetypeName: null,
          captainFlag: false,
          depthChartSlot: 2,
          developmentFocus: false,
          injuryRisk: 35,
          positionGroupName: "Offense",
          practiceSquadEligible: null,
          primaryPositionCode: "RB",
          primaryPositionName: "Running Back",
          rosterStatus: "BACKUP",
          schemeFitName: null,
          secondaryPositionCode: null,
          secondaryPositionName: null,
        },
        schemeFitScore: 55,
      }).label,
    ).toBe("Solider Backup");

    expect(
      getPlayerDecisionEvaluation({
        age: 22,
        evaluation: {
          defensiveOverall: 66,
          mentalOverall: 65,
          offensiveOverall: null,
          physicalOverall: 70,
          positionOverall: 66,
          potentialRating: 78,
          specialTeamsOverall: null,
        },
        roster: {
          archetypeName: null,
          captainFlag: false,
          depthChartSlot: 3,
          developmentFocus: true,
          injuryRisk: 40,
          positionGroupName: "Defense",
          practiceSquadEligible: true,
          primaryPositionCode: "CB",
          primaryPositionName: "Cornerback",
          rosterStatus: "BACKUP",
          schemeFitName: null,
          secondaryPositionCode: null,
          secondaryPositionName: null,
        },
        schemeFitScore: 60,
      }).label,
    ).toBe("Entwicklungsspieler");
  });

  it("builds fast start, bench and develop decisions with comparison hints", () => {
    const starterDecision = getPlayerDecisionLayer(createDecisionPlayer());

    expect(starterDecision.label).toBe("Sollte Starter sein");
    expect(starterDecision.action).toBe("start");
    expect(starterDecision.comparison.label).toBe("Aktueller Slot #1");

    const borderlineDecision = getPlayerDecisionLayer(
      createDecisionPlayer({
        evaluation: {
          defensiveOverall: null,
          mentalOverall: 72,
          offensiveOverall: 76,
          physicalOverall: 75,
          positionOverall: 76,
          potentialRating: 78,
          specialTeamsOverall: null,
        },
        id: "player-2",
        roster: createDecisionRoster({
          depthChartSlot: 2,
          rosterStatus: "BACKUP",
        }),
      }),
      [
        {
          depthChartSlot: 1,
          fullName: "Starter One",
          id: "starter-1",
          positionCode: "QB",
          positionOverall: 78,
          rosterStatus: "STARTER",
        },
      ],
    );

    expect(borderlineDecision.label).toBe("Grenzfall Starter/Backup");
    expect(borderlineDecision.comparison.label).toBe("Nah am Slot #1");

    const depthDecision = getPlayerDecisionLayer(
      createDecisionPlayer({
        evaluation: {
          defensiveOverall: null,
          mentalOverall: 62,
          offensiveOverall: 64,
          physicalOverall: 66,
          positionOverall: 64,
          potentialRating: 65,
          specialTeamsOverall: null,
        },
        id: "player-3",
        roster: createDecisionRoster({
          depthChartSlot: 3,
          rosterStatus: "BACKUP",
        }),
      }),
      [
        {
          depthChartSlot: 1,
          fullName: "Starter One",
          id: "starter-1",
          positionCode: "QB",
          positionOverall: 78,
          rosterStatus: "STARTER",
        },
      ],
    );

    expect(depthDecision.label).toBe("Nur Tiefe");
    expect(depthDecision.comparison.label).toBe("Schlechter als Slot #1");

    const developmentDecision = getPlayerDecisionLayer(
      createDecisionPlayer({
        age: 22,
        evaluation: {
          defensiveOverall: 66,
          mentalOverall: 66,
          offensiveOverall: null,
          physicalOverall: 70,
          positionOverall: 66,
          potentialRating: 78,
          specialTeamsOverall: null,
        },
        id: "player-4",
        roster: createDecisionRoster({
          depthChartSlot: 3,
          positionGroupName: "Defense",
          primaryPositionCode: "CB",
          primaryPositionName: "Cornerback",
          rosterStatus: "BACKUP",
        }),
      }),
      [
        {
          depthChartSlot: 1,
          fullName: "Starter Corner",
          id: "starter-2",
          positionCode: "CB",
          positionOverall: 76,
          rosterStatus: "STARTER",
        },
      ],
    );

    expect(developmentDecision.label).toBe("Entwickeln");
    expect(developmentDecision.action).toBe("develop");
  });

  it("surfaces decision risks from existing player data", () => {
    const decision = getPlayerDecisionLayer(
      createDecisionPlayer({
        evaluation: {
          defensiveOverall: null,
          mentalOverall: 72,
          offensiveOverall: 72,
          physicalOverall: 72,
          positionOverall: 72,
          potentialRating: 72,
          specialTeamsOverall: null,
        },
        fatigue: 74,
        injuryStatus: "QUESTIONABLE",
        roster: createDecisionRoster({
          depthChartSlot: null,
          rosterStatus: "ROTATION",
        }),
        schemeFitScore: 40,
      }),
    );

    expect(decision.risks.map((risk) => risk.label)).toEqual([
      "Schwacher Scheme Fit",
      "Hohe Fatigue",
      "Verletzungsrisiko",
      "Niedriges Potential",
      "Ohne Slot",
    ]);
  });

  it("surfaces trade-offs and position conflicts from existing signals", () => {
    const starterWithConflict = getPlayerDecisionLayer(
      createDecisionPlayer({
        evaluation: {
          defensiveOverall: null,
          mentalOverall: 79,
          offensiveOverall: 80,
          physicalOverall: 78,
          positionOverall: 80,
          potentialRating: 80,
          specialTeamsOverall: null,
        },
        fatigue: 72,
      }),
      [
        {
          age: 22,
          depthChartSlot: 2,
          fullName: "Rookie Option",
          id: "rookie-1",
          positionCode: "QB",
          positionOverall: 72,
          potentialRating: 84,
          rosterStatus: "BACKUP",
        },
      ],
    );

    expect(starterWithConflict.tradeoffs.map((tradeoff) => tradeoff.label)).toEqual([
      "Starker Starter, aber hohe Fatigue",
      "Jetzt stark, spaeter begrenzt",
      "Blockiert Entwicklung von Rookie Option",
    ]);

    const upsideBackup = getPlayerDecisionLayer(
      createDecisionPlayer({
        age: 22,
        evaluation: {
          defensiveOverall: 66,
          mentalOverall: 66,
          offensiveOverall: null,
          physicalOverall: 70,
          positionOverall: 66,
          potentialRating: 80,
          specialTeamsOverall: null,
        },
        id: "player-5",
        roster: createDecisionRoster({
          depthChartSlot: 3,
          positionGroupName: "Defense",
          primaryPositionCode: "CB",
          primaryPositionName: "Cornerback",
          rosterStatus: "BACKUP",
        }),
      }),
      [
        {
          age: 28,
          depthChartSlot: 1,
          fullName: "Veteran Starter",
          id: "starter-cb",
          positionCode: "CB",
          positionOverall: 76,
          potentialRating: 77,
          rosterStatus: "STARTER",
        },
      ],
    );

    expect(upsideBackup.tradeoffs.map((tradeoff) => tradeoff.label)).toContain(
      "Mehr Potential, weniger aktuelle Leistung",
    );
    expect(upsideBackup.tradeoffs.map((tradeoff) => tradeoff.label)).toContain(
      "Alternative Option vorhanden",
    );
  });

  it("creates position-aware performance snapshots", () => {
    const baseStats = {
      gamesPlayed: 6,
      gamesStarted: 4,
      snapsOffense: 120,
      snapsDefense: 0,
      snapsSpecialTeams: 10,
      passing: {
        attempts: 100,
        completions: 60,
        yards: 720,
        touchdowns: 5,
        interceptions: 2,
        longestCompletion: 40,
      },
      rushing: {
        attempts: 10,
        yards: 55,
        touchdowns: 1,
        fumbles: 0,
        longestRush: 15,
      },
      receiving: {
        targets: 0,
        receptions: 0,
        yards: 0,
        touchdowns: 0,
        drops: 0,
        longestReception: 0,
        yardsAfterCatch: 0,
      },
      blocking: {
        passBlockSnaps: 0,
        runBlockSnaps: 0,
        sacksAllowed: 0,
        pressuresAllowed: 0,
        pancakes: 0,
      },
      defensive: {
        assistedTackles: 0,
        coverageSnaps: 0,
        forcedFumbles: 0,
        interceptions: 0,
        passesDefended: 0,
        receptionsAllowed: 0,
        sacks: 0,
        tackles: 0,
        tacklesForLoss: 0,
        targetsAllowed: 0,
        yardsAllowed: 0,
      },
      kicking: {
        extraPointsAttempted: 0,
        extraPointsMade: 0,
        fieldGoalsAttempted: 0,
        fieldGoalsAttemptedLong: 0,
        fieldGoalsAttemptedMid: 0,
        fieldGoalsAttemptedShort: 0,
        fieldGoalsMade: 0,
        fieldGoalsMadeLong: 0,
        fieldGoalsMadeMid: 0,
        fieldGoalsMadeShort: 0,
        longestFieldGoal: 0,
      },
      punting: {
        fairCatchesForced: 0,
        hangTimeTotalTenths: 0,
        longestPunt: 0,
        netPuntYards: 0,
        puntYards: 0,
        punts: 0,
        puntsInside20: 0,
      },
      returns: {
        kickReturnFumbles: 0,
        kickReturnTouchdowns: 0,
        kickReturnYards: 0,
        kickReturns: 0,
        puntReturnFumbles: 0,
        puntReturnTouchdowns: 0,
        puntReturnYards: 0,
        puntReturns: 0,
      },
      isCurrentTeamSeason: true,
      label: "2026",
      teamName: "BOS",
      year: 2026,
    };

    const items = getPerformanceSnapshotItems({
      career: null,
      latestSeason: baseStats,
      roster: {
        archetypeName: null,
        captainFlag: false,
        depthChartSlot: 1,
        developmentFocus: false,
        injuryRisk: 40,
        positionGroupName: "Quarterback",
        practiceSquadEligible: null,
        primaryPositionCode: "QB",
        primaryPositionName: "Quarterback",
        rosterStatus: "STARTER",
        schemeFitName: null,
        secondaryPositionCode: null,
        secondaryPositionName: null,
      },
    });

    expect(items.map((item) => item.label)).toEqual([
      "GP / GS",
      "Snaps",
      "Comp",
      "Pass YDS",
      "TD / INT",
    ]);
    expect(items.find((item) => item.label === "TD / INT")?.value).toBe("5 / 2");
  });
});
