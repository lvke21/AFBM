import { describe, expect, it } from "vitest";

import {
  assertOnlineAdminActionPolicy,
  getOnlineAdminActionPolicy,
} from "./online-admin-action-policy";
import type { OnlineAdminActionName } from "./online-admin-actions";
import { ONLINE_ADMIN_REPAIR_ACTIONS } from "./online-admin-repair-use-cases";
import { ONLINE_ADMIN_SEED_ACTIONS } from "./online-admin-seed-use-cases";
import { ONLINE_ADMIN_SIMULATION_ACTIONS } from "./online-admin-simulation-use-cases";

const ALL_ADMIN_ACTIONS = [
  "listLeagues",
  "getLeague",
  "createLeague",
  "deleteLeague",
  "resetLeague",
  "debugDeleteAllLeagues",
  "debugAddFakeUser",
  "debugFillLeague",
  "debugSetAllReady",
  "debugResetOnlineState",
  "setAllReady",
  "startLeague",
  "removePlayer",
  "simulateWeek",
  "applyRevenueSharing",
  "resetTrainingPlan",
  "recordMissedWeek",
  "warnGm",
  "authorizeRemoval",
  "adminRemoveGm",
  "markVacant",
  "initializeFantasyDraft",
  "startFantasyDraft",
  "completeFantasyDraftIfReady",
  "autoDraftNextFantasyDraft",
  "autoDraftToEndFantasyDraft",
  "resetFantasyDraft",
] as const satisfies readonly OnlineAdminActionName[];

describe("online admin action policy", () => {
  it("splits admin actions into overview, simulation, repair, and seed domains", () => {
    expect(getOnlineAdminActionPolicy("getLeague")).toMatchObject({
      domain: "overview",
      mutates: false,
      requiresConfirmation: false,
      audited: true,
    });
    expect(getOnlineAdminActionPolicy("simulateWeek")).toMatchObject({
      domain: "simulation",
      mutates: true,
      requiresConfirmation: true,
      audited: true,
    });
    expect(getOnlineAdminActionPolicy("setAllReady")).toMatchObject({
      domain: "repair",
      mutates: true,
      requiresConfirmation: true,
      audited: true,
    });
    expect(getOnlineAdminActionPolicy("createLeague")).toMatchObject({
      domain: "seed",
      mutates: true,
      requiresConfirmation: true,
      audited: true,
    });
  });

  it("keeps every admin action in exactly one structured domain", () => {
    const domainActions = [
      ...ONLINE_ADMIN_REPAIR_ACTIONS,
      ...ONLINE_ADMIN_SEED_ACTIONS,
      ...ONLINE_ADMIN_SIMULATION_ACTIONS,
      "listLeagues",
      "getLeague",
    ];

    expect(new Set(domainActions).size).toBe(ALL_ADMIN_ACTIONS.length);
    expect(new Set(domainActions)).toEqual(new Set(ALL_ADMIN_ACTIONS));
  });

  it("requires explicit confirmation for every mutation", () => {
    expect(() =>
      assertOnlineAdminActionPolicy({
        action: "setAllReady",
        backendMode: "local",
        leagueId: "league-1",
      }),
    ).toThrow("explizite Bestätigung");

    expect(() =>
      assertOnlineAdminActionPolicy({
        action: "setAllReady",
        backendMode: "firebase",
        leagueId: "league-1",
        confirmed: true,
      }),
    ).not.toThrow();

    expect(() =>
      assertOnlineAdminActionPolicy({
        action: "getLeague",
        backendMode: "local",
        leagueId: "league-1",
      }),
    ).not.toThrow();
  });

  it("marks all mutations as audited and guarded by policy", () => {
    for (const action of ALL_ADMIN_ACTIONS) {
      const policy = getOnlineAdminActionPolicy(action);

      expect(policy.audited, action).toBe(true);

      if (policy.mutates) {
        expect(policy.requiresConfirmation, action).toBe(true);
      }
    }
  });
});
