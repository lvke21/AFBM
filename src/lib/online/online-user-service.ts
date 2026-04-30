export type OnlineUser = {
  userId: string;
  username: string;
};

export const ONLINE_USER_ID_STORAGE_KEY = "afbm.online.userId";
export const ONLINE_USERNAME_STORAGE_KEY = "afbm.online.username";

type OnlineUserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getBrowserStorage(): OnlineUserStorage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Online identity is only available in the browser.");
  }

  return window.localStorage;
}

function createUserId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function createUsername() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `Coach_${suffix}`;
}

export function createDefaultOnlineUsername() {
  return createUsername();
}

function isValidStoredValue(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeOnlineUsername(username: string) {
  return username.trim().replace(/\s+/g, "_").slice(0, 32);
}

export function getCurrentOnlineUser(
  storage: OnlineUserStorage = getBrowserStorage(),
): OnlineUser | null {
  const storedUserId = storage.getItem(ONLINE_USER_ID_STORAGE_KEY);
  const storedUsername = storage.getItem(ONLINE_USERNAME_STORAGE_KEY);

  if (!isValidStoredValue(storedUserId) || !isValidStoredValue(storedUsername)) {
    return null;
  }

  return {
    userId: storedUserId,
    username: storedUsername,
  };
}

export function ensureCurrentOnlineUser(
  storage: OnlineUserStorage = getBrowserStorage(),
): OnlineUser {
  const storedUser = getCurrentOnlineUser(storage);

  if (storedUser) {
    return storedUser;
  }

  const user = {
    userId: createUserId(),
    username: createUsername(),
  };

  storage.setItem(ONLINE_USER_ID_STORAGE_KEY, user.userId);
  storage.setItem(ONLINE_USERNAME_STORAGE_KEY, user.username);

  return user;
}

export function setCurrentOnlineUsername(
  username: string,
  storage: OnlineUserStorage = getBrowserStorage(),
): OnlineUser {
  const normalizedUsername = normalizeOnlineUsername(username);

  if (!normalizedUsername) {
    throw new Error("Username darf nicht leer sein.");
  }

  const user = ensureCurrentOnlineUser(storage);
  const updatedUser = {
    ...user,
    username: normalizedUsername,
  };

  storage.setItem(ONLINE_USERNAME_STORAGE_KEY, updatedUser.username);

  return updatedUser;
}

export function resetCurrentOnlineUser(storage: OnlineUserStorage = getBrowserStorage()) {
  storage.removeItem(ONLINE_USER_ID_STORAGE_KEY);
  storage.removeItem(ONLINE_USERNAME_STORAGE_KEY);
}
