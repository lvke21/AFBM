import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type AdminActionResponse = {
  ok: boolean;
  code?: string;
  message?: string;
  league?: {
    id: string;
    currentWeek?: number;
    currentSeason?: number;
    schedule?: unknown[];
    standings?: unknown[];
    matchResults?: unknown[];
    completedWeeks?: unknown[];
    teams?: unknown[];
    users?: Array<{
      id?: string;
      uid?: string;
      teamId?: string;
      readyForWeek?: boolean;
    }>;
  } | null;
  leagues?: Array<{ id: string; currentWeek?: number; currentSeason?: number }>;
  simulation?: {
    leagueId: string;
    simulatedWeek: number;
    nextWeek: number;
    gamesSimulated: number;
    standingsSummary?: unknown[];
  };
};

const DEFAULT_BASE_URL = "https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app";
const DEFAULT_LEAGUE_ID = "afbm-multiplayer-test-league";
const DEFAULT_STAGING_WEB_API_KEY = "AIzaSyC2JqgkfFuGhvE3KuMIQ1DCvC003m8q320";
const DEFAULT_STAGING_ADMIN_UID = "KFy5PrqAzzP7vRbfP4wIDamzbh43";
const DEFAULT_STAGING_SIGNING_SERVICE_ACCOUNT =
  "firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com";

function printHelp() {
  console.log(`Run the authenticated Staging Admin Week smoke.

Usage:
  CONFIRM_STAGING_SMOKE=true E2E_FIREBASE_ADMIN_ID_TOKEN=<id-token> npm run staging:smoke:admin-week

  CONFIRM_STAGING_SMOKE=true \\
  STAGING_FIREBASE_TEST_EMAIL=<email> \\
  STAGING_FIREBASE_TEST_PASSWORD=<password> \\
  npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league

  CONFIRM_STAGING_SMOKE=true npm run staging:smoke:admin-week
  # Falls kein Token/Login gesetzt ist, nutzt das Script gcloud sign-jwt fuer afbm-staging.

Options:
  --base-url <url>      Staging App Hosting URL. Default: ${DEFAULT_BASE_URL}
  --league-id <id>      League to simulate. Default: ${DEFAULT_LEAGUE_ID}
  --season <number>     Expected season sent to Admin API.
  --week <number>       Expected week sent to Admin API.
  --auth-only           Verify Admin API auth with listLeagues, but do not simulate.
  --help                Show this help.

Safety:
  - Requires CONFIRM_STAGING_SMOKE=true.
  - Refuses non-afbm-staging hosted URLs.
  - Never prints tokens or passwords.
`);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);

  if (index < 0) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function requireStagingConfirmation() {
  if (process.env.CONFIRM_STAGING_SMOKE !== "true") {
    throw new Error("Staging smoke requires CONFIRM_STAGING_SMOKE=true.");
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

function normalizePositiveInt(value: string | null, label: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

async function getFirebaseIdToken() {
  const existingToken = process.env.E2E_FIREBASE_ADMIN_ID_TOKEN?.trim();

  if (existingToken) {
    return { token: existingToken, source: "E2E_FIREBASE_ADMIN_ID_TOKEN" };
  }

  const email = process.env.STAGING_FIREBASE_TEST_EMAIL?.trim();
  const password = process.env.STAGING_FIREBASE_TEST_PASSWORD ?? "";
  const apiKey =
    process.env.STAGING_FIREBASE_WEB_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
    DEFAULT_STAGING_WEB_API_KEY;

  if (!email || !password) {
    return signInWithIamSignedCustomToken(apiKey);
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );
  const payload = (await response.json()) as { idToken?: string; error?: { message?: string } };

  if (!response.ok || !payload.idToken) {
    throw new Error(
      `Firebase REST login failed: ${payload.error?.message ?? response.statusText}`,
    );
  }

  return { token: payload.idToken, source: "Firebase REST email/password login" };
}

async function signInWithIamSignedCustomToken(apiKey: string) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim() || "afbm-staging";
  const uid = process.env.STAGING_FIREBASE_ADMIN_UID?.trim() || DEFAULT_STAGING_ADMIN_UID;
  const serviceAccount =
    process.env.STAGING_FIREBASE_SIGNING_SERVICE_ACCOUNT?.trim() ||
    DEFAULT_STAGING_SIGNING_SERVICE_ACCOUNT;

  if (projectId !== "afbm-staging") {
    throw new Error(`Refusing IAM sign-jwt for non-staging project: ${projectId}`);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "afbm-staging-smoke-"));
  const claimsPath = join(tmpDir, "custom-token-claims.json");
  const tokenPath = join(tmpDir, "custom-token.jwt");
  const now = Math.floor(Date.now() / 1000);

  try {
    writeFileSync(
      claimsPath,
      JSON.stringify({
        iss: serviceAccount,
        sub: serviceAccount,
        aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
        iat: now,
        exp: now + 3600,
        uid,
        claims: { admin: true },
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
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true,
        }),
      },
    );
    const payload = (await response.json()) as { idToken?: string; error?: { message?: string } };

    if (!response.ok || !payload.idToken) {
      throw new Error(
        `Firebase custom-token login failed: ${payload.error?.message ?? response.statusText}`,
      );
    }

    return { token: payload.idToken, source: "IAM sign-jwt custom token" };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function postAdminAction(
  baseUrl: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; payload: AdminActionResponse }> {
  const response = await fetch(`${baseUrl}/api/admin/online/actions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as AdminActionResponse;

  return { status: response.status, payload };
}

async function run() {
  if (hasArg("--help") || hasArg("-h")) {
    printHelp();
    return;
  }

  requireStagingConfirmation();

  const baseUrl = normalizeBaseUrl();
  const leagueId = readArg("--league-id") ?? process.env.STAGING_SMOKE_LEAGUE_ID ?? DEFAULT_LEAGUE_ID;
  const season = normalizePositiveInt(readArg("--season"), "season");
  const week = normalizePositiveInt(readArg("--week"), "week");
  const authOnly = hasArg("--auth-only");
  const { token, source } = await getFirebaseIdToken();

  console.log(`[staging-smoke] baseUrl=${baseUrl}`);
  console.log(`[staging-smoke] leagueId=${leagueId}`);
  console.log(`[staging-smoke] tokenSource=${source}`);
  console.log(`[staging-smoke] mode=${authOnly ? "auth-only" : "simulate-week"}`);

  const listResult = await postAdminAction(baseUrl, token, {
    action: "listLeagues",
    backendMode: "firebase",
  });

  if (!listResult.payload.ok) {
    throw new Error(
      `Admin auth smoke failed (${listResult.status}): ${listResult.payload.code ?? "UNKNOWN"} ${listResult.payload.message ?? ""}`.trim(),
    );
  }

  console.log(
    `[staging-smoke] admin auth ok; leagues=${listResult.payload.leagues?.length ?? 0}`,
  );

  if (authOnly) {
    return;
  }

  const beforeResult = await postAdminAction(baseUrl, token, {
    action: "getLeague",
    backendMode: "firebase",
    leagueId,
  });

  if (!beforeResult.payload.ok || !beforeResult.payload.league) {
    throw new Error(
      `League load before simulation failed (${beforeResult.status}): ${beforeResult.payload.code ?? "UNKNOWN"} ${beforeResult.payload.message ?? ""}`.trim(),
    );
  }

  const beforeLeague = beforeResult.payload.league;
  const beforeUsers = beforeLeague.users ?? [];
  const assignments = beforeUsers
    .map((user) => `${user.id ?? user.uid ?? "unknown"}:${user.teamId ?? "no-team"}`)
    .join(",");

  console.log(
    `[staging-smoke] league before simulation; currentWeek=${beforeLeague.currentWeek ?? "unknown"} users=${beforeUsers.length} teams=${beforeLeague.teams?.length ?? 0} schedule=${beforeLeague.schedule?.length ?? 0}`,
  );
  console.log(`[staging-smoke] team assignments=${assignments || "none"}`);

  const readyResult = await postAdminAction(baseUrl, token, {
    action: "setAllReady",
    backendMode: "firebase",
    leagueId,
  });

  if (!readyResult.payload.ok || !readyResult.payload.league) {
    throw new Error(
      `Ready-state smoke failed (${readyResult.status}): ${readyResult.payload.code ?? "UNKNOWN"} ${readyResult.payload.message ?? ""}`.trim(),
    );
  }

  const readyUsers = readyResult.payload.league.users ?? [];
  const readyCount = readyUsers.filter((user) => user.readyForWeek).length;

  console.log(`[staging-smoke] ready-state ok; ready=${readyCount}/${readyUsers.length}`);

  const simulationResult = await postAdminAction(baseUrl, token, {
    action: "simulateWeek",
    backendMode: "firebase",
    leagueId,
    season,
    week,
  });

  if (!simulationResult.payload.ok) {
    throw new Error(
      `Week simulation failed (${simulationResult.status}): ${simulationResult.payload.code ?? "UNKNOWN"} ${simulationResult.payload.message ?? ""}`.trim(),
    );
  }

  const simulation = simulationResult.payload.simulation;

  if (!simulation || simulation.gamesSimulated < 1) {
    throw new Error("Week simulation returned no simulated games.");
  }

  if (!simulation.standingsSummary || simulation.standingsSummary.length < 1) {
    throw new Error("Week simulation returned no standings summary.");
  }

  console.log(
    `[staging-smoke] simulated league=${simulation.leagueId} week=${simulation.simulatedWeek} nextWeek=${simulation.nextWeek} games=${simulation.gamesSimulated}`,
  );

  const reloadResult = await postAdminAction(baseUrl, token, {
    action: "getLeague",
    backendMode: "firebase",
    leagueId,
  });

  if (!reloadResult.payload.ok || !reloadResult.payload.league) {
    throw new Error(
      `Reload after simulation failed (${reloadResult.status}): ${reloadResult.payload.code ?? "UNKNOWN"} ${reloadResult.payload.message ?? ""}`.trim(),
    );
  }

  if ((reloadResult.payload.league.matchResults?.length ?? 0) < 1) {
    throw new Error("Reload after simulation did not expose saved match results.");
  }

  if ((reloadResult.payload.league.standings?.length ?? 0) < 1) {
    throw new Error("Reload after simulation did not expose saved standings.");
  }

  console.log(
    `[staging-smoke] reload ok; currentWeek=${reloadResult.payload.league.currentWeek ?? "unknown"} standings=${reloadResult.payload.league.standings?.length ?? 0} results=${reloadResult.payload.league.matchResults?.length ?? 0}`,
  );
}

run().catch((error) => {
  console.error(`[staging-smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
