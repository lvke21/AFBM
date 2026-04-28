import type { TeamDetail, TeamNeedSummary, TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import { buildContractOffer } from "@/modules/teams/domain/contract-calculation";

export type SchemeOption = {
  code: string;
  label: string;
};

export const OFFENSE_SCHEMES: SchemeOption[] = [
  { code: "BALANCED_OFFENSE", label: "Balanced Offense" },
  { code: "POWER_RUN", label: "Power Run" },
  { code: "SPREAD_ATTACK", label: "Spread Attack" },
  { code: "WEST_COAST", label: "West Coast" },
  { code: "AIR_RAID", label: "Air Raid" },
];

export const DEFENSE_SCHEMES: SchemeOption[] = [
  { code: "FOUR_THREE_FRONT", label: "4-3 Front" },
  { code: "THREE_FOUR_FRONT", label: "3-4 Front" },
  { code: "PRESS_MAN", label: "Press Man" },
  { code: "ZONE_DISCIPLINE", label: "Zone Discipline" },
];

export const SPECIAL_TEAMS_SCHEMES: SchemeOption[] = [
  { code: "FIELD_POSITION", label: "Field Position" },
  { code: "POWER_LEG", label: "Power Leg" },
  { code: "RETURN_SPARK", label: "Return Spark" },
];

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

export type ContractDecisionSignalTone = "positive" | "warning" | "danger" | "neutral";

export type ContractDecisionSignal = {
  decisionQuestion: string;
  description: string;
  label: "Value Contract" | "Teuer fuer Leistung" | "Bald auslaufend" | "Kein Vertrag" | "Stabil";
  tone: ContractDecisionSignalTone;
};

export function selectSchemeCode(
  options: SchemeOption[],
  currentLabel: string | null,
  fallbackCode: string,
) {
  return options.find((scheme) => scheme.label === currentLabel)?.code ?? fallbackCode;
}

export function sortTeamNeeds(needs: TeamNeedSummary[]) {
  return [...needs].sort((left, right) => {
    if (right.needScore !== left.needScore) {
      return right.needScore - left.needScore;
    }

    if (left.starterAverage !== right.starterAverage) {
      return left.starterAverage - right.starterAverage;
    }

    return left.positionCode.localeCompare(right.positionCode);
  });
}

export function getCapUsagePercent(team: Pick<TeamDetail, "contractOutlook" | "salaryCapSpace">) {
  const activeCap = Number(team.contractOutlook.activeCapCommitted);
  const capSpace = Number(team.salaryCapSpace);
  const capLimit = activeCap + capSpace;

  if (capLimit <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((activeCap / capLimit) * 100)));
}

export function getCapSummary(team: Pick<TeamDetail, "contractOutlook" | "salaryCapSpace">) {
  const activeCapCommitted = Number(team.contractOutlook.activeCapCommitted);
  const salaryCapSpace = Number(team.salaryCapSpace);
  const capLimit = activeCapCommitted + salaryCapSpace;

  return {
    activeCapCommitted,
    capLimit,
    capUsagePercent: getCapUsagePercent(team),
    salaryCapSpace,
  };
}

export function getContractDecisionSignal(input: {
  age?: number;
  capHit: number;
  capLimit: number;
  positionOverall: number;
  potentialRating?: number;
  rosterStatus: string;
  years: number;
}): ContractDecisionSignal {
  if (input.capHit <= 0 || input.years <= 0) {
    return {
      decisionQuestion: "Erst Vertragsdaten klaeren, bevor eine Roster-Entscheidung belastbar ist.",
      description: "Kein aktiver Vertrag gespeichert.",
      label: "Kein Vertrag",
      tone: "warning",
    };
  }

  const capShare = input.capLimit > 0 ? input.capHit / input.capLimit : 0;
  const capPerOvr = input.capHit / Math.max(input.positionOverall, 1);
  const expectedCapPerOvr = 120_000;
  const upside = Math.max(0, (input.potentialRating ?? input.positionOverall) - input.positionOverall);
  const isBackupRole =
    input.rosterStatus === "BACKUP" ||
    input.rosterStatus === "ROTATION" ||
    input.rosterStatus === "INACTIVE";

  if (input.years <= 1) {
    return {
      decisionQuestion:
        input.positionOverall >= 76
          ? "Verlaengern oder Ersatz vorbereiten?"
          : "Behalten, guenstig verlaengern oder auslaufen lassen?",
      description:
        input.positionOverall >= 76
          ? "Leistung ist relevant, aber die Bindung endet bald."
          : "Kurzfristige Bindung mit unklarem langfristigem Wert.",
      label: "Bald auslaufend",
      tone: input.positionOverall >= 76 ? "danger" : "warning",
    };
  }

  if ((capShare >= 0.08 && input.positionOverall < 80) || (isBackupRole && capShare >= 0.045)) {
    return {
      decisionQuestion: "Kannst du dir diese Rolle zu diesem Preis leisten?",
      description: isBackupRole
        ? "Hoher Cap-Anteil fuer Rotation oder Backup."
        : "Cap Hit liegt hoch im Vergleich zur aktuellen Leistung.",
      label: "Teuer fuer Leistung",
      tone: "warning",
    };
  }

  if (
    capPerOvr <= expectedCapPerOvr * 0.85 &&
    (input.positionOverall >= 74 || upside >= 6 || input.age === undefined || input.age <= 25)
  ) {
    return {
      decisionQuestion: "Behalten und sportlich nutzen.",
      description:
        upside >= 6
          ? "Guenstige Bindung mit Entwicklungsspielraum."
          : "Cap Hit passt gut zur aktuellen Leistung.",
      label: "Value Contract",
      tone: "positive",
    };
  }

  return {
    decisionQuestion: "Behalten, solange Rolle und Cap Space stabil bleiben.",
    description: "Kosten, Laufzeit und Leistung sind ohne akutes Signal im Rahmen.",
    label: "Stabil",
    tone: "neutral",
  };
}

export function getContractRows(players: TeamPlayerSummary[]) {
  return players
    .filter((player) => player.currentContract)
    .map((player) => ({
      playerId: player.id,
      age: player.age,
      depthChartSlot: player.depthChartSlot,
      fullName: player.fullName,
      positionCode: player.positionCode,
      potentialRating: player.potentialRating,
      rosterStatus: player.rosterStatus,
      years: player.currentContract?.years ?? 0,
      yearlySalary: player.currentContract?.yearlySalary ?? 0,
      signingBonus: player.currentContract?.signingBonus ?? 0,
      capHit: player.currentContract?.capHit ?? 0,
      positionOverall: player.positionOverall,
      extendPreview: buildContractOffer({
        positionOverall: player.positionOverall,
        yearlySalary: Math.max(
          player.currentContract?.yearlySalary ?? 0,
          Math.round(player.positionOverall * 125_000),
        ),
        years: Math.max(2, Math.min(5, (player.currentContract?.years ?? 1) + 1)),
      }),
    }))
    .sort((left, right) => {
      if (right.capHit !== left.capHit) {
        return right.capHit - left.capHit;
      }

      return right.positionOverall - left.positionOverall;
    });
}

export function getContractReleaseImpact(contract: {
  capHit: number;
  signingBonus: number;
}) {
  const deadCap = Math.min(contract.capHit, Math.max(0, Math.round(contract.signingBonus)));

  return {
    capSavings: Math.max(0, contract.capHit - deadCap),
    deadCap,
  };
}

export function getContractTableSummary(players: TeamPlayerSummary[]) {
  const rows = getContractRows(players);

  return {
    contractCount: rows.length,
    totalCapHit: rows.reduce((total, row) => total + row.capHit, 0),
    totalYearlySalary: rows.reduce((total, row) => total + row.yearlySalary, 0),
  };
}

export function getFinanceEventListState(events: TeamDetail["recentFinanceEvents"]) {
  const rows = [...events]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .map((event) => ({
      ...event,
      capImpactDirection:
        event.capImpact < 0 ? "negative" : event.capImpact > 0 ? "positive" : "neutral",
      cashImpactDirection:
        event.amount < 0 ? "negative" : event.amount > 0 ? "positive" : "neutral",
    }));

  return rows.length > 0
    ? {
        events: rows,
        isEmpty: false,
        message: `${rows.length} Finance Events vorhanden.`,
      }
    : {
        events: rows,
        isEmpty: true,
        message: "Noch keine Finance Events.",
      };
}

export function getRosterSummary(players: TeamPlayerSummary[]) {
  const activePlayers = players.filter((player) => player.rosterStatus !== "PRACTICE_SQUAD");
  const starters = players.filter((player) => player.rosterStatus === "STARTER").length;
  const injured = players.filter((player) => player.injuryStatus !== "HEALTHY").length;
  const averageOverall =
    players.length > 0
      ? Math.round(
          players.reduce((total, player) => total + player.positionOverall, 0) / players.length,
        )
      : 0;

  return {
    activePlayers: activePlayers.length,
    averageOverall,
    injured,
    playerCount: players.length,
    starters,
  };
}

export function sortRosterPlayers(players: TeamPlayerSummary[]) {
  return [...players].sort((left, right) => {
    const leftPositionOrder = POSITION_ORDER.indexOf(left.positionCode);
    const rightPositionOrder = POSITION_ORDER.indexOf(right.positionCode);
    const normalizedLeftOrder =
      leftPositionOrder === -1 ? POSITION_ORDER.length : leftPositionOrder;
    const normalizedRightOrder =
      rightPositionOrder === -1 ? POSITION_ORDER.length : rightPositionOrder;

    if (normalizedLeftOrder !== normalizedRightOrder) {
      return normalizedLeftOrder - normalizedRightOrder;
    }

    if ((left.depthChartSlot ?? 99) !== (right.depthChartSlot ?? 99)) {
      return (left.depthChartSlot ?? 99) - (right.depthChartSlot ?? 99);
    }

    return right.positionOverall - left.positionOverall;
  });
}
