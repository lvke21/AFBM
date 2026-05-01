import { recalculateTeamState } from "@/modules/seasons/infrastructure/simulation/player-development";
import { PlayerStatus, RosterStatus } from "@/modules/shared/domain/enums";
import { shouldClearLineupAssignments } from "@/modules/shared/domain/roster-status";
import {
  reviewTradeOffer,
  type TradeMarket,
  type TradeOfferInput,
  type TradePlayer,
  type TradeTeam,
} from "@/components/trades/trade-model";

import { teamManagementRepository } from "../infrastructure/team-management.repository";
import { requireManagedTeamContext } from "./team-management.shared";
import { buildTeamNeeds } from "./team-needs.service";

function teamName(team: { city: string; nickname: string }) {
  return `${team.city} ${team.nickname}`;
}

function isActiveRosterStatus(status: string) {
  return status !== RosterStatus.PRACTICE_SQUAD && status !== RosterStatus.INJURED_RESERVE;
}

export async function getTradeMarketForUser(userId: string, saveGameId: string): Promise<TradeMarket> {
  const record = await teamManagementRepository.findTradeMarketRecord(userId, saveGameId);

  if (!record) {
    throw new Error("Trade market not found");
  }

  const managerTeam = record.teams.find((team) => team.managerControlled) ?? record.teams[0];

  if (!managerTeam) {
    throw new Error("No teams available for trades");
  }

  const teams: TradeTeam[] = record.teams.map((team) => {
    const playersForNeeds = team.rosterProfiles.map((profile) => ({
      positionCode: profile.primaryPosition.code,
      positionName: profile.primaryPosition.name,
      positionOverall: profile.player.evaluation?.positionOverall ?? 55,
      rosterStatus: profile.rosterStatus,
      schemeFitScore: null,
    }));

    return {
      id: team.id,
      name: teamName(team),
      abbreviation: team.abbreviation,
      managerControlled: team.managerControlled,
      salaryCapSpace: Number(team.salaryCapSpace),
      activeRosterCount: team.rosterProfiles.filter((profile) =>
        isActiveRosterStatus(profile.rosterStatus),
      ).length,
      activeRosterLimit: record.settings?.activeRosterLimit ?? 53,
      needs: buildTeamNeeds(playersForNeeds).map((need) => ({
        positionCode: need.positionCode,
        needScore: need.needScore,
      })),
    };
  });

  const players: TradePlayer[] = record.teams.flatMap((team) =>
    team.rosterProfiles.map((profile) => ({
      id: profile.player.id,
      fullName: `${profile.player.firstName} ${profile.player.lastName}`,
      age: profile.player.age,
      teamId: team.id,
      teamName: teamName(team),
      teamAbbreviation: team.abbreviation,
      positionCode: profile.primaryPosition.code,
      rosterStatus: profile.rosterStatus,
      depthChartSlot: profile.depthChartSlot,
      positionOverall: profile.player.evaluation?.positionOverall ?? 55,
      potentialRating:
        profile.player.evaluation?.potentialRating ?? profile.player.evaluation?.positionOverall ?? 55,
      schemeFitScore: null,
      capHit: Number(profile.player.contracts[0]?.capHit ?? 0),
    })),
  );

  return {
    managerTeamId: managerTeam.id,
    teams,
    players,
  };
}

export async function executeTradeOfferForUser(
  input: {
    userId: string;
    saveGameId: string;
    teamId: string;
  } & TradeOfferInput,
) {
  const context = await requireManagedTeamContext(input.userId, input.saveGameId, input.teamId);
  const market = await getTradeMarketForUser(input.userId, input.saveGameId);
  const review = reviewTradeOffer(market, input);

  if (review.status !== "Accepted") {
    throw new Error(`Trade nicht akzeptiert: ${review.reasons.join(" ")}`);
  }

  const managerPlayer = input.managerPlayerId
    ? await teamManagementRepository.findTradePlayerForExecution(
        input.saveGameId,
        input.managerPlayerId,
      )
    : null;
  const targetPlayer = input.targetPlayerId
    ? await teamManagementRepository.findTradePlayerForExecution(
        input.saveGameId,
        input.targetPlayerId,
      )
    : null;
  const partnerTeamId =
    targetPlayer?.rosterProfile?.teamId ?? input.partnerTeamId ?? managerPlayer?.rosterProfile?.teamId;

  if (!partnerTeamId || partnerTeamId === context.team.id) {
    throw new Error("Invalid trade partner");
  }

  if (managerPlayer && managerPlayer.rosterProfile?.teamId !== context.team.id) {
    throw new Error("Outgoing player is not on the managed team");
  }

  if (targetPlayer && targetPlayer.rosterProfile?.teamId === context.team.id) {
    throw new Error("Target player is already on the managed team");
  }

  await teamManagementRepository.runInTransaction(async (tx) => {
    if (managerPlayer?.rosterProfile) {
      await teamManagementRepository.updateRosterProfile(tx, managerPlayer.id, input.saveGameId, {
        teamId: partnerTeamId,
        rosterStatus: RosterStatus.BACKUP,
        depthChartSlot: null,
        captainFlag: false,
        developmentFocus: false,
      });

      if (managerPlayer.contracts[0]) {
        await teamManagementRepository.updateActiveContractTeam(
          tx,
          managerPlayer.contracts[0].id,
          partnerTeamId,
        );
      }

      await teamManagementRepository.createRosterTransaction(tx, {
        saveGameId: input.saveGameId,
        playerId: managerPlayer.id,
        fromTeamId: context.team.id,
        toTeamId: partnerTeamId,
        type: "TRADE",
        description: `Traded from ${context.team.abbreviation}`,
      });
    }

    if (targetPlayer?.rosterProfile) {
      const targetStatus = shouldClearLineupAssignments(targetPlayer.rosterProfile.rosterStatus)
        ? RosterStatus.BACKUP
        : targetPlayer.rosterProfile.rosterStatus;

      await teamManagementRepository.updateRosterProfile(tx, targetPlayer.id, input.saveGameId, {
        teamId: context.team.id,
        rosterStatus: targetStatus,
        depthChartSlot: null,
        captainFlag: false,
        developmentFocus: false,
      });

      await teamManagementRepository.updatePlayer(tx, targetPlayer.id, {
        status:
          targetPlayer.injuryStatus === "HEALTHY" ? PlayerStatus.ACTIVE : PlayerStatus.INJURED,
      });

      if (targetPlayer.contracts[0]) {
        await teamManagementRepository.updateActiveContractTeam(
          tx,
          targetPlayer.contracts[0].id,
          context.team.id,
        );
      }

      await teamManagementRepository.createRosterTransaction(tx, {
        saveGameId: input.saveGameId,
        playerId: targetPlayer.id,
        fromTeamId: partnerTeamId,
        toTeamId: context.team.id,
        type: "TRADE",
        description: `Traded to ${context.team.abbreviation}`,
      });
    }

    await recalculateTeamState(tx, input.saveGameId, context.team.id);
    await recalculateTeamState(tx, input.saveGameId, partnerTeamId);
  });

  return {
    managerPlayerName: managerPlayer
      ? `${managerPlayer.firstName} ${managerPlayer.lastName}`
      : "Future Value",
    targetPlayerName: targetPlayer
      ? `${targetPlayer.firstName} ${targetPlayer.lastName}`
      : "Future Value",
    review,
  };
}
