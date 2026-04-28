import { describe, expect, it } from "vitest";

import { resolveCompetitionRuleProfile } from "../domain/competition-rules";
import type { GameSituationSnapshot } from "../domain/game-situation";
import {
  resolveHeadCoachMomentum,
  type HeadCoachProfile,
  type MomentumEvent,
} from "./head-coach-momentum-service";

const profile = resolveCompetitionRuleProfile("NFL_PRO");

const baseSituation: GameSituationSnapshot = {
  ruleset: "NFL_PRO",
  hashMarkProfile: profile.hashMarks,
  quarter: 2,
  down: 2,
  yardsToGo: 7,
  ballOnYardLine: 48,
  distanceBucket: "MEDIUM",
  fieldZone: "MIDFIELD",
  clockBucket: "MIDDLE",
  scoreBucket: "TIED",
  offenseScore: 14,
  defenseScore: 14,
  secondsRemainingInQuarter: 620,
  secondsRemainingInGame: 2120,
  offenseTimeouts: 3,
  defenseTimeouts: 3,
  tempoProfile: "NORMAL",
  possessionTeamId: "OFF",
  defenseTeamId: "DEF",
};

const strongCoach: HeadCoachProfile = {
  motivation: 91,
  stability: 93,
  bigPicture: 90,
  riskControl: 88,
  teamDiscipline: 89,
};

const weakCoach: HeadCoachProfile = {
  motivation: 48,
  stability: 45,
  bigPicture: 50,
  riskControl: 47,
  teamDiscipline: 49,
};

function resolve(input: {
  headCoach?: HeadCoachProfile;
  situation?: Partial<GameSituationSnapshot>;
  recentEvents?: MomentumEvent[];
  unsuccessfulDriveStreak?: number;
} = {}) {
  return resolveHeadCoachMomentum({
    headCoach: input.headCoach ?? strongCoach,
    situation: {
      ...baseSituation,
      ...(input.situation ?? {}),
    },
    recentEvents: input.recentEvents ?? [],
    unsuccessfulDriveStreak: input.unsuccessfulDriveStreak ?? 0,
  });
}

describe("head coach momentum service", () => {
  it("lets a strong head coach stabilize better than a weak coach after an interception", () => {
    const events: MomentumEvent[] = [{ type: "INTERCEPTION", sequence: 10 }];
    const good = resolve({ headCoach: strongCoach, recentEvents: events });
    const bad = resolve({ headCoach: weakCoach, recentEvents: events });

    expect(good.coachStabilization).toBeGreaterThan(bad.coachStabilization);
    expect(good.disciplineModifier).toBeGreaterThan(bad.disciplineModifier);
    expect(good.focusModifier).toBeGreaterThan(bad.focusModifier);
    expect(good.errorChainRisk).toBeLessThan(bad.errorChainRisk);
    expect(good.collapseRisk).toBeLessThan(bad.collapseRisk);
  });

  it("raises error-chain risk after sacks, drops, fumbles and big plays against", () => {
    const calm = resolve({ headCoach: strongCoach });
    const shocked = resolve({
      headCoach: strongCoach,
      recentEvents: [
        { type: "SACK", sequence: 1 },
        { type: "DROP", sequence: 2 },
        { type: "FUMBLE", sequence: 3 },
        { type: "BIG_PLAY_AGAINST", sequence: 4 },
      ],
    });

    expect(shocked.eventShock).toBeGreaterThan(calm.eventShock);
    expect(shocked.errorChainRisk).toBeGreaterThan(calm.errorChainRisk);
    expect(shocked.focusModifier).toBeLessThan(calm.focusModifier);
    expect(shocked.collapseRisk).toBeLessThanOrEqual(0.26);
  });

  it("treats red-zone fourth-quarter close games as critical without rubber-banding", () => {
    const leading = resolve({
      situation: {
        quarter: 4,
        fieldZone: "LOW_RED_ZONE",
        clockBucket: "TWO_MINUTE",
        secondsRemainingInGame: 118,
        offenseScore: 24,
        defenseScore: 21,
        scoreBucket: "LEADING",
      },
    });
    const trailing = resolve({
      situation: {
        quarter: 4,
        fieldZone: "LOW_RED_ZONE",
        clockBucket: "TWO_MINUTE",
        secondsRemainingInGame: 118,
        offenseScore: 21,
        defenseScore: 24,
        scoreBucket: "TRAILING",
      },
    });

    expect(leading.criticalSituationPressure).toBeGreaterThan(0.3);
    expect(trailing.criticalSituationPressure).toBe(leading.criticalSituationPressure);
    expect(Math.abs(trailing.focusModifier - leading.focusModifier)).toBeLessThan(0.001);
    expect(Math.abs(trailing.collapseRisk - leading.collapseRisk)).toBeLessThan(0.001);
  });

  it("adds pressure after multiple failed drives but keeps effects small", () => {
    const baseline = resolve({ headCoach: strongCoach });
    const failedDrives = resolve({
      headCoach: strongCoach,
      recentEvents: [
        { type: "FAILED_DRIVE", sequence: 5 },
        { type: "FAILED_DRIVE", sequence: 6 },
      ],
      unsuccessfulDriveStreak: 3,
    });

    expect(failedDrives.errorChainRisk).toBeGreaterThan(baseline.errorChainRisk);
    expect(failedDrives.collapseRisk).toBeGreaterThan(baseline.collapseRisk);
    expect(Math.abs(failedDrives.disciplineModifier)).toBeLessThanOrEqual(0.055);
    expect(Math.abs(failedDrives.focusModifier)).toBeLessThanOrEqual(0.075);
  });

  it("emits a momentum and focus trace for debug reports", () => {
    const result = resolve({
      recentEvents: [{ type: "FUMBLE", sequence: 7 }],
      unsuccessfulDriveStreak: 1,
    });

    expect(result.trace.notes.join(" ")).toContain("negative-event shock");
    expect(result.trace.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "eventShock" }),
        expect.objectContaining({ label: "criticalSituationPressure" }),
        expect.objectContaining({ label: "coachStabilization" }),
      ]),
    );
  });
});
