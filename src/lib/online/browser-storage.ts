export type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function getOptionalBrowserStorage(): BrowserStorage | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

export function getRequiredBrowserStorage(errorMessage: string): BrowserStorage {
  const storage = getOptionalBrowserStorage();

  if (!storage) {
    throw new Error(errorMessage);
  }

  return storage;
}
