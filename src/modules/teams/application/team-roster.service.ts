import { createPlayerHistoryEvent } from "@/modules/players/application/player-history.service";
import { createSeasonStatShells } from "@/modules/savegames/application/bootstrap/player-stat-shells";
import { recalculateTeamState } from "@/modules/seasons/application/simulation/player-development";
import { buildPlayerValue } from "@/components/player/player-value-model";
import {
  ContractStatus,
  PlayerHistoryEventType,
  PlayerStatus,
  RosterStatus,
  type RosterStatus as RosterStatusValue,
  TeamFinanceEventType,
} from "@/modules/shared/domain/enums";
import { recordTeamFinanceEvent } from "@/modules/teams/application/team-finance.service";

import {
  isGameDayEligibleRosterStatus,
  shouldClearLineupAssignments,
} from "../../shared/domain/roster-status";
import { teamManagementRepository } from "../infrastructure/team-management.repository";
import {
  calculateCapHit,
  calculateSigningBonus,
  evaluateFreeAgentOffer,
  findDepthChartConflict,
  nextSpecialRole,
  normalizeContractYears,
  normalizeDepthChartSlot,
  normalizeYearlySalary,
  requireManagedTeamContext,
} from "./team-management.shared";

function calculateReleaseDeadCap(contract: {
  capHit: unknown;
  signingBonus: unknown;
}) {
  const capHit = Number(contract.capHit);
  const signingBonus = Number(contract.signingBonus);

  return Math.min(capHit, Math.max(0, Math.round(signingBonus)));
}

type RosterAssignmentSnapshot = Awaited<
  ReturnType<typeof teamManagementRepository.listRosterAssignments>
>[number];

function assignmentOverall(assignment: RosterAssignmentSnapshot | null | undefined) {
  const value = Number(assignment?.player.evaluation?.positionOverall);

  return Number.isFinite(value) ? Math.round(value) : null;
}

function playerEvaluationOverall(player: { evaluation?: { positionOverall: unknown } | null }) {
  const value = Number(player.evaluation?.positionOverall);

  return Number.isFinite(value) ? Math.round(value) : null;
}

function starterOverallForPosition(
  assignments: RosterAssignmentSnapshot[],
  positionCode: string,
) {
  return assignmentOverall(
    assignments.find(
      (assignment) =>
        assignment.primaryPosition.code === positionCode &&
        assignment.depthChartSlot === 1 &&
        isGameDayEligibleRosterStatus(assignment.rosterStatus),
    ),
  );
}

function withUpdatedAssignment(
  assignments: RosterAssignmentSnapshot[],
  playerId: string,
  update: Partial<Pick<RosterAssignmentSnapshot, "depthChartSlot" | "rosterStatus">>,
) {
  return assignments.map((assignment) =>
    assignment.playerId === playerId ? { ...assignment, ...update } : assignment,
  );
}

function formatStarterOverall(value: number | null) {
  return value == null ? "offen" : String(value);
}

function lineupEvaluation(positionCode: string, before: number | null, after: number | null) {
  const phase =
    positionCode === "QB" || positionCode === "WR" || positionCode === "TE"
      ? "Passing"
      : positionCode === "RB" || ["LT", "LG", "C", "RG", "RT", "FB"].includes(positionCode)
        ? "Run/Protection"
        : ["K", "P", "LS"].includes(positionCode)
          ? "Special Teams"
          : "Defense";

  if (before != null && after != null) {
    const delta = after - before;

    if (delta >= 2) {
      return `${phase} leicht verbessert`;
    }

    if (delta <= -2) {
      return `${phase} Risiko steigt`;
    }
  }

  if (before != null && after == null) {
    return `${phase} Risiko steigt`;
  }

  if (before == null && after != null) {
    return `${phase} bekommt neue Prioritaet`;
  }

  return `${phase} bleibt stabil`;
}

function lineupHistoryDescription(input: {
  after: number | null;
  before: number | null;
  fromSlot: number | null;
  playerName: string;
  positionCode: string;
  toSlot: number | null;
}) {
  const slotLine =
    input.fromSlot && input.toSlot ? `#${input.fromSlot} -> #${input.toSlot}` : "Slot angepasst";

  return `${input.playerName}: ${input.positionCode} ${slotLine} · Positionsstaerke ${formatStarterOverall(input.before)} -> ${formatStarterOverall(input.after)} · Bewertung: ${lineupEvaluation(input.positionCode, input.before, input.after)}`;
}

export async function updateRosterAssignmentForUser(input: {
  userId: string;
  saveGameId: string;
  teamId: string;
  playerId: string;
  depthChartSlot: number | null;
  rosterStatus: RosterStatusValue;
  captainFlag: boolean;
  developmentFocus: boolean;
  specialRole: string | null;
}) {
  const context = await requireManagedTeamContext(input.userId, input.saveGameId, input.teamId);
  const specialRole = nextSpecialRole(input.specialRole);
  const normalizedDepthChartSlot = normalizeDepthChartSlot(input.depthChartSlot);

  const [player, rosterAssignments, krPosition, prPosition] = await Promise.all([
    teamManagementRepository.findRosterAssignmentRecord(
      input.saveGameId,
      context.team.id,
      input.playerId,
    ),
    teamManagementRepository.listRosterAssignments(input.saveGameId, context.team.id),
    teamManagementRepository.findPositionIdByCode("KR"),
    teamManagementRepository.findPositionIdByCode("PR"),
  ]);

  if (!player) {
    throw new Error("Roster profile not found");
  }

  if (
    input.rosterStatus === RosterStatus.INJURED_RESERVE &&
    player.player.injuryStatus === "HEALTHY"
  ) {
    throw new Error("Only injured players can be moved to injured reserve");
  }

  if (
    player.rosterStatus === RosterStatus.INJURED_RESERVE &&
    input.rosterStatus !== RosterStatus.INJURED_RESERVE &&
    player.player.injuryStatus !== "HEALTHY"
  ) {
    throw new Error("Player must be healthy before being activated from injured reserve");
  }

  const depthChartConflict = findDepthChartConflict({
    playerId: input.playerId,
    positionCode: player.primaryPosition.code,
    rosterStatus: input.rosterStatus,
    depthChartSlot: normalizedDepthChartSlot,
    rosterAssignments: rosterAssignments.map((assignment) => ({
      playerId: assignment.playerId,
      fullName: `${assignment.player.firstName} ${assignment.player.lastName}`,
      positionCode: assignment.primaryPosition.code,
      rosterStatus: assignment.rosterStatus,
      depthChartSlot: assignment.depthChartSlot,
    })),
  });

  if (depthChartConflict) {
    throw new Error(
      `Depth chart slot ${normalizedDepthChartSlot} is already assigned to ${depthChartConflict.fullName} at ${player.primaryPosition.code}`,
    );
  }

  const effectiveCaptainFlag =
    input.rosterStatus === RosterStatus.INJURED_RESERVE ? false : input.captainFlag;
  const effectiveDepthChartSlot =
    shouldClearLineupAssignments(input.rosterStatus) ? null : normalizedDepthChartSlot;
  const effectiveSpecialRole =
    shouldClearLineupAssignments(input.rosterStatus) ? null : specialRole;
  const beforeStarterOverall = starterOverallForPosition(
    rosterAssignments,
    player.primaryPosition.code,
  );
  const afterStarterOverall = starterOverallForPosition(
    withUpdatedAssignment(rosterAssignments, input.playerId, {
      depthChartSlot: effectiveDepthChartSlot,
      rosterStatus: input.rosterStatus,
    }),
    player.primaryPosition.code,
  );
  const currentAssignment =
    rosterAssignments.find((assignment) => assignment.playerId === input.playerId) ?? null;
  const playerName = `${player.player.firstName} ${player.player.lastName}`;

  await teamManagementRepository.runInTransaction(async (tx) => {
    await teamManagementRepository.updateRosterProfile(tx, input.playerId, input.saveGameId, {
      depthChartSlot: effectiveDepthChartSlot,
      rosterStatus: input.rosterStatus,
      captainFlag: effectiveCaptainFlag,
      developmentFocus: input.developmentFocus,
      secondaryPositionDefinitionId:
        effectiveSpecialRole === "KR"
          ? krPosition?.id
          : effectiveSpecialRole === "PR"
            ? prPosition?.id
            : null,
    });

    await createPlayerHistoryEvent({
      tx,
      saveGameId: input.saveGameId,
      playerId: input.playerId,
      seasonId: context.currentSeasonId,
      teamId: context.team.id,
      type: PlayerHistoryEventType.DEPTH_CHART,
      title: "Rosterrolle angepasst",
      description: `${lineupHistoryDescription({
        after: afterStarterOverall,
        before: beforeStarterOverall,
        fromSlot: currentAssignment?.depthChartSlot ?? null,
        playerName,
        positionCode: player.primaryPosition.code,
        toSlot: effectiveDepthChartSlot,
      })} · ${input.rosterStatus}${effectiveSpecialRole ? ` · ${effectiveSpecialRole}` : ""}${effectiveCaptainFlag ? " · Captain" : ""}${input.developmentFocus ? " · Development Focus" : ""}`,
    });
  });

  return {
    captainFlag: effectiveCaptainFlag,
    depthChartSlot: effectiveDepthChartSlot,
    developmentFocus: input.developmentFocus,
    playerName,
    playerOverall: assignmentOverall(currentAssignment) ?? playerEvaluationOverall(player.player),
    positionCode: player.primaryPosition.code,
    previousDepthChartSlot: currentAssignment?.depthChartSlot ?? null,
    rosterStatus: input.rosterStatus,
    specialRole: effectiveSpecialRole,
    starterOverallAfter: afterStarterOverall,
    starterOverallBefore: beforeStarterOverall,
  };
}

export async function moveDepthChartPlayerForUser(input: {
  userId: string;
  saveGameId: string;
  teamId: string;
  playerId: string;
  currentSlot: number | null;
  targetSlot: number | null;
  targetPlayerId: string | null;
}) {
  const context = await requireManagedTeamContext(input.userId, input.saveGameId, input.teamId);
  const currentSlot = normalizeDepthChartSlot(input.currentSlot);
  const targetSlot = normalizeDepthChartSlot(input.targetSlot);

  if (currentSlot == null || targetSlot == null) {
    throw new Error("Depth chart move requires source and target slots");
  }

  if (currentSlot === targetSlot) {
    throw new Error("Depth chart move target must differ from source slot");
  }

  if (Math.abs(currentSlot - targetSlot) !== 1) {
    throw new Error("Depth chart moves are limited to adjacent slots");
  }

  const rosterAssignments = await teamManagementRepository.listRosterAssignments(
    input.saveGameId,
    context.team.id,
  );
  const sourceAssignment = rosterAssignments.find(
    (assignment) => assignment.playerId === input.playerId,
  );

  if (!sourceAssignment) {
    throw new Error("Roster profile not found");
  }

  if (!isGameDayEligibleRosterStatus(sourceAssignment.rosterStatus)) {
    throw new Error("Only game-day eligible players can be moved in the depth chart");
  }

  if (sourceAssignment.depthChartSlot !== currentSlot) {
    throw new Error("Depth chart move is stale; reload the lineup and try again");
  }

  const positionCode = sourceAssignment.primaryPosition.code;
  const occupiedTargetSlot =
    rosterAssignments.find(
      (assignment) =>
        assignment.playerId !== sourceAssignment.playerId &&
        assignment.primaryPosition.code === positionCode &&
        assignment.depthChartSlot === targetSlot &&
        isGameDayEligibleRosterStatus(assignment.rosterStatus),
    ) ?? null;
  const targetAssignment = input.targetPlayerId
    ? rosterAssignments.find((assignment) => assignment.playerId === input.targetPlayerId) ?? null
    : occupiedTargetSlot;

  if (input.targetPlayerId && !targetAssignment) {
    throw new Error("Target depth chart player not found");
  }

  if (targetAssignment) {
    if (targetAssignment.playerId === sourceAssignment.playerId) {
      throw new Error("Depth chart move target must be another player");
    }

    if (targetAssignment.primaryPosition.code !== positionCode) {
      throw new Error("Depth chart players can only be moved within the same position");
    }

    if (!isGameDayEligibleRosterStatus(targetAssignment.rosterStatus)) {
      throw new Error("Target depth chart player is not game-day eligible");
    }

    if (targetAssignment.depthChartSlot !== targetSlot) {
      throw new Error("Target depth chart slot is stale; reload the lineup and try again");
    }
  } else if (occupiedTargetSlot) {
    throw new Error("Target depth chart slot is already occupied");
  }

  const playerName = `${sourceAssignment.player.firstName} ${sourceAssignment.player.lastName}`;
  const targetPlayerName = targetAssignment
    ? `${targetAssignment.player.firstName} ${targetAssignment.player.lastName}`
    : null;
  const starterOverallBefore = starterOverallForPosition(rosterAssignments, positionCode);
  let simulatedAssignments = withUpdatedAssignment(rosterAssignments, sourceAssignment.playerId, {
    depthChartSlot: targetSlot,
  });

  if (targetAssignment) {
    simulatedAssignments = withUpdatedAssignment(simulatedAssignments, targetAssignment.playerId, {
      depthChartSlot: currentSlot,
    });
  }

  const starterOverallAfter = starterOverallForPosition(simulatedAssignments, positionCode);

  await teamManagementRepository.runInTransaction(async (tx) => {
    if (targetAssignment) {
      await teamManagementRepository.updateRosterProfile(
        tx,
        targetAssignment.playerId,
        input.saveGameId,
        {
          depthChartSlot: currentSlot,
        },
      );

      await createPlayerHistoryEvent({
        tx,
        saveGameId: input.saveGameId,
        playerId: targetAssignment.playerId,
        seasonId: context.currentSeasonId,
        teamId: context.team.id,
        type: PlayerHistoryEventType.DEPTH_CHART,
        title: "Depth Chart Reihenfolge angepasst",
        description: lineupHistoryDescription({
          after: starterOverallAfter,
          before: starterOverallBefore,
          fromSlot: targetSlot,
          playerName: targetPlayerName ?? "Zielspieler",
          positionCode,
          toSlot: currentSlot,
        }),
      });
    }

    await teamManagementRepository.updateRosterProfile(
      tx,
      sourceAssignment.playerId,
      input.saveGameId,
      {
        depthChartSlot: targetSlot,
      },
    );

    await createPlayerHistoryEvent({
      tx,
      saveGameId: input.saveGameId,
      playerId: sourceAssignment.playerId,
      seasonId: context.currentSeasonId,
      teamId: context.team.id,
      type: PlayerHistoryEventType.DEPTH_CHART,
      title: "Depth Chart Reihenfolge angepasst",
      description: lineupHistoryDescription({
        after: starterOverallAfter,
        before: starterOverallBefore,
        fromSlot: currentSlot,
        playerName,
        positionCode,
        toSlot: targetSlot,
      }),
    });
  });

  return {
    currentSlot,
    depthChartSlot: targetSlot,
    playerName,
    playerOverall: assignmentOverall(sourceAssignment),
    positionCode,
    rosterStatus: sourceAssignment.rosterStatus,
    starterOverallAfter,
    starterOverallBefore,
    swappedWithPlayerName: targetPlayerName,
    swappedWithPlayerOverall: assignmentOverall(targetAssignment),
  };
}

export async function releasePlayerForUser(input: {
  userId: string;
  saveGameId: string;
  teamId: string;
  playerId: string;
}) {
  const context = await requireManagedTeamContext(input.userId, input.saveGameId, input.teamId);
  const player = await teamManagementRepository.findManagedPlayerForRelease(
    input.saveGameId,
    context.team.id,
    input.playerId,
  );

  if (!player?.rosterProfile) {
    throw new Error("Player is not on the managed team");
  }

  const activeContract = player.contracts[0] ?? null;
  const capHit = activeContract ? Number(activeContract.capHit) : 0;
  const deadCap = activeContract ? calculateReleaseDeadCap(activeContract) : 0;
  const capSavings = Math.max(0, capHit - deadCap);
  const playerName = `${player.firstName} ${player.lastName}`;

  await teamManagementRepository.runInTransaction(async (tx) => {
    await teamManagementRepository.updateRosterProfile(tx, player.id, input.saveGameId, {
      teamId: null,
      rosterStatus: RosterStatus.FREE_AGENT,
      depthChartSlot: null,
      captainFlag: false,
    });

    await teamManagementRepository.updatePlayer(tx, player.id, {
      status: PlayerStatus.FREE_AGENT,
    });

    if (activeContract) {
      await teamManagementRepository.updateContract(tx, activeContract.id, {
        status: ContractStatus.RELEASED,
        endedAt: new Date(),
        capHit: deadCap,
      });

      await recordTeamFinanceEvent({
        tx,
        saveGameId: input.saveGameId,
        teamId: context.team.id,
        playerId: player.id,
        seasonId: context.currentSeasonId,
        type: TeamFinanceEventType.RELEASE_PAYOUT,
        amount: 0,
        capImpact: capSavings,
        description: `${context.team.abbreviation}: Release von ${player.firstName} ${player.lastName}. Cap Savings ${capSavings.toFixed(0)} USD, Dead Cap ${deadCap.toFixed(0)} USD.`,
      });
    }

    await teamManagementRepository.createRosterTransaction(tx, {
      saveGameId: input.saveGameId,
      playerId: player.id,
      fromTeamId: context.team.id,
      type: "RELEASE",
      description: `Released from ${context.team.abbreviation}`,
    });

    await createPlayerHistoryEvent({
      tx,
      saveGameId: input.saveGameId,
      playerId: player.id,
      seasonId: context.currentSeasonId,
      teamId: context.team.id,
      type: PlayerHistoryEventType.RELEASE,
      title: "Aus dem Kader entlassen",
      description: `${context.team.city} ${context.team.nickname} hat den Vertrag beendet.${
        capHit
          ? ` Cap Savings: ${capSavings.toFixed(0)} USD. Dead Cap: ${deadCap.toFixed(0)} USD.`
          : ""
      }`,
    });

    await recalculateTeamState(tx, input.saveGameId, context.team.id);
  });

  return {
    capHit,
    capSavings,
    deadCap,
    playerName,
  };
}

export async function extendPlayerContractForUser(input: {
  userId: string;
  saveGameId: string;
  teamId: string;
  playerId: string;
  years: number;
  yearlySalary: number;
}) {
  const context = await requireManagedTeamContext(input.userId, input.saveGameId, input.teamId);
  const player = await teamManagementRepository.findManagedPlayerForContractAction(
    input.saveGameId,
    context.team.id,
    input.playerId,
  );

  if (!player?.rosterProfile || !player.evaluation) {
    throw new Error("Player is not on the managed team");
  }

  const currentContract = player.contracts[0] ?? null;

  if (!currentContract) {
    throw new Error("Player has no active contract to extend");
  }

  const normalizedYears = normalizeContractYears(input.years);
  const normalizedSalary = normalizeYearlySalary(input.yearlySalary);
  const signingBonus = calculateSigningBonus(
    normalizedSalary,
    player.evaluation.positionOverall,
  );
  const newCapHit = calculateCapHit(normalizedSalary, signingBonus, normalizedYears);
  const previousCapHit = Number(currentContract.capHit);
  const capDelta = previousCapHit - newCapHit;
  const projectedCapSpace = context.team.salaryCapSpace + capDelta;

  if (projectedCapSpace < 0) {
    throw new Error("Not enough salary cap space for this extension");
  }

  if (signingBonus > context.team.cashBalance) {
    throw new Error("Not enough cash available for the signing bonus");
  }

  await teamManagementRepository.runInTransaction(async (tx) => {
    await teamManagementRepository.updateContract(tx, currentContract.id, {
      status: ContractStatus.RELEASED,
      endedAt: new Date(),
      capHit: 0,
    });

    await teamManagementRepository.createContract(tx, {
      saveGameId: input.saveGameId,
      playerId: player.id,
      teamId: context.team.id,
      startSeasonId: context.currentSeasonId,
      years: normalizedYears,
      yearlySalary: normalizedSalary,
      signingBonus,
      capHit: newCapHit,
    });

    await recordTeamFinanceEvent({
      tx,
      saveGameId: input.saveGameId,
      teamId: context.team.id,
      playerId: player.id,
      seasonId: context.currentSeasonId,
      type: TeamFinanceEventType.SIGNING_BONUS,
      amount: -signingBonus,
      capImpact: capDelta,
      description: `${context.team.abbreviation}: Vertragsverlaengerung fuer ${player.firstName} ${player.lastName}. Neuer Cap Hit ${newCapHit.toFixed(0)} USD.`,
    });

    await createPlayerHistoryEvent({
      tx,
      saveGameId: input.saveGameId,
      playerId: player.id,
      seasonId: context.currentSeasonId,
      teamId: context.team.id,
      type: PlayerHistoryEventType.SIGNING,
      title: "Vertrag verlaengert",
      description: `${normalizedYears} Jahre, ${normalizedSalary.toLocaleString("en-US")} USD pro Jahr. Cap Veraenderung: ${capDelta.toFixed(0)} USD.`,
    });

    await recalculateTeamState(tx, input.saveGameId, context.team.id);
  });

  return {
    capDelta,
    newCapHit,
    playerName: `${player.firstName} ${player.lastName}`,
    previousCapHit,
    projectedCapSpace,
    signingBonus,
    yearlySalary: normalizedSalary,
    years: normalizedYears,
  };
}

export async function signFreeAgentForUser(input: {
  userId: string;
  saveGameId: string;
  teamId: string;
  playerId: string;
  years: number;
  yearlySalary: number;
}) {
  const context = await requireManagedTeamContext(input.userId, input.saveGameId, input.teamId);
  const player = await teamManagementRepository.findFreeAgentForSigning(
    input.saveGameId,
    context.currentSeasonId,
    context.team.id,
    input.playerId,
  );

  if (!player?.rosterProfile || !player.evaluation) {
    throw new Error("Free agent not found");
  }

  const rosterProfile = player.rosterProfile;
  const normalizedYears = normalizeContractYears(input.years);
  const normalizedSalary = normalizeYearlySalary(input.yearlySalary);
  const signingBonus = calculateSigningBonus(
    normalizedSalary,
    player.evaluation.positionOverall,
  );
  const capHit = calculateCapHit(normalizedSalary, signingBonus, normalizedYears);
  const offerEvaluation = evaluateFreeAgentOffer({
    positionOverall: player.evaluation.positionOverall,
    yearlySalary: normalizedSalary,
    years: normalizedYears,
  });

  if (offerEvaluation.playerCanReject) {
    throw new Error(`Player rejected the offer: ${offerEvaluation.reason}`);
  }

  const assignment = await teamManagementRepository.runInTransaction(async (tx) => {
    const { activeRosterCount, practiceSquadCount } =
      await teamManagementRepository.countRosterUsage(tx, input.saveGameId, context.team.id);

    if (capHit > context.team.salaryCapSpace) {
      throw new Error("Not enough salary cap space");
    }

    if (signingBonus > context.team.cashBalance) {
      throw new Error("Not enough cash available for the signing bonus");
    }

    const rosterStatus =
      activeRosterCount < context.settings.activeRosterLimit
        ? RosterStatus.BACKUP
        : rosterProfile.practiceSquadEligible &&
            practiceSquadCount < context.settings.practiceSquadSize
          ? RosterStatus.PRACTICE_SQUAD
          : null;

    if (!rosterStatus) {
      throw new Error("No roster slot available for this signing");
    }

    const nextDepthSlot = await teamManagementRepository.findNextDepthSlot(
      tx,
      input.saveGameId,
      context.team.id,
      rosterProfile.primaryPositionDefinitionId,
    );

    await teamManagementRepository.updateRosterProfile(tx, player.id, input.saveGameId, {
      teamId: context.team.id,
      rosterStatus,
      depthChartSlot: shouldClearLineupAssignments(rosterStatus) ? null : nextDepthSlot + 1,
      captainFlag: false,
    });

    await teamManagementRepository.updatePlayer(tx, player.id, {
      status: player.injuryStatus === "HEALTHY" ? PlayerStatus.ACTIVE : PlayerStatus.INJURED,
    });

    await teamManagementRepository.createContract(tx, {
      saveGameId: input.saveGameId,
      playerId: player.id,
      teamId: context.team.id,
      startSeasonId: context.currentSeasonId,
      years: normalizedYears,
      yearlySalary: normalizedSalary,
      signingBonus,
      capHit,
    });

    await recordTeamFinanceEvent({
      tx,
      saveGameId: input.saveGameId,
      teamId: context.team.id,
      playerId: player.id,
      seasonId: context.currentSeasonId,
      type: TeamFinanceEventType.SIGNING_BONUS,
      amount: -signingBonus,
      capImpact: -capHit,
      description: `${context.team.abbreviation}: Signing Bonus fuer ${player.firstName} ${player.lastName}.`,
    });

    if (
      !player.playerSeasonStats.some(
        (seasonStat) =>
          seasonStat.seasonId === context.currentSeasonId &&
          seasonStat.teamId === context.team.id,
      )
    ) {
      await createSeasonStatShells({
        tx,
        saveGameId: input.saveGameId,
        seasonId: context.currentSeasonId,
        teamId: context.team.id,
        playerId: player.id,
      });
    }

    await teamManagementRepository.createRosterTransaction(tx, {
      saveGameId: input.saveGameId,
      playerId: player.id,
      toTeamId: context.team.id,
      type: "SIGNING",
      description: `Signed by ${context.team.abbreviation}`,
    });

    await createPlayerHistoryEvent({
      tx,
      saveGameId: input.saveGameId,
      playerId: player.id,
      seasonId: context.currentSeasonId,
      teamId: context.team.id,
      type: PlayerHistoryEventType.SIGNING,
      title: "Free Agent verpflichtet",
      description: `${context.team.city} ${context.team.nickname}: ${normalizedYears} Jahre, ${normalizedSalary.toLocaleString("en-US")} USD pro Jahr.`,
    });

    await recalculateTeamState(tx, input.saveGameId, context.team.id);

    return {
      depthChartSlot: shouldClearLineupAssignments(rosterStatus) ? null : nextDepthSlot + 1,
      rosterStatus,
    };
  });

  const value = buildPlayerValue({
    age: typeof player.age === "number" ? player.age : null,
    capHit,
    depthChartSlot: assignment.depthChartSlot,
    positionOverall: player.evaluation.positionOverall,
    potentialRating: player.evaluation.potentialRating,
    rosterStatus: assignment.rosterStatus,
  });

  return {
    capHit,
    depthChartSlot: assignment.depthChartSlot,
    playerName: `${player.firstName} ${player.lastName}`,
    rosterStatus: assignment.rosterStatus,
    signingBonus,
    valueLabel: value.label,
    valueReason: value.reason,
    valueScore: value.score,
    yearlySalary: normalizedSalary,
    years: normalizedYears,
  };
}
