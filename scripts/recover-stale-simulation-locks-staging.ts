import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";

export const DEFAULT_STALE_THRESHOLD_MS = 10 * 60 * 1000;
const STAGING_PROJECT_ID = "afbm-staging";

export type SimulationLockRecoveryLeague = {
  currentSeason?: number;
  id: string;
  matchResults?: Array<{
    matchId?: string;
    season?: number;
    week?: number;
  }>;
};

export type SimulationLockRecoveryCandidate = {
  id: string;
  data: {
    status?: unknown;
    season?: unknown;
    week?: unknown;
    updatedAt?: unknown;
    startedAt?: unknown;
    createdAt?: unknown;
    simulationAttemptId?: unknown;
    weekKey?: unknown;
  };
};

export type SimulationLockRecoveryDecision = {
  action: "mark_failed" | "skip";
  ageMs: number | null;
  lockId: string;
  leagueId: string;
  reason: string;
  weekKey: string;
};

type SimulationLockRecoveryPlanInput = {
  league: SimulationLockRecoveryLeague;
  lock: SimulationLockRecoveryCandidate;
  nowMs: number;
  thresholdMs: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readProjectId(env: Record<string, string | undefined>) {
  return env.GOOGLE_CLOUD_PROJECT ?? env.FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

export function requireStagingRecoveryEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.NODE_ENV === "production" || env.AFBM_DEPLOY_ENV === "production") {
    throw new Error("Refusing simulation lock recovery in production runtime.");
  }

  if (env.CONFIRM_STAGING_RECOVERY !== "true") {
    throw new Error("Staging simulation lock recovery requires CONFIRM_STAGING_RECOVERY=true.");
  }

  if (env.USE_FIRESTORE_EMULATOR === "true" || env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_EMULATOR_HOST) {
    throw new Error("Staging simulation lock recovery refuses emulator configuration.");
  }

  const projectId = readProjectId(env);

  if (projectId !== STAGING_PROJECT_ID) {
    throw new Error(
      `Staging simulation lock recovery requires GOOGLE_CLOUD_PROJECT=${STAGING_PROJECT_ID}, got "${projectId ?? "<missing>"}".`,
    );
  }

  env.GOOGLE_CLOUD_PROJECT ??= STAGING_PROJECT_ID;
  env.FIREBASE_PROJECT_ID ??= STAGING_PROJECT_ID;
}

export function parseIsoTimestampMs(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getSimulationLockTimestampMs(lock: SimulationLockRecoveryCandidate["data"]) {
  return (
    parseIsoTimestampMs(lock.updatedAt) ??
    parseIsoTimestampMs(lock.startedAt) ??
    parseIsoTimestampMs(lock.createdAt)
  );
}

function normalizePositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

export function getSimulationLockWeekKey(
  lock: SimulationLockRecoveryCandidate["data"],
  fallbackSeason?: number,
) {
  if (typeof lock.weekKey === "string" && lock.weekKey.trim().length > 0) {
    return lock.weekKey;
  }

  const season = normalizePositiveInteger(lock.season) ?? normalizePositiveInteger(fallbackSeason) ?? 1;
  const week = normalizePositiveInteger(lock.week);

  return week ? `s${season}-w${week}` : "unknown-week";
}

export function hasResultsForSimulationLock(
  league: SimulationLockRecoveryLeague,
  lock: SimulationLockRecoveryCandidate["data"],
) {
  const week = normalizePositiveInteger(lock.week);

  if (!week) {
    return false;
  }

  const season = normalizePositiveInteger(lock.season) ?? normalizePositiveInteger(league.currentSeason) ?? 1;

  return (league.matchResults ?? []).some((result) => {
    const resultWeek = normalizePositiveInteger(result.week);
    const resultSeason = normalizePositiveInteger(result.season) ?? season;

    return resultWeek === week && resultSeason === season;
  });
}

export function evaluateSimulationLockRecovery(
  input: SimulationLockRecoveryPlanInput,
): SimulationLockRecoveryDecision {
  const { league, lock, nowMs, thresholdMs } = input;
  const weekKey = getSimulationLockWeekKey(lock.data, league.currentSeason);

  if (lock.data.status !== "simulating") {
    return {
      action: "skip",
      ageMs: null,
      leagueId: league.id,
      lockId: lock.id,
      reason: `status=${String(lock.data.status ?? "missing")}`,
      weekKey,
    };
  }

  const lockTimestampMs = getSimulationLockTimestampMs(lock.data);

  if (lockTimestampMs === null) {
    return {
      action: "skip",
      ageMs: null,
      leagueId: league.id,
      lockId: lock.id,
      reason: "missing-lock-timestamp",
      weekKey,
    };
  }

  const ageMs = Math.max(0, nowMs - lockTimestampMs);

  if (ageMs < thresholdMs) {
    return {
      action: "skip",
      ageMs,
      leagueId: league.id,
      lockId: lock.id,
      reason: "not-stale",
      weekKey,
    };
  }

  if (hasResultsForSimulationLock(league, lock.data)) {
    return {
      action: "skip",
      ageMs,
      leagueId: league.id,
      lockId: lock.id,
      reason: "matching-results-exist",
      weekKey,
    };
  }

  return {
    action: "mark_failed",
    ageMs,
    leagueId: league.id,
    lockId: lock.id,
    reason: "stale-simulating-lock-without-results",
    weekKey,
  };
}

export function buildSimulationLockRecoveryPlan(input: {
  leagues: SimulationLockRecoveryLeague[];
  locksByLeagueId: Map<string, SimulationLockRecoveryCandidate[]>;
  nowMs: number;
  thresholdMs: number;
}) {
  return input.leagues.flatMap((league) =>
    (input.locksByLeagueId.get(league.id) ?? []).map((lock) =>
      evaluateSimulationLockRecovery({
        league,
        lock,
        nowMs: input.nowMs,
        thresholdMs: input.thresholdMs,
      }),
    ),
  );
}

export function applySimulationLockRecoveryPlanToRecords(input: {
  decisions: SimulationLockRecoveryDecision[];
  locksByLeagueId: Map<string, SimulationLockRecoveryCandidate[]>;
  nowIso: string;
  write: boolean;
}) {
  if (!input.write) {
    return input.locksByLeagueId;
  }

  const decisionsByKey = new Map(
    input.decisions.map((decision) => [`${decision.leagueId}/${decision.lockId}`, decision]),
  );
  const nextLocksByLeagueId = new Map<string, SimulationLockRecoveryCandidate[]>();

  for (const [leagueId, locks] of input.locksByLeagueId.entries()) {
    nextLocksByLeagueId.set(
      leagueId,
      locks.map((lock) => {
        const decision = decisionsByKey.get(`${leagueId}/${lock.id}`);

        if (decision?.action !== "mark_failed") {
          return lock;
        }

        return {
          ...lock,
          data: {
            ...lock.data,
            failedAt: input.nowIso,
            recoveryReason: decision.reason,
            status: "failed",
            updatedAt: input.nowIso,
          },
        };
      }),
    );
  }

  return nextLocksByLeagueId;
}

function readBooleanArg(name: string) {
  return process.argv.includes(name);
}

function readArg(name: string) {
  const index = process.argv.indexOf(name);

  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function readThresholdMs() {
  const raw = readArg("--threshold-minutes");

  if (!raw) {
    return DEFAULT_STALE_THRESHOLD_MS;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("--threshold-minutes must be a positive number.");
  }

  return Math.floor(parsed * 60 * 1000);
}

function formatAge(ageMs: number | null) {
  if (ageMs === null) {
    return "unknown";
  }

  const minutes = ageMs / 60_000;

  return `${minutes.toFixed(1)}m`;
}

function printHelp() {
  console.log(`Recover stale Staging simulation locks.

Usage:
  CONFIRM_STAGING_RECOVERY=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:recover:simulation-locks
  CONFIRM_STAGING_RECOVERY=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:recover:simulation-locks -- --write

Options:
  --write                 Mark safe stale simulating locks as failed. Default is dry-run.
  --threshold-minutes <n> Stale threshold. Default: 10.
  --help                  Show this help.

Safety:
  - Staging only.
  - Requires CONFIRM_STAGING_RECOVERY=true.
  - Dry-run by default.
  - Never changes simulated locks.
  - Only changes simulating locks older than the threshold with no matching results for that week.
`);
}

async function readStagingRecoveryInputs() {
  const firestore = getFirebaseAdminFirestore();
  const leagueSnapshots = await firestore.collection("leagues").get();
  const leagues: SimulationLockRecoveryLeague[] = [];
  const locksByLeagueId = new Map<string, SimulationLockRecoveryCandidate[]>();

  for (const leagueSnapshot of leagueSnapshots.docs) {
    const leagueData = leagueSnapshot.data();

    leagues.push({
      currentSeason: normalizePositiveInteger(leagueData.currentSeason) ?? undefined,
      id: leagueSnapshot.id,
      matchResults: Array.isArray(leagueData.matchResults)
        ? leagueData.matchResults.filter(isRecord).map((result) => ({
            matchId: typeof result.matchId === "string" ? result.matchId : undefined,
            season: normalizePositiveInteger(result.season) ?? undefined,
            week: normalizePositiveInteger(result.week) ?? undefined,
          }))
        : [],
    });

    const lockSnapshots = await leagueSnapshot.ref.collection("adminActionLocks").get();

    locksByLeagueId.set(
      leagueSnapshot.id,
      lockSnapshots.docs.map((lockSnapshot) => ({
        data: lockSnapshot.data(),
        id: lockSnapshot.id,
      })),
    );
  }

  return { firestore, leagues, locksByLeagueId };
}

async function writeRecoveryDecisions(input: {
  decisions: SimulationLockRecoveryDecision[];
  nowIso: string;
}) {
  const firestore = getFirebaseAdminFirestore();
  let updated = 0;

  for (const decision of input.decisions.filter((entry) => entry.action === "mark_failed")) {
    const lockRef = firestore
      .collection("leagues")
      .doc(decision.leagueId)
      .collection("adminActionLocks")
      .doc(decision.lockId);
    const lockSnapshot = await lockRef.get();
    const lockData = lockSnapshot.exists ? lockSnapshot.data() : null;

    if (!lockData || lockData.status !== "simulating") {
      console.log(
        `[simulation-lock-recovery] skip-write league=${decision.leagueId} lock=${decision.lockId} reason=status-changed`,
      );
      continue;
    }

    await lockRef.set(
      {
        failedAt: input.nowIso,
        recoveryReason: decision.reason,
        recoveredBy: "scripts/recover-stale-simulation-locks-staging.ts",
        status: "failed",
        updatedAt: input.nowIso,
      },
      { merge: true },
    );
    updated += 1;
    console.log(
      `[simulation-lock-recovery] updated league=${decision.leagueId} week=${decision.weekKey} lock=${decision.lockId} age=${formatAge(decision.ageMs)} reason=${decision.reason}`,
    );
  }

  return updated;
}

async function main() {
  if (readBooleanArg("--help") || readBooleanArg("-h")) {
    printHelp();
    return;
  }

  requireStagingRecoveryEnvironment();

  const write = readBooleanArg("--write");
  const thresholdMs = readThresholdMs();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  console.log("[simulation-lock-recovery] target=staging project=afbm-staging");
  console.log(`[simulation-lock-recovery] mode=${write ? "write" : "dry-run"}`);
  console.log(`[simulation-lock-recovery] thresholdMinutes=${(thresholdMs / 60_000).toFixed(1)}`);

  const { leagues, locksByLeagueId } = await readStagingRecoveryInputs();
  const decisions = buildSimulationLockRecoveryPlan({
    leagues,
    locksByLeagueId,
    nowMs,
    thresholdMs,
  });
  const actionable = decisions.filter((decision) => decision.action === "mark_failed");
  const skipped = decisions.filter((decision) => decision.action === "skip");

  for (const decision of decisions) {
    const label = decision.action === "mark_failed" ? "would-mark-failed" : "skip";

    console.log(
      `[simulation-lock-recovery] ${label} league=${decision.leagueId} week=${decision.weekKey} lock=${decision.lockId} age=${formatAge(decision.ageMs)} reason=${decision.reason}`,
    );
  }

  if (write) {
    const updated = await writeRecoveryDecisions({ decisions, nowIso });

    console.log(
      `[simulation-lock-recovery] status=GREEN updated=${updated} skipped=${skipped.length}`,
    );
    return;
  }

  console.log(
    `[simulation-lock-recovery] status=GREEN dryRun=true recommendedUpdates=${actionable.length} skipped=${skipped.length}`,
  );
}

if (process.argv[1]?.endsWith("recover-stale-simulation-locks-staging.ts")) {
  main().catch((error) => {
    console.error(
      `[simulation-lock-recovery] failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error("[simulation-lock-recovery] status=RED");
    process.exitCode = 1;
  });
}
