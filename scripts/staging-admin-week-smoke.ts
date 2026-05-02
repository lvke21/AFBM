type AdminActionResponse = {
  ok: boolean;
  code?: string;
  message?: string;
  league?: {
    id: string;
    currentWeek?: number;
    currentSeason?: number;
    standings?: unknown[];
    matchResults?: unknown[];
    completedWeeks?: unknown[];
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

function printHelp() {
  console.log(`Run the authenticated Staging Admin Week smoke.

Usage:
  CONFIRM_STAGING_SMOKE=true E2E_FIREBASE_ADMIN_ID_TOKEN=<id-token> npm run staging:smoke:admin-week

  CONFIRM_STAGING_SMOKE=true \\
  STAGING_FIREBASE_TEST_EMAIL=<email> \\
  STAGING_FIREBASE_TEST_PASSWORD=<password> \\
  npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league

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
    throw new Error(
      "Missing admin credentials. Provide E2E_FIREBASE_ADMIN_ID_TOKEN or STAGING_FIREBASE_TEST_EMAIL/STAGING_FIREBASE_TEST_PASSWORD.",
    );
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
