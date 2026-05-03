import { describe, expect, it } from "vitest";

import {
  canTransitionOnlineCoreLifecycle,
  normalizeOnlineCoreLifecycle,
  normalizeOnlineLeagueCoreLifecycle,
  normalizeOnlineLeagueLifecycle,
} from "./online-league-lifecycle";
import type { OnlineLeague, OnlineLeagueUser } from "./online-league-types";

const TEST_CONTRACT = {
  capHitPerYear: 1_000_000,
  contractType: "regular" as const,
  deadCapPerYear: 0,
  guaranteedMoney: 0,
  salaryPerYear: 1_000_000,
  signingBonus: 0,
  totalValue: 1_000_000,
  yearsRemaining: 1,
};

const ACTIVE_PLAYER = {
  age: 25,
  contract: TEST_CONTRACT,
  developmentPath: "solid" as const,
  developmentProgress: 0,
  overall: 75,
  playerId: "starter-1",
  playerName: "Test Starter",
  position: "QB",
  potential: 80,
  status: "active" as const,
  xFactors: [],
};

const ACTIVE_USER: OnlineLeagueUser = {
  userId: "user-1",
  username: "Coach_1234",
  joinedAt: "2026-05-02T10:00:00.000Z",
  teamId: "zurich-guardians",
  teamName: "Zurich Guardians",
  readyForWeek: false,
  contractRoster: [ACTIVE_PLAYER],
  depthChart: [
    {
      backupPlayerIds: [],
      position: "QB",
      starterPlayerId: "starter-1",
      updatedAt: "2026-05-02T10:00:00.000Z",
    },
  ],
};

const SECOND_USER: OnlineLeagueUser = {
  ...ACTIVE_USER,
  userId: "user-2",
  username: "Coach_5678",
  teamId: "basel-bears",
  teamName: "Basel Bears",
  readyForWeek: false,
  contractRoster: [
    {
      ...ACTIVE_PLAYER,
      playerId: "starter-2",
      playerName: "Second Starter",
    },
  ],
  depthChart: [
    {
      backupPlayerIds: [],
      position: "QB",
      starterPlayerId: "starter-2",
      updatedAt: "2026-05-02T10:00:00.000Z",
    },
  ],
};

const COMPLETED_DRAFT: OnlineLeague["fantasyDraft"] = {
  leagueId: "lifecycle-test-league",
  status: "completed",
  round: 1,
  pickNumber: 1,
  currentTeamId: "",
  draftOrder: ["zurich-guardians"],
  picks: [],
  availablePlayerIds: [],
  startedAt: "2026-05-02T10:05:00.000Z",
  completedAt: "2026-05-02T10:10:00.000Z",
};

function createLeague(overrides: Partial<OnlineLeague> = {}): OnlineLeague {
  return {
    id: "lifecycle-test-league",
    name: "Lifecycle Test League",
    maxUsers: 8,
    status: "active",
    teams: [
      {
        id: "zurich-guardians",
        name: "Zurich Guardians",
        abbreviation: "ZUR",
        assignedUserId: "user-1",
        assignmentStatus: "assigned",
      },
      {
        id: "basel-bears",
        name: "Basel Bears",
        abbreviation: "BAS",
        assignedUserId: "user-2",
        assignmentStatus: "assigned",
      },
    ],
    currentSeason: 1,
    currentWeek: 1,
    weekStatus: "pre_week",
    users: [ACTIVE_USER],
    ...overrides,
  };
}

function completedWeek(overrides: Partial<NonNullable<OnlineLeague["completedWeeks"]>[number]> = {}) {
  return {
    completedAt: "2026-05-02T11:00:00.000Z",
    nextSeason: 1,
    nextWeek: 2,
    resultMatchIds: [],
    season: 1,
    simulatedByUserId: "admin-1",
    status: "completed" as const,
    week: 1,
    weekKey: "s1-w1",
    ...overrides,
  };
}

function matchResult(overrides: Partial<NonNullable<OnlineLeague["matchResults"]>[number]> = {}) {
  return {
    awayScore: 17,
    awayStats: {
      firstDowns: 10,
      passingYards: 180,
      rushingYards: 90,
      totalYards: 270,
      turnovers: 1,
    },
    awayTeamId: "basel-bears",
    awayTeamName: "Basel Bears",
    createdAt: "2026-05-02T11:00:00.000Z",
    homeScore: 24,
    homeStats: {
      firstDowns: 14,
      passingYards: 220,
      rushingYards: 110,
      totalYards: 330,
      turnovers: 0,
    },
    homeTeamId: "zurich-guardians",
    homeTeamName: "Zurich Guardians",
    matchId: "match-1",
    season: 1,
    simulatedAt: "2026-05-02T11:00:00.000Z",
    simulatedByUserId: "admin-1",
    status: "completed" as const,
    tiebreakerApplied: false,
    week: 1,
    winnerTeamId: "zurich-guardians",
    winnerTeamName: "Zurich Guardians",
    ...overrides,
  };
}

describe("normalizeOnlineLeagueLifecycle", () => {
  it("uses the active draft as the lifecycle phase even when the current user is already ready", () => {
    const lifecycle = normalizeOnlineLeagueLifecycle(
      createLeague({
        fantasyDraft: {
          leagueId: "lifecycle-test-league",
          status: "active",
          round: 1,
          pickNumber: 1,
          currentTeamId: "zurich-guardians",
          draftOrder: ["zurich-guardians"],
          picks: [],
          availablePlayerIds: [],
          startedAt: "2026-05-02T10:05:00.000Z",
          completedAt: null,
        },
        users: [{ ...ACTIVE_USER, readyForWeek: true }],
      }),
      { userId: "user-1", username: "Coach_1234" },
    );

    expect(lifecycle).toMatchObject({
      currentUserReady: true,
      draftPhase: "active",
      membershipPhase: "connected",
      phase: "draft_active",
      readyActionDisabledReason: "Bereit-Status ist während des Drafts gesperrt.",
      statusLabel: "Draft läuft",
    });
  });

  it("normalizes a simulating week ahead of a stale ready flag", () => {
    const lifecycle = normalizeOnlineLeagueLifecycle(
      createLeague({
        weekStatus: "simulating",
        users: [{ ...ACTIVE_USER, readyForWeek: true }],
      }),
      { userId: "user-1", username: "Coach_1234" },
    );

    expect(lifecycle).toMatchObject({
      currentUserReady: true,
      phase: "week_simulating",
      readyActionDisabledReason: "Bereit-Status ist während der Simulation gesperrt.",
      statusLabel: "Simulation läuft",
      weekProgress: {
        phase: "simulating",
      },
    });
  });

  it("normalizes completed current-week signals and blocks ready changes", () => {
    const lifecycle = normalizeOnlineLeagueLifecycle(
      createLeague({
        completedWeeks: [
          {
            ...completedWeek(),
          },
        ],
        users: [{ ...ACTIVE_USER, readyForWeek: true }],
      }),
      { userId: "user-1", username: "Coach_1234" },
    );

    expect(lifecycle).toMatchObject({
      currentUserReady: true,
      phase: "week_completed",
      readyActionDisabledReason: "Diese Woche ist bereits abgeschlossen.",
      statusLabel: "Woche abgeschlossen",
      weekProgress: {
        phase: "completed",
      },
    });
  });

  it("separates missing login and missing membership states", () => {
    expect(normalizeOnlineLeagueLifecycle(createLeague(), null)).toMatchObject({
      membershipPhase: "anonymous",
      phase: "needs_login",
      statusLabel: "Login erforderlich",
    });

    expect(
      normalizeOnlineLeagueLifecycle(createLeague({ users: [] }), {
        userId: "user-1",
        username: "Coach_1234",
      }),
    ).toMatchObject({
      membershipPhase: "missing_membership",
      phase: "missing_membership",
      readyActionDisabledReason: "Kein Manager-Team verbunden.",
      statusLabel: "Kein Team verbunden",
    });
  });
});

describe("normalizeOnlineCoreLifecycle", () => {
  const currentUser = { userId: "user-1", username: "Coach_1234" };

  it("returns noLeague when no league state is available", () => {
    expect(normalizeOnlineCoreLifecycle({ currentUser, league: null })).toMatchObject({
      canSetReady: false,
      canSimulate: false,
      phase: "noLeague",
      readyState: null,
      weekProgress: null,
    });
  });

  it("returns joining before a user has an active league membership", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({ status: "waiting", users: [] }),
      }),
    ).toMatchObject({
      currentLeagueUser: null,
      phase: "joining",
    });
  });

  it("returns noTeam when the membership has no usable team assignment", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          users: [{ ...ACTIVE_USER, teamId: "", teamName: "", teamStatus: "vacant" }],
        }),
      }),
    ).toMatchObject({
      phase: "noTeam",
    });
  });

  it("returns draftPending until a draft is completed or active", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague(),
      }),
    ).toMatchObject({
      draftStatus: "missing",
      phase: "readyOpen",
      canSetReady: true,
    });
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague(),
        requiresDraft: true,
      }),
    ).toMatchObject({
      draftStatus: "missing",
      phase: "draftPending",
      canSetReady: false,
    });
  });

  it("returns draftActive while the fantasy draft is running", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: {
            ...COMPLETED_DRAFT,
            completedAt: null,
            currentTeamId: "zurich-guardians",
            status: "active",
          },
        }),
      }),
    ).toMatchObject({
      draftStatus: "active",
      phase: "draftActive",
    });
  });

  it("returns rosterInvalid when the current team cannot be simulated", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          users: [{ ...ACTIVE_USER, contractRoster: [] }],
        }),
      }),
    ).toMatchObject({
      phase: "rosterInvalid",
    });
  });

  it("returns readyOpen when the current manager can set ready", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
        }),
      }),
    ).toMatchObject({
      canSetReady: true,
      phase: "readyOpen",
    });
  });

  it("returns waitingForOthers when the current manager is ready but another manager is not", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          users: [{ ...ACTIVE_USER, readyForWeek: true }, SECOND_USER],
        }),
      }),
    ).toMatchObject({
      currentUserReady: true,
      phase: "waitingForOthers",
    });
  });

  it("returns readyComplete when all active teams are ready", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          users: [
            { ...ACTIVE_USER, readyForWeek: true },
            { ...SECOND_USER, readyForWeek: true },
          ],
        }),
      }),
    ).toMatchObject({
      canSimulate: true,
      phase: "readyComplete",
    });
  });

  it("returns simulating while a week simulation is in progress", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          users: [{ ...ACTIVE_USER, readyForWeek: true }],
          weekStatus: "simulating",
        }),
      }),
    ).toMatchObject({
      phase: "simulating",
    });
  });

  it("returns weekCompleted when the canonical week ledger is complete but no result payload is available", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          completedWeeks: [completedWeek()],
          fantasyDraft: COMPLETED_DRAFT,
          weekStatus: "completed",
        }),
      }),
    ).toMatchObject({
      hasResults: false,
      phase: "weekCompleted",
    });
  });

  it("returns resultsAvailable when completed week results can be rendered", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          completedWeeks: [completedWeek({ resultMatchIds: ["match-1"] })],
          fantasyDraft: COMPLETED_DRAFT,
          matchResults: [matchResult()],
          weekStatus: "completed",
        }),
      }),
    ).toMatchObject({
      hasResults: true,
      phase: "resultsAvailable",
    });
  });

  it("does not let previous-week results block the next ready week", () => {
    expect(
      normalizeOnlineLeagueCoreLifecycle({
        league: createLeague({
          completedWeeks: [completedWeek({ resultMatchIds: ["match-1"] })],
          currentWeek: 2,
          fantasyDraft: COMPLETED_DRAFT,
          matchResults: [matchResult()],
          schedule: [
            {
              awayTeamName: "Basel Bears",
              homeTeamName: "Zurich Guardians",
              id: "game-2",
              week: 2,
            },
          ],
          users: [
            { ...ACTIVE_USER, readyForWeek: true },
            { ...SECOND_USER, readyForWeek: true },
          ],
        }),
      }),
    ).toMatchObject({
      canSimulate: true,
      phase: "readyComplete",
    });
  });

  it("returns seasonComplete when the week cursor moves beyond the planned schedule", () => {
    expect(
      normalizeOnlineLeagueCoreLifecycle({
        league: createLeague({
          completedWeeks: [completedWeek()],
          currentWeek: 2,
          fantasyDraft: COMPLETED_DRAFT,
          schedule: [
            {
              awayTeamName: "Basel Bears",
              homeTeamName: "Zurich Guardians",
              id: "game-1",
              week: 1,
            },
          ],
          users: [
            { ...ACTIVE_USER, readyForWeek: true },
            { ...SECOND_USER, readyForWeek: true },
          ],
        }),
      }),
    ).toMatchObject({
      canSetReady: false,
      canSimulate: false,
      phase: "seasonComplete",
      reasons: ["Die Saison ist abgeschlossen."],
    });
  });

  it("returns blockedConflict when lifecycle sources contradict each other", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          weekStatus: "completed",
        }),
      }),
    ).toMatchObject({
      phase: "blockedConflict",
      reasons: [
        "weekStatus=completed markiert s1-w1 als abgeschlossen, aber completedWeeks enthält keinen kanonischen Eintrag.",
      ],
    });
  });

  it("blocks current-week completedWeeks when weekStatus still says open", () => {
    const lifecycle = normalizeOnlineCoreLifecycle({
      currentUser,
      league: createLeague({
        completedWeeks: [completedWeek()],
        fantasyDraft: COMPLETED_DRAFT,
        weekStatus: "pre_week",
      }),
    });

    expect(lifecycle.phase).toBe("blockedConflict");
    expect(lifecycle.reasons).toContain(
      "Week-State-Konflikt: completedWeeks markiert s1-w1 als abgeschlossen, aber weekStatus=pre_week ist offen.",
    );
  });

  it("blocks active drafts instead of exposing readyOpen", () => {
    const lifecycle = normalizeOnlineCoreLifecycle({
      currentUser,
      league: createLeague({
        fantasyDraft: {
          ...COMPLETED_DRAFT,
          completedAt: null,
          currentTeamId: "zurich-guardians",
          status: "active",
        },
      }),
    });

    expect(lifecycle.phase).toBe("draftActive");
    expect(lifecycle.canSetReady).toBe(false);
    expect(lifecycle.reasons).toContain("Bereit-Status ist während des Drafts gesperrt.");
  });

  it("keeps ready users blocked when their roster is invalid", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          users: [{ ...ACTIVE_USER, contractRoster: [], readyForWeek: true }],
        }),
      }),
    ).toMatchObject({
      currentUserReady: false,
      phase: "rosterInvalid",
      reasons: ["Bereit gesperrt: Dein Team hat kein Roster."],
    });
  });

  it("uses the simulation lock input ahead of readyComplete", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          users: [{ ...ACTIVE_USER, readyForWeek: true }],
        }),
        simulationInProgress: true,
      }),
    ).toMatchObject({
      canSimulate: false,
      phase: "simulating",
    });
  });

  it("blocks results without canonical completedWeeks", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          matchResults: [matchResult()],
        }),
      }),
    ).toMatchObject({
      phase: "blockedConflict",
      reasons: ["s1-w1 hat Completion-Signale ohne kanonischen completedWeeks-Eintrag."],
    });
  });

  it("blocks correct membership when the team projection points to another user", () => {
    expect(
      normalizeOnlineCoreLifecycle({
        currentUser,
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          teams: [
            {
              abbreviation: "ZUR",
              assignedUserId: "other-user",
              assignmentStatus: "assigned",
              id: "zurich-guardians",
              name: "Zurich Guardians",
            },
          ],
        }),
      }),
    ).toMatchObject({
      phase: "blockedConflict",
      reasons: [
        "Membership-Projektion inkonsistent: Team zurich-guardians ist other-user zugeordnet, Membership gehoert user-1.",
      ],
    });
  });

  it("publishes explicit transition rules for the core loop", () => {
    expect(canTransitionOnlineCoreLifecycle("joining", "noTeam")).toBe(true);
    expect(canTransitionOnlineCoreLifecycle("readyComplete", "simulating")).toBe(true);
    expect(canTransitionOnlineCoreLifecycle("blockedConflict", "readyOpen")).toBe(false);
  });

  it("derives a global admin lifecycle without picking a ready user perspective", () => {
    const lifecycle = normalizeOnlineLeagueCoreLifecycle({
      league: createLeague({
        fantasyDraft: COMPLETED_DRAFT,
        users: [
          { ...ACTIVE_USER, readyForWeek: true },
          { ...SECOND_USER, contractRoster: [], readyForWeek: false },
        ],
      }),
    });

    expect(lifecycle).toMatchObject({
      canSimulate: false,
      currentLeagueUser: null,
      phase: "rosterInvalid",
      reasons: ["Bereit gesperrt: Dein Team hat kein Roster."],
    });
  });

  it("uses global lifecycle readiness for admin simulation when every active team is ready", () => {
    expect(
      normalizeOnlineLeagueCoreLifecycle({
        league: createLeague({
          fantasyDraft: COMPLETED_DRAFT,
          users: [
            { ...ACTIVE_USER, readyForWeek: true },
            { ...SECOND_USER, readyForWeek: true },
          ],
        }),
      }),
    ).toMatchObject({
      canSimulate: true,
      phase: "readyComplete",
    });
  });
});
