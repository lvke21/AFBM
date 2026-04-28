import {
  resolveCompetitionRuleProfile,
  type CompetitionRuleProfile,
} from "../domain/competition-rules";
import type { PlayResolutionRequest } from "../domain/play-resolution";
import type { PlaySelectionContext } from "../domain/play-selection";
import type {
  IneligibleDownfieldRequest,
  IneligibleDownfieldResult,
  LegalityIssue,
  LegalityRecommendation,
  LegalityResult,
  NormalizedPlayerAlignmentSnapshot,
  NormalizedPreSnapStructureSnapshot,
  PreSnapLegalityEngine,
} from "../domain/pre-snap-legality";
import type {
  PlayerAlignmentSnapshot,
  PersonnelPackage,
  PreSnapStructureSnapshot,
  ReceiverEligibilityState,
} from "../domain/pre-snap-structure";

function recommendation(
  action: LegalityRecommendation["action"],
  description: string,
): LegalityRecommendation {
  return {
    action,
    description,
  };
}

function createIssue(input: {
  code: LegalityIssue["code"];
  side: LegalityIssue["side"];
  message: string;
  playerIds?: string[];
  recommendation?: LegalityIssue["recommendation"];
}): LegalityIssue {
  return {
    code: input.code,
    side: input.side,
    message: input.message,
    playerIds: input.playerIds ?? [],
    recommendation: input.recommendation,
  };
}

function compareAlignment(left: PlayerAlignmentSnapshot, right: PlayerAlignmentSnapshot) {
  return left.alignmentIndex - right.alignmentIndex;
}

function resolveLinePositionRole(
  player: PlayerAlignmentSnapshot,
  linePlayers: PlayerAlignmentSnapshot[],
) {
  if (!player.onLineOfScrimmage) {
    return "BACKFIELD" as const;
  }

  const ordered = [...linePlayers].sort(compareAlignment);
  const leftMost = ordered[0];
  const rightMost = ordered[ordered.length - 1];

  if (leftMost && leftMost.playerId === player.playerId) {
    return "LEFT_END" as const;
  }

  if (rightMost && rightMost.playerId === player.playerId) {
    return "RIGHT_END" as const;
  }

  return "INTERIOR" as const;
}

function resolveReceiverState(
  player: PlayerAlignmentSnapshot,
  linePositionRole: "LEFT_END" | "RIGHT_END" | "INTERIOR" | "BACKFIELD",
) {
  if (player.receiverDeclaration === "ELIGIBLE") {
    return "ELIGIBLE" as const;
  }

  if (player.receiverDeclaration === "INELIGIBLE") {
    return "INELIGIBLE" as const;
  }

  if (linePositionRole === "LEFT_END" || linePositionRole === "RIGHT_END") {
    return "ELIGIBLE" as const;
  }

  if (linePositionRole === "INTERIOR") {
    return "INELIGIBLE" as const;
  }

  return player.snapRole === "BACKFIELD_QB" ? ("INELIGIBLE" as const) : ("ELIGIBLE" as const);
}

function normalizeOffensePlayers(
  snapshot: PreSnapStructureSnapshot,
): NormalizedPlayerAlignmentSnapshot[] {
  const linePlayers = snapshot.offensePlayers
    .filter((player) => player.onLineOfScrimmage)
    .sort(compareAlignment);

  return snapshot.offensePlayers
    .map((player) => {
      const linePositionRole = resolveLinePositionRole(player, linePlayers);
      const resolvedReceiverState = resolveReceiverState(player, linePositionRole);

      return {
        ...player,
        lineOrder: player.onLineOfScrimmage ? player.alignmentIndex : null,
        linePositionRole,
        resolvedReceiverState,
      };
    })
    .sort(compareAlignment);
}

function normalizeSnapshot(
  snapshot: PreSnapStructureSnapshot,
): NormalizedPreSnapStructureSnapshot {
  return {
    ...snapshot,
    offensePlayers: normalizeOffensePlayers(snapshot),
  };
}

function validatePlayerCounts(
  snapshot: NormalizedPreSnapStructureSnapshot,
  rules: CompetitionRuleProfile,
) {
  const issues: LegalityIssue[] = [];
  const offenseCount = snapshot.offensePlayers.length;
  const defenseCount = snapshot.defensePlayers.length;

  if (offenseCount < rules.preSnap.offensePlayersOnField) {
    issues.push(
      createIssue({
        code: "OFFENSE_TOO_FEW_PLAYERS",
        side: "OFFENSE",
        message: `Offense has ${offenseCount} players on the field; ${rules.preSnap.offensePlayersOnField} are required.`,
        recommendation: recommendation(
          "ADD_MISSING_PLAYER",
          "Add missing offensive players before the snap.",
        ),
      }),
    );
  } else if (offenseCount > rules.preSnap.offensePlayersOnField) {
    issues.push(
      createIssue({
        code: "OFFENSE_TOO_MANY_PLAYERS",
        side: "OFFENSE",
        message: `Offense has ${offenseCount} players on the field; ${rules.preSnap.offensePlayersOnField} are allowed.`,
        recommendation: recommendation(
          "REMOVE_EXTRA_PLAYER",
          "Remove extra offensive players before the snap.",
        ),
      }),
    );
  }

  if (defenseCount < rules.preSnap.defensePlayersOnField) {
    issues.push(
      createIssue({
        code: "DEFENSE_TOO_FEW_PLAYERS",
        side: "DEFENSE",
        message: `Defense has ${defenseCount} players on the field; ${rules.preSnap.defensePlayersOnField} are required.`,
        recommendation: recommendation(
          "ADD_MISSING_PLAYER",
          "Add missing defensive players before the snap.",
        ),
      }),
    );
  } else if (defenseCount > rules.preSnap.defensePlayersOnField) {
    issues.push(
      createIssue({
        code: "DEFENSE_TOO_MANY_PLAYERS",
        side: "DEFENSE",
        message: `Defense has ${defenseCount} players on the field; ${rules.preSnap.defensePlayersOnField} are allowed.`,
        recommendation: recommendation(
          "REMOVE_EXTRA_PLAYER",
          "Remove extra defensive players before the snap.",
        ),
      }),
    );
  }

  return issues;
}

function countPersonnelEntries(personnel: PersonnelPackage) {
  return personnel.entries.reduce((total, entry) => total + entry.quantity, 0);
}

function formatPersonnelCounts(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([positionCode, quantity]) => `${positionCode}:${quantity}`)
    .join(", ");
}

function resolveOffensePersonnelBucket(player: PlayerAlignmentSnapshot) {
  switch (player.positionCode) {
    case "QB":
      return "QB";
    case "RB":
    case "HB":
    case "FB":
      return "RB";
    case "WR":
      return "WR";
    case "TE":
      return "TE";
    case "LT":
    case "LG":
    case "C":
    case "RG":
    case "RT":
    case "OL":
      return "OL";
    default:
      if (player.snapRole === "BACKFIELD_QB") {
        return "QB";
      }

      if (player.snapRole === "INTERIOR_LINE") {
        return "OL";
      }

      return null;
  }
}

function resolveDefensePersonnelBucket(player: PlayerAlignmentSnapshot) {
  switch (player.positionCode) {
    case "LE":
    case "RE":
    case "DE":
    case "DT":
    case "NT":
    case "DL":
      return "DL";
    case "LB":
    case "MLB":
    case "ILB":
    case "OLB":
    case "LOLB":
    case "ROLB":
    case "SLB":
    case "WLB":
      return "LB";
    case "CB":
    case "DB":
    case "FS":
    case "SS":
    case "S":
    case "NB":
      return "DB";
    default:
      if (player.snapRole === "DEFENSIVE_FRONT") {
        return "DL";
      }

      if (player.snapRole === "DEFENSIVE_BOX") {
        return "LB";
      }

      if (player.snapRole === "DEFENSIVE_SECONDARY") {
        return "DB";
      }

      return null;
  }
}

function validatePersonnelPackage(
  input: {
    side: "OFFENSE" | "DEFENSE";
    personnel: PersonnelPackage;
    players: PlayerAlignmentSnapshot[];
  },
) {
  const issues: LegalityIssue[] = [];
  const mismatchCode =
    input.side === "OFFENSE"
      ? ("OFFENSE_PERSONNEL_PACKAGE_MISMATCH" as const)
      : ("DEFENSE_PERSONNEL_PACKAGE_MISMATCH" as const);
  const expectedCounts = new Map(
    input.personnel.entries.map((entry) => [entry.positionCode, entry.quantity]),
  );
  const actualCounts = new Map<string, number>();
  const unresolvedPlayers: string[] = [];

  for (const player of input.players) {
    const bucket =
      input.side === "OFFENSE"
        ? resolveOffensePersonnelBucket(player)
        : resolveDefensePersonnelBucket(player);

    if (!bucket) {
      unresolvedPlayers.push(player.playerId);
      continue;
    }

    actualCounts.set(bucket, (actualCounts.get(bucket) ?? 0) + 1);
  }

  const details: string[] = [];

  if (input.personnel.side !== input.side) {
    details.push(
      `${input.side} snapshot references personnel package ${input.personnel.id} owned by ${input.personnel.side}.`,
    );
  }

  const declaredTotal = countPersonnelEntries(input.personnel);

  if (input.personnel.totalPlayers !== declaredTotal) {
    details.push(
      `Personnel package ${input.personnel.id} declares totalPlayers=${input.personnel.totalPlayers}, but its entries sum to ${declaredTotal}.`,
    );
  }

  if (declaredTotal !== input.players.length) {
    details.push(
      `Personnel package ${input.personnel.id} expects ${declaredTotal} players, but the snapshot aligns ${input.players.length}.`,
    );
  }

  if (unresolvedPlayers.length > 0) {
    details.push(
      `Could not map players ${unresolvedPlayers.join(", ")} into personnel buckets for ${input.personnel.id}.`,
    );
  }

  const comparedPositionCodes = new Set([
    ...expectedCounts.keys(),
    ...actualCounts.keys(),
  ]);

  const compositionMismatch = Array.from(comparedPositionCodes).some(
    (positionCode) =>
      (expectedCounts.get(positionCode) ?? 0) !== (actualCounts.get(positionCode) ?? 0),
  );

  if (compositionMismatch) {
    details.push(
      `Personnel package ${input.personnel.id} expects ${formatPersonnelCounts(expectedCounts)} but aligned players resolve to ${formatPersonnelCounts(actualCounts)}.`,
    );
  }

  if (details.length > 0) {
    issues.push(
      createIssue({
        code: mismatchCode,
        side: input.side,
        message: details.join(" "),
        playerIds: unresolvedPlayers,
      }),
    );
  }

  return issues;
}

function validateOffensiveStructure(
  snapshot: NormalizedPreSnapStructureSnapshot,
  rules: CompetitionRuleProfile,
) {
  const issues: LegalityIssue[] = [];
  const linePlayers = snapshot.offensePlayers.filter((player) => player.onLineOfScrimmage);
  const backfieldPlayers = snapshot.offensePlayers.filter((player) => player.inBackfield);
  const eligiblePlayers = snapshot.offensePlayers.filter(
    (player) => player.resolvedReceiverState === "ELIGIBLE",
  );

  if (linePlayers.length < rules.preSnap.minPlayersOnLine) {
    issues.push(
      createIssue({
        code: "OFFENSE_TOO_FEW_ON_LINE",
        side: "OFFENSE",
        message: `Offense has ${linePlayers.length} players on the line of scrimmage; at least ${rules.preSnap.minPlayersOnLine} are required.`,
        playerIds: linePlayers.map((player) => player.playerId),
        recommendation: recommendation(
          "MOVE_PLAYER_TO_LINE",
          "Move another offensive player onto the line of scrimmage.",
        ),
      }),
    );
  }

  if (backfieldPlayers.length > rules.preSnap.maxBackfieldPlayers) {
    issues.push(
      createIssue({
        code: "OFFENSE_TOO_MANY_BACKFIELD",
        side: "OFFENSE",
        message: `Offense has ${backfieldPlayers.length} players in the backfield; at most ${rules.preSnap.maxBackfieldPlayers} are allowed.`,
        playerIds: backfieldPlayers.map((player) => player.playerId),
        recommendation: recommendation(
          "MOVE_PLAYER_TO_LINE",
          "Move one offensive player from the backfield onto the line.",
        ),
      }),
    );
  }

  if (eligiblePlayers.length < rules.preSnap.minEligibleReceivers) {
    issues.push(
      createIssue({
        code: "TOO_FEW_ELIGIBLE_RECEIVERS",
        side: "OFFENSE",
        message: `Offense resolves to ${eligiblePlayers.length} eligible receivers; at least ${rules.preSnap.minEligibleReceivers} are required.`,
        playerIds: eligiblePlayers.map((player) => player.playerId),
        recommendation: recommendation(
          "MAKE_LINE_END_ELIGIBLE",
          "Place eligible players at the line ends or in the backfield.",
        ),
      }),
    );
  }

  if (rules.preSnap.requireEligibleEndsOnLine) {
    for (const player of linePlayers) {
      if (
        (player.linePositionRole === "LEFT_END" || player.linePositionRole === "RIGHT_END") &&
        player.resolvedReceiverState !== "ELIGIBLE"
      ) {
        issues.push(
          createIssue({
            code: "LINE_END_INELIGIBLE",
            side: "OFFENSE",
            message: `Line-end player ${player.playerId} is ineligible, but players at both ends of the line must be eligible.`,
            playerIds: [player.playerId],
            recommendation: recommendation(
              "MAKE_LINE_END_ELIGIBLE",
              "Move an eligible player to the line end or reassign this player off the line.",
            ),
          }),
        );
      }
    }
  }

  if (rules.preSnap.requireIneligibleInteriorLinemen) {
    for (const player of linePlayers) {
      if (
        player.linePositionRole === "INTERIOR" &&
        player.resolvedReceiverState === "ELIGIBLE"
      ) {
        issues.push(
          createIssue({
            code: "INTERIOR_PLAYER_ELIGIBLE",
            side: "OFFENSE",
            message: `Interior line player ${player.playerId} is marked eligible, which is illegal for a covered lineman.`,
            playerIds: [player.playerId],
            recommendation: recommendation(
              "KEEP_INTERIOR_INELIGIBLE",
              "Keep interior line players ineligible or move them to an end/backfield alignment.",
            ),
          }),
        );
      }
    }
  }

  return issues;
}

function validateMotionAndShift(
  snapshot: NormalizedPreSnapStructureSnapshot,
  rules: CompetitionRuleProfile,
) {
  const issues: LegalityIssue[] = [];
  const movingPlayers = snapshot.offensePlayers.filter(
    (player) => player.motion.isInMotionAtSnap,
  );

  if (movingPlayers.length > rules.motion.maxPlayersInMotionAtSnap) {
    issues.push(
      createIssue({
        code: "TOO_MANY_PLAYERS_IN_MOTION",
        side: "OFFENSE",
        message: `Offense has ${movingPlayers.length} players in motion at the snap; only ${rules.motion.maxPlayersInMotionAtSnap} are allowed.`,
        playerIds: movingPlayers.map((player) => player.playerId),
        recommendation: recommendation(
          "REDUCE_PLAYERS_IN_MOTION",
          "Leave only one offensive player in motion at the snap.",
        ),
      }),
    );
  }

  for (const player of movingPlayers) {
    if (
      !rules.motion.allowPlayerInMotionOnLineAtSnap &&
      player.onLineOfScrimmage
    ) {
      issues.push(
        createIssue({
          code: "MOTION_PLAYER_ON_LINE",
          side: "OFFENSE",
          message: `Player ${player.playerId} is moving on the line of scrimmage at the snap.`,
          playerIds: [player.playerId],
          recommendation: recommendation(
            "MOVE_MOTION_OFF_LINE",
            "Start motion from an off-the-line alignment.",
          ),
        }),
      );
    }

    if (
      !rules.motion.allowMotionTowardLineAtSnap &&
      player.motion.directionAtSnap === "TOWARD_LINE"
    ) {
      issues.push(
        createIssue({
          code: "ILLEGAL_MOTION_DIRECTION",
          side: "OFFENSE",
          message: `Player ${player.playerId} is moving toward the line at the snap, which is illegal in this ruleset.`,
          playerIds: [player.playerId],
          recommendation: recommendation(
            "STOP_FORWARD_MOTION",
            "Motion parallel or away from the line before the snap.",
          ),
        }),
      );
    }

    if (
      rules.motion.requireMotionFromSetPosition &&
      !player.motion.startedFromSetPosition
    ) {
      issues.push(
        createIssue({
          code: "MOTION_NOT_FROM_SET_POSITION",
          side: "OFFENSE",
          message: `Player ${player.playerId} went in motion without the offense first becoming set.`,
          playerIds: [player.playerId],
          recommendation: recommendation(
            "RESET_BEFORE_MOTION",
            "Get the formation set before sending a player in motion.",
          ),
        }),
      );
    }
  }

  const shiftedPlayerCount = snapshot.offenseShift.playersShifted.length;
  const shiftRuleApplies =
    shiftedPlayerCount >= rules.shift.minimumPlayersForShiftRule;
  const missingRequiredReset =
    rules.shift.requireResetAfterShift && !snapshot.offenseShift.wasResetAfterShift;
  const insufficientSetTime =
    snapshot.offenseShift.allPlayersSetForSeconds <
    rules.shift.minimumSetSecondsAfterShift;

  if (shiftRuleApplies && (missingRequiredReset || insufficientSetTime)) {
    issues.push(
      createIssue({
        code: "SHIFT_NOT_SET",
        side: "OFFENSE",
        message: `Shift with ${shiftedPlayerCount} players did not satisfy the ${rules.shift.minimumSetSecondsAfterShift.toFixed(1)} second set requirement before the snap.`,
        playerIds: snapshot.offenseShift.playersShifted,
        recommendation: recommendation(
          "WAIT_FOR_SET",
          "Hold the formation set long enough after the shift before snapping the ball.",
        ),
      }),
    );
  }

  return issues;
}

function validateAgainstRules(
  snapshot: NormalizedPreSnapStructureSnapshot,
  rules: CompetitionRuleProfile,
) {
  return [
    ...validatePlayerCounts(snapshot, rules),
    ...validatePersonnelPackage({
      side: "OFFENSE",
      personnel: snapshot.offensePersonnel,
      players: snapshot.offensePlayers,
    }),
    ...validatePersonnelPackage({
      side: "DEFENSE",
      personnel: snapshot.defensePersonnel,
      players: snapshot.defensePlayers,
    }),
    ...validateOffensiveStructure(snapshot, rules),
    ...validateMotionAndShift(snapshot, rules),
  ];
}

export function validatePreSnapStructure(
  snapshot: PreSnapStructureSnapshot,
): LegalityResult {
  const normalizedSnapshot = normalizeSnapshot(snapshot);

  try {
    const rules = resolveCompetitionRuleProfile(snapshot.ruleset);
    const issues = validateAgainstRules(normalizedSnapshot, rules);

    return {
      isLegal: issues.length === 0,
      issues,
      normalizedSnapshot,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unsupported ruleset";

    return {
      isLegal: false,
      issues: [
        createIssue({
          code: "RULESET_UNSUPPORTED",
          side: "BOTH",
          message,
        }),
      ],
      normalizedSnapshot,
    };
  }
}

export function validateIneligibleDownfield(
  request: IneligibleDownfieldRequest,
): IneligibleDownfieldResult {
  const rules = resolveCompetitionRuleProfile(
    request.normalizedSnapshot.ruleset,
  );
  const maxAllowedYards = rules.downfield.ineligiblePlayerLimitYards;

  if (
    rules.downfield.enforceOnlyOnForwardPassBeyondLine &&
    (!request.isForwardPassThrown || !request.passCrossedLineOfScrimmage)
  ) {
    return {
      isLegal: true,
      maxAllowedYards,
      issues: [],
    };
  }

  const ineligiblePlayerIds = new Set(
    request.normalizedSnapshot.offensePlayers
      .filter((player) => player.resolvedReceiverState === "INELIGIBLE")
      .map((player) => player.playerId),
  );
  const issues = request.observations
    .filter(
      (observation) =>
        ineligiblePlayerIds.has(observation.playerId) &&
        observation.yardsBeyondLineOfScrimmage > maxAllowedYards,
    )
    .map((observation) =>
      createIssue({
        code: "INELIGIBLE_PLAYER_DOWNFIELD",
        side: "OFFENSE",
        message: `Ineligible player ${observation.playerId} was ${observation.yardsBeyondLineOfScrimmage.toFixed(2)} yards beyond the line of scrimmage; ${maxAllowedYards.toFixed(2)} is the limit in ${request.normalizedSnapshot.ruleset}.`,
        playerIds: [observation.playerId],
        recommendation: recommendation(
          "KEEP_INELIGIBLE_BEHIND_LIMIT",
          "Keep ineligible players within the downfield limit until the forward pass is thrown.",
        ),
      }),
    );

  return {
    isLegal: issues.length === 0,
    maxAllowedYards,
    issues,
  };
}

export const defaultPreSnapLegalityEngine: PreSnapLegalityEngine = {
  validate: validatePreSnapStructure,
};

export function validatePlaySelectionPreSnap(
  context: Pick<PlaySelectionContext, "preSnapStructure">,
  engine: PreSnapLegalityEngine = defaultPreSnapLegalityEngine,
) {
  return engine.validate(context.preSnapStructure);
}

export function validatePlayResolutionPreSnap(
  request: Pick<PlayResolutionRequest, "preSnapStructure">,
  engine: PreSnapLegalityEngine = defaultPreSnapLegalityEngine,
) {
  return engine.validate(request.preSnapStructure);
}

export function resolveReceiverEligibilityMap(
  snapshot: PreSnapStructureSnapshot,
): Map<string, ReceiverEligibilityState> {
  const result = validatePreSnapStructure(snapshot);

  return new Map(
    result.normalizedSnapshot.offensePlayers.map((player) => [
      player.playerId,
      player.resolvedReceiverState,
    ]),
  );
}
