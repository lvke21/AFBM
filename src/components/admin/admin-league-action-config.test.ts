import { describe, expect, it } from "vitest";

import {
  ADMIN_LEAGUE_ACTIONS,
  getAdminLeagueActionsByGroup,
} from "./admin-league-action-config";

describe("admin league action config", () => {
  it("keeps only shared-flow actions in the shared config", () => {
    expect(ADMIN_LEAGUE_ACTIONS.map((action) => action.id)).toEqual([
      "set-all-ready",
      "start-league",
      "refresh-league",
    ]);
    expect(ADMIN_LEAGUE_ACTIONS.map((action) => action.apiAction)).not.toContain("simulateWeek");
    expect(ADMIN_LEAGUE_ACTIONS.map((action) => action.label)).not.toContain("Woche abschließen");
  });

  it("groups actions by admin risk area", () => {
    expect(getAdminLeagueActionsByGroup("overview").map((action) => action.id)).toEqual([
      "refresh-league",
    ]);
    expect(getAdminLeagueActionsByGroup("simulation").map((action) => action.id)).toEqual([
      "start-league",
    ]);
    expect(getAdminLeagueActionsByGroup("repair").map((action) => action.id)).toEqual([
      "set-all-ready",
    ]);
    expect(getAdminLeagueActionsByGroup("debug")).toEqual([]);
    expect(getAdminLeagueActionsByGroup("dangerous-mutation")).toEqual([]);
  });

  it("documents every configured mutating action", () => {
    const mutatingActions = ADMIN_LEAGUE_ACTIONS.filter((action) => action.mutates);

    expect(mutatingActions.map((action) => action.id)).toEqual([
      "set-all-ready",
      "start-league",
    ]);
    mutatingActions.forEach((action) => {
      expect(action.description.length).toBeGreaterThan(40);
      expect(action.group).not.toBe("overview");
    });
  });
});
