import { deleteApp, getApps } from "firebase-admin/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MatchKind } from "@/modules/shared/domain/enums";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getMatchDetailForUser } from "@/modules/seasons/application/match-query.service";
import type {
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationTeamContext,
} from "@/modules/seasons/application/simulation/simulation.types";

import { resetFirestoreEmulator } from "../../../scripts/seeds/firestore-reset";
import {
  ensureFirestoreEmulatorEnvironment,
  seedFirestoreEmulator,
} from "../../../scripts/seeds/firestore-seed";
import { statsRepositoryFirestore } from "./statsRepository.firestore";

const leagueId = "league-demo-2026";
const ownerId = "firebase-e2e-owner";
const seasonId = "season-demo-2026";
const matchId = "league-demo-2026_season-demo-2026_w1_m1";
const homeTeamId = "team-demo-arrows";
const awayTeamId = "team-demo-bison";
const homePlayerId = "team-demo-arrows-qb";
const awayPlayerId = "team-demo-bison-qb";

async function cleanupAdminApps() {
  await Promise.all(getApps().map((app) => deleteApp(app)));
}

describe("firestore stats and aggregates", () => {
  beforeAll(() => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-afbm");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("DATA_BACKEND", "firestore");
    ensureFirestoreEmulatorEnvironment();
  });

  beforeEach(async () => {
    await resetFirestoreEmulator();
    await seedFirestoreEmulator();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await resetFirestoreEmulator();
    await cleanupAdminApps();
  });

  it("persists match stats and recomputes season aggregates idempotently", async () => {
    const firestore = getFirebaseAdminFirestore();
    const reportsBefore = await countCollection("reports");

    await statsRepositoryFirestore.persistMatchStats({
      context: buildContext(),
      result: buildResult(),
    });
    await statsRepositoryFirestore.persistMatchStats({
      context: buildContext(),
      result: buildResult(),
    });

    const [
      homeMatchStat,
      awayMatchStat,
      homeSeasonStat,
      awaySeasonStat,
      homePlayerMatchStat,
      homePlayerSeasonStat,
      reportsAfter,
    ] = await Promise.all([
      firestore.collection("teamStats").doc(`match_${matchId}_${homeTeamId}`).get(),
      firestore.collection("teamStats").doc(`match_${matchId}_${awayTeamId}`).get(),
      firestore.collection("teamStats").doc(`season_${seasonId}_${homeTeamId}`).get(),
      firestore.collection("teamStats").doc(`season_${seasonId}_${awayTeamId}`).get(),
      firestore.collection("playerStats").doc(`match_${matchId}_${homePlayerId}`).get(),
      firestore.collection("playerStats").doc(`season_${seasonId}_${homePlayerId}_${homeTeamId}`).get(),
      countCollection("reports"),
    ]);

    expect(homeMatchStat.data()).toMatchObject({
      passingYards: 260,
      pointsFor: 27,
      scope: "MATCH",
      teamId: homeTeamId,
      totalYards: 386,
    });
    expect(awayMatchStat.data()).toMatchObject({
      pointsAgainst: 27,
      pointsFor: 20,
      scope: "MATCH",
      teamId: awayTeamId,
    });
    expect(homeSeasonStat.data()).toMatchObject({
      gamesPlayed: 1,
      pointsFor: 27,
      scope: "SEASON",
      teamId: homeTeamId,
      wins: 1,
    });
    expect(awaySeasonStat.data()).toMatchObject({
      losses: 1,
      pointsAgainst: 27,
      pointsFor: 20,
      scope: "SEASON",
      teamId: awayTeamId,
    });
    expect(homePlayerMatchStat.data()).toMatchObject({
      passing: {
        touchdowns: 2,
        yards: 240,
      },
      playerId: homePlayerId,
      scope: "MATCH",
      stats: {
        gamesPlayed: 1,
        touchdowns: 2,
        yards: 250,
      },
    });
    expect(homePlayerSeasonStat.data()).toMatchObject({
      passing: {
        touchdowns: 2,
        yards: 240,
      },
      playerId: homePlayerId,
      scope: "SEASON",
      stats: {
        gamesPlayed: 1,
        touchdowns: 2,
        yards: 250,
      },
    });
    expect(reportsAfter).toBe(reportsBefore);
  });

  it("replays a changed match result without double-counting season aggregates", async () => {
    const firestore = getFirebaseAdminFirestore();
    const replayResult = buildResult();
    replayResult.homeScore = 31;
    replayResult.homeTeam.score = 31;
    replayResult.homeTeam.totalYards = 410;
    replayResult.homeTeam.passingYards = 284;

    await statsRepositoryFirestore.persistMatchStats({
      context: buildContext(),
      result: buildResult(),
    });
    await statsRepositoryFirestore.persistMatchStats({
      context: buildContext(),
      result: replayResult,
    });

    const [homeMatchStat, homeSeasonStat] = await Promise.all([
      firestore.collection("teamStats").doc(`match_${matchId}_${homeTeamId}`).get(),
      firestore.collection("teamStats").doc(`season_${seasonId}_${homeTeamId}`).get(),
    ]);

    expect(homeMatchStat.data()).toMatchObject({
      idempotencyKey: `${leagueId}:${seasonId}:${matchId}:${homeTeamId}`,
      passingYards: 284,
      pointsFor: 31,
      simulationRunId: "firestore-stats-test",
      totalYards: 410,
    });
    expect(homeSeasonStat.data()).toMatchObject({
      gamesPlayed: 1,
      passingYards: 284,
      pointsFor: 31,
      totalYards: 410,
    });
    expect(homeSeasonStat.data()?.sourceMatchStatIds).toEqual([
      `${leagueId}:${seasonId}:${matchId}:${homeTeamId}`,
    ]);
  });

  it("serves Firestore match stats through the match detail read model", async () => {
    await statsRepositoryFirestore.persistMatchStats({
      context: buildContext(),
      result: buildResult(),
    });
    await getFirebaseAdminFirestore().collection("matches").doc(matchId).set({
      awayScore: 20,
      homeScore: 27,
      status: "COMPLETED",
    }, { merge: true });

    const detail = await getMatchDetailForUser(ownerId, leagueId, matchId);

    expect(detail?.homeTeam.stats?.totalYards).toBe(386);
    expect(detail?.awayTeam.stats?.turnovers).toBe(1);
    expect(detail?.leaders.passing?.playerId).toBe(homePlayerId);
    expect(detail?.leaders.passing?.passingYards).toBe(240);
    expect(detail?.summary).toContain("Austin Arrows");
  });

  it("blocks production Firestore access with the existing guard", async () => {
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");

    await expect(
      statsRepositoryFirestore.persistMatchStats({
        context: buildContext(),
        result: buildResult(),
      }),
    ).rejects.toThrow("Non-emulator Firestore access requires FIRESTORE_PREVIEW_DRY_RUN=true");

    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
  });
});

async function countCollection(collectionName: string) {
  const snapshot = await getFirebaseAdminFirestore().collection(collectionName).get();
  return snapshot.size;
}

function buildContext(): SimulationMatchContext {
  const homeTeam = team(homeTeamId, "Austin", "Arrows", "AUS", homePlayerId);
  const awayTeam = team(awayTeamId, "Boston", "Bison", "BOS", awayPlayerId);

  return {
    awayTeam,
    homeTeam,
    kind: MatchKind.REGULAR_SEASON,
    matchId,
    saveGameId: leagueId,
    scheduledAt: new Date("2026-09-01T18:00:00.000Z"),
    seasonId,
    seasonYear: 2026,
    simulationSeed: "firestore-stats-test",
    week: 1,
  };
}

function buildResult(): MatchSimulationResult {
  return {
    awayScore: 20,
    awayTeam: {
      explosivePlays: 2,
      firstDowns: 18,
      passingYards: 212,
      penalties: 5,
      redZoneTouchdowns: 2,
      redZoneTrips: 3,
      rushingYards: 88,
      sacks: 2,
      score: 20,
      teamId: awayTeamId,
      timeOfPossessionSeconds: 1740,
      totalYards: 300,
      touchdowns: 2,
      turnovers: 1,
    },
    drives: [],
    homeScore: 27,
    homeTeam: {
      explosivePlays: 4,
      firstDowns: 23,
      passingYards: 260,
      penalties: 3,
      redZoneTouchdowns: 3,
      redZoneTrips: 4,
      rushingYards: 126,
      sacks: 3,
      score: 27,
      teamId: homeTeamId,
      timeOfPossessionSeconds: 1860,
      totalYards: 386,
      touchdowns: 3,
      turnovers: 0,
    },
    matchId,
    playerLines: [
      playerLine(homePlayerId, homeTeamId, {
        passingYards: 240,
        passingTouchdowns: 2,
        rushingYards: 10,
      }),
      playerLine(awayPlayerId, awayTeamId, {
        passingYards: 210,
        passingTouchdowns: 1,
        rushingYards: 4,
      }),
    ],
    simulationSeed: "firestore-stats-test",
    totalDrivesPlanned: 0,
  };
}

function playerLine(
  playerId: string,
  teamId: string,
  input: {
    passingTouchdowns: number;
    passingYards: number;
    rushingYards: number;
  },
): PlayerSimulationLine {
  return {
    blocking: {
      pancakes: 0,
      passBlockSnaps: 0,
      pressuresAllowed: 0,
      runBlockSnaps: 0,
      sacksAllowed: 0,
    },
    defensive: {
      assistedTackles: 0,
      coverageSnaps: 0,
      defensiveTouchdowns: 0,
      forcedFumbles: 0,
      fumbleRecoveries: 0,
      interceptions: 0,
      passesDefended: 0,
      quarterbackHits: 0,
      receptionsAllowed: 0,
      sacks: 0,
      tackles: teamId === awayTeamId ? 3 : 1,
      tacklesForLoss: 0,
      targetsAllowed: 0,
      yardsAllowed: 0,
    },
    kicking: {
      extraPointsAttempted: 0,
      extraPointsMade: 0,
      fieldGoalsAttempted: 0,
      fieldGoalsAttemptedLong: 0,
      fieldGoalsAttemptedMid: 0,
      fieldGoalsAttemptedShort: 0,
      fieldGoalsMade: 0,
      fieldGoalsMadeLong: 0,
      fieldGoalsMadeMid: 0,
      fieldGoalsMadeShort: 0,
      kickoffTouchbacks: 0,
      longestFieldGoal: 0,
    },
    passing: {
      attempts: 28,
      completions: 19,
      interceptions: teamId === awayTeamId ? 1 : 0,
      longestCompletion: 42,
      sackYardsLost: 0,
      sacksTaken: 0,
      touchdowns: input.passingTouchdowns,
      yards: input.passingYards,
    },
    playerId,
    punting: {
      fairCatchesForced: 0,
      hangTimeTotalTenths: 0,
      longestPunt: 0,
      netPuntYards: 0,
      puntYards: 0,
      punts: 0,
      puntsInside20: 0,
      touchbacks: 0,
    },
    receiving: {
      drops: 0,
      longestReception: 0,
      receptions: 0,
      targets: 0,
      touchdowns: 0,
      yards: 0,
      yardsAfterCatch: 0,
    },
    returns: {
      kickReturnFumbles: 0,
      kickReturnTouchdowns: 0,
      kickReturnYards: 0,
      kickReturns: 0,
      puntReturnFumbles: 0,
      puntReturnTouchdowns: 0,
      puntReturnYards: 0,
      puntReturns: 0,
    },
    rushing: {
      attempts: 2,
      brokenTackles: 0,
      fumbles: 0,
      longestRush: input.rushingYards,
      touchdowns: 0,
      yards: input.rushingYards,
    },
    snapsDefense: 0,
    snapsOffense: 62,
    snapsSpecialTeams: 0,
    started: true,
    teamId,
  };
}

function team(
  id: string,
  city: string,
  nickname: string,
  abbreviation: string,
  playerId: string,
): SimulationTeamContext {
  return {
    abbreviation,
    city,
    id,
    nickname,
    overallRating: 80,
    roster: [player(id, playerId)],
  };
}

function player(teamId: string, playerId: string): SimulationPlayerContext {
  return {
    age: 25,
    attributes: {},
    captainFlag: false,
    careerStat: null,
    depthChartSlot: 1,
    developmentFocus: false,
    developmentTrait: "NORMAL",
    defensiveOverall: null,
    fatigue: 0,
    firstName: "QB",
    gameDayAvailability: "ACTIVE",
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    id: playerId,
    injuryEndsOn: null,
    injuryName: null,
    injuryRisk: 0,
    injuryStatus: "HEALTHY",
    lastName: teamId === homeTeamId ? "Arrows 1" : "Bison 1",
    mentalOverall: null,
    morale: 80,
    offensiveOverall: 80,
    physicalOverall: 80,
    positionCode: "QB",
    positionOverall: 80,
    potentialRating: 85,
    rosterStatus: "STARTER",
    seasonStat: null,
    secondaryPositionCode: null,
    specialTeamsOverall: null,
    status: "ACTIVE",
    teamId,
  };
}
