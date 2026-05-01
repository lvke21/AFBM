import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineDraftAvailablePlayerDoc,
  FirestoreOnlineDraftPickDoc,
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "../../src/lib/online/types";
import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
} from "../../src/lib/online/online-league-types";
import {
  MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
} from "./multiplayer-player-pool-firestore-seed";
import {
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
  MULTIPLAYER_TEST_LEAGUE_TEAMS,
} from "./multiplayer-test-league-firestore-seed";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./multiplayer-firestore-env";

const AUTO_DRAFT_ACTOR_ID = "server-auto-draft-backfill";
const AUTO_DRAFT_COMPLETED_AT = "2026-05-01T12:00:00.000Z";
const ROSTER_TARGETS: Record<string, number> = {
  QB: 3,
  RB: 4,
  WR: 7,
  TE: 3,
  OL: 10,
  DL: 8,
  LB: 6,
  CB: 6,
  S: 4,
  K: 1,
  P: 1,
};
const TARGET_TEAM_COUNT = 8;
const TARGET_ROSTER_SIZE = Object.values(ROSTER_TARGETS).reduce((sum, count) => sum + count, 0);

type ProtectedManagerAssignment = {
  teamId: string;
  assignedUserId: string;
  membershipUserId: string;
  membershipTeamId: string;
  mirrorId: string;
  mirrorTeamId: string;
  mirrorUserId: string;
};

type TeamRosterSummary = {
  teamId: string;
  displayName: string;
  playerCount: number;
  averageOverall: number;
  positions: Record<string, number>;
};

type AutoDraftPlan = {
  teams: FirestoreOnlineTeamDoc[];
  addedTeams: FirestoreOnlineTeamDoc[];
  picks: FirestoreOnlineDraftPickDoc[];
  rostersByTeamId: Map<string, OnlineContractPlayer[]>;
  freeAgents: FirestoreOnlineDraftAvailablePlayerDoc[];
  draftState: FirestoreOnlineDraftStateDoc;
};

export type MultiplayerAutoDraftSummary = {
  leagueId: string;
  before: {
    teamCount: number;
    membershipCount: number;
    managerTeamCount: number;
    availablePlayerCount: number;
    existingPickCount: number;
  };
  preservedManagerTeams: ProtectedManagerAssignment[];
  addedTeams: Array<{ teamId: string; displayName: string }>;
  teamRosters: TeamRosterSummary[];
  freeAgentCount: number;
  validation: {
    ok: boolean;
    issues: string[];
  };
};

function requireStagingConfirmation() {
  if (process.env.USE_FIRESTORE_EMULATOR !== "false") {
    throw new Error("Auto-draft staging backfill requires USE_FIRESTORE_EMULATOR=false.");
  }

  if (process.env.GOOGLE_CLOUD_PROJECT !== "afbm-staging") {
    throw new Error("Auto-draft staging backfill requires GOOGLE_CLOUD_PROJECT=afbm-staging.");
  }

  if (process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error("Auto-draft staging backfill requires CONFIRM_STAGING_SEED=true.");
  }
}

function toSeedTeamDoc(team: (typeof MULTIPLAYER_TEST_LEAGUE_TEAMS)[number]): FirestoreOnlineTeamDoc {
  return {
    id: team.id,
    cityId: team.id.split("-")[0],
    cityName: team.city,
    teamNameId: team.name.toLowerCase(),
    teamName: team.name,
    displayName: `${team.city} ${team.name}`,
    contractRoster: [],
    depthChart: [],
    assignedUserId: null,
    status: "ai",
    createdAt: AUTO_DRAFT_COMPLETED_AT,
    updatedAt: AUTO_DRAFT_COMPLETED_AT,
    abbreviation: team.abbreviation,
    branding: {
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
    },
    draftStatus: "ready",
    seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
    testData: true,
    leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
    createdBySeed: true,
  } as FirestoreOnlineTeamDoc;
}

function completeTeams(existingTeams: FirestoreOnlineTeamDoc[]) {
  const teamsById = new Map(existingTeams.map((team) => [team.id, team]));
  const addedTeams: FirestoreOnlineTeamDoc[] = [];

  for (const seedTeam of MULTIPLAYER_TEST_LEAGUE_TEAMS) {
    if (teamsById.size >= TARGET_TEAM_COUNT) {
      break;
    }

    if (!teamsById.has(seedTeam.id)) {
      const teamDoc = toSeedTeamDoc(seedTeam);
      teamsById.set(teamDoc.id, teamDoc);
      addedTeams.push(teamDoc);
    }
  }

  const completedTeams = Array.from(teamsById.values());

  if (completedTeams.length !== TARGET_TEAM_COUNT) {
    throw new Error(`Expected ${TARGET_TEAM_COUNT} teams after backfill, got ${completedTeams.length}.`);
  }

  return {
    teams: completedTeams,
    addedTeams,
  };
}

function uniquePlayers(players: OnlineContractPlayer[]) {
  const playersById = new Map<string, OnlineContractPlayer>();

  players.forEach((player) => {
    if (!playersById.has(player.playerId)) {
      playersById.set(player.playerId, player);
    }
  });

  return Array.from(playersById.values());
}

function collectPlayers(input: {
  availablePlayers: FirestoreOnlineDraftAvailablePlayerDoc[];
  picks: FirestoreOnlineDraftPickDoc[];
  teams: FirestoreOnlineTeamDoc[];
}) {
  return uniquePlayers([
    ...input.availablePlayers,
    ...input.picks.flatMap((pick) => (pick.playerSnapshot ? [pick.playerSnapshot] : [])),
    ...input.teams.flatMap((team) => team.contractRoster ?? []),
  ]);
}

function getTeamIdForPick(draftOrder: string[], pickIndex: number) {
  const roundIndex = Math.floor(pickIndex / draftOrder.length);
  const indexInRound = pickIndex % draftOrder.length;
  const order = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();

  return order[indexInRound] ?? "";
}

function createDepthChart(roster: OnlineContractPlayer[]): OnlineDepthChartEntry[] {
  return Object.keys(ROSTER_TARGETS).map((position) => {
    const players = roster
      .filter((player) => player.position === position)
      .sort((left, right) => right.overall - left.overall || left.playerId.localeCompare(right.playerId));

    return {
      position,
      starterPlayerId: players[0]?.playerId ?? "",
      backupPlayerIds: players.slice(1).map((player) => player.playerId),
      updatedAt: AUTO_DRAFT_COMPLETED_AT,
    };
  });
}

export function createAutoDraftPlan(input: {
  existingTeams: FirestoreOnlineTeamDoc[];
  availablePlayers: FirestoreOnlineDraftAvailablePlayerDoc[];
  picks: FirestoreOnlineDraftPickDoc[];
}): AutoDraftPlan {
  const { teams, addedTeams } = completeTeams(input.existingTeams);
  const draftOrder = teams.map((team) => team.id);
  const allPlayers = collectPlayers({
    availablePlayers: input.availablePlayers,
    picks: input.picks,
    teams: input.existingTeams,
  });
  const rostersByTeamId = new Map<string, OnlineContractPlayer[]>(
    teams.map((team) => [team.id, []]),
  );
  const picks: FirestoreOnlineDraftPickDoc[] = [];
  const draftedPlayerIds = new Set<string>();
  let pickIndex = 0;

  for (const [position, targetCount] of Object.entries(ROSTER_TARGETS)) {
    const positionPlayers = allPlayers
      .filter((player) => player.position === position)
      .sort((left, right) => right.overall - left.overall || right.potential - left.potential || left.playerId.localeCompare(right.playerId));
    const neededCount = targetCount * TARGET_TEAM_COUNT;

    if (positionPlayers.length < neededCount) {
      throw new Error(`Not enough ${position} players for auto-draft: need ${neededCount}, found ${positionPlayers.length}.`);
    }

    for (let slot = 0; slot < neededCount; slot += 1) {
      const teamId = getTeamIdForPick(draftOrder, pickIndex);
      const player = positionPlayers[slot];

      if (!teamId || !player) {
        throw new Error(`Cannot create pick ${pickIndex + 1}.`);
      }

      const selectedPlayer: OnlineContractPlayer = {
        ...player,
        status: "active",
      };

      rostersByTeamId.get(teamId)?.push(selectedPlayer);
      draftedPlayerIds.add(player.playerId);
      picks.push({
        pickNumber: pickIndex + 1,
        round: Math.floor(pickIndex / TARGET_TEAM_COUNT) + 1,
        teamId,
        playerId: player.playerId,
        pickedByUserId: AUTO_DRAFT_ACTOR_ID,
        timestamp: AUTO_DRAFT_COMPLETED_AT,
        draftRunId: MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
        playerSnapshot: selectedPlayer,
      });
      pickIndex += 1;
    }
  }

  const freeAgents = allPlayers
    .filter((player) => !draftedPlayerIds.has(player.playerId))
    .map((player) => ({
      ...player,
      displayName: "displayName" in player ? String(player.displayName) : player.playerName,
      status: "free_agent" as const,
      draftRunId: MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
      seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
      testData: true,
      leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
      createdBySeed: true,
    }));

  return {
    teams,
    addedTeams,
    picks,
    rostersByTeamId,
    freeAgents,
    draftState: {
      leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
      status: "completed",
      round: Math.floor(picks.length / TARGET_TEAM_COUNT),
      pickNumber: picks.length,
      currentTeamId: "",
      draftOrder,
      startedAt: AUTO_DRAFT_COMPLETED_AT,
      completedAt: AUTO_DRAFT_COMPLETED_AT,
      draftRunId: MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
      seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
      testData: true,
      leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
      createdBySeed: true,
    },
  };
}

export function collectProtectedManagerAssignments(input: {
  teams: FirestoreOnlineTeamDoc[];
  memberships: FirestoreOnlineMembershipDoc[];
  mirrors: FirestoreLeagueMemberMirrorDoc[];
}): {
  protectedAssignments: ProtectedManagerAssignment[];
  issues: string[];
} {
  const membershipsByUserId = new Map(input.memberships.map((membership) => [membership.userId, membership]));
  const mirrorsByUserId = new Map(
    input.mirrors.map((mirror) => [mirror.userId || mirror.uid || mirror.id.split("_").slice(1).join("_"), mirror]),
  );
  const issues: string[] = [];
  const protectedAssignments: ProtectedManagerAssignment[] = [];

  input.teams
    .filter((team) => team.assignedUserId)
    .forEach((team) => {
      const assignedUserId = team.assignedUserId as string;
      const membership = membershipsByUserId.get(assignedUserId);
      const mirror = mirrorsByUserId.get(assignedUserId);

      if (!membership || membership.status !== "active") {
        issues.push(`Missing active membership for protected team ${team.id} and user ${assignedUserId}.`);
        return;
      }

      if (membership.teamId !== team.id) {
        issues.push(
          `Membership team mismatch for user ${assignedUserId}: team has ${team.id}, membership has ${membership.teamId}.`,
        );
        return;
      }

      if (!mirror || mirror.status !== "ACTIVE") {
        issues.push(`Missing active leagueMembers mirror for protected team ${team.id} and user ${assignedUserId}.`);
        return;
      }

      if (mirror.teamId !== team.id || mirror.userId !== assignedUserId) {
        issues.push(
          `Mirror mismatch for user ${assignedUserId}: team has ${team.id}, mirror has ${mirror.teamId}/${mirror.userId}.`,
        );
        return;
      }

      protectedAssignments.push({
        teamId: team.id,
        assignedUserId,
        membershipUserId: membership.userId,
        membershipTeamId: membership.teamId,
        mirrorId: mirror.id,
        mirrorTeamId: mirror.teamId,
        mirrorUserId: mirror.userId,
      });
    });

  return {
    protectedAssignments,
    issues,
  };
}

function summarizeRoster(team: FirestoreOnlineTeamDoc, roster: OnlineContractPlayer[]): TeamRosterSummary {
  const positions = roster.reduce<Record<string, number>>((counts, player) => {
    counts[player.position] = (counts[player.position] ?? 0) + 1;
    return counts;
  }, {});
  const averageOverall = roster.length > 0
    ? Math.round(roster.reduce((sum, player) => sum + player.overall, 0) / roster.length * 10) / 10
    : 0;

  return {
    teamId: team.id,
    displayName: team.displayName,
    playerCount: roster.length,
    averageOverall,
    positions,
  };
}

export function validateAutoDraft(input: {
  teams: FirestoreOnlineTeamDoc[];
  memberships: FirestoreOnlineMembershipDoc[];
  mirrors: FirestoreLeagueMemberMirrorDoc[];
  preservedManagerTeams: ProtectedManagerAssignment[];
  plan: AutoDraftPlan;
}) {
  const issues: string[] = [];
  const teamIds = input.teams.map((team) => team.id);
  const pickedPlayerIds = input.plan.picks.map((pick) => pick.playerId);
  const mirrorsById = new Map(input.mirrors.map((mirror) => [mirror.id, mirror]));

  if (input.teams.length !== TARGET_TEAM_COUNT) {
    issues.push(`Expected ${TARGET_TEAM_COUNT} teams, found ${input.teams.length}.`);
  }

  if (new Set(teamIds).size !== teamIds.length) {
    issues.push("Duplicate team IDs found.");
  }

  for (const preserved of input.preservedManagerTeams) {
    const team = input.teams.find((candidate) => candidate.id === preserved.teamId);
    const membership = input.memberships.find((candidate) => candidate.userId === preserved.membershipUserId);

    if (team?.assignedUserId !== preserved.assignedUserId) {
      issues.push(`Manager assignment changed for team ${preserved.teamId}.`);
    }

    if (!membership || membership.teamId !== preserved.teamId) {
      issues.push(`Membership changed for user ${preserved.membershipUserId}.`);
    }

    const mirror = mirrorsById.get(preserved.mirrorId);

    if (
      !mirror ||
      mirror.userId !== preserved.mirrorUserId ||
      mirror.teamId !== preserved.mirrorTeamId ||
      mirror.status !== "ACTIVE"
    ) {
      issues.push(`League member mirror changed for user ${preserved.membershipUserId}.`);
    }
  }

  if (new Set(pickedPlayerIds).size !== pickedPlayerIds.length) {
    issues.push("Duplicate drafted player IDs found.");
  }

  for (const team of input.teams) {
    const roster = input.plan.rostersByTeamId.get(team.id) ?? [];

    if (roster.length !== TARGET_ROSTER_SIZE) {
      issues.push(`Team ${team.id} has ${roster.length} players, expected ${TARGET_ROSTER_SIZE}.`);
    }

    for (const [position, targetCount] of Object.entries(ROSTER_TARGETS)) {
      const actualCount = roster.filter((player) => player.position === position).length;

      if (actualCount < targetCount) {
        issues.push(`Team ${team.id} has ${actualCount} ${position}, expected at least ${targetCount}.`);
      }
    }
  }

  if (input.plan.draftState.status !== "completed") {
    issues.push("Draft state is not completed.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

async function commitInChunks(
  operations: Array<(batch: FirebaseFirestore.WriteBatch) => void>,
  label: string,
) {
  const firestore = getFirebaseAdminFirestore();
  const environment = configureMultiplayerFirestoreEnvironment();

  for (let index = 0; index < operations.length; index += 430) {
    const batch = firestore.batch();

    operations.slice(index, index + 430).forEach((operation) => operation(batch));
    await withMultiplayerFirestoreTimeout(
      batch.commit(),
      `${label} chunk ${index / 430 + 1}`,
      environment,
      30_000,
    );
  }
}

export async function autoDraftMultiplayerTestLeague(): Promise<MultiplayerAutoDraftSummary> {
  requireStagingConfirmation();
  const environment = configureMultiplayerFirestoreEnvironment();
  logMultiplayerFirestoreEnvironment(environment, "auto-draft multiplayer test league");

  if (environment.mode !== "staging") {
    throw new Error("Auto-draft backfill is restricted to staging mode.");
  }

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const draftRef = leagueRef.collection("draft").doc("main");
  const [
    leagueSnapshot,
    teamsSnapshot,
    membershipsSnapshot,
    mirrorsSnapshot,
    availablePlayersSnapshot,
    picksSnapshot,
  ] = await Promise.all([
    withMultiplayerFirestoreTimeout(leagueRef.get(), "read multiplayer test league", environment, 30_000),
    withMultiplayerFirestoreTimeout(leagueRef.collection("teams").get(), "read multiplayer teams", environment, 30_000),
    withMultiplayerFirestoreTimeout(leagueRef.collection("memberships").get(), "read multiplayer memberships", environment, 30_000),
    withMultiplayerFirestoreTimeout(
      firestore.collection("leagueMembers").where("leagueId", "==", MULTIPLAYER_TEST_LEAGUE_ID).get(),
      "read multiplayer league member mirrors",
      environment,
      30_000,
    ),
    withMultiplayerFirestoreTimeout(draftRef.collection("availablePlayers").get(), "read multiplayer players", environment, 30_000),
    withMultiplayerFirestoreTimeout(draftRef.collection("picks").get(), "read multiplayer picks", environment, 30_000),
  ]);

  if (!leagueSnapshot.exists) {
    throw new Error(`League ${MULTIPLAYER_TEST_LEAGUE_ID} does not exist.`);
  }

  const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc;

  if (league.id !== MULTIPLAYER_TEST_LEAGUE_ID || league.settings?.testData !== true) {
    throw new Error("Refusing to auto-draft a non-test multiplayer league.");
  }

  const existingTeams = teamsSnapshot.docs.map((document) => document.data() as FirestoreOnlineTeamDoc);
  const memberships = membershipsSnapshot.docs.map((document) => document.data() as FirestoreOnlineMembershipDoc);
  const mirrors = mirrorsSnapshot.docs.map((document) => document.data() as FirestoreLeagueMemberMirrorDoc);
  const availablePlayers = availablePlayersSnapshot.docs.map(
    (document) => document.data() as FirestoreOnlineDraftAvailablePlayerDoc,
  );
  const existingPicks = picksSnapshot.docs.map((document) => document.data() as FirestoreOnlineDraftPickDoc);
  const protectedManagerState = collectProtectedManagerAssignments({
    teams: existingTeams,
    memberships,
    mirrors,
  });

  if (protectedManagerState.issues.length > 0) {
    throw new Error(
      `Auto-draft found unsafe manager assignments before write: ${protectedManagerState.issues.join("; ")}`,
    );
  }

  const preservedManagerTeams = protectedManagerState.protectedAssignments;
  const plan = createAutoDraftPlan({
    existingTeams,
    availablePlayers,
    picks: existingPicks,
  });
  const validation = validateAutoDraft({
    teams: plan.teams.map((team) => ({
      ...team,
      assignedUserId: existingTeams.find((existingTeam) => existingTeam.id === team.id)?.assignedUserId ?? team.assignedUserId,
    })),
    memberships,
    mirrors,
    preservedManagerTeams,
    plan,
  });

  if (!validation.ok) {
    throw new Error(`Auto-draft validation failed before write: ${validation.issues.join("; ")}`);
  }

  const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  const existingTeamById = new Map(existingTeams.map((team) => [team.id, team]));

  plan.teams.forEach((team) => {
    const existingTeam = existingTeamById.get(team.id);
    const roster = plan.rostersByTeamId.get(team.id) ?? [];

    operations.push((batch) => {
      batch.set(
        leagueRef.collection("teams").doc(team.id),
        {
          ...(existingTeam ? {} : team),
          contractRoster: roster,
          depthChart: createDepthChart(roster),
          assignedUserId: existingTeam?.assignedUserId ?? team.assignedUserId ?? null,
          status: existingTeam?.assignedUserId ? "assigned" : existingTeam?.status ?? team.status ?? "ai",
          updatedAt: AUTO_DRAFT_COMPLETED_AT,
          seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
          testData: true,
          leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
          createdBySeed: true,
        },
        { merge: true },
      );
    });
  });
  picksSnapshot.docs.forEach((document) => {
    operations.push((batch) => batch.delete(document.ref));
  });
  availablePlayersSnapshot.docs.forEach((document) => {
    operations.push((batch) => batch.delete(document.ref));
  });
  plan.picks.forEach((pick) => {
    operations.push((batch) => {
      batch.set(draftRef.collection("picks").doc(String(pick.pickNumber).padStart(4, "0")), pick);
    });
  });
  plan.freeAgents.forEach((player) => {
    operations.push((batch) => {
      batch.set(draftRef.collection("availablePlayers").doc(player.playerId), player);
    });
  });

  await commitInChunks(operations, "auto-draft multiplayer test league");

  await withMultiplayerFirestoreTimeout(
    Promise.all([
      draftRef.set(plan.draftState, { merge: true }),
      leagueRef.set(
        {
          status: "active",
          memberCount: memberships.filter((membership) => membership.status !== "removed").length,
          maxTeams: TARGET_TEAM_COUNT,
          updatedAt: AUTO_DRAFT_COMPLETED_AT,
          settings: {
            ...league.settings,
            foundationStatus: "roster_ready",
            phase: "roster_ready",
            currentPhase: "roster_ready",
            gamePhase: "pre_week",
            rosterReady: true,
            draftExecuted: true,
            autoDraftBackfilled: true,
            autoDraftCompletedAt: AUTO_DRAFT_COMPLETED_AT,
            draftRunId: MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
            seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
            testData: true,
            leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
            createdBySeed: true,
          },
          version: FieldValue.increment(1),
        },
        { merge: true },
      ),
      leagueRef.collection("events").doc("foundation-auto-draft-completed").set({
        type: "fantasy_draft_completed",
        createdAt: AUTO_DRAFT_COMPLETED_AT,
        createdByUserId: AUTO_DRAFT_ACTOR_ID,
        payload: {
          source: "multiplayer-auto-draft-staging",
          teamCount: TARGET_TEAM_COUNT,
          rosterSize: TARGET_ROSTER_SIZE,
          draftedPlayerCount: plan.picks.length,
          freeAgentCount: plan.freeAgents.length,
          addedTeamIds: plan.addedTeams.map((team) => team.id),
          seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
          testData: true,
        },
      }),
    ]),
    "finalize auto-draft multiplayer test league",
    environment,
    30_000,
  );

  return {
    leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
    before: {
      teamCount: existingTeams.length,
      membershipCount: memberships.length,
      managerTeamCount: preservedManagerTeams.length,
      availablePlayerCount: availablePlayers.length,
      existingPickCount: existingPicks.length,
    },
    preservedManagerTeams,
    addedTeams: plan.addedTeams.map((team) => ({
      teamId: team.id,
      displayName: team.displayName,
    })),
    teamRosters: plan.teams.map((team) => summarizeRoster(team, plan.rostersByTeamId.get(team.id) ?? [])),
    freeAgentCount: plan.freeAgents.length,
    validation,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  autoDraftMultiplayerTestLeague()
    .then((summary) => {
      console.log("Multiplayer auto-draft completed:");
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
