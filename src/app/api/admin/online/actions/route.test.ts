import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ONLINE_LEAGUES_STORAGE_KEY } from "@/lib/online/online-league-constants";

import { POST } from "./route";

const verifyIdTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
  }),
}));

function postRequest(body: unknown, token: string | null = null) {
  return new NextRequest("http://localhost/api/admin/online/actions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
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
  verifyIdTokenMock.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function allowAdmin(uid = "firebase-admin-user") {
  verifyIdTokenMock.mockResolvedValue({
    uid,
    email: `${uid}@example.test`,
    admin: true,
    auth_time: 1_765_000_000,
  });
}

describe("admin online action route", () => {
  it("rejects anonymous users without an admin session", async () => {
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
    verifyIdTokenMock.mockResolvedValue({
      uid: "normal-user",
      admin: false,
    });

    const response = await POST(
      postRequest({
        action: "debugSetAllReady",
        backendMode: "local",
        localState: {
          userId: "normal-user",
          username: "NormalGM",
          leaguesJson: "[]",
        },
      }, "normal-token"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("ADMIN_UNAUTHORIZED");
  });

  it("allows an admin with a valid Firebase admin claim to execute a local admin action", async () => {
    allowAdmin("firebase-admin-user");

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
      }, "admin-token"),
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
        userId: "firebase-admin-user",
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
    allowAdmin();

    const response = await POST(
      postRequest({
        action: "setAllReady",
        backendMode: "local",
        localState: {
          [ONLINE_LEAGUES_STORAGE_KEY]: "[]",
        },
      }, "admin-token"),
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
