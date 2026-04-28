import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import {
  buildPlayerRole,
  type PlayerRoleCategory,
} from "@/components/player/player-role-model";

export const ALL_FILTER_VALUE = "ALL";

export type RosterSortKey = "capHit" | "position" | "overall" | "status";
export type RosterRatingFilter = typeof ALL_FILTER_VALUE | "80_PLUS" | "70_79" | "UNDER_70";
export type RosterContractRiskTone = "positive" | "warning" | "danger" | "neutral";

export type RosterContractRisk = {
  capSharePercent: number;
  description: string;
  isExpiring: boolean;
  label: string;
  tone: RosterContractRiskTone;
};

export type RosterContractSnapshotPlayer = {
  capHit: number;
  capSharePercent: number;
  fullName: string;
  id: string;
  positionCode: string;
  risk: RosterContractRisk;
  years: number;
};

export type RosterContractSnapshot = {
  capLimit: number;
  contractCount: number;
  expiringCap: number;
  expiringCount: number;
  expiringPlayers: RosterContractSnapshotPlayer[];
  highCapCount: number;
  noContractCount: number;
  topCapPlayers: RosterContractSnapshotPlayer[];
};

export type RosterFilters = {
  positionCode: string;
  playerRole: PlayerRoleCategory | typeof ALL_FILTER_VALUE;
  ratingTier: RosterRatingFilter;
  rosterStatus: string;
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

const ROSTER_STATUS_ORDER = [
  "STARTER",
  "ROTATION",
  "BACKUP",
  "INACTIVE",
  "INJURED_RESERVE",
  "PRACTICE_SQUAD",
  "FREE_AGENT",
];

const ROSTER_STATUS_LABELS: Record<string, string> = {
  BACKUP: "Backup",
  FREE_AGENT: "Free Agent",
  INACTIVE: "Inaktiv",
  INJURED_RESERVE: "Injured Reserve",
  PRACTICE_SQUAD: "Practice Squad",
  ROTATION: "Rotation",
  STARTER: "Starter",
};

const HIGH_CAP_SHARE_PERCENT = 8;

export const RATING_FILTER_OPTIONS: Array<{
  description: string;
  label: string;
  value: RosterRatingFilter;
}> = [
  {
    description: "Alle Spieler anzeigen.",
    label: "Alle Ratings",
    value: ALL_FILTER_VALUE,
  },
  {
    description: "Starter- oder Star-Kaliber.",
    label: "80+ OVR",
    value: "80_PLUS",
  },
  {
    description: "Rotation, solide Starter und gute Backups.",
    label: "70-79 OVR",
    value: "70_79",
  },
  {
    description: "Entwicklung, Tiefe oder klare Needs.",
    label: "unter 70 OVR",
    value: "UNDER_70",
  },
];

export function getRosterStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "Kein Status";
  }

  return ROSTER_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function positionRank(positionCode: string) {
  const index = POSITION_ORDER.indexOf(positionCode);
  return index === -1 ? POSITION_ORDER.length : index;
}

function statusRank(status: string) {
  const index = ROSTER_STATUS_ORDER.indexOf(status);
  return index === -1 ? ROSTER_STATUS_ORDER.length : index;
}

function matchesRatingTier(player: TeamPlayerSummary, ratingTier: RosterRatingFilter) {
  if (ratingTier === ALL_FILTER_VALUE) {
    return true;
  }

  if (ratingTier === "80_PLUS") {
    return player.positionOverall >= 80;
  }

  if (ratingTier === "70_79") {
    return player.positionOverall >= 70 && player.positionOverall < 80;
  }

  return player.positionOverall < 70;
}

export function getCapSharePercent(capHit: number, capLimit: number) {
  if (capLimit <= 0) {
    return 0;
  }

  return Math.round((capHit / capLimit) * 1000) / 10;
}

export function getRosterContractRisk(
  player: TeamPlayerSummary,
  capLimit: number,
): RosterContractRisk {
  if (!player.currentContract) {
    return {
      capSharePercent: 0,
      description: "Kein aktiver Vertrag gespeichert.",
      isExpiring: false,
      label: "Kein Vertrag",
      tone: "warning",
    };
  }

  const capSharePercent = getCapSharePercent(player.currentContract.capHit, capLimit);
  const isExpiring = player.currentContract.years <= 1;

  if (isExpiring && capSharePercent >= HIGH_CAP_SHARE_PERCENT) {
    return {
      capSharePercent,
      description: "Auslaufender Vertrag mit hohem Cap-Anteil.",
      isExpiring,
      label: "High Risk",
      tone: "danger",
    };
  }

  if (isExpiring) {
    return {
      capSharePercent,
      description: "Vertrag laeuft nach dieser Saison aus.",
      isExpiring,
      label: "Auslaufend",
      tone: "warning",
    };
  }

  if (capSharePercent >= HIGH_CAP_SHARE_PERCENT) {
    return {
      capSharePercent,
      description: "Hoher Anteil am aktuellen Salary Cap.",
      isExpiring,
      label: "Hoher Cap",
      tone: "warning",
    };
  }

  return {
    capSharePercent,
    description: "Mehrjaehrig gebunden ohne akutes Cap-Signal.",
    isExpiring,
    label: "Stabil",
    tone: "positive",
  };
}

function contractSnapshotPlayer(
  player: TeamPlayerSummary,
  capLimit: number,
): RosterContractSnapshotPlayer | null {
  if (!player.currentContract) {
    return null;
  }

  const risk = getRosterContractRisk(player, capLimit);

  return {
    capHit: player.currentContract.capHit,
    capSharePercent: risk.capSharePercent,
    fullName: player.fullName,
    id: player.id,
    positionCode: player.positionCode,
    risk,
    years: player.currentContract.years,
  };
}

export function buildRosterContractSnapshot(
  team: Pick<TeamDetail, "contractOutlook" | "players" | "salaryCapSpace">,
): RosterContractSnapshot {
  const activeCapCommitted = Number(team.contractOutlook.activeCapCommitted);
  const salaryCapSpace = Number(team.salaryCapSpace);
  const capLimit = activeCapCommitted + salaryCapSpace;
  const contractPlayers = team.players
    .map((player) => contractSnapshotPlayer(player, capLimit))
    .filter((player): player is RosterContractSnapshotPlayer => Boolean(player));
  const expiringPlayers = contractPlayers
    .filter((player) => player.years <= 1)
    .sort((left, right) => right.capHit - left.capHit)
    .slice(0, 5);
  const highCapCount = contractPlayers.filter(
    (player) => player.capSharePercent >= HIGH_CAP_SHARE_PERCENT,
  ).length;

  return {
    capLimit,
    contractCount: contractPlayers.length,
    expiringCap: Number(team.contractOutlook.expiringCap),
    expiringCount: team.contractOutlook.expiringPlayers.length,
    expiringPlayers,
    highCapCount,
    noContractCount: team.players.filter((player) => !player.currentContract).length,
    topCapPlayers: [...contractPlayers]
      .sort((left, right) => {
        if (right.capHit !== left.capHit) {
          return right.capHit - left.capHit;
        }

        return left.fullName.localeCompare(right.fullName);
      })
      .slice(0, 5),
  };
}

function compareByDefaultRosterOrder(left: TeamPlayerSummary, right: TeamPlayerSummary) {
  const positionDiff = positionRank(left.positionCode) - positionRank(right.positionCode);
  if (positionDiff !== 0) {
    return positionDiff;
  }

  const depthDiff = (left.depthChartSlot ?? 99) - (right.depthChartSlot ?? 99);
  if (depthDiff !== 0) {
    return depthDiff;
  }

  return right.positionOverall - left.positionOverall;
}

export function getRosterFilterOptions(players: TeamPlayerSummary[]) {
  const positions = Array.from(new Set(players.map((player) => player.positionCode))).sort(
    (left, right) => {
      const rankDiff = positionRank(left) - positionRank(right);
      return rankDiff !== 0 ? rankDiff : left.localeCompare(right);
    },
  );
  const statuses = Array.from(new Set(players.map((player) => player.rosterStatus))).sort(
    (left, right) => {
      const rankDiff = statusRank(left) - statusRank(right);
      return rankDiff !== 0 ? rankDiff : left.localeCompare(right);
    },
  );

  return {
    positions,
    statuses,
  };
}

export function filterRosterPlayers(players: TeamPlayerSummary[], filters: RosterFilters) {
  return players.filter((player) => {
    const positionMatches =
      filters.positionCode === ALL_FILTER_VALUE || player.positionCode === filters.positionCode;
    const statusMatches =
      filters.rosterStatus === ALL_FILTER_VALUE || player.rosterStatus === filters.rosterStatus;
    const ratingMatches = matchesRatingTier(player, filters.ratingTier);
    const roleMatches =
      filters.playerRole === ALL_FILTER_VALUE ||
      buildPlayerRole(player).category === filters.playerRole;

    return positionMatches && statusMatches && ratingMatches && roleMatches;
  });
}

export function sortRosterPlayersBy(players: TeamPlayerSummary[], sortKey: RosterSortKey) {
  return [...players].sort((left, right) => {
    if (sortKey === "overall") {
      if (right.positionOverall !== left.positionOverall) {
        return right.positionOverall - left.positionOverall;
      }

      if (right.potentialRating !== left.potentialRating) {
        return right.potentialRating - left.potentialRating;
      }

      return left.fullName.localeCompare(right.fullName);
    }

    if (sortKey === "status") {
      const statusDiff = statusRank(left.rosterStatus) - statusRank(right.rosterStatus);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      return compareByDefaultRosterOrder(left, right);
    }

    if (sortKey === "capHit") {
      const leftCapHit = left.currentContract?.capHit ?? 0;
      const rightCapHit = right.currentContract?.capHit ?? 0;

      if (rightCapHit !== leftCapHit) {
        return rightCapHit - leftCapHit;
      }

      return right.positionOverall - left.positionOverall;
    }

    return compareByDefaultRosterOrder(left, right);
  });
}

export function selectRosterQuickInfoPlayer(players: TeamPlayerSummary[]) {
  return [...players].sort((left, right) => {
    if (right.positionOverall !== left.positionOverall) {
      return right.positionOverall - left.positionOverall;
    }

    if ((right.currentContract?.capHit ?? 0) !== (left.currentContract?.capHit ?? 0)) {
      return (right.currentContract?.capHit ?? 0) - (left.currentContract?.capHit ?? 0);
    }

    return left.fullName.localeCompare(right.fullName);
  })[0] ?? null;
}

export function getVisibleRosterPlayers(
  players: TeamPlayerSummary[],
  filters: RosterFilters,
  sortKey: RosterSortKey,
) {
  return sortRosterPlayersBy(filterRosterPlayers(players, filters), sortKey);
}

export function canReleasePlayer(player: TeamPlayerSummary, managerControlled: boolean) {
  return managerControlled && player.rosterStatus !== "FREE_AGENT";
}

export function getRosterActionState(player: TeamPlayerSummary, managerControlled: boolean) {
  const canRelease = canReleasePlayer(player, managerControlled);

  return {
    canOpenProfile: true,
    canRelease,
    releaseReason: canRelease
      ? "Release erlaubt"
      : managerControlled
        ? "Spieler ist nicht auf dem aktiven Kader."
        : "Release nur fuer das Managerteam.",
  };
}
