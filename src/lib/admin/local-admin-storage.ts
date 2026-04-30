import {
  ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
  ONLINE_LEAGUES_STORAGE_KEY,
} from "@/lib/online/online-league-service";
import {
  ONLINE_USER_ID_STORAGE_KEY,
  ONLINE_USERNAME_STORAGE_KEY,
} from "@/lib/online/online-user-service";

export type LocalAdminStateInput = {
  leaguesJson?: string | null;
  lastLeagueId?: string | null;
  userId?: string | null;
  username?: string | null;
};

export type LocalAdminStateOutput = {
  leaguesJson: string | null;
  lastLeagueId: string | null;
  resetCurrentUser?: boolean;
};

export class LocalAdminMemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private readonly values = new Map<string, string>();

  constructor(input: LocalAdminStateInput = {}) {
    this.seed(ONLINE_LEAGUES_STORAGE_KEY, input.leaguesJson);
    this.seed(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY, input.lastLeagueId);
    this.seed(ONLINE_USER_ID_STORAGE_KEY, input.userId);
    this.seed(ONLINE_USERNAME_STORAGE_KEY, input.username);
  }

  private seed(key: string, value: string | null | undefined) {
    if (typeof value === "string") {
      this.values.set(key, value);
    }
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  toLocalState(resetCurrentUser = false): LocalAdminStateOutput {
    return {
      leaguesJson: this.getItem(ONLINE_LEAGUES_STORAGE_KEY),
      lastLeagueId: this.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY),
      resetCurrentUser,
    };
  }
}
