import { buildPlayerValue } from "@/components/player/player-value-model";
import type { TradeMarket, TradePlayer, TradeTeam } from "./trade-model";

export type TradeBoardDecisionTone = "positive" | "neutral" | "warning" | "danger";

export type TradeBoardDecisionSummary = {
  description: string;
  label: string;
  tone: TradeBoardDecisionTone;
  valueScore: number;
};

export type TradeBoardPlayer = TradePlayer & {
  decisionSummary: TradeBoardDecisionSummary;
  managerNeedScore: number | null;
};

export type TradeBoardBalanceHint = {
  capDelta: number;
  description: string;
  incomingValue: number;
  label: "Fairer Trade (grob)" | "Ungleiches Angebot" | "Cap-Risiko" | "Auswahl unvollstaendig";
  outgoingValue: number;
  tone: TradeBoardDecisionTone;
  valueGap: number;
};

export type TradeBoardState = {
  defaultOwnPlayerId: string | null;
  defaultPartnerTeamId: string | null;
  defaultTargetPlayerId: string | null;
  emptyMessage: string;
  hasTradePool: boolean;
  managerTeam: TradeTeam | null;
  ownPlayers: TradeBoardPlayer[];
  partnerTeams: TradeTeam[];
  targetPlayers: TradeBoardPlayer[];
};

const POSITION_ORDER = [
  "QB",
  "RB",
  "FB",
  "WR",
  "TE",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "LE",
  "RE",
  "DT",
  "LOLB",
  "MLB",
  "ROLB",
  "CB",
  "FS",
  "SS",
  "K",
  "P",
  "LS",
];

function positionRank(positionCode: string) {
  const index = POSITION_ORDER.indexOf(positionCode);

  return index === -1 ? POSITION_ORDER.length : index;
}

function managerNeedScore(managerTeam: TradeTeam | null, positionCode: string) {
  return managerTeam?.needs.find((need) => need.positionCode === positionCode)?.needScore ?? null;
}

function decisionSummaryForPlayer(
  player: TradePlayer,
  managerTeam: TradeTeam | null,
): TradeBoardDecisionSummary {
  const managerNeed = managerNeedScore(managerTeam, player.positionCode);
  const value = buildPlayerValue({
    age: player.age,
    capHit: player.capHit,
    depthChartSlot: player.depthChartSlot,
    positionOverall: player.positionOverall,
    potentialRating: player.potentialRating,
    rosterStatus: player.rosterStatus,
    schemeFitScore: player.schemeFitScore,
    teamNeedScore: managerNeed,
  });
  const upside = Math.max(0, player.potentialRating - player.positionOverall);

  if (value.label === "Expensive") {
    return {
      description: `${value.reason}. Cap vor Angebot pruefen.`,
      label: "Kostenrisiko",
      tone: "warning",
      valueScore: value.score,
    };
  }

  if (value.label === "Low Fit") {
    return {
      description: `${value.reason}. Nur mit klarem Rollenplan sinnvoll.`,
      label: "Fit-Frage",
      tone: "danger",
      valueScore: value.score,
    };
  }

  if (upside >= 6 && player.age <= 25) {
    return {
      description: `Junges Profil mit +${upside} Potential. Entwicklung gegen Sofortleistung abwaegen.`,
      label: "Upside Target",
      tone: "positive",
      valueScore: value.score,
    };
  }

  if (managerNeed != null && managerNeed >= 8) {
    return {
      description: `Adressiert einen klaren Team Need (${managerNeed}/10).`,
      label: "Need Fit",
      tone: "positive",
      valueScore: value.score,
    };
  }

  return {
    description: value.reason,
    label: value.label,
    tone: value.tone === "negative" ? "danger" : value.tone,
    valueScore: value.score,
  };
}

function toBoardPlayer(player: TradePlayer, managerTeam: TradeTeam | null): TradeBoardPlayer {
  return {
    ...player,
    decisionSummary: decisionSummaryForPlayer(player, managerTeam),
    managerNeedScore: managerNeedScore(managerTeam, player.positionCode),
  };
}

function sortBoardPlayers(left: TradeBoardPlayer, right: TradeBoardPlayer) {
  if (right.positionOverall !== left.positionOverall) {
    return right.positionOverall - left.positionOverall;
  }

  if (right.potentialRating !== left.potentialRating) {
    return right.potentialRating - left.potentialRating;
  }

  const positionDiff = positionRank(left.positionCode) - positionRank(right.positionCode);

  if (positionDiff !== 0) {
    return positionDiff;
  }

  return left.fullName.localeCompare(right.fullName);
}

export function buildTradeBoardState(market: TradeMarket): TradeBoardState {
  const managerTeam =
    market.teams.find((team) => team.id === market.managerTeamId) ??
    market.teams.find((team) => team.managerControlled) ??
    null;
  const ownPlayers = market.players
    .filter((player) => player.teamId === market.managerTeamId)
    .map((player) => toBoardPlayer(player, managerTeam))
    .sort(sortBoardPlayers);
  const targetPlayers = market.players
    .filter((player) => player.teamId !== market.managerTeamId)
    .map((player) => toBoardPlayer(player, managerTeam))
    .sort(sortBoardPlayers);
  const partnerTeams = market.teams
    .filter((team) => team.id !== market.managerTeamId)
    .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  const hasTradePool =
    ownPlayers.length > 0 && targetPlayers.length > 0 && partnerTeams.length > 0;

  return {
    defaultOwnPlayerId: ownPlayers[0]?.id ?? null,
    defaultPartnerTeamId: partnerTeams[0]?.id ?? null,
    defaultTargetPlayerId: targetPlayers[0]?.id ?? null,
    emptyMessage: hasTradePool
      ? "Trade Board bereit."
      : "Fuer ein Trade Board braucht dein Team eigene Spieler und mindestens ein CPU-Team mit Zielspielern.",
    hasTradePool,
    managerTeam,
    ownPlayers,
    partnerTeams,
    targetPlayers,
  };
}

export function getTradeBoardTargetsForTeam(state: TradeBoardState, teamId: string | null) {
  if (!teamId || teamId === "ALL") {
    return state.targetPlayers;
  }

  return state.targetPlayers.filter((player) => player.teamId === teamId);
}

function sumValue(players: TradeBoardPlayer[]) {
  return players.reduce((sum, player) => sum + player.decisionSummary.valueScore, 0);
}

function sumCap(players: TradeBoardPlayer[]) {
  return players.reduce((sum, player) => sum + Math.max(0, player.capHit), 0);
}

export function estimateTradeBoardBalance({
  managerTeam,
  ownPlayers,
  targetPlayers,
}: {
  managerTeam: TradeTeam | null;
  ownPlayers: TradeBoardPlayer[];
  targetPlayers: TradeBoardPlayer[];
}): TradeBoardBalanceHint {
  const outgoingValue = sumValue(ownPlayers);
  const incomingValue = sumValue(targetPlayers);
  const outgoingCap = sumCap(ownPlayers);
  const incomingCap = sumCap(targetPlayers);
  const capDelta = incomingCap - outgoingCap;
  const valueGap = incomingValue - outgoingValue;

  if (ownPlayers.length === 0 || targetPlayers.length === 0) {
    return {
      capDelta,
      description: "Mindestens einen eigenen Spieler und ein Target auswaehlen.",
      incomingValue,
      label: "Auswahl unvollstaendig",
      outgoingValue,
      tone: "neutral",
      valueGap,
    };
  }

  if (managerTeam && managerTeam.salaryCapSpace - capDelta < 0) {
    return {
      capDelta,
      description: "Incoming Cap Hit wuerde den verfuegbaren Cap Space uebersteigen.",
      incomingValue,
      label: "Cap-Risiko",
      outgoingValue,
      tone: "danger",
      valueGap,
    };
  }

  if (Math.abs(valueGap) <= 10) {
    return {
      capDelta,
      description: "Value liegt grob in derselben Zone. Details waeren erst in einer echten Trade-Pruefung belastbar.",
      incomingValue,
      label: "Fairer Trade (grob)",
      outgoingValue,
      tone: "positive",
      valueGap,
    };
  }

  return {
    capDelta,
    description:
      valueGap > 0
        ? "Du fragst sichtbar mehr Value an, als du abgibst."
        : "Du gibst sichtbar mehr Value ab, als du zurueckbekommst.",
    incomingValue,
    label: "Ungleiches Angebot",
    outgoingValue,
    tone: valueGap > 0 ? "warning" : "danger",
    valueGap,
  };
}
