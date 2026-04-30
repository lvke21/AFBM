export type MultiplayerUser = {
  userId: string;
  username: string;
};

export const MULTIPLAYER_USER_ID_KEY = "afbm.multiplayer.userId";
export const MULTIPLAYER_USERNAME_KEY = "afbm.multiplayer.username";

type UserStorage = Pick<Storage, "getItem" | "setItem">;

function getBrowserStorage(): UserStorage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Multiplayer identity is only available in the browser.");
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

function isValidStoredValue(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getCurrentUser(storage: UserStorage = getBrowserStorage()): MultiplayerUser {
  const storedUserId = storage.getItem(MULTIPLAYER_USER_ID_KEY);
  const storedUsername = storage.getItem(MULTIPLAYER_USERNAME_KEY);

  if (isValidStoredValue(storedUserId) && isValidStoredValue(storedUsername)) {
    return {
      userId: storedUserId,
      username: storedUsername,
    };
  }

  const user = {
    userId: createUserId(),
    username: createUsername(),
  };

  storage.setItem(MULTIPLAYER_USER_ID_KEY, user.userId);
  storage.setItem(MULTIPLAYER_USERNAME_KEY, user.username);

  return user;
}
