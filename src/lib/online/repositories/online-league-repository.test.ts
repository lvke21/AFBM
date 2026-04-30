import { describe, expect, it } from "vitest";

import {
  ONLINE_USERNAME_STORAGE_KEY,
  ONLINE_USER_ID_STORAGE_KEY,
} from "../online-user-service";
import type { TeamIdentitySelection } from "../team-identity-options";
import { assertActiveMembership, assertLeagueAdmin } from "../security/roles";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreOnlineLeagueSnapshot,
} from "../types";
import { LocalOnlineLeagueRepository } from "./local-online-league-repository";

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

const BERLIN_WOLVES: TeamIdentitySelection = {
  cityId: "berlin",
  category: "aggressive_competitive",
  teamNameId: "wolves",
};

const PARIS_GUARDIANS: TeamIdentitySelection = {
  cityId: "paris",
  category: "identity_city",
  teamNameId: "guardians",
};

function setUser(storage: Storage, userId: string, username: string) {
  storage.setItem(ONLINE_USER_ID_STORAGE_KEY, userId);
  storage.setItem(ONLINE_USERNAME_STORAGE_KEY, username);
}

describe("online league repository backbone", () => {
  it("keeps the local repository functional as legacy fallback", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Fallback League", maxUsers: 2 });
    const result = await repository.joinLeague(league.id, BERLIN_WOLVES);

    expect(result.status).toBe("joined");
    expect(result.league.users[0]).toMatchObject({
      userId: "user-a",
      teamDisplayName: "Berlin Wolves",
    });
    expect(repository.getLastLeagueId()).toBe(league.id);
  });

  it("prevents duplicate membership and assigns different teams to different users", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Join League", maxUsers: 2 });
    const firstJoin = await repository.joinLeague(league.id, BERLIN_WOLVES);
    const duplicateJoin = await repository.joinLeague(league.id, BERLIN_WOLVES);

    setUser(storage, "user-b", "Coach_B");
    const secondJoin = await repository.joinLeague(league.id, PARIS_GUARDIANS);

    expect(firstJoin.status).toBe("joined");
    expect(duplicateJoin.status).toBe("already-member");
    expect(secondJoin.status).toBe("joined");
    expect(new Set(secondJoin.league.users.map((user) => user.teamId)).size).toBe(2);
  });

  it("exposes stable local subscriptions with safe unsubscribe", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);
    const league = await repository.createLeague({ name: "Realtime Fallback" });
    const seenLeagueIds: string[] = [];
    const unsubscribe = repository.subscribeToLeague(league.id, (nextLeague) => {
      if (nextLeague) {
        seenLeagueIds.push(nextLeague.id);
      }
    });

    expect(seenLeagueIds).toEqual([league.id]);
    expect(() => unsubscribe()).not.toThrow();
  });

  it("updates a local GM depth chart through the repository interface", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Depth Repo League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    const entry = joined.league.users[0]?.depthChart?.[0];

    const updated = await repository.updateDepthChart(
      league.id,
      entry ? [{ ...entry, updatedAt: "old" }] : [],
    );

    expect(updated?.users[0]?.depthChart?.[0]?.starterPlayerId).toBe(entry?.starterPlayerId);
    expect(updated?.users[0]?.depthChart?.[0]?.updatedAt).not.toBe("old");
  });

  it("maps Firestore backbone documents to the existing OnlineLeague UI model", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: {
        id: "league-alpha",
        name: "Alpha Online",
        status: "lobby",
        createdByUserId: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        maxTeams: 16,
        memberCount: 1,
        currentWeek: 1,
        currentSeason: 1,
        settings: {
          onlineBackbone: true,
        },
        version: 1,
      },
      memberships: [
        {
          userId: "admin",
          username: "Admin",
          displayName: "Admin",
          role: "admin",
          teamId: "",
          joinedAt: "2026-01-01T00:00:00.000Z",
          lastSeenAt: "2026-01-01T00:00:00.000Z",
          ready: false,
          status: "active",
        },
        {
          userId: "gm-a",
          username: "Coach_A",
          displayName: "Coach_A",
          role: "gm",
          teamId: "berlin-wolves",
          joinedAt: "2026-01-01T00:01:00.000Z",
          lastSeenAt: "2026-01-01T00:01:00.000Z",
          ready: true,
          status: "active",
        },
      ],
      teams: [
        {
          id: "berlin-wolves",
          cityId: "berlin",
          cityName: "Berlin",
          teamNameId: "wolves",
          teamName: "Wolves",
          displayName: "Berlin Wolves",
          assignedUserId: "gm-a",
          status: "assigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:01:00.000Z",
        },
      ],
    };

    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);

    expect(league.status).toBe("waiting");
    expect(league.users).toHaveLength(1);
    expect(league.users[0]).toMatchObject({
      userId: "gm-a",
      teamDisplayName: "Berlin Wolves",
      readyForWeek: true,
    });
  });

  it("enforces role guards for member and admin operations", () => {
    const memberships = [
      {
        userId: "admin",
        username: "Admin",
        displayName: "Admin",
        role: "admin" as const,
        teamId: "",
        joinedAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:00.000Z",
        ready: false,
        status: "active" as const,
      },
      {
        userId: "gm",
        username: "GM",
        displayName: "GM",
        role: "gm" as const,
        teamId: "team-a",
        joinedAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:00.000Z",
        ready: false,
        status: "active" as const,
      },
    ];

    expect(assertActiveMembership("gm", "league-alpha", memberships).teamId).toBe("team-a");
    expect(assertLeagueAdmin("admin", "league-alpha", memberships)?.role).toBe("admin");
    expect(() => assertLeagueAdmin("gm", "league-alpha", memberships)).toThrow(
      "not an admin",
    );
  });
});
