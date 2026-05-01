import {
  ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
  ONLINE_LEAGUES_STORAGE_KEY,
} from "@/lib/online/online-league-constants";
import {
  ONLINE_USERNAME_STORAGE_KEY,
  ONLINE_USER_ID_STORAGE_KEY,
} from "@/lib/online/online-user-service";
import { getOptionalBrowserStorage } from "@/lib/online/browser-storage";

export type LocalAdminBrowserState = {
  leaguesJson: string | null;
  lastLeagueId: string | null;
  userId: string | null;
  username: string | null;
};

export type LocalAdminBrowserStatePatch = {
  leaguesJson: string | null;
  lastLeagueId: string | null;
  resetCurrentUser?: boolean;
};

export function getLocalAdminBrowserState(): LocalAdminBrowserState | undefined {
  const storage = getOptionalBrowserStorage();

  if (!storage) {
    return undefined;
  }

  return {
    leaguesJson: storage.getItem(ONLINE_LEAGUES_STORAGE_KEY),
    lastLeagueId: storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY),
    userId: storage.getItem(ONLINE_USER_ID_STORAGE_KEY),
    username: storage.getItem(ONLINE_USERNAME_STORAGE_KEY),
  };
}

export function applyLocalAdminBrowserState(
  localState: LocalAdminBrowserStatePatch | undefined,
) {
  const storage = getOptionalBrowserStorage();

  if (!storage || !localState) {
    return;
  }

  if (localState.leaguesJson) {
    storage.setItem(ONLINE_LEAGUES_STORAGE_KEY, localState.leaguesJson);
  } else {
    storage.removeItem(ONLINE_LEAGUES_STORAGE_KEY);
  }

  if (localState.lastLeagueId) {
    storage.setItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY, localState.lastLeagueId);
  } else {
    storage.removeItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY);
  }

  if (localState.resetCurrentUser) {
    storage.removeItem(ONLINE_USER_ID_STORAGE_KEY);
    storage.removeItem(ONLINE_USERNAME_STORAGE_KEY);
  }
}
