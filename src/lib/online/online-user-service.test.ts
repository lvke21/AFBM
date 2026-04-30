import { describe, expect, it } from "vitest";

import {
  ensureCurrentOnlineUser,
  getCurrentOnlineUser,
  ONLINE_USERNAME_STORAGE_KEY,
  ONLINE_USER_ID_STORAGE_KEY,
  resetCurrentOnlineUser,
  setCurrentOnlineUsername,
} from "./online-user-service";

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

  removeItem(key: string) {
    this.items.delete(key);
  }
}

describe("online-user-service", () => {
  it("creates an online user on first ensure call", () => {
    const storage = new MemoryStorage();

    const user = ensureCurrentOnlineUser(storage);

    expect(user.userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(user.username).toMatch(/^Coach_\d{4}$/);
    expect(storage.getItem(ONLINE_USER_ID_STORAGE_KEY)).toBe(user.userId);
    expect(storage.getItem(ONLINE_USERNAME_STORAGE_KEY)).toBe(user.username);
  });

  it("keeps the same online user after reload", () => {
    const storage = new MemoryStorage();

    const firstLoad = ensureCurrentOnlineUser(storage);
    const secondLoad = getCurrentOnlineUser(storage);

    expect(secondLoad).toEqual(firstLoad);
  });

  it("does not create a new id on repeated render initialization", () => {
    const storage = new MemoryStorage();

    const firstRender = ensureCurrentOnlineUser(storage);
    const secondRender = ensureCurrentOnlineUser(storage);
    const thirdRender = ensureCurrentOnlineUser(storage);

    expect(secondRender).toEqual(firstRender);
    expect(thirdRender).toEqual(firstRender);
    expect(storage.setCount).toBe(2);
  });

  it("resets the stored online user for tests and debug", () => {
    const storage = new MemoryStorage();

    ensureCurrentOnlineUser(storage);
    resetCurrentOnlineUser(storage);

    expect(getCurrentOnlineUser(storage)).toBeNull();
  });

  it("updates only the local username while keeping the existing local id", () => {
    const storage = new MemoryStorage();
    const user = ensureCurrentOnlineUser(storage);

    const updatedUser = setCurrentOnlineUsername(" Coach Prime ", storage);

    expect(updatedUser).toEqual({
      userId: user.userId,
      username: "Coach_Prime",
    });
    expect(storage.getItem(ONLINE_USER_ID_STORAGE_KEY)).toBe(user.userId);
    expect(storage.getItem(ONLINE_USERNAME_STORAGE_KEY)).toBe("Coach_Prime");
  });
});
