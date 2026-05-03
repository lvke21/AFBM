#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const MEASUREMENT_COMMAND = "npm run firebase:usage:measure";
const PROJECT_ID = process.env.FIRESTORE_READ_BUDGET_PROJECT_ID ?? "demo-afbm";

const BUDGETS = [
  {
    flow: "Online Dashboard",
    maxReads: 25,
  },
  {
    flow: "Online League Load",
    maxReads: 150,
  },
  {
    flow: "Online Draft",
    maxReads: 150,
  },
];

function extractJsonArray(output) {
  const marker = "Detailed JSON:";
  const markerIndex = output.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error("Firestore usage output enthaelt keinen Detailed JSON Block.");
  }

  const start = output.indexOf("[", markerIndex + marker.length);

  if (start === -1) {
    throw new Error("Firestore usage output enthaelt keinen JSON Array Start.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < output.length; index += 1) {
    const char = output[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return output.slice(start, index + 1);
      }
    }
  }

  throw new Error("Firestore usage output enthaelt keinen vollstaendigen JSON Array.");
}

function runMeasurement() {
  const result = spawnSync(
    "npx",
    [
      "firebase-tools",
      "emulators:exec",
      "--only",
      "firestore",
      "--project",
      PROJECT_ID,
      MEASUREMENT_COMMAND,
    ],
    {
      env: {
        ...process.env,
        XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME ?? ".local/firebase-config",
      },
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
    },
  );

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    console.error(output.trim());
    throw new Error(`Firestore usage measurement failed with exit code ${result.status}.`);
  }

  return JSON.parse(extractJsonArray(output));
}

function evaluate(flows) {
  const flowByName = new Map(flows.map((flow) => [flow.flow, flow]));

  return BUDGETS.map((budget) => {
    const flow = flowByName.get(budget.flow);

    if (!flow) {
      return {
        ...budget,
        actualReads: null,
        ok: false,
        reason: "missing-flow",
      };
    }

    return {
      ...budget,
      actualReads: flow.reads,
      ok: flow.reads <= budget.maxReads,
      reason: flow.reads <= budget.maxReads ? "ok" : "over-budget",
    };
  });
}

function printResults(results) {
  console.log("Firestore read budget check");
  console.log("");
  console.log("Flow                  Budget    Actual    Status");
  console.log("--------------------  ------    ------    ------");

  for (const result of results) {
    const actual = result.actualReads === null ? "missing" : String(result.actualReads);
    const status = result.ok ? "OK" : "FAIL";
    console.log(
      `${result.flow.padEnd(20)}  ${String(result.maxReads).padStart(6)}    ${actual.padStart(6)}    ${status}`,
    );
  }
}

try {
  const flows = runMeasurement();
  const results = evaluate(flows);
  const failed = results.filter((result) => !result.ok);

  printResults(results);

  if (failed.length > 0) {
    console.error("");
    for (const result of failed) {
      console.error(
        `${result.flow} verletzt das Firestore Read Budget: ${result.actualReads ?? "missing"} / ${result.maxReads}.`,
      );
    }

    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
