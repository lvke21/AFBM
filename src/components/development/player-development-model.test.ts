import { describe, expect, it } from "vitest";

import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

import {
  buildPlayerDevelopmentState,
  buildDevelopmentWeekComparison,
  getDevelopmentProgressPercent,
  getFreshnessPercent,
  getPlayerDevelopmentFormLabel,
} from "./player-development-model";

function makePlayer(overrides: Partial<TeamPlayerSummary> = {}): TeamPlayerSummary {
  const player: TeamPlayerSummary = {
    age: 23,
    archetypeName: "Balanced",
    captainFlag: false,
    currentContract: {
      capHit: 1200000,
      signingBonus: 250000,
      yearlySalary: 900000,
      years: 2,
    },
    depthChartSlot: 2,
    detailRatings: [],
    developmentFocus: false,
    fatigue: 30,
    fullName: "Casey Prospect",
    heightCm: 188,
    id: "player-1",
    injuryName: null,
    injuryStatus: "HEALTHY",
    keyAttributes: {
      awareness: 70,
      coverageRange: 60,
      discipline: 70,
      durability: 75,
      hands: 68,
      kickConsistency: 50,
      leadership: 66,
      linebackerCoverage: 55,
      linebackerManCoverage: 55,
      linebackerZoneCoverage: 55,
      mobility: 72,
      returnVision: 50,
      snapAccuracy: 50,
      snapVelocity: 50,
      speed: 78,
      strength: 70,
    },
    mentalOverall: 72,
    morale: 70,
    physicalOverall: 74,
    positionCode: "WR",
    positionGroupName: "Receiver",
    positionName: "Wide Receiver",
    positionOverall: 72,
    potentialRating: 82,
    rosterStatus: "BACKUP",
    schemeFitName: "Vertical",
    schemeFitScore: 72,
    seasonLine: {
      fieldGoalsAttempted: 0,
      fieldGoalsMade: 0,
      gamesPlayed: 3,
      interceptions: 0,
      passesDefended: 0,
      passingInterceptions: 0,
      passingTouchdowns: 0,
      passingYards: 0,
      punts: 0,
      puntsInside20: 0,
      receivingTouchdowns: 1,
      receivingYards: 120,
      receptions: 9,
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
    weightKg: 95,
    yearsPro: 1,
  };

  return {
    ...player,
    ...overrides,
    keyAttributes: {
      ...player.keyAttributes,
      ...overrides.keyAttributes,
    },
    seasonLine: {
      ...player.seasonLine,
      ...overrides.seasonLine,
    },
  };
}

function makeTeam(players: TeamPlayerSummary[]): TeamDetail {
  return {
    abbreviation: "BOS",
    cashBalance: 10000000,
    conferenceName: "AFC",
    contractOutlook: {
      activeCapCommitted: 100000000,
      expiringCap: 1000000,
      expiringPlayers: [],
    },
    currentRecord: "2-1",
    divisionName: "East",
    id: "team-1",
    managerControlled: true,
    morale: 65,
    name: "Boston Captains",
    overallRating: 76,
    players,
    recentDecisionEvents: [],
    recentFinanceEvents: [],
    salaryCapSpace: 15000000,
    schemes: {
      defense: "4-3",
      offense: "Vertical",
      specialTeams: "Balanced",
    },
    teamNeeds: [],
  };
}

describe("player development model", () => {
  it("handles missing team context with a stable empty state", () => {
    const state = buildPlayerDevelopmentState(null);

    expect(state.candidates).toEqual([]);
    expect(state.managerControlled).toBe(false);
    expect(state.summary).toBe("Kein Teamkontext vorhanden.");
  });

  it("builds focus metrics and prioritizes focused players before upside candidates", () => {
    const state = buildPlayerDevelopmentState(
      makeTeam([
        makePlayer({
          developmentFocus: true,
          fullName: "Focused Backup",
          id: "focused",
          positionOverall: 70,
          potentialRating: 76,
        }),
        makePlayer({
          age: 22,
          fullName: "High Upside",
          id: "upside",
          positionOverall: 68,
          potentialRating: 82,
        }),
        makePlayer({
          fullName: "Inactive Player",
          id: "inactive",
          status: "FREE_AGENT",
        }),
      ]),
    );

    expect(state.focusedCount).toBe(1);
    expect(state.highUpsideCount).toBe(1);
    expect(state.candidates.map((player) => player.id)).toEqual(["focused", "upside"]);
    expect(state.trendPlayers.map((player) => player.id)).toEqual(["focused", "upside"]);
    expect(state.summary).toContain("1 Fokus-Spieler");
  });

  it("derives progress and form signals from existing player fields only", () => {
    expect(
      getDevelopmentProgressPercent({
        positionOverall: 90,
        potentialRating: 80,
      }),
    ).toBe(100);
    expect(
      getDevelopmentProgressPercent({
        positionOverall: 72,
        potentialRating: 80,
      }),
    ).toBe(90);
    expect(getFreshnessPercent({ fatigue: 35 })).toBe(65);
    expect(
      getPlayerDevelopmentFormLabel({
        fatigue: 20,
        injuryStatus: "QUESTIONABLE",
        morale: 90,
      }),
    ).toBe("Injury Watch");
    expect(
      getPlayerDevelopmentFormLabel({
        fatigue: 80,
        injuryStatus: "HEALTHY",
        morale: 90,
      }),
    ).toBe("Heavy Load");
    expect(
      getPlayerDevelopmentFormLabel({
        fatigue: 35,
        injuryStatus: "HEALTHY",
        morale: 85,
      }),
    ).toBe("Ready");
  });

  it("connects development trend to depth chart decisions and fatigue", () => {
    const state = buildPlayerDevelopmentState(
      makeTeam([
        makePlayer({
          depthChartSlot: 1,
          fullName: "Starter Growth",
          id: "starter-growth",
          positionOverall: 72,
          potentialRating: 82,
          rosterStatus: "STARTER",
        }),
        makePlayer({
          depthChartSlot: 3,
          fullName: "Low Usage",
          id: "low-usage",
          positionOverall: 68,
          potentialRating: 80,
          rosterStatus: "BACKUP",
          seasonLine: {
            ...makePlayer().seasonLine,
            gamesPlayed: 0,
          },
        }),
        makePlayer({
          depthChartSlot: 1,
          fatigue: 82,
          fullName: "Overloaded Starter",
          id: "overloaded",
          positionOverall: 78,
          potentialRating: 84,
          rosterStatus: "STARTER",
        }),
      ]),
    );
    const starter = state.candidates.find((player) => player.id === "starter-growth");
    const lowUsage = state.candidates.find((player) => player.id === "low-usage");
    const overloaded = state.candidates.find((player) => player.id === "overloaded");

    expect(starter?.trendDirection).toBe("rising");
    expect(starter?.feedback).toBe("Entwickelt sich gut durch Spielzeit");
    expect(starter?.decisionConnection).toBe(
      "Starter-Rolle beschleunigt Entwicklung, erhoeht aber Belastung.",
    );
    expect(starter?.factors.map((factor) => factor.label)).toEqual([
      "Spielzeit",
      "Alter",
      "Potential",
      "Belastung",
    ]);

    expect(lowUsage?.trendDirection).toBe("stagnating");
    expect(lowUsage?.feedback).toBe("Stagnation durch geringe Nutzung");
    expect(lowUsage?.factors.find((factor) => factor.label === "Spielzeit")?.value).toBe(
      "Backup",
    );

    expect(overloaded?.trendDirection).toBe("falling");
    expect(overloaded?.feedback).toBe("Ueberlastung bremst Entwicklung");
    expect(overloaded?.factors.find((factor) => factor.label === "Belastung")?.tone).toBe(
      "danger",
    );
  });

  it("uses stored development history for a clear week comparison", () => {
    const comparison = buildDevelopmentWeekComparison({
      currentOverall: 74,
      depthChartSlot: 2,
      developmentFocus: true,
      fatigue: 28,
      history: [
        {
          description: "XP 12 · OVR 72->73 · AWARENESS 70->71",
          id: "history-1",
          occurredAt: new Date("2026-09-09T12:00:00Z"),
          title: "Alte Entwicklung",
          type: "DEVELOPMENT",
          week: 1,
        },
        {
          description: "Casey Prospect: OVR 73->74 · XP 18 · Development Focus: +8 XP, streak 2",
          id: "history-2",
          occurredAt: new Date("2026-09-16T12:00:00Z"),
          title: "Wochenentwicklung sichtbar",
          type: "DEVELOPMENT",
          week: 2,
        },
      ],
      injuryStatus: "HEALTHY",
      rosterStatus: "BACKUP",
      seasonGamesPlayed: 3,
    });

    expect(comparison.hasStoredHistory).toBe(true);
    expect(comparison.lastWeek).toBe("Woche 2: OVR 73");
    expect(comparison.current).toBe("OVR 74");
    expect(comparison.change).toBe("+1 OVR");
    expect(comparison.cause).toBe("Development Focus und Wochen-XP aus gespeicherter History.");
    expect(comparison.sourceLabel).toBe("Woche 2 gespeichert");
  });

  it("falls back transparently when no stored previous week exists", () => {
    const comparison = buildDevelopmentWeekComparison({
      currentOverall: 72,
      depthChartSlot: 1,
      developmentFocus: false,
      fatigue: 35,
      history: [],
      injuryStatus: "HEALTHY",
      rosterStatus: "STARTER",
      seasonGamesPlayed: 1,
    });

    expect(comparison.hasStoredHistory).toBe(false);
    expect(comparison.lastWeek).toBe("kein gespeicherter Vorwochenwert");
    expect(comparison.current).toBe("OVR 72");
    expect(comparison.change).toBe("nicht gespeichert");
    expect(comparison.cause).toBe(
      "Starter-Rolle spricht fuer Spielzeit; konkrete Wochenveraenderung fehlt noch.",
    );
    expect(comparison.sourceLabel).toBe("Aktueller Stand");
  });

  it("adds week comparison to development candidates", () => {
    const state = buildPlayerDevelopmentState(
      makeTeam([
        makePlayer({
          developmentHistory: [
            {
              description: "Casey Prospect: OVR 71->72 · XP 15",
              id: "history-1",
              occurredAt: new Date("2026-09-16T12:00:00Z"),
              title: "Wochenentwicklung sichtbar",
              type: "DEVELOPMENT",
              week: 2,
            },
          ],
          positionOverall: 72,
        }),
      ]),
    );

    expect(state.candidates[0]?.weekComparison.lastWeek).toBe("Woche 2: OVR 71");
    expect(state.candidates[0]?.weekComparison.change).toBe("+1 OVR");
  });
});
