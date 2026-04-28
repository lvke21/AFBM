import { deleteApp, getApps } from "firebase-admin/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getMatchDetailForUser } from "@/modules/seasons/application/match-query.service";
import { getPlayerDetailForUser } from "@/modules/players/application/player-query.service";
import { getSeasonOverviewForUser } from "@/modules/seasons/application/season-query.service";
import { getTeamDetailForUser } from "@/modules/teams/application/team-query.service";

import { resetFirestoreEmulator } from "../../../scripts/seeds/firestore-reset";
import {
  ensureFirestoreEmulatorEnvironment,
  seedFirestoreEmulator,
} from "../../../scripts/seeds/firestore-seed";
import { readModelRepositoryFirestore } from "./readModelRepository.firestore";

const leagueId = "league-demo-2026";
const ownerId = "firebase-e2e-owner";
const seasonId = "season-demo-2026";
const teamId = "team-demo-arrows";
const playerId = "team-demo-arrows-qb";
const matchId = "league-demo-2026_season-demo-2026_w1_m1";

async function cleanupAdminApps() {
  await Promise.all(getApps().map((app) => deleteApp(app)));
}

describe("firestore reports and read models", () => {
  beforeAll(() => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-afbm");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("DATA_BACKEND", "firestore");
    ensureFirestoreEmulatorEnvironment();
  });

  beforeEach(async () => {
    await resetFirestoreEmulator();
    await seedFirestoreEmulator();
    await seedCompletedMatchReadModel();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await resetFirestoreEmulator();
    await cleanupAdminApps();
  });

  it("builds Firestore team, player, season, match, stats, and report read models", async () => {
    const [team, player, match, season, stats, reports] = await Promise.all([
      readModelRepositoryFirestore.getTeamOverview(ownerId, leagueId, teamId),
      readModelRepositoryFirestore.getPlayerOverview(ownerId, leagueId, playerId),
      readModelRepositoryFirestore.getMatchSummary(ownerId, leagueId, matchId),
      readModelRepositoryFirestore.getSeasonOverview(ownerId, leagueId, seasonId),
      readModelRepositoryFirestore.getStatsViews(ownerId, leagueId, seasonId),
      readModelRepositoryFirestore.listReports(ownerId, leagueId),
    ]);

    expect(team).toMatchObject({
      abbreviation: "AUS",
      playerCount: 8,
      seasonRecord: "1-0",
    });
    expect(player).toMatchObject({
      gamesPlayed: 1,
      id: playerId,
      positionCode: "QB",
      yards: 250,
    });
    expect(match).toMatchObject({
      driveCount: 1,
      scoreLabel: "AUS 27 - 20 BOS",
      topPassingPlayer: "QB Arrows 1",
    });
    expect(season?.matches).toHaveLength(28);
    expect(stats?.standings[0]?.teamId).toBe(teamId);
    expect(stats?.topPlayers[0]?.playerId).toBe(playerId);
    expect(reports?.[0]).toMatchObject({
      title: "Firebase seed readiness",
      type: "QA",
    });
  });

  it("serves existing app read paths from Firestore read models", async () => {
    const [team, player, season, match] = await Promise.all([
      getTeamDetailForUser(ownerId, leagueId, teamId),
      getPlayerDetailForUser(ownerId, leagueId, playerId),
      getSeasonOverviewForUser(ownerId, leagueId, seasonId),
      getMatchDetailForUser(ownerId, leagueId, matchId),
    ]);

    expect(team?.id).toBe(teamId);
    expect(player?.id).toBe(playerId);
    expect(season?.standings[0]?.teamId).toBe(teamId);
    expect(match?.homeTeam.stats?.totalYards).toBe(386);
    expect(match?.leaders.passing?.playerId).toBe(playerId);
  });

  it("blocks unauthorized read model access and production Firestore access", async () => {
    await expect(
      readModelRepositoryFirestore.getTeamOverview("not-a-member", leagueId, teamId),
    ).resolves.toBeNull();

    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");

    await expect(
      readModelRepositoryFirestore.getTeamOverview(ownerId, leagueId, teamId),
    ).rejects.toThrow("DATA_BACKEND=firestore is only available");

    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
  });
});

async function seedCompletedMatchReadModel() {
  const firestore = getFirebaseAdminFirestore();
  const now = new Date("2026-04-26T12:00:00.000Z");
  const batch = firestore.batch();

  batch.set(firestore.collection("matches").doc(matchId), {
    awayScore: 20,
    homeScore: 27,
    status: "COMPLETED",
    updatedAt: now,
  }, { merge: true });

  batch.set(firestore.collection("gameEvents").doc(`${matchId}_drive_001`), {
    defenseTeamAbbreviation: "BOS",
    endedAwayScore: 0,
    endedHomeScore: 7,
    eventType: "MATCH_DRIVE",
    leagueId,
    matchId,
    offenseTeamAbbreviation: "AUS",
    passAttempts: 4,
    phaseLabel: "Q1 15:00",
    plays: 8,
    pointsScored: 7,
    primaryDefenderName: null,
    primaryPlayerName: "QB Arrows 1",
    redZoneTrip: true,
    resultType: "TOUCHDOWN",
    rushAttempts: 4,
    seasonId,
    sequence: 1,
    startedAwayScore: 0,
    startedHomeScore: 0,
    summary: "Arrows march 75 yards for a touchdown.",
    totalYards: 75,
    turnover: false,
    updatedAt: now,
    weekId: `${leagueId}_${seasonId}_w1`,
    weekNumber: 1,
  });

  batch.set(firestore.collection("teamStats").doc(`match_${matchId}_${teamId}`), {
    explosivePlays: 4,
    firstDowns: 23,
    leagueId,
    matchId,
    passingYards: 260,
    pointsAgainst: 20,
    pointsFor: 27,
    redZoneTouchdowns: 3,
    redZoneTrips: 4,
    rushingYards: 126,
    scope: "MATCH",
    seasonId,
    teamId,
    timeOfPossessionSeconds: 1860,
    totalYards: 386,
    turnovers: 0,
    updatedAt: now,
  });
  batch.set(firestore.collection("teamStats").doc(`match_${matchId}_team-demo-bison`), {
    explosivePlays: 2,
    firstDowns: 18,
    leagueId,
    matchId,
    passingYards: 212,
    pointsAgainst: 27,
    pointsFor: 20,
    redZoneTouchdowns: 2,
    redZoneTrips: 3,
    rushingYards: 88,
    scope: "MATCH",
    seasonId,
    teamId: "team-demo-bison",
    timeOfPossessionSeconds: 1740,
    totalYards: 300,
    turnovers: 1,
    updatedAt: now,
  });
  batch.set(firestore.collection("teamStats").doc(`season_${seasonId}_${teamId}`), {
    leagueId,
    losses: 0,
    pointsAgainst: 20,
    pointsFor: 27,
    scope: "SEASON",
    seasonId,
    teamId,
    teamSnapshot: {
      abbreviation: "AUS",
      city: "Austin",
      nickname: "Arrows",
      teamId,
    },
    ties: 0,
    updatedAt: now,
    wins: 1,
  }, { merge: true });

  batch.set(firestore.collection("playerStats").doc(`match_${matchId}_${playerId}`), {
    leagueId,
    matchId,
    passing: {
      touchdowns: 2,
      yards: 240,
    },
    playerId,
    playerSnapshot: {
      fullName: "QB Arrows 1",
      positionCode: "QB",
      teamAbbreviation: "AUS",
      teamId,
    },
    scope: "MATCH",
    seasonId,
    snapsOffense: 62,
    started: true,
    stats: {
      gamesPlayed: 1,
      touchdowns: 2,
      yards: 250,
    },
    teamId,
    updatedAt: now,
  });
  batch.set(firestore.collection("playerStats").doc(`season_${seasonId}_${playerId}_${teamId}`), {
    leagueId,
    passing: {
      touchdowns: 2,
      yards: 240,
    },
    playerId,
    playerSnapshot: {
      fullName: "QB Arrows 1",
      positionCode: "QB",
      teamAbbreviation: "AUS",
      teamId,
    },
    scope: "SEASON",
    seasonId,
    stats: {
      gamesPlayed: 1,
      touchdowns: 2,
      yards: 250,
    },
    teamId,
    updatedAt: now,
  }, { merge: true });

  await batch.commit();
}
