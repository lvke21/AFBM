type FirestoreOperationalSeverity = "info" | "warning" | "error" | "critical";

type FirestoreOperationalEvent =
  | "data_backend_configuration"
  | "firestore_operation"
  | "repository_error"
  | "state_transition_failure"
  | "unexpected_prisma_fallback"
  | "write_failure";

type FirestoreOperationalLog = {
  event: FirestoreOperationalEvent;
  severity: FirestoreOperationalSeverity;
  flowName?: string;
  operation?: string;
  repository?: string;
  requestId?: string;
  metadata?: Record<string, boolean | number | string | null>;
};

type RepositoryLoggingInput = {
  flowName?: string;
  operation: string;
  repository: string;
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const SENSITIVE_KEY_PATTERN = /(secret|token|password|credential|private|email|userId|ownerId)/i;

export function firestoreOperationalLoggingEnabled() {
  return TRUE_VALUES.has((process.env.AFBM_FIRESTORE_OPERATION_LOG ?? "").toLowerCase()) ||
    TRUE_VALUES.has((process.env.FIRESTORE_OPERATION_LOGGING ?? "").toLowerCase());
}

export function getFirestoreOperationalRequestId() {
  return process.env.AFBM_REQUEST_ID || process.env.REQUEST_ID || undefined;
}

export function recordFirestoreOperationalLog(entry: FirestoreOperationalLog) {
  if (!firestoreOperationalLoggingEnabled()) {
    return;
  }

  const payload = {
    ...entry,
    metadata: sanitizeMetadata(entry.metadata),
    requestId: entry.requestId ?? getFirestoreOperationalRequestId(),
  };
  const line = JSON.stringify(payload);

  if (entry.severity === "critical" || entry.severity === "error") {
    console.error("[afbm:firestore:ops]", line);
    return;
  }

  console.info("[afbm:firestore:ops]", line);
}

export function logRepositoryError(
  input: RepositoryLoggingInput & {
    error: unknown;
    metadata?: Record<string, unknown>;
  },
) {
  recordFirestoreOperationalLog({
    event: "repository_error",
    flowName: input.flowName,
    metadata: {
      ...sanitizeMetadata(input.metadata),
      errorName: errorName(input.error),
    },
    operation: input.operation,
    repository: input.repository,
    severity: "error",
  });
}

export function logFirestoreWriteFailure(
  input: RepositoryLoggingInput & {
    error: unknown;
    metadata?: Record<string, unknown>;
  },
) {
  recordFirestoreOperationalLog({
    event: "write_failure",
    flowName: input.flowName,
    metadata: {
      ...sanitizeMetadata(input.metadata),
      errorName: errorName(input.error),
    },
    operation: input.operation,
    repository: input.repository,
    severity: "critical",
  });
}

export function logStateTransitionFailure(input: {
  action: string;
  actual?: string;
  expected?: string;
  from?: string;
  to?: string;
}) {
  recordFirestoreOperationalLog({
    event: "state_transition_failure",
    flowName: "week-loop",
    metadata: sanitizeMetadata(input),
    operation: input.action,
    repository: "weekMatchStateRepositoryFirestore",
    severity: "critical",
  });
}

export function logDataBackendConfiguration(input: {
  backend?: string;
  reason: string;
}) {
  recordFirestoreOperationalLog({
    event: "data_backend_configuration",
    metadata: sanitizeMetadata(input),
    operation: "resolve-data-backend",
    repository: "repositories",
    severity: "error",
  });
}

export function logUnexpectedPrismaFallback(input: {
  operation: string;
  reason: string;
}) {
  recordFirestoreOperationalLog({
    event: "unexpected_prisma_fallback",
    metadata: sanitizeMetadata(input),
    operation: input.operation,
    repository: "repositories",
    severity: "critical",
  });
}

export async function withFirestoreRepositoryLogging<T>(
  input: RepositoryLoggingInput,
  run: () => Promise<T>,
) {
  try {
    return await run();
  } catch (error) {
    logRepositoryError({
      ...input,
      error,
    });
    throw error;
  }
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  const safe: Record<string, boolean | number | string | null> = {};

  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      safe[key] = "[redacted]";
      continue;
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safe[key] = value;
    }
  }

  return safe;
}
