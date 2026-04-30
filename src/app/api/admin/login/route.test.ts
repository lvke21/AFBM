import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const ORIGINAL_ENV = { ...process.env };

function loginRequest(code: string) {
  const body = new URLSearchParams({
    code,
    next: "/admin",
  });

  return new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "vitest",
    },
    body,
  });
}

function readConsoleJson(spy: "info" | "warn") {
  const mock = vi.mocked(console[spy]);
  const line = mock.mock.calls[0]?.[0];

  if (typeof line !== "string") {
    throw new Error(`Missing console.${spy} audit log.`);
  }

  return JSON.parse(line) as {
    actor?: { adminSessionId?: string };
    code?: string;
    event?: string;
    outcome?: string;
    type?: string;
  };
}

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    AFBM_ADMIN_ACCESS_CODE: "route-admin-code",
    AFBM_ADMIN_SESSION_SECRET: "route-admin-secret",
  };
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("admin login audit logging", () => {
  it("logs successful admin login without the access code", async () => {
    const response = await POST(loginRequest("route-admin-code"));
    const auditLog = readConsoleJson("info");

    expect(response.status).toBe(307);
    expect(auditLog).toMatchObject({
      type: "security_audit",
      event: "admin_login",
      outcome: "success",
    });
    expect(auditLog.actor?.adminSessionId).toHaveLength(24);
    expect(JSON.stringify(auditLog)).not.toContain("route-admin-code");
    expect(JSON.stringify(auditLog)).not.toContain("route-admin-secret");
  });

  it("logs denied admin login without the submitted code", async () => {
    const response = await POST(loginRequest("wrong-admin-code"));
    const auditLog = readConsoleJson("warn");

    expect(response.status).toBe(307);
    expect(auditLog).toMatchObject({
      type: "security_audit",
      event: "admin_login",
      outcome: "denied",
      code: "ADMIN_INVALID_CODE",
    });
    expect(JSON.stringify(auditLog)).not.toContain("wrong-admin-code");
    expect(JSON.stringify(auditLog)).not.toContain("route-admin-code");
  });
});
