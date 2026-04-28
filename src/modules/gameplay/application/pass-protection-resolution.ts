import type {
  DefensivePlayDefinition,
  DefensivePlayFamily,
  OffensivePlayDefinition,
  OffensivePlayFamily,
  PlayAssignment,
} from "../domain/play-library";
import type { PlayerAlignmentSnapshot } from "../domain/pre-snap-structure";

type ProtectionOffensePlay = Pick<
  OffensivePlayDefinition,
  "id" | "family" | "label" | "assignments" | "expectedMetrics" | "legalityTemplate"
>;

type ProtectionDefensePlay = Pick<
  DefensivePlayDefinition,
  "id" | "family" | "label" | "assignments" | "expectedMetrics" | "legalityTemplate" | "structure"
>;

export type PassProtectionResolutionInput = {
  offensePlay: ProtectionOffensePlay;
  defensePlay: ProtectionDefensePlay;
  passBlocking: number;
  passRush: number;
  qbPocketPresence: number;
  qbAwareness: number;
  chemistryModifier?: {
    passProtectionBonus: number;
  };
};

export type PassProtectionTraceFactor = {
  label: string;
  value: number;
};

export type PassProtectionTrace = {
  notes: string[];
  factors: PassProtectionTraceFactor[];
  blockerIds: string[];
  rusherIds: string[];
};

export type PassProtectionResolution = {
  blockerCount: number;
  rusherCount: number;
  protectionAdvantage: number;
  doubleTeamChance: number;
  openBlitzLaneRisk: number;
  pressureLevel: number;
  pocketStability: number;
  isBlitz: boolean;
  isQuickCounter: boolean;
  trace: PassProtectionTrace;
};

const OFFENSIVE_LINE_POSITIONS = new Set(["LT", "LG", "C", "RG", "RT"]);
const EXTRA_PROTECTION_POSITIONS = new Set(["TE", "RB"]);
const DEFENSIVE_LINE_POSITIONS = new Set(["LE", "RE", "DT"]);
const BLITZ_POSITION_CODES = new Set(["LOLB", "MLB", "ROLB", "CB", "FS", "SS"]);

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

function addMatchingPlayers(input: {
  target: Set<string>;
  players: PlayerAlignmentSnapshot[];
  positionCodes: Iterable<string>;
  limitPerCode?: number;
}) {
  for (const positionCode of input.positionCodes) {
    const matches = input.players.filter(
      (player) => player.positionCode === positionCode && !input.target.has(playerKey(player)),
    );
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

function resolvePassBlockerIds(play: ProtectionOffensePlay) {
  const blockers = new Set<string>();
  const offensePlayers = play.legalityTemplate.offensePlayers;

  addMatchingPlayers({
    target: blockers,
    players: offensePlayers,
    positionCodes: OFFENSIVE_LINE_POSITIONS,
  });

  addMatchingPlayers({
    target: blockers,
    players: offensePlayers,
    positionCodes: relevantAssignmentCodes(
      play.assignments,
      "PASS_PROTECTION",
      EXTRA_PROTECTION_POSITIONS,
    ),
    limitPerCode: 1,
  });

  return [...blockers];
}

function resolveRusherIds(play: ProtectionDefensePlay) {
  const rushers = new Set<string>();
  const defensePlayers = play.legalityTemplate.defensePlayers;

  addMatchingPlayers({
    target: rushers,
    players: defensePlayers,
    positionCodes: DEFENSIVE_LINE_POSITIONS,
  });

  addMatchingPlayers({
    target: rushers,
    players: defensePlayers,
    positionCodes: relevantAssignmentCodes(
      play.assignments,
      "PRESSURE",
      BLITZ_POSITION_CODES,
    ),
    limitPerCode: 1,
  });

  return [...rushers];
}

function defensePressureBias(family: DefensivePlayFamily) {
  switch (family) {
    case "ZERO_PRESSURE":
      return 0.22;
    case "FIRE_ZONE":
      return 0.16;
    case "RUN_BLITZ":
      return 0.14;
    case "SIMULATED_PRESSURE":
      return 0.11;
    case "MAN_COVERAGE":
      return 0.04;
    case "RED_ZONE_PACKAGE":
      return 0.06;
    case "DROP_EIGHT":
      return -0.05;
    default:
      return 0;
  }
}

function offenseCounterBias(family: OffensivePlayFamily) {
  switch (family) {
    case "SCREEN":
      return 0.2;
    case "QUICK_PASS":
    case "EMPTY_TEMPO":
      return 0.13;
    case "MOVEMENT_PASS":
    case "OPTION_RPO":
      return 0.08;
    case "DROPBACK":
      return -0.06;
    case "PLAY_ACTION":
      return -0.03;
    default:
      return 0;
  }
}

function deepPassExposure(family: OffensivePlayFamily, expectedYards: number) {
  if (family === "DROPBACK") {
    return expectedYards >= 8 ? 0.08 : 0.05;
  }

  if (family === "PLAY_ACTION") {
    return expectedYards >= 8 ? 0.06 : 0.03;
  }

  return 0;
}

export function resolvePassProtection(
  input: PassProtectionResolutionInput,
): PassProtectionResolution {
  const blockerIds = resolvePassBlockerIds(input.offensePlay);
  const rusherIds = resolveRusherIds(input.defensePlay);
  const blockerCount = blockerIds.length;
  const rusherCount = rusherIds.length;
  const countAdvantage = blockerCount - rusherCount;
  const protectionRating =
    input.passBlocking * 0.66 +
    input.qbPocketPresence * 0.22 +
    input.qbAwareness * 0.12 +
    (input.chemistryModifier?.passProtectionBonus ?? 0);
  const ratingAdvantage = protectionRating - input.passRush;
  const protectionAdvantage = round(countAdvantage * 10 + ratingAdvantage * 0.45, 2);
  const quickCounter = offenseCounterBias(input.offensePlay.family);
  const isBlitz =
    rusherCount > 4 ||
    input.defensePlay.family === "ZERO_PRESSURE" ||
    input.defensePlay.family === "FIRE_ZONE" ||
    input.defensePlay.family === "RUN_BLITZ" ||
    input.defensePlay.family === "SIMULATED_PRESSURE";
  const doubleTeamChance = round(
    blockerCount > rusherCount
      ? clamp(
          (blockerCount - rusherCount) * 0.16 +
            Math.max(ratingAdvantage, 0) / 260 +
            Math.max(input.passBlocking - 72, 0) / 420,
          0.04,
          0.72,
        )
      : 0,
  );
  const openBlitzLaneRisk = round(
    rusherCount > blockerCount
      ? clamp(
          (rusherCount - blockerCount) * 0.17 +
            Math.max(-ratingAdvantage, 0) / 260 +
            defensePressureBias(input.defensePlay.family) * 0.35 -
            Math.max(quickCounter, 0) * 0.45,
          0.04,
          0.78,
        )
      : 0,
  );
  const pressureLevel = round(
    clamp(
      0.28 +
        defensePressureBias(input.defensePlay.family) +
        deepPassExposure(input.offensePlay.family, input.offensePlay.expectedMetrics.expectedYards) +
        (rusherCount - blockerCount) * 0.075 +
        (input.passRush - protectionRating) / 210 +
        openBlitzLaneRisk * 0.22 -
        doubleTeamChance * 0.16 -
        Math.max(quickCounter, 0) * (isBlitz ? 0.85 : 0.45),
      0.04,
      0.92,
    ),
  );
  const pocketStability = round(
    clamp(
      0.78 -
        pressureLevel +
        (input.qbPocketPresence - 72) / 190 +
        (input.qbAwareness - 72) / 260 +
        doubleTeamChance * 0.1 -
        openBlitzLaneRisk * 0.18,
      0.05,
      0.95,
    ),
  );

  return {
    blockerCount,
    rusherCount,
    protectionAdvantage,
    doubleTeamChance,
    openBlitzLaneRisk,
    pressureLevel,
    pocketStability,
    isBlitz,
    isQuickCounter: quickCounter > 0,
    trace: {
      notes: [
        `${input.offensePlay.family} pass protection against ${input.defensePlay.family}.`,
        `Resolved ${blockerCount} blocker(s) against ${rusherCount} rusher(s).`,
        quickCounter > 0
          ? `${input.offensePlay.family} provides a pressure counter, but does not erase rush risk.`
          : `${input.offensePlay.family} does not provide a fast pressure counter.`,
      ],
      factors: [
        { label: "countAdvantage", value: countAdvantage },
        { label: "protectionRating", value: round(protectionRating, 2) },
        { label: "passRush", value: input.passRush },
        { label: "ratingAdvantage", value: round(ratingAdvantage, 2) },
        {
          label: "chemistryPassProtectionBonus",
          value: input.chemistryModifier?.passProtectionBonus ?? 0,
        },
        { label: "defensePressureBias", value: defensePressureBias(input.defensePlay.family) },
        { label: "offenseCounterBias", value: quickCounter },
        {
          label: "deepPassExposure",
          value: deepPassExposure(
            input.offensePlay.family,
            input.offensePlay.expectedMetrics.expectedYards,
          ),
        },
      ],
      blockerIds,
      rusherIds,
    },
  };
}
