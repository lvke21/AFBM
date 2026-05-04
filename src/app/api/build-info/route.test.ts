import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("/api/build-info", () => {
  it("returns build metadata for staging commit checks", async () => {
    process.env.NEXT_PUBLIC_AFBM_GIT_COMMIT = "9bd4d2cc604f";
    process.env.NEXT_PUBLIC_AFBM_BUILD_TIME = "2026-05-02T12:00:00.000Z";
    process.env.AFBM_DEPLOY_ENV = "staging";
    process.env.AFBM_APP_VERSION = "0.1.0-test";
    process.env.K_REVISION = "afbm-staging-backend-build-test";
    process.env.FIREBASE_PROJECT_ID = "afbm-staging";

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      commit: "9bd4d2cc604f",
      buildTime: "2026-05-02T12:00:00.000Z",
      environment: "staging",
      deployEnv: "staging",
      version: "0.1.0-test",
      revision: "afbm-staging-backend-build-test",
      firebaseProjectId: "afbm-staging",
    });
  });

  it("fails clearly when no build commit was injected", async () => {
    delete process.env.AFBM_GIT_COMMIT;
    delete process.env.NEXT_PUBLIC_AFBM_GIT_COMMIT;
    delete process.env.GIT_COMMIT;
    delete process.env.SOURCE_VERSION;
    delete process.env.VERCEL_GIT_COMMIT_SHA;

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      ok: false,
      commit: null,
      error: "BUILD_COMMIT_MISSING: NEXT_PUBLIC_AFBM_GIT_COMMIT was not injected during build.",
    });
  });
});
