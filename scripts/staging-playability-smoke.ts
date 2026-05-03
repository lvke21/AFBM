import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { prepareStagingSmokeMutationRun } from "./staging-smoke-state";

type SmokeLeagueUser = {
  id?: string;
  readyForWeek?: boolean;
  teamId?: string;
  teamName?: string;
  uid?: string;
  userId?: string;
  username?: string;
};

type SmokeLeagueTeam = {
  assignedUserId?: string | null;
  id?: string;
  name?: string;
};

type SmokeLeague = {
  completedWeeks?: unknown[];
  currentSeason?: number;
  currentWeek?: number;
  id: string;
  matchResults?: unknown[];
  schedule?: unknown[];
  standings?: Array<{ gamesPlayed?: number; teamId?: string; wins?: number }>;
  teams?: SmokeLeagueTeam[];
  users?: SmokeLeagueUser[];
  weekStatus?: string;
};

type AdminActionResponse = {
  code?: string;
  league?: SmokeLeague | null;
  leagues?: Array<{ id: string }>;
  message?: string;
  ok: boolean;
  simulation?: {
    gamesSimulated: number;
    leagueId: string;
    nextWeek: number;
    simulatedWeek: number;
    standingsSummary?: unknown[];
  };
};

type TokenIdentity = {
  adminClaim: boolean;
  emailPresent: boolean;
  uid: string;
};

const DEFAULT_BASE_URL = "https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app";
const DEFAULT_LEAGUE_ID = "afbm-playability-test";
const DEFAULT_STAGING_WEB_API_KEY = "AIzaSyC2JqgkfFuGhvE3KuMIQ1DCvC003m8q320";
const DEFAULT_PLAYABILITY_UID = "basel-rhinos-gm";
const DEFAULT_STAGING_SIGNING_SERVICE_ACCOUNT =
  "firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com";

function printHelp() {
  console.log(`Run the real Staging Multiplayer Playability smoke.

Usage:
  CONFIRM_STAGING_SMOKE=true \\
  CONFIRM_STAGING_PLAYABILITY_SMOKE=true \\
  GOOGLE_CLOUD_PROJECT=afbm-staging \\
  npm run staging:smoke:playability -- --league-id afbm-playability-test --expected-commit <sha>
  npm run staging:smoke:playability -- --reset-before-run --expected-commit <sha>

Flow:
  1. Verify deployed staging commit when --expected-commit is provided.
  2. Authenticate against Staging.
  3. Load league through the Staging Admin API.
  4. Verify the authenticated user has a real team in that league.
  5. Run setAllReady through the same API path the Admin UI uses.
  6. Run simulateWeek for the current league week.
  7. Verify results, standings and week advancement.
  8. Reload the league and verify the state is still stable.

Safety:
  - Requires CONFIRM_STAGING_SMOKE=true.
  - Requires CONFIRM_STAGING_PLAYABILITY_SMOKE=true because this mutates Staging.
  - Without --reset-before-run, refuses dirty or already-simulated test state before mutating.
  - With --reset-before-run, requires CONFIRM_STAGING_SEED=true and logs resetUsed=true.
  - Refuses non-afbm-staging hosted URLs.
  - Uses uid=${DEFAULT_PLAYABILITY_UID} for IAM custom-token auth unless STAGING_PLAYABILITY_UID or STAGING_FIREBASE_ADMIN_UID is set.
  - Never prints tokens or passwords.
`);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);

  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function requireConfirmation() {
  if (process.env.CONFIRM_STAGING_SMOKE !== "true") {
    throw new Error("Playability smoke requires CONFIRM_STAGING_SMOKE=true.");
  }

  if (process.env.CONFIRM_STAGING_PLAYABILITY_SMOKE !== "true") {
    throw new Error(
      "Playability smoke requires CONFIRM_STAGING_PLAYABILITY_SMOKE=true for mutating staging checks.",
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

function normalizeCommit(value: string | null | undefined) {
  const commit = value?.trim().toLowerCase() ?? "";

  return commit.length > 0 ? commit : null;
}

function getLocalGitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function resolveExpectedCommit() {
  return (
    normalizeCommit(readArg("--expected-commit")) ??
    normalizeCommit(process.env.STAGING_EXPECTED_COMMIT) ??
    normalizeCommit(getLocalGitCommit())
  );
}

function commitMatches(remoteCommit: string, expectedCommit: string) {
  const remote = normalizeCommit(remoteCommit);
  const expected = normalizeCommit(expectedCommit);

  return Boolean(remote && expected && (remote.startsWith(expected) || expected.startsWith(remote)));
}

async function verifyStagingCommit(baseUrl: string, expectedCommit: string) {
  const response = await fetch(`${baseUrl}/api/build-info`, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`/api/build-info returned HTTP ${response.status}; Staging target is not verifiable.`);
  }

  const payload = (await response.json()) as {
    commit?: string | null;
    deployEnv?: string | null;
    environment?: string | null;
    revision?: string | null;
  };
  const remoteCommit = normalizeCommit(payload.commit);

  if (!remoteCommit || !commitMatches(remoteCommit, expectedCommit)) {
    throw new Error(
      `Staging commit mismatch: expected=${expectedCommit} deployed=${remoteCommit ?? "missing"} revision=${payload.revision ?? "unknown"}.`,
    );
  }

  console.log(
    `[playability-smoke] commit ok expected=${expectedCommit} deployed=${remoteCommit} revision=${payload.revision ?? "unknown"} env=${payload.environment ?? payload.deployEnv ?? "unknown"}`,
  );
}

function decodeFirebaseIdTokenPayload(token: string) {
  const parts = token.split(".");

  if (parts.length < 2 || !parts[1]) {
    throw new Error("Firebase ID token is not a JWT.");
  }

  return JSON.parse(
    Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
  ) as {
    admin?: boolean;
    email?: string;
    sub?: string;
    user_id?: string;
  };
}

function getTokenIdentity(token: string): TokenIdentity {
  const payload = decodeFirebaseIdTokenPayload(token);
  const uid = payload.user_id ?? payload.sub;

  if (!uid) {
    throw new Error("Firebase ID token does not contain user_id/sub.");
  }

  return {
    adminClaim: payload.admin === true,
    emailPresent: Boolean(payload.email),
    uid,
  };
}

async function getFirebaseIdToken() {
  const existingToken = process.env.E2E_FIREBASE_ADMIN_ID_TOKEN?.trim();

  if (existingToken) {
    return { source: "E2E_FIREBASE_ADMIN_ID_TOKEN", token: existingToken };
  }

  const email = process.env.STAGING_FIREBASE_TEST_EMAIL?.trim();
  const password = process.env.STAGING_FIREBASE_TEST_PASSWORD ?? "";
  const apiKey =
    process.env.STAGING_FIREBASE_WEB_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
    DEFAULT_STAGING_WEB_API_KEY;

  if (email && password) {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        body: JSON.stringify({ email, password, returnSecureToken: true }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const payload = (await response.json()) as { error?: { message?: string }; idToken?: string };

    if (!response.ok || !payload.idToken) {
      throw new Error(`Firebase REST login failed: ${payload.error?.message ?? response.statusText}`);
    }

    return { source: "Firebase REST email/password login", token: payload.idToken };
  }

  return signInWithIamSignedCustomToken(apiKey);
}

async function signInWithIamSignedCustomToken(apiKey: string) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim() || "afbm-staging";
  const uid =
    process.env.STAGING_PLAYABILITY_UID?.trim() ||
    process.env.STAGING_FIREBASE_ADMIN_UID?.trim() ||
    DEFAULT_PLAYABILITY_UID;
  const serviceAccount =
    process.env.STAGING_FIREBASE_SIGNING_SERVICE_ACCOUNT?.trim() ||
    DEFAULT_STAGING_SIGNING_SERVICE_ACCOUNT;

  if (projectId !== "afbm-staging") {
    throw new Error(`Refusing IAM sign-jwt for non-staging project: ${projectId}`);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "afbm-playability-smoke-"));
  const claimsPath = join(tmpDir, "custom-token-claims.json");
  const tokenPath = join(tmpDir, "custom-token.jwt");
  const now = Math.floor(Date.now() / 1000);

  try {
    writeFileSync(
      claimsPath,
      JSON.stringify({
        aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
        claims: { admin: true },
        exp: now + 3600,
        iat: now,
        iss: serviceAccount,
        sub: serviceAccount,
        uid,
      }),
    );

    try {
      execFileSync(
        "gcloud",
        [
          "iam",
          "service-accounts",
          "sign-jwt",
          claimsPath,
          tokenPath,
          `--iam-account=${serviceAccount}`,
          `--project=${projectId}`,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
    } catch (error) {
      const stderr = error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr?: Buffer | string }).stderr ?? "")
        : "";

      throw new Error(
        [
          "IAM sign-jwt failed for afbm-staging.",
          "Required permission: iam.serviceAccounts.signJwt.",
          `Service account: ${serviceAccount}.`,
          "Safe fix: grant roles/iam.serviceAccountTokenCreator on that staging service account only.",
          stderr.trim(),
        ].filter(Boolean).join(" "),
      );
    }

    const customToken = readFileSync(tokenPath, "utf8").trim();
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
      {
        body: JSON.stringify({ returnSecureToken: true, token: customToken }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const payload = (await response.json()) as { error?: { message?: string }; idToken?: string };

    if (!response.ok || !payload.idToken) {
      throw new Error(`Firebase custom-token login failed: ${payload.error?.message ?? response.statusText}`);
    }

    return { source: `IAM sign-jwt custom token uid=${uid}`, token: payload.idToken };
  } finally {
    rmSync(tmpDir, { force: true, recursive: true });
  }
}

async function postAdminAction(
  baseUrl: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ payload: AdminActionResponse; status: number }> {
  const response = await fetch(`${baseUrl}/api/admin/online/actions`, {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as AdminActionResponse;

  return { payload, status: response.status };
}

async function loadLeague(baseUrl: string, token: string, leagueId: string, label: string) {
  const result = await postAdminAction(baseUrl, token, {
    action: "getLeague",
    backendMode: "firebase",
    leagueId,
  });

  if (!result.payload.ok || !result.payload.league) {
    throw new Error(
      `${label} league load failed (${result.status}): ${result.payload.code ?? "UNKNOWN"} ${result.payload.message ?? ""}`.trim(),
    );
  }

  return result.payload.league;
}

function getUserId(user: SmokeLeagueUser) {
  return user.userId ?? user.uid ?? user.id ?? null;
}

function requireOwnTeam(league: SmokeLeague, identity: TokenIdentity, label: string) {
  const users = league.users ?? [];
  const teams = league.teams ?? [];
  const membership = users.find((user) => getUserId(user) === identity.uid);

  if (!membership) {
    throw new Error(`${label}: authenticated uid=${identity.uid} has no active membership in ${league.id}.`);
  }

  if (!membership.teamId) {
    throw new Error(`${label}: authenticated uid=${identity.uid} has membership without teamId.`);
  }

  const team = teams.find((candidate) => candidate.id === membership.teamId);

  if (!team) {
    throw new Error(`${label}: membership teamId=${membership.teamId} is missing from league teams.`);
  }

  if (team.assignedUserId && team.assignedUserId !== identity.uid) {
    throw new Error(
      `${label}: teamId=${membership.teamId} assignedUserId=${team.assignedUserId} does not match uid=${identity.uid}.`,
    );
  }

  return { membership, team };
}

function countGamesPlayed(league: SmokeLeague) {
  return (league.standings ?? []).reduce((sum, record) => sum + (record.gamesPlayed ?? 0), 0);
}

function requirePositiveNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer, got ${String(value)}.`);
  }

  return value;
}

async function run() {
  if (hasArg("--help") || hasArg("-h")) {
    printHelp();
    return;
  }

  requireConfirmation();

  const baseUrl = normalizeBaseUrl();
  const leagueId =
    readArg("--league-id") ??
    process.env.STAGING_PLAYABILITY_LEAGUE_ID ??
    process.env.STAGING_SMOKE_LEAGUE_ID ??
    DEFAULT_LEAGUE_ID;
  const expectedCommit = resolveExpectedCommit();
  const resetBeforeRun = hasArg("--reset-before-run");

  console.log(`[playability-smoke] baseUrl=${baseUrl}`);
  console.log(`[playability-smoke] leagueId=${leagueId}`);
  console.log(`[playability-smoke] expectedCommit=${expectedCommit ?? "not-set"}`);
  console.log(`[playability-smoke] resetBeforeRun=${resetBeforeRun ? "true" : "false"}`);

  if (expectedCommit) {
    await verifyStagingCommit(baseUrl, expectedCommit);
  }

  await prepareStagingSmokeMutationRun({
    leagueId,
    logPrefix: "playability-smoke",
    resetBeforeRun,
    resetKind: "playability",
  });

  const { source, token } = await getFirebaseIdToken();
  const identity = getTokenIdentity(token);

  console.log(
    `[playability-smoke] tokenSource=${source} uid=${identity.uid} adminClaim=${identity.adminClaim ? "true" : "false"} email=${identity.emailPresent ? "present" : "missing"}`,
  );

  const listResult = await postAdminAction(baseUrl, token, {
    action: "listLeagues",
    backendMode: "firebase",
  });

  if (!listResult.payload.ok) {
    throw new Error(
      `Admin API auth failed (${listResult.status}): ${listResult.payload.code ?? "UNKNOWN"} ${listResult.payload.message ?? ""}`.trim(),
    );
  }

  console.log(`[playability-smoke] admin api ok leagues=${listResult.payload.leagues?.length ?? 0}`);

  const beforeLeague = await loadLeague(baseUrl, token, leagueId, "before");
  const beforeTeam = requireOwnTeam(beforeLeague, identity, "before");
  const beforeWeek = requirePositiveNumber(beforeLeague.currentWeek, "before.currentWeek");
  const beforeSeason = requirePositiveNumber(beforeLeague.currentSeason ?? 1, "before.currentSeason");
  const beforeResultCount = beforeLeague.matchResults?.length ?? 0;
  const beforeGamesPlayed = countGamesPlayed(beforeLeague);

  if ((beforeLeague.schedule?.length ?? 0) < 1) {
    throw new Error("before: league has no schedule; playability cannot be proven.");
  }

  console.log(
    `[playability-smoke] load ok week=${beforeWeek} season=${beforeSeason} teamId=${beforeTeam.membership.teamId} teams=${beforeLeague.teams?.length ?? 0} users=${beforeLeague.users?.length ?? 0} results=${beforeResultCount} gamesPlayed=${beforeGamesPlayed}`,
  );

  const readyResult = await postAdminAction(baseUrl, token, {
    action: "setAllReady",
    backendMode: "firebase",
    confirmed: true,
    leagueId,
  });

  if (!readyResult.payload.ok || !readyResult.payload.league) {
    throw new Error(
      `setAllReady failed (${readyResult.status}): ${readyResult.payload.code ?? "UNKNOWN"} ${readyResult.payload.message ?? ""}`.trim(),
    );
  }

  const readyUsers = readyResult.payload.league.users ?? [];
  const readyCount = readyUsers.filter((user) => user.readyForWeek).length;

  if (readyUsers.length < 1 || readyCount !== readyUsers.length) {
    throw new Error(`setAllReady did not mark every user ready: ready=${readyCount}/${readyUsers.length}.`);
  }

  console.log(`[playability-smoke] setAllReady ok ready=${readyCount}/${readyUsers.length}`);

  const simulationResult = await postAdminAction(baseUrl, token, {
    action: "simulateWeek",
    backendMode: "firebase",
    confirmed: true,
    leagueId,
    season: beforeSeason,
    week: beforeWeek,
  });

  if (!simulationResult.payload.ok) {
    throw new Error(
      `simulateWeek failed (${simulationResult.status}): ${simulationResult.payload.code ?? "UNKNOWN"} ${simulationResult.payload.message ?? ""}`.trim(),
    );
  }

  const simulation = simulationResult.payload.simulation;

  if (!simulation || simulation.gamesSimulated < 1) {
    throw new Error("simulateWeek did not create any games.");
  }

  if (simulation.simulatedWeek !== beforeWeek) {
    throw new Error(
      `simulateWeek reported week=${simulation.simulatedWeek}, expected current week=${beforeWeek}.`,
    );
  }

  if (simulation.nextWeek !== beforeWeek + 1) {
    throw new Error(`simulateWeek nextWeek=${simulation.nextWeek}, expected ${beforeWeek + 1}.`);
  }

  if (!simulation.standingsSummary || simulation.standingsSummary.length < 1) {
    throw new Error("simulateWeek did not return standings summary.");
  }

  console.log(
    `[playability-smoke] simulateWeek ok games=${simulation.gamesSimulated} simulatedWeek=${simulation.simulatedWeek} nextWeek=${simulation.nextWeek}`,
  );

  const afterLeague = await loadLeague(baseUrl, token, leagueId, "after");
  const afterTeam = requireOwnTeam(afterLeague, identity, "after");
  const afterWeek = requirePositiveNumber(afterLeague.currentWeek, "after.currentWeek");
  const afterResultCount = afterLeague.matchResults?.length ?? 0;
  const afterGamesPlayed = countGamesPlayed(afterLeague);

  if (afterWeek !== beforeWeek + 1) {
    throw new Error(`after: currentWeek=${afterWeek}, expected ${beforeWeek + 1}.`);
  }

  if (afterResultCount <= beforeResultCount) {
    throw new Error(`after: results did not increase; before=${beforeResultCount} after=${afterResultCount}.`);
  }

  if ((afterLeague.standings?.length ?? 0) < 1 || afterGamesPlayed <= beforeGamesPlayed) {
    throw new Error(
      `after: standings were not updated; standings=${afterLeague.standings?.length ?? 0} gamesPlayed before=${beforeGamesPlayed} after=${afterGamesPlayed}.`,
    );
  }

  console.log(
    `[playability-smoke] after simulation ok week=${afterWeek} teamId=${afterTeam.membership.teamId} results=${afterResultCount} gamesPlayed=${afterGamesPlayed}`,
  );

  const reloadedLeague = await loadLeague(baseUrl, token, leagueId, "reload");
  const reloadTeam = requireOwnTeam(reloadedLeague, identity, "reload");
  const reloadWeek = requirePositiveNumber(reloadedLeague.currentWeek, "reload.currentWeek");
  const reloadResultCount = reloadedLeague.matchResults?.length ?? 0;
  const reloadGamesPlayed = countGamesPlayed(reloadedLeague);

  if (reloadTeam.membership.teamId !== beforeTeam.membership.teamId) {
    throw new Error(
      `reload: team changed from ${beforeTeam.membership.teamId} to ${reloadTeam.membership.teamId}.`,
    );
  }

  if (reloadWeek !== afterWeek) {
    throw new Error(`reload: currentWeek=${reloadWeek}, expected stable week=${afterWeek}.`);
  }

  if (reloadResultCount !== afterResultCount) {
    throw new Error(`reload: results changed from ${afterResultCount} to ${reloadResultCount}.`);
  }

  if (reloadGamesPlayed !== afterGamesPlayed) {
    throw new Error(`reload: standings gamesPlayed changed from ${afterGamesPlayed} to ${reloadGamesPlayed}.`);
  }

  console.log(
    `[playability-smoke] reload ok week=${reloadWeek} teamId=${reloadTeam.membership.teamId} results=${reloadResultCount} standings=${reloadedLeague.standings?.length ?? 0} gamesPlayed=${reloadGamesPlayed}`,
  );
  console.log("[playability-smoke] status=GREEN");
}

run().catch((error) => {
  console.error(`[playability-smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  console.error("[playability-smoke] status=RED");
  process.exitCode = 1;
});
