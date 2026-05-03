#!/usr/bin/env node

import { execFileSync } from "node:child_process";

function printHelp() {
  console.log(`Production App Hosting preflight.

Read-only verification. This script never creates rollouts and never writes data.

Usage:
  npm run production:preflight:apphosting -- --project <production-project-id> --backend <production-backend-id> --git-commit <release-commit-sha>

Checks:
  - active gcloud identity
  - Firebase project visibility
  - App Hosting backend visibility
  - concrete release commit SHA
  - prints the rollout command only after project/backend/commit are verified
`);
}

function readOption(name) {
  const index = process.argv.indexOf(name);

  if (index < 0) {
    return null;
  }

  const value = process.argv[index + 1]?.trim() || null;

  if (!value || value.startsWith("--")) {
    return null;
  }

  return value;
}

function requireConcreteValue(value, label) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (value.includes("<") || value.includes(">") || value.includes("your-")) {
    throw new Error(`${label} must be a concrete verified value, not a placeholder.`);
  }

  return value;
}

function requireGitCommitSha(value) {
  const gitCommit = requireConcreteValue(value, "Release git commit");

  if (!/^[a-f0-9]{7,40}$/i.test(gitCommit)) {
    throw new Error("Release git commit must be a concrete 7-40 character commit SHA.");
  }

  return gitCommit;
}

function assertProductionTarget(projectId, backendId) {
  const nonProductionTargetPattern =
    /(^|[-_])(staging|stage|dev|development|test|testing|demo|local|emulator|preview)([-_]|$)/i;

  if (nonProductionTargetPattern.test(projectId) || nonProductionTargetPattern.test(backendId)) {
    throw new Error(
      "Production preflight refuses non-production-looking project or backend ids.",
    );
  }
}

function commandEnv() {
  return {
    ...process.env,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || ".local/firebase-config",
  };
}

function runJson(command, args) {
  const output = execFileSync(command, args, {
    encoding: "utf8",
    env: commandEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  return JSON.parse(output);
}

function runText(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    env: commandEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function backendIdFromName(name) {
  return name?.split("/").pop() ?? "";
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const projectId = requireConcreteValue(readOption("--project"), "Production project id");
  const backendId = requireConcreteValue(readOption("--backend"), "Production backend id");
  const gitCommit = requireGitCommitSha(readOption("--git-commit"));

  assertProductionTarget(projectId, backendId);

  console.log(`[production-preflight] project=${projectId}`);
  console.log(`[production-preflight] backend=${backendId}`);
  console.log(`[production-preflight] gitCommit=${gitCommit}`);

  const activeAccount = runText("gcloud", [
    "auth",
    "list",
    "--filter=status:ACTIVE",
    "--format=value(account)",
  ]);

  if (!activeAccount) {
    throw new Error("No active gcloud account is visible.");
  }

  console.log(`[production-preflight] gcloudAccount=${activeAccount}`);

  const firebaseProjects = runJson("npx", ["firebase-tools", "projects:list", "--json"]);
  const visibleProjects = firebaseProjects.result ?? [];
  const project = visibleProjects.find((candidate) => candidate.projectId === projectId);

  if (!project) {
    throw new Error(
      `Production project ${projectId} is not visible to the current Firebase CLI identity.`,
    );
  }

  console.log(
    `[production-preflight] firebaseProjectVisible=${project.projectId} (${project.projectNumber ?? "unknown-number"})`,
  );

  const backends = runJson("npx", [
    "firebase-tools",
    "apphosting:backends:list",
    "--project",
    projectId,
    "--json",
  ]);
  const backend = (backends.result ?? []).find(
    (candidate) => backendIdFromName(candidate.name) === backendId,
  );

  if (!backend) {
    throw new Error(`App Hosting backend ${backendId} was not found in project ${projectId}.`);
  }

  console.log(`[production-preflight] backendVisible=${backend.name}`);
  console.log(`[production-preflight] backendUri=${backend.uri ?? "unknown"}`);
  console.log("[production-preflight] status=GO_FOR_EXPLICIT_APPROVAL");
  console.log("[production-preflight] rolloutCommand=");
  console.log(
    `XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create ${backendId} --project ${projectId} --git-commit ${gitCommit} --force --json`,
  );
}

try {
  main();
} catch (error) {
  console.error(`[production-preflight] status=NO_GO ${error.message || String(error)}`);
  process.exitCode = 1;
}
