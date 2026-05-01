import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineDraftAvailablePlayerDoc,
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "../../src/lib/online/types";
import type { OnlineContractPlayer } from "../../src/lib/online/online-league-types";
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

const FINALIZE_ACTOR_ID = "server-existing-league-finalize-repair";
const REQUIRED_ROSTER_SIZE = 53;
const REQUIRED_TEAM_COUNT = 8;

type RosterPlayerWithTeamId = OnlineContractPlayer & { teamId?: string };
type TeamDocWithManager = FirestoreOnlineTeamDoc & { managerUserId?: string | null };

type MembershipRepairAction = {
  userId: string;
  teamId: string;
  repairedMirror: boolean;
  repairedTeamAssignment: boolean;
};

type RosterRepairAction = {
  teamId: string;
  repairedPlayerTeamIds: number;
};

export type FinalizeExistingLeaguePlan = {
  managerTeamsRetained: Array<{ teamId: string; userId: string; displayName: string }>;
  membershipRepairs: MembershipRepairAction[];
  rosterRepairs: RosterRepairAction[];
  unsafeIssues: string[];
  validation: {
    teamCount: number;
    teamsWithCompleteRosters: number;
    duplicatePlayerIds: string[];
    invalidRosterReferences: string[];
  };
};

export type MultiplayerFinalizeExistingLeagueSummary = {
  leagueId: string;
  managerTeamsRetained: FinalizeExistingLeaguePlan["managerTeamsRetained"];
  repairedMembershipMirrors: MembershipRepairAction[];
  repairedTeamAssignments: MembershipRepairAction[];
  repairedRosterTeamIds: RosterRepairAction[];
  draftState: {
    before: Pick<FirestoreOnlineDraftStateDoc, "status" | "completedAt" | "currentTeamId"> & {
      availablePlayerCount: number;
    };
    after: {
      status: "completed";
      completedAt: string;
      currentTeamId: string;
      availablePlayerCount: number;
    };
  };
  leagueState: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  menuRelevantStatusFields: Record<string, unknown>;
  validation: FinalizeExistingLeaguePlan["validation"];
};

function requireStagingConfirmation() {
  if (process.env.USE_FIRESTORE_EMULATOR !== "false") {
    throw new Error("Existing league finalize requires USE_FIRESTORE_EMULATOR=false.");
  }

  if (process.env.GOOGLE_CLOUD_PROJECT !== "afbm-staging") {
    throw new Error("Existing league finalize requires GOOGLE_CLOUD_PROJECT=afbm-staging.");
  }

  if (process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error("Existing league finalize requires CONFIRM_STAGING_SEED=true.");
  }
}

export function createLeagueMemberMirror(input: {
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

function getActiveRoster(team: FirestoreOnlineTeamDoc) {
  return (team.contractRoster ?? []).filter((player) => player.status === "active");
}

export function validateRosterState(teams: FirestoreOnlineTeamDoc[]) {
  const seenPlayerIds = new Set<string>();
  const duplicatePlayerIds = new Set<string>();
  const invalidRosterReferences: string[] = [];
  let teamsWithCompleteRosters = 0;

  teams.forEach((team) => {
    const activeRoster = getActiveRoster(team) as RosterPlayerWithTeamId[];

    if (activeRoster.length === REQUIRED_ROSTER_SIZE) {
      teamsWithCompleteRosters += 1;
    } else {
      invalidRosterReferences.push(
        `${team.id}:expected-${REQUIRED_ROSTER_SIZE}-active-players-found-${activeRoster.length}`,
      );
    }

    activeRoster.forEach((player) => {
      if (!player.playerId) {
        invalidRosterReferences.push(`${team.id}:missing-player-id`);
        return;
      }

      if (seenPlayerIds.has(player.playerId)) {
        duplicatePlayerIds.add(player.playerId);
      }
      seenPlayerIds.add(player.playerId);

      if (player.teamId && player.teamId !== team.id) {
        invalidRosterReferences.push(`${team.id}:${player.playerId}:teamId-${player.teamId}`);
      }
    });
  });

  return {
    teamCount: teams.length,
    teamsWithCompleteRosters,
    duplicatePlayerIds: Array.from(duplicatePlayerIds).sort(),
    invalidRosterReferences,
  };
}

export function buildFinalizeExistingLeaguePlan(input: {
  teams: FirestoreOnlineTeamDoc[];
  memberships: FirestoreOnlineMembershipDoc[];
  mirrors: FirestoreLeagueMemberMirrorDoc[];
  now: string;
}): FinalizeExistingLeaguePlan {
  const teamsById = new Map(input.teams.map((team) => [team.id, team as TeamDocWithManager]));
  const mirrorsById = new Map(input.mirrors.map((mirror) => [mirror.id, mirror]));
  const activeMemberships = input.memberships.filter(
    (membership) => membership.status === "active" && membership.teamId,
  );
  const unsafeIssues: string[] = [];
  const membershipRepairs: MembershipRepairAction[] = [];
  const managerTeamsRetained: FinalizeExistingLeaguePlan["managerTeamsRetained"] = [];
  const rosterRepairs: RosterRepairAction[] = [];

  activeMemberships.forEach((membership) => {
    const team = teamsById.get(membership.teamId);

    if (!team) {
      unsafeIssues.push(`${membership.userId}:membership-team-missing:${membership.teamId}`);
      return;
    }

    if (team.assignedUserId && team.assignedUserId !== membership.userId) {
      unsafeIssues.push(
        `${membership.userId}:assignedUserId-conflict:${membership.teamId}:${team.assignedUserId}`,
      );
      return;
    }

    if (team.managerUserId && team.managerUserId !== membership.userId) {
      unsafeIssues.push(
        `${membership.userId}:managerUserId-conflict:${membership.teamId}:${team.managerUserId}`,
      );
      return;
    }

    const expectedMirror = createLeagueMemberMirror({
      leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
      leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
      membership,
      now: input.now,
    });
    const repairedMirror = mirrorNeedsRepair(mirrorsById.get(expectedMirror.id), expectedMirror);
    const repairedTeamAssignment =
      team.assignedUserId !== membership.userId ||
      team.managerUserId !== membership.userId ||
      team.status !== "assigned";

    managerTeamsRetained.push({
      teamId: team.id,
      userId: membership.userId,
      displayName: team.displayName,
    });

    if (repairedMirror || repairedTeamAssignment) {
      membershipRepairs.push({
        userId: membership.userId,
        teamId: membership.teamId,
        repairedMirror,
        repairedTeamAssignment,
      });
    }
  });

  input.teams.forEach((team) => {
    const activeRoster = getActiveRoster(team) as RosterPlayerWithTeamId[];
    const repairedPlayerTeamIds = activeRoster.filter((player) => player.teamId !== team.id).length;

    if (repairedPlayerTeamIds > 0) {
      rosterRepairs.push({ teamId: team.id, repairedPlayerTeamIds });
    }
  });

  const validation = validateRosterState(input.teams);

  if (validation.teamCount !== REQUIRED_TEAM_COUNT) {
    unsafeIssues.push(`expected-${REQUIRED_TEAM_COUNT}-teams-found-${validation.teamCount}`);
  }

  if (validation.teamsWithCompleteRosters !== REQUIRED_TEAM_COUNT) {
    unsafeIssues.push(
      `expected-${REQUIRED_TEAM_COUNT}-complete-rosters-found-${validation.teamsWithCompleteRosters}`,
    );
  }

  if (validation.duplicatePlayerIds.length > 0) {
    unsafeIssues.push(`duplicate-player-ids:${validation.duplicatePlayerIds.join(",")}`);
  }

  const wrongTeamIdReferences = validation.invalidRosterReferences.filter((issue) =>
    issue.includes(":teamId-"),
  );
  if (wrongTeamIdReferences.length > 0) {
    unsafeIssues.push(`wrong-roster-team-ids:${wrongTeamIdReferences.join(",")}`);
  }

  return {
    managerTeamsRetained,
    membershipRepairs,
    rosterRepairs,
    unsafeIssues,
    validation,
  };
}

function summarizeLeagueState(league: FirestoreOnlineLeagueDoc) {
  return {
    status: league.status,
    weekStatus: league.weekStatus,
    foundationStatus: league.settings?.foundationStatus,
    phase: league.settings?.phase,
    currentPhase: league.settings?.currentPhase,
    gamePhase: league.settings?.gamePhase,
    rosterReady: league.settings?.rosterReady,
    draftExecuted: league.settings?.draftExecuted,
  };
}

function addTeamIdToRoster(team: FirestoreOnlineTeamDoc): OnlineContractPlayer[] {
  return (team.contractRoster ?? []).map((player) =>
    player.status === "active" ? { ...player, teamId: team.id } : player,
  );
}

export async function finalizeExistingMultiplayerLeagueStaging(): Promise<MultiplayerFinalizeExistingLeagueSummary> {
  requireStagingConfirmation();
  const environment = configureMultiplayerFirestoreEnvironment();
  logMultiplayerFirestoreEnvironment(environment, "finalize existing multiplayer staging league");

  if (environment.mode !== "staging") {
    throw new Error("Existing league finalize is restricted to staging mode.");
  }

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const draftRef = leagueRef.collection("draft").doc("main");

  const [leagueSnapshot, draftSnapshot, teamsSnapshot, membershipsSnapshot, mirrorsSnapshot, availablePlayersSnapshot] =
    await Promise.all([
      withMultiplayerFirestoreTimeout(leagueRef.get(), "read multiplayer test league", environment, 30_000),
      withMultiplayerFirestoreTimeout(draftRef.get(), "read multiplayer draft state", environment, 30_000),
      withMultiplayerFirestoreTimeout(leagueRef.collection("teams").get(), "read multiplayer teams", environment, 30_000),
      withMultiplayerFirestoreTimeout(
        leagueRef.collection("memberships").get(),
        "read multiplayer league memberships",
        environment,
        30_000,
      ),
      withMultiplayerFirestoreTimeout(
        firestore.collection("leagueMembers").where("leagueId", "==", MULTIPLAYER_TEST_LEAGUE_ID).get(),
        "read global league member mirrors",
        environment,
        30_000,
      ),
      withMultiplayerFirestoreTimeout(
        draftRef.collection("availablePlayers").get(),
        "read draft available players",
        environment,
        30_000,
      ),
    ]);

  if (!leagueSnapshot.exists) {
    throw new Error(`League ${MULTIPLAYER_TEST_LEAGUE_ID} does not exist.`);
  }

  if (!draftSnapshot.exists) {
    throw new Error(`Draft state for ${MULTIPLAYER_TEST_LEAGUE_ID} does not exist.`);
  }

  const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc;
  const draft = draftSnapshot.data() as FirestoreOnlineDraftStateDoc;
  const teams = teamsSnapshot.docs.map((document) => document.data() as FirestoreOnlineTeamDoc);
  const memberships = membershipsSnapshot.docs.map((document) => document.data() as FirestoreOnlineMembershipDoc);
  const mirrors = mirrorsSnapshot.docs.map((document) => document.data() as FirestoreLeagueMemberMirrorDoc);
  const availablePlayers = availablePlayersSnapshot.docs.map(
    (document) => document.data() as FirestoreOnlineDraftAvailablePlayerDoc,
  );

  if (league.id !== MULTIPLAYER_TEST_LEAGUE_ID || league.settings?.testData !== true) {
    throw new Error("Refusing to finalize a non-test multiplayer league.");
  }

  const now = new Date().toISOString();
  const plan = buildFinalizeExistingLeaguePlan({
    teams,
    memberships,
    mirrors,
    now,
  });

  if (plan.unsafeIssues.length > 0) {
    throw new Error(`Refusing unsafe finalize repair: ${JSON.stringify(plan.unsafeIssues)}`);
  }

  const leagueStateBefore = summarizeLeagueState(league);
  const completedAt = draft.completedAt ?? now;
  const batch = firestore.batch();

  plan.membershipRepairs.forEach((repair) => {
    const membership = memberships.find((entry) => entry.userId === repair.userId);
    if (!membership) {
      return;
    }

    if (repair.repairedMirror) {
      const mirror = createLeagueMemberMirror({
        leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
        leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        membership,
        now,
      });
      batch.set(firestore.collection("leagueMembers").doc(mirror.id), mirror, { merge: true });
    }

    if (repair.repairedTeamAssignment) {
      batch.set(
        leagueRef.collection("teams").doc(repair.teamId),
        {
          assignedUserId: repair.userId,
          managerUserId: repair.userId,
          status: "assigned",
          updatedAt: now,
        },
        { merge: true },
      );
    }
  });

  plan.rosterRepairs.forEach((repair) => {
    const team = teams.find((entry) => entry.id === repair.teamId);
    if (!team) {
      return;
    }

    batch.set(
      leagueRef.collection("teams").doc(repair.teamId),
      {
        contractRoster: addTeamIdToRoster(team),
        updatedAt: now,
      },
      { merge: true },
    );
  });

  availablePlayersSnapshot.docs.forEach((document) => {
    const player = document.data() as FirestoreOnlineDraftAvailablePlayerDoc;
    if (player.status !== "free_agent") {
      batch.set(document.ref, { status: "free_agent" }, { merge: true });
    }
  });

  batch.set(
    draftRef,
    {
      status: "completed",
      completedAt,
      currentTeamId: "",
      seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
      testData: true,
      leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
      createdBySeed: true,
    },
    { merge: true },
  );
  batch.set(
    leagueRef,
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
        finalizedExistingLeagueAt: now,
        seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
        testData: true,
        leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        createdBySeed: true,
      },
      version: FieldValue.increment(1),
    },
    { merge: true },
  );
  batch.set(leagueRef.collection("events").doc("foundation-existing-league-finalized"), {
    type: "existing_league_finalized",
    createdAt: now,
    createdByUserId: FINALIZE_ACTOR_ID,
    payload: {
      managerTeamsRetained: plan.managerTeamsRetained,
      repairedMembershipCount: plan.membershipRepairs.length,
      repairedRosterTeamIds: plan.rosterRepairs.map((repair) => repair.teamId),
      draftStatusBefore: draft.status,
      leagueStatusBefore: league.status,
      foundationStatusAfter: "roster_ready",
      seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
      testData: true,
    },
  });

  await withMultiplayerFirestoreTimeout(
    batch.commit(),
    "finalize existing multiplayer staging league",
    environment,
    30_000,
  );

  const leagueStateAfter = {
    status: "active",
    weekStatus: "pre_week",
    foundationStatus: "roster_ready",
    phase: "roster_ready",
    currentPhase: "roster_ready",
    gamePhase: "pre_week",
    rosterReady: true,
    draftExecuted: true,
  };

  return {
    leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
    managerTeamsRetained: plan.managerTeamsRetained,
    repairedMembershipMirrors: plan.membershipRepairs.filter((repair) => repair.repairedMirror),
    repairedTeamAssignments: plan.membershipRepairs.filter((repair) => repair.repairedTeamAssignment),
    repairedRosterTeamIds: plan.rosterRepairs,
    draftState: {
      before: {
        status: draft.status,
        completedAt: draft.completedAt,
        currentTeamId: draft.currentTeamId,
        availablePlayerCount: availablePlayers.length,
      },
      after: {
        status: "completed",
        completedAt,
        currentTeamId: "",
        availablePlayerCount: availablePlayers.length,
      },
    },
    leagueState: {
      before: leagueStateBefore,
      after: leagueStateAfter,
    },
    menuRelevantStatusFields: leagueStateAfter,
    validation: plan.validation,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  finalizeExistingMultiplayerLeagueStaging()
    .then((summary) => {
      console.log("Existing multiplayer staging league finalized:");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
