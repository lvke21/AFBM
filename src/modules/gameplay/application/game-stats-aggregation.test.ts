import { describe, expect, it } from "vitest";

import { resolveCompetitionRuleProfile } from "../domain/competition-rules";
import type { GameSituationSnapshot } from "../domain/game-situation";
import {
  createGameStateStatsSnapshot,
  type GameStats,
  type GameStateStatsSnapshot,
  type PlayerPlayStats,
  type PlayResolutionStatsReference,
  type PlayStats,
  type PlayStatsResultType,
  type PlayStatsType,
  type TeamId,
} from "../domain/game-stats";
import {
  aggregateGameStats,
  createDriveStats,
  finalizeDriveStats,
  inferDriveResultFromPlay,
} from "./game-stats-aggregation";

function createSituation(input: {
  possessionTeamId: TeamId;
  defenseTeamId: TeamId;
  yardLine: number;
  down?: 1 | 2 | 3 | 4;
  yardsToGo?: number;
  secondsRemainingInGame?: number;
}): GameSituationSnapshot {
  const profile = resolveCompetitionRuleProfile("NFL_PRO");

  return {
    ruleset: "NFL_PRO",
    hashMarkProfile: profile.hashMarks,
    quarter: 1,
    down: input.down ?? 1,
    yardsToGo: input.yardsToGo ?? 10,
    ballOnYardLine: input.yardLine,
    distanceBucket: "MEDIUM",
    fieldZone: input.yardLine >= 80 ? "HIGH_RED_ZONE" : "OWN_TERRITORY",
    clockBucket: "OPENING",
    scoreBucket: "TIED",
    offenseScore: 0,
    defenseScore: 0,
    secondsRemainingInQuarter: 900,
    secondsRemainingInGame: input.secondsRemainingInGame ?? 3600,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
    tempoProfile: "NORMAL",
    possessionTeamId: input.possessionTeamId,
    defenseTeamId: input.defenseTeamId,
  };
}

function snapshot(input: {
  possessionTeamId: TeamId;
  defenseTeamId: TeamId;
  yardLine: number;
}): GameStateStatsSnapshot {
  return createGameStateStatsSnapshot({
    situation: createSituation(input),
    homeTeamId: "OFF",
    awayTeamId: "DEF",
  });
}

function resolution(input: {
  playType: PlayStatsType;
  yards: number;
  pointsScored?: number;
  completion?: boolean | null;
}): PlayResolutionStatsReference | null {
  if (input.playType === "PUNT" || input.playType === "FIELD_GOAL") {
    return null;
  }

  const path = input.playType === "RUN" ? "RUN" : "PASS";

  return {
    path,
    family:
      input.playType === "SACK"
        ? "SACK"
        : path === "RUN"
          ? "RUN_SUCCESS"
          : "PASS_COMPLETE",
    yards: input.yards,
    success: input.yards >= 10,
    explosive: input.yards >= 20,
    turnoverType: "NONE",
    pressureEvent: input.playType === "SACK" ? "SACK" : "NONE",
    completion:
      input.completion ??
      (input.playType === "PASS" ? input.yards > 0 : null),
    throwaway: false,
    airYards: path === "PASS" ? Math.max(0, input.yards - 5) : null,
    yardsAfterCatch: path === "PASS" ? Math.min(5, Math.max(0, input.yards)) : null,
    firstDown: input.yards >= 10,
    touchdown: (input.pointsScored ?? 0) >= 6,
    scoreDelta: input.pointsScored ?? 0,
    clockRunoffSeconds: 0,
    penaltyCode: null,
  };
}

function play(input: {
  playId: string;
  driveId: string;
  sequenceInGame: number;
  sequenceInDrive: number;
  offenseTeamId: TeamId;
  defenseTeamId: TeamId;
  playType: PlayStatsType;
  yards: number;
  stateBefore: GameStateStatsSnapshot;
  stateAfter?: GameStateStatsSnapshot | null;
  resultTypes?: PlayStatsResultType[];
  firstDown?: boolean;
  touchdown?: boolean;
  pointsScored?: number;
  clockRunoffSeconds?: number;
  playerStats?: PlayerPlayStats[];
  completion?: boolean | null;
}): PlayStats {
  return {
    playId: input.playId,
    gameId: "game-1",
    driveId: input.driveId,
    sequenceInGame: input.sequenceInGame,
    sequenceInDrive: input.sequenceInDrive,
    offenseTeamId: input.offenseTeamId,
    defenseTeamId: input.defenseTeamId,
    playType: input.playType,
    playCall: null,
    stateBefore: input.stateBefore,
    stateAfter: input.stateAfter ?? null,
    yardsGained: input.yards,
    resultTypes: input.resultTypes ?? ["NEUTRAL"],
    firstDown: input.firstDown ?? false,
    touchdown: input.touchdown ?? false,
    pointsScored: input.pointsScored ?? 0,
    turnover: null,
    penalty: null,
    clockRunoffSeconds: input.clockRunoffSeconds ?? 0,
    resolution: resolution({
      playType: input.playType,
      yards: input.yards,
      pointsScored: input.pointsScored,
      completion: input.completion,
    }),
    playerStats: input.playerStats ?? [],
  };
}

function createGameStats(drives = [] as GameStats["drives"]): GameStats {
  return {
    version: 1,
    source: "GAMEPLAY_ENGINE",
    gameId: "game-1",
    saveGameId: "save-1",
    seasonId: "season-1",
    week: 1,
    simulationSeed: "seed-1",
    homeTeamId: "OFF",
    awayTeamId: "DEF",
    finalScore: {
      byTeamId: {
        OFF: 0,
        DEF: 0,
      },
      homeTeamId: "OFF",
      awayTeamId: "DEF",
      home: 0,
      away: 0,
    },
    teamStats: [],
    playerStats: [],
    drives,
  };
}

describe("game stats aggregation", () => {
  it("finalizes drive results and aggregates a complete game from drive plays", () => {
    const driveOneStart = snapshot({
      possessionTeamId: "OFF",
      defenseTeamId: "DEF",
      yardLine: 25,
    });
    const driveOne = createDriveStats({
      driveId: "drive-1",
      gameId: "game-1",
      sequence: 1,
      offenseTeamId: "OFF",
      defenseTeamId: "DEF",
      startState: driveOneStart,
      plays: [
        play({
          playId: "play-1",
          driveId: "drive-1",
          sequenceInGame: 1,
          sequenceInDrive: 1,
          offenseTeamId: "OFF",
          defenseTeamId: "DEF",
          playType: "PASS",
          yards: 30,
          stateBefore: driveOneStart,
          stateAfter: snapshot({
            possessionTeamId: "OFF",
            defenseTeamId: "DEF",
            yardLine: 55,
          }),
          resultTypes: ["SUCCESS", "EXPLOSIVE"],
          firstDown: true,
          clockRunoffSeconds: 24,
          playerStats: [
            {
              playerId: "off-qb",
              teamId: "OFF",
              roles: ["PASSER"],
              passing: { attempts: 1, completions: 1, yards: 30 },
            },
            {
              playerId: "off-wr",
              teamId: "OFF",
              roles: ["RECEIVER"],
              receiving: { targets: 1, receptions: 1, yards: 30 },
            },
          ],
        }),
        play({
          playId: "play-2",
          driveId: "drive-1",
          sequenceInGame: 2,
          sequenceInDrive: 2,
          offenseTeamId: "OFF",
          defenseTeamId: "DEF",
          playType: "RUN",
          yards: 45,
          stateBefore: snapshot({
            possessionTeamId: "OFF",
            defenseTeamId: "DEF",
            yardLine: 55,
          }),
          stateAfter: snapshot({
            possessionTeamId: "DEF",
            defenseTeamId: "OFF",
            yardLine: 25,
          }),
          resultTypes: ["SUCCESS", "EXPLOSIVE", "TOUCHDOWN"],
          firstDown: true,
          touchdown: true,
          pointsScored: 6,
          clockRunoffSeconds: 32,
          playerStats: [
            {
              playerId: "off-rb",
              teamId: "OFF",
              roles: ["RUSHER"],
              rushing: { carries: 1, yards: 45, touchdowns: 1 },
            },
          ],
        }),
      ],
    });

    const driveTwoStart = snapshot({
      possessionTeamId: "DEF",
      defenseTeamId: "OFF",
      yardLine: 25,
    });
    const driveTwo = createDriveStats({
      driveId: "drive-2",
      gameId: "game-1",
      sequence: 2,
      offenseTeamId: "DEF",
      defenseTeamId: "OFF",
      startState: driveTwoStart,
      plays: [
        play({
          playId: "play-3",
          driveId: "drive-2",
          sequenceInGame: 3,
          sequenceInDrive: 1,
          offenseTeamId: "DEF",
          defenseTeamId: "OFF",
          playType: "PASS",
          yards: 0,
          completion: false,
          stateBefore: driveTwoStart,
          resultTypes: ["NEUTRAL"],
          clockRunoffSeconds: 16,
          playerStats: [
            {
              playerId: "def-qb",
              teamId: "DEF",
              roles: ["PASSER"],
              passing: { attempts: 1 },
            },
          ],
        }),
        play({
          playId: "play-4",
          driveId: "drive-2",
          sequenceInGame: 4,
          sequenceInDrive: 2,
          offenseTeamId: "DEF",
          defenseTeamId: "OFF",
          playType: "SACK",
          yards: -8,
          stateBefore: driveTwoStart,
          resultTypes: ["NEGATIVE"],
          clockRunoffSeconds: 28,
          playerStats: [
            {
              playerId: "def-qb",
              teamId: "DEF",
              roles: ["PASSER"],
              passing: { sacksTaken: 1, sackYardsLost: 8 },
            },
            {
              playerId: "off-edge",
              teamId: "OFF",
              roles: ["PASS_RUSHER"],
              defensive: { sacks: 1, tackles: 1 },
            },
          ],
        }),
        play({
          playId: "play-5",
          driveId: "drive-2",
          sequenceInGame: 5,
          sequenceInDrive: 3,
          offenseTeamId: "DEF",
          defenseTeamId: "OFF",
          playType: "PUNT",
          yards: 0,
          stateBefore: driveTwoStart,
          resultTypes: ["NEUTRAL"],
          clockRunoffSeconds: 8,
        }),
      ],
    });

    const driveThreeStart = snapshot({
      possessionTeamId: "OFF",
      defenseTeamId: "DEF",
      yardLine: 70,
    });
    const driveThree = createDriveStats({
      driveId: "drive-3",
      gameId: "game-1",
      sequence: 3,
      offenseTeamId: "OFF",
      defenseTeamId: "DEF",
      startState: driveThreeStart,
      plays: [
        play({
          playId: "play-6",
          driveId: "drive-3",
          sequenceInGame: 6,
          sequenceInDrive: 1,
          offenseTeamId: "OFF",
          defenseTeamId: "DEF",
          playType: "PASS",
          yards: 12,
          stateBefore: driveThreeStart,
          stateAfter: snapshot({
            possessionTeamId: "OFF",
            defenseTeamId: "DEF",
            yardLine: 82,
          }),
          resultTypes: ["SUCCESS"],
          firstDown: true,
          clockRunoffSeconds: 20,
          playerStats: [
            {
              playerId: "off-qb",
              teamId: "OFF",
              roles: ["PASSER"],
              passing: { attempts: 1, completions: 1, yards: 12 },
            },
          ],
        }),
        play({
          playId: "play-7",
          driveId: "drive-3",
          sequenceInGame: 7,
          sequenceInDrive: 2,
          offenseTeamId: "OFF",
          defenseTeamId: "DEF",
          playType: "FIELD_GOAL",
          yards: 0,
          stateBefore: snapshot({
            possessionTeamId: "OFF",
            defenseTeamId: "DEF",
            yardLine: 82,
          }),
          resultTypes: ["SUCCESS"],
          pointsScored: 3,
          clockRunoffSeconds: 5,
          playerStats: [
            {
              playerId: "off-k",
              teamId: "OFF",
              roles: ["KICKER"],
              specialTeams: { fieldGoalsAttempted: 1, fieldGoalsMade: 1 },
            },
          ],
        }),
      ],
    });

    expect(driveOne.startState.fieldPosition.yardLine).toBe(25);
    expect(driveOne.playCount).toBe(2);
    expect(driveOne.yards).toBe(75);
    expect(driveOne.result).toBe("TOUCHDOWN");
    expect(driveTwo.result).toBe("PUNT");
    expect(driveTwo.yards).toBe(-8);
    expect(inferDriveResultFromPlay(driveThree.plays[1])).toBe("FIELD_GOAL_MADE");
    expect(finalizeDriveStats(driveThree).result).toBe("FIELD_GOAL_MADE");

    const aggregated = aggregateGameStats(
      createGameStats([driveOne, driveTwo, driveThree]),
    );
    const offense = aggregated.teamStats.find((entry) => entry.teamId === "OFF");
    const defense = aggregated.teamStats.find((entry) => entry.teamId === "DEF");
    const offQuarterback = aggregated.playerStats.find(
      (entry) => entry.playerId === "off-qb",
    );
    const offRunner = aggregated.playerStats.find(
      (entry) => entry.playerId === "off-rb",
    );
    const offEdge = aggregated.playerStats.find(
      (entry) => entry.playerId === "off-edge",
    );
    const kicker = aggregated.playerStats.find((entry) => entry.playerId === "off-k");

    expect(aggregated.finalScore.home).toBe(9);
    expect(aggregated.finalScore.away).toBe(0);
    expect(offense?.points).toBe(9);
    expect(offense?.totalYards).toBe(87);
    expect(offense?.passingYards).toBe(42);
    expect(offense?.grossPassingYards).toBe(42);
    expect(offense?.rushingYards).toBe(45);
    expect(offense?.firstDowns).toBe(3);
    expect(offense?.timeOfPossessionSeconds).toBe(81);
    expect(offense?.sacks).toBe(1);
    expect(offense?.redZoneTrips).toBe(1);
    expect(offense?.redZoneTouchdowns).toBe(0);

    expect(defense?.totalYards).toBe(-8);
    expect(defense?.passingYards).toBe(-8);
    expect(defense?.sacksAllowed).toBe(1);
    expect(defense?.timeOfPossessionSeconds).toBe(52);

    expect(offQuarterback?.passing.attempts).toBe(2);
    expect(offQuarterback?.passing.completions).toBe(2);
    expect(offQuarterback?.passing.yards).toBe(42);
    expect(offRunner?.rushing.yards).toBe(45);
    expect(offRunner?.rushing.touchdowns).toBe(1);
    expect(offEdge?.defensive.sacks).toBe(1);
    expect(kicker?.specialTeams.fieldGoalsMade).toBe(1);
  });
});
