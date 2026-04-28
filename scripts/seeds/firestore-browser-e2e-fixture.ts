import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";

import {
  FIRESTORE_PARITY_IDS,
  makeFirestoreMatchId,
} from "./parity-fixture";
import { ensureFirestoreEmulatorEnvironment } from "./firestore-seed";

export async function prepareFirestoreBrowserE2eFixture() {
  ensureFirestoreEmulatorEnvironment();
  const firestore = getFirebaseAdminFirestore();
  const now = new Date();
  const { firstMatchId, firstWeekId, leagueId, seasonId } = FIRESTORE_PARITY_IDS;
  const weekOneMatches = await firestore
    .collection("matches")
    .where("leagueId", "==", leagueId)
    .where("seasonId", "==", seasonId)
    .where("weekId", "==", firstWeekId)
    .get();

  const batch = firestore.batch();

  batch.update(firestore.collection("leagues").doc(leagueId), {
    currentSeasonId: seasonId,
    currentSeasonSnapshot: {
      phase: "REGULAR_SEASON",
      weekNumber: 1,
      year: 2026,
    },
    currentWeekId: firstWeekId,
    updatedAt: now,
    weekState: "PRE_WEEK",
  });
  batch.update(firestore.collection("seasons").doc(seasonId), {
    currentWeekNumber: 1,
    updatedAt: now,
  });
  batch.update(firestore.collection("weeks").doc(firstWeekId), {
    state: "PRE_WEEK",
    updatedAt: now,
  });

  for (const document of weekOneMatches.docs) {
    if (document.id === firstMatchId) {
      batch.update(document.ref, {
        awayScore: null,
        homeScore: null,
        simulationCompletedAt: null,
        simulationSeed: null,
        simulationStartedAt: null,
        status: "SCHEDULED",
        updatedAt: now,
      });
      continue;
    }

    batch.update(document.ref, {
      awayScore: 13,
      homeScore: 20,
      simulationCompletedAt: now,
      simulationSeed: `browser-e2e-precompleted:${document.id}`,
      simulationStartedAt: now,
      status: "COMPLETED",
      updatedAt: now,
    });
  }

  for (let weekNumber = 2; weekNumber <= 3; weekNumber += 1) {
    batch.update(firestore.collection("weeks").doc(`${leagueId}_${seasonId}_w${weekNumber}`), {
      state: "PRE_WEEK",
      updatedAt: now,
    });
    batch.update(firestore.collection("matches").doc(makeFirestoreMatchId(weekNumber, 1)), {
      awayScore: null,
      homeScore: null,
      simulationCompletedAt: null,
      simulationSeed: null,
      simulationStartedAt: null,
      status: "SCHEDULED",
      updatedAt: now,
    });
  }

  await batch.commit();

  return {
    firstMatchId,
    leagueId,
    preCompletedWeekOneMatches: Math.max(0, weekOneMatches.size - 1),
  };
}

async function main() {
  const summary = await prepareFirestoreBrowserE2eFixture();

  console.log("Prepared Firestore browser E2E fixture:");
  console.log(`- league: ${summary.leagueId}`);
  console.log(`- playable match: ${summary.firstMatchId}`);
  console.log(`- pre-completed week-one matches: ${summary.preCompletedWeekOneMatches}`);
}

if (process.argv[1]?.endsWith("firestore-browser-e2e-fixture.ts")) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
