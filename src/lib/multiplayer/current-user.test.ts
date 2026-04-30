import { describe, expect, it } from "vitest";

import {
  getCurrentUser,
  MULTIPLAYER_USERNAME_KEY,
  MULTIPLAYER_USER_ID_KEY,
} from "./current-user";

class MemoryStorage {
  private readonly items = new Map<string, string>();
  setCount = 0;

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.setCount += 1;
    this.items.set(key, value);
  }
}

describe("getCurrentUser", () => {
  it("reuses the same identity after reload", () => {
    const storage = new MemoryStorage();

    const firstLoad = getCurrentUser(storage);
    const secondLoad = getCurrentUser(storage);

    expect(secondLoad).toEqual(firstLoad);
    expect(storage.getItem(MULTIPLAYER_USER_ID_KEY)).toBe(firstLoad.userId);
    expect(storage.getItem(MULTIPLAYER_USERNAME_KEY)).toBe(firstLoad.username);
  });

  it("does not create duplicates on repeated initialization", () => {
    const storage = new MemoryStorage();

    const firstInit = getCurrentUser(storage);
    const secondInit = getCurrentUser(storage);
    const thirdInit = getCurrentUser(storage);

    expect(new Set([firstInit.userId, secondInit.userId, thirdInit.userId]).size).toBe(1);
    expect(new Set([firstInit.username, secondInit.username, thirdInit.username]).size).toBe(1);
    expect(storage.setCount).toBe(2);
  });

  it("creates the expected username format", () => {
    const storage = new MemoryStorage();

    const user = getCurrentUser(storage);

    expect(user.userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(user.username).toMatch(/^Coach_\d{4}$/);
  });
});
