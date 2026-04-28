import { describe, expect, it } from "vitest";

import {
  classifyMatchExpectation,
  evaluateUnderdogObjectives,
  evaluateMoralVictory,
  selectUnderdogObjectives,
} from "./weak-team-goals";

describe("weak-team goals", () => {
  it("classifies rating expectations into clear matchup bands", () => {
    expect(classifyMatchExpectation({ teamRating: 64, opponentRating: 80 }).category).toBe(
      "heavy underdog",
    );
    expect(classifyMatchExpectation({ teamRating: 72, opponentRating: 79 }).category).toBe(
      "underdog",
    );
    expect(classifyMatchExpectation({ teamRating: 76, opponentRating: 75 }).category).toBe(
      "even",
    );
    expect(classifyMatchExpectation({ teamRating: 82, opponentRating: 74 }).category).toBe(
      "favorite",
    );
  });

  it("recognizes a close loss by an underdog as a moral victory", () => {
    const assessment = evaluateMoralVictory({
      opponentName: "Metro Kings",
      opponentRating: 82,
      opponentScore: 24,
      opponentTurnovers: 1,
      teamName: "Harbor Wolves",
      teamRating: 69,
      teamScore: 17,
      teamTurnovers: 1,
    });

    expect(assessment.expectation.category).toBe("heavy underdog");
    expect(assessment.status).toBe("moral victory");
    expect(assessment.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        "CLOSE_UNDERDOG_LOSS",
        "OFFENSE_ABOVE_EXPECTATION",
        "DEFENSE_HELD_STRONG_TEAM",
        "BLOWOUT_AVOIDED",
        "TURNOVERS_CONTROLLED",
      ]),
    );
    expect(assessment.moraleDelta).toBe(1);
    expect(assessment.progressionXpBonus).toBe(4);
  });

  it("does not reward a favorite for only winning narrowly", () => {
    const assessment = evaluateMoralVictory({
      opponentName: "Harbor Wolves",
      opponentRating: 70,
      opponentScore: 21,
      teamName: "Metro Kings",
      teamRating: 82,
      teamScore: 24,
    });

    expect(assessment.expectation.category).toBe("favorite");
    expect(assessment.status).toBe("expected result");
    expect(assessment.reasons).toEqual([]);
    expect(assessment.moraleDelta).toBe(0);
    expect(assessment.progressionXpBonus).toBe(0);
  });

  it("recognizes an upset against a stronger opponent", () => {
    const assessment = evaluateMoralVictory({
      opponentName: "Metro Kings",
      opponentRating: 82,
      opponentScore: 20,
      teamName: "Harbor Wolves",
      teamRating: 69,
      teamScore: 23,
    });

    expect(assessment.status).toBe("upset");
    expect(assessment.reasons[0]).toMatchObject({
      code: "UPSET",
      title: "Upset geschafft",
    });
    expect(assessment.moraleDelta).toBe(2);
    expect(assessment.progressionXpBonus).toBe(6);
  });

  it("keeps unfinished matches side-effect free and readable", () => {
    const assessment = evaluateMoralVictory({
      opponentName: "Metro Kings",
      opponentRating: 82,
      opponentScore: null,
      teamName: "Harbor Wolves",
      teamRating: 69,
      teamScore: null,
    });

    expect(assessment.status).toBe("expected result");
    expect(assessment.reasons).toEqual([]);
    expect(assessment.moraleDelta).toBe(0);
    expect(assessment.progressionXpBonus).toBe(0);
    expect(assessment.seasonGoals.length).toBeGreaterThan(0);
  });

  it("selects underdog objectives only for underdog matchup bands", () => {
    const heavy = classifyMatchExpectation({ teamRating: 64, opponentRating: 80 });
    const even = classifyMatchExpectation({ teamRating: 76, opponentRating: 75 });
    const favorite = classifyMatchExpectation({ teamRating: 82, opponentRating: 74 });

    expect(selectUnderdogObjectives(heavy).map((objective) => objective.id)).toEqual([
      "KEEP_IT_CLOSE",
      "PROTECT_THE_BALL",
      "OVERPERFORM_OFFENSE",
      "LIMIT_THEIR_OFFENSE",
    ]);
    expect(selectUnderdogObjectives(even)).toEqual([]);
    expect(selectUnderdogObjectives(favorite)).toEqual([]);
  });

  it("evaluates underdog objectives with fulfilled, partial and missed statuses", () => {
    const assessment = evaluateUnderdogObjectives({
      opponentName: "Metro Kings",
      opponentRating: 82,
      opponentScore: 31,
      teamName: "Harbor Wolves",
      teamRating: 69,
      teamScore: 17,
      teamTurnovers: 1,
    });

    expect(assessment.expectation.category).toBe("heavy underdog");
    expect(assessment.objectives.map((objective) => [objective.id, objective.status])).toEqual([
      ["KEEP_IT_CLOSE", "fulfilled"],
      ["PROTECT_THE_BALL", "fulfilled"],
      ["OVERPERFORM_OFFENSE", "fulfilled"],
      ["LIMIT_THEIR_OFFENSE", "partial"],
    ]);
    expect(assessment.moraleSignal).toBe(1);
    expect(assessment.progressionSignal).toBe(3);
    expect(assessment.rebuildSignal).toBe(true);
  });

  it("keeps objective evaluation safe for missing stats and non-underdogs", () => {
    const underdog = evaluateUnderdogObjectives({
      opponentName: "Metro Kings",
      opponentRating: 82,
      opponentScore: 24,
      teamName: "Harbor Wolves",
      teamRating: 69,
      teamScore: 14,
      teamTurnovers: null,
    });
    const favorite = evaluateUnderdogObjectives({
      opponentName: "Harbor Wolves",
      opponentRating: 70,
      opponentScore: 21,
      teamName: "Metro Kings",
      teamRating: 82,
      teamScore: 24,
    });

    expect(underdog.objectives.find((objective) => objective.id === "PROTECT_THE_BALL")?.status).toBe("partial");
    expect(underdog.objectives.find((objective) => objective.id === "PROTECT_THE_BALL")?.explanation).toContain("fehlen");
    expect(favorite.objectives).toEqual([]);
    expect(favorite.summary).toContain("Keine Underdog Objectives");
  });
});
