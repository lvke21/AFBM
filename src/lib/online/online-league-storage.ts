import {
  ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
  ONLINE_LEAGUES_STORAGE_KEY,
} from "./online-league-constants";
import {
  getOptionalBrowserStorage,
  getRequiredBrowserStorage,
  type BrowserStorage,
} from "./browser-storage";

export type OnlineLeagueStorage = BrowserStorage;

export function getOptionalBrowserOnlineLeagueStorage(): OnlineLeagueStorage | null {
  return getOptionalBrowserStorage();
}

export function getBrowserOnlineLeagueStorage(): OnlineLeagueStorage {
  return getRequiredBrowserStorage("Online league state is only available in the browser.");
}

export function readStoredOnlineLeagueCollection(storage: OnlineLeagueStorage): unknown[] {
  const rawLeagues = storage.getItem(ONLINE_LEAGUES_STORAGE_KEY);

  if (!rawLeagues) {
    return [];
  }

  try {
    const parsedLeagues = JSON.parse(rawLeagues) as unknown;

    return Array.isArray(parsedLeagues) ? parsedLeagues : [];
  } catch {
    return [];
  }
}

export function writeStoredOnlineLeagueCollection(
  storage: OnlineLeagueStorage,
  leagues: readonly unknown[],
) {
  storage.setItem(ONLINE_LEAGUES_STORAGE_KEY, JSON.stringify(leagues));
}

export function removeStoredOnlineLeagueCollection(storage: OnlineLeagueStorage) {
  storage.removeItem(ONLINE_LEAGUES_STORAGE_KEY);
}

export function getStoredLastOnlineLeagueId(storage: OnlineLeagueStorage): string | null {
  const leagueId = storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY);

  return leagueId && leagueId.trim().length > 0 ? leagueId : null;
}

export function setStoredLastOnlineLeagueId(
  storage: OnlineLeagueStorage,
  leagueId: string,
) {
  storage.setItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY, leagueId);
}

export function clearStoredLastOnlineLeagueId(
  storage: OnlineLeagueStorage,
  leagueId?: string,
) {
  if (!leagueId || storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY) === leagueId) {
    storage.removeItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY);
  }
}
