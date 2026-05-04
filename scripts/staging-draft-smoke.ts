import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { DocumentReference } from "firebase-admin/firestore";

import {
  getFirebaseAdminFirestore,
} from "../src/lib/firebase/admin";
import {
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
} from "../src/lib/online/online-league-draft-service";
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

type DraftSmokeUser = {
  email: string;
  password: string;
  uid: string;
};

type DraftStateSnapshot = {
  availablePlayerIds: string[];
  currentTeamId?: string;
  pickCount: number;
  pickNumber?: number;
  round?: number;
  status?: string;
};

const DEFAULT_BASE_URL = "https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app";
const DEFAULT_LEAGUE_ID = "afbm-draft-test";
const DEFAULT_STAGING_WEB_API_KEY = "AIzaSyC2JqgkfFuGhvE3KuMIQ1DCvC003m8q320";
const DRAFT_RUN_ID = "staging-draft-smoke-v1";
const SEED_ACTOR_ID = "staging-draft-smoke-seed";
const PRIMARY_PLAYER_ID = "draft-smoke-qb-alpha";
const PRIMARY_PLAYER_NAME = "Draft Smoke QB Alpha";

function printHelp() {
  console.log(`Run the Staging Draft smoke.

Usage:
  CONFIRM_STAGING_SMOKE=true \\
  CONFIRM_STAGING_DRAFT_SMOKE=true \\
  GOOGLE_CLOUD_PROJECT=afbm-staging \\
  STAGING_DRAFT_PLAYER_EMAIL=<email> \\
  STAGING_DRAFT_PLAYER_PASSWORD=<password> \\
  STAGING_DRAFT_PLAYER_2_EMAIL=<email> \\
  STAGING_DRAFT_PLAYER_2_PASSWORD=<password> \\
  npm run staging:smoke:draft -- --league-id afbm-draft-test

  # Optional fixture reset:
  CONFIRM_STAGING_SEED=true npm run staging:smoke:draft -- --reset-before-run

Flow:
  1. Use a prepared staging-only afbm-draft-* league with draft.status=active.
  2. Login as the player whose team is on the clock.
  3. Open /online/league/<league>/draft and verify round/current team.
  4. Pick ${PRIMARY_PLAYER_NAME} through the browser UI.
  5. Verify pick doc, availablePlayers removal and next team.
  6. Verify a wrong player sees "Warte auf anderes Team" before the pick.
  7. Verify the picked player is no longer selectable after the pick.

Safety:
  - Requires CONFIRM_STAGING_SMOKE=true.
  - Requires CONFIRM_STAGING_DRAFT_SMOKE=true because it mutates Staging.
  - Only resets afbm-draft-* test fixtures when --reset-before-run and CONFIRM_STAGING_SEED=true are set.
  - Refuses non-afbm-staging project IDs and non-afbm-draft-* league IDs.
  - Refuses users with admin=true custom claims.
  - Never prints passwords.
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
    throw new Error(`Draft smoke refuses admin=true user: ${email}`);
  }

  return payload.localId;
}

function requireStagingConfirmation() {
  if (process.env.CONFIRM_STAGING_SMOKE !== "true") {
    throw new Error("Draft smoke requires CONFIRM_STAGING_SMOKE=true.");
  }

  if (process.env.CONFIRM_STAGING_DRAFT_SMOKE !== "true") {
    throw new Error(
      "Draft smoke requires CONFIRM_STAGING_DRAFT_SMOKE=true because it mutates Staging.",
    );
  }

  if (hasArg("--reset-before-run") && process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error(
      "Draft smoke --reset-before-run requires CONFIRM_STAGING_SEED=true because it resets afbm-draft-* fixtures.",
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
  const leagueId =
    readArg("--league-id") ?? process.env.STAGING_DRAFT_LEAGUE_ID ?? DEFAULT_LEAGUE_ID;

  if (!/^afbm-draft-[a-z0-9-]{3,60}$/.test(leagueId)) {
    throw new Error(`Refusing unsafe draft smoke league id "${leagueId}". Use afbm-draft-*.`);
  }

  return leagueId;
}

function nowIso() {
  return new Date().toISOString();
}

function createDraftPlayer(
  playerId: string,
  playerName: string,
  position: keyof typeof ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  overall: number,
): OnlineContractPlayer & {
  createdBySeed: boolean;
  displayName: string;
  draftRunId: string;
  leagueSlug: string;
  seedKey: string;
  testData: boolean;
} {
  return {
    age: 24,
    contract: {} as OnlineContractPlayer["contract"],
    createdBySeed: true,
    developmentPath: "solid",
    developmentProgress: 0,
    displayName: playerName,
    draftRunId: DRAFT_RUN_ID,
    leagueSlug: DEFAULT_LEAGUE_ID,
    overall,
    playerId,
    playerName,
    position,
    potential: overall + 2,
    seedKey: DRAFT_RUN_ID,
    status: "active",
    testData: true,
    xFactors: [],
  };
}

function createDraftPool(leagueId: string) {
  const pool = [
    createDraftPlayer(PRIMARY_PLAYER_ID, PRIMARY_PLAYER_NAME, "QB", 99),
    createDraftPlayer("draft-smoke-wr-beta", "Draft Smoke WR Beta", "WR", 94),
    createDraftPlayer("draft-smoke-rb-gamma", "Draft Smoke RB Gamma", "RB", 91),
    createDraftPlayer("draft-smoke-lb-delta", "Draft Smoke LB Delta", "LB", 88),
  ];

  return pool.map((player, index) => ({
    ...player,
    leagueSlug: leagueId,
    overall: player.overall - index,
  }));
}

function createDepthChart(roster: OnlineContractPlayer[], updatedAt: string): OnlineDepthChartEntry[] {
  return ONLINE_FANTASY_DRAFT_POSITIONS.flatMap((position) => {
    const players = roster.filter((player) => player.position === position);
    const [starter, ...backups] = players;

    return starter
      ? [{
          backupPlayerIds: backups.map((player) => player.playerId),
          position,
          starterPlayerId: starter.playerId,
          updatedAt,
        }]
      : [];
  });
}

async function clearCollection(ref: FirebaseFirestore.CollectionReference, label: string) {
  const environment = {
    mode: "staging" as const,
    projectId: "afbm-staging",
    resetAllowed: true,
  };
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await ref.get();

  if (snapshot.empty) {
    return;
  }

  const batch = firestore.batch();

  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await withMultiplayerFirestoreTimeout(batch.commit(), `clear ${label}`, environment);
}

async function clearLeagueFixture(leagueRef: DocumentReference) {
  await Promise.all([
    clearCollection(leagueRef.collection("memberships"), `${leagueRef.id}/memberships`),
    clearCollection(leagueRef.collection("teams"), `${leagueRef.id}/teams`),
    clearCollection(leagueRef.collection("events"), `${leagueRef.id}/events`),
    clearCollection(leagueRef.collection("adminActionLocks"), `${leagueRef.id}/adminActionLocks`),
    clearCollection(leagueRef.collection("draft").doc("main").collection("picks"), `${leagueRef.id}/draft/picks`),
    clearCollection(leagueRef.collection("draft").doc("main").collection("availablePlayers"), `${leagueRef.id}/draft/availablePlayers`),
  ]);
}

async function resolveUser(emailEnv: string, passwordEnv: string): Promise<DraftSmokeUser> {
  const email = requireEnv(emailEnv);
  const password = requireSecretEnv(passwordEnv);
  const uid = await signInForUid(email, password);

  return {
    email,
    password,
    uid,
  };
}

async function resolveSmokeUsers() {
  const primary = await resolveUser("STAGING_DRAFT_PLAYER_EMAIL", "STAGING_DRAFT_PLAYER_PASSWORD");
  const secondEmail = readRequiredEnvAlias(
    "STAGING_DRAFT_PLAYER_2_EMAIL",
    "STAGING_DRAFT_SECOND_PLAYER_EMAIL",
  );
  const secondPassword = readRequiredSecretEnvAlias(
    "STAGING_DRAFT_PLAYER_2_PASSWORD",
    "STAGING_DRAFT_SECOND_PLAYER_PASSWORD",
  );
  const second = {
    email: secondEmail,
    password: secondPassword,
    uid: await signInForUid(secondEmail, secondPassword),
  };

  if (primary.uid === second.uid) {
    throw new Error("Draft smoke requires two distinct non-admin Firebase users.");
  }

  return { primary, second };
}

async function seedDraftLeague(input: {
  leagueId: string;
  primaryUid: string;
  secondUid: string;
}) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(input.leagueId);
  const createdAt = nowIso();
  const [primaryTeam, secondTeam] = ONLINE_MVP_TEAM_POOL.slice(0, 2);

  if (!primaryTeam || !secondTeam) {
    throw new Error("Draft smoke requires at least two MVP teams.");
  }

  await clearLeagueFixture(leagueRef);
  await Promise.all([
    firestore.collection("leagueMembers").doc(`${input.leagueId}_${input.primaryUid}`).delete(),
    firestore.collection("leagueMembers").doc(`${input.leagueId}_${input.secondUid}`).delete(),
  ]);

  const batch = firestore.batch();
  const teams = [
    { team: primaryTeam, userId: input.primaryUid },
    { team: secondTeam, userId: input.secondUid },
  ];
  const availablePlayers = createDraftPool(input.leagueId);

  batch.set(leagueRef, {
    id: input.leagueId,
    name: "AFBM Draft Smoke League",
    status: "lobby",
    createdByUserId: SEED_ACTOR_ID,
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
    settings: {
      onlineBackbone: true,
    },
    version: 1,
  });
  batch.set(leagueRef.collection("draft").doc("main"), {
    completedAt: null,
    currentTeamId: primaryTeam.id,
    draftOrder: [primaryTeam.id, secondTeam.id],
    draftRunId: DRAFT_RUN_ID,
    leagueId: input.leagueId,
    pickNumber: 1,
    round: 1,
    seedKey: DRAFT_RUN_ID,
    startedAt: createdAt,
    status: "active",
    testData: true,
  });

  teams.forEach(({ team, userId }) => {
    const roster: OnlineContractPlayer[] = [];
    const teamDoc = {
      ...mapLocalTeamToFirestoreTeam(team, createdAt),
      assignedUserId: userId,
      contractRoster: roster,
      depthChart: createDepthChart(roster, createdAt),
      status: "assigned",
      updatedAt: createdAt,
    };

    batch.set(leagueRef.collection("teams").doc(team.id), teamDoc);
    batch.set(leagueRef.collection("memberships").doc(userId), {
      userId,
      username: `${team.name} Draft GM`,
      displayName: `${team.name} Draft GM`,
      role: "gm",
      teamId: team.id,
      joinedAt: createdAt,
      lastSeenAt: createdAt,
      ready: false,
      status: "active",
    });
    batch.set(firestore.collection("leagueMembers").doc(`${input.leagueId}_${userId}`), {
      createdAt,
      id: `${input.leagueId}_${userId}`,
      leagueId: input.leagueId,
      leagueSlug: input.leagueId,
      role: "GM",
      status: "ACTIVE",
      teamId: team.id,
      uid: userId,
      updatedAt: createdAt,
      userId,
    });
  });

  availablePlayers.forEach((player) => {
    batch.set(
      leagueRef.collection("draft").doc("main").collection("availablePlayers").doc(player.playerId),
      player,
    );
  });
  batch.set(leagueRef.collection("events").doc(), {
    type: "draft_smoke_seeded",
    createdAt,
    createdByUserId: SEED_ACTOR_ID,
    payload: {
      currentTeamId: primaryTeam.id,
      draftRunId: DRAFT_RUN_ID,
      source: "staging-draft-smoke",
    },
  });

  await batch.commit();

  return {
    availablePlayerIds: availablePlayers.map((player) => player.playerId),
    primaryTeamId: primaryTeam.id,
    primaryTeamName: primaryTeam.name,
    secondTeamId: secondTeam.id,
    secondTeamName: secondTeam.name,
  };
}

async function login(page: Page, baseUrl: string, user: DraftSmokeUser, label: string) {
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
  console.log(`[draft-smoke] login ok label=${label} uid=${user.uid} email=present`);
}

async function createLoggedInContext(browser: Browser, baseUrl: string, user: DraftSmokeUser, label: string) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page, baseUrl, user, label);

  return { context, page };
}

async function openDraft(page: Page, baseUrl: string, leagueId: string) {
  await page.goto(`${baseUrl}/online/league/${leagueId}/draft`, { waitUntil: "domcontentloaded" });
  await dismissOnboardingCoach(page);
  await expect(page.getByText("Draft Room")).toBeVisible({ timeout: 45_000 });
}

async function attachScreenshot(page: Page, outputDir: string, name: string) {
  const path = join(outputDir, `${name}.png`);

  await page.screenshot({ path, fullPage: true });
  console.log(`[draft-smoke] screenshot ${name}=${path}`);
}

async function dismissOnboardingCoach(page: Page) {
  const laterButton = page.getByRole("button", { name: "Spaeter" });

  if (await laterButton.isVisible().catch(() => false)) {
    await laterButton.click();
  }
}

async function readDraftState(leagueId: string): Promise<DraftStateSnapshot> {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const [draftSnapshot, picksSnapshot, availableSnapshot] = await Promise.all([
    leagueRef.collection("draft").doc("main").get(),
    leagueRef.collection("draft").doc("main").collection("picks").get(),
    leagueRef.collection("draft").doc("main").collection("availablePlayers").get(),
  ]);
  const draft = draftSnapshot.data() as
    | {
        currentTeamId?: string;
        pickNumber?: number;
        round?: number;
        status?: string;
      }
    | undefined;

  return {
    availablePlayerIds: availableSnapshot.docs.map((document) => document.id),
    currentTeamId: draft?.currentTeamId,
    pickCount: picksSnapshot.size,
    pickNumber: draft?.pickNumber,
    round: draft?.round,
    status: draft?.status,
  };
}

async function loadPreparedDraftFixture(input: {
  leagueId: string;
  primaryUid: string;
  secondUid: string;
}) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(input.leagueId);
  const [primaryMembershipSnapshot, secondMembershipSnapshot, draftSnapshot] = await Promise.all([
    leagueRef.collection("memberships").doc(input.primaryUid).get(),
    leagueRef.collection("memberships").doc(input.secondUid).get(),
    leagueRef.collection("draft").doc("main").get(),
  ]);
  const primaryMembership = primaryMembershipSnapshot.data() as { teamId?: string; status?: string } | undefined;
  const secondMembership = secondMembershipSnapshot.data() as { teamId?: string; status?: string } | undefined;
  const draft = draftSnapshot.data() as { currentTeamId?: string; draftOrder?: string[]; status?: string } | undefined;

  if (!primaryMembership?.teamId || primaryMembership.status !== "active") {
    throw new Error(`Prepared draft fixture missing active primary membership for uid=${input.primaryUid}. Run staging:setup:phase2-fixtures --reset.`);
  }

  if (!secondMembership?.teamId || secondMembership.status !== "active") {
    throw new Error(`Prepared draft fixture missing active second membership for uid=${input.secondUid}. Run staging:setup:phase2-fixtures --reset.`);
  }

  if (draft?.status !== "active" || draft.currentTeamId !== primaryMembership.teamId) {
    throw new Error("Prepared draft fixture is not active with draft player 1 on the clock. Run staging:setup:phase2-fixtures --reset.");
  }

  if (!draft.draftOrder?.includes(primaryMembership.teamId) || !draft.draftOrder.includes(secondMembership.teamId)) {
    throw new Error("Prepared draft fixture draftOrder does not include both draft teams. Run staging:setup:phase2-fixtures --reset.");
  }

  const [primaryTeamSnapshot, secondTeamSnapshot] = await Promise.all([
    leagueRef.collection("teams").doc(primaryMembership.teamId).get(),
    leagueRef.collection("teams").doc(secondMembership.teamId).get(),
  ]);
  const primaryTeam = primaryTeamSnapshot.data() as { displayName?: string; teamName?: string } | undefined;
  const secondTeam = secondTeamSnapshot.data() as { displayName?: string; teamName?: string } | undefined;

  return {
    primaryTeamId: primaryMembership.teamId,
    primaryTeamName: primaryTeam?.displayName ?? primaryTeam?.teamName ?? primaryMembership.teamId,
    secondTeamId: secondMembership.teamId,
    secondTeamName: secondTeam?.displayName ?? secondTeam?.teamName ?? secondMembership.teamId,
  };
}

async function readPick(leagueId: string, pickId = "0001") {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("leagues")
    .doc(leagueId)
    .collection("draft")
    .doc("main")
    .collection("picks")
    .doc(pickId)
    .get();

  return snapshot.exists ? snapshot.data() : null;
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
  logMultiplayerFirestoreEnvironment(environment, "staging draft smoke");

  const baseUrl = normalizeBaseUrl();
  const leagueId = normalizeLeagueId();
  const users = await resolveSmokeUsers();
  const outputDir = mkdtempSync(join(tmpdir(), "afbm-staging-draft-smoke-"));

  console.log(`[draft-smoke] baseUrl=${baseUrl}`);
  console.log(`[draft-smoke] leagueId=${leagueId}`);
  console.log(`[draft-smoke] primaryUid=${users.primary.uid}`);
  console.log(`[draft-smoke] secondUid=${users.second.uid}`);
  console.log(`[draft-smoke] outputDir=${outputDir}`);

  const seed = resetBeforeRun
    ? await seedDraftLeague({
        leagueId,
        primaryUid: users.primary.uid,
        secondUid: users.second.uid,
      })
    : await loadPreparedDraftFixture({
        leagueId,
        primaryUid: users.primary.uid,
        secondUid: users.second.uid,
      });
  console.log(
    `[draft-smoke] fixture ${resetBeforeRun ? "reset" : "prepared"} primaryTeam=${seed.primaryTeamId} secondTeam=${seed.secondTeamId}`,
  );
  const before = await readDraftState(leagueId);

  console.log(
    `[draft-smoke] before status=${before.status} round=${before.round} pick=${before.pickNumber} currentTeam=${before.currentTeamId} available=${before.availablePlayerIds.length}`,
  );

  if (
    before.status !== "active" ||
    before.round !== 1 ||
    before.pickNumber !== 1 ||
    before.currentTeamId !== seed.primaryTeamId ||
    !before.availablePlayerIds.includes(PRIMARY_PLAYER_ID)
  ) {
    throw new Error("Seeded draft state is not active/current for the primary test player.");
  }

  const browser = await chromium.launch({ headless: !hasArg("--headed") });
  const contexts: BrowserContext[] = [];

  try {
    const primarySession = await createLoggedInContext(browser, baseUrl, users.primary, "primary");
    const wrongSession = await createLoggedInContext(browser, baseUrl, users.second, "wrong-player");
    contexts.push(primarySession.context, wrongSession.context);

    await openDraft(wrongSession.page, baseUrl, leagueId);
    await expect(wrongSession.page.getByText("Warte auf anderes Team")).toBeVisible({
      timeout: 30_000,
    });
    await wrongSession.page.getByText(PRIMARY_PLAYER_NAME).click();
    await expect(wrongSession.page.getByRole("button", { name: "Pick bestaetigen" })).toBeDisabled();
    console.log(`[draft-smoke] wrong-player blocked ok uid=${users.second.uid}`);
    await attachScreenshot(wrongSession.page, outputDir, "01-wrong-player-blocked");

    await openDraft(primarySession.page, baseUrl, leagueId);
    await expect(primarySession.page.getByText("Runde: 1")).toBeVisible();
    await expect(primarySession.page.getByText("Pick: 1")).toBeVisible();
    await expect(primarySession.page.getByText(`Am Zug: ${seed.primaryTeamName}`)).toBeVisible();
    await expect(primarySession.page.getByText("Du bist am Zug")).toBeVisible();
    await primarySession.page.getByText(PRIMARY_PLAYER_NAME).click();
    await dismissOnboardingCoach(primarySession.page);
    await attachScreenshot(primarySession.page, outputDir, "02-before-valid-pick");
    await expect(primarySession.page.getByRole("button", { name: "Pick bestaetigen" })).toBeEnabled();
    await primarySession.page.getByRole("button", { name: "Pick bestaetigen" }).click();
    await expect(primarySession.page.getByText("Pick gespeichert.")).toBeVisible({
      timeout: 45_000,
    });
    await attachScreenshot(primarySession.page, outputDir, "03-after-valid-pick");

    const after = await readDraftState(leagueId);
    const pick = await readPick(leagueId);

    if (!pick) {
      throw new Error("Pick doc 0001 was not created.");
    }

    if (pick.playerId !== PRIMARY_PLAYER_ID || pick.teamId !== seed.primaryTeamId) {
      throw new Error(
        `Pick doc mismatch: playerId=${String(pick.playerId)} teamId=${String(pick.teamId)}.`,
      );
    }

    if (pick.pickedByUserId !== users.primary.uid) {
      throw new Error(`Pick pickedByUserId=${String(pick.pickedByUserId)} does not match primary uid.`);
    }

    if (after.availablePlayerIds.includes(PRIMARY_PLAYER_ID)) {
      throw new Error(`${PRIMARY_PLAYER_ID} still exists in availablePlayers after pick.`);
    }

    if (
      after.status !== "active" ||
      after.pickCount !== 1 ||
      after.pickNumber !== 2 ||
      after.currentTeamId !== seed.secondTeamId
    ) {
      throw new Error(
        `Unexpected post-pick draft state: status=${after.status} picks=${after.pickCount} pick=${after.pickNumber} currentTeam=${after.currentTeamId}.`,
      );
    }

    await primarySession.page.reload({ waitUntil: "domcontentloaded" });
    await expect(primarySession.page.getByText("Warte auf anderes Team")).toBeVisible({
      timeout: 30_000,
    });
    await expect(primarySession.page.getByText(PRIMARY_PLAYER_NAME).first()).toBeVisible();
    console.log("[draft-smoke] unavailable/double-pick blocked by removal from available player table");
    console.log(
      `[draft-smoke] after status=${after.status} round=${after.round} pick=${after.pickNumber} currentTeam=${after.currentTeamId} available=${after.availablePlayerIds.length}`,
    );
    console.log(
      `[draft-smoke] pick playerId=${String(pick.playerId)} teamId=${String(pick.teamId)} pickedBy=${String(pick.pickedByUserId)} pickNumber=${String(pick.pickNumber)}`,
    );
    console.log("[draft-smoke] status=GREEN");
  } finally {
    await closeContexts(contexts);
    await browser.close().catch(() => undefined);
  }
}

run().catch((error) => {
  console.error(`[draft-smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  console.error("[draft-smoke] status=RED");
  process.exitCode = 1;
});
