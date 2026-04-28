import { describe, expect, it } from "vitest";

import {
  buildGamePreparationView,
  type GamePreparationMatch,
} from "./game-preparation-model";

function createMatch(overrides: Partial<GamePreparationMatch> = {}): GamePreparationMatch {
  return {
    status: "SCHEDULED",
    homeTeam: {
      id: "team-home",
      name: "Boston Guardians",
      abbreviation: "BOS",
      managerControlled: true,
      overallRating: 82,
      morale: 61,
      schemes: {
        offense: { code: "WEST_COAST", name: "West Coast" },
        defense: { code: "ZONE_DISCIPLINE", name: "Zone Discipline" },
        specialTeams: { code: "FIELD_POSITION", name: "Field Position" },
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
      id: "team-away",
      name: "New York Titans",
      abbreviation: "NYT",
      managerControlled: false,
      overallRating: 75,
      morale: 52,
      schemes: {
        offense: { code: "POWER_RUN", name: "Power Run" },
        defense: { code: "FOUR_THREE_FRONT", name: "4-3 Front" },
        specialTeams: null,
      },
    },
    ...overrides,
  };
}

describe("buildGamePreparationView", () => {
  it("loads the manager team, opponent and strength delta for scheduled games", () => {
    const view = buildGamePreparationView(createMatch());

    expect(view?.managerTeam.abbreviation).toBe("BOS");
    expect(view?.opponent.abbreviation).toBe("NYT");
    expect(view?.strengthDelta).toBe(7);
    expect(view?.strengthLabel).toBe("Vorteil");
    expect(view?.expectation.category).toBe("favorite");
    expect(view?.expectation.summary).toContain("Favorit");
    expect(view?.underdogObjectives).toEqual([]);
    expect(view?.canEditGameplan).toBe(true);
    expect(view?.offenseXFactorPlan.offensiveFocus).toBe("PASS_FIRST");
    expect(view?.offenseXFactorPlan.protectionPlan).toBe("FAST_RELEASE");
    expect(view?.defenseXFactorPlan.defensiveFocus).toBe("LIMIT_PASS");
    expect(view?.defenseXFactorPlan.defensiveMatchupFocus).toBe("DOUBLE_WR1");
  });

  it("locks the gameplan once the match has started", () => {
    const view = buildGamePreparationView(createMatch({ status: "IN_PROGRESS" }));

    expect(view?.canEditGameplan).toBe(false);
  });

  it("explains underdog preparation with the shared expectation logic", () => {
    const view = buildGamePreparationView(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          overallRating: 68,
        },
        awayTeam: {
          ...createMatch().awayTeam,
          overallRating: 82,
        },
      }),
    );

    expect(view?.expectation.category).toBe("heavy underdog");
    expect(view?.expectation.expectedPointsFloor).toBe(10);
    expect(view?.strengthLabel).toBe("Nachteil");
    expect(view?.underdogObjectives.map((objective) => objective.title)).toEqual([
      "Keep It Close",
      "Protect The Ball",
      "Overperform Offense",
      "Limit Their Offense",
    ]);
  });

  it("returns no preparation state when the manager team is not part of the match", () => {
    const view = buildGamePreparationView(
      createMatch({
        homeTeam: {
          ...createMatch().homeTeam,
          managerControlled: false,
        },
      }),
    );

    expect(view).toBeNull();
  });
});
