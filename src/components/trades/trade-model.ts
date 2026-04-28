import { buildPlayerValue } from "@/components/player/player-value-model";

export type TradeOfferKind = "player-player" | "send-for-future" | "receive-for-future";

export type TradeOfferStatus = "Accepted" | "Close" | "Rejected";

export type TradePlayer = {
  id: string;
  fullName: string;
  age: number;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  positionCode: string;
  rosterStatus: string;
  depthChartSlot: number | null;
  positionOverall: number;
  potentialRating: number;
  schemeFitScore: number | null;
  capHit: number;
};

export type TradeTeam = {
  id: string;
  name: string;
  abbreviation: string;
  managerControlled: boolean;
  salaryCapSpace: number;
  activeRosterCount: number;
  activeRosterLimit: number;
  needs: Array<{
    positionCode: string;
    needScore: number;
  }>;
};

export type TradeMarket = {
  managerTeamId: string;
  teams: TradeTeam[];
  players: TradePlayer[];
};

export type TradeOfferInput = {
  kind: TradeOfferKind;
  managerPlayerId: string | null;
  partnerTeamId?: string | null;
  targetPlayerId: string | null;
};

export type TradeOfferReview = {
  status: TradeOfferStatus;
  reasons: string[];
  managerValueScore: number;
  partnerValueScore: number;
  capDeltaManager: number;
  capDeltaPartner: number;
};

const TRADE_OFFER_KINDS = new Set<TradeOfferKind>([
  "player-player",
  "send-for-future",
  "receive-for-future",
]);

export function isTradeOfferKind(value: unknown): value is TradeOfferKind {
  return typeof value === "string" && TRADE_OFFER_KINDS.has(value as TradeOfferKind);
}

function teamNeedForPosition(team: TradeTeam, positionCode: string) {
  return team.needs.find((need) => need.positionCode === positionCode)?.needScore ?? 5;
}

function safeCapHit(player: TradePlayer | null | undefined) {
  if (!player || !Number.isFinite(player.capHit)) {
    return 0;
  }

  return Math.max(0, player.capHit);
}

function activeRosterDelta(player: TradePlayer | null) {
  if (!player) {
    return 0;
  }

  return player.rosterStatus === "PRACTICE_SQUAD" || player.rosterStatus === "INJURED_RESERVE"
    ? 0
    : 1;
}

function missingReview(reason: string): TradeOfferReview {
  return {
    status: "Rejected",
    reasons: [reason],
    managerValueScore: 0,
    partnerValueScore: 0,
    capDeltaManager: 0,
    capDeltaPartner: 0,
  };
}

export function reviewTradeOffer(market: TradeMarket, input: TradeOfferInput): TradeOfferReview {
  if (!isTradeOfferKind(input.kind)) {
    return missingReview("Trade-Typ ist ungueltig.");
  }

  const managerTeam = market.teams.find((team) => team.id === market.managerTeamId);
  const managerPlayer = input.managerPlayerId
    ? market.players.find((player) => player.id === input.managerPlayerId)
    : null;
  const targetPlayer = input.targetPlayerId
    ? market.players.find((player) => player.id === input.targetPlayerId)
    : null;
  const partnerTeamId = targetPlayer?.teamId ?? input.partnerTeamId ?? null;
  const partnerTeam = market.teams.find(
    (team) => team.id === (targetPlayer?.teamId ?? partnerTeamId) && team.id !== market.managerTeamId,
  );

  if (!managerTeam) {
    return missingReview("Manager-Team nicht gefunden.");
  }

  if (input.kind !== "receive-for-future" && !managerPlayer) {
    return missingReview("Abgegebenen Spieler auswaehlen.");
  }

  if (input.kind !== "send-for-future" && !targetPlayer) {
    return missingReview("Zielspieler auswaehlen.");
  }

  const effectivePartnerTeam =
    partnerTeam ??
    (targetPlayer ? market.teams.find((team) => team.id === targetPlayer.teamId) : null);

  if (!effectivePartnerTeam || effectivePartnerTeam.id === managerTeam.id) {
    return missingReview("CPU-Tradepartner auswaehlen.");
  }

  if (managerPlayer && managerPlayer.teamId !== managerTeam.id) {
    return missingReview("Abgegebener Spieler muss aus dem eigenen Team kommen.");
  }

  if (targetPlayer && targetPlayer.teamId === managerTeam.id) {
    return missingReview("Zielspieler muss von einem anderen Team kommen.");
  }

  const managerReceivesCap = safeCapHit(targetPlayer);
  const managerSendsCap = safeCapHit(managerPlayer);
  const capDeltaManager = managerSendsCap - managerReceivesCap;
  const capDeltaPartner = managerReceivesCap - managerSendsCap;
  const resolvedManagerPlayer = managerPlayer ?? null;
  const resolvedTargetPlayer = targetPlayer ?? null;
  const managerRosterAfter =
    managerTeam.activeRosterCount -
    activeRosterDelta(resolvedManagerPlayer) +
    activeRosterDelta(resolvedTargetPlayer);
  const partnerRosterAfter =
    effectivePartnerTeam.activeRosterCount -
    activeRosterDelta(resolvedTargetPlayer) +
    activeRosterDelta(resolvedManagerPlayer);

  const managerValue = targetPlayer
    ? buildPlayerValue({
        ...targetPlayer,
        capHit: safeCapHit(targetPlayer),
        teamNeedScore: teamNeedForPosition(managerTeam, targetPlayer.positionCode),
      }).score
    : 55;
  const partnerValue = managerPlayer
    ? buildPlayerValue({
        ...managerPlayer,
        capHit: safeCapHit(managerPlayer),
        teamNeedScore: teamNeedForPosition(effectivePartnerTeam, managerPlayer.positionCode),
      }).score
    : 55;
  const reasons: string[] = [];
  let hardReject = false;

  if (managerTeam.salaryCapSpace + capDeltaManager < 0) {
    hardReject = true;
    reasons.push("Manager-Team verletzt den Cap.");
  }

  if (effectivePartnerTeam.salaryCapSpace + capDeltaPartner < 0) {
    hardReject = true;
    reasons.push("CPU-Team verletzt den Cap.");
  }

  if (managerRosterAfter > managerTeam.activeRosterLimit) {
    hardReject = true;
    reasons.push("Manager-Team ueberschreitet das aktive Roster-Limit.");
  }

  if (partnerRosterAfter > effectivePartnerTeam.activeRosterLimit) {
    hardReject = true;
    reasons.push("CPU-Team ueberschreitet das aktive Roster-Limit.");
  }

  if (hardReject) {
    return {
      status: "Rejected",
      reasons,
      managerValueScore: managerValue,
      partnerValueScore: partnerValue,
      capDeltaManager,
      capDeltaPartner,
    };
  }

  const valueGapForCpu = partnerValue - managerValue;

  if (input.kind === "receive-for-future" && targetPlayer) {
    if (managerValue >= 78) {
      reasons.push("CPU will diesen Spieler nicht fuer Future Value abgeben.");
      return {
        status: "Rejected",
        reasons,
        managerValueScore: managerValue,
        partnerValueScore: partnerValue,
        capDeltaManager,
        capDeltaPartner,
      };
    }

    reasons.push("Future Value ist fuer einen Kaderfueller plausibel.");
    return {
      status: managerValue >= 69 ? "Close" : "Accepted",
      reasons,
      managerValueScore: managerValue,
      partnerValueScore: partnerValue,
      capDeltaManager,
      capDeltaPartner,
    };
  }

  if (input.kind === "send-for-future") {
    reasons.push(
      partnerValue >= 72
        ? "CPU sieht klaren Need-/Value-Gewinn."
        : "CPU sieht nur begrenzten Gegenwert.",
    );
    return {
      status: partnerValue >= 72 ? "Accepted" : partnerValue >= 64 ? "Close" : "Rejected",
      reasons,
      managerValueScore: managerValue,
      partnerValueScore: partnerValue,
      capDeltaManager,
      capDeltaPartner,
    };
  }

  reasons.push(
    valueGapForCpu >= -5
      ? "Value und Team Need sind fuer die CPU vertretbar."
      : "CPU gibt mehr Value ab als sie zurueckbekommt.",
  );

  return {
    status: valueGapForCpu >= -5 ? "Accepted" : valueGapForCpu >= -15 ? "Close" : "Rejected",
    reasons,
    managerValueScore: managerValue,
    partnerValueScore: partnerValue,
    capDeltaManager,
    capDeltaPartner,
  };
}
