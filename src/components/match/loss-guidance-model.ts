import {
  buildDepthChartGroups,
  getEmptyStarterPositions,
} from "@/components/team/depth-chart-model";
import type { TeamDetail, TeamNeedSummary } from "@/modules/teams/domain/team.types";

import { buildWhyGameOutcomeState, type MatchReport } from "./match-report-model";

export type LossGuidanceItem = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  source: "depth-chart" | "team-need" | "match-insight";
};

export type LossGuidanceState = {
  title: string;
  summary: string;
  items: LossGuidanceItem[];
  emptyMessage: string;
};

type BuildLossGuidanceParams = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status" | "drives">;
  managerTeam: Pick<TeamDetail, "players" | "teamNeeds"> | null;
  saveGameId: string;
};

const SECONDARY_POSITIONS = new Set(["CB", "FS", "SS"]);
const OFFENSE_POSITIONS = new Set(["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
const FRONT_SEVEN_POSITIONS = new Set(["LE", "RE", "DT", "LOLB", "MLB", "ROLB"]);

function getManagerResult(match: BuildLossGuidanceParams["match"]) {
  const manager = match.homeTeam.managerControlled ? match.homeTeam : match.awayTeam.managerControlled ? match.awayTeam : null;
  const opponent = manager === match.homeTeam ? match.awayTeam : match.homeTeam;

  if (!manager || manager.score == null || opponent.score == null) {
    return null;
  }

  return {
    lost: manager.score < opponent.score,
    manager,
  };
}

function buildTeamNeedTitle(need: TeamNeedSummary) {
  if (SECONDARY_POSITIONS.has(need.positionCode)) {
    return "Secondary verstaerken";
  }

  if (OFFENSE_POSITIONS.has(need.positionCode)) {
    return `${need.positionName} verstaerken`;
  }

  if (FRONT_SEVEN_POSITIONS.has(need.positionCode)) {
    return "Front Seven verstaerken";
  }

  return `${need.positionName} verstaerken`;
}

function getPrimaryTeamNeed(teamNeeds: TeamNeedSummary[]) {
  return [...teamNeeds]
    .filter((need) => need.needScore > 0)
    .sort((left, right) => {
      const scoreDiff = right.needScore - left.needScore;

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.positionCode.localeCompare(right.positionCode);
    })[0] ?? null;
}

function getInsightGuidance(
  match: BuildLossGuidanceParams["match"],
  saveGameId: string,
): LossGuidanceItem | null {
  const insight = buildWhyGameOutcomeState(match).insights[0];

  if (!insight) {
    return {
      title: "Naechstes Setup pruefen",
      description: "Nach dieser Niederlage lohnt sich ein kurzer Blick auf Aufstellung und Matchup.",
      actionLabel: "Setup oeffnen",
      href: `/app/savegames/${saveGameId}/game/setup`,
      source: "match-insight",
    };
  }

  if (insight.label === "Ballverluste zu teuer") {
    return {
      title: "Ball sichern",
      description: "Weniger Turnovers geben deinem Team mehr stabile Drives und halten Spiele offen.",
      actionLabel: "Setup oeffnen",
      href: `/app/savegames/${saveGameId}/game/setup`,
      source: "match-insight",
    };
  }

  if (insight.label === "Offense ineffizient") {
    return {
      title: "Offense effizienter machen",
      description: "Pruefe Starter und Rollen, damit gute Feldpositionen besser in Punkte muenden.",
      actionLabel: "Depth Chart pruefen",
      href: `/app/savegames/${saveGameId}/team/depth-chart`,
      source: "match-insight",
    };
  }

  if (insight.label === "Matchup verloren") {
    return {
      title: "Direktes Matchup verbessern",
      description: "Ein staerkerer Starter oder besserer Fit kann den naechsten engen Vergleich kippen.",
      actionLabel: "Roster pruefen",
      href: `/app/savegames/${saveGameId}/team/roster`,
      source: "match-insight",
    };
  }

  return {
    title: insight.label,
    description: insight.explanation,
    actionLabel: "Team pruefen",
    href: `/app/savegames/${saveGameId}/team`,
    source: "match-insight",
  };
}

export function buildLossGuidanceState({
  match,
  managerTeam,
  saveGameId,
}: BuildLossGuidanceParams): LossGuidanceState {
  const result = getManagerResult(match);
  const isCompleted = match.status === "COMPLETED";

  if (!isCompleted || !result?.lost) {
    return {
      title: "Naechste Verbesserung",
      summary: "Guidance erscheint nach verlorenen Spielen.",
      items: [],
      emptyMessage: "Keine Niederlagen-Guidance noetig.",
    };
  }

  const items: LossGuidanceItem[] = [];

  if (managerTeam?.players.length) {
    const missingStarter = getEmptyStarterPositions(buildDepthChartGroups(managerTeam.players))[0];

    if (missingStarter) {
      items.push({
        title: `Starter fehlt auf Position ${missingStarter.positionCode}`,
        description: `Setze einen Slot-1-Spieler fuer ${missingStarter.positionName}, damit die Lineup-Basis stabiler wird.`,
        actionLabel: "Starter setzen",
        href: `/app/savegames/${saveGameId}/team/depth-chart`,
        source: "depth-chart",
      });
    }
  }

  const primaryNeed = managerTeam ? getPrimaryTeamNeed(managerTeam.teamNeeds) : null;

  if (primaryNeed && items.length < 2) {
    items.push({
      title: buildTeamNeedTitle(primaryNeed),
      description: `${primaryNeed.positionName} ist aktuell der klarste Team Need und der beste Hebel fuer die naechsten Wochen.`,
      actionLabel: "Spieler suchen",
      href: `/app/savegames/${saveGameId}/finance/free-agency`,
      source: "team-need",
    });
  }

  const insightGuidance = getInsightGuidance(match, saveGameId);

  if (insightGuidance && items.length === 0) {
    items.push(insightGuidance);
  }

  return {
    title: "Nach der Niederlage",
    summary: "Kein Vorwurf: Das sind die naechsten konkreten Hebel fuer dein Team.",
    items: items.slice(0, 2),
    emptyMessage: "Keine konkrete Verbesserung ableitbar.",
  };
}
