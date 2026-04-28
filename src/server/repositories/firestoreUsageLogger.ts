import { AsyncLocalStorage } from "node:async_hooks";

type FirestoreUsageOperation = "read" | "write" | "delete";

export type FirestoreUsageEntry = {
  collection: string;
  count: number;
  flow: string;
  operation: FirestoreUsageOperation;
  query?: string;
};

export type FirestoreUsageSummary = {
  deletes: number;
  entries: FirestoreUsageEntry[];
  flow: string;
  reads: number;
  writes: number;
};

type FirestoreUsageContext = {
  entries: FirestoreUsageEntry[];
  flow: string;
};

const usageStorage = new AsyncLocalStorage<FirestoreUsageContext>();

export function firestoreUsageLoggingEnabled() {
  return process.env.FIRESTORE_USAGE_LOGGING === "true";
}

export async function withFirestoreUsageFlow<T>(
  flow: string,
  callback: () => Promise<T>,
): Promise<{ result: T; summary: FirestoreUsageSummary }> {
  const context: FirestoreUsageContext = {
    entries: [],
    flow,
  };

  const result = await usageStorage.run(context, callback);

  return {
    result,
    summary: summarizeFirestoreUsage(context),
  };
}

export function recordFirestoreUsage(input: {
  collection: string;
  count: number;
  operation: FirestoreUsageOperation;
  query?: string;
}) {
  if (!firestoreUsageLoggingEnabled()) {
    return;
  }

  const context = usageStorage.getStore();
  const entry: FirestoreUsageEntry = {
    collection: input.collection,
    count: Math.max(0, input.count),
    flow: context?.flow ?? "unscoped",
    operation: input.operation,
    query: input.query,
  };

  context?.entries.push(entry);

  // Keep the log machine-readable and free of document data.
  console.info("[firestore-usage]", JSON.stringify(entry));
}

export function summarizeFirestoreUsage(context: FirestoreUsageContext): FirestoreUsageSummary {
  return {
    deletes: sumEntries(context.entries, "delete"),
    entries: context.entries,
    flow: context.flow,
    reads: sumEntries(context.entries, "read"),
    writes: sumEntries(context.entries, "write"),
  };
}

function sumEntries(entries: FirestoreUsageEntry[], operation: FirestoreUsageOperation) {
  return entries
    .filter((entry) => entry.operation === operation)
    .reduce((sum, entry) => sum + entry.count, 0);
}
