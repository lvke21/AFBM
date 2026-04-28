import type {
  DefensivePlayDefinition,
  DefensivePlayFamily,
  OffensivePlayDefinition,
  OffensivePlayFamily,
  PlayAssignment,
} from "../domain/play-library";
import type { AlignmentSide, PlayerAlignmentSnapshot } from "../domain/pre-snap-structure";

type RunLaneOffensePlay = Pick<
  OffensivePlayDefinition,
  "id" | "family" | "label" | "assignments" | "expectedMetrics" | "legalityTemplate"
>;

type RunLaneDefensePlay = Pick<
  DefensivePlayDefinition,
  "id" | "family" | "label" | "assignments" | "expectedMetrics" | "legalityTemplate" | "structure"
>;

export type RunDirection = "INSIDE" | "LEFT" | "RIGHT" | "OUTSIDE_LEFT" | "OUTSIDE_RIGHT";

export type RunLaneResolutionInput = {
  offensePlay: RunLaneOffensePlay;
  defensePlay: RunLaneDefensePlay;
  runBlocking: number;
  strength: number;
  toughness: number;
  rbVision: number;
  rbElusiveness: number;
  rbBreakTackle: number;
  defenseRunDefense: number;
  blockShedding: number;
  tackling: number;
  playRecognition: number;
  gameplanRunDirection: RunDirection;
  chemistryModifier?: {
    runBlockingBonus: number;
  };
};

export type RunLaneTraceFactor = {
  label: string;
  value: number;
};

export type RunLaneTrace = {
  notes: string[];
  factors: RunLaneTraceFactor[];
  blockerIds: string[];
  boxDefenderIds: string[];
};

export type RunLaneResolution = {
  blockerCount: number;
  boxDefenderCount: number;
  blockerAdvantage: number;
  laneQuality: number;
  openLaneChance: number;
  stuffedRisk: number;
  negativeYardageRisk: number;
  rbCreationChance: number;
  expectedYardsModifier: number;
  trace: RunLaneTrace;
};

const OFFENSIVE_LINE_POSITIONS = new Set(["LT", "LG", "C", "RG", "RT"]);
const CORE_RUN_BLOCK_POSITIONS = new Set(["TE", "FB"]);
const PERIMETER_RUN_BLOCK_POSITIONS = new Set(["WR"]);
const DEFENSIVE_LINE_POSITIONS = new Set(["LE", "RE", "DT"]);
const LINEBACKER_POSITIONS = new Set(["LOLB", "MLB", "ROLB"]);
const SAFETY_POSITIONS = new Set(["FS", "SS"]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 3) {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

function playerKey(player: PlayerAlignmentSnapshot) {
  return `${player.playerId ?? player.positionCode}:${player.alignmentIndex}`;
}

function directionSide(direction: RunDirection): AlignmentSide | null {
  if (direction === "LEFT" || direction === "OUTSIDE_LEFT") {
    return "LEFT";
  }

  if (direction === "RIGHT" || direction === "OUTSIDE_RIGHT") {
    return "RIGHT";
  }

  return "MIDDLE";
}

function isOutsideRun(direction: RunDirection) {
  return direction === "OUTSIDE_LEFT" || direction === "OUTSIDE_RIGHT";
}

function addMatchingPlayers(input: {
  target: Set<string>;
  players: PlayerAlignmentSnapshot[];
  positionCodes: Iterable<string>;
  side?: AlignmentSide | null;
  limitPerCode?: number;
}) {
  for (const positionCode of input.positionCodes) {
    const matches = input.players.filter((player) => {
      const sideMatches = !input.side || player.lineOfScrimmageSide === input.side;

      return (
        player.positionCode === positionCode &&
        sideMatches &&
        !input.target.has(playerKey(player))
      );
    });
    const limitedMatches = matches.slice(0, input.limitPerCode ?? matches.length);

    for (const player of limitedMatches) {
      input.target.add(playerKey(player));
    }
  }
}

function relevantAssignmentCodes(
  assignments: PlayAssignment[],
  assignmentType: PlayAssignment["assignmentType"],
  allowedPositions: Set<string>,
) {
  return assignments
    .filter((assignment) => assignment.assignmentType === assignmentType)
    .flatMap((assignment) => assignment.positionCodes)
    .filter((positionCode) => allowedPositions.has(positionCode));
}

function resolveRunBlockerIds(play: RunLaneOffensePlay, direction: RunDirection) {
  const blockers = new Set<string>();
  const offensePlayers = play.legalityTemplate.offensePlayers;
  const side = directionSide(direction);

  addMatchingPlayers({
    target: blockers,
    players: offensePlayers,
    positionCodes: OFFENSIVE_LINE_POSITIONS,
  });

  addMatchingPlayers({
    target: blockers,
    players: offensePlayers,
    positionCodes: CORE_RUN_BLOCK_POSITIONS,
  });

  addMatchingPlayers({
    target: blockers,
    players: offensePlayers,
    positionCodes: relevantAssignmentCodes(
      play.assignments,
      "RUN_BLOCK",
      CORE_RUN_BLOCK_POSITIONS,
    ),
  });

  if (isOutsideRun(direction)) {
    addMatchingPlayers({
      target: blockers,
      players: offensePlayers,
      positionCodes: relevantAssignmentCodes(
        play.assignments,
        "RUN_BLOCK",
        PERIMETER_RUN_BLOCK_POSITIONS,
      ),
      side,
    });
  }

  return [...blockers];
}

function resolveBoxDefenderIds(play: RunLaneDefensePlay) {
  const boxDefenders = new Set<string>();
  const defensePlayers = play.legalityTemplate.defensePlayers;

  addMatchingPlayers({
    target: boxDefenders,
    players: defensePlayers,
    positionCodes: DEFENSIVE_LINE_POSITIONS,
  });

  addMatchingPlayers({
    target: boxDefenders,
    players: defensePlayers,
    positionCodes: LINEBACKER_POSITIONS,
  });

  for (const player of defensePlayers) {
    const assignedFit = play.assignments.some(
      (assignment) =>
        assignment.assignmentType === "FIT" &&
        assignment.positionCodes.includes(player.positionCode),
    );
    const safetyInBox =
      SAFETY_POSITIONS.has(player.positionCode) &&
      (player.snapRole === "DEFENSIVE_BOX" ||
        player.fieldAlignment === "CORE" ||
        assignedFit);

    if (safetyInBox) {
      boxDefenders.add(playerKey(player));
    }
  }

  return [...boxDefenders];
}

function runConceptBias(family: OffensivePlayFamily, direction: RunDirection) {
  if (family === "GAP_RUN" && direction === "INSIDE") {
    return 4;
  }

  if (family === "ZONE_RUN" && isOutsideRun(direction)) {
    return 2;
  }

  if (family === "DESIGNED_QB_RUN" && isOutsideRun(direction)) {
    return 1.5;
  }

  if (family === "OPTION_RPO") {
    return 1;
  }

  return 0;
}

function defenseRunFitBias(family: DefensivePlayFamily, direction: RunDirection) {
  switch (family) {
    case "RUN_BLITZ":
      return direction === "INSIDE" ? 7 : 4;
    case "RED_ZONE_PACKAGE":
      return 4;
    case "ZERO_PRESSURE":
      return 2.5;
    case "DROP_EIGHT":
    case "THREE_HIGH_PACKAGE":
      return -4;
    case "BRACKET_SPECIALTY":
      return -2;
    default:
      return 0;
  }
}

export function resolveRunLane(input: RunLaneResolutionInput): RunLaneResolution {
  const blockerIds = resolveRunBlockerIds(
    input.offensePlay,
    input.gameplanRunDirection,
  );
  const boxDefenderIds = resolveBoxDefenderIds(input.defensePlay);
  const blockerCount = blockerIds.length;
  const boxDefenderCount = boxDefenderIds.length;
  const countAdvantage = blockerCount - boxDefenderCount;
  const blockerPower =
    (input.runBlocking + (input.chemistryModifier?.runBlockingBonus ?? 0)) * 0.54 +
    input.strength * 0.27 +
    input.toughness * 0.19;
  const rbCreation =
    input.rbVision * 0.42 +
    input.rbElusiveness * 0.3 +
    input.rbBreakTackle * 0.28;
  const defenseFit =
    input.defenseRunDefense * 0.36 +
    input.blockShedding * 0.27 +
    input.tackling * 0.2 +
    input.playRecognition * 0.17;
  const conceptBias = runConceptBias(
    input.offensePlay.family,
    input.gameplanRunDirection,
  );
  const fitBias = defenseRunFitBias(
    input.defensePlay.family,
    input.gameplanRunDirection,
  );
  const outsideCreationBonus = isOutsideRun(input.gameplanRunDirection)
    ? (input.rbElusiveness - 72) * 0.08
    : 0;
  const blockerAdvantage = round(
    countAdvantage * 9 +
      (blockerPower - defenseFit) * 0.44 +
      conceptBias -
      fitBias +
      outsideCreationBonus,
    2,
  );
  const laneQuality = round(
    clamp(
      0.5 +
        blockerAdvantage / 76 +
        Math.max(input.rbVision - 72, 0) / 420 -
        Math.max(72 - input.rbVision, 0) / 520,
      0.05,
      0.95,
    ),
  );
  const rbCreationChance = round(
    clamp(
      0.12 +
        (rbCreation - 64) / 120 +
        (0.5 - Math.abs(laneQuality - 0.5)) * 0.16 +
        (isOutsideRun(input.gameplanRunDirection)
          ? Math.max(input.rbElusiveness - 72, 0) / 360
          : Math.max(input.rbBreakTackle - 72, 0) / 380),
      0.04,
      0.68,
    ),
  );
  const openLaneChance = round(
    clamp(
      0.13 +
        Math.max(blockerAdvantage, 0) / 88 +
        Math.max(input.rbVision - 72, 0) / 340 +
        rbCreationChance * 0.14,
      0.02,
      0.78,
    ),
  );
  const stuffedRisk = round(
    clamp(
      0.18 +
        Math.max(-blockerAdvantage, 0) / 76 +
        Math.max(boxDefenderCount - blockerCount, 0) * 0.07 +
        Math.max(defenseFit - blockerPower, 0) / 320 -
        Math.max(rbCreation - 72, 0) / 340,
      0.03,
      0.76,
    ),
  );
  const negativeYardageRisk = round(
    clamp(
      stuffedRisk * 0.47 +
        Math.max(-blockerAdvantage, 0) / 180 +
        Math.max(input.blockShedding - input.runBlocking, 0) / 420 -
        Math.max(input.rbVision - 72, 0) / 520,
      0.01,
      0.46,
    ),
  );
  const expectedYardsModifier = round(
    (laneQuality - 0.5) * 6.2 +
      openLaneChance * 3.1 -
      stuffedRisk * 2.4 -
      negativeYardageRisk * 3.2 +
      Math.max(rbCreation - 72, 0) / 52 -
      Math.max(72 - rbCreation, 0) / 78,
    2,
  );

  return {
    blockerCount,
    boxDefenderCount,
    blockerAdvantage,
    laneQuality,
    openLaneChance,
    stuffedRisk,
    negativeYardageRisk,
    rbCreationChance,
    expectedYardsModifier,
    trace: {
      notes: [
        `${input.offensePlay.family} run lane against ${input.defensePlay.family}.`,
        `Resolved ${blockerCount} blocker(s) against ${boxDefenderCount} box defender(s).`,
        blockerAdvantage > 8
          ? "Offense has enough lane leverage to create open-lane outcomes."
          : blockerAdvantage < -8
            ? "Defense has fit leverage and raises negative-play risk."
            : "Neutral lane: runner traits decide how much is created after the mesh.",
      ],
      factors: [
        { label: "countAdvantage", value: countAdvantage },
        { label: "blockerPower", value: round(blockerPower, 2) },
        { label: "rbCreation", value: round(rbCreation, 2) },
        { label: "defenseFit", value: round(defenseFit, 2) },
        { label: "runConceptBias", value: conceptBias },
        { label: "defenseRunFitBias", value: fitBias },
        { label: "outsideCreationBonus", value: round(outsideCreationBonus, 2) },
        {
          label: "chemistryRunBlockingBonus",
          value: input.chemistryModifier?.runBlockingBonus ?? 0,
        },
      ],
      blockerIds,
      boxDefenderIds,
    },
  };
}
