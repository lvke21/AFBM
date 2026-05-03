import type { OnlineAdminActionName } from "./online-admin-actions";

export const ONLINE_ADMIN_REPAIR_ACTIONS = [
  "resetLeague",
  "setAllReady",
  "applyRevenueSharing",
  "resetTrainingPlan",
  "recordMissedWeek",
  "warnGm",
  "authorizeRemoval",
  "adminRemoveGm",
  "markVacant",
  "removePlayer",
] as const satisfies readonly OnlineAdminActionName[];

export type OnlineAdminRepairAction = (typeof ONLINE_ADMIN_REPAIR_ACTIONS)[number];

export function isOnlineAdminRepairAction(
  action: OnlineAdminActionName,
): action is OnlineAdminRepairAction {
  return ONLINE_ADMIN_REPAIR_ACTIONS.includes(action as OnlineAdminRepairAction);
}
