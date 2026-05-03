import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
} from "../../src/lib/firebase/admin";
import type { DocumentReference } from "firebase-admin/firestore";

import { ONLINE_MVP_TEAM_POOL } from "../../src/lib/online/online-league-service";
import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
} from "../../src/lib/online/online-league-types";
import { mapLocalTeamToFirestoreTeam } from "../../src/lib/online/types";
import {
  FIRESTORE_SEED_EMULATOR_HOST,
  FIRESTORE_SEED_PROJECT_ID,
  ensureFirestoreEmulatorEnvironment,
  withEmulatorOperationTimeout,
} from "./firestore-seed";

export const MULTIPLAYER_E2E_LEAGUE_ID = "e2e-multiplayer-league";
export const MULTIPLAYER_E2E_ADMIN_WEEK_LEAGUE_ID = "e2e-admin-week-league";
export const MULTIPLAYER_E2E_ADMIN_MISSING_ROSTER_LEAGUE_ID =
  "e2e-admin-missing-roster-league";
export const MULTIPLAYER_E2E_ADMIN_INVALID_DEPTH_LEAGUE_ID =
  "e2e-admin-invalid-depth-league";
export const MULTIPLAYER_E2E_ADMIN_BROKEN_SCHEDULE_LEAGUE_ID =
  "e2e-admin-broken-schedule-league";
export const MULTIPLAYER_E2E_NO_TEAM_LEAGUE_ID = "e2e-no-team-league";
export const MULTIPLAYER_E2E_NO_ROSTER_LEAGUE_ID = "e2e-no-roster-league";
export const MULTIPLAYER_E2E_REJOIN_LEAGUE_ID = "e2e-rejoin-league";
export const MULTIPLAYER_E2E_RACE_LEAGUE_ID = "e2e-race-league";
export const MULTIPLAYER_E2E_STALE_TEAM_LEAGUE_ID = "e2e-stale-team-league";
const E2E_ADMIN_UID = "KFy5PrqAzzP7vRbfP4wIDamzbh43";
const E2E_ADMIN_EMAIL = "afbm-admin-e2e@example.test";
const E2E_ADMIN_PASSWORD = "AFBM-e2e-admin-pass-123!";
const E2E_STATE_UID = "afbm-e2e-state-user";
const E2E_STATE_EMAIL = "afbm-state-e2e@example.test";
const E2E_STATE_PASSWORD = "AFBM-e2e-state-pass-123!";
const E2E_REJOIN_UID = "afbm-e2e-rejoin-user";
const E2E_REJOIN_EMAIL = "afbm-rejoin-e2e@example.test";
const E2E_REJOIN_PASSWORD = "AFBM-e2e-rejoin-pass-123!";
const createdAt = "2026-04-30T10:00:00.000Z";

async function clearNestedCollection(
  leagueRef: DocumentReference,
  collectionName: string,
) {
  const snapshot = await leagueRef.collection(collectionName).get();
  const batch = getFirebaseAdminFirestore().batch();

  snapshot.docs.forEach((document) => batch.delete(document.ref));

  if (!snapshot.empty) {
    await withEmulatorOperationTimeout(
      batch.commit(),
      `clear ${collectionName} for multiplayer E2E league`,
    );
  }
}

function ensureFirebaseAuthEmulatorEnvironment() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??=
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
}

async function seedAdminAuthUser() {
  ensureFirebaseAuthEmulatorEnvironment();

  const auth = getFirebaseAdminAuth();

  try {
    await auth.updateUser(E2E_ADMIN_UID, {
      disabled: false,
      displayName: "AFBM E2E Admin",
      email: E2E_ADMIN_EMAIL,
      emailVerified: true,
      password: E2E_ADMIN_PASSWORD,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code !== "auth/user-not-found") {
      throw error;
    }

    await auth.createUser({
      disabled: false,
      displayName: "AFBM E2E Admin",
      email: E2E_ADMIN_EMAIL,
      emailVerified: true,
      password: E2E_ADMIN_PASSWORD,
      uid: E2E_ADMIN_UID,
    });
  }

  await auth.setCustomUserClaims(E2E_ADMIN_UID, { admin: true });
}

async function seedStateAuthUser() {
  ensureFirebaseAuthEmulatorEnvironment();

  const auth = getFirebaseAdminAuth();

  try {
    await auth.updateUser(E2E_STATE_UID, {
      disabled: false,
      displayName: "AFBM E2E State GM",
      email: E2E_STATE_EMAIL,
      emailVerified: true,
      password: E2E_STATE_PASSWORD,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code !== "auth/user-not-found") {
      throw error;
    }

    await auth.createUser({
      disabled: false,
      displayName: "AFBM E2E State GM",
      email: E2E_STATE_EMAIL,
      emailVerified: true,
      password: E2E_STATE_PASSWORD,
      uid: E2E_STATE_UID,
    });
  }

  await auth.setCustomUserClaims(E2E_STATE_UID, null);
}

async function seedRejoinAuthUser() {
  ensureFirebaseAuthEmulatorEnvironment();

  const auth = getFirebaseAdminAuth();

  try {
    await auth.updateUser(E2E_REJOIN_UID, {
      disabled: false,
      displayName: "AFBM E2E Rejoin GM",
      email: E2E_REJOIN_EMAIL,
      emailVerified: true,
      password: E2E_REJOIN_PASSWORD,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code !== "auth/user-not-found") {
      throw error;
    }

    await auth.createUser({
      disabled: false,
      displayName: "AFBM E2E Rejoin GM",
      email: E2E_REJOIN_EMAIL,
      emailVerified: true,
      password: E2E_REJOIN_PASSWORD,
      uid: E2E_REJOIN_UID,
    });
  }

  await auth.setCustomUserClaims(E2E_REJOIN_UID, null);
}

function activePlayer(teamId: string, index: number, overall: number): OnlineContractPlayer {
  return {
    age: 24 + index,
    contract: {} as OnlineContractPlayer["contract"],
    developmentPath: "solid",
    developmentProgress: 0,
    overall,
    playerId: `${teamId}-e2e-player-${index}`,
    playerName: `${teamId} E2E Player ${index}`,
    position: index === 1 ? "QB" : index === 2 ? "WR" : "LB",
    potential: overall + 2,
    status: "active",
    xFactors: [],
  };
}

function createE2eDepthChart(
  roster: OnlineContractPlayer[],
  updatedAt: string,
): OnlineDepthChartEntry[] {
  const playersByPosition = new Map<string, OnlineContractPlayer[]>();

  roster
    .filter((player) => player.status === "active")
    .forEach((player) => {
      playersByPosition.set(player.position, [
        ...(playersByPosition.get(player.position) ?? []),
        player,
      ]);
    });

  return Array.from(playersByPosition.entries()).map(([position, players]) => {
    const [starter, ...backups] = [...players].sort((left, right) => right.overall - left.overall);

    return {
      backupPlayerIds: backups.map((player) => player.playerId),
      position,
      starterPlayerId: starter?.playerId ?? "",
      updatedAt,
    };
  });
}

async function seedAdminWeekLeague() {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_E2E_ADMIN_WEEK_LEAGUE_ID);
  const [homeTeam, awayTeam] = ONLINE_MVP_TEAM_POOL.slice(0, 2);
  const now = "2026-05-01T09:00:00.000Z";

  if (!homeTeam || !awayTeam) {
    throw new Error("Multiplayer E2E admin week seed requires at least two teams.");
  }

  await Promise.all([
    clearNestedCollection(leagueRef, "memberships"),
    clearNestedCollection(leagueRef, "teams"),
    clearNestedCollection(leagueRef, "events"),
    clearNestedCollection(leagueRef, "weeks"),
    clearNestedCollection(leagueRef, "adminLogs"),
    clearNestedCollection(leagueRef, "adminActionLocks"),
    clearNestedCollection(leagueRef.collection("draft").doc("main"), "picks"),
    clearNestedCollection(leagueRef.collection("draft").doc("main"), "availablePlayers"),
  ]);

  const batch = firestore.batch();
  const homeUserId = "e2e-admin-week-home-gm";
  const awayUserId = "e2e-admin-week-away-gm";

  batch.set(leagueRef, {
    id: MULTIPLAYER_E2E_ADMIN_WEEK_LEAGUE_ID,
    name: "Firebase Admin Week E2E League",
    status: "active",
    createdByUserId: E2E_ADMIN_UID,
    createdAt: now,
    updatedAt: now,
    maxTeams: 2,
    memberCount: 2,
    currentWeek: 1,
    currentSeason: 1,
    weekStatus: "ready",
    completedWeeks: [],
    matchResults: [],
    standings: [],
    schedule: [
      {
        awayTeamId: awayTeam.id,
        awayTeamName: awayTeam.name,
        homeTeamId: homeTeam.id,
        homeTeamName: homeTeam.name,
        id: "e2e-admin-week-1-game-1",
        scheduledAt: "2026-05-03T18:00:00.000Z",
        status: "scheduled",
        week: 1,
      },
    ],
    settings: {
      onlineBackbone: true,
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: now,
        currentTeamId: "",
        draftOrder: [homeTeam.id, awayTeam.id],
        leagueId: MULTIPLAYER_E2E_ADMIN_WEEK_LEAGUE_ID,
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: now,
        status: "completed",
      },
    },
    version: 1,
  });

  [
    { team: homeTeam, userId: homeUserId, rosterRating: 78 },
    { team: awayTeam, userId: awayUserId, rosterRating: 74 },
  ].forEach(({ team, userId, rosterRating }) => {
    const contractRoster = [
      activePlayer(team.id, 1, rosterRating),
      activePlayer(team.id, 2, rosterRating - 2),
      activePlayer(team.id, 3, rosterRating - 4),
    ];

    batch.set(leagueRef.collection("teams").doc(team.id), {
      ...mapLocalTeamToFirestoreTeam(team, now),
      assignedUserId: userId,
      contractRoster,
      depthChart: createE2eDepthChart(contractRoster, now),
      status: "assigned",
      updatedAt: now,
    });
    batch.set(leagueRef.collection("memberships").doc(userId), {
      userId,
      username: `${team.name} GM`,
      displayName: `${team.name} GM`,
      role: "gm",
      teamId: team.id,
      joinedAt: now,
      lastSeenAt: now,
      ready: true,
      status: "active",
    });
  });

  batch.set(leagueRef.collection("draft").doc("main"), {
    completedAt: now,
    currentTeamId: "",
    draftOrder: [homeTeam.id, awayTeam.id],
    leagueId: MULTIPLAYER_E2E_ADMIN_WEEK_LEAGUE_ID,
    pickNumber: 1,
    round: 1,
    startedAt: now,
    status: "completed",
  });
  batch.set(leagueRef.collection("weeks").doc("s1-w1"), {
    season: 1,
    startedAt: now,
    status: "ready",
    week: 1,
  });
  batch.set(leagueRef.collection("events").doc(), {
    type: "league_created",
    createdAt: now,
    createdByUserId: E2E_ADMIN_UID,
    payload: {
      source: "multiplayer-admin-week-e2e-seed",
    },
  });

  await withEmulatorOperationTimeout(batch.commit(), "seed multiplayer admin week E2E league");
}

async function seedAdminWeekSimulationContractBlockerLeagues() {
  const firestore = getFirebaseAdminFirestore();
  const [homeTeam, awayTeam] = ONLINE_MVP_TEAM_POOL.slice(0, 2);
  const now = "2026-05-01T09:30:00.000Z";
  const fixtures = [
    {
      kind: "missing-roster",
      leagueId: MULTIPLAYER_E2E_ADMIN_MISSING_ROSTER_LEAGUE_ID,
      name: "Firebase Admin Missing Roster E2E League",
    },
    {
      kind: "invalid-depth",
      leagueId: MULTIPLAYER_E2E_ADMIN_INVALID_DEPTH_LEAGUE_ID,
      name: "Firebase Admin Invalid Depth E2E League",
    },
    {
      kind: "broken-schedule",
      leagueId: MULTIPLAYER_E2E_ADMIN_BROKEN_SCHEDULE_LEAGUE_ID,
      name: "Firebase Admin Broken Schedule E2E League",
    },
  ] as const;

  if (!homeTeam || !awayTeam) {
    throw new Error("Multiplayer E2E simulation contract seeds require at least two teams.");
  }

  await Promise.all(
    fixtures.map((fixture) => clearLeagueFixture(firestore.collection("leagues").doc(fixture.leagueId))),
  );

  const batch = firestore.batch();

  fixtures.forEach((fixture) => {
    const leagueRef = firestore.collection("leagues").doc(fixture.leagueId);
    const homeUserId = `${fixture.leagueId}-home-gm`;
    const awayUserId = `${fixture.leagueId}-away-gm`;

    batch.set(leagueRef, {
      id: fixture.leagueId,
      name: fixture.name,
      status: "active",
      createdByUserId: E2E_ADMIN_UID,
      createdAt: now,
      updatedAt: now,
      maxTeams: 2,
      memberCount: 2,
      currentWeek: 1,
      currentSeason: 1,
      weekStatus: "ready",
      completedWeeks: [],
      matchResults: [],
      standings: [],
      schedule: [
        {
          awayTeamId:
            fixture.kind === "broken-schedule" ? "missing-e2e-team" : awayTeam.id,
          awayTeamName:
            fixture.kind === "broken-schedule" ? "Missing E2E Team" : awayTeam.name,
          homeTeamId: homeTeam.id,
          homeTeamName: homeTeam.name,
          id: `${fixture.leagueId}-week-1-game-1`,
          scheduledAt: "2026-05-03T18:00:00.000Z",
          status: "scheduled",
          week: 1,
        },
      ],
      settings: {
        onlineBackbone: true,
      },
      version: 1,
    });

    [
      { team: homeTeam, userId: homeUserId, rosterRating: 78 },
      { team: awayTeam, userId: awayUserId, rosterRating: 74 },
    ].forEach(({ team, userId, rosterRating }, index) => {
      const contractRoster =
        fixture.kind === "missing-roster" && index === 0
          ? []
          : [
              activePlayer(team.id, 1, rosterRating),
              activePlayer(team.id, 2, rosterRating - 2),
              activePlayer(team.id, 3, rosterRating - 4),
            ];
      const validDepthChart = createE2eDepthChart(contractRoster, now);
      const depthChart =
        fixture.kind === "invalid-depth" && index === 0 && validDepthChart[0]
          ? [
              {
                ...validDepthChart[0],
                starterPlayerId: "missing-e2e-depth-player",
              },
              ...validDepthChart.slice(1),
            ]
          : validDepthChart;

      batch.set(leagueRef.collection("teams").doc(team.id), {
        ...mapLocalTeamToFirestoreTeam(team, now),
        assignedUserId: userId,
        contractRoster,
        depthChart,
        status: "assigned",
        updatedAt: now,
      });
      batch.set(leagueRef.collection("memberships").doc(userId), {
        userId,
        username: `${team.name} GM`,
        displayName: `${team.name} GM`,
        role: "gm",
        teamId: team.id,
        joinedAt: now,
        lastSeenAt: now,
        ready: true,
        status: "active",
      });
    });

    batch.set(leagueRef.collection("draft").doc("main"), {
      completedAt: now,
      currentTeamId: "",
      draftOrder: [homeTeam.id, awayTeam.id],
      leagueId: fixture.leagueId,
      pickNumber: 1,
      round: 1,
      startedAt: now,
      status: "completed",
    });
    batch.set(leagueRef.collection("weeks").doc("s1-w1"), {
      season: 1,
      startedAt: now,
      status: "ready",
      week: 1,
    });
    batch.set(leagueRef.collection("events").doc(), {
      type: "league_created",
      createdAt: now,
      createdByUserId: E2E_ADMIN_UID,
      payload: {
        source: "multiplayer-admin-simulation-contract-e2e-seed",
        variant: fixture.kind,
      },
    });
  });

  await withEmulatorOperationTimeout(
    batch.commit(),
    "seed multiplayer admin simulation contract blocker E2E leagues",
  );
}

async function clearLeagueFixture(leagueRef: DocumentReference) {
  await Promise.all([
    clearNestedCollection(leagueRef, "memberships"),
    clearNestedCollection(leagueRef, "teams"),
    clearNestedCollection(leagueRef, "events"),
    clearNestedCollection(leagueRef, "weeks"),
    clearNestedCollection(leagueRef, "adminLogs"),
    clearNestedCollection(leagueRef, "adminActionLocks"),
    clearNestedCollection(leagueRef.collection("draft").doc("main"), "picks"),
    clearNestedCollection(leagueRef.collection("draft").doc("main"), "availablePlayers"),
  ]);
}

async function seedMissingStateLeagueFixtures() {
  const firestore = getFirebaseAdminFirestore();
  const now = "2026-05-01T11:00:00.000Z";
  const [noTeamCandidate, noRosterTeam, staleCandidate] = ONLINE_MVP_TEAM_POOL.slice(0, 3);

  if (!noTeamCandidate || !noRosterTeam || !staleCandidate) {
    throw new Error("Multiplayer E2E missing-state fixtures require at least three teams.");
  }

  const noTeamLeagueRef = firestore.collection("leagues").doc(MULTIPLAYER_E2E_NO_TEAM_LEAGUE_ID);
  const noRosterLeagueRef = firestore
    .collection("leagues")
    .doc(MULTIPLAYER_E2E_NO_ROSTER_LEAGUE_ID);
  const staleTeamLeagueRef = firestore
    .collection("leagues")
    .doc(MULTIPLAYER_E2E_STALE_TEAM_LEAGUE_ID);

  await Promise.all([
    clearLeagueFixture(noTeamLeagueRef),
    clearLeagueFixture(noRosterLeagueRef),
    clearLeagueFixture(staleTeamLeagueRef),
  ]);

  const batch = firestore.batch();

  [
    {
      leagueRef: noTeamLeagueRef,
      leagueId: MULTIPLAYER_E2E_NO_TEAM_LEAGUE_ID,
      name: "Firebase No Team E2E League",
    },
    {
      leagueRef: noRosterLeagueRef,
      leagueId: MULTIPLAYER_E2E_NO_ROSTER_LEAGUE_ID,
      name: "Firebase No Roster E2E League",
    },
    {
      leagueRef: staleTeamLeagueRef,
      leagueId: MULTIPLAYER_E2E_STALE_TEAM_LEAGUE_ID,
      name: "Firebase Stale Team E2E League",
    },
  ].forEach(({ leagueRef, leagueId, name }) => {
    batch.set(leagueRef, {
      id: leagueId,
      name,
      status: "active",
      createdByUserId: "server-e2e-admin",
      createdAt: now,
      updatedAt: now,
      maxTeams: 2,
      memberCount: 1,
      currentWeek: 1,
      currentSeason: 1,
      completedWeeks: [],
      matchResults: [],
      schedule: [],
      standings: [],
      weekStatus: "pre_week",
      settings: {
        onlineBackbone: true,
      },
      version: 1,
    });
  });

  batch.set(
    noTeamLeagueRef.collection("teams").doc(noTeamCandidate.id),
    {
      ...mapLocalTeamToFirestoreTeam(noTeamCandidate, now),
      status: "vacant",
      updatedAt: now,
    },
  );
  batch.set(noTeamLeagueRef.collection("memberships").doc(E2E_STATE_UID), {
    userId: E2E_STATE_UID,
    username: "State Fixture GM",
    displayName: "State Fixture GM",
    role: "gm",
    teamId: noTeamCandidate.id,
    joinedAt: now,
    lastSeenAt: now,
    ready: false,
    status: "active",
  });

  batch.set(noRosterLeagueRef.collection("teams").doc(noRosterTeam.id), {
    ...mapLocalTeamToFirestoreTeam(noRosterTeam, now),
    assignedUserId: E2E_STATE_UID,
    contractRoster: [],
    depthChart: [],
    status: "assigned",
    updatedAt: now,
  });
  batch.set(noRosterLeagueRef.collection("memberships").doc(E2E_STATE_UID), {
    userId: E2E_STATE_UID,
    username: "State Fixture GM",
    displayName: "State Fixture GM",
    role: "gm",
    teamId: noRosterTeam.id,
    joinedAt: now,
    lastSeenAt: now,
    ready: false,
    status: "active",
  });

  batch.set(staleTeamLeagueRef.collection("teams").doc(staleCandidate.id), {
    ...mapLocalTeamToFirestoreTeam(staleCandidate, now),
    status: "available",
    updatedAt: now,
  });
  batch.set(staleTeamLeagueRef.collection("memberships").doc(E2E_STATE_UID), {
    userId: E2E_STATE_UID,
    username: "State Fixture GM",
    displayName: "State Fixture GM",
    role: "gm",
    teamId: "missing-e2e-team",
    joinedAt: now,
    lastSeenAt: now,
    ready: false,
    status: "active",
  });

  await withEmulatorOperationTimeout(
    batch.commit(),
    "seed multiplayer missing-state E2E league fixtures",
  );
}

async function seedRejoinLeagueFixture() {
  const firestore = getFirebaseAdminFirestore();
  const now = "2026-05-01T12:00:00.000Z";
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_E2E_REJOIN_LEAGUE_ID);
  const [assignedTeam, openTeam] = ONLINE_MVP_TEAM_POOL.slice(3, 5);

  if (!assignedTeam || !openTeam) {
    throw new Error("Multiplayer E2E rejoin fixture requires at least five teams.");
  }

  await clearLeagueFixture(leagueRef);
  await withEmulatorOperationTimeout(
    firestore
      .collection("leagueMembers")
      .doc(`${MULTIPLAYER_E2E_REJOIN_LEAGUE_ID}_${E2E_REJOIN_UID}`)
      .delete(),
    "clear multiplayer rejoin E2E league member mirror",
  );

  const roster = [
    activePlayer(assignedTeam.id, 1, 79),
    activePlayer(assignedTeam.id, 2, 76),
    activePlayer(assignedTeam.id, 3, 73),
  ];
  const batch = firestore.batch();

  batch.set(leagueRef, {
    id: MULTIPLAYER_E2E_REJOIN_LEAGUE_ID,
    name: "Firebase GM Rejoin E2E League",
    status: "lobby",
    createdByUserId: "server-e2e-admin",
    createdAt: now,
    updatedAt: now,
    maxTeams: 2,
    memberCount: 1,
    currentWeek: 1,
    currentSeason: 1,
    completedWeeks: [],
    matchResults: [],
    schedule: [],
    standings: [],
    weekStatus: "pre_week",
    settings: {
      onlineBackbone: true,
    },
    version: 1,
  });
  batch.set(leagueRef.collection("teams").doc(assignedTeam.id), {
    ...mapLocalTeamToFirestoreTeam(assignedTeam, now),
    assignedUserId: E2E_REJOIN_UID,
    contractRoster: roster,
    depthChart: createE2eDepthChart(roster, now),
    status: "assigned",
    updatedAt: now,
  });
  batch.set(leagueRef.collection("teams").doc(openTeam.id), {
    ...mapLocalTeamToFirestoreTeam(openTeam, now),
    updatedAt: now,
  });
  batch.set(leagueRef.collection("memberships").doc(E2E_REJOIN_UID), {
    userId: E2E_REJOIN_UID,
    username: "AFBM E2E Rejoin GM",
    displayName: "AFBM E2E Rejoin GM",
    role: "gm",
    teamId: assignedTeam.id,
    joinedAt: now,
    lastSeenAt: now,
    ready: false,
    status: "active",
  });
  batch.set(
    firestore
      .collection("leagueMembers")
      .doc(`${MULTIPLAYER_E2E_REJOIN_LEAGUE_ID}_${E2E_REJOIN_UID}`),
    {
      createdAt: now,
      id: `${MULTIPLAYER_E2E_REJOIN_LEAGUE_ID}_${E2E_REJOIN_UID}`,
      leagueId: MULTIPLAYER_E2E_REJOIN_LEAGUE_ID,
      leagueSlug: MULTIPLAYER_E2E_REJOIN_LEAGUE_ID,
      role: "GM",
      status: "ACTIVE",
      teamId: assignedTeam.id,
      updatedAt: now,
      userId: E2E_REJOIN_UID,
    },
  );
  batch.set(leagueRef.collection("events").doc(), {
    type: "user_joined_league",
    createdAt: now,
    createdByUserId: E2E_REJOIN_UID,
    payload: {
      source: "multiplayer-rejoin-e2e-seed",
      teamId: assignedTeam.id,
    },
  });

  await withEmulatorOperationTimeout(batch.commit(), "seed multiplayer rejoin E2E league fixture");
}

async function seedRaceLeagueFixture() {
  const firestore = getFirebaseAdminFirestore();
  const now = "2026-05-01T13:00:00.000Z";
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_E2E_RACE_LEAGUE_ID);
  const [raceTeam] = ONLINE_MVP_TEAM_POOL.slice(5, 6);

  if (!raceTeam) {
    throw new Error("Multiplayer E2E race fixture requires at least six teams.");
  }

  await clearLeagueFixture(leagueRef);

  const roster = [
    activePlayer(raceTeam.id, 1, 78),
    activePlayer(raceTeam.id, 2, 75),
    activePlayer(raceTeam.id, 3, 72),
  ];
  const batch = firestore.batch();

  batch.set(leagueRef, {
    id: MULTIPLAYER_E2E_RACE_LEAGUE_ID,
    name: "Firebase Race E2E League",
    status: "lobby",
    createdByUserId: "server-e2e-admin",
    createdAt: now,
    updatedAt: now,
    maxTeams: 1,
    memberCount: 0,
    currentWeek: 1,
    currentSeason: 1,
    completedWeeks: [],
    matchResults: [],
    schedule: [],
    standings: [],
    weekStatus: "pre_week",
    settings: {
      onlineBackbone: true,
    },
    version: 1,
  });
  batch.set(leagueRef.collection("teams").doc(raceTeam.id), {
    ...mapLocalTeamToFirestoreTeam(raceTeam, now),
    contractRoster: roster,
    depthChart: createE2eDepthChart(roster, now),
    updatedAt: now,
  });
  batch.set(leagueRef.collection("events").doc(), {
    type: "league_created",
    createdAt: now,
    createdByUserId: "server-e2e-admin",
    payload: {
      source: "multiplayer-race-e2e-seed",
    },
  });

  await withEmulatorOperationTimeout(batch.commit(), "seed multiplayer race E2E league fixture");
}

export async function seedMultiplayerE2eLeague() {
  ensureFirestoreEmulatorEnvironment();
  ensureFirebaseAuthEmulatorEnvironment();

  const projectId = process.env.FIREBASE_PROJECT_ID ?? FIRESTORE_SEED_PROJECT_ID;
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? FIRESTORE_SEED_EMULATOR_HOST;

  if (!projectId.startsWith("demo-")) {
    throw new Error(`Refusing multiplayer E2E seed for non-demo project "${projectId}".`);
  }

  if (!emulatorHost) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required for multiplayer E2E seed.");
  }

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_E2E_LEAGUE_ID);

  await Promise.all([
    clearNestedCollection(leagueRef, "memberships"),
    clearNestedCollection(leagueRef, "teams"),
    clearNestedCollection(leagueRef, "events"),
    clearNestedCollection(leagueRef, "weeks"),
    clearNestedCollection(leagueRef, "adminLogs"),
    clearNestedCollection(leagueRef, "adminActionLocks"),
    clearNestedCollection(leagueRef.collection("draft").doc("main"), "picks"),
    clearNestedCollection(leagueRef.collection("draft").doc("main"), "availablePlayers"),
  ]);

  const batch = firestore.batch();
  const maxTeams = 2;

  batch.set(leagueRef, {
    id: MULTIPLAYER_E2E_LEAGUE_ID,
    name: "Firebase Multiplayer E2E League",
    status: "lobby",
    createdByUserId: "server-e2e-admin",
    createdAt,
    updatedAt: createdAt,
    maxTeams,
    memberCount: 0,
    currentWeek: 1,
    currentSeason: 1,
    settings: {
      onlineBackbone: true,
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: createdAt,
        currentTeamId: "",
        draftOrder: ONLINE_MVP_TEAM_POOL.slice(0, maxTeams).map((team) => team.id),
        leagueId: MULTIPLAYER_E2E_LEAGUE_ID,
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: createdAt,
        status: "completed",
      },
    },
    version: 1,
  });

  batch.set(leagueRef.collection("draft").doc("main"), {
    completedAt: createdAt,
    currentTeamId: "",
    draftOrder: ONLINE_MVP_TEAM_POOL.slice(0, maxTeams).map((team) => team.id),
    leagueId: MULTIPLAYER_E2E_LEAGUE_ID,
    pickNumber: 1,
    round: 1,
    startedAt: createdAt,
    status: "completed",
  });

  ONLINE_MVP_TEAM_POOL.slice(0, maxTeams).forEach((team, index) => {
    const roster = [
      activePlayer(team.id, 1, 76 - index),
      activePlayer(team.id, 2, 74 - index),
      activePlayer(team.id, 3, 72 - index),
    ];

    batch.set(
      leagueRef.collection("teams").doc(team.id),
      {
        ...mapLocalTeamToFirestoreTeam(team, createdAt),
        contractRoster: roster,
        depthChart: createE2eDepthChart(roster, createdAt),
        updatedAt: createdAt,
      },
    );
  });
  batch.set(leagueRef.collection("events").doc(), {
    type: "league_created",
    createdAt,
    createdByUserId: "server-e2e-admin",
    payload: {
      source: "multiplayer-e2e-seed",
    },
  });

  await withEmulatorOperationTimeout(batch.commit(), "seed multiplayer E2E league");
  await seedAdminAuthUser();
  await seedStateAuthUser();
  await seedRejoinAuthUser();
  await seedAdminWeekLeague();
  await seedAdminWeekSimulationContractBlockerLeagues();
  await seedMissingStateLeagueFixtures();
  await seedRejoinLeagueFixture();
  await seedRaceLeagueFixture();

  return {
    adminWeekLeagueId: MULTIPLAYER_E2E_ADMIN_WEEK_LEAGUE_ID,
    leagueId: MULTIPLAYER_E2E_LEAGUE_ID,
    missingStateLeagueIds: [
      MULTIPLAYER_E2E_NO_TEAM_LEAGUE_ID,
      MULTIPLAYER_E2E_NO_ROSTER_LEAGUE_ID,
      MULTIPLAYER_E2E_STALE_TEAM_LEAGUE_ID,
    ],
    raceLeagueId: MULTIPLAYER_E2E_RACE_LEAGUE_ID,
    rejoinLeagueId: MULTIPLAYER_E2E_REJOIN_LEAGUE_ID,
    maxTeams,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMultiplayerE2eLeague()
    .then((summary) => {
      console.log(
        `Seeded ${summary.leagueId} with ${summary.maxTeams} available teams, ${summary.adminWeekLeagueId} for admin week simulation, ${summary.rejoinLeagueId} for GM rejoin, ${summary.raceLeagueId} for join races and ${summary.missingStateLeagueIds.length} missing-state leagues in Firestore/Auth emulators.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
