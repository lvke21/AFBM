#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const includeStagingSmoke =
  process.env.RELEASE_CHECK_STAGING_SMOKE === "true" ||
  process.argv.includes("--staging-smoke");
const passThroughArgs = process.argv
  .slice(2)
  .filter((arg) => arg !== "--staging-smoke");

const requiredSteps = [
  {
    args: ["exec", "tsc", "--noEmit"],
    blocking: true,
    command: "npx tsc --noEmit",
    name: "Typecheck",
  },
  {
    args: ["run", "lint"],
    blocking: true,
    command: "npm run lint",
    name: "Lint",
  },
  {
    args: ["run", "build"],
    blocking: true,
    command: "npm run build",
    name: "Build",
  },
  {
    args: ["run", "bundle:size"],
    blocking: true,
    command: "npm run bundle:size",
    name: "Bundle Size",
  },
  {
    args: ["run", "firestore:read-budget"],
    blocking: true,
    command: "npm run firestore:read-budget",
    name: "Firestore Read Budget",
  },
  {
    args: ["run", "test:run"],
    blocking: true,
    command: "npm run test:run",
    name: "Vitest",
  },
  {
    args: ["run", "test:firebase:rules"],
    blocking: true,
    command: "npm run test:firebase:rules",
    name: "Firebase Rules",
  },
  {
    args: ["run", "test:firebase:parity"],
    blocking: true,
    command: "npm run test:firebase:parity",
    name: "Firebase Parity",
  },
  {
    args: ["run", "test:e2e:multiplayer:firebase"],
    blocking: true,
    command: "npm run test:e2e:multiplayer:firebase",
    name: "Firebase E2E",
  },
];

const skippedSteps = [
  {
    blocking: false,
    name: "Production Preflight",
    reason: "requires concrete production --project, --backend and --git-commit",
  },
];

if (includeStagingSmoke) {
  requiredSteps.push({
    args: ["run", "staging:smoke:admin-week", "--", ...passThroughArgs],
    blocking: true,
    command: `npm run staging:smoke:admin-week -- ${passThroughArgs.join(" ")}`.trim(),
    name: "Staging Smoke",
  });
} else {
  skippedSteps.push({
    blocking: false,
    name: "Staging Smoke",
    reason: "requires RELEASE_CHECK_STAGING_SMOKE=true or --staging-smoke with target args",
  });
}

function printHelp() {
  console.log(`Release check.

Runs one unambiguous Go/No-Go gate:
  - Typecheck
  - Lint
  - Build
  - Bundle Size
  - Firestore Read Budget
  - Vitest
  - Firebase Rules
  - Firebase Parity
  - Firebase E2E
  - optional Staging Smoke

Skipped higher gates are printed explicitly and are not counted as production/staging approval.

Usage:
  npm run release:check

Optional staging smoke:
  RELEASE_CHECK_STAGING_SMOKE=true CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=<project> npm run release:check -- --league-id <league-id> --expected-commit <sha>

Shortcut:
  npm run release:check -- --staging-smoke --league-id <league-id> --expected-commit <sha>
`);
}

function runStep(step) {
  console.log(`\n[release-check] START ${step.name}`);
  console.log(`[release-check] command=${step.command}`);
  console.log(`[release-check] blocking=${step.blocking ? "yes" : "no"}`);

  const result = spawnSync("npm", step.args, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    return {
      ok: false,
      reason: result.error.message,
      step,
    };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      reason: `exit code ${result.status}`,
      step,
    };
  }

  console.log(`[release-check] PASS ${step.name}`);

  return {
    ok: true,
    step,
  };
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  console.log("[release-check] mode=required-local-gates");
  console.log(`[release-check] stagingSmoke=${includeStagingSmoke ? "included" : "skipped"}`);
  console.log(
    `[release-check] blocking=${requiredSteps.map((step) => step.name).join(", ")}`,
  );
  console.log(
    `[release-check] skipped=${skippedSteps.map((step) => `${step.name} (${step.reason})`).join("; ") || "none"}`,
  );

  const passed = [];

  for (const step of requiredSteps) {
    const result = runStep(step);

    if (!result.ok) {
      console.error(`\n[release-check] FAIL ${step.name}: ${result.reason}`);
      console.error(`[release-check] status=NO_GO blocker="${step.name}"`);
      console.error(
        `[release-check] passed=${passed.length ? passed.join(", ") : "none"}`,
      );
      console.error(
        `[release-check] skipped=${skippedSteps.map((skipped) => skipped.name).join(", ") || "none"}`,
      );
      process.exitCode = 1;
      return;
    }

    passed.push(step.name);
  }

  console.log("\n[release-check] status=GO_REQUIRED_GATES");
  console.log(`[release-check] passed=${passed.join(", ")}`);
  console.log(
    `[release-check] skipped=${skippedSteps.map((step) => `${step.name} (${step.reason})`).join("; ") || "none"}`,
  );
  console.log("[release-check] note=Skipped gates are not approved by this run.");
}

main();
