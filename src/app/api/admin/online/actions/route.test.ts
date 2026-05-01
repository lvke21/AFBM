import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionToken,
} from "@/lib/admin/admin-session";
import { ONLINE_LEAGUES_STORAGE_KEY } from "@/lib/online/online-league-constants";

import { POST } from "./route";

const cookiesMock = vi.hoisted(() => vi.fn());
const ORIGINAL_ENV = { ...process.env };

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/online/actions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest",
    },
    body: JSON.stringify(body),
  });
}

function setCookieToken(value: string | null) {
  cookiesMock.mockResolvedValue({
    get: (name: string) =>
      name === ADMIN_SESSION_COOKIE && value
        ? {
            value,
          }
        : undefined,
  });
}

function readConsoleJson(spy: "info" | "warn", index = 0) {
  const mock = vi.mocked(console[spy]);
  const line = mock.mock.calls[index]?.[0];

  if (typeof line !== "string") {
    throw new Error(`Missing console.${spy} audit log.`);
  }

  return JSON.parse(line) as {
    action?: string;
    actor?: { adminSessionId?: string; userId?: string };
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
  cookiesMock.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("admin online action route", () => {
  it("rejects anonymous users without an admin session", async () => {
    setCookieToken(null);

    const response = await POST(
      postRequest({
        action: "createLeague",
        backendMode: "local",
        name: "Anonymous League",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("ADMIN_UNAUTHORIZED");

    expect(readConsoleJson("warn")).toMatchObject({
      type: "security_audit",
      event: "admin_action",
      action: "createLeague",
      outcome: "denied",
      code: "ADMIN_UNAUTHORIZED",
    });
  });

  it("rejects normal users even when they send local user data", async () => {
    setCookieToken(null);

    const response = await POST(
      postRequest({
        action: "debugSetAllReady",
        backendMode: "local",
        localState: {
          userId: "normal-user",
          username: "NormalGM",
          leaguesJson: "[]",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("ADMIN_UNAUTHORIZED");
  });

  it("allows an admin with a valid server session to execute a local admin action", async () => {
    setCookieToken(getAdminSessionToken());

    const response = await POST(
      postRequest({
        action: "createLeague",
        backendMode: "local",
        name: "Server Guard League",
        maxUsers: 4,
        startWeek: 2,
        localState: {
          leaguesJson: "[]",
        },
      }),
    );
    const body = await response.json();
    const leagues = JSON.parse(body.localState.leaguesJson) as Array<{
      name: string;
      maxUsers: number;
      currentWeek: number;
    }>;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(readConsoleJson("info")).toMatchObject({
      type: "security_audit",
      event: "admin_action",
      action: "createLeague",
      outcome: "success",
      actor: {
        userId: "admin-session",
      },
    });
    expect(readConsoleJson("info").actor?.adminSessionId).toHaveLength(24);
    expect(leagues).toHaveLength(1);
    expect(leagues[0]).toMatchObject({
      name: "Server Guard League",
      maxUsers: 4,
      currentWeek: 2,
    });
  });

  it("rejects manipulated admin requests with missing required targets", async () => {
    setCookieToken(getAdminSessionToken());

    const response = await POST(
      postRequest({
        action: "setAllReady",
        backendMode: "local",
        localState: {
          [ONLINE_LEAGUES_STORAGE_KEY]: "[]",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("ADMIN_ACTION_INVALID");

    expect(readConsoleJson("warn")).toMatchObject({
      type: "security_audit",
      event: "admin_action",
      action: "setAllReady",
      outcome: "failed",
      code: "ADMIN_ACTION_INVALID",
    });
  });
});
