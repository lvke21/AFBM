import { deleteApp, getApps } from "firebase-admin/app";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";

import { MatchKind, MatchStatus } from "@/modules/shared/domain/enums";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationTeamContext,
} from "@/modules/seasons/application/simulation/simulation.types";
import { getMatchDetailForUser } from "@/modules/seasons/application/match-query.service";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

import {
  ensureFirestoreEmulatorEnvironment,
  seedFirestoreEmulator,
} from "../../../scripts/seeds/firestore-seed";
import { resetFirestoreEmulator } from "../../../scripts/seeds/firestore-reset";
import { gameOutputRepositoryFirestore } from "./gameOutputRepository.firestore";
import { matchRepositoryFirestore } from "./matchRepository.firestore";

const leagueId = "league-demo-2026";
const ownerId = "firebase-e2e-owner";
const seasonId = "season-demo-2026";
const matchId = "league-demo-2026_season-demo-2026_w1_m1";

async function cleanupAdminApps() {
  await Promise.all(getApps().map((app) => deleteApp(app)));
}

describe("firestore game output persistence", () => {
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

  it("persists final score, result summary, and drive events without stats or reports writes", async () => {
    const firestore = getFirebaseAdminFirestore();
    const [playerStatsBefore, teamStatsBefore, reportsBefore] = await Promise.all([
      countCollection("playerStats"),
      countCollection("teamStats"),
      countCollection("reports"),
    ]);

    const result = buildResult();
    const context = buildContext();
    const persisted = await gameOutputRepositoryFirestore.persistMatchOutput({ context, result });
    const [match, gameEvents, playerStatsAfter, teamStatsAfter, reportsAfter] = await Promise.all([
      firestore.collection("matches").doc(matchId).get(),
      firestore.collection("gameEvents").where("matchId", "==", matchId).get(),
      countCollection("playerStats"),
      countCollection("teamStats"),
      countCollection("reports"),
    ]);

    expect(persisted.driveEventsWritten).toBe(2);
    expect(match.data()?.status).toBe(MatchStatus.COMPLETED);
    expect(match.data()?.homeScore).toBe(27);
    expect(match.data()?.awayScore).toBe(20);
    expect(match.data()?.resultSummary).toMatchObject({
      driveCount: 2,
      finalScoreLabel: "Austin Arrows 27 - 20 Boston Bison",
      homeScore: 27,
    });
    expect(gameEvents.docs).toHaveLength(2);
    expect(gameEvents.docs.map((document) => document.id)).toEqual([
      `${matchId}_drive_001`,
      `${matchId}_drive_002`,
    ]);
    expect(gameEvents.docs[0]?.data()).toMatchObject({
      eventType: "MATCH_DRIVE",
      leagueId,
      matchId,
      pointsScored: 7,
      resultType: "TOUCHDOWN",
      sequence: 1,
    });
    expect(playerStatsAfter).toBe(playerStatsBefore);
    expect(teamStatsAfter).toBe(teamStatsBefore);
    expect(reportsAfter).toBe(reportsBefore);
  });

  it("exposes stored drive events through the Firestore match detail read model", async () => {
    await gameOutputRepositoryFirestore.persistMatchOutput({
      context: buildContext(),
      result: buildResult(),
    });

    const [repositoryMatch, queryMatch] = await Promise.all([
      matchRepositoryFirestore.findBySaveGame(leagueId, matchId),
      getMatchDetailForUser(ownerId, leagueId, matchId),
    ]);

    expect(repositoryMatch?.simulationDrives).toHaveLength(2);
    expect(repositoryMatch?.simulationDrives[0]?.summary).toBe("Arrows march 75 yards for a touchdown.");
    expect(queryMatch?.drives).toHaveLength(2);
    expect(queryMatch?.drives[0]?.endedScore).toBe("7-0");
    expect(queryMatch?.homeTeam.score).toBe(27);
    expect(queryMatch?.awayTeam.score).toBe(20);
  });

  it("replaces previous drive events idempotently", async () => {
    await gameOutputRepositoryFirestore.persistMatchOutput({
      context: buildContext(),
      result: buildResult(),
    });

    await gameOutputRepositoryFirestore.persistMatchOutput({
      context: buildContext(),
      result: {
        ...buildResult(),
        drives: [drive({ endedAwayScore: 3, endedHomeScore: 10, pointsScored: 3, sequence: 1 })],
      },
    });

    const snapshot = await getFirebaseAdminFirestore()
      .collection("gameEvents")
      .where("matchId", "==", matchId)
      .get();

    expect(snapshot.docs).toHaveLength(1);
    expect(snapshot.docs[0]?.data().pointsScored).toBe(3);
  });

  it("keeps production Firestore access blocked by the existing guard", async () => {
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");

    await expect(
      gameOutputRepositoryFirestore.persistMatchOutput({
        context: buildContext(),
        result: buildResult(),
      }),
    ).rejects.toThrow("DATA_BACKEND=firestore is only available");

    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
  });
});

async function countCollection(collectionName: string) {
  const snapshot = await getFirebaseAdminFirestore().collection(collectionName).get();
  return snapshot.size;
}

function buildContext(): SimulationMatchContext {
  const homeTeam = team("team-demo-arrows", "Austin", "Arrows", "AUS");
  const awayTeam = team("team-demo-bison", "Boston", "Bison", "BOS");

  return {
    awayTeam,
    homeTeam,
    kind: MatchKind.REGULAR_SEASON,
    matchId,
    saveGameId: leagueId,
    scheduledAt: new Date("2026-09-01T18:00:00.000Z"),
    seasonId,
    seasonYear: 2026,
    simulationSeed: "firestore-output-test",
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
      teamId: "team-demo-bison",
      timeOfPossessionSeconds: 1740,
      totalYards: 300,
      touchdowns: 2,
      turnovers: 1,
    },
    drives: [
      drive({ endedAwayScore: 0, endedHomeScore: 7, pointsScored: 7, sequence: 1 }),
      drive({
        endedAwayScore: 20,
        endedHomeScore: 27,
        offenseTeamAbbreviation: "BOS",
        offenseTeamId: "team-demo-bison",
        defenseTeamAbbreviation: "AUS",
        defenseTeamId: "team-demo-arrows",
        pointsScored: 0,
        resultType: "TURNOVER_ON_DOWNS",
        sequence: 2,
        startedAwayScore: 20,
        startedHomeScore: 27,
        summary: "Bison fail on fourth down near midfield.",
        turnover: true,
      }),
    ],
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
      teamId: "team-demo-arrows",
      timeOfPossessionSeconds: 1860,
      totalYards: 386,
      touchdowns: 3,
      turnovers: 0,
    },
    matchId,
    playerLines: [],
    simulationSeed: "firestore-output-test",
    totalDrivesPlanned: 2,
  };
}

function drive(input: Partial<MatchDriveResult> & { sequence: number }): MatchDriveResult {
  return {
    aggressiveGoForItResolution: null,
    coachingRiskProfile: null,
    defenseTeamAbbreviation: input.defenseTeamAbbreviation ?? "BOS",
    defenseTeamId: input.defenseTeamId ?? "team-demo-bison",
    endedAwayScore: input.endedAwayScore ?? 0,
    endedHomeScore: input.endedHomeScore ?? 0,
    fourthDownAttempts: null,
    fourthDownBallPosition: null,
    fourthDownDecision: null,
    fourthDownDistance: null,
    fourthDownScoreDelta: null,
    fourthDownSecondsRemaining: null,
    highestReachedFieldPosition: null,
    offenseTeamAbbreviation: input.offenseTeamAbbreviation ?? "AUS",
    offenseTeamId: input.offenseTeamId ?? "team-demo-arrows",
    opp35To20FinishResult: null,
    passAttempts: input.passAttempts ?? 4,
    phaseLabel: input.phaseLabel ?? "Q1 15:00",
    plays: input.plays ?? 8,
    playsAfterConvert: null,
    playsAfterOpp35To20Entry: null,
    pointsScored: input.pointsScored ?? 0,
    postConvertEnteredOpp35To20: null,
    postConvertOriginatedOpp35To20: null,
    postFourthDownConverted: null,
    postFourthDownYards: null,
    primaryDefenderName: input.primaryDefenderName ?? null,
    primaryPlayerName: input.primaryPlayerName ?? "QB Arrows 1",
    redZoneTrip: input.redZoneTrip ?? true,
    resultType: input.resultType ?? "TOUCHDOWN",
    rushAttempts: input.rushAttempts ?? 4,
    sequence: input.sequence,
    softFailCount: null,
    startFieldPosition: null,
    startSecondsRemainingInGame: null,
    startedAwayScore: input.startedAwayScore ?? 0,
    startedHomeScore: input.startedHomeScore ?? 0,
    summary: input.summary ?? "Arrows march 75 yards for a touchdown.",
    targetedAggressiveGoForIt: null,
    terminalPlayDistance: null,
    totalYards: input.totalYards ?? 75,
    turnover: input.turnover ?? false,
  };
}

function team(
  id: string,
  city: string,
  nickname: string,
  abbreviation: string,
): SimulationTeamContext {
  return {
    abbreviation,
    city,
    id,
    nickname,
    overallRating: 80,
    roster: [player(id)],
  };
}

function player(teamId: string): SimulationPlayerContext {
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
    firstName: "Test",
    gameDayAvailability: "ACTIVE",
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    id: `${teamId}-test-player`,
    injuryEndsOn: null,
    injuryName: null,
    injuryRisk: 0,
    injuryStatus: "HEALTHY",
    lastName: "Player",
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
