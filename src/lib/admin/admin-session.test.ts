import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAdminSessionToken,
  isAdminAccessConfigured,
  verifyAdminAccessCode,
} from "./admin-session";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL_ENV };
});

describe("admin-session", () => {
  it("keeps admin access closed when no server code is configured", () => {
    delete process.env.AFBM_ADMIN_ACCESS_CODE;
    delete process.env.ADMIN_ACCESS_CODE;
    delete process.env.AFBM_ADMIN_SESSION_SECRET;

    expect(isAdminAccessConfigured()).toBe(false);
    expect(verifyAdminAccessCode("anything")).toBe(false);
    expect(getAdminSessionToken()).toBe("");
  });

  it("verifies the server-side admin code without exposing the code as token", () => {
    process.env.AFBM_ADMIN_ACCESS_CODE = "super-secret-admin";
    process.env.AFBM_ADMIN_SESSION_SECRET = "session-secret";

    expect(isAdminAccessConfigured()).toBe(true);
    expect(verifyAdminAccessCode("super-secret-admin")).toBe(true);
    expect(verifyAdminAccessCode("wrong")).toBe(false);
    expect(getAdminSessionToken()).not.toBe("super-secret-admin");
    expect(getAdminSessionToken()).toHaveLength(64);
  });

  it("does not fall back to the admin access code as session secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.AFBM_ADMIN_ACCESS_CODE = "super-secret-admin";
    delete process.env.AFBM_ADMIN_SESSION_SECRET;

    expect(isAdminAccessConfigured()).toBe(true);
    expect(getAdminSessionToken()).toBe("");
  });
});
