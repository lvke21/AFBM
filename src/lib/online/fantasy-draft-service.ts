import {
  advanceOnlineFantasyDraftPick,
  buildOnlineFantasyDraftRosters,
  completeOnlineFantasyDraftIfReady,
  getOnlineFantasyDraftAvailablePlayers,
  getOnlineFantasyDraftState,
  makeOnlineFantasyDraftPick,
  startOnlineFantasyDraft,
  type OnlineFantasyDraftAvailablePlayerFilters,
  type OnlineFantasyDraftPickResult,
} from "./online-league-service";
import {
  getBrowserOnlineLeagueStorage,
  type OnlineLeagueStorage,
} from "./online-league-storage";

export type FantasyDraftAvailablePlayerFilters = OnlineFantasyDraftAvailablePlayerFilters;
export type FantasyDraftPickResult = OnlineFantasyDraftPickResult;

function resolveStorage(storage?: OnlineLeagueStorage) {
  return storage ?? getBrowserOnlineLeagueStorage();
}

export function initializeFantasyDraft(
  leagueId: string,
  storage?: OnlineLeagueStorage,
) {
  return startOnlineFantasyDraft(leagueId, resolveStorage(storage));
}

export function getDraftState(
  leagueId: string,
  storage?: OnlineLeagueStorage,
) {
  return getOnlineFantasyDraftState(leagueId, resolveStorage(storage));
}

export function getAvailablePlayers(
  leagueId: string,
  filters: FantasyDraftAvailablePlayerFilters = {},
  storage?: OnlineLeagueStorage,
) {
  return getOnlineFantasyDraftAvailablePlayers(leagueId, filters, resolveStorage(storage));
}

export function makeDraftPick(
  leagueId: string,
  teamId: string,
  userId: string,
  playerId: string,
  storage?: OnlineLeagueStorage,
) {
  return makeOnlineFantasyDraftPick(leagueId, teamId, playerId, userId, resolveStorage(storage));
}

export function advanceDraftPick(
  leagueId: string,
  storage?: OnlineLeagueStorage,
) {
  return advanceOnlineFantasyDraftPick(leagueId, resolveStorage(storage));
}

export function completeDraftIfReady(
  leagueId: string,
  storage?: OnlineLeagueStorage,
) {
  return completeOnlineFantasyDraftIfReady(leagueId, resolveStorage(storage));
}

export function buildRostersFromDraft(
  leagueId: string,
  storage?: OnlineLeagueStorage,
) {
  return buildOnlineFantasyDraftRosters(leagueId, resolveStorage(storage));
}
