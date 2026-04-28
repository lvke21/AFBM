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
import { createDriveStats } from "./game-stats-aggregation";
import {
  createGameStatsReport,
  exportGameStatsJson,
  renderGameStatsHtmlReport,
} from "./game-stats-reporting";

function createSituation(input: {
  possessionTeamId: TeamId;
  defenseTeamId: TeamId;
  yardLine: number;
}): GameSituationSnapshot {
  const profile = resolveCompetitionRuleProfile("NFL_PRO");

  return {
    ruleset: "NFL_PRO",
    hashMarkProfile: profile.hashMarks,
    quarter: 1,
    down: 1,
    yardsToGo: 10,
    ballOnYardLine: input.yardLine,
    distanceBucket: "MEDIUM",
    fieldZone: input.yardLine >= 80 ? "HIGH_RED_ZONE" : "OWN_TERRITORY",
    clockBucket: "OPENING",
    scoreBucket: "TIED",
    offenseScore: 0,
    defenseScore: 0,
    secondsRemainingInQuarter: 900,
    secondsRemainingInGame: 3600,
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
  if (input.playType === "FIELD_GOAL" || input.playType === "PUNT") {
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
    airYards: path === "PASS" ? Math.max(input.yards - 5, 0) : null,
    yardsAfterCatch: path === "PASS" ? Math.min(input.yards, 5) : null,
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
    gameId: "game-report",
    driveId: input.driveId,
    sequenceInGame: input.sequenceInGame,
    sequenceInDrive: input.sequenceInDrive,
    offenseTeamId: input.offenseTeamId,
    defenseTeamId: input.defenseTeamId,
    playType: input.playType,
    playCall: null,
    stateBefore: input.stateBefore,
    stateAfter: null,
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

function createExampleGameStats(): GameStats {
  const driveOneStart = snapshot({
    possessionTeamId: "OFF",
    defenseTeamId: "DEF",
    yardLine: 25,
  });
  const driveTwoStart = snapshot({
    possessionTeamId: "DEF",
    defenseTeamId: "OFF",
    yardLine: 25,
  });
  const driveThreeStart = snapshot({
    possessionTeamId: "OFF",
    defenseTeamId: "DEF",
    yardLine: 70,
  });
  const driveOne = createDriveStats({
    driveId: "drive-1",
    gameId: "game-report",
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
        yards: 35,
        stateBefore: driveOneStart,
        resultTypes: ["SUCCESS", "EXPLOSIVE"],
        firstDown: true,
        clockRunoffSeconds: 23,
        playerStats: [
          {
            playerId: "off-qb",
            teamId: "OFF",
            roles: ["PASSER"],
            passing: { attempts: 1, completions: 1, yards: 35 },
          },
          {
            playerId: "off-wr",
            teamId: "OFF",
            roles: ["RECEIVER"],
            receiving: { targets: 1, receptions: 1, yards: 35 },
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
        yards: 40,
        stateBefore: snapshot({
          possessionTeamId: "OFF",
          defenseTeamId: "DEF",
          yardLine: 60,
        }),
        resultTypes: ["SUCCESS", "EXPLOSIVE", "TOUCHDOWN"],
        firstDown: true,
        touchdown: true,
        pointsScored: 6,
        clockRunoffSeconds: 31,
        playerStats: [
          {
            playerId: "off-rb",
            teamId: "OFF",
            roles: ["RUSHER"],
            rushing: { carries: 1, yards: 40, touchdowns: 1 },
          },
        ],
      }),
    ],
  });
  const driveTwo = createDriveStats({
    driveId: "drive-2",
    gameId: "game-report",
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
        playType: "SACK",
        yards: -6,
        stateBefore: driveTwoStart,
        resultTypes: ["NEGATIVE"],
        clockRunoffSeconds: 27,
        playerStats: [
          {
            playerId: "def-qb",
            teamId: "DEF",
            roles: ["PASSER"],
            passing: { sacksTaken: 1, sackYardsLost: 6 },
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
        playId: "play-4",
        driveId: "drive-2",
        sequenceInGame: 4,
        sequenceInDrive: 2,
        offenseTeamId: "DEF",
        defenseTeamId: "OFF",
        playType: "PUNT",
        yards: 0,
        stateBefore: driveTwoStart,
        clockRunoffSeconds: 8,
      }),
    ],
  });
  const driveThree = createDriveStats({
    driveId: "drive-3",
    gameId: "game-report",
    sequence: 3,
    offenseTeamId: "OFF",
    defenseTeamId: "DEF",
    startState: driveThreeStart,
    plays: [
      play({
        playId: "play-5",
        driveId: "drive-3",
        sequenceInGame: 5,
        sequenceInDrive: 1,
        offenseTeamId: "OFF",
        defenseTeamId: "DEF",
        playType: "FIELD_GOAL",
        yards: 0,
        stateBefore: driveThreeStart,
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

  return {
    version: 1,
    source: "GAMEPLAY_ENGINE",
    gameId: "game-report",
    saveGameId: "save-1",
    seasonId: "season-1",
    week: 1,
    simulationSeed: "seed-report",
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
    playerStats: [
      {
        playerId: "off-qb",
        teamId: "OFF",
        snapshotFullName: "Ari Passer",
        snapshotPositionCode: "QB",
        started: true,
        snapsOffense: 0,
        snapsDefense: 0,
        snapsSpecialTeams: 0,
        passing: {
          attempts: 0,
          completions: 0,
          yards: 0,
          touchdowns: 0,
          interceptions: 0,
          sacksTaken: 0,
          sackYardsLost: 0,
        },
        rushing: { carries: 0, yards: 0, touchdowns: 0, fumbles: 0 },
        receiving: { targets: 0, receptions: 0, yards: 0, touchdowns: 0, yardsAfterCatch: 0 },
        defensive: { tackles: 0, sacks: 0, interceptions: 0, forcedFumbles: 0, fumbleRecoveries: 0, passesDefended: 0, defensiveTouchdowns: 0 },
        ballSecurity: { fumbles: 0, fumblesLost: 0 },
        specialTeams: { fieldGoalsMade: 0, fieldGoalsAttempted: 0, extraPointsMade: 0, extraPointsAttempted: 0, punts: 0, puntYards: 0, kickReturns: 0, kickReturnYards: 0, puntReturns: 0, puntReturnYards: 0 },
      },
    ],
    drives: [driveOne, driveTwo, driveThree],
  };
}

describe("game stats reporting", () => {
  it("builds readable JSON and HTML reports for a complete game", () => {
    const exampleGame = createExampleGameStats();
    const report = createGameStatsReport(exampleGame);
    const json = exportGameStatsJson(exampleGame);
    const parsed = JSON.parse(json) as typeof report;
    const html = renderGameStatsHtmlReport(report);

    expect(report.score.home).toBe(9);
    expect(report.teamStats[0]?.teamId).toBe("OFF");
    expect(report.teamStats[0]?.totalYards).toBe(75);
    expect(report.playerTables.passing[0]).toMatchObject({
      playerId: "off-qb",
      name: "Ari Passer",
      yards: 35,
    });
    expect(report.playerTables.rushing[0]).toMatchObject({
      playerId: "off-rb",
      yards: 40,
      touchdowns: 1,
    });
    expect(report.playerTables.defensive[0]).toMatchObject({
      playerId: "off-edge",
      sacks: 1,
    });
    expect(report.drives.map((drive) => drive.result)).toEqual([
      "TOUCHDOWN",
      "PUNT",
      "FIELD_GOAL_MADE",
    ]);
    expect(report.keyPlays[0]?.tags).toContain("TOUCHDOWN");
    expect(report.topPerformers[0]?.playerId).toBe("off-rb");
    expect(parsed.gameId).toBe("game-report");
    expect(parsed.keyPlays.length).toBeGreaterThan(0);
    expect(html).toContain("<h2>Team Stats</h2>");
    expect(html).toContain("Ari Passer");
    expect(html).toContain("Drive Summary");
    expect(html).toContain("Key Plays");
  });
});
