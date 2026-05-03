import type { OnlineAdminActionName } from "./online-admin-actions";

export const ONLINE_ADMIN_SEED_ACTIONS = [
  "createLeague",
  "deleteLeague",
  "debugDeleteAllLeagues",
  "debugAddFakeUser",
  "debugFillLeague",
  "debugSetAllReady",
  "debugResetOnlineState",
  "initializeFantasyDraft",
  "resetFantasyDraft",
] as const satisfies readonly OnlineAdminActionName[];

export type OnlineAdminSeedAction = (typeof ONLINE_ADMIN_SEED_ACTIONS)[number];

export function isOnlineAdminSeedAction(
  action: OnlineAdminActionName,
): action is OnlineAdminSeedAction {
  return ONLINE_ADMIN_SEED_ACTIONS.includes(action as OnlineAdminSeedAction);
}
