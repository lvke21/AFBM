import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = resolve(process.cwd(), "scripts/production-apphosting-preflight.mjs");
const PROJECT_ID = "afbm-production";
const BACKEND_ID = "afbm-production-backend";
const COMMIT_SHA = "9bd4d2cc604f";

type MockCliOptions = {
  account?: string;
  backends?: Array<{ name: string; uri?: string }>;
  projects?: Array<{ projectId: string; projectNumber?: string }>;
};

function writeExecutable(path: string, source: string) {
  writeFileSync(path, source);
  chmodSync(path, 0o755);
}

function createMockBin({
  account = "release-admin@example.com",
  backends = [
    {
      name: `projects/123456789/locations/us-central1/backends/${BACKEND_ID}`,
      uri: "https://afbm-production.example.com",
    },
  ],
  projects = [{ projectId: PROJECT_ID, projectNumber: "123456789" }],
}: MockCliOptions = {}) {
  const binDir = mkdtempSync(join(tmpdir(), "afbm-production-preflight-"));

  writeExecutable(
    join(binDir, "gcloud"),
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.join(" ") === "auth list --filter=status:ACTIVE --format=value(account)") {
  process.stdout.write(${JSON.stringify(`${account}\n`)});
  process.exit(0);
}
process.stderr.write("Unexpected gcloud args: " + args.join(" "));
process.exit(2);
`,
  );

  writeExecutable(
    join(binDir, "npx"),
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] !== "firebase-tools") {
  process.stderr.write("Unexpected npx package: " + args.join(" "));
  process.exit(2);
}
if (args[1] === "projects:list" && args.includes("--json")) {
  process.stdout.write(${JSON.stringify(JSON.stringify({ result: projects }))});
  process.exit(0);
}
if (args[1] === "apphosting:backends:list" && args.includes("--json")) {
  process.stdout.write(${JSON.stringify(JSON.stringify({ result: backends }))});
  process.exit(0);
}
process.stderr.write("Unexpected firebase args: " + args.join(" "));
process.exit(2);
`,
  );

  return binDir;
}

function runPreflight(args: string[], options?: MockCliOptions) {
  const binDir = createMockBin(options);

  return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
    },
  });
}

describe("production App Hosting preflight", () => {
  it("requires concrete project, backend and release commit values", () => {
    const withoutProject = runPreflight(["--backend", BACKEND_ID, "--git-commit", COMMIT_SHA]);
    expect(withoutProject.status).toBe(1);
    expect(withoutProject.stderr).toContain("Production project id is required");
    expect(withoutProject.stdout).not.toContain("rolloutCommand=");

    const withoutBackend = runPreflight(["--project", PROJECT_ID, "--git-commit", COMMIT_SHA]);
    expect(withoutBackend.status).toBe(1);
    expect(withoutBackend.stderr).toContain("Production backend id is required");
    expect(withoutBackend.stdout).not.toContain("rolloutCommand=");

    const withoutCommit = runPreflight(["--project", PROJECT_ID, "--backend", BACKEND_ID]);
    expect(withoutCommit.status).toBe(1);
    expect(withoutCommit.stderr).toContain("Release git commit is required");
    expect(withoutCommit.stdout).not.toContain("rolloutCommand=");
  });

  it("refuses non-production-looking targets", () => {
    const result = runPreflight([
      "--project",
      "afbm-staging",
      "--backend",
      "afbm-staging-backend",
      "--git-commit",
      COMMIT_SHA,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("refuses non-production-looking project or backend ids");
    expect(result.stdout).not.toContain("rolloutCommand=");
  });

  it("requires project and backend visibility before printing a rollout command", () => {
    const invisibleProject = runPreflight(
      ["--project", PROJECT_ID, "--backend", BACKEND_ID, "--git-commit", COMMIT_SHA],
      { projects: [] },
    );
    expect(invisibleProject.status).toBe(1);
    expect(invisibleProject.stderr).toContain(
      `Production project ${PROJECT_ID} is not visible`,
    );
    expect(invisibleProject.stdout).not.toContain("rolloutCommand=");

    const invisibleBackend = runPreflight(
      ["--project", PROJECT_ID, "--backend", BACKEND_ID, "--git-commit", COMMIT_SHA],
      { backends: [] },
    );
    expect(invisibleBackend.status).toBe(1);
    expect(invisibleBackend.stderr).toContain(
      `App Hosting backend ${BACKEND_ID} was not found`,
    );
    expect(invisibleBackend.stdout).not.toContain("rolloutCommand=");
  });

  it("prints the exact rollout command only after all validations pass", () => {
    const result = runPreflight([
      "--project",
      PROJECT_ID,
      "--backend",
      BACKEND_ID,
      "--git-commit",
      COMMIT_SHA,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[production-preflight] status=GO_FOR_EXPLICIT_APPROVAL");
    expect(result.stdout).toContain(`[production-preflight] project=${PROJECT_ID}`);
    expect(result.stdout).toContain(`[production-preflight] backend=${BACKEND_ID}`);
    expect(result.stdout).toContain(`[production-preflight] gitCommit=${COMMIT_SHA}`);
    expect(result.stdout).toContain(
      `XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create ${BACKEND_ID} --project ${PROJECT_ID} --git-commit ${COMMIT_SHA} --force --json`,
    );
  });
});
