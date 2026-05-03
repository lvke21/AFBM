import { describe, expect, it } from "vitest";

import {
  ensureStagingSmokeStateEnvironment,
  formatStagingSmokeState,
  getStagingSmokeStateIssues,
  type StagingSmokeState,
} from "./staging-smoke-state";

function state(overrides: Partial<StagingSmokeState> = {}): StagingSmokeState {
  return {
    activeLocks: [],
    currentSeason: 1,
    currentWeek: 1,
    currentWeekGames: 2,
    exists: true,
    lastScheduledWeek: 3,
    leagueId: "league-alpha",
    readyCount: 0,
    resultsCount: 0,
    standingsCount: 0,
    totalUsers: 4,
    ...overrides,
  };
}

describe("staging smoke state preflight", () => {
  it("accepts a clean seeded smoke state", () => {
    expect(getStagingSmokeStateIssues(state())).toEqual([]);
  });

  it("diagnoses state left behind by a previous smoke run", () => {
    expect(
      getStagingSmokeStateIssues(
        state({
          currentWeek: 2,
          readyCount: 4,
          resultsCount: 2,
          standingsCount: 4,
        }),
      ),
    ).toEqual([
      "expected-currentWeek=1 got=2",
      "expected-readyCount=0 got=4",
      "expected-resultsCount=0 got=2",
    ]);
  });

  it("diagnoses active locks and empty weeks before mutation", () => {
    expect(
      getStagingSmokeStateIssues(
        state({
          activeLocks: [
            {
              id: "league-alpha-simulate-s1-w1",
              status: "simulating",
              weekKey: "s1-w1",
            },
          ],
          currentWeekGames: 0,
        }),
      ),
    ).toEqual([
      "no-games-for-currentWeek=1",
      "active-simulating-locks=league-alpha-simulate-s1-w1",
    ]);
  });

  it("formats the preflight state for smoke output", () => {
    expect(formatStagingSmokeState(state())).toContain(
      "leagueId=league-alpha exists=true currentWeek=1",
    );
    expect(formatStagingSmokeState(state())).toContain("readyCount=0/4");
    expect(formatStagingSmokeState(state())).toContain("activeLocks=none");
  });

  it("requires staging-only Firestore state access", () => {
    expect(() =>
      ensureStagingSmokeStateEnvironment({
        GOOGLE_CLOUD_PROJECT: "afbm-staging",
      }),
    ).not.toThrow();
    expect(() =>
      ensureStagingSmokeStateEnvironment({
        GOOGLE_CLOUD_PROJECT: "prod-afbm",
      }),
    ).toThrow(/afbm-staging/);
    expect(() =>
      ensureStagingSmokeStateEnvironment({
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        GOOGLE_CLOUD_PROJECT: "afbm-staging",
      }),
    ).toThrow(/refuses emulator/);
  });
});
