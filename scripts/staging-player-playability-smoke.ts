import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type FirestoreValue = {
  arrayValue?: { values?: FirestoreValue[] };
  booleanValue?: boolean;
  doubleValue?: number;
  integerValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
  stringValue?: string;
  timestampValue?: string;
};

type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
  name?: string;
  updateTime?: string;
};

type BuildInfoPayload = {
  commit?: string | null;
  deployEnv?: string | null;
  environment?: string | null;
  revision?: string | null;
};

type PlayerTokenIdentity = {
  adminClaim: boolean;
  emailPresent: boolean;
  uid: string;
};

type PlayerMembership = {
  displayName?: string;
  ready?: boolean;
  role?: string;
  status?: string;
  teamId?: string;
  userId?: string;
  username?: string;
};

type PlayerTeam = {
  assignedUserId?: string | null;
  displayName?: string;
  id?: string;
  name?: string;
  status?: string;
};

type PlayerLeague = {
  currentSeason?: number;
  currentWeek?: number;
  id?: string;
  matchResults?: unknown[];
  name?: string;
  schedule?: unknown[];
  standings?: unknown[];
  status?: string;
  weekStatus?: string;
};

type PlayerDraft = {
  currentTeamId?: string;
  pickNumber?: number;
  round?: number;
  status?: string;
};

const DEFAULT_BASE_URL = "https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app";
const DEFAULT_LEAGUE_ID = "afbm-playability-test";
const DEFAULT_PLAYER_UID = "basel-rhinos-gm";
const DEFAULT_STAGING_PROJECT_ID = "afbm-staging";
const DEFAULT_STAGING_WEB_API_KEY = "AIzaSyC2JqgkfFuGhvE3KuMIQ1DCvC003m8q320";
const DEFAULT_STAGING_SIGNING_SERVICE_ACCOUNT =
  "firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com";

function printHelp() {
  console.log(`Run the Staging Player Playability smoke.

Usage:
  CONFIRM_STAGING_SMOKE=true \\
  CONFIRM_STAGING_PLAYER_PLAYABILITY_SMOKE=true \\
  GOOGLE_CLOUD_PROJECT=afbm-staging \\
  npm run staging:smoke:player-playability -- --league-id afbm-playability-test --expected-commit <sha>

Auth options, in priority order:
  1. STAGING_PLAYER_FIREBASE_ID_TOKEN or E2E_FIREBASE_PLAYER_ID_TOKEN
  2. STAGING_PLAYER_EMAIL + STAGING_PLAYER_PASSWORD
  3. IAM signed custom token for STAGING_PLAYER_UID, default ${DEFAULT_PLAYER_UID}

Flow:
  1. Verify Staging build-info commit when --expected-commit is present.
  2. Authenticate as a non-admin Firebase player.
  3. Load league, membership, team and draft through Firestore REST with the player token.
  4. Verify membership/team link and completed draft.
  5. Open the dashboard route.
  6. Toggle only the player's own membership ready=false, then ready=true.
  7. Reload league/membership/team and verify team + ready are stable.

Safety:
  - Requires CONFIRM_STAGING_SMOKE=true.
  - Requires CONFIRM_STAGING_PLAYER_PLAYABILITY_SMOKE=true because it mutates Staging.
  - Refuses non-afbm-staging project IDs and hosted URLs.
  - Refuses Firebase tokens with admin=true claim.
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

function requireStagingConfirmation() {
  if (process.env.CONFIRM_STAGING_SMOKE !== "true") {
    throw new Error("Player playability smoke requires CONFIRM_STAGING_SMOKE=true.");
  }

  if (process.env.CONFIRM_STAGING_PLAYER_PLAYABILITY_SMOKE !== "true") {
    throw new Error(
      "Player playability smoke requires CONFIRM_STAGING_PLAYER_PLAYABILITY_SMOKE=true because it mutates Staging.",
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

function resolveProjectId() {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    DEFAULT_STAGING_PROJECT_ID;

  if (projectId !== DEFAULT_STAGING_PROJECT_ID) {
    throw new Error(`Refusing non-staging Firebase project: ${projectId}`);
  }

  return projectId;
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

  const payload = (await response.json()) as BuildInfoPayload;
  const remoteCommit = normalizeCommit(payload.commit);

  if (!remoteCommit || !commitMatches(remoteCommit, expectedCommit)) {
    throw new Error(
      `Staging commit mismatch: expected=${expectedCommit} deployed=${remoteCommit ?? "missing"} revision=${payload.revision ?? "unknown"}.`,
    );
  }

  console.log(
    `[player-smoke] commit ok expected=${expectedCommit} deployed=${remoteCommit} revision=${payload.revision ?? "unknown"} env=${payload.environment ?? payload.deployEnv ?? "unknown"}`,
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

function getTokenIdentity(token: string): PlayerTokenIdentity {
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
  const existingToken =
    process.env.STAGING_PLAYER_FIREBASE_ID_TOKEN?.trim() ||
    process.env.E2E_FIREBASE_PLAYER_ID_TOKEN?.trim();

  if (existingToken) {
    return { source: "STAGING_PLAYER_FIREBASE_ID_TOKEN", token: existingToken };
  }

  const email =
    process.env.STAGING_PLAYER_EMAIL?.trim() ||
    process.env.STAGING_FIREBASE_PLAYER_EMAIL?.trim();
  const password =
    process.env.STAGING_PLAYER_PASSWORD ??
    process.env.STAGING_FIREBASE_PLAYER_PASSWORD ??
    "";
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
      throw new Error(`Firebase player login failed: ${payload.error?.message ?? response.statusText}`);
    }

    return { source: "Firebase REST player email/password login", token: payload.idToken };
  }

  return signInWithIamSignedPlayerToken(apiKey);
}

async function signInWithIamSignedPlayerToken(apiKey: string) {
  const projectId = resolveProjectId();
  const uid =
    process.env.STAGING_PLAYER_UID?.trim() ||
    process.env.STAGING_PLAYABILITY_UID?.trim() ||
    DEFAULT_PLAYER_UID;
  const serviceAccount =
    process.env.STAGING_FIREBASE_SIGNING_SERVICE_ACCOUNT?.trim() ||
    DEFAULT_STAGING_SIGNING_SERVICE_ACCOUNT;

  const tmpDir = mkdtempSync(join(tmpdir(), "afbm-player-smoke-"));
  const claimsPath = join(tmpDir, "custom-token-claims.json");
  const tokenPath = join(tmpDir, "custom-token.jwt");
  const now = Math.floor(Date.now() / 1000);

  try {
    writeFileSync(
      claimsPath,
      JSON.stringify({
        aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
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
          "IAM sign-jwt failed for afbm-staging player token.",
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
      throw new Error(`Firebase player custom-token login failed: ${payload.error?.message ?? response.statusText}`);
    }

    return { source: `IAM sign-jwt player custom token uid=${uid}`, token: payload.idToken };
  } finally {
    rmSync(tmpDir, { force: true, recursive: true });
  }
}

function firestoreDocumentUrl(projectId: string, pathSegments: string[]) {
  const encodedPath = pathSegments.map(encodeURIComponent).join("/");

  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodedPath}`;
}

function decodeFirestoreValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) {
    return value.stringValue;
  }
  if ("booleanValue" in value) {
    return value.booleanValue;
  }
  if ("integerValue" in value) {
    return Number(value.integerValue);
  }
  if ("doubleValue" in value) {
    return value.doubleValue;
  }
  if ("timestampValue" in value) {
    return value.timestampValue;
  }
  if ("nullValue" in value) {
    return null;
  }
  if (value.arrayValue) {
    return (value.arrayValue.values ?? []).map(decodeFirestoreValue);
  }
  if (value.mapValue) {
    return decodeFirestoreFields(value.mapValue.fields ?? {});
  }

  return undefined;
}

function decodeFirestoreFields(fields: Record<string, FirestoreValue>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

async function fetchFirestoreDocument<T extends Record<string, unknown>>(
  input: {
    label: string;
    pathSegments: string[];
    projectId: string;
    token: string;
  },
) {
  const response = await fetch(firestoreDocumentUrl(input.projectId, input.pathSegments), {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${input.token}`,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as FirestoreDocument & {
    error?: { message?: string; status?: string };
  };

  if (!response.ok) {
    throw new Error(
      `${input.label} Firestore read failed (${response.status}): ${payload.error?.status ?? "UNKNOWN"} ${payload.error?.message ?? ""}`.trim(),
    );
  }

  return decodeFirestoreFields(payload.fields ?? {}) as T;
}

async function patchFirestoreDocument(
  input: {
    fields: Record<string, FirestoreValue>;
    label: string;
    pathSegments: string[];
    projectId: string;
    token: string;
    updateMask: string[];
  },
) {
  const url = new URL(firestoreDocumentUrl(input.projectId, input.pathSegments));

  for (const fieldPath of input.updateMask) {
    url.searchParams.append("updateMask.fieldPaths", fieldPath);
  }

  const response = await fetch(url, {
    body: JSON.stringify({ fields: input.fields }),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json",
    },
    method: "PATCH",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
  };

  if (!response.ok) {
    throw new Error(
      `${input.label} Firestore write failed (${response.status}): ${payload.error?.status ?? "UNKNOWN"} ${payload.error?.message ?? ""}`.trim(),
    );
  }
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is missing or not a string.`);
  }

  return value;
}

function requirePositiveInteger(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer, got ${String(value)}.`);
  }

  return value;
}

function requireArray(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} is missing or not an array.`);
  }

  return value;
}

async function openDashboardRoute(baseUrl: string, leagueId: string) {
  const response = await fetch(`${baseUrl}/online/league/${encodeURIComponent(leagueId)}`, {
    headers: { accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`Dashboard route returned HTTP ${response.status}.`);
  }

  console.log(`[player-smoke] dashboard route ok status=${response.status}`);
}

async function setOwnReady(input: {
  leagueId: string;
  projectId: string;
  ready: boolean;
  token: string;
  uid: string;
}) {
  await patchFirestoreDocument({
    fields: {
      lastSeenAt: { stringValue: new Date().toISOString() },
      ready: { booleanValue: input.ready },
    },
    label: `membership ready=${input.ready}`,
    pathSegments: ["leagues", input.leagueId, "memberships", input.uid],
    projectId: input.projectId,
    token: input.token,
    updateMask: ["ready", "lastSeenAt"],
  });
}

async function loadPlayerState(input: {
  leagueId: string;
  projectId: string;
  token: string;
  uid: string;
}) {
  const [league, membership] = await Promise.all([
    fetchFirestoreDocument<PlayerLeague>({
      label: "league",
      pathSegments: ["leagues", input.leagueId],
      projectId: input.projectId,
      token: input.token,
    }),
    fetchFirestoreDocument<PlayerMembership>({
      label: "membership",
      pathSegments: ["leagues", input.leagueId, "memberships", input.uid],
      projectId: input.projectId,
      token: input.token,
    }),
  ]);
  const membershipUserId = requireString(membership.userId, "membership.userId");

  if (membershipUserId !== input.uid) {
    throw new Error(`membership.userId=${membershipUserId} does not match authenticated uid=${input.uid}.`);
  }

  if (membership.status !== "active") {
    throw new Error(`membership.status=${membership.status ?? "missing"} is not active.`);
  }

  if (membership.role === "admin") {
    throw new Error("Player smoke requires a non-admin membership; got role=admin.");
  }

  const teamId = requireString(membership.teamId, "membership.teamId");
  const [team, draft] = await Promise.all([
    fetchFirestoreDocument<PlayerTeam>({
      label: "team",
      pathSegments: ["leagues", input.leagueId, "teams", teamId],
      projectId: input.projectId,
      token: input.token,
    }),
    fetchFirestoreDocument<PlayerDraft>({
      label: "draft",
      pathSegments: ["leagues", input.leagueId, "draft", "main"],
      projectId: input.projectId,
      token: input.token,
    }),
  ]);

  if (team.assignedUserId && team.assignedUserId !== input.uid) {
    throw new Error(`team.assignedUserId=${team.assignedUserId} does not match uid=${input.uid}.`);
  }

  if (team.status && team.status !== "assigned") {
    throw new Error(`team.status=${team.status} is not assigned.`);
  }

  return { draft, league, membership, team };
}

function validatePlayableState(input: {
  draft: PlayerDraft;
  league: PlayerLeague;
  membership: PlayerMembership;
}) {
  const currentWeek = requirePositiveInteger(input.league.currentWeek, "league.currentWeek");
  const currentSeason = requirePositiveInteger(input.league.currentSeason ?? 1, "league.currentSeason");
  const schedule = requireArray(input.league.schedule, "league.schedule");

  if (schedule.length < 1) {
    throw new Error("league.schedule has no games; player playability cannot be proven.");
  }

  if (input.draft.status !== "completed") {
    throw new Error(
      `Draft is not completed (status=${input.draft.status ?? "missing"}). Player pick flow is not part of this smoke; seed/finish draft first.`,
    );
  }

  if (input.league.status !== "active") {
    throw new Error(`league.status=${input.league.status ?? "missing"} is not active.`);
  }

  if (
    input.league.weekStatus === "simulating" ||
    input.league.weekStatus === "completed" ||
    input.league.weekStatus === "season_complete"
  ) {
    throw new Error(`league.weekStatus=${input.league.weekStatus} does not allow player Ready.`);
  }

  return {
    currentSeason,
    currentWeek,
    ready: input.membership.ready === true,
    scheduleCount: schedule.length,
  };
}

async function run() {
  if (hasArg("--help") || hasArg("-h")) {
    printHelp();
    return;
  }

  requireStagingConfirmation();

  const baseUrl = normalizeBaseUrl();
  const projectId = resolveProjectId();
  const leagueId =
    readArg("--league-id") ??
    process.env.STAGING_PLAYER_PLAYABILITY_LEAGUE_ID ??
    process.env.STAGING_PLAYABILITY_LEAGUE_ID ??
    DEFAULT_LEAGUE_ID;
  const expectedCommit = resolveExpectedCommit();

  console.log(`[player-smoke] baseUrl=${baseUrl}`);
  console.log(`[player-smoke] projectId=${projectId}`);
  console.log(`[player-smoke] leagueId=${leagueId}`);
  console.log(`[player-smoke] expectedCommit=${expectedCommit ?? "not-set"}`);

  if (expectedCommit) {
    await verifyStagingCommit(baseUrl, expectedCommit);
  }

  const { source, token } = await getFirebaseIdToken();
  const identity = getTokenIdentity(token);

  if (identity.adminClaim) {
    throw new Error("Player smoke refuses tokens with admin=true claim. Use a non-admin player test user.");
  }

  console.log(
    `[player-smoke] tokenSource=${source} uid=${identity.uid} adminClaim=false email=${identity.emailPresent ? "present" : "missing"}`,
  );

  const before = await loadPlayerState({ leagueId, projectId, token, uid: identity.uid });
  const playable = validatePlayableState(before);
  const beforeTeamId = requireString(before.membership.teamId, "before.membership.teamId");

  console.log(
    `[player-smoke] player state ok week=${playable.currentWeek} season=${playable.currentSeason} teamId=${beforeTeamId} team=${before.team.displayName ?? before.team.name ?? beforeTeamId} ready=${playable.ready ? "true" : "false"} schedule=${playable.scheduleCount}`,
  );
  console.log(
    `[player-smoke] draft completed round=${before.draft.round ?? "unknown"} pick=${before.draft.pickNumber ?? "unknown"}`,
  );

  await openDashboardRoute(baseUrl, leagueId);

  await setOwnReady({ leagueId, projectId, ready: false, token, uid: identity.uid });
  const unready = await loadPlayerState({ leagueId, projectId, token, uid: identity.uid });

  if (unready.membership.ready !== false) {
    throw new Error(`Ready reset did not persist; ready=${String(unready.membership.ready)}.`);
  }

  await setOwnReady({ leagueId, projectId, ready: true, token, uid: identity.uid });
  const ready = await loadPlayerState({ leagueId, projectId, token, uid: identity.uid });

  if (ready.membership.ready !== true) {
    throw new Error(`Ready click did not persist; ready=${String(ready.membership.ready)}.`);
  }

  if (ready.membership.teamId !== beforeTeamId) {
    throw new Error(`Ready write changed team from ${beforeTeamId} to ${ready.membership.teamId ?? "missing"}.`);
  }

  console.log(`[player-smoke] ready click ok teamId=${ready.membership.teamId} ready=true`);

  const reloaded = await loadPlayerState({ leagueId, projectId, token, uid: identity.uid });
  const reloadWeek = requirePositiveInteger(reloaded.league.currentWeek, "reload.league.currentWeek");

  if (reloaded.membership.teamId !== beforeTeamId) {
    throw new Error(
      `Reload changed team from ${beforeTeamId} to ${reloaded.membership.teamId ?? "missing"}.`,
    );
  }

  if (reloaded.membership.ready !== true) {
    throw new Error(`Reload did not keep ready=true; ready=${String(reloaded.membership.ready)}.`);
  }

  if (reloadWeek !== playable.currentWeek) {
    throw new Error(`Reload changed week from ${playable.currentWeek} to ${reloadWeek}.`);
  }

  console.log(
    `[player-smoke] reload ok week=${reloadWeek} teamId=${reloaded.membership.teamId} ready=true`,
  );
  console.log("[player-smoke] admin simulation skipped; player flow proof completed without Admin-only Ready.");
  console.log("[player-smoke] status=GREEN");
}

run().catch((error) => {
  console.error(`[player-smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  console.error("[player-smoke] status=RED");
  process.exitCode = 1;
});
