import { spawnSync } from "node:child_process";

import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";

export type StagingSmokeResetKind = "admin-week" | "playability";

export type StagingSmokeState = {
  activeLocks: Array<{
    id: string;
    season?: number;
    status: string;
    updatedAt?: string;
    week?: number;
    weekKey: string;
  }>;
  currentSeason?: number;
  currentWeek?: number;
  currentWeekGames: number;
  exists: boolean;
  lastScheduledWeek: number;
  leagueId: string;
  readyCount: number;
  resultsCount: number;
  standingsCount: number;
  totalUsers: number;
};

function readProjectId(env: Record<string, string | undefined>) {
  return env.GOOGLE_CLOUD_PROJECT ?? env.FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

export function ensureStagingSmokeStateEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.NODE_ENV === "production" || env.AFBM_DEPLOY_ENV === "production") {
    throw new Error("Refusing Staging smoke state access in production runtime.");
  }

  if (env.USE_FIRESTORE_EMULATOR === "true" || env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_EMULATOR_HOST) {
    throw new Error("Staging smoke state access refuses emulator configuration.");
  }

  const projectId = readProjectId(env) ?? "afbm-staging";

  if (projectId !== "afbm-staging") {
    throw new Error(
      `Staging smoke state access requires afbm-staging, got "${projectId}".`,
    );
  }

  env.GOOGLE_CLOUD_PROJECT ??= "afbm-staging";
  env.FIREBASE_PROJECT_ID ??= "afbm-staging";
}

function normalizePositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : undefined;
}

function getWeekKey(lock: Record<string, unknown>) {
  if (typeof lock.weekKey === "string" && lock.weekKey.trim().length > 0) {
    return lock.weekKey;
  }

  const season = normalizePositiveInteger(lock.season) ?? 1;
  const week = normalizePositiveInteger(lock.week);

  return week ? `s${season}-w${week}` : "unknown-week";
}

export async function readStagingSmokeState(leagueId: string): Promise<StagingSmokeState> {
  ensureStagingSmokeStateEnvironment();

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const [leagueSnapshot, membershipsSnapshot, locksSnapshot] = await Promise.all([
    leagueRef.get(),
    leagueRef.collection("memberships").get(),
    leagueRef.collection("adminActionLocks").get(),
  ]);

  if (!leagueSnapshot.exists) {
    return {
      activeLocks: [],
      currentWeekGames: 0,
      exists: false,
      lastScheduledWeek: 0,
      leagueId,
      readyCount: 0,
      resultsCount: 0,
      standingsCount: 0,
      totalUsers: 0,
    };
  }

  const league = leagueSnapshot.data() ?? {};
  const currentWeek = normalizePositiveInteger(league.currentWeek);
  const currentSeason = normalizePositiveInteger(league.currentSeason);
  const schedule = Array.isArray(league.schedule) ? league.schedule : [];
  const matchResults = Array.isArray(league.matchResults) ? league.matchResults : [];
  const standings = Array.isArray(league.standings) ? league.standings : [];
  const activeMemberships = membershipsSnapshot.docs
    .map((doc) => doc.data())
    .filter((membership) => membership.status === "active");
  const activeLocks = locksSnapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter((lock) => lock.data.status === "simulating")
    .map((lock) => ({
      id: lock.id,
      season: normalizePositiveInteger(lock.data.season),
      status: "simulating",
      updatedAt: typeof lock.data.updatedAt === "string" ? lock.data.updatedAt : undefined,
      week: normalizePositiveInteger(lock.data.week),
      weekKey: getWeekKey(lock.data),
    }));
  const lastScheduledWeek = schedule.reduce((maxWeek, entry) => {
    const week = entry && typeof entry === "object" && "week" in entry
      ? normalizePositiveInteger((entry as { week?: unknown }).week) ?? 0
      : 0;

    return Math.max(maxWeek, week);
  }, 0);
  const currentWeekGames = currentWeek
    ? schedule.filter(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          "week" in entry &&
          (entry as { week?: unknown }).week === currentWeek,
      ).length
    : 0;

  return {
    activeLocks,
    currentSeason,
    currentWeek,
    currentWeekGames,
    exists: true,
    lastScheduledWeek,
    leagueId,
    readyCount: activeMemberships.filter((membership) => membership.ready === true).length,
    resultsCount: matchResults.length,
    standingsCount: standings.length,
    totalUsers: activeMemberships.length,
  };
}

export function formatStagingSmokeState(state: StagingSmokeState) {
  const activeLocks = state.activeLocks.length > 0
    ? state.activeLocks.map((lock) => `${lock.id}:${lock.weekKey}`).join(",")
    : "none";

  return [
    `leagueId=${state.leagueId}`,
    `exists=${state.exists ? "true" : "false"}`,
    `currentWeek=${state.currentWeek ?? "missing"}`,
    `currentSeason=${state.currentSeason ?? "missing"}`,
    `lastScheduledWeek=${state.lastScheduledWeek}`,
    `currentWeekGames=${state.currentWeekGames}`,
    `readyCount=${state.readyCount}/${state.totalUsers}`,
    `resultsCount=${state.resultsCount}`,
    `standingsCount=${state.standingsCount}`,
    `activeLocks=${activeLocks}`,
  ].join(" ");
}

export function getStagingSmokeStateIssues(state: StagingSmokeState) {
  const issues: string[] = [];

  if (!state.exists) {
    issues.push("league-missing");
    return issues;
  }

  if (state.currentWeek !== 1) {
    issues.push(`expected-currentWeek=1 got=${state.currentWeek ?? "missing"}`);
  }

  if (state.currentWeekGames < 1) {
    issues.push(`no-games-for-currentWeek=${state.currentWeek ?? "missing"}`);
  }

  if (
    state.currentWeek !== undefined &&
    state.lastScheduledWeek > 0 &&
    state.currentWeek > state.lastScheduledWeek
  ) {
    issues.push(`currentWeek-after-schedule currentWeek=${state.currentWeek} lastScheduledWeek=${state.lastScheduledWeek}`);
  }

  if (state.readyCount !== 0) {
    issues.push(`expected-readyCount=0 got=${state.readyCount}`);
  }

  if (state.resultsCount !== 0) {
    issues.push(`expected-resultsCount=0 got=${state.resultsCount}`);
  }

  if (state.activeLocks.length > 0) {
    issues.push(`active-simulating-locks=${state.activeLocks.map((lock) => lock.id).join(",")}`);
  }

  return issues;
}

function requireResetConfirmation(kind: StagingSmokeResetKind) {
  if (process.env.CONFIRM_STAGING_SEED !== "true") {
    throw new Error("--reset-before-run requires CONFIRM_STAGING_SEED=true.");
  }

  if (kind === "admin-week" && process.env.CONFIRM_STAGING_PLAYABILITY_SEED !== "true") {
    throw new Error(
      "--reset-before-run for admin-week requires CONFIRM_STAGING_PLAYABILITY_SEED=true.",
    );
  }
}

export function runStagingSmokeReset(kind: StagingSmokeResetKind, logPrefix: string) {
  requireResetConfirmation(kind);

  const script = kind === "admin-week"
    ? "seed:multiplayer:playability:staging"
    : "seed:playability:staging";

  console.log(`[${logPrefix}] resetBeforeRun=true resetScript=${script}`);

  const result = spawnSync("npm", ["run", script], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Reset before smoke failed via ${script} with exit code ${result.status ?? "unknown"}.`);
  }
}

export async function prepareStagingSmokeMutationRun(input: {
  leagueId: string;
  logPrefix: string;
  resetBeforeRun: boolean;
  resetKind: StagingSmokeResetKind;
}) {
  ensureStagingSmokeStateEnvironment();

  if (input.resetBeforeRun) {
    runStagingSmokeReset(input.resetKind, input.logPrefix);
  }

  const state = await readStagingSmokeState(input.leagueId);
  const issues = getStagingSmokeStateIssues(state);

  console.log(
    `[${input.logPrefix}] preflight state ${formatStagingSmokeState(state)} resetUsed=${input.resetBeforeRun ? "true" : "false"}`,
  );

  if (issues.length > 0) {
    throw new Error(
      [
        `Staging smoke preflight failed for ${input.leagueId}.`,
        `Issues: ${issues.join("; ")}.`,
        "No mutation was executed.",
        input.resetBeforeRun
          ? "Reset was requested but the expected clean state was not reached."
          : "Run again with --reset-before-run and required staging seed confirmations to reset the test league.",
      ].join(" "),
    );
  }

  return state;
}
