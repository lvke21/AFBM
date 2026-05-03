import type { OnlineAdminActionName } from "./online-admin-actions";

export const ONLINE_ADMIN_SIMULATION_ACTIONS = [
  "startLeague",
  "simulateWeek",
  "startFantasyDraft",
  "completeFantasyDraftIfReady",
  "autoDraftNextFantasyDraft",
  "autoDraftToEndFantasyDraft",
] as const satisfies readonly OnlineAdminActionName[];

export type OnlineAdminSimulationAction = (typeof ONLINE_ADMIN_SIMULATION_ACTIONS)[number];

export function isOnlineAdminSimulationAction(
  action: OnlineAdminActionName,
): action is OnlineAdminSimulationAction {
  return ONLINE_ADMIN_SIMULATION_ACTIONS.includes(action as OnlineAdminSimulationAction);
}
