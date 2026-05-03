import { describe, expect, it } from "vitest";

import { normalizeOnlineLeagueCoreLifecycle } from "@/lib/online/online-league-lifecycle";
import type { OnlineLeague } from "@/lib/online/online-league-types";
import {
  adminSimulationHint,
  adminWeekPhaseLabel,
  filterAdminLeagueUsers,
  sortAdminFinanceUsers,
} from "./admin-league-detail-model";

function league(overrides: Partial<OnlineLeague> = {}): OnlineLeague {
  return {
    currentSeason: 1,
    currentWeek: 1,
    id: "admin-model-league",
    maxUsers: 4,
    name: "Admin Model League",
    status: "active",
    teams: [],
    users: [],
    weekStatus: "pre_week",
    ...overrides,
  };
}

function user(overrides: Partial<OnlineLeague["users"][number]> = {}) {
  return {
    joinedAt: "2026-05-02T10:00:00.000Z",
    readyForWeek: false,
    teamId: "team-1",
    teamName: "Team 1",
    userId: "user-1",
    username: "Coach",
    ...overrides,
  } as OnlineLeague["users"][number];
}

function lifecycleFor(leagueState: OnlineLeague) {
  return normalizeOnlineLeagueCoreLifecycle({ league: leagueState, requiresDraft: true });
}

describe("admin league detail model", () => {
  it("derives week phase and simulation hints without component state", () => {
    const readyLeague = league({
      teams: [
        {
          abbreviation: "T1",
          assignedUserId: "user-1",
          assignmentStatus: "assigned",
          id: "team-1",
          name: "Team 1",
        },
      ],
      users: [
        user({
          contractRoster: [
            {
              age: 25,
              contract: {
                capHitPerYear: 1,
                contractType: "regular",
                deadCapPerYear: 0,
                guaranteedMoney: 0,
                salaryPerYear: 1,
                signingBonus: 0,
                totalValue: 1,
                yearsRemaining: 1,
              },
              developmentPath: "solid",
              developmentProgress: 0,
              overall: 75,
              playerId: "player-1",
              playerName: "Starter",
              position: "QB",
              potential: 80,
              status: "active",
              xFactors: [],
            },
          ],
          depthChart: [
            {
              backupPlayerIds: [],
              position: "QB",
              starterPlayerId: "player-1",
              updatedAt: "2026-05-02T10:00:00.000Z",
            },
          ],
          readyForWeek: true,
        }),
      ],
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-02T10:00:00.000Z",
        currentTeamId: "",
        draftOrder: ["team-1"],
        leagueId: "admin-model-league",
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-02T09:00:00.000Z",
        status: "completed",
      },
    });
    const waitingLeague = {
      ...readyLeague,
      users: readyLeague.users.map((candidate) => ({ ...candidate, readyForWeek: false })),
    };

    expect(
      adminWeekPhaseLabel({
        allPlayersReady: true,
        canSimulate: true,
        hasCompletedWeek: false,
        league: readyLeague,
        lifecycle: lifecycleFor(readyLeague),
        simulationInProgress: false,
      }),
    ).toBe("Simulation möglich");
    expect(
      adminSimulationHint({
        allPlayersReady: false,
        blockReasons: [],
        canSimulate: false,
        league: waitingLeague,
        lifecycle: lifecycleFor(waitingLeague),
        missingReadyCount: 2,
        simulationInProgress: false,
      }),
    ).toBe("2 aktive Teams fehlen noch.");
  });

  it("shows blocked lifecycle conflicts in admin week labels and hints", () => {
    const conflictingLeague = league({
      weekStatus: "completed",
      users: [user()],
    });
    const lifecycle = lifecycleFor(conflictingLeague);

    expect(lifecycle.phase).toBe("blockedConflict");
    expect(
      adminWeekPhaseLabel({
        allPlayersReady: false,
        canSimulate: false,
        hasCompletedWeek: false,
        league: conflictingLeague,
        lifecycle,
        simulationInProgress: false,
      }),
    ).toBe("Statuskonflikt blockiert");
    expect(
      adminSimulationHint({
        allPlayersReady: false,
        blockReasons: [],
        canSimulate: false,
        league: conflictingLeague,
        lifecycle,
        missingReadyCount: 1,
        simulationInProgress: false,
      }),
    ).toBe(
      "weekStatus=completed markiert s1-w1 als abgeschlossen, aber completedWeeks enthält keinen kanonischen Eintrag.",
    );
  });

  it("filters gm rows and sorts finance rows", () => {
    const users = [
      user({
        userId: "stable",
        activity: { inactiveStatus: "active" } as OnlineLeague["users"][number]["activity"],
        financeProfile: { totalRevenue: 10, cashBalance: 20 } as OnlineLeague["users"][number]["financeProfile"],
      }),
      user({
        userId: "pressure",
        activity: { inactiveStatus: "warning" } as OnlineLeague["users"][number]["activity"],
        financeProfile: { totalRevenue: 30, cashBalance: 5 } as OnlineLeague["users"][number]["financeProfile"],
        jobSecurity: { status: "hot_seat", score: 25 } as OnlineLeague["users"][number]["jobSecurity"],
      }),
    ];

    expect(filterAdminLeagueUsers(users, "warning").map((candidate) => candidate.userId)).toEqual([
      "pressure",
    ]);
    expect(sortAdminFinanceUsers(users, "revenue").map((candidate) => candidate.userId)).toEqual([
      "pressure",
      "stable",
    ]);
  });
});
