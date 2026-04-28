import { buildPlayerRole } from "@/components/player/player-role-model";
import { buildPlayerValue } from "@/components/player/player-value-model";
import {
  buildDepthChartGroups,
  detectDepthChartConflicts,
  getEmptyStarterPositions,
} from "@/components/team/depth-chart-model";
import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

export const MAX_SHORT_TERM_GOALS = 3;

export type ShortTermGoal = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  tone: "critical" | "important" | "optional";
};

export type ShortTermGoalsState = {
  title: string;
  goals: ShortTermGoal[];
  emptyMessage: string;
};

function teamHref(saveGameId: string, section?: string) {
  const base = `/app/savegames/${saveGameId}/team`;

  return section ? `${base}/${section}` : base;
}

function freeAgencyHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/finance/free-agency`;
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

function topValueProblem(players: TeamPlayerSummary[]) {
  return players
    .map((player) => ({
      player,
      value: buildPlayerValue({
        ...player,
        capHit: player.currentContract?.capHit,
      }),
    }))
    .filter(
      ({ player, value }) =>
        player.status === "ACTIVE" &&
        (value.label === "Expensive" || value.label === "Low Fit") &&
        (player.rosterStatus === "BACKUP" || player.rosterStatus === "ROTATION"),
    )
    .sort((left, right) => right.value.score - left.value.score)[0];
}

export function buildShortTermGoalsState(input: {
  saveGameId: string;
  team: TeamDetail | null;
}): ShortTermGoalsState {
  const emptyMessage =
    "Keine kurzfristigen Ziele offen. Pruefe die naechste Woche, sobald sich Roster, Schedule oder Needs veraendern.";

  if (!input.team || !Array.isArray(input.team.players)) {
    return {
      title: "Short-Term Goals",
      goals: [],
      emptyMessage,
    };
  }

  const goals: ShortTermGoal[] = [];
  const players = input.team.players;
  const conflicts = detectDepthChartConflicts(players);
  const emptyStarterPositions = getEmptyStarterPositions(buildDepthChartGroups(players));

  if (conflicts.length > 0) {
    goals.push({
      id: "fix-depth-conflicts",
      title: "Klaere doppelte Rollen",
      description: `${conflicts.length} Rolle(n) sind doppelt besetzt. Entscheide dich vor dem naechsten Spiel.`,
      href: teamHref(input.saveGameId, "depth-chart"),
      actionLabel: "Depth Chart oeffnen",
      tone: "critical",
    });
  } else if (emptyStarterPositions.length > 0) {
    goals.push({
      id: "set-all-starters",
      title: "Setze alle Starter",
      description: `${emptyStarterPositions
        .slice(0, 4)
        .map((group) => group.positionCode)
        .join(", ")} brauchen noch einen Starter.`,
      href: teamHref(input.saveGameId, "depth-chart"),
      actionLabel: "Starter setzen",
      tone: "critical",
    });
  }

  const topNeed = [...(input.team.teamNeeds ?? [])].sort(
    (left, right) => right.needScore - left.needScore,
  )[0];

  if (topNeed && topNeed.needScore >= 7) {
    goals.push({
      id: `improve-position-${topNeed.positionCode}`,
      title: `Verbessere Position ${topNeed.positionCode}`,
      description: `${topNeed.positionName} ist der groesste kurzfristige Need.`,
      href: freeAgencyHref(input.saveGameId),
      actionLabel: "Spieler suchen",
      tone: "important",
    });
  }

  const valueProblem = topValueProblem(players);

  if (valueProblem) {
    goals.push({
      id: `find-value-${valueProblem.player.id}`,
      title: "Finde besseren Value-Spieler",
      description: `${valueProblem.player.positionCode} ${valueProblem.player.fullName} wirkt aktuell nicht effizient fuer seine Rolle.`,
      href: teamHref(input.saveGameId, "trades"),
      actionLabel: "Value pruefen",
      tone: "important",
    });
  }

  const developmentPlayer = players
    .filter(isDevelopmentWithoutRole)
    .sort((left, right) => right.potentialRating - right.positionOverall - (left.potentialRating - left.positionOverall))[0];

  if (developmentPlayer) {
    goals.push({
      id: `define-role-${developmentPlayer.id}`,
      title: "Gib einem Talent eine Rolle",
      description: `${developmentPlayer.fullName} hat Upside, aber noch keinen klaren Plan.`,
      href: teamHref(input.saveGameId, "roster"),
      actionLabel: "Rolle klaeren",
      tone: "optional",
    });
  }

  return {
    title: "Short-Term Goals",
    goals: goals.slice(0, MAX_SHORT_TERM_GOALS),
    emptyMessage,
  };
}
