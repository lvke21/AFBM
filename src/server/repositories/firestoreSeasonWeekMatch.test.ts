import { deleteApp, getApps } from "firebase-admin/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureFirestoreEmulatorEnvironment,
  seedFirestoreEmulator,
} from "../../../scripts/seeds/firestore-seed";
import { resetFirestoreEmulator } from "../../../scripts/seeds/firestore-reset";
import { getMatchDetailForUser } from "@/modules/seasons/application/match-query.service";
import { getSeasonOverview } from "@/modules/seasons/application/season-query.service";
import { getRepositories } from "./index";
import { matchRepositoryFirestore } from "./matchRepository.firestore";
import { seasonRepositoryFirestore } from "./seasonRepository.firestore";
import { weekRepositoryFirestore } from "./weekRepository.firestore";

const leagueId = "league-demo-2026";
const ownerId = "firebase-e2e-owner";
const seasonId = "season-demo-2026";
const weekId = "league-demo-2026_season-demo-2026_w1";
const matchId = "league-demo-2026_season-demo-2026_w1_m1";

async function cleanupAdminApps() {
  await Promise.all(getApps().map((app) => deleteApp(app)));
}

describe("firestore season, week, and match read repositories", () => {
  beforeAll(() => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-afbm");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
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

  it("loads a season overview record from Firestore", async () => {
    const season = await seasonRepositoryFirestore.findOwnedByUser(ownerId, leagueId, seasonId);

    expect(season?.id).toBe(seasonId);
    expect(season?.matches).toHaveLength(28);
    expect(season?.teamSeasonStats).toHaveLength(8);
  });

  it("loads the current season from Firestore", async () => {
    const season = await seasonRepositoryFirestore.findCurrentBySaveGame(leagueId);

    expect(season?.id).toBe(seasonId);
    expect(season?.week).toBe(1);
  });

  it("loads a week and the current week from Firestore", async () => {
    const [week, currentWeek] = await Promise.all([
      weekRepositoryFirestore.findOwnedByUser(ownerId, leagueId, weekId),
      weekRepositoryFirestore.findCurrentBySaveGame(leagueId),
    ]);

    expect(week?.id).toBe(weekId);
    expect(week?.weekNumber).toBe(1);
    expect(currentWeek?.id).toBe(weekId);
  });

  it("loads matches for a week from Firestore", async () => {
    const matches = await matchRepositoryFirestore.findByWeek(leagueId, weekId);

    expect(matches).toHaveLength(4);
    expect(matches[0]?.week).toBe(1);
  });

  it("loads match detail from Firestore", async () => {
    const match = await matchRepositoryFirestore.findDetailForUser(ownerId, leagueId, matchId);

    expect(match?.id).toBe(matchId);
    expect(match?.homeTeam.id).toBeTruthy();
    expect(match?.awayTeam.id).toBeTruthy();
    expect(match?.teamMatchStats).toHaveLength(0);
    expect(match?.simulationDrives).toHaveLength(0);
    expect(match?.playerMatchStats).toHaveLength(0);
  });

  it("serves existing season and match query paths from Firestore", async () => {
    vi.stubEnv("DATA_BACKEND", "firestore");

    const [seasonOverview, matchDetail] = await Promise.all([
      getSeasonOverview(leagueId, seasonId),
      getMatchDetailForUser(ownerId, leagueId, matchId),
    ]);

    expect(seasonOverview?.id).toBe(seasonId);
    expect(seasonOverview?.matches).toHaveLength(28);
    expect(matchDetail?.id).toBe(matchId);
  });

  it("returns null for missing, foreign, or unauthorized records", async () => {
    await expect(seasonRepositoryFirestore.findBySaveGame(leagueId, "missing-season")).resolves.toBeNull();
    await expect(weekRepositoryFirestore.findBySaveGame(leagueId, "missing-week")).resolves.toBeNull();
    await expect(matchRepositoryFirestore.findBySaveGame(leagueId, "missing-match")).resolves.toBeNull();
    await expect(seasonRepositoryFirestore.findBySaveGame("foreign-league", seasonId)).resolves.toBeNull();
    await expect(
      matchRepositoryFirestore.findDetailForUser("not-a-member", leagueId, matchId),
    ).resolves.toBeNull();
  });

  it("switches season, week, and match reads with DATA_BACKEND=firestore", () => {
    vi.stubEnv("DATA_BACKEND", "firestore");

    const repositories = getRepositories();

    expect(repositories.backend).toBe("firestore");
    expect(repositories.seasons).toBe(seasonRepositoryFirestore);
    expect(repositories.weeks).toBe(weekRepositoryFirestore);
    expect(repositories.matches).toBe(matchRepositoryFirestore);
    expect(repositories.stats).toBeTypeOf("object");
  });
});
