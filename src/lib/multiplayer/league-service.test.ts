import { describe, expect, it } from "vitest";

import {
  getLastLeagueId,
  getLeague,
  getLeagueById,
  GLOBAL_LEAGUE_STORAGE_KEY,
  joinLeague,
  LAST_LEAGUE_ID_STORAGE_KEY,
  resetLeague,
  saveLeague,
  type League,
} from "./league-service";

class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

describe("league-service", () => {
  it("creates the initial global league when no league is stored", () => {
    const storage = new MemoryStorage();

    const league = getLeague(storage);

    expect(league).toEqual({
      id: "global-league",
      name: "Global Test League",
      users: [],
      maxUsers: 16,
      status: "waiting",
    });
    expect(JSON.parse(storage.getItem(GLOBAL_LEAGUE_STORAGE_KEY) ?? "")).toEqual(league);
  });

  it("persists and reloads a saved league", () => {
    const storage = new MemoryStorage();
    const league: League = {
      id: "global-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "waiting",
      users: [{ userId: "user-1", username: "Coach_1234" }],
    };

    saveLeague(league, storage);

    expect(getLeague(storage)).toEqual(league);
  });

  it("resets the league to the initial waiting state", () => {
    const storage = new MemoryStorage();
    saveLeague(
      {
        id: "global-league",
        name: "Global Test League",
        maxUsers: 16,
        status: "active",
        users: [{ userId: "user-1", username: "Coach_1234" }],
      },
      storage,
    );

    const reset = resetLeague(storage);

    expect(reset.users).toEqual([]);
    expect(reset.status).toBe("waiting");
    expect(getLeague(storage)).toEqual(reset);
  });

  it("joins a user and stores the last league id", () => {
    const storage = new MemoryStorage();

    const result = joinLeague({ userId: "user-1", username: "Coach_1234" }, storage);

    expect(result.status).toBe("joined");
    expect(result.league.users).toEqual([{ userId: "user-1", username: "Coach_1234" }]);
    expect(getLeague(storage).users).toEqual([{ userId: "user-1", username: "Coach_1234" }]);
    expect(storage.getItem(LAST_LEAGUE_ID_STORAGE_KEY)).toBe("global-league");
  });

  it("loads the joined league by the stored last league id", () => {
    const storage = new MemoryStorage();

    joinLeague({ userId: "user-1", username: "Coach_1234" }, storage);
    const lastLeagueId = getLastLeagueId(storage);

    expect(lastLeagueId).toBe("global-league");
    expect(lastLeagueId ? getLeagueById(lastLeagueId, storage)?.users : []).toEqual([
      { userId: "user-1", username: "Coach_1234" },
    ]);
  });

  it("returns null when no last league id is stored", () => {
    const storage = new MemoryStorage();

    expect(getLastLeagueId(storage)).toBeNull();
  });

  it("does not join the same user twice", () => {
    const storage = new MemoryStorage();
    const user = { userId: "user-1", username: "Coach_1234" };

    joinLeague(user, storage);
    const secondJoin = joinLeague(user, storage);

    expect(secondJoin.status).toBe("already-member");
    expect(secondJoin.league.users).toEqual([user]);
    expect(getLeague(storage).users).toEqual([user]);
  });

  it("respects maxUsers when joining", () => {
    const storage = new MemoryStorage();
    const fullLeague: League = {
      id: "global-league",
      name: "Global Test League",
      maxUsers: 1,
      status: "waiting",
      users: [{ userId: "user-1", username: "Coach_1234" }],
    };

    saveLeague(fullLeague, storage);
    const result = joinLeague({ userId: "user-2", username: "Coach_5678" }, storage);

    expect(result).toEqual({
      status: "full",
      league: fullLeague,
      message: "Liga ist voll",
    });
    expect(getLeague(storage).users).toEqual([{ userId: "user-1", username: "Coach_1234" }]);
  });
});
