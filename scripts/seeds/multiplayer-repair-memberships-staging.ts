import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
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

const REPAIR_ACTOR_ID = "server-membership-repair";

type RepairAction = {
  userId: string;
  teamId: string;
  repairedMirror: boolean;
  repairedTeamAssignment: boolean;
};

export type MultiplayerMembershipRepairSummary = {
  leagueId: string;
  activeMemberships: number;
  repaired: RepairAction[];
  skipped: Array<{ userId: string; teamId: string; reason: string }>;
};

function requireStagingConfirmation() {
  if (process.env.USE_FIRESTORE_EMULATOR !== "false") {
    throw new Error("Membership repair requires USE_FIRESTORE_EMULATOR=false.");
  }

  if (process.env.GOOGLE_CLOUD_PROJECT !== "afbm-staging") {
    throw new Error("Membership repair requires GOOGLE_CLOUD_PROJECT=afbm-staging.");
  }

  if (process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error("Membership repair requires CONFIRM_STAGING_SEED=true.");
  }
}

function createLeagueMemberMirror(input: {
  leagueId: string;
  leagueSlug: string;
  membership: FirestoreOnlineMembershipDoc;
  now: string;
}): FirestoreLeagueMemberMirrorDoc {
  return {
    id: `${input.leagueId}_${input.membership.userId}`,
    leagueId: input.leagueId,
    leagueSlug: input.leagueSlug,
    uid: input.membership.userId,
    userId: input.membership.userId,
    role: input.membership.role === "admin" ? "ADMIN" : "GM",
    status:
      input.membership.status === "active"
        ? "ACTIVE"
        : input.membership.status === "removed"
          ? "REMOVED"
          : "INACTIVE",
    teamId: input.membership.teamId,
    createdAt: input.membership.joinedAt,
    updatedAt: input.now,
  };
}

function mirrorNeedsRepair(
  mirror: FirestoreLeagueMemberMirrorDoc | undefined,
  expected: FirestoreLeagueMemberMirrorDoc,
) {
  return (
    !mirror ||
    mirror.leagueId !== expected.leagueId ||
    mirror.userId !== expected.userId ||
    mirror.uid !== expected.uid ||
    mirror.teamId !== expected.teamId ||
    mirror.role !== expected.role ||
    mirror.status !== expected.status
  );
}

export async function repairMultiplayerMembershipMirrors(): Promise<MultiplayerMembershipRepairSummary> {
  requireStagingConfirmation();
  const environment = configureMultiplayerFirestoreEnvironment();
  logMultiplayerFirestoreEnvironment(environment, "repair multiplayer membership mirrors");

  if (environment.mode !== "staging") {
    throw new Error("Membership repair is restricted to staging mode.");
  }

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const [leagueSnapshot, membershipsSnapshot, teamsSnapshot] = await Promise.all([
    withMultiplayerFirestoreTimeout(leagueRef.get(), "read multiplayer test league", environment, 30_000),
    withMultiplayerFirestoreTimeout(leagueRef.collection("memberships").get(), "read multiplayer memberships", environment, 30_000),
    withMultiplayerFirestoreTimeout(leagueRef.collection("teams").get(), "read multiplayer teams", environment, 30_000),
  ]);

  if (!leagueSnapshot.exists) {
    throw new Error(`League ${MULTIPLAYER_TEST_LEAGUE_ID} does not exist.`);
  }

  const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc;

  if (league.id !== MULTIPLAYER_TEST_LEAGUE_ID || league.settings?.testData !== true) {
    throw new Error("Refusing to repair a non-test multiplayer league.");
  }

  const now = new Date().toISOString();
  const memberships = membershipsSnapshot.docs.map((document) => document.data() as FirestoreOnlineMembershipDoc);
  const activeMemberships = memberships.filter(
    (membership) => membership.status === "active" && membership.teamId,
  );
  const teamsById = new Map(
    teamsSnapshot.docs.map((document) => [
      document.id,
      document.data() as FirestoreOnlineTeamDoc,
    ]),
  );
  const mirrorSnapshots = await Promise.all(
    activeMemberships.map((membership) =>
      withMultiplayerFirestoreTimeout(
        firestore.collection("leagueMembers").doc(`${MULTIPLAYER_TEST_LEAGUE_ID}_${membership.userId}`).get(),
        `read league member mirror ${membership.userId}`,
        environment,
        30_000,
      ),
    ),
  );
  const batch = firestore.batch();
  const repaired: RepairAction[] = [];
  const skipped: MultiplayerMembershipRepairSummary["skipped"] = [];

  activeMemberships.forEach((membership, index) => {
    const team = teamsById.get(membership.teamId);

    if (!team) {
      skipped.push({
        userId: membership.userId,
        teamId: membership.teamId,
        reason: "membership-team-missing",
      });
      return;
    }

    if (team.assignedUserId && team.assignedUserId !== membership.userId) {
      skipped.push({
        userId: membership.userId,
        teamId: membership.teamId,
        reason: `team-assigned-to-different-user:${team.assignedUserId}`,
      });
      return;
    }

    const expectedMirror = createLeagueMemberMirror({
      leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
      leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
      membership,
      now,
    });
    const mirrorSnapshot = mirrorSnapshots[index];
    const existingMirror = mirrorSnapshot?.exists
      ? (mirrorSnapshot.data() as FirestoreLeagueMemberMirrorDoc)
      : undefined;
    const repairedMirror = mirrorNeedsRepair(existingMirror, expectedMirror);
    const repairedTeamAssignment =
      team.assignedUserId !== membership.userId || team.status !== "assigned";

    if (repairedMirror) {
      batch.set(firestore.collection("leagueMembers").doc(expectedMirror.id), expectedMirror, { merge: true });
    }

    if (repairedTeamAssignment) {
      batch.set(
        leagueRef.collection("teams").doc(team.id),
        {
          assignedUserId: membership.userId,
          status: "assigned",
          updatedAt: now,
        },
        { merge: true },
      );
    }

    if (repairedMirror || repairedTeamAssignment) {
      repaired.push({
        userId: membership.userId,
        teamId: membership.teamId,
        repairedMirror,
        repairedTeamAssignment,
      });
    }
  });

  batch.set(leagueRef.collection("events").doc("membership-mirror-repair"), {
    type: "membership_mirror_repaired",
    createdAt: now,
    createdByUserId: REPAIR_ACTOR_ID,
    payload: {
      repairedCount: repaired.length,
      skippedCount: skipped.length,
      seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
      testData: true,
    },
  });
  batch.set(
    leagueRef,
    {
      updatedAt: now,
      settings: {
        membershipMirrorRepairedAt: now,
        seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
        testData: true,
        leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        createdBySeed: true,
      },
      version: FieldValue.increment(1),
    },
    { merge: true },
  );

  await withMultiplayerFirestoreTimeout(
    batch.commit(),
    "repair multiplayer membership mirrors",
    environment,
    30_000,
  );

  if (skipped.length > 0) {
    throw new Error(`Membership repair skipped unsafe rows: ${JSON.stringify(skipped)}`);
  }

  return {
    leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
    activeMemberships: activeMemberships.length,
    repaired,
    skipped,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  repairMultiplayerMembershipMirrors()
    .then((summary) => {
      console.log("Multiplayer membership repair completed:");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
