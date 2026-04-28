import { POSITION_STARTER_SLOTS } from "@/modules/players/domain/player-evaluation";
import type { TeamNeedSummary } from "@/modules/teams/domain/team.types";

import { isGameDayEligibleRosterStatus } from "../../shared/domain/roster-status";
import { clamp } from "./team-management.shared";

export function buildTeamNeeds(
  players: Array<{
    positionCode: string;
    positionName: string;
    positionOverall: number;
    rosterStatus: string;
    schemeFitScore?: number | null;
  }>,
): TeamNeedSummary[] {
  const grouped = new Map<
    string,
    {
      positionName: string;
      overalls: number[];
      schemeFits: number[];
      playerCount: number;
    }
  >();

  for (const player of players) {
    if (!isGameDayEligibleRosterStatus(player.rosterStatus)) {
      continue;
    }

    const current = grouped.get(player.positionCode) ?? {
      positionName: player.positionName,
      overalls: [],
      schemeFits: [],
      playerCount: 0,
    };
    current.playerCount += 1;
    current.overalls.push(player.positionOverall);
    if (player.schemeFitScore != null) {
      current.schemeFits.push(player.schemeFitScore);
      current.schemeFits.sort((left, right) => right - left);
    }
    current.overalls.sort((left, right) => right - left);
    grouped.set(player.positionCode, current);
  }

  return Object.entries(POSITION_STARTER_SLOTS)
    .map(([positionCode, starterCount]) => {
      const current = grouped.get(positionCode) ?? {
        positionName: positionCode,
        overalls: [],
        schemeFits: [],
        playerCount: 0,
      };
      const starterOveralls = current.overalls.slice(0, starterCount);
      const starterSchemeFits = current.schemeFits.slice(0, starterCount);
      const starterAverage =
        starterOveralls.length > 0
          ? starterOveralls.reduce((sum, value) => sum + value, 0) / starterOveralls.length
          : 50;
      const starterSchemeFit =
        starterSchemeFits.length > 0
          ? starterSchemeFits.reduce((sum, value) => sum + value, 0) / starterSchemeFits.length
          : null;
      const targetCount = starterCount + (starterCount > 1 ? 1 : 0);
      const depthGap = Math.max(0, targetCount - current.playerCount);
      const schemeGap = starterSchemeFit == null ? 0 : Math.max(0, 78 - starterSchemeFit);
      const needScore = clamp(
        Math.round(Math.max(0, 78 - starterAverage) + depthGap * 14 + schemeGap * 0.45),
        0,
        99,
      );

      return {
        positionCode,
        positionName: current.positionName,
        starterAverage: Math.round(starterAverage),
        starterSchemeFit: starterSchemeFit == null ? null : Math.round(starterSchemeFit),
        playerCount: current.playerCount,
        targetCount,
        needScore,
      };
    })
    .sort((left, right) => right.needScore - left.needScore)
    .slice(0, 5);
}
