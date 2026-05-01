import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import type {
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineTeamDoc,
} from "../../src/lib/online/types";
import {
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
} from "./multiplayer-test-league-firestore-seed";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./multiplayer-firestore-env";

const FINALIZE_ACTOR_ID = "server-auto-draft-finalize-repair";

export type MultiplayerAutoDraftFinalizeSummary = {
  leagueId: string;
  draftStatus: string;
  teamCount: number;
  completeRosterTeams: number;
  updated: boolean;
};

function requireStagingConfirmation() {
  if (process.env.USE_FIRESTORE_EMULATOR !== "false") {
    throw new Error("Auto-draft finalize repair requires USE_FIRESTORE_EMULATOR=false.");
  }

  if (process.env.GOOGLE_CLOUD_PROJECT !== "afbm-staging") {
    throw new Error("Auto-draft finalize repair requires GOOGLE_CLOUD_PROJECT=afbm-staging.");
  }

  if (process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error("Auto-draft finalize repair requires CONFIRM_STAGING_SEED=true.");
  }
}

function hasCompleteRoster(team: FirestoreOnlineTeamDoc) {
  const activeRosterCount =
    team.contractRoster?.filter((player) => player.status === "active").length ?? 0;

  return activeRosterCount >= 53 && Boolean(team.depthChart?.length);
}

export async function finalizeMultiplayerAutoDraftState(): Promise<MultiplayerAutoDraftFinalizeSummary> {
  requireStagingConfirmation();
  const environment = configureMultiplayerFirestoreEnvironment();
  logMultiplayerFirestoreEnvironment(environment, "finalize multiplayer auto-draft state");

  if (environment.mode !== "staging") {
    throw new Error("Auto-draft finalize repair is restricted to staging mode.");
  }

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const draftRef = leagueRef.collection("draft").doc("main");
  const [leagueSnapshot, draftSnapshot, teamsSnapshot] = await Promise.all([
    withMultiplayerFirestoreTimeout(leagueRef.get(), "read multiplayer test league", environment, 30_000),
    withMultiplayerFirestoreTimeout(draftRef.get(), "read multiplayer draft state", environment, 30_000),
    withMultiplayerFirestoreTimeout(leagueRef.collection("teams").get(), "read multiplayer teams", environment, 30_000),
  ]);

  if (!leagueSnapshot.exists) {
    throw new Error(`League ${MULTIPLAYER_TEST_LEAGUE_ID} does not exist.`);
  }

  const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc;
  const draft = draftSnapshot.exists ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc) : null;
  const teams = teamsSnapshot.docs.map((document) => document.data() as FirestoreOnlineTeamDoc);
  const completeRosterTeams = teams.filter(hasCompleteRoster).length;

  if (league.id !== MULTIPLAYER_TEST_LEAGUE_ID || league.settings?.testData !== true) {
    throw new Error("Refusing to finalize a non-test multiplayer league.");
  }

  if (draft?.status !== "completed") {
    throw new Error(`Draft must be completed before finalize repair, got ${draft?.status ?? "<missing>"}.`);
  }

  if (teams.length !== 8 || completeRosterTeams !== 8) {
    throw new Error(`Expected 8 complete rosters, found ${completeRosterTeams}/${teams.length}.`);
  }

  const now = new Date().toISOString();

  await withMultiplayerFirestoreTimeout(
    Promise.all([
      leagueRef.set(
        {
          status: "active",
          weekStatus: "pre_week",
          updatedAt: now,
          settings: {
            ...league.settings,
            foundationStatus: "roster_ready",
            phase: "roster_ready",
            currentPhase: "roster_ready",
            gamePhase: "pre_week",
            rosterReady: true,
            draftExecuted: true,
            autoDraftFinalizedAt: now,
            seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
            testData: true,
            leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
            createdBySeed: true,
          },
          version: FieldValue.increment(1),
        },
        { merge: true },
      ),
      leagueRef.collection("events").doc("foundation-auto-draft-finalized").set({
        type: "fantasy_draft_finalized",
        createdAt: now,
        createdByUserId: FINALIZE_ACTOR_ID,
        payload: {
          draftStatus: draft.status,
          completeRosterTeams,
          foundationStatus: "roster_ready",
          seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
          testData: true,
        },
      }),
    ]),
    "finalize multiplayer auto-draft state",
    environment,
    30_000,
  );

  return {
    leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
    draftStatus: draft.status,
    teamCount: teams.length,
    completeRosterTeams,
    updated: true,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  finalizeMultiplayerAutoDraftState()
    .then((summary) => {
      console.log("Multiplayer auto-draft state finalized:");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
