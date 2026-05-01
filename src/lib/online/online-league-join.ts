import {
  getBrowserOnlineLeagueStorage,
  type OnlineLeagueStorage,
} from "./online-league-storage";
import type { TeamIdentitySelection } from "./team-identity-options";

export function isOnlineLeagueStorage(value: unknown): value is OnlineLeagueStorage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const storage = value as Partial<OnlineLeagueStorage>;

  return (
    typeof storage.getItem === "function" &&
    typeof storage.setItem === "function" &&
    typeof storage.removeItem === "function"
  );
}

export function resolveJoinArguments(
  teamIdentityOrStorage: TeamIdentitySelection | OnlineLeagueStorage | undefined,
  storage: OnlineLeagueStorage | undefined,
) {
  if (isOnlineLeagueStorage(teamIdentityOrStorage)) {
    return {
      teamIdentity: undefined,
      storage: teamIdentityOrStorage,
    };
  }

  return {
    teamIdentity: teamIdentityOrStorage,
    storage: storage ?? getBrowserOnlineLeagueStorage(),
  };
}
