import { deleteApp, getApps } from "firebase-admin/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { MatchKind, MatchStatus, WeekState } from "@/modules/shared/domain/enums";
import {
  advanceWeekForUser,
  finishGameForUser,
  prepareWeekForUser,
  startGameForUser,
} from "@/modules/savegames/application/week-flow.service";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationTeamContext,
} from "@/modules/seasons/application/simulation/simulation.types";
import { getMatchDetailForUser } from "@/modules/seasons/application/match-query.service";
import { getSeasonOverviewForUser } from "@/modules/seasons/application/season-query.service";

import { resetFirestoreEmulator } from "../../../scripts/seeds/firestore-reset";
import {
  ensureFirestoreEmulatorEnvironment,
  seedFirestoreEmulator,
} from "../../../scripts/seeds/firestore-seed";
import { gameOutputRepositoryFirestore } from "./gameOutputRepository.firestore";
import { readModelRepositoryFirestore } from "./readModelRepository.firestore";
import { statsRepositoryFirestore } from "./statsRepository.firestore";

const leagueId = "league-demo-2026";
const ownerId = "firebase-e2e-owner";
const seasonId = "season-demo-2026";
const weekId = "league-demo-2026_season-demo-2026_w1";
const matchId = "league-demo-2026_season-demo-2026_w1_m1";
const nextWeekId = "league-demo-2026_season-demo-2026_w2";
const homeTeamId = "team-demo-arrows";
const awayTeamId = "team-demo-bison";
const homePlayerId = "team-demo-arrows-qb";
const awayPlayerId = "team-demo-bison-qb";

async function cleanupAdminApps() {
  await Promise.all(getApps().map((app) => deleteApp(app)));
}

describe("firestore backend parity baseline", () => {
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

  it("validates the Firestore seed counts used for parity", async () => {
    await expect(countCollection("leagues")).resolves.toBe(1);
    await expect(countCollection("teams")).resolves.toBe(8);
    await expect(countCollection("players")).resolves.toBe(64);
    await expect(countCollection("seasons")).resolves.toBe(1);
    await expect(countCollection("weeks")).resolves.toBe(7);
    await expect(countCollection("matches")).resolves.toBe(28);
    await expect(countCollection("teamStats")).resolves.toBe(8);
    await expect(countCollection("playerStats")).resolves.toBe(64);
    await expect(countCollection("reports")).resolves.toBe(1);
  });

  it("validates team, player, season, match, stats, and report read models", async () => {
    await persistGameOutputAndStats();

    const [team, player, season, match, stats, reports] = await Promise.all([
      readModelRepositoryFirestore.getTeamOverview(ownerId, leagueId, homeTeamId),
      readModelRepositoryFirestore.getPlayerOverview(ownerId, leagueId, homePlayerId),
      getSeasonOverviewForUser(ownerId, leagueId, seasonId),
      getMatchDetailForUser(ownerId, leagueId, matchId),
      readModelRepositoryFirestore.getStatsViews(ownerId, leagueId, seasonId),
      readModelRepositoryFirestore.listReports(ownerId, leagueId),
    ]);

    expect(team).toMatchObject({
      abbreviation: "AUS",
      playerCount: 8,
      pointsFor: 27,
      seasonRecord: "1-0",
    });
    expect(player).toMatchObject({
      gamesPlayed: 1,
      id: homePlayerId,
      positionCode: "QB",
      yards: 250,
    });
    expect(season?.matches).toHaveLength(28);
    expect(season?.standings[0]).toMatchObject({
      pointsFor: 27,
      record: "1-0",
      teamId: homeTeamId,
    });
    expect(match).toMatchObject({
      awayTeam: {
        score: 20,
      },
      homeTeam: {
        score: 27,
      },
      status: MatchStatus.COMPLETED,
    });
    expect(match?.drives).toHaveLength(1);
    expect(match?.leaders.passing?.playerId).toBe(homePlayerId);
    expect(stats?.topPlayers[0]?.playerId).toBe(homePlayerId);
    expect(reports?.[0]?.title).toBe("Firebase seed readiness");
  });

  it("validates Firestore week loop parity transitions", async () => {
    await setCurrentWeekState(WeekState.PRE_WEEK);

    const prepared = await prepareWeekForUser({ saveGameId: leagueId, userId: ownerId });
    expect(prepared.weekState).toBe(WeekState.READY);

    await completeOtherCurrentWeekMatches(matchId);
    const started = await startGameForUser({ matchId, saveGameId: leagueId, userId: ownerId });
    expect(started.weekState).toBe(WeekState.GAME_RUNNING);

    const finished = await finishGameForUser({
      matchId,
      saveGameId: leagueId,
      userId: ownerId,
    });
    expect(finished.weekState).toBe(WeekState.POST_GAME);

    await completeCurrentWeekMatches();
    const advanced = await advanceWeekForUser({ saveGameId: leagueId, userId: ownerId });
    const [league, nextWeek] = await Promise.all([
      getFirebaseAdminFirestore().collection("leagues").doc(leagueId).get(),
      getFirebaseAdminFirestore().collection("weeks").doc(nextWeekId).get(),
    ]);

    expect(advanced.weekState).toBe(WeekState.PRE_WEEK);
    expect(advanced.week).toBe(2);
    expect(league.data()?.currentWeekId).toBe(nextWeekId);
    expect(nextWeek.data()?.state).toBe(WeekState.PRE_WEEK);
  });
});

async function countCollection(collectionName: string) {
  const snapshot = await getFirebaseAdminFirestore().collection(collectionName).get();
  return snapshot.size;
}

async function persistGameOutputAndStats() {
  await gameOutputRepositoryFirestore.persistMatchOutput({
    context: buildContext(),
    result: buildResult(),
  });
  await statsRepositoryFirestore.persistMatchStats({
    context: buildContext(),
    result: buildResult(),
  });
}

async function setCurrentWeekState(state: WeekState) {
  const firestore = getFirebaseAdminFirestore();
  await Promise.all([
    firestore.collection("leagues").doc(leagueId).set({ weekState: state }, { merge: true }),
    firestore.collection("weeks").doc(weekId).set({ state }, { merge: true }),
  ]);
}

async function completeCurrentWeekMatches() {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore.collection("matches").where("weekId", "==", weekId).get();
  const batch = firestore.batch();

  for (const document of snapshot.docs) {
    batch.set(document.ref, {
      awayScore: 17,
      homeScore: 24,
      status: MatchStatus.COMPLETED,
      updatedAt: new Date(),
    }, { merge: true });
  }

  await batch.commit();
}

async function completeOtherCurrentWeekMatches(openMatchId: string) {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore.collection("matches").where("weekId", "==", weekId).get();
  const batch = firestore.batch();

  for (const document of snapshot.docs) {
    if (document.id === openMatchId) {
      continue;
    }

    batch.set(document.ref, {
      awayScore: 17,
      homeScore: 24,
      status: MatchStatus.COMPLETED,
      updatedAt: new Date(),
    }, { merge: true });
  }

  await batch.commit();
}

function buildContext(): SimulationMatchContext {
  return {
    awayTeam: team(awayTeamId, "Boston", "Bison", "BOS", awayPlayerId),
    homeTeam: team(homeTeamId, "Austin", "Arrows", "AUS", homePlayerId),
    kind: MatchKind.REGULAR_SEASON,
    matchId,
    saveGameId: leagueId,
    scheduledAt: new Date("2026-09-01T18:00:00.000Z"),
    seasonId,
    seasonYear: 2026,
    simulationSeed: "firestore-parity-test",
    week: 1,
  };
}

function buildResult(): MatchSimulationResult {
  return {
    awayScore: 20,
    awayTeam: teamResult(awayTeamId, 20, 300, 212, 88, 1),
    drives: [drive()],
    homeScore: 27,
    homeTeam: teamResult(homeTeamId, 27, 386, 260, 126, 0),
    matchId,
    playerLines: [
      playerLine(homePlayerId, homeTeamId, 240, 2, 10),
      playerLine(awayPlayerId, awayTeamId, 210, 1, 4),
    ],
    simulationSeed: "firestore-parity-test",
    totalDrivesPlanned: 1,
  };
}

function teamResult(
  teamId: string,
  score: number,
  totalYards: number,
  passingYards: number,
  rushingYards: number,
  turnovers: number,
) {
  return {
    explosivePlays: teamId === homeTeamId ? 4 : 2,
    firstDowns: teamId === homeTeamId ? 23 : 18,
    passingYards,
    penalties: teamId === homeTeamId ? 3 : 5,
    redZoneTouchdowns: teamId === homeTeamId ? 3 : 2,
    redZoneTrips: teamId === homeTeamId ? 4 : 3,
    rushingYards,
    sacks: teamId === homeTeamId ? 3 : 2,
    score,
    teamId,
    timeOfPossessionSeconds: teamId === homeTeamId ? 1860 : 1740,
    totalYards,
    touchdowns: teamId === homeTeamId ? 3 : 2,
    turnovers,
  };
}

function drive(): MatchDriveResult {
  return {
    aggressiveGoForItResolution: null,
    coachingRiskProfile: null,
    defenseTeamAbbreviation: "BOS",
    defenseTeamId: awayTeamId,
    endedAwayScore: 0,
    endedHomeScore: 7,
    fourthDownAttempts: null,
    fourthDownBallPosition: null,
    fourthDownDecision: null,
    fourthDownDistance: null,
    fourthDownScoreDelta: null,
    fourthDownSecondsRemaining: null,
    highestReachedFieldPosition: null,
    offenseTeamAbbreviation: "AUS",
    offenseTeamId: homeTeamId,
    opp35To20FinishResult: null,
    passAttempts: 4,
    phaseLabel: "Q1 15:00",
    plays: 8,
    playsAfterConvert: null,
    playsAfterOpp35To20Entry: null,
    pointsScored: 7,
    postConvertEnteredOpp35To20: null,
    postConvertOriginatedOpp35To20: null,
    postFourthDownConverted: null,
    postFourthDownYards: null,
    primaryDefenderName: null,
    primaryPlayerName: "QB Arrows 1",
    redZoneTrip: true,
    resultType: "TOUCHDOWN",
    rushAttempts: 4,
    sequence: 1,
    softFailCount: null,
    startFieldPosition: null,
    startSecondsRemainingInGame: null,
    startedAwayScore: 0,
    startedHomeScore: 0,
    summary: "Arrows march 75 yards for a touchdown.",
    targetedAggressiveGoForIt: null,
    terminalPlayDistance: null,
    totalYards: 75,
    turnover: false,
  };
}

function playerLine(
  playerId: string,
  teamId: string,
  passingYards: number,
  passingTouchdowns: number,
  rushingYards: number,
): PlayerSimulationLine {
  return {
    blocking: zeros("pancakes", "passBlockSnaps", "pressuresAllowed", "runBlockSnaps", "sacksAllowed"),
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
    kicking: zeros(
      "extraPointsAttempted",
      "extraPointsMade",
      "fieldGoalsAttempted",
      "fieldGoalsAttemptedLong",
      "fieldGoalsAttemptedMid",
      "fieldGoalsAttemptedShort",
      "fieldGoalsMade",
      "fieldGoalsMadeLong",
      "fieldGoalsMadeMid",
      "fieldGoalsMadeShort",
      "kickoffTouchbacks",
      "longestFieldGoal",
    ),
    passing: {
      attempts: 28,
      completions: 19,
      interceptions: teamId === awayTeamId ? 1 : 0,
      longestCompletion: 42,
      sackYardsLost: 0,
      sacksTaken: 0,
      touchdowns: passingTouchdowns,
      yards: passingYards,
    },
    playerId,
    punting: zeros(
      "fairCatchesForced",
      "hangTimeTotalTenths",
      "longestPunt",
      "netPuntYards",
      "puntYards",
      "punts",
      "puntsInside20",
      "touchbacks",
    ),
    receiving: zeros(
      "drops",
      "longestReception",
      "receptions",
      "targets",
      "touchdowns",
      "yards",
      "yardsAfterCatch",
    ),
    returns: zeros(
      "kickReturnFumbles",
      "kickReturnTouchdowns",
      "kickReturnYards",
      "kickReturns",
      "puntReturnFumbles",
      "puntReturnTouchdowns",
      "puntReturnYards",
      "puntReturns",
    ),
    rushing: {
      attempts: 2,
      brokenTackles: 0,
      fumbles: 0,
      longestRush: rushingYards,
      touchdowns: 0,
      yards: rushingYards,
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

function zeros<T extends string>(...keys: T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}
