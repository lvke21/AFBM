import type { GameSituationSnapshot } from "../domain/game-situation";

export type HeadCoachProfile = {
  motivation: number;
  stability: number;
  bigPicture: number;
  riskControl: number;
  teamDiscipline: number;
};

export type MomentumEventType =
  | "SACK"
  | "INTERCEPTION"
  | "FUMBLE"
  | "DROP"
  | "BIG_PLAY_AGAINST"
  | "FAILED_DRIVE";

export type MomentumEvent = {
  type: MomentumEventType;
  sequence: number;
};

export type HeadCoachMomentumInput = {
  headCoach: HeadCoachProfile;
  situation: GameSituationSnapshot;
  recentEvents: MomentumEvent[];
  unsuccessfulDriveStreak: number;
};

export type HeadCoachMomentumTrace = {
  notes: string[];
  factors: Array<{
    label: string;
    value: number;
  }>;
};

export type HeadCoachMomentumModifier = {
  disciplineModifier: number;
  focusModifier: number;
  riskControlModifier: number;
  errorChainRisk: number;
  collapseRisk: number;
  criticalSituationPressure: number;
  eventShock: number;
  coachStabilization: number;
  trace: HeadCoachMomentumTrace;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 3) {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

function ratingEdge(value: number) {
  return clamp((value - 72) / 28, -1, 1);
}

function eventWeight(type: MomentumEventType) {
  switch (type) {
    case "INTERCEPTION":
      return 0.18;
    case "FUMBLE":
      return 0.16;
    case "BIG_PLAY_AGAINST":
      return 0.14;
    case "DROP":
      return 0.1;
    case "SACK":
      return 0.09;
    case "FAILED_DRIVE":
      return 0.08;
  }
}

function recentEventShock(events: MomentumEvent[]) {
  const sorted = [...events].sort((left, right) => right.sequence - left.sequence);

  return round(
    clamp(
      sorted
        .slice(0, 5)
        .reduce(
          (sum, event, index) => sum + eventWeight(event.type) * (1 - index * 0.13),
          0,
        ),
      0,
      0.48,
    ),
  );
}

function scoreDifferential(situation: GameSituationSnapshot) {
  return situation.offenseScore - situation.defenseScore;
}

function criticalPressure(situation: GameSituationSnapshot) {
  const isRedZone =
    situation.fieldZone === "HIGH_RED_ZONE" ||
    situation.fieldZone === "LOW_RED_ZONE" ||
    situation.fieldZone === "GOAL_TO_GO";
  const isFourthQuarter = situation.quarter >= 4;
  const isCloseGame = Math.abs(scoreDifferential(situation)) <= 8;
  const isLate =
    situation.clockBucket === "TWO_MINUTE" ||
    situation.clockBucket === "ENDGAME" ||
    situation.secondsRemainingInGame <= 420;
  const pressure =
    (isRedZone ? 0.16 : 0) +
    (isFourthQuarter ? 0.12 : 0) +
    (isCloseGame ? 0.13 : 0) +
    (isLate ? 0.12 : 0);

  return round(clamp(pressure, 0, 0.42));
}

function coachStabilization(profile: HeadCoachProfile) {
  return round(
    clamp(
      ratingEdge(profile.stability) * 0.34 +
        ratingEdge(profile.motivation) * 0.2 +
        ratingEdge(profile.bigPicture) * 0.2 +
        ratingEdge(profile.riskControl) * 0.16 +
        ratingEdge(profile.teamDiscipline) * 0.1,
      -1,
      1,
    ),
  );
}

export function resolveHeadCoachMomentum(
  input: HeadCoachMomentumInput,
): HeadCoachMomentumModifier {
  const eventShock = recentEventShock(input.recentEvents);
  const criticalSituationPressure = criticalPressure(input.situation);
  const stabilization = coachStabilization(input.headCoach);
  const driveStreakPressure = clamp(input.unsuccessfulDriveStreak * 0.055, 0, 0.22);
  const disciplineModifier = round(
    clamp(
      ratingEdge(input.headCoach.teamDiscipline) * 0.026 +
        stabilization * 0.012 -
        eventShock * 0.042 -
        criticalSituationPressure * 0.018,
      -0.055,
      0.045,
    ),
  );
  const focusModifier = round(
    clamp(
      (
        ratingEdge(input.headCoach.motivation) * 0.022 +
        ratingEdge(input.headCoach.stability) * 0.024 +
        ratingEdge(input.headCoach.bigPicture) * 0.018
      ) -
        eventShock * 0.075 -
        driveStreakPressure * 0.045 -
        criticalSituationPressure * 0.03,
      -0.075,
      0.055,
    ),
  );
  const riskControlModifier = round(
    clamp(
      ratingEdge(input.headCoach.riskControl) * 0.04 +
        stabilization * 0.012 -
        eventShock * 0.035,
      -0.06,
      0.05,
    ),
  );
  const errorChainRisk = round(
    clamp(
      0.14 +
        eventShock * 0.48 +
        driveStreakPressure * 0.62 +
        criticalSituationPressure * 0.1 -
        stabilization * 0.09 -
        ratingEdge(input.headCoach.riskControl) * 0.045,
      0.035,
      0.42,
    ),
  );
  const collapseRisk = round(
    clamp(
      0.045 +
        eventShock * 0.26 +
        driveStreakPressure * 0.34 +
        criticalSituationPressure * 0.09 -
        stabilization * 0.075 -
        ratingEdge(input.headCoach.stability) * 0.045,
      0.01,
      0.26,
    ),
  );
  const notes = [
    eventShock > 0
      ? `Recent negative-event shock ${eventShock.toFixed(3)}.`
      : "No recent negative-event shock.",
    criticalSituationPressure > 0
      ? `Critical situation pressure ${criticalSituationPressure.toFixed(3)}.`
      : "Normal situation pressure.",
    stabilization >= 0
      ? "Head coach profile stabilizes the next sequence."
      : "Head coach profile increases error-chain volatility.",
  ];

  return {
    disciplineModifier,
    focusModifier,
    riskControlModifier,
    errorChainRisk,
    collapseRisk,
    criticalSituationPressure,
    eventShock,
    coachStabilization: stabilization,
    trace: {
      notes,
      factors: [
        { label: "motivation", value: input.headCoach.motivation },
        { label: "stability", value: input.headCoach.stability },
        { label: "bigPicture", value: input.headCoach.bigPicture },
        { label: "riskControl", value: input.headCoach.riskControl },
        { label: "teamDiscipline", value: input.headCoach.teamDiscipline },
        { label: "eventShock", value: eventShock },
        { label: "criticalSituationPressure", value: criticalSituationPressure },
        { label: "driveStreakPressure", value: round(driveStreakPressure) },
        { label: "coachStabilization", value: stabilization },
      ],
    },
  };
}
