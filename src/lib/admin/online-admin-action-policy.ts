import type { OnlineAdminActionInput, OnlineAdminActionName } from "./online-admin-actions";
import { isOnlineAdminRepairAction } from "./online-admin-repair-use-cases";
import { isOnlineAdminSeedAction } from "./online-admin-seed-use-cases";
import { isOnlineAdminSimulationAction } from "./online-admin-simulation-use-cases";

export type OnlineAdminActionDomain =
  | "overview"
  | "simulation"
  | "repair"
  | "seed";

export type OnlineAdminActionPolicy = {
  action: OnlineAdminActionName;
  domain: OnlineAdminActionDomain;
  mutates: boolean;
  requiresConfirmation: boolean;
  requiresDevelopmentOrTest: boolean;
  audited: boolean;
};

const READ_ACTIONS = new Set<OnlineAdminActionName>(["listLeagues", "getLeague"]);
const DEV_ONLY_ACTIONS = new Set<OnlineAdminActionName>([
  "debugDeleteAllLeagues",
  "debugAddFakeUser",
  "debugFillLeague",
  "debugSetAllReady",
  "debugResetOnlineState",
  "resetFantasyDraft",
]);

export class OnlineAdminActionPolicyError extends Error {}

function isDevelopmentOrTestRuntime() {
  return process.env.NODE_ENV !== "production";
}

export function getOnlineAdminActionDomain(
  action: OnlineAdminActionName,
): OnlineAdminActionDomain {
  if (READ_ACTIONS.has(action)) {
    return "overview";
  }

  if (isOnlineAdminSimulationAction(action)) {
    return "simulation";
  }

  if (isOnlineAdminRepairAction(action)) {
    return "repair";
  }

  if (isOnlineAdminSeedAction(action)) {
    return "seed";
  }

  return "overview";
}

export function getOnlineAdminActionPolicy(
  action: OnlineAdminActionName,
): OnlineAdminActionPolicy {
  const mutates = !READ_ACTIONS.has(action);

  return {
    action,
    domain: getOnlineAdminActionDomain(action),
    mutates,
    requiresConfirmation: mutates,
    requiresDevelopmentOrTest: DEV_ONLY_ACTIONS.has(action),
    audited: true,
  };
}

export function assertOnlineAdminActionPolicy(input: OnlineAdminActionInput) {
  const policy = getOnlineAdminActionPolicy(input.action);

  if (policy.requiresDevelopmentOrTest && !isDevelopmentOrTestRuntime()) {
    throw new OnlineAdminActionPolicyError(
      "Diese Admin-Aktion ist nur in Development/Test erlaubt.",
    );
  }

  if (policy.requiresConfirmation && input.confirmed !== true) {
    throw new OnlineAdminActionPolicyError(
      "Admin-Mutation benötigt eine explizite Bestätigung.",
    );
  }

  return policy;
}
