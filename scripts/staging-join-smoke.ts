import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { DocumentReference } from "firebase-admin/firestore";

import {
  getFirebaseAdminFirestore,
} from "../src/lib/firebase/admin";
import { ONLINE_MVP_TEAM_POOL } from "../src/lib/online/online-league-service";
import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
} from "../src/lib/online/online-league-types";
import { mapLocalTeamToFirestoreTeam } from "../src/lib/online/types";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./seeds/multiplayer-firestore-env";

type JoinSmokeUser = {
  email: string;
  password: string;
  uid: string;
};

type JoinSmokeTeam = {
  assignedUserId?: string | null;
  displayName?: string;
  id?: string;
  status?: string;
};

type JoinSmokeMembership = {
  ready?: boolean;
  role?: string;
  status?: string;
  teamId?: string;
  userId?: string;
};

type JoinSmokeState = {
  activeMemberships: JoinSmokeMembership[];
  memberCount: number;
  membership: JoinSmokeMembership | null;
  team: JoinSmokeTeam | null;
};

const DEFAULT_BASE_URL = "https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app";
const DEFAULT_LEAGUE_ID = "afbm-join-test";
const DEFAULT_STAGING_WEB_API_KEY = "AIzaSyC2JqgkfFuGhvE3KuMIQ1DCvC003m8q320";
const JOIN_SEED_ACTOR = "staging-join-smoke-seed";
const LAST_LEAGUE_STORAGE_KEY = "afbm.online.lastLeagueId";

function printHelp() {
  console.log(`Run the Staging Join smoke.

Usage:
  CONFIRM_STAGING_SMOKE=true \\
  CONFIRM_STAGING_JOIN_SMOKE=true \\
  GOOGLE_CLOUD_PROJECT=afbm-staging \\
  STAGING_JOIN_PLAYER_EMAIL=<email> \\
  STAGING_JOIN_PLAYER_PASSWORD=<password> \\
  STAGING_JOIN_PLAYER_2_EMAIL=<email> \\
  STAGING_JOIN_PLAYER_2_PASSWORD=<password> \\
  npm run staging:smoke:join -- --league-id afbm-join-test

  # Optional fixture reset:
  CONFIRM_STAGING_SEED=true npm run staging:smoke:join -- --reset-before-run

Flow:
  1. Use prepared staging-only join fixtures: <league>, <league>-race, <league>-full.
  2. Login as a non-admin player in Chromium.
  3. Search for the lobby league and click "Beitreten".
  4. Verify membership, membership.teamId and team.assignedUserId.
  5. Reload and verify the same team and no duplicate membership.
  6. Race two players into a separate two-team league and verify different teams.
  7. Verify a full league returns a clear full-league error.

Safety:
  - Requires CONFIRM_STAGING_SMOKE=true.
  - Requires CONFIRM_STAGING_JOIN_SMOKE=true because it mutates Staging.
  - Only resets afbm-join-* test fixtures when --reset-before-run and CONFIRM_STAGING_SEED=true are set.
  - Refuses non-afbm-staging project IDs and non-afbm-join-* league IDs.
  - Refuses users with admin=true custom claims.
  - Never prints passwords.
  - Keeps screenshots in /tmp by default; pass --cleanup-artifacts to delete them after the run.
`);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);

  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireSecretEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readRequiredEnvAlias(primaryName: string, fallbackName: string) {
  const value = process.env[primaryName]?.trim() || process.env[fallbackName]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${primaryName} (or ${fallbackName}).`);
  }

  return value;
}

function readRequiredSecretEnvAlias(primaryName: string, fallbackName: string) {
  const value = process.env[primaryName] || process.env[fallbackName];

  if (!value) {
    throw new Error(`Missing required environment variable: ${primaryName} (or ${fallbackName}).`);
  }

  return value;
}

function getFirebaseWebApiKey() {
  return (
    process.env.STAGING_FIREBASE_WEB_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
    DEFAULT_STAGING_WEB_API_KEY
  );
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Firebase Auth response did not return a valid JWT.");
  }

  return JSON.parse(
    Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
  ) as { admin?: boolean; sub?: string; user_id?: string };
}

async function signInForUid(email: string, password: string) {
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

  if (!response.ok || !payload.idToken || !payload.localId) {
    throw new Error(`Firebase player login failed for ${email}: ${payload.error?.message ?? response.statusText}`);
  }

  const tokenPayload = decodeJwtPayload(payload.idToken);

  if (tokenPayload.admin === true) {
    throw new Error(`Join smoke refuses admin=true user: ${email}`);
  }

  return payload.localId;
}

function requireStagingConfirmation() {
  if (process.env.CONFIRM_STAGING_SMOKE !== "true") {
    throw new Error("Join smoke requires CONFIRM_STAGING_SMOKE=true.");
  }

  if (process.env.CONFIRM_STAGING_JOIN_SMOKE !== "true") {
    throw new Error(
      "Join smoke requires CONFIRM_STAGING_JOIN_SMOKE=true because it mutates Staging.",
    );
  }

  if (hasArg("--reset-before-run") && process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error(
      "Join smoke --reset-before-run requires CONFIRM_STAGING_SEED=true because it resets afbm-join-* fixtures.",
    );
  }
}

function normalizeBaseUrl() {
  const baseUrl = readArg("--base-url") ?? process.env.STAGING_BASE_URL ?? DEFAULT_BASE_URL;
  const parsed = new URL(baseUrl);

  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.includes("afbm-staging") ||
    !parsed.hostname.endsWith("hosted.app")
  ) {
    throw new Error(`Refusing non-staging App Hosting URL: ${baseUrl}`);
  }

  return parsed.origin;
}

function normalizeLeagueId() {
  const leagueId = readArg("--league-id") ?? process.env.STAGING_JOIN_LEAGUE_ID ?? DEFAULT_LEAGUE_ID;

  if (!/^afbm-join-[a-z0-9-]{3,60}$/.test(leagueId)) {
    throw new Error(`Refusing unsafe join smoke league id "${leagueId}". Use afbm-join-*.`);
  }

  return leagueId;
}

function nowIso() {
  return new Date().toISOString();
}

function activePlayer(teamId: string, index: number, overall: number): OnlineContractPlayer {
  return {
    age: 23 + index,
    contract: {} as OnlineContractPlayer["contract"],
    developmentPath: "solid",
    developmentProgress: 0,
    overall,
    playerId: `${teamId}-join-smoke-player-${index}`,
    playerName: `${teamId} Join Smoke Player ${index}`,
    position: index === 1 ? "QB" : index === 2 ? "WR" : "LB",
    potential: overall + 2,
    status: "active",
    xFactors: [],
  };
}

function createDepthChart(roster: OnlineContractPlayer[], updatedAt: string): OnlineDepthChartEntry[] {
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

async function clearCollection(ref: FirebaseFirestore.CollectionReference, label: string) {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await ref.get();

  if (snapshot.empty) {
    return;
  }

  const batch = firestore.batch();

  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await withMultiplayerFirestoreTimeout(batch.commit(), `clear ${label}`, {
    mode: "staging",
    projectId: "afbm-staging",
    resetAllowed: true,
  });
}

async function clearLeagueFixture(leagueRef: DocumentReference) {
  await Promise.all([
    clearCollection(leagueRef.collection("memberships"), `${leagueRef.id}/memberships`),
    clearCollection(leagueRef.collection("teams"), `${leagueRef.id}/teams`),
    clearCollection(leagueRef.collection("events"), `${leagueRef.id}/events`),
    clearCollection(leagueRef.collection("weeks"), `${leagueRef.id}/weeks`),
    clearCollection(leagueRef.collection("adminActionLocks"), `${leagueRef.id}/adminActionLocks`),
    clearCollection(leagueRef.collection("draft").doc("main").collection("picks"), `${leagueRef.id}/draft/picks`),
    clearCollection(leagueRef.collection("draft").doc("main").collection("availablePlayers"), `${leagueRef.id}/draft/availablePlayers`),
  ]);
}

async function clearLeagueMemberMirrors(leagueIds: string[], userIds: string[]) {
  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();

  leagueIds.forEach((leagueId) => {
    userIds.forEach((userId) => {
      batch.delete(firestore.collection("leagueMembers").doc(`${leagueId}_${userId}`));
    });
  });

  await batch.commit();
}

function seedLeagueBatch(input: {
  assignedUsers?: string[];
  leagueId: string;
  maxTeams: number;
  name: string;
}) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(input.leagueId);
  const batch = firestore.batch();
  const createdAt = nowIso();
  const teams = ONLINE_MVP_TEAM_POOL.slice(0, input.maxTeams);

  if (teams.length !== input.maxTeams) {
    throw new Error(`Join smoke needs ${input.maxTeams} seed teams; found ${teams.length}.`);
  }

  batch.set(leagueRef, {
    id: input.leagueId,
    name: input.name,
    status: "lobby",
    createdByUserId: JOIN_SEED_ACTOR,
    createdAt,
    updatedAt: createdAt,
    maxTeams: input.maxTeams,
    memberCount: input.assignedUsers?.length ?? 0,
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

  batch.set(leagueRef.collection("draft").doc("main"), {
    completedAt: createdAt,
    currentTeamId: "",
    draftOrder: teams.map((team) => team.id),
    leagueId: input.leagueId,
    pickNumber: 1,
    round: 1,
    startedAt: createdAt,
    status: "completed",
  });

  teams.forEach((team, index) => {
    const assignedUserId = input.assignedUsers?.[index] ?? null;
    const roster = [
      activePlayer(team.id, 1, 77 - index),
      activePlayer(team.id, 2, 74 - index),
      activePlayer(team.id, 3, 72 - index),
    ];
    const firestoreTeam = {
      ...mapLocalTeamToFirestoreTeam(team, createdAt),
      assignedUserId,
      contractRoster: roster,
      depthChart: createDepthChart(roster, createdAt),
      status: assignedUserId ? "assigned" : "available",
      updatedAt: createdAt,
    };

    batch.set(leagueRef.collection("teams").doc(team.id), firestoreTeam);

    if (!assignedUserId) {
      return;
    }

    batch.set(leagueRef.collection("memberships").doc(assignedUserId), {
      userId: assignedUserId,
      username: `${team.name} Existing GM`,
      displayName: `${team.name} Existing GM`,
      role: "gm",
      teamId: team.id,
      joinedAt: createdAt,
      lastSeenAt: createdAt,
      ready: false,
      status: "active",
    });
    batch.set(firestore.collection("leagueMembers").doc(`${input.leagueId}_${assignedUserId}`), {
      createdAt,
      id: `${input.leagueId}_${assignedUserId}`,
      leagueId: input.leagueId,
      leagueSlug: input.leagueId,
      role: "GM",
      status: "ACTIVE",
      teamId: team.id,
      uid: assignedUserId,
      updatedAt: createdAt,
      userId: assignedUserId,
    });
  });

  batch.set(leagueRef.collection("events").doc(), {
    type: "league_created",
    createdAt,
    createdByUserId: JOIN_SEED_ACTOR,
    payload: {
      source: "staging-join-smoke",
    },
  });

  return batch.commit();
}

async function seedJoinFixtures(input: {
  fullLeagueId: string;
  leagueId: string;
  raceLeagueId: string;
  userIds: string[];
}) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRefs = [input.leagueId, input.raceLeagueId, input.fullLeagueId].map((leagueId) =>
    firestore.collection("leagues").doc(leagueId),
  );

  await Promise.all(leagueRefs.map(clearLeagueFixture));
  await clearLeagueMemberMirrors(
    [input.leagueId, input.raceLeagueId, input.fullLeagueId],
    [...input.userIds, "staging-join-full-existing-gm"],
  );
  await Promise.all([
    seedLeagueBatch({
      leagueId: input.leagueId,
      maxTeams: 2,
      name: "AFBM Join Test League",
    }),
    seedLeagueBatch({
      leagueId: input.raceLeagueId,
      maxTeams: 2,
      name: "AFBM Join Race League",
    }),
    seedLeagueBatch({
      assignedUsers: ["staging-join-full-existing-gm"],
      leagueId: input.fullLeagueId,
      maxTeams: 1,
      name: "AFBM Join Full League",
    }),
  ]);
}

async function resolveSmokeUsers() {
  const primaryEmail = requireEnv("STAGING_JOIN_PLAYER_EMAIL");
  const primaryPassword = requireSecretEnv("STAGING_JOIN_PLAYER_PASSWORD");
  const secondEmail = readRequiredEnvAlias(
    "STAGING_JOIN_PLAYER_2_EMAIL",
    "STAGING_JOIN_SECOND_PLAYER_EMAIL",
  );
  const secondPassword = readRequiredSecretEnvAlias(
    "STAGING_JOIN_PLAYER_2_PASSWORD",
    "STAGING_JOIN_SECOND_PLAYER_PASSWORD",
  );
  const [primaryUid, secondUid] = await Promise.all([
    signInForUid(primaryEmail, primaryPassword),
    signInForUid(secondEmail, secondPassword),
  ]);

  if (primaryUid === secondUid) {
    throw new Error("Join smoke requires two distinct non-admin Firebase users.");
  }

  return {
    primary: { email: primaryEmail, password: primaryPassword, uid: primaryUid },
    second: { email: secondEmail, password: secondPassword, uid: secondUid },
  };
}

async function login(page: Page, baseUrl: string, user: JoinSmokeUser, label: string) {
  await page.goto(`${baseUrl}/online`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Passwort").fill(user.password);
  await page.getByRole("button", { name: "Einloggen" }).click();
  await expect(page.getByRole("heading", { name: "Online Liga" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByText(user.email, { exact: false }).first()).toBeVisible({
    timeout: 15_000,
  });
  console.log(`[join-smoke] login ok label=${label} uid=${user.uid} email=present`);
}

async function createLoggedInContext(browser: Browser, baseUrl: string, user: JoinSmokeUser, label: string) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page, baseUrl, user, label);

  return { context, page };
}

async function attachScreenshot(page: Page, outputDir: string, name: string) {
  const path = join(outputDir, `${name}.png`);

  await page.screenshot({ path, fullPage: true });
  console.log(`[join-smoke] screenshot ${name}=${path}`);
}

async function joinViaSearch(input: {
  baseUrl: string;
  leagueId: string;
  leagueName: string;
  outputDir: string;
  page: Page;
  screenshotPrefix?: string;
  teamNameId?: string;
}) {
  await input.page.goto(`${input.baseUrl}/online`, { waitUntil: "domcontentloaded" });
  await input.page.evaluate((key) => window.localStorage.removeItem(key), LAST_LEAGUE_STORAGE_KEY);
  await input.page.getByRole("button", { name: "Liga suchen" }).click();
  await expect(input.page.getByRole("heading", { name: input.leagueName })).toBeVisible({
    timeout: 45_000,
  });
  await input.page.getByRole("button", { name: "Team vorschlagen" }).click();
  if (input.teamNameId) {
    await input.page.getByLabel("3. Teamname").selectOption(input.teamNameId);
  }
  await expect(
    input.page.getByRole("button", { name: `Beitreten ${input.leagueName}` }),
  ).toBeEnabled();
  const screenshotPrefix = input.screenshotPrefix ?? "01";

  await attachScreenshot(input.page, input.outputDir, `${screenshotPrefix}-before-join-click`);
  await input.page.getByRole("button", { name: `Beitreten ${input.leagueName}` }).click();
  const leagueUrlPattern = new RegExp(`/online/league/${input.leagueId}`);

  try {
    await expect(input.page).toHaveURL(leagueUrlPattern, { timeout: 45_000 });
    return;
  } catch {
    await attachScreenshot(input.page, input.outputDir, `${screenshotPrefix}-after-join-click-no-navigation`);
  }

  const successLink = input.page.getByRole("link", { name: "Liga öffnen" });

  if (await successLink.isVisible()) {
    await successLink.click();
    await expect(input.page).toHaveURL(leagueUrlPattern, { timeout: 30_000 });
    return;
  }

  const bodyText = await input.page.locator("body").innerText().catch(() => "<body unavailable>");

  throw new Error(
    `Join did not navigate to ${input.leagueId}. Visible page text: ${bodyText.slice(0, 1600)}`,
  );
}

async function openLeagueDirect(page: Page, baseUrl: string, leagueId: string) {
  await page.goto(`${baseUrl}/online/league/${leagueId}`, { waitUntil: "domcontentloaded" });
}

async function readJoinState(leagueId: string, userId: string): Promise<JoinSmokeState> {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const [leagueSnapshot, membershipSnapshot, membershipsSnapshot] = await Promise.all([
    leagueRef.get(),
    leagueRef.collection("memberships").doc(userId).get(),
    leagueRef.collection("memberships").where("userId", "==", userId).get(),
  ]);
  const league = leagueSnapshot.data() as { memberCount?: number } | undefined;
  const membership = membershipSnapshot.exists
    ? (membershipSnapshot.data() as JoinSmokeMembership)
    : null;
  const activeMemberships = membershipsSnapshot.docs
    .map((document) => document.data() as JoinSmokeMembership)
    .filter((entry) => entry.status === "active");
  const teamSnapshot = membership?.teamId
    ? await leagueRef.collection("teams").doc(membership.teamId).get()
    : null;
  const team = teamSnapshot?.exists ? (teamSnapshot.data() as JoinSmokeTeam) : null;

  return {
    activeMemberships,
    memberCount: league?.memberCount ?? 0,
    membership,
    team,
  };
}

async function assertJoined(input: {
  expectedMemberCount?: number;
  label: string;
  leagueId: string;
  page?: Page;
  uid: string;
}) {
  let state = await readJoinState(input.leagueId, input.uid);

  await expect
    .poll(
      async () => {
        state = await readJoinState(input.leagueId, input.uid);

        return {
          assignedUserId: state.team?.assignedUserId ?? null,
          memberCount: state.memberCount,
          membershipCount: state.activeMemberships.length,
          membershipStatus: state.membership?.status ?? null,
          teamId: state.membership?.teamId ?? null,
          userId: state.membership?.userId ?? null,
        };
      },
      {
        intervals: [500, 1_000, 2_000],
        timeout: 45_000,
      },
    )
    .toMatchObject({
      assignedUserId: input.uid,
      membershipCount: 1,
      membershipStatus: "active",
      userId: input.uid,
      ...(typeof input.expectedMemberCount === "number"
        ? { memberCount: input.expectedMemberCount }
        : {}),
    });

  if (!state.membership) {
    throw new Error(`${input.label}: membership missing for uid=${input.uid}.`);
  }

  if (state.membership.userId !== input.uid) {
    throw new Error(`${input.label}: membership.userId=${state.membership.userId ?? "missing"} does not match uid=${input.uid}.`);
  }

  if (state.membership.status !== "active") {
    throw new Error(`${input.label}: membership.status=${state.membership.status ?? "missing"} is not active.`);
  }

  if (!state.membership.teamId) {
    throw new Error(`${input.label}: membership.teamId is missing.`);
  }

  if (!state.team) {
    throw new Error(`${input.label}: team document missing for teamId=${state.membership.teamId}.`);
  }

  if (state.team.assignedUserId !== input.uid) {
    throw new Error(
      `${input.label}: team.assignedUserId=${state.team.assignedUserId ?? "missing"} does not match uid=${input.uid}.`,
    );
  }

  if (state.activeMemberships.length !== 1) {
    throw new Error(`${input.label}: expected exactly one membership for uid=${input.uid}, found ${state.activeMemberships.length}.`);
  }

  if (
    typeof input.expectedMemberCount === "number" &&
    state.memberCount !== input.expectedMemberCount
  ) {
    throw new Error(`${input.label}: expected memberCount=${input.expectedMemberCount}, got ${state.memberCount}.`);
  }

  if (input.page && state.team.displayName) {
    await expect(input.page.getByText(state.team.displayName, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  console.log(
    `[join-smoke] ${input.label} membership ok leagueId=${input.leagueId} uid=${input.uid} teamId=${state.membership.teamId} teamAssigned=true memberCount=${state.memberCount}`,
  );

  return state;
}

async function assertFullLeagueBlocked(input: {
  baseUrl: string;
  fullLeagueId: string;
  outputDir: string;
  page: Page;
}) {
  await input.page.goto(`${input.baseUrl}/online`, { waitUntil: "domcontentloaded" });
  await input.page.evaluate((key) => window.localStorage.removeItem(key), LAST_LEAGUE_STORAGE_KEY);
  await input.page.getByRole("button", { name: "Liga suchen" }).click();
  await expect(input.page.getByRole("heading", { name: "AFBM Join Full League" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(input.page.getByText("1/1 Spieler").first()).toBeVisible();
  await expect(
    input.page.getByRole("button", { name: "Beitreten AFBM Join Full League" }),
  ).toBeDisabled();
  await attachScreenshot(input.page, input.outputDir, "08-full-league-blocked");
  console.log(`[join-smoke] full league blocked ok leagueId=${input.fullLeagueId}`);
}

async function closeContexts(contexts: BrowserContext[]) {
  await Promise.all(contexts.map((context) => context.close().catch(() => undefined)));
}

async function run() {
  if (hasArg("--help") || hasArg("-h")) {
    printHelp();
    return;
  }

  requireStagingConfirmation();

  const resetBeforeRun = hasArg("--reset-before-run");
  const environment = configureMultiplayerFirestoreEnvironment({ allowReset: resetBeforeRun });
  logMultiplayerFirestoreEnvironment(environment, "staging join smoke");

  const baseUrl = normalizeBaseUrl();
  const leagueId = normalizeLeagueId();
  const raceLeagueId = `${leagueId}-race`;
  const fullLeagueId = `${leagueId}-full`;
  const users = await resolveSmokeUsers();
  const outputDir = mkdtempSync(join(tmpdir(), "afbm-staging-join-smoke-"));

  console.log(`[join-smoke] baseUrl=${baseUrl}`);
  console.log(`[join-smoke] leagueId=${leagueId}`);
  console.log(`[join-smoke] raceLeagueId=${raceLeagueId}`);
  console.log(`[join-smoke] fullLeagueId=${fullLeagueId}`);
  console.log(`[join-smoke] primaryUid=${users.primary.uid}`);
  console.log(`[join-smoke] secondUid=${users.second.uid}`);
  console.log(`[join-smoke] outputDir=${outputDir}`);

  if (resetBeforeRun) {
    await seedJoinFixtures({
      fullLeagueId,
      leagueId,
      raceLeagueId,
      userIds: [users.primary.uid, users.second.uid],
    });
    console.log("[join-smoke] fixture reset ok freeTeams=2 fullLeagueMembers=1");
  } else {
    console.log("[join-smoke] fixture reset skipped; using prepared Phase 2 staging fixtures");
  }

  const browser = await chromium.launch({ headless: !hasArg("--headed") });
  const contexts: BrowserContext[] = [];

  try {
    const primarySession = await createLoggedInContext(browser, baseUrl, users.primary, "primary");
    contexts.push(primarySession.context);

    await joinViaSearch({
      baseUrl,
      leagueId,
      leagueName: "AFBM Join Test League",
      outputDir,
      page: primarySession.page,
    });
    const primaryJoin = await assertJoined({
      expectedMemberCount: 1,
      label: "primary join",
      leagueId,
      page: primarySession.page,
      uid: users.primary.uid,
    });
    await attachScreenshot(primarySession.page, outputDir, "02-after-primary-join");

    await primarySession.page.reload({ waitUntil: "domcontentloaded" });
    await assertJoined({
      expectedMemberCount: 1,
      label: "primary reload",
      leagueId,
      page: primarySession.page,
      uid: users.primary.uid,
    });
    await attachScreenshot(primarySession.page, outputDir, "03-after-primary-reload");

    await openLeagueDirect(primarySession.page, baseUrl, leagueId);
    const doubleJoin = await assertJoined({
      expectedMemberCount: 1,
      label: "double join guard",
      leagueId,
      page: primarySession.page,
      uid: users.primary.uid,
    });

    if (doubleJoin.membership?.teamId !== primaryJoin.membership?.teamId) {
      throw new Error(
        `double join changed team from ${primaryJoin.membership?.teamId ?? "missing"} to ${doubleJoin.membership?.teamId ?? "missing"}.`,
      );
    }

    const racePrimary = await createLoggedInContext(browser, baseUrl, users.primary, "race-primary");
    const raceSecond = await createLoggedInContext(browser, baseUrl, users.second, "race-second");
    contexts.push(racePrimary.context, raceSecond.context);

    const raceJoinAttempts = await Promise.allSettled([
      joinViaSearch({
        baseUrl,
        leagueId: raceLeagueId,
        leagueName: "AFBM Join Race League",
        outputDir,
        page: racePrimary.page,
        screenshotPrefix: "04-race-primary",
        teamNameId: "skyline",
      }),
      joinViaSearch({
        baseUrl,
        leagueId: raceLeagueId,
        leagueName: "AFBM Join Race League",
        outputDir,
        page: raceSecond.page,
        screenshotPrefix: "05-race-second",
        teamNameId: "harbor",
      }),
    ]);
    const rejectedRaceAttempts = raceJoinAttempts.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    if (rejectedRaceAttempts.length > 0) {
      console.log(
        `[join-smoke] parallel join contention retry count=${rejectedRaceAttempts.length}`,
      );

      if (raceJoinAttempts[0]?.status === "rejected") {
        await joinViaSearch({
          baseUrl,
          leagueId: raceLeagueId,
          leagueName: "AFBM Join Race League",
          outputDir,
          page: racePrimary.page,
          screenshotPrefix: "06-race-primary-retry",
          teamNameId: "skyline",
        });
      }

      if (raceJoinAttempts[1]?.status === "rejected") {
        await joinViaSearch({
          baseUrl,
          leagueId: raceLeagueId,
          leagueName: "AFBM Join Race League",
          outputDir,
          page: raceSecond.page,
          screenshotPrefix: "07-race-second-retry",
          teamNameId: "harbor",
        });
      }
    }
    const [racePrimaryState, raceSecondState] = await Promise.all([
      assertJoined({
        expectedMemberCount: 2,
        label: "parallel join primary",
        leagueId: raceLeagueId,
        page: racePrimary.page,
        uid: users.primary.uid,
      }),
      assertJoined({
        expectedMemberCount: 2,
        label: "parallel join second",
        leagueId: raceLeagueId,
        page: raceSecond.page,
        uid: users.second.uid,
      }),
    ]);

    if (racePrimaryState.membership?.teamId === raceSecondState.membership?.teamId) {
      throw new Error(
        `parallel join assigned both users to teamId=${racePrimaryState.membership?.teamId ?? "missing"}.`,
      );
    }

    console.log(
      `[join-smoke] parallel join ok primaryTeam=${racePrimaryState.membership?.teamId} secondTeam=${raceSecondState.membership?.teamId}`,
    );

    await assertFullLeagueBlocked({
      baseUrl,
      fullLeagueId,
      outputDir,
      page: primarySession.page,
    });

    console.log("[join-smoke] edge full-league error ok");
    console.log("[join-smoke] edge double-join no-duplicate ok");
    console.log("[join-smoke] status=GREEN");
  } finally {
    await closeContexts(contexts);
    await browser.close().catch(() => undefined);

    if (hasArg("--cleanup-artifacts")) {
      rmSync(outputDir, { force: true, recursive: true });
    }
  }
}

run().catch((error) => {
  console.error(`[join-smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  console.error("[join-smoke] status=RED");
  process.exitCode = 1;
});
