import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineMembershipDoc,
} from "../../src/lib/online/types";
import { autoDraftMultiplayerTestLeague } from "./multiplayer-auto-draft-staging";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./multiplayer-firestore-env";
import { finalizeMultiplayerAutoDraftState } from "./multiplayer-finalize-auto-draft-staging";
import { resetAndSeedMultiplayerTestLeague } from "./multiplayer-test-league-reset-and-seed";
import {
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
  MULTIPLAYER_TEST_LEAGUE_TEAMS,
} from "./multiplayer-test-league-firestore-seed";

const PLAYABILITY_SEED_ACTOR_ID = "staging-playability-seed";
const DEFAULT_ADMIN_UID = "KFy5PrqAzzP7vRbfP4wIDamzbh43";
const DEFAULT_SECOND_UID = "8P1NZzM8h0Y5URwrNAw99a4ukxo2";
const DEFAULT_ADMIN_TEAM_ID = "basel-rhinos";
const DEFAULT_SECOND_TEAM_ID = "bern-wolves";

type PlayabilityManagerAssignment = {
  displayName: string;
  role: FirestoreOnlineMembershipDoc["role"];
  teamId: string;
  userId: string;
  username: string;
};

function requireStagingPlayabilitySeedConfirmation() {
  if (process.env.USE_FIRESTORE_EMULATOR !== "false") {
    throw new Error("Playability staging seed requires USE_FIRESTORE_EMULATOR=false.");
  }

  if (process.env.GOOGLE_CLOUD_PROJECT !== "afbm-staging") {
    throw new Error("Playability staging seed requires GOOGLE_CLOUD_PROJECT=afbm-staging.");
  }

  if (process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error("Playability staging seed requires CONFIRM_STAGING_SEED=true.");
  }

  if (process.env.CONFIRM_STAGING_PLAYABILITY_SEED !== "true") {
    throw new Error(
      "Playability staging seed requires CONFIRM_STAGING_PLAYABILITY_SEED=true.",
    );
  }
}

function getPlayabilityAssignments(): PlayabilityManagerAssignment[] {
  const adminUid = process.env.STAGING_PLAYABILITY_ADMIN_UID?.trim() || DEFAULT_ADMIN_UID;
  const secondUid = process.env.STAGING_PLAYABILITY_SECOND_UID?.trim() || DEFAULT_SECOND_UID;

  if (adminUid === secondUid) {
    throw new Error("Playability staging seed requires two distinct test user IDs.");
  }

  const realManagerAssignments: PlayabilityManagerAssignment[] = [
    {
      displayName: "Staging Admin GM",
      role: "admin",
      teamId: DEFAULT_ADMIN_TEAM_ID,
      userId: adminUid,
      username: "staging-admin-gm",
    },
    {
      displayName: "Staging Player GM",
      role: "gm",
      teamId: DEFAULT_SECOND_TEAM_ID,
      userId: secondUid,
      username: "staging-player-gm",
    },
  ];
  const assignedTeamIds = new Set(realManagerAssignments.map((assignment) => assignment.teamId));
  const seededManagerAssignments = MULTIPLAYER_TEST_LEAGUE_TEAMS
    .filter((team) => !assignedTeamIds.has(team.id))
    .map((team): PlayabilityManagerAssignment => ({
      displayName: `${team.city} ${team.name} Seed GM`,
      role: "gm",
      teamId: team.id,
      userId: `staging-playability-${team.id}-gm`,
      username: `seed-${team.id}-gm`,
    }));

  return [...realManagerAssignments, ...seededManagerAssignments];
}

function createMirror(input: {
  assignment: PlayabilityManagerAssignment;
  createdAt: string;
}): FirestoreLeagueMemberMirrorDoc {
  return {
    createdAt: input.createdAt,
    id: `${MULTIPLAYER_TEST_LEAGUE_ID}_${input.assignment.userId}`,
    leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
    leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
    role: input.assignment.role === "admin" ? "ADMIN" : "GM",
    status: "ACTIVE",
    teamId: input.assignment.teamId,
    uid: input.assignment.userId,
    updatedAt: input.createdAt,
    userId: input.assignment.userId,
  };
}

function createMembership(input: {
  assignment: PlayabilityManagerAssignment;
  createdAt: string;
}): FirestoreOnlineMembershipDoc {
  return {
    displayName: input.assignment.displayName,
    joinedAt: input.createdAt,
    lastSeenAt: input.createdAt,
    ready: false,
    role: input.assignment.role,
    status: "active",
    teamId: input.assignment.teamId,
    userId: input.assignment.userId,
    username: input.assignment.username,
  };
}

function createPlayabilitySchedule() {
  let weeklyTeamOrder = MULTIPLAYER_TEST_LEAGUE_TEAMS.map((team) => team.id).sort((left, right) =>
    left.localeCompare(right),
  );
  const schedule: Array<{
    awayTeamName: string;
    homeTeamName: string;
    id: string;
    scheduledAt: string;
    status: "scheduled";
    week: number;
  }> = [];

  for (let weekIndex = 0; weekIndex < weeklyTeamOrder.length - 1; weekIndex += 1) {
    const week = weekIndex + 1;

    for (let gameIndex = 0; gameIndex < weeklyTeamOrder.length / 2; gameIndex += 1) {
      const leftTeamId = weeklyTeamOrder[gameIndex];
      const rightTeamId = weeklyTeamOrder[weeklyTeamOrder.length - 1 - gameIndex];
      const swapHomeAway =
        gameIndex === 0 ? weekIndex % 2 === 1 : (weekIndex + gameIndex) % 2 === 1;
      const homeTeamName = swapHomeAway ? rightTeamId : leftTeamId;
      const awayTeamName = swapHomeAway ? leftTeamId : rightTeamId;

      schedule.push({
        awayTeamName,
        homeTeamName,
        id: `${MULTIPLAYER_TEST_LEAGUE_ID}-playability-s1-w${week}-g${String(gameIndex + 1).padStart(2, "0")}`,
        scheduledAt: `2026-05-${String(week + 2).padStart(2, "0")}T18:00:00.000Z`,
        status: "scheduled",
        week,
      });
    }

    weeklyTeamOrder = [
      weeklyTeamOrder[0],
      weeklyTeamOrder[weeklyTeamOrder.length - 1],
      ...weeklyTeamOrder.slice(1, weeklyTeamOrder.length - 1),
    ];
  }

  return schedule;
}

async function deleteCollectionOnce(
  collection: FirebaseFirestore.CollectionReference,
  label: string,
) {
  const environment = configureMultiplayerFirestoreEnvironment();
  const snapshot = await withMultiplayerFirestoreTimeout(
    collection.get(),
    `read ${label}`,
    environment,
    30_000,
  );

  if (snapshot.empty) {
    return 0;
  }

  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();

  snapshot.docs.forEach((document) => {
    batch.delete(document.ref);
  });

  await withMultiplayerFirestoreTimeout(batch.commit(), `clear ${label}`, environment, 30_000);

  return snapshot.size;
}

async function writePlayabilityAssignments(assignments: PlayabilityManagerAssignment[]) {
  const environment = configureMultiplayerFirestoreEnvironment();
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const createdAt = new Date().toISOString();
  const batch = firestore.batch();

  assignments.forEach((assignment) => {
    batch.set(
      leagueRef.collection("memberships").doc(assignment.userId),
      createMembership({ assignment, createdAt }),
      { merge: true },
    );
    batch.set(
      firestore.collection("leagueMembers").doc(`${MULTIPLAYER_TEST_LEAGUE_ID}_${assignment.userId}`),
      createMirror({ assignment, createdAt }),
      { merge: true },
    );
    batch.set(
      leagueRef.collection("teams").doc(assignment.teamId),
      {
        assignedUserId: assignment.userId,
        status: "assigned",
        updatedAt: createdAt,
      },
      { merge: true },
    );
  });

  batch.set(
    leagueRef.collection("events").doc("playability-seed-memberships"),
    {
      createdAt,
      createdByUserId: PLAYABILITY_SEED_ACTOR_ID,
      payload: {
        assignmentCount: assignments.length,
        seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
        teamIds: assignments.map((assignment) => assignment.teamId),
        testData: true,
      },
      type: "playability_seed_memberships",
    },
    { merge: true },
  );

  await withMultiplayerFirestoreTimeout(
    batch.commit(),
    "write playability memberships",
    environment,
    30_000,
  );

  return {
    assignmentCount: assignments.length,
    teamIds: assignments.map((assignment) => assignment.teamId),
    userIds: assignments.map((assignment) => assignment.userId),
  };
}

async function normalizePlayabilityWeekState(assignments: PlayabilityManagerAssignment[]) {
  const environment = configureMultiplayerFirestoreEnvironment();
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const updatedAt = new Date().toISOString();
  const [deletedWeeks, deletedLocks] = await Promise.all([
    deleteCollectionOnce(leagueRef.collection("weeks"), "playability weeks"),
    deleteCollectionOnce(leagueRef.collection("adminActionLocks"), "playability admin action locks"),
  ]);

  await withMultiplayerFirestoreTimeout(
    leagueRef.set(
      {
        completedWeeks: [],
        currentSeason: 1,
        currentWeek: 1,
        lastSimulatedWeekKey: FieldValue.delete(),
        matchResults: [],
        memberCount: assignments.length,
        schedule: createPlayabilitySchedule(),
        standings: [],
        status: "active",
        updatedAt,
        version: FieldValue.increment(1),
        weekStatus: "pre_week",
        settings: {
          currentPhase: "roster_ready",
          draftExecuted: true,
          foundationStatus: "roster_ready",
          gamePhase: "pre_week",
          leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
          onlineBackbone: true,
          phase: "roster_ready",
          playabilitySeededAt: updatedAt,
          rosterReady: true,
          seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
          testData: true,
        },
      },
      { merge: true },
    ),
    "normalize playability week state",
    environment,
    30_000,
  );

  return {
    currentWeek: 1,
    deletedLocks,
    deletedWeeks,
    scheduleGames: createPlayabilitySchedule().length,
    weekStatus: "pre_week",
  };
}

async function validatePlayabilitySeed(assignments: PlayabilityManagerAssignment[]) {
  const environment = configureMultiplayerFirestoreEnvironment();
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const draftRef = leagueRef.collection("draft").doc("main");
  const [leagueSnapshot, draftSnapshot, membershipsSnapshot, teamsSnapshot] = await Promise.all([
    withMultiplayerFirestoreTimeout(leagueRef.get(), "validate playability league", environment, 30_000),
    withMultiplayerFirestoreTimeout(draftRef.get(), "validate playability draft", environment, 30_000),
    withMultiplayerFirestoreTimeout(
      leagueRef.collection("memberships").get(),
      "validate playability memberships",
      environment,
      30_000,
    ),
    withMultiplayerFirestoreTimeout(
      leagueRef.collection("teams").get(),
      "validate playability teams",
      environment,
      30_000,
    ),
  ]);
  const league = leagueSnapshot.data();
  const draft = draftSnapshot.data();
  const memberships = membershipsSnapshot.docs.map((document) => document.data());
  const teams = teamsSnapshot.docs.map((document) => document.data());
  const issues: string[] = [];
  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const assignedTeamIds = new Set(assignments.map((assignment) => assignment.teamId));

  if (!leagueSnapshot.exists || league?.settings?.testData !== true) {
    issues.push("Playability league is missing test-data safety markers.");
  }

  if (league?.currentWeek !== 1 || league?.weekStatus !== "pre_week") {
    issues.push("Playability league is not reset to currentWeek=1/pre_week.");
  }

  if (!Array.isArray(league?.schedule) || league.schedule.length < 1) {
    issues.push("Playability schedule is missing.");
  }

  if (!Array.isArray(league?.matchResults) || league.matchResults.length !== 0) {
    issues.push("Playability results must start empty.");
  }

  if (draft?.status !== "completed") {
    issues.push(`Playability draft must be completed, got ${draft?.status ?? "<missing>"}.`);
  }

  if (activeMemberships.length < 2) {
    issues.push(`Expected at least 2 active memberships, found ${activeMemberships.length}.`);
  }

  for (const assignment of assignments) {
    const team = teams.find((candidate) => candidate.id === assignment.teamId);

    if (!team || team.assignedUserId !== assignment.userId || team.status !== "assigned") {
      issues.push(`Team assignment is invalid for ${assignment.teamId}.`);
    }

    if (!assignedTeamIds.has(assignment.teamId)) {
      issues.push(`Assignment references unexpected team ${assignment.teamId}.`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    summary: {
      activeMembershipCount: activeMemberships.length,
      currentWeek: league?.currentWeek,
      draftStatus: draft?.status,
      scheduleGames: Array.isArray(league?.schedule) ? league.schedule.length : 0,
      teamCount: teams.length,
      weekStatus: league?.weekStatus,
    },
  };
}

export async function seedMultiplayerPlayabilityStaging() {
  requireStagingPlayabilitySeedConfirmation();
  const environment = configureMultiplayerFirestoreEnvironment();
  logMultiplayerFirestoreEnvironment(environment, "seed multiplayer playability staging");

  if (environment.mode !== "staging") {
    throw new Error("Playability seed is restricted to staging mode.");
  }

  const assignments = getPlayabilityAssignments();
  const foundation = await resetAndSeedMultiplayerTestLeague();
  const membershipAssignments = await writePlayabilityAssignments(assignments);
  const autoDraft = await autoDraftMultiplayerTestLeague();
  const finalized = await finalizeMultiplayerAutoDraftState();
  const weekState = await normalizePlayabilityWeekState(assignments);
  const validation = await validatePlayabilitySeed(assignments);

  if (!validation.ok) {
    throw new Error(`Playability seed validation failed: ${validation.issues.join("; ")}`);
  }

  return {
    autoDraft: {
      freeAgentCount: autoDraft.freeAgentCount,
      rosterTeams: autoDraft.teamRosters.length,
    },
    finalized,
    foundation: {
      draftStatus: foundation.draft.status,
      playerCount: foundation.players.count,
      teamCount: foundation.league.teamCount,
    },
    leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
    memberships: membershipAssignments,
    validation: validation.summary,
    weekState,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMultiplayerPlayabilityStaging()
    .then((summary) => {
      console.log("Multiplayer playability staging seed completed.");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
