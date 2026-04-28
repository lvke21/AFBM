import { deleteApp, getApps } from "firebase-admin/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MatchStatus, WeekState } from "@/modules/shared/domain/enums";
import {
  advanceWeekForUser,
  finishGameForUser,
  prepareWeekForUser,
  startGameForUser,
} from "@/modules/savegames/application/week-flow.service";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

import {
  ensureFirestoreEmulatorEnvironment,
  seedFirestoreEmulator,
} from "../../../scripts/seeds/firestore-seed";
import { resetFirestoreEmulator } from "../../../scripts/seeds/firestore-reset";

const leagueId = "league-demo-2026";
const ownerId = "firebase-e2e-owner";
const seasonId = "season-demo-2026";
const weekId = "league-demo-2026_season-demo-2026_w1";
const matchId = "league-demo-2026_season-demo-2026_w1_m1";

async function cleanupAdminApps() {
  await Promise.all(getApps().map((app) => deleteApp(app)));
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
  const snapshot = await firestore
    .collection("matches")
    .where("weekId", "==", weekId)
    .get();
  const batch = firestore.batch();

  for (const document of snapshot.docs) {
    batch.set(document.ref, {
      awayScore: 17,
      homeScore: 24,
      status: MatchStatus.COMPLETED,
    }, { merge: true });
  }

  await batch.commit();
}

async function completeOtherCurrentWeekMatches(openMatchId: string) {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore
    .collection("matches")
    .where("weekId", "==", weekId)
    .get();
  const batch = firestore.batch();

  for (const document of snapshot.docs) {
    if (document.id === openMatchId) {
      continue;
    }

    batch.set(document.ref, {
      awayScore: 17,
      homeScore: 24,
      status: MatchStatus.COMPLETED,
    }, { merge: true });
  }

  await batch.commit();
}

describe("firestore week and match state writes", () => {
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

  it("prepares a week from PRE_WEEK to READY", async () => {
    await setCurrentWeekState(WeekState.PRE_WEEK);

    const result = await prepareWeekForUser({ saveGameId: leagueId, userId: ownerId });
    const [league, week] = await Promise.all([
      getFirebaseAdminFirestore().collection("leagues").doc(leagueId).get(),
      getFirebaseAdminFirestore().collection("weeks").doc(weekId).get(),
    ]);

    expect(result.weekState).toBe(WeekState.READY);
    expect(league.data()?.weekState).toBe(WeekState.READY);
    expect(week.data()?.state).toBe(WeekState.READY);
  });

  it("starts a scheduled match and moves week to GAME_RUNNING", async () => {
    const result = await startGameForUser({
      matchId,
      saveGameId: leagueId,
      userId: ownerId,
    });
    const match = await getFirebaseAdminFirestore().collection("matches").doc(matchId).get();

    expect(result.weekState).toBe(WeekState.GAME_RUNNING);
    expect(result.matchId).toBe(matchId);
    expect(match.data()?.status).toBe(MatchStatus.IN_PROGRESS);
    expect(match.data()?.homeScore).toEqual(expect.any(Number));
    expect(match.data()?.awayScore).toEqual(expect.any(Number));
    expect(match.data()?.simulationSeed).toContain("firestore-system-result:");
    expect(match.data()?.simulationStartedAt).toBeDefined();
  });

  it("finishes a running match and returns to READY while more matches are scheduled", async () => {
    await startGameForUser({ matchId, saveGameId: leagueId, userId: ownerId });
    const startedMatch = await getFirebaseAdminFirestore().collection("matches").doc(matchId).get();

    const result = await finishGameForUser({
      matchId,
      saveGameId: leagueId,
      userId: ownerId,
    });
    const match = await getFirebaseAdminFirestore().collection("matches").doc(matchId).get();

    expect(result.weekState).toBe(WeekState.READY);
    expect(match.data()?.status).toBe(MatchStatus.COMPLETED);
    expect(match.data()?.homeScore).toBe(startedMatch.data()?.homeScore);
    expect(match.data()?.awayScore).toBe(startedMatch.data()?.awayScore);
    expect(match.data()?.simulationCompletedAt).toBeDefined();
  });

  it("moves to POST_GAME only after the final current-week match is completed", async () => {
    await completeOtherCurrentWeekMatches(matchId);
    await startGameForUser({ matchId, saveGameId: leagueId, userId: ownerId });

    const result = await finishGameForUser({
      matchId,
      saveGameId: leagueId,
      userId: ownerId,
    });

    expect(result.weekState).toBe(WeekState.POST_GAME);
  });

  it("blocks illegal state transitions", async () => {
    await expect(prepareWeekForUser({ saveGameId: leagueId, userId: ownerId })).rejects.toThrow(
      "prepareWeek requires week state PRE_WEEK",
    );

    await expect(
      finishGameForUser({
        matchId,
        saveGameId: leagueId,
        userId: ownerId,
      }),
    ).rejects.toThrow("finishGame requires week state GAME_RUNNING");
  });

  it("blocks advance while current week still has open matches", async () => {
    await setCurrentWeekState(WeekState.POST_GAME);

    await expect(advanceWeekForUser({ saveGameId: leagueId, userId: ownerId })).rejects.toThrow(
      "Current week still has open matches",
    );
  });

  it("advances to the next week after all current matches are completed", async () => {
    await setCurrentWeekState(WeekState.POST_GAME);
    await completeCurrentWeekMatches();

    const result = await advanceWeekForUser({ saveGameId: leagueId, userId: ownerId });
    const [league, nextWeek, season] = await Promise.all([
      getFirebaseAdminFirestore().collection("leagues").doc(leagueId).get(),
      getFirebaseAdminFirestore().collection("weeks").doc(`${leagueId}_${seasonId}_w2`).get(),
      getFirebaseAdminFirestore().collection("seasons").doc(seasonId).get(),
    ]);

    expect(result.weekState).toBe(WeekState.PRE_WEEK);
    expect(result.week).toBe(2);
    expect(league.data()?.currentWeekId).toBe(`${leagueId}_${seasonId}_w2`);
    expect(league.data()?.weekState).toBe(WeekState.PRE_WEEK);
    expect(nextWeek.data()?.state).toBe(WeekState.PRE_WEEK);
    expect(season.data()?.currentWeekNumber).toBe(2);
  });
});
