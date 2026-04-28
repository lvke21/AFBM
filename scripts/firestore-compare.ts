import { loadEnvConfig } from "@next/env";

import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import { assertFirestorePreviewOrEmulatorAllowed } from "../src/lib/firebase/previewGuard";
import {
  BACKFILL_COLLECTIONS,
  buildFirestoreBackfillDocuments,
  disconnectBackfillPrisma,
  type BackfillCollection,
  type BackfillDocument,
} from "./firestore-backfill";

loadEnvConfig(process.cwd());

type DifferenceSeverity = "critical" | "warning";

type Difference = {
  collection: BackfillCollection;
  id?: string;
  message: string;
  severity: DifferenceSeverity;
};

type CompareSummary = {
  actualCounts: Record<BackfillCollection, number>;
  criticalDifferences: number;
  differences: Difference[];
  expectedCounts: Record<BackfillCollection, number>;
  warningDifferences: number;
};

const SAMPLE_LIMIT = 5;

export async function compareFirestoreBackfill(): Promise<CompareSummary> {
  assertFirestorePreviewOrEmulatorAllowed();

  const expectedDocuments = await buildFirestoreBackfillDocuments();
  const expectedByCollection = groupExpectedDocuments(expectedDocuments);
  const firestore = getFirebaseAdminFirestore();
  const differences: Difference[] = [];
  const expectedCounts = emptyCounts();
  const actualCounts = emptyCounts();

  for (const collectionName of BACKFILL_COLLECTIONS) {
    const expected = expectedByCollection.get(collectionName) ?? new Map();
    const actualSnapshot = await firestore.collection(collectionName).get();
    const actual = new Map(
      actualSnapshot.docs.map((document) => [document.id, normalizeValue(document.data())]),
    );

    expectedCounts[collectionName] = expected.size;
    actualCounts[collectionName] = actual.size;

    if (expected.size !== actual.size) {
      differences.push({
        collection: collectionName,
        message: `Count mismatch: expected ${expected.size}, actual ${actual.size}`,
        severity: "critical",
      });
    }

    for (const [id, expectedData] of expected) {
      const actualData = actual.get(id);

      if (!actualData) {
        differences.push({
          collection: collectionName,
          id,
          message: "Missing Firestore document",
          severity: "critical",
        });
        continue;
      }

      const fieldDifferences = diffObjects(expectedData, actualData);
      for (const fieldDifference of fieldDifferences) {
        differences.push({
          collection: collectionName,
          id,
          message: fieldDifference,
          severity: "critical",
        });
      }
    }

    for (const id of actual.keys()) {
      if (!expected.has(id)) {
        differences.push({
          collection: collectionName,
          id,
          message: "Unexpected Firestore document",
          severity: "critical",
        });
      }
    }
  }

  addSemanticChecks(expectedByCollection, differences);

  return {
    actualCounts,
    criticalDifferences: differences.filter((difference) => difference.severity === "critical").length,
    differences,
    expectedCounts,
    warningDifferences: differences.filter((difference) => difference.severity === "warning").length,
  };
}

function groupExpectedDocuments(documents: BackfillDocument[]) {
  const result = new Map<BackfillCollection, Map<string, unknown>>();

  for (const collectionName of BACKFILL_COLLECTIONS) {
    result.set(collectionName, new Map());
  }

  for (const document of documents) {
    result.get(document.collection)?.set(document.id, normalizeValue(document.data));
  }

  return result;
}

function emptyCounts() {
  return Object.fromEntries(BACKFILL_COLLECTIONS.map((collection) => [collection, 0])) as Record<
    BackfillCollection,
    number
  >;
}

function addSemanticChecks(
  expectedByCollection: Map<BackfillCollection, Map<string, unknown>>,
  differences: Difference[],
) {
  const leagues = [...(expectedByCollection.get("leagues")?.values() ?? [])] as Array<Record<string, unknown>>;
  const weeks = [...(expectedByCollection.get("weeks")?.values() ?? [])] as Array<Record<string, unknown>>;
  const matches = [...(expectedByCollection.get("matches")?.values() ?? [])] as Array<Record<string, unknown>>;
  const teamStats = [...(expectedByCollection.get("teamStats")?.values() ?? [])] as Array<Record<string, unknown>>;
  const playerStats = [...(expectedByCollection.get("playerStats")?.values() ?? [])] as Array<Record<string, unknown>>;
  const reports = [...(expectedByCollection.get("reports")?.values() ?? [])] as Array<Record<string, unknown>>;

  for (const league of leagues) {
    const currentWeekId = league.currentWeekId;
    const currentWeek = weeks.find((week) => week.id === currentWeekId);
    if (currentWeek && currentWeek.state !== league.weekState) {
      differences.push({
        collection: "weeks",
        id: String(currentWeek.id),
        message: `Week state mismatch against league state: league=${league.weekState}, week=${currentWeek.state}`,
        severity: "critical",
      });
    }
  }

  for (const match of matches) {
    const hasHomeScore = typeof match.homeScore === "number";
    const hasAwayScore = typeof match.awayScore === "number";
    if (match.status === "COMPLETED" && (!hasHomeScore || !hasAwayScore)) {
      differences.push({
        collection: "matches",
        id: String(match.id),
        message: "Completed match is missing a final score",
        severity: "critical",
      });
    }
  }

  for (const stat of teamStats.slice(0, SAMPLE_LIMIT)) {
    if (!stat.leagueId || !stat.teamId || !stat.scope) {
      differences.push({
        collection: "teamStats",
        id: String(stat.id),
        message: "Sampled team stat is missing leagueId, teamId, or scope",
        severity: "critical",
      });
    }
  }

  for (const stat of playerStats.slice(0, SAMPLE_LIMIT)) {
    if (!stat.leagueId || !stat.playerId || !stat.teamId || !stat.scope) {
      differences.push({
        collection: "playerStats",
        id: String(stat.id),
        message: "Sampled player stat is missing leagueId, playerId, teamId, or scope",
        severity: "critical",
      });
    }
  }

  for (const report of reports.slice(0, SAMPLE_LIMIT)) {
    if (!report.leagueId || !report.type) {
      differences.push({
        collection: "reports",
        id: String(report.id),
        message: "Sampled report is missing leagueId or type",
        severity: "critical",
      });
    }
  }
}

function diffObjects(expected: unknown, actual: unknown, path = ""): string[] {
  if (JSON.stringify(expected) === JSON.stringify(actual)) {
    return [];
  }

  if (!isPlainObject(expected) || !isPlainObject(actual)) {
    return [
      `${path || "<root>"} mismatch: expected ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)}`,
    ];
  }

  const differences: string[] = [];
  const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();

  for (const key of keys) {
    const nextPath = path ? `${path}.${key}` : key;

    if (!(key in expected)) {
      differences.push(`${nextPath} unexpected: actual ${JSON.stringify(actual[key])}`);
      continue;
    }

    if (!(key in actual)) {
      differences.push(`${nextPath} missing: expected ${JSON.stringify(expected[key])}`);
      continue;
    }

    differences.push(...diffObjects(expected[key], actual[key], nextPath));
  }

  return differences;
}

function normalizeValue(value: unknown): unknown {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeValue(entryValue)]),
    );
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    return "NaN";
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function printSummary(summary: CompareSummary) {
  console.log("Firestore backfill compare summary:");
  for (const collectionName of BACKFILL_COLLECTIONS) {
    console.log(
      `- ${collectionName}: expected ${summary.expectedCounts[collectionName]}, actual ${summary.actualCounts[collectionName]}`,
    );
  }

  console.log(`Critical differences: ${summary.criticalDifferences}`);
  console.log(`Warnings: ${summary.warningDifferences}`);

  if (summary.differences.length > 0) {
    console.log("Differences:");
    for (const difference of summary.differences.slice(0, 100)) {
      console.log(
        `- [${difference.severity}] ${difference.collection}${difference.id ? `/${difference.id}` : ""}: ${difference.message}`,
      );
    }

    if (summary.differences.length > 100) {
      console.log(`... ${summary.differences.length - 100} more differences omitted from console output`);
    }
  }
}

async function main() {
  const summary = await compareFirestoreBackfill();
  printSummary(summary);

  if (summary.criticalDifferences > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("firestore-compare.ts")) {
  main()
    .catch((error) => {
      console.error("Firestore compare failed:");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectBackfillPrisma();
    });
}
