import {
  writeStoredOnlineLeagueCollection,
  type OnlineLeagueStorage,
} from "./online-league-storage";
import type { OnlineLeague } from "./online-league-types";

export function dedupeOnlineLeagues(leagues: OnlineLeague[]) {
  return leagues.filter(
    (league, index, allLeagues) =>
      allLeagues.findIndex((candidate) => candidate.id === league.id) === index,
  );
}

export function saveOnlineLeagueCollection(
  leagues: OnlineLeague[],
  storage: OnlineLeagueStorage,
) {
  writeStoredOnlineLeagueCollection(storage, dedupeOnlineLeagues(leagues));
}
