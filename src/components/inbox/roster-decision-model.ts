import { buildPlayerRole } from "@/components/player/player-role-model";
import { buildPlayerValue } from "@/components/player/player-value-model";
import {
  buildDepthChartGroups,
  detectDepthChartConflicts,
  getEmptyStarterPositions,
} from "@/components/team/depth-chart-model";
import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

export type RosterDecisionPriority = "critical" | "high" | "medium";

export type RosterDecisionItem = {
  id: string;
  title: string;
  cause: string;
  impact: string;
  href: string;
  actionLabel: string;
  priority: RosterDecisionPriority;
  affectedLabel: string;
};

export const MAX_ROSTER_DECISIONS = 3;

const PRIORITY_WEIGHT: Record<RosterDecisionPriority, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

const DECISION_ORDER = [
  "depth-conflicts",
  "starter-missing",
  "high-value-market",
  "expensive-backup",
  "development-role",
] as const;

function decisionOrder(id: string) {
  const index = DECISION_ORDER.findIndex((prefix) => id.startsWith(prefix));

  return index === -1 ? DECISION_ORDER.length : index;
}

function teamHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/team`;
}

function depthChartHref(saveGameId: string) {
  return `${teamHref(saveGameId)}/depth-chart`;
}

function rosterHref(saveGameId: string) {
  return `${teamHref(saveGameId)}/roster`;
}

function freeAgencyHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/finance/free-agency`;
}

function tradesHref(saveGameId: string) {
  return `${teamHref(saveGameId)}/trades`;
}

function isDevelopmentWithoutRole(player: TeamPlayerSummary) {
  const role = buildPlayerRole(player);

  return (
    role.category === "development-upside" &&
    !player.developmentFocus &&
    (player.rosterStatus === "BACKUP" || player.rosterStatus === "INACTIVE") &&
    player.depthChartSlot == null
  );
}

export function buildRosterDecisionInbox(input: {
  saveGameId: string;
  team: TeamDetail | null;
}): RosterDecisionItem[] {
  const { saveGameId, team } = input;

  if (!team) {
    return [];
  }

  const decisions: RosterDecisionItem[] = [];
  const hasPlayerList = Array.isArray(team.players);
  const players = hasPlayerList ? team.players : [];
  const teamNeeds = Array.isArray(team.teamNeeds) ? team.teamNeeds : [];
  const conflicts = hasPlayerList ? detectDepthChartConflicts(players) : [];
  const emptyStarterPositions = hasPlayerList
    ? getEmptyStarterPositions(buildDepthChartGroups(players))
    : [];

  if (conflicts.length > 0) {
    decisions.push({
      id: "depth-conflicts",
      title: "Aufstellung klaeren",
      cause: `${conflicts.length} doppelte Rolle(n)`,
      impact: "Ein Spielerplatz ist mehrfach belegt.",
      href: depthChartHref(saveGameId),
      actionLabel: "Jetzt beheben",
      priority: "critical",
      affectedLabel: conflicts
        .map((conflict) => `${conflict.positionCode} #${conflict.slot}`)
        .join(", "),
    });
  }

  if (emptyStarterPositions.length > 0) {
    decisions.push({
      id: "starter-missing",
      title: "Starter fehlt",
      cause: `${emptyStarterPositions.length} offene Slot-1-Position(en)`,
      impact: "Setze zuerst die Starter.",
      href: depthChartHref(saveGameId),
      actionLabel: "Zum Depth Chart",
      priority: "critical",
      affectedLabel: emptyStarterPositions.map((group) => group.positionCode).join(", "),
    });
  }

  const expensiveBackups = players
    .map((player) => ({
      player,
      value: buildPlayerValue({
        ...player,
        capHit: player.currentContract?.capHit,
      }),
    }))
    .filter(
      ({ player, value }) =>
        value.label === "Expensive" &&
        (player.rosterStatus === "BACKUP" || player.rosterStatus === "ROTATION"),
    )
    .sort((left, right) => (right.player.currentContract?.capHit ?? 0) - (left.player.currentContract?.capHit ?? 0));

  for (const { player, value } of expensiveBackups.slice(0, 1)) {
    decisions.push({
      id: `expensive-backup-${player.id}`,
      title: "Teurer Backup",
      cause: player.fullName,
      impact: value.summary,
      href: tradesHref(saveGameId),
      actionLabel: "Trade pruefen",
      priority: "high",
      affectedLabel: `${player.positionCode} ${player.fullName}`,
    });
  }

  const topNeed = [...teamNeeds].sort((left, right) => right.needScore - left.needScore)[0];

  if (topNeed && topNeed.needScore >= 7) {
    decisions.push({
      id: `high-value-market-${topNeed.positionCode}`,
      title: "Hoher Team Need",
      cause: `${topNeed.positionCode} · Need ${topNeed.needScore}`,
      impact: "Pruefe passende Verstaerkung.",
      href: freeAgencyHref(saveGameId),
      actionLabel: "Jetzt pruefen",
      priority: "high",
      affectedLabel: topNeed.positionCode,
    });
  }

  const developmentPlayer = players
    .filter(isDevelopmentWithoutRole)
    .sort((left, right) => right.potentialRating - right.positionOverall - (left.potentialRating - left.positionOverall))[0];

  if (developmentPlayer) {
    decisions.push({
      id: `development-role-${developmentPlayer.id}`,
      title: "Development-Spieler ohne Rolle",
      cause: developmentPlayer.fullName,
      impact: "Upside ohne Slot oder Dev Focus.",
      href: rosterHref(saveGameId),
      actionLabel: "Roster oeffnen",
      priority: "medium",
      affectedLabel: `${developmentPlayer.positionCode} ${developmentPlayer.fullName}`,
    });
  }

  return decisions
    .sort((left, right) => {
      const priorityDiff = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const orderDiff = decisionOrder(left.id) - decisionOrder(right.id);

      if (orderDiff !== 0) {
        return orderDiff;
      }

      return left.affectedLabel.localeCompare(right.affectedLabel);
    })
    .slice(0, MAX_ROSTER_DECISIONS);
}
