import type { DocumentReference } from "firebase-admin/firestore";

import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
} from "../src/lib/firebase/admin";
import {
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
} from "../src/lib/online/online-league-draft-service";
import { ONLINE_MVP_TEAM_POOL } from "../src/lib/online/online-league-service";
import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
  OnlineLeagueScheduleMatch,
} from "../src/lib/online/online-league-types";
import { mapLocalTeamToFirestoreTeam } from "../src/lib/online/types";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./seeds/multiplayer-firestore-env";

type FixtureUserKey =
  | "browser"
  | "join1"
  | "join2"
  | "draft1"
  | "draft2";

type FixtureUser = {
  displayName: string;
  email: string;
  password: string;
  uid: string;
};

type FixtureTeam = {
  abbreviation: string;
  cityId: string;
  cityName: string;
  id: string;
  primaryColor: string;
  secondaryColor: string;
  teamName: string;
};

const PLAYABILITY_LEAGUE_ID = "afbm-playability-test";
const JOIN_LEAGUE_ID = "afbm-join-test";
const JOIN_RACE_LEAGUE_ID = `${JOIN_LEAGUE_ID}-race`;
const JOIN_FULL_LEAGUE_ID = `${JOIN_LEAGUE_ID}-full`;
const DRAFT_LEAGUE_ID = "afbm-draft-test";
const DRAFT_RUN_ID = "phase2-draft-test-v1";
const SETUP_ACTOR_ID = "phase2-staging-fixture-setup";
const FULL_LEAGUE_EXISTING_UID = "phase2-join-full-existing-gm";
const PRIMARY_DRAFT_PLAYER_ID = "draft-smoke-qb-alpha";
const PRIMARY_DRAFT_PLAYER_NAME = "Draft Smoke QB Alpha";
const DEFAULT_STAGING_WEB_API_KEY = "AIzaSyC2JqgkfFuGhvE3KuMIQ1DCvC003m8q320";

const DEFAULT_USERS: Record<FixtureUserKey, Omit<FixtureUser, "password">> = {
  browser: {
    displayName: "Phase 2 Browser Player",
    email: "afbm-phase2-browser-player@example.test",
    uid: "basel-rhinos-gm",
  },
  join1: {
    displayName: "Phase 2 Join Player 1",
    email: "afbm-phase2-join-player-1@example.test",
    uid: "phase2-join-player-1",
  },
  join2: {
    displayName: "Phase 2 Join Player 2",
    email: "afbm-phase2-join-player-2@example.test",
    uid: "phase2-join-player-2",
  },
  draft1: {
    displayName: "Phase 2 Draft Player 1",
    email: "afbm-phase2-draft-player-1@example.test",
    uid: "phase2-draft-player-1",
  },
  draft2: {
    displayName: "Phase 2 Draft Player 2",
    email: "afbm-phase2-draft-player-2@example.test",
    uid: "phase2-draft-player-2",
  },
};

const PLAYABILITY_TEAMS: FixtureTeam[] = [
  {
    abbreviation: "BAS",
    cityId: "basel",
    cityName: "Basel",
    id: "basel-rhinos",
    primaryColor: "#991B1B",
    secondaryColor: "#E5E7EB",
    teamName: "Rhinos",
  },
  {
    abbreviation: "BER",
    cityId: "bern",
    cityName: "Bern",
    id: "bern-wolves",
    primaryColor: "#334155",
    secondaryColor: "#FACC15",
    teamName: "Wolves",
  },
  {
    abbreviation: "GEN",
    cityId: "geneva",
    cityName: "Geneva",
    id: "geneva-falcons",
    primaryColor: "#047857",
    secondaryColor: "#FDE68A",
    teamName: "Falcons",
  },
  {
    abbreviation: "ZUR",
    cityId: "zurich",
    cityName: "Zurich",
    id: "zurich-guardians",
    primaryColor: "#1D4ED8",
    secondaryColor: "#F8FAFC",
    teamName: "Guardians",
  },
];

function hasArg(name: string) {
  return process.argv.includes(name);
}

function requireStagingConfirmation() {
  if (process.env.GOOGLE_CLOUD_PROJECT !== "afbm-staging") {
    throw new Error("Phase 2 fixture setup requires GOOGLE_CLOUD_PROJECT=afbm-staging.");
  }

  if (process.env.CONFIRM_STAGING_PHASE2_FIXTURES !== "true") {
    throw new Error(
      "Phase 2 fixture setup requires CONFIRM_STAGING_PHASE2_FIXTURES=true.",
    );
  }

  if (
    process.env.NODE_ENV === "production" ||
    process.env.AFBM_DEPLOY_ENV === "production" ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_EMULATOR_HOST
  ) {
    throw new Error("Refusing Phase 2 fixture setup outside clean Staging mode.");
  }
}

function createPassword(label: string) {
  const override = process.env[`STAGING_PHASE2_${label}_PASSWORD`];

  return override && override.length >= 12
    ? override
    : `AFBM-phase2-${label.toLowerCase().replace(/_/g, "-")}-2026!`;
}

function nowIso() {
  return new Date().toISOString();
}

function teamDisplayName(team: FixtureTeam) {
  return `${team.cityName} ${team.teamName}`;
}

function createPlayer(teamId: string, index: number, position = "QB"): OnlineContractPlayer {
  return {
    age: 24 + index,
    contract: {
      capHitPerYear: 1_000_000,
      contractType: "regular",
      deadCapPerYear: 0,
      guaranteedMoney: 0,
      salaryPerYear: 1_000_000,
      signingBonus: 0,
      totalValue: 1_000_000,
      yearsRemaining: 1,
    },
    developmentPath: "solid",
    developmentProgress: 0,
    overall: 74 + index,
    playerId: `${teamId}-phase2-player-${index}`,
    playerName: `${teamId} Phase 2 Player ${index}`,
    position,
    potential: 78 + index,
    status: "active",
    xFactors: [],
  };
}

function createRoster(teamId: string) {
  return [
    createPlayer(teamId, 1, "QB"),
    createPlayer(teamId, 2, "WR"),
    createPlayer(teamId, 3, "LB"),
  ];
}

function createDepthChart(roster: OnlineContractPlayer[], updatedAt: string): OnlineDepthChartEntry[] {
  const playersByPosition = new Map<string, OnlineContractPlayer[]>();

  roster.forEach((player) => {
    playersByPosition.set(player.position, [
      ...(playersByPosition.get(player.position) ?? []),
      player,
    ]);
  });

  return Array.from(playersByPosition.entries()).map(([position, players]) => {
    const [starter, ...backups] = players;

    return {
      backupPlayerIds: backups.map((player) => player.playerId),
      position,
      starterPlayerId: starter?.playerId ?? "",
      updatedAt,
    };
  });
}

function createFirestoreTeam(team: FixtureTeam, createdAt: string, assignedUserId: string | null) {
  const roster = createRoster(team.id);

  return {
    abbreviation: team.abbreviation,
    assignedUserId,
    branding: {
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
    },
    cityId: team.cityId,
    cityName: team.cityName,
    contractRoster: roster,
    createdAt,
    createdBySeed: true,
    depthChart: createDepthChart(roster, createdAt),
    displayName: teamDisplayName(team),
    id: team.id,
    seedKey: "phase2-staging-fixtures",
    status: assignedUserId ? "assigned" : "available",
    teamName: team.teamName,
    teamNameId: team.teamName.toLowerCase(),
    testData: true,
    updatedAt: createdAt,
  };
}

function createMembership(input: {
  createdAt: string;
  displayName: string;
  teamId: string;
  userId: string;
}) {
  return {
    displayName: input.displayName,
    joinedAt: input.createdAt,
    lastSeenAt: input.createdAt,
    ready: false,
    role: "gm",
    status: "active",
    teamId: input.teamId,
    userId: input.userId,
    username: input.displayName,
  };
}

function createMirror(input: {
  createdAt: string;
  leagueId: string;
  teamId: string;
  userId: string;
}) {
  return {
    createdAt: input.createdAt,
    id: `${input.leagueId}_${input.userId}`,
    leagueId: input.leagueId,
    leagueSlug: input.leagueId,
    role: "GM",
    status: "ACTIVE",
    teamId: input.teamId,
    uid: input.userId,
    updatedAt: input.createdAt,
    userId: input.userId,
  };
}

function createSchedule(leagueId: string): OnlineLeagueScheduleMatch[] {
  const names = PLAYABILITY_TEAMS.map(teamDisplayName);

  return [
    [names[0], names[1]],
    [names[2], names[3]],
    [names[0], names[2]],
    [names[1], names[3]],
    [names[0], names[3]],
    [names[1], names[2]],
  ].map(([homeTeamName, awayTeamName], index) => ({
    awayTeamName,
    homeTeamName,
    id: `${leagueId}-s1-w${Math.floor(index / 2) + 1}-g${(index % 2) + 1}`,
    week: Math.floor(index / 2) + 1,
  }));
}

async function clearCollection(ref: FirebaseFirestore.CollectionReference, label: string) {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await ref.get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = firestore.batch();

  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await withMultiplayerFirestoreTimeout(
    batch.commit(),
    `clear ${label}`,
    { mode: "staging", projectId: "afbm-staging", resetAllowed: true },
  );

  return snapshot.size;
}

async function clearLeague(leagueRef: DocumentReference) {
  const deleted = await Promise.all([
    clearCollection(leagueRef.collection("memberships"), `${leagueRef.id}/memberships`),
    clearCollection(leagueRef.collection("teams"), `${leagueRef.id}/teams`),
    clearCollection(leagueRef.collection("events"), `${leagueRef.id}/events`),
    clearCollection(leagueRef.collection("weeks"), `${leagueRef.id}/weeks`),
    clearCollection(leagueRef.collection("adminActionLocks"), `${leagueRef.id}/adminActionLocks`),
    clearCollection(leagueRef.collection("draft").doc("main").collection("picks"), `${leagueRef.id}/draft/picks`),
    clearCollection(leagueRef.collection("draft").doc("main").collection("availablePlayers"), `${leagueRef.id}/draft/availablePlayers`),
  ]);

  return deleted.reduce((sum, count) => sum + count, 0);
}

async function clearMirrors(leagueIds: string[], userIds: string[]) {
  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();

  leagueIds.forEach((leagueId) => {
    userIds.forEach((userId) => {
      batch.delete(firestore.collection("leagueMembers").doc(`${leagueId}_${userId}`));
    });
  });
  await batch.commit();
}

function getFirebaseWebApiKey() {
  return (
    process.env.STAGING_FIREBASE_WEB_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
    DEFAULT_STAGING_WEB_API_KEY
  );
}

function getAuthErrorCode(payload: unknown) {
  return typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
    ? (payload as { error: { message: string } }).error.message
    : "UNKNOWN";
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Firebase Auth REST response did not return a valid JWT.");
  }

  return JSON.parse(
    Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
  ) as { admin?: boolean; user_id?: string; sub?: string };
}

async function signInRest(email: string, password: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(getFirebaseWebApiKey())}`,
    {
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    idToken?: string;
    localId?: string;
  };

  return { payload, response };
}

async function createRestUser(input: Omit<FixtureUser, "password">, password: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(getFirebaseWebApiKey())}`,
    {
      body: JSON.stringify({
        displayName: input.displayName,
        email: input.email,
        password,
        returnSecureToken: true,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    idToken?: string;
    localId?: string;
  };

  if (!response.ok || !payload.localId || !payload.idToken) {
    throw new Error(`Firebase Auth REST signUp failed for ${input.email}: ${getAuthErrorCode(payload)}`);
  }

  return payload;
}

async function upsertAuthUserWithRest(input: Omit<FixtureUser, "password">, password: string) {
  const signIn = await signInRest(input.email, password);
  let action = "verified-existing-rest";
  let payload = signIn.payload;

  if (!signIn.response.ok || !payload.localId || !payload.idToken) {
    const code = getAuthErrorCode(payload);

    if (code !== "EMAIL_NOT_FOUND" && code !== "INVALID_LOGIN_CREDENTIALS") {
      throw new Error(`Firebase Auth REST signIn failed for ${input.email}: ${code}`);
    }

    try {
      payload = await createRestUser(input, password);
      action = "created-rest";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("EMAIL_EXISTS")) {
        throw new Error(
          `Existing Firebase Auth user ${input.email} could not be updated because Admin Auth is unavailable and the configured password did not match. Provide STAGING_PHASE2_*_PASSWORD with the existing password or fix ADC quota project.`,
        );
      }

      throw error;
    }
  }

  if (!payload.localId || !payload.idToken) {
    throw new Error(`Firebase Auth REST did not return uid/token for ${input.email}.`);
  }

  const uid = payload.localId;
  const tokenPayload = decodeJwtPayload(payload.idToken);

  if (tokenPayload.admin === true) {
    throw new Error(`Phase 2 test user ${input.email} has admin=true claim; refusing.`);
  }

  return {
    action,
    uid,
  };
}

async function upsertAuthUser(input: Omit<FixtureUser, "password">, password: string) {
  const auth = getFirebaseAdminAuth();
  let action = "updated";

  try {
    await auth.updateUser(input.uid, {
      disabled: false,
      displayName: input.displayName,
      email: input.email,
      emailVerified: true,
      password,
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") {
      throw error;
    }

    action = "created";
    await auth.createUser({
      disabled: false,
      displayName: input.displayName,
      email: input.email,
      emailVerified: true,
      password,
      uid: input.uid,
    });
  }

  await auth.setCustomUserClaims(input.uid, null);

  return { action, uid: input.uid };
}

async function createUsers() {
  const desiredUsers = {
    browser: { ...DEFAULT_USERS.browser, password: createPassword("BROWSER") },
    join1: { ...DEFAULT_USERS.join1, password: createPassword("JOIN_1") },
    join2: { ...DEFAULT_USERS.join2, password: createPassword("JOIN_2") },
    draft1: { ...DEFAULT_USERS.draft1, password: createPassword("DRAFT_1") },
    draft2: { ...DEFAULT_USERS.draft2, password: createPassword("DRAFT_2") },
  } satisfies Record<FixtureUserKey, FixtureUser>;
  const users = {} as Record<FixtureUserKey, FixtureUser>;

  for (const [key, user] of Object.entries(desiredUsers) as Array<[FixtureUserKey, FixtureUser]>) {
    let result: { action: string; uid: string };

    try {
      result = await upsertAuthUser(user, user.password);
    } catch (error) {
      console.warn(
        `[phase2-fixtures] Admin Auth unavailable for key=${key}; falling back to Firebase Auth REST. reason=${error instanceof Error ? error.message : String(error)}`,
      );
      result = await upsertAuthUserWithRest(user, user.password);
    }

    users[key] = {
      ...user,
      uid: result.uid,
    };

    console.log(
      `[phase2-fixtures] auth ${result.action} key=${key} uid=${result.uid} email=${user.email} customClaims=none`,
    );
  }

  return users;
}

async function assertCanWriteLeague(leagueRef: DocumentReference, reset: boolean) {
  const snapshot = await leagueRef.get();

  if (snapshot.exists && !reset) {
    return false;
  }

  if (snapshot.exists) {
    const deleted = await clearLeague(leagueRef);
    console.log(`[phase2-fixtures] reset league=${leagueRef.id} deletedNestedDocs=${deleted}`);
  }

  return true;
}

async function seedPlayabilityLeague(users: Record<FixtureUserKey, FixtureUser>, reset: boolean) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(PLAYABILITY_LEAGUE_ID);
  const shouldWrite = await assertCanWriteLeague(leagueRef, reset);
  const createdAt = nowIso();

  if (!shouldWrite) {
    await validatePlayabilityLeague(users.browser.uid);
    console.log(`[phase2-fixtures] playability existing ok leagueId=${PLAYABILITY_LEAGUE_ID}`);
    return;
  }

  await clearMirrors([PLAYABILITY_LEAGUE_ID], PLAYABILITY_TEAMS.map((team) => `${team.id}-gm`).concat(users.browser.uid));

  const batch = firestore.batch();

  batch.set(leagueRef, {
    id: PLAYABILITY_LEAGUE_ID,
    name: "AFBM Playability Test League",
    status: "active",
    createdByUserId: SETUP_ACTOR_ID,
    createdAt,
    updatedAt: createdAt,
    maxTeams: PLAYABILITY_TEAMS.length,
    memberCount: PLAYABILITY_TEAMS.length,
    currentWeek: 1,
    currentSeason: 1,
    completedWeeks: [],
    matchResults: [],
    schedule: createSchedule(PLAYABILITY_LEAGUE_ID),
    standings: [],
    weekStatus: "pre_week",
    settings: {
      onlineBackbone: true,
    },
    version: 1,
  });
  batch.set(leagueRef.collection("draft").doc("main"), {
    completedAt: createdAt,
    currentTeamId: "",
    draftOrder: PLAYABILITY_TEAMS.map((team) => team.id),
    draftRunId: "phase2-playability-completed-v1",
    leagueId: PLAYABILITY_LEAGUE_ID,
    pickNumber: 1,
    round: 1,
    startedAt: createdAt,
    status: "completed",
  });

  PLAYABILITY_TEAMS.forEach((team, index) => {
    const userId = index === 0 ? users.browser.uid : `${team.id}-gm`;
    const displayName = index === 0 ? users.browser.displayName : `${teamDisplayName(team)} GM`;

    batch.set(
      leagueRef.collection("teams").doc(team.id),
      createFirestoreTeam(team, createdAt, userId),
    );
    batch.set(
      leagueRef.collection("memberships").doc(userId),
      createMembership({ createdAt, displayName, teamId: team.id, userId }),
    );
    batch.set(
      firestore.collection("leagueMembers").doc(`${PLAYABILITY_LEAGUE_ID}_${userId}`),
      createMirror({ createdAt, leagueId: PLAYABILITY_LEAGUE_ID, teamId: team.id, userId }),
    );
  });

  await batch.commit();
  console.log(
    `[phase2-fixtures] playability prepared leagueId=${PLAYABILITY_LEAGUE_ID} browserUid=${users.browser.uid} teamId=basel-rhinos draft=completed schedule=6`,
  );
}

async function validatePlayabilityLeague(browserUid: string) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(PLAYABILITY_LEAGUE_ID);
  const [leagueSnapshot, membershipSnapshot, teamSnapshot, draftSnapshot, locksSnapshot] =
    await Promise.all([
      leagueRef.get(),
      leagueRef.collection("memberships").doc(browserUid).get(),
      leagueRef.collection("teams").doc("basel-rhinos").get(),
      leagueRef.collection("draft").doc("main").get(),
      leagueRef.collection("adminActionLocks").where("status", "==", "simulating").get(),
    ]);
  const league = leagueSnapshot.data() as { currentWeek?: number; schedule?: unknown[] } | undefined;
  const membership = membershipSnapshot.data() as { teamId?: string; status?: string } | undefined;
  const team = teamSnapshot.data() as { assignedUserId?: string } | undefined;
  const draft = draftSnapshot.data() as { status?: string } | undefined;

  if (
    !leagueSnapshot.exists ||
    membership?.status !== "active" ||
    membership.teamId !== "basel-rhinos" ||
    team?.assignedUserId !== browserUid ||
    draft?.status !== "completed" ||
    !Array.isArray(league?.schedule) ||
    league.schedule.length < 1 ||
    typeof league.currentWeek !== "number" ||
    league.currentWeek < 1 ||
    locksSnapshot.size > 0
  ) {
    throw new Error(
      `Existing ${PLAYABILITY_LEAGUE_ID} is not Phase 2 ready. Re-run with --reset.`,
    );
  }
}

function joinTeams() {
  return ONLINE_MVP_TEAM_POOL.slice(0, 2);
}

async function seedJoinLeague(users: Record<FixtureUserKey, FixtureUser>, reset: boolean) {
  const firestore = getFirebaseAdminFirestore();
  const leagueIds = [JOIN_LEAGUE_ID, JOIN_RACE_LEAGUE_ID, JOIN_FULL_LEAGUE_ID];

  for (const leagueId of leagueIds) {
    const leagueRef = firestore.collection("leagues").doc(leagueId);
    const shouldWrite = await assertCanWriteLeague(leagueRef, reset);

    if (!shouldWrite) {
      await validateJoinLeague(leagueId, users);
      console.log(`[phase2-fixtures] join fixture existing ok leagueId=${leagueId}`);
      continue;
    }

    await clearMirrors(leagueIds, [
      users.join1.uid,
      users.join2.uid,
      FULL_LEAGUE_EXISTING_UID,
    ]);
    await writeJoinFixture(leagueId);
  }
}

async function writeJoinFixture(leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const createdAt = nowIso();
  const teams = joinTeams();
  const assignedFullUser = leagueId === JOIN_FULL_LEAGUE_ID ? FULL_LEAGUE_EXISTING_UID : null;
  const maxTeams = assignedFullUser ? 1 : 2;
  const batch = firestore.batch();

  batch.set(leagueRef, {
    id: leagueId,
    name:
      leagueId === JOIN_RACE_LEAGUE_ID
        ? "AFBM Join Race League"
        : leagueId === JOIN_FULL_LEAGUE_ID
          ? "AFBM Join Full League"
          : "AFBM Join Test League",
    status: "lobby",
    createdByUserId: SETUP_ACTOR_ID,
    createdAt,
    updatedAt: createdAt,
    maxTeams,
    memberCount: assignedFullUser ? 1 : 0,
    currentWeek: 1,
    currentSeason: 1,
    completedWeeks: [],
    matchResults: [],
    schedule: [],
    standings: [],
    weekStatus: "pre_week",
    settings: { onlineBackbone: true },
    version: 1,
  });

  teams.slice(0, maxTeams).forEach((team, index) => {
    const assignedUserId = index === 0 ? assignedFullUser : null;
    const identity =
      index === 0
        ? {
            cityId: "aachen",
            cityName: "Aachen",
            displayName: "Aachen Skyline",
            teamName: "Skyline",
            teamNameId: "skyline",
          }
        : {
            cityId: "aachen",
            cityName: "Aachen",
            displayName: "Aachen Harbor",
            teamName: "Harbor",
            teamNameId: "harbor",
          };

    batch.set(leagueRef.collection("teams").doc(team.id), {
      ...mapLocalTeamToFirestoreTeam(team, createdAt),
      ...identity,
      assignedUserId,
      contractRoster: createRoster(team.id),
      depthChart: createDepthChart(createRoster(team.id), createdAt),
      status: assignedUserId ? "assigned" : "available",
      updatedAt: createdAt,
    });

    if (assignedUserId) {
      batch.set(
        leagueRef.collection("memberships").doc(assignedUserId),
        createMembership({
          createdAt,
          displayName: "Phase 2 Full League Existing GM",
          teamId: team.id,
          userId: assignedUserId,
        }),
      );
      batch.set(
        firestore.collection("leagueMembers").doc(`${leagueId}_${assignedUserId}`),
        createMirror({ createdAt, leagueId, teamId: team.id, userId: assignedUserId }),
      );
    }
  });

  await batch.commit();
  console.log(
    `[phase2-fixtures] join prepared leagueId=${leagueId} maxTeams=${maxTeams} assigned=${assignedFullUser ? 1 : 0}`,
  );
}

async function validateJoinLeague(leagueId: string, users: Record<FixtureUserKey, FixtureUser>) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const [leagueSnapshot, teamsSnapshot, join1Snapshot, join2Snapshot] = await Promise.all([
    leagueRef.get(),
    leagueRef.collection("teams").get(),
    leagueRef.collection("memberships").doc(users.join1.uid).get(),
    leagueRef.collection("memberships").doc(users.join2.uid).get(),
  ]);
  const league = leagueSnapshot.data() as { status?: string } | undefined;
  const freeTeams = teamsSnapshot.docs.filter((document) => {
    const team = document.data() as { assignedUserId?: string | null; status?: string };

    return !team.assignedUserId && (team.status === "available" || team.status === "vacant");
  });

  if (!leagueSnapshot.exists || league?.status !== "lobby") {
    throw new Error(`Existing ${leagueId} is not a joinable lobby. Re-run with --reset.`);
  }

  if (leagueId !== JOIN_FULL_LEAGUE_ID && freeTeams.length < 2) {
    throw new Error(`Existing ${leagueId} needs at least 2 free teams. Re-run with --reset.`);
  }

  if (join1Snapshot.exists || join2Snapshot.exists) {
    throw new Error(`Existing ${leagueId} already has Join testuser membership. Re-run with --reset.`);
  }
}

function createDraftPlayer(
  playerId: string,
  playerName: string,
  position: keyof typeof ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  overall: number,
  leagueId: string,
) {
  return {
    ...createPlayer("draft", overall, position),
    createdBySeed: true,
    displayName: playerName,
    draftRunId: DRAFT_RUN_ID,
    leagueSlug: leagueId,
    overall,
    playerId,
    playerName,
    seedKey: DRAFT_RUN_ID,
    testData: true,
  };
}

function createDraftPool(leagueId: string) {
  return [
    createDraftPlayer(PRIMARY_DRAFT_PLAYER_ID, PRIMARY_DRAFT_PLAYER_NAME, "QB", 99, leagueId),
    createDraftPlayer("draft-smoke-wr-beta", "Draft Smoke WR Beta", "WR", 94, leagueId),
    createDraftPlayer("draft-smoke-rb-gamma", "Draft Smoke RB Gamma", "RB", 91, leagueId),
    createDraftPlayer("draft-smoke-lb-delta", "Draft Smoke LB Delta", "LB", 88, leagueId),
  ];
}

async function seedDraftLeague(users: Record<FixtureUserKey, FixtureUser>, reset: boolean) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(DRAFT_LEAGUE_ID);
  const shouldWrite = await assertCanWriteLeague(leagueRef, reset);
  const createdAt = nowIso();

  if (!shouldWrite) {
    await validateDraftLeague(users);
    console.log(`[phase2-fixtures] draft existing ok leagueId=${DRAFT_LEAGUE_ID}`);
    return;
  }

  await clearMirrors([DRAFT_LEAGUE_ID], [users.draft1.uid, users.draft2.uid]);

  const [primaryTeam, secondTeam] = ONLINE_MVP_TEAM_POOL.slice(0, 2);

  if (!primaryTeam || !secondTeam) {
    throw new Error("Phase 2 draft fixture requires two MVP teams.");
  }

  const batch = firestore.batch();
  const teams = [
    { team: primaryTeam, user: users.draft1 },
    { team: secondTeam, user: users.draft2 },
  ];
  const players = createDraftPool(DRAFT_LEAGUE_ID);

  batch.set(leagueRef, {
    id: DRAFT_LEAGUE_ID,
    name: "AFBM Draft Smoke League",
    status: "lobby",
    createdByUserId: SETUP_ACTOR_ID,
    createdAt,
    updatedAt: createdAt,
    maxTeams: 2,
    memberCount: 2,
    currentWeek: 1,
    currentSeason: 1,
    completedWeeks: [],
    matchResults: [],
    schedule: [],
    standings: [],
    weekStatus: "pre_week",
    settings: { onlineBackbone: true },
    version: 1,
  });
  batch.set(leagueRef.collection("draft").doc("main"), {
    completedAt: null,
    currentTeamId: primaryTeam.id,
    draftOrder: [primaryTeam.id, secondTeam.id],
    draftRunId: DRAFT_RUN_ID,
    leagueId: DRAFT_LEAGUE_ID,
    pickNumber: 1,
    round: 1,
    seedKey: DRAFT_RUN_ID,
    startedAt: createdAt,
    status: "active",
    testData: true,
  });

  teams.forEach(({ team, user }) => {
    batch.set(leagueRef.collection("teams").doc(team.id), {
      ...mapLocalTeamToFirestoreTeam(team, createdAt),
      assignedUserId: user.uid,
      contractRoster: [],
      depthChart: [],
      status: "assigned",
      updatedAt: createdAt,
    });
    batch.set(
      leagueRef.collection("memberships").doc(user.uid),
      createMembership({ createdAt, displayName: user.displayName, teamId: team.id, userId: user.uid }),
    );
    batch.set(
      firestore.collection("leagueMembers").doc(`${DRAFT_LEAGUE_ID}_${user.uid}`),
      createMirror({ createdAt, leagueId: DRAFT_LEAGUE_ID, teamId: team.id, userId: user.uid }),
    );
  });

  players.forEach((player) => {
    batch.set(
      leagueRef.collection("draft").doc("main").collection("availablePlayers").doc(player.playerId),
      player,
    );
  });

  await batch.commit();
  console.log(
    `[phase2-fixtures] draft prepared leagueId=${DRAFT_LEAGUE_ID} status=active currentTeam=${primaryTeam.id} availablePlayers=${players.length}`,
  );
}

async function validateDraftLeague(users: Record<FixtureUserKey, FixtureUser>) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(DRAFT_LEAGUE_ID);
  const [draftSnapshot, primaryMembershipSnapshot, secondMembershipSnapshot, availableSnapshot] =
    await Promise.all([
      leagueRef.collection("draft").doc("main").get(),
      leagueRef.collection("memberships").doc(users.draft1.uid).get(),
      leagueRef.collection("memberships").doc(users.draft2.uid).get(),
      leagueRef.collection("draft").doc("main").collection("availablePlayers").get(),
    ]);
  const draft = draftSnapshot.data() as { currentTeamId?: string; status?: string } | undefined;
  const primary = primaryMembershipSnapshot.data() as { teamId?: string; status?: string } | undefined;
  const second = secondMembershipSnapshot.data() as { teamId?: string; status?: string } | undefined;

  if (
    draft?.status !== "active" ||
    !primary?.teamId ||
    primary.status !== "active" ||
    !second?.teamId ||
    second.status !== "active" ||
    draft.currentTeamId !== primary.teamId ||
    !availableSnapshot.docs.some((document) => document.id === PRIMARY_DRAFT_PLAYER_ID)
  ) {
    throw new Error(`Existing ${DRAFT_LEAGUE_ID} is not an active Phase 2 draft fixture. Re-run with --reset.`);
  }
}

function printEnvBlock(users: Record<FixtureUserKey, FixtureUser>) {
  console.log("\n[phase2-fixtures] .env example block:");
  console.log(`STAGING_PLAYER_EMAIL=${users.browser.email}`);
  console.log(`STAGING_PLAYER_PASSWORD=${users.browser.password}`);
  console.log(`STAGING_JOIN_PLAYER_EMAIL=${users.join1.email}`);
  console.log(`STAGING_JOIN_PLAYER_PASSWORD=${users.join1.password}`);
  console.log(`STAGING_JOIN_PLAYER_2_EMAIL=${users.join2.email}`);
  console.log(`STAGING_JOIN_PLAYER_2_PASSWORD=${users.join2.password}`);
  console.log(`STAGING_DRAFT_PLAYER_EMAIL=${users.draft1.email}`);
  console.log(`STAGING_DRAFT_PLAYER_PASSWORD=${users.draft1.password}`);
  console.log(`STAGING_DRAFT_PLAYER_2_EMAIL=${users.draft2.email}`);
  console.log(`STAGING_DRAFT_PLAYER_2_PASSWORD=${users.draft2.password}`);
}

async function run() {
  if (hasArg("--help") || hasArg("-h")) {
    console.log("Setup Phase 2 Staging Firebase Auth users and Firestore test fixtures.");
    console.log("Usage: CONFIRM_STAGING_PHASE2_FIXTURES=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:setup:phase2-fixtures -- --reset");
    return;
  }

  requireStagingConfirmation();
  const reset = hasArg("--reset");
  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: reset });

  logMultiplayerFirestoreEnvironment(environment, "setup phase2 staging fixtures");
  console.log(`[phase2-fixtures] reset=${reset ? "true" : "false"}`);

  const users = await createUsers();

  await seedPlayabilityLeague(users, reset);
  await seedJoinLeague(users, reset);
  await seedDraftLeague(users, reset);

  console.log("\n[phase2-fixtures] prepared leagues:");
  console.log(`- ${PLAYABILITY_LEAGUE_ID}: completed draft, browser uid=${users.browser.uid}, team=basel-rhinos`);
  console.log(`- ${JOIN_LEAGUE_ID}: joinable lobby, >=2 free teams, no Join-testuser memberships`);
  console.log(`- ${JOIN_RACE_LEAGUE_ID}: joinable race lobby, >=2 free teams`);
  console.log(`- ${JOIN_FULL_LEAGUE_ID}: full-liga edge fixture`);
  console.log(`- ${DRAFT_LEAGUE_ID}: active draft, current uid=${users.draft1.uid}, next uid=${users.draft2.uid}`);
  printEnvBlock(users);
  console.log("\n[phase2-fixtures] status=GREEN");
}

run().catch((error) => {
  console.error(`[phase2-fixtures] failed: ${error instanceof Error ? error.message : String(error)}`);
  console.error("[phase2-fixtures] status=RED");
  process.exitCode = 1;
});
