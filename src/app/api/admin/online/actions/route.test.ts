import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnlineLeagueWeekSimulationError } from "@/lib/admin/online-week-simulation";
import { ONLINE_LEAGUES_STORAGE_KEY } from "@/lib/online/online-league-constants";

const verifyIdTokenMock = vi.hoisted(() => vi.fn());
const simulateOnlineLeagueWeekMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
  }),
}));

vi.mock("@/lib/admin/online-admin-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/online-admin-actions")>();

  return {
    ...actual,
    simulateOnlineLeagueWeek: simulateOnlineLeagueWeekMock,
  };
});

import { POST } from "./route";

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
  simulateOnlineLeagueWeekMock.mockReset();
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

function mockUidAllowlistedWithoutClaim() {
  verifyIdTokenMock.mockResolvedValue({
    uid: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
    email: "allowlisted-admin@example.test",
    admin: false,
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

    expect(response.status).toBe(403);
    expect(body.code).toBe("ADMIN_FORBIDDEN");
  });

  it("allows an admin with a valid Firebase admin claim to execute a local admin action", async () => {
    allowAdmin("firebase-admin-user");

    const response = await POST(
      postRequest({
        action: "createLeague",
        backendMode: "local",
        confirmed: true,
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

  it("rejects local mutations without explicit mutation confirmation", async () => {
    allowAdmin("firebase-admin-user");

    const response = await POST(
      postRequest({
        action: "createLeague",
        backendMode: "local",
        name: "Unconfirmed League",
        maxUsers: 4,
        localState: {
          leaguesJson: "[]",
        },
      }, "admin-token"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("ADMIN_ACTION_POLICY_VIOLATION");
    expect(readConsoleJson("warn")).toMatchObject({
      type: "security_audit",
      event: "admin_action",
      action: "createLeague",
      outcome: "failed",
      code: "ADMIN_ACTION_POLICY_VIOLATION",
      actor: {
        userId: "firebase-admin-user",
      },
    });
  });

  it("rejects the bootstrap UID allowlist without a custom claim", async () => {
    mockUidAllowlistedWithoutClaim();

    const response = await POST(
      postRequest({
        action: "createLeague",
        backendMode: "local",
        name: "UID Allowlist League",
        maxUsers: 4,
        startWeek: 2,
        localState: {
          leaguesJson: "[]",
        },
      }, "uid-allowlist-token"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("ADMIN_FORBIDDEN");
    expect(body.ok).toBe(false);
    expect(readConsoleJson("warn")).toMatchObject({
      type: "security_audit",
      event: "admin_action",
      action: "createLeague",
      outcome: "denied",
      code: "ADMIN_FORBIDDEN",
      actor: {
        userId: "anonymous",
      },
    });
  });

  it("lists admin-managed leagues through the guarded action route", async () => {
    allowAdmin("firebase-admin-user");

    const createdResponse = await POST(
      postRequest({
        action: "createLeague",
        backendMode: "local",
        confirmed: true,
        name: "Route Listed League",
        maxUsers: 4,
        localState: {
          leaguesJson: "[]",
        },
      }, "admin-token"),
    );
    const createdBody = await createdResponse.json();
    const listedResponse = await POST(
      postRequest({
        action: "listLeagues",
        backendMode: "local",
        localState: createdBody.localState,
      }, "admin-token"),
    );
    const listedBody = await listedResponse.json();

    expect(listedResponse.status).toBe(200);
    expect(listedBody.ok).toBe(true);
    expect(listedBody.leagues).toHaveLength(1);
    expect(listedBody.leagues[0]).toMatchObject({
      name: "Route Listed League",
      maxUsers: 4,
    });
  });

  it("loads one admin-managed league through the guarded action route", async () => {
    allowAdmin("firebase-admin-user");

    const createdResponse = await POST(
      postRequest({
        action: "createLeague",
        backendMode: "local",
        confirmed: true,
        name: "Route Detail League",
        maxUsers: 4,
        localState: {
          leaguesJson: "[]",
        },
      }, "admin-token"),
    );
    const createdBody = await createdResponse.json();
    const loadedResponse = await POST(
      postRequest({
        action: "getLeague",
        backendMode: "local",
        leagueId: createdBody.league.id,
        localState: createdBody.localState,
      }, "admin-token"),
    );
    const loadedBody = await loadedResponse.json();

    expect(loadedResponse.status).toBe(200);
    expect(loadedBody.ok).toBe(true);
    expect(loadedBody.league).toMatchObject({
      id: createdBody.league.id,
      name: "Route Detail League",
    });
  });

  it("rejects manipulated admin requests with missing required targets", async () => {
    allowAdmin();

    const response = await POST(
      postRequest({
        action: "setAllReady",
        backendMode: "local",
        confirmed: true,
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

  it("simulates a week through the guarded API action as admin", async () => {
    allowAdmin("firebase-admin-user");
    simulateOnlineLeagueWeekMock.mockResolvedValue({
      gamesSimulated: 1,
      leagueId: "league-1",
      nextSeason: 1,
      nextWeek: 2,
      results: [],
      simulatedSeason: 1,
      simulatedWeek: 1,
      standingsSummary: [],
      updatedAt: "2026-01-01T12:00:00.000Z",
      weekKey: "s1-w1",
    });

    const response = await POST(
      postRequest({
        action: "simulateWeek",
        backendMode: "firebase",
        leagueId: "league-1",
        season: 1,
        week: 1,
        confirmed: true,
      }, "admin-token"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      simulation: {
        gamesSimulated: 1,
        leagueId: "league-1",
        nextWeek: 2,
        simulatedWeek: 1,
      },
    });
    expect(simulateOnlineLeagueWeekMock).toHaveBeenCalledWith(
      "league-1",
      expect.objectContaining({
        adminUserId: "firebase-admin-user",
      }),
      {
        expectedSeason: 1,
        expectedWeek: 1,
      },
    );
  });

  it("rejects simulateWeek without explicit mutation confirmation", async () => {
    allowAdmin("firebase-admin-user");

    const response = await POST(
      postRequest({
        action: "simulateWeek",
        backendMode: "firebase",
        leagueId: "league-1",
        season: 1,
        week: 1,
      }, "admin-token"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("ADMIN_ACTION_POLICY_VIOLATION");
    expect(simulateOnlineLeagueWeekMock).not.toHaveBeenCalled();
  });

  it("rejects simulateWeek without a bearer token", async () => {
    const response = await POST(
      postRequest({
        action: "simulateWeek",
        backendMode: "firebase",
        leagueId: "league-1",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("ADMIN_UNAUTHORIZED");
    expect(simulateOnlineLeagueWeekMock).not.toHaveBeenCalled();
  });

  it("rejects simulateWeek for non-admin users", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "normal-user",
      admin: false,
    });

    const response = await POST(
      postRequest({
        action: "simulateWeek",
        backendMode: "firebase",
        leagueId: "league-1",
      }, "normal-token"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("ADMIN_FORBIDDEN");
    expect(simulateOnlineLeagueWeekMock).not.toHaveBeenCalled();
  });

  it("rejects simulateWeek with a missing leagueId", async () => {
    allowAdmin("firebase-admin-user");

    const response = await POST(
      postRequest({
        action: "simulateWeek",
        backendMode: "firebase",
        confirmed: true,
        season: 1,
        week: 1,
      }, "admin-token"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("ADMIN_ACTION_INVALID");
    expect(simulateOnlineLeagueWeekMock).not.toHaveBeenCalled();
  });

  it("maps simulation service errors to client-safe API errors", async () => {
    allowAdmin("firebase-admin-user");
    simulateOnlineLeagueWeekMock.mockRejectedValue(
      new OnlineLeagueWeekSimulationError(
        "schedule_missing",
        "Für die aktuelle Woche ist kein gültiger Schedule vorhanden.",
      ),
    );

    const response = await POST(
      postRequest({
        action: "simulateWeek",
        backendMode: "firebase",
        leagueId: "league-1",
        confirmed: true,
      }, "admin-token"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "schedule_missing",
      message: "Für die aktuelle Woche ist kein gültiger Schedule vorhanden.",
      ok: false,
    });
  });
});
