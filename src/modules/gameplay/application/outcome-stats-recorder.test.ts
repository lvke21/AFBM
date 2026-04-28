import { describe, expect, it } from "vitest";

import { resolveCompetitionRuleProfile } from "../domain/competition-rules";
import type { GameSituationSnapshot } from "../domain/game-situation";
import type { GameStats } from "../domain/game-stats";
import type {
  PlayResolutionRequest,
  PlayResolutionTrace,
  ResolvedPlayEvent,
} from "../domain/play-resolution";
import {
  recordResolvedPlayStats,
  type OutcomeStatsParticipants,
} from "./outcome-resolution-engine";

function createSituation(
  overrides: Partial<GameSituationSnapshot> = {},
): GameSituationSnapshot {
  const profile = resolveCompetitionRuleProfile("NFL_PRO");

  return {
    ruleset: "NFL_PRO",
    hashMarkProfile: profile.hashMarks,
    quarter: 1,
    down: 1,
    yardsToGo: 10,
    ballOnYardLine: 25,
    distanceBucket: "MEDIUM",
    fieldZone: "OWN_TERRITORY",
    clockBucket: "OPENING",
    scoreBucket: "TIED",
    offenseScore: 0,
    defenseScore: 0,
    secondsRemainingInQuarter: 900,
    secondsRemainingInGame: 3600,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
    tempoProfile: "NORMAL",
    possessionTeamId: "OFF",
    defenseTeamId: "DEF",
    ...overrides,
  };
}

function createRequest(
  situation: GameSituationSnapshot,
): PlayResolutionRequest {
  return {
    situation,
    selectedPlayCall: {
      offense: {
        play: {
          id: "off-dropback",
          family: "DROPBACK",
        },
      },
      defense: {
        play: {
          id: "def-match",
          family: "MATCH_COVERAGE",
        },
      },
    },
  } as unknown as PlayResolutionRequest;
}

function createGameStats(): GameStats {
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
    drives: [],
  };
}

function createTrace(path: "RUN" | "PASS"): PlayResolutionTrace {
  return {
    path,
    notes: [],
    factors: [],
    pressureProbability: 0,
    sackProbability: 0,
    completionProbability: path === "PASS" ? 1 : null,
    interceptionProbability: 0,
    stuffedProbability: path === "RUN" ? 0 : null,
    explosiveProbability: 0,
    fumbleProbability: 0,
    expectedYards: 0,
  };
}

function createEvent(
  overrides: Partial<ResolvedPlayEvent>,
): ResolvedPlayEvent {
  const path = overrides.path ?? "PASS";

  return {
    path,
    family: path === "PASS" ? "PASS_COMPLETE" : "RUN_SUCCESS",
    yards: 0,
    success: false,
    explosive: false,
    turnoverType: "NONE",
    pressureEvent: "NONE",
    completion: path === "PASS" ? false : null,
    throwaway: false,
    airYards: null,
    yardsAfterCatch: null,
    firstDown: false,
    touchdown: false,
    turnover: false,
    scoreDelta: 0,
    clockRunoffSeconds: 24,
    penaltyCode: null,
    value: null,
    trace: createTrace(path),
    summaryTokenIds: [],
    ...overrides,
  };
}

const participants: OutcomeStatsParticipants = {
  quarterback: {
    playerId: "qb-1",
    teamId: "OFF",
    snapshotFullName: "Ari Passer",
    snapshotPositionCode: "QB",
  },
  ballCarrier: {
    playerId: "rb-1",
    teamId: "OFF",
    snapshotFullName: "Rae Runner",
    snapshotPositionCode: "RB",
  },
  target: {
    playerId: "wr-1",
    teamId: "OFF",
    snapshotFullName: "Wes Target",
    snapshotPositionCode: "WR",
  },
  tackler: {
    playerId: "lb-1",
    teamId: "DEF",
    snapshotFullName: "Lee Tackler",
    snapshotPositionCode: "LB",
  },
  passRusher: {
    playerId: "de-1",
    teamId: "DEF",
    snapshotFullName: "Dee Rush",
    snapshotPositionCode: "DE",
  },
  interceptor: {
    playerId: "cb-1",
    teamId: "DEF",
    snapshotFullName: "Cam Pick",
    snapshotPositionCode: "CB",
  },
  forcedFumbleDefender: {
    playerId: "lb-1",
    teamId: "DEF",
    snapshotFullName: "Lee Tackler",
    snapshotPositionCode: "LB",
  },
  recoveryPlayer: {
    playerId: "lb-1",
    teamId: "DEF",
    snapshotFullName: "Lee Tackler",
    snapshotPositionCode: "LB",
  },
};

describe("outcome stats recorder", () => {
  it("updates play, player, team, and drive stats across multiple outcomes without double-counting", () => {
    const gameStats = createGameStats();
    const situation = createSituation();
    const request = createRequest(situation);

    const completion = recordResolvedPlayStats({
      gameStats,
      driveId: "drive-1",
      playId: "play-1",
      request,
      participants,
      event: createEvent({
        yards: 22,
        success: true,
        explosive: true,
        completion: true,
        airYards: 14,
        yardsAfterCatch: 8,
        firstDown: true,
      }),
    });

    const sack = recordResolvedPlayStats({
      gameStats,
      driveId: "drive-1",
      playId: "play-2",
      request,
      participants,
      event: createEvent({
        family: "SACK",
        yards: -7,
        pressureEvent: "SACK",
        completion: false,
      }),
    });

    const interception = recordResolvedPlayStats({
      gameStats,
      driveId: "drive-1",
      playId: "play-3",
      request,
      participants,
      event: createEvent({
        family: "INTERCEPTION",
        turnoverType: "INTERCEPTION",
        completion: false,
        turnover: true,
      }),
    });

    const fumble = recordResolvedPlayStats({
      gameStats,
      driveId: "drive-1",
      playId: "play-4",
      request,
      participants,
      event: createEvent({
        path: "RUN",
        family: "FUMBLE",
        yards: 8,
        success: true,
        completion: null,
        turnoverType: "FUMBLE",
        turnover: true,
      }),
    });

    const offense = gameStats.teamStats.find((entry) => entry.teamId === "OFF");
    const defense = gameStats.teamStats.find((entry) => entry.teamId === "DEF");
    const quarterback = gameStats.playerStats.find((entry) => entry.playerId === "qb-1");
    const receiver = gameStats.playerStats.find((entry) => entry.playerId === "wr-1");
    const runner = gameStats.playerStats.find((entry) => entry.playerId === "rb-1");
    const passRusher = gameStats.playerStats.find((entry) => entry.playerId === "de-1");
    const interceptor = gameStats.playerStats.find((entry) => entry.playerId === "cb-1");
    const linebacker = gameStats.playerStats.find((entry) => entry.playerId === "lb-1");

    expect(completion.resultTypes).toContain("EXPLOSIVE");
    expect(sack.resultTypes).toContain("NEGATIVE");
    expect(interception.resultTypes).toContain("TURNOVER");
    expect(fumble.resultTypes).toContain("TURNOVER");

    expect(offense?.totalYards).toBe(23);
    expect(offense?.passingYards).toBe(15);
    expect(offense?.grossPassingYards).toBe(22);
    expect(offense?.sackYardsLost).toBe(7);
    expect(offense?.rushingYards).toBe(8);
    expect(offense?.firstDowns).toBe(1);
    expect(offense?.explosivePlays).toBe(1);
    expect(offense?.turnovers).toBe(2);
    expect(offense?.interceptionsThrown).toBe(1);
    expect(offense?.fumblesLost).toBe(1);

    expect(defense?.sacks).toBe(1);
    expect(defense?.turnoversForced).toBe(2);

    expect(quarterback?.passing.attempts).toBe(2);
    expect(quarterback?.passing.completions).toBe(1);
    expect(quarterback?.passing.yards).toBe(22);
    expect(quarterback?.passing.interceptions).toBe(1);
    expect(quarterback?.passing.sacksTaken).toBe(1);
    expect(quarterback?.passing.sackYardsLost).toBe(7);

    expect(receiver?.receiving.targets).toBe(2);
    expect(receiver?.receiving.receptions).toBe(1);
    expect(receiver?.receiving.yards).toBe(22);
    expect(receiver?.receiving.yardsAfterCatch).toBe(8);

    expect(runner?.rushing.carries).toBe(1);
    expect(runner?.rushing.yards).toBe(8);
    expect(runner?.rushing.fumbles).toBe(1);
    expect(runner?.ballSecurity.fumblesLost).toBe(1);

    expect(passRusher?.defensive.sacks).toBe(1);
    expect(interceptor?.defensive.interceptions).toBe(1);
    expect(linebacker?.defensive.forcedFumbles).toBe(1);
    expect(linebacker?.defensive.fumbleRecoveries).toBe(1);

    expect(gameStats.drives[0]?.playCount).toBe(4);
    expect(gameStats.drives[0]?.yards).toBe(23);
    expect(gameStats.drives[0]?.firstDowns).toBe(1);
    expect(gameStats.drives[0]?.turnover?.type).toBe("FUMBLE");
  });
});
