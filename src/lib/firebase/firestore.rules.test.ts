import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const PROJECT_ID = "demo-afbm";

describe("firestore security rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedFixtureData(testEnv);
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("allows users to read their own profile only", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(getDoc(doc(aliceDb, "users/alice")));
    await assertFails(getDoc(doc(bobDb, "users/alice")));
  });

  it("allows active league members to read league scoped documents", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(getDoc(doc(aliceDb, "leagues/league-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "teams/team-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "players/player-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "seasons/season-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "weeks/week-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "matches/match-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "gameEvents/event-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "playerStats/player-stat-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "teamStats/team-stat-alpha")));
    await assertSucceeds(getDoc(doc(aliceDb, "reports/report-alpha")));
  });

  it("allows league owners to read league scoped documents without a membership row", async () => {
    const charlieDb = testEnv.authenticatedContext("charlie").firestore();

    await assertSucceeds(getDoc(doc(charlieDb, "leagues/league-owned")));
    await assertSucceeds(getDoc(doc(charlieDb, "teams/team-owned")));
  });

  it("allows admins to read league member rows and blocks non-admin member rows", async () => {
    const adminDb = testEnv.authenticatedContext("admin").firestore();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(getDoc(doc(adminDb, "leagueMembers/league-alpha_alice")));
    await assertSucceeds(getDoc(doc(aliceDb, "leagueMembers/league-alpha_alice")));
    await assertFails(getDoc(doc(bobDb, "leagueMembers/league-alpha_alice")));
  });

  it("allows league member list queries only when scoped by leagueId", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const teamsByLeague = query(
      collection(aliceDb, "teams"),
      where("leagueId", "==", "league-alpha"),
    );

    const result = await assertSucceeds(getDocs(teamsByLeague));

    expect(result.docs).toHaveLength(1);
  });

  it("denies unscoped league document queries", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(getDocs(collection(aliceDb, "teams")));
    await assertFails(getDocs(collection(aliceDb, "matches")));
  });

  it("denies reads for users outside the league", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const anonymousDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(bobDb, "leagues/league-alpha")));
    await assertFails(getDoc(doc(bobDb, "teams/team-alpha")));
    await assertFails(getDoc(doc(aliceDb, "leagues/league-beta")));
    await assertFails(getDoc(doc(aliceDb, "teams/team-beta")));
    await assertFails(getDoc(doc(anonymousDb, "leagues/league-alpha")));
  });

  it("allows privileged emulator fixture writes with rules disabled", async () => {
    await assertSucceeds(
      testEnv.withSecurityRulesDisabled(async (context) =>
        setDoc(doc(context.firestore(), "reports/server-fixture"), {
          createdAt: new Date(),
          leagueId: "league-alpha",
          type: "QA",
        }),
      ),
    );
  });

  it("denies all client writes, including critical game engine paths", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const adminDb = testEnv.authenticatedContext("admin").firestore();

    await assertFails(
      setDoc(doc(aliceDb, "users/alice"), {
        displayName: "Alice Edited",
      }),
    );
    await assertFails(updateDoc(doc(adminDb, "leagues/league-alpha"), {
      weekState: "GAME_RUNNING",
    }));
    await assertFails(updateDoc(doc(adminDb, "matches/match-alpha"), {
      status: "COMPLETED",
    }));
    await assertFails(
      setDoc(doc(adminDb, "gameEvents/client-event"), {
        leagueId: "league-alpha",
        matchId: "match-alpha",
        sequence: 99,
      }),
    );
    await assertFails(updateDoc(doc(adminDb, "playerStats/player-stat-alpha"), {
      passingYards: 999,
    }));
    await assertFails(updateDoc(doc(adminDb, "teamStats/team-stat-alpha"), {
      wins: 99,
    }));
    await assertFails(
      setDoc(doc(adminDb, "reports/client-report"), {
        createdAt: new Date(),
        leagueId: "league-alpha",
        type: "MATCH_REPORT",
      }),
    );
  });

  it("allows signed-in online lobby reads, blocks anonymous reads, and permits self ready updates", async () => {
    const gmDb = testEnv.authenticatedContext("online-gm").firestore();
    const outsiderDb = testEnv.authenticatedContext("online-outsider").firestore();
    const anonymousDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(outsiderDb, "leagues/online-alpha")));
    await assertSucceeds(getDoc(doc(outsiderDb, "leagues/online-alpha/teams/online-team-b")));
    await assertFails(getDoc(doc(anonymousDb, "leagues/online-alpha")));
    await assertFails(getDoc(doc(anonymousDb, "leagues/online-alpha/teams/online-team-b")));
    await assertSucceeds(updateDoc(doc(gmDb, "leagues/online-alpha/memberships/online-gm"), {
      ready: true,
      lastSeenAt: new Date(),
    }));
    await assertFails(updateDoc(doc(gmDb, "leagues/online-alpha/memberships/online-gm"), {
      role: "admin",
    }));
    await assertFails(setDoc(doc(gmDb, "leagues/online-alpha/adminLogs/gm-write"), {
      action: "unsafe",
      adminUserId: "online-gm",
      createdAt: new Date(),
    }));
    await assertSucceeds(updateDoc(doc(gmDb, "leagues/online-alpha/teams/online-team-a"), {
      depthChart: [
        {
          position: "QB",
          starterPlayerId: "qb-1",
          backupPlayerIds: [],
          updatedAt: new Date(),
        },
      ],
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(doc(gmDb, "leagues/online-alpha/teams/online-team-a"), {
      assignedUserId: "other-gm",
      status: "vacant",
    }));
  });

  it("keeps online admin actions server-only for client Firebase users", async () => {
    const adminDb = testEnv.authenticatedContext("online-admin").firestore();
    const gmDb = testEnv.authenticatedContext("online-gm").firestore();

    await assertFails(setDoc(doc(adminDb, "leagues/client-created-league"), {
      createdAt: new Date(),
      createdByUserId: "online-admin",
      currentSeason: 1,
      currentWeek: 1,
      id: "client-created-league",
      maxTeams: 16,
      memberCount: 0,
      name: "Client Created",
      settings: {
        onlineBackbone: true,
      },
      status: "lobby",
      updatedAt: new Date(),
      version: 1,
    }));
    await assertFails(updateDoc(doc(adminDb, "leagues/online-alpha"), {
      status: "active",
      updatedAt: new Date(),
      version: 2,
    }));
    await assertFails(deleteDoc(doc(adminDb, "leagues/online-alpha")));
    await assertFails(updateDoc(doc(adminDb, "leagues/online-alpha/weeks/s1-w1"), {
      status: "simulated",
      updatedAt: new Date(),
    }));
    await assertFails(getDoc(doc(adminDb, "leagues/online-alpha/adminLogs/server-log")));
    await assertFails(setDoc(doc(adminDb, "leagues/online-alpha/adminLogs/client-log"), {
      action: "simulateWeek",
      adminUserId: "online-admin",
      createdAt: new Date(),
    }));
    await assertFails(updateDoc(doc(adminDb, "leagues/online-alpha/memberships/online-gm"), {
      ready: true,
    }));
    await assertFails(updateDoc(doc(gmDb, "leagues/online-alpha/memberships/online-admin"), {
      role: "gm",
    }));
    await assertFails(setDoc(doc(adminDb, "leagues/online-alpha/draft/main"), {
      leagueId: "online-alpha",
      status: "active",
      round: 1,
      pickNumber: 1,
      currentTeamId: "online-team-a",
      draftOrder: ["online-team-a", "online-team-peer"],
      startedAt: new Date(),
      completedAt: null,
    }));
  });

  it("allows online league members to read split draft state, picks, and available players only inside their league", async () => {
    const gmDb = testEnv.authenticatedContext("online-gm").firestore();
    const adminDb = testEnv.authenticatedContext("online-admin").firestore();
    const outsiderDb = testEnv.authenticatedContext("online-outsider").firestore();
    const anonymousDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(gmDb, "leagues/online-alpha/draft/main")));
    await assertSucceeds(getDoc(doc(gmDb, "leagues/online-alpha/draft/main/picks/0000")));
    await assertSucceeds(
      getDoc(doc(gmDb, "leagues/online-alpha/draft/main/availablePlayers/player-qb-1")),
    );
    await assertSucceeds(getDoc(doc(adminDb, "leagues/online-alpha/draft/main")));

    await assertFails(getDoc(doc(outsiderDb, "leagues/online-alpha/draft/main")));
    await assertFails(
      getDoc(doc(outsiderDb, "leagues/online-alpha/draft/main/availablePlayers/player-qb-1")),
    );
    await assertFails(getDoc(doc(anonymousDb, "leagues/online-alpha/draft/main/picks/0000")));
  });

  it("blocks manipulative online draft writes and forged picks", async () => {
    const gmDb = testEnv.authenticatedContext("online-gm").firestore();
    const peerDb = testEnv.authenticatedContext("online-peer").firestore();

    await assertFails(updateDoc(doc(gmDb, "leagues/online-alpha/draft/main"), {
      pickNumber: 99,
      currentTeamId: "online-team-a",
      round: 99,
      status: "active",
    }));
    await assertFails(setDoc(doc(gmDb, "leagues/online-alpha/draft/main/picks/0001"), {
      draftRunId: "draft-run-1",
      pickedByUserId: "online-peer",
      pickNumber: 1,
      playerId: "player-qb-1",
      round: 1,
      teamId: "online-team-peer",
      timestamp: new Date(),
    }));
    await assertFails(setDoc(doc(gmDb, "leagues/online-alpha/draft/main/availablePlayers/player-hack"), {
      playerId: "player-hack",
      playerName: "Injected Player",
      position: "QB",
      overall: 99,
    }));
    await assertFails(updateDoc(doc(gmDb, "leagues/online-alpha/draft/main/availablePlayers/player-qb-1"), {
      overall: 99,
    }));
    await assertFails(deleteDoc(doc(peerDb, "leagues/online-alpha/draft/main/availablePlayers/player-qb-1")));
  });

  it("allows only the current team to commit a valid atomic online draft pick", async () => {
    const gmDb = testEnv.authenticatedContext("online-gm").firestore();
    const pickedAt = new Date();
    const batch = writeBatch(gmDb);

    batch.set(doc(gmDb, "leagues/online-alpha/draft/main/picks/0001"), {
      draftRunId: "draft-run-1",
      pickedByUserId: "online-gm",
      pickNumber: 1,
      playerId: "player-qb-1",
      playerSnapshot: {
        playerId: "player-qb-1",
        playerName: "Draft Quarterback",
        position: "QB",
        overall: 81,
      },
      round: 1,
      teamId: "online-team-a",
      timestamp: pickedAt,
    });
    batch.delete(doc(gmDb, "leagues/online-alpha/draft/main/availablePlayers/player-qb-1"));
    batch.update(doc(gmDb, "leagues/online-alpha/draft/main"), {
      currentTeamId: "online-team-peer",
      pickNumber: 2,
      round: 1,
      status: "active",
    });
    batch.update(doc(gmDb, "leagues/online-alpha"), {
      updatedAt: pickedAt,
      version: 2,
    });
    batch.set(doc(collection(gmDb, "leagues/online-alpha/events")), {
      createdAt: pickedAt,
      createdByUserId: "online-gm",
      payload: {
        playerId: "player-qb-1",
        teamId: "online-team-a",
      },
      type: "draft_pick_made",
    });

    await assertSucceeds(batch.commit());
  });

  it("limits online membership and team writes to the authenticated player", async () => {
    const gmDb = testEnv.authenticatedContext("online-gm").firestore();
    const outsiderDb = testEnv.authenticatedContext("online-outsider").firestore();
    const anonymousDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(gmDb, "leagues/online-alpha/memberships/online-gm")));
    await assertFails(getDoc(doc(outsiderDb, "leagues/online-alpha/memberships/online-gm")));
    await assertFails(getDoc(doc(anonymousDb, "leagues/online-alpha/memberships/online-gm")));
    await assertFails(updateDoc(doc(gmDb, "leagues/online-alpha/memberships/online-peer"), {
      ready: true,
      lastSeenAt: new Date(),
    }));
    await assertFails(updateDoc(doc(gmDb, "leagues/online-alpha/teams/online-team-peer"), {
      depthChart: [],
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(doc(anonymousDb, "leagues/online-alpha/teams/online-team-a"), {
      depthChart: [],
      updatedAt: new Date(),
    }));
  });

  it("allows only atomic self-join writes and blocks spoofed league counters", async () => {
    const rookieDb = testEnv.authenticatedContext("online-rookie").firestore();
    const outsiderDb = testEnv.authenticatedContext("online-outsider").firestore();
    const joinedAt = new Date();
    const batch = writeBatch(rookieDb);

    batch.update(doc(rookieDb, "leagues/online-alpha"), {
      memberCount: 3,
      updatedAt: joinedAt,
      version: 2,
    });
    batch.set(doc(rookieDb, "leagues/online-alpha/memberships/online-rookie"), {
      displayName: "Online Rookie",
      joinedAt,
      lastSeenAt: joinedAt,
      ready: false,
      role: "gm",
      status: "active",
      teamId: "online-team-b",
      userId: "online-rookie",
      username: "Online Rookie",
    });
    batch.update(doc(rookieDb, "leagues/online-alpha/teams/online-team-b"), {
      assignedUserId: "online-rookie",
      displayName: "Rookie Testers",
      status: "assigned",
      teamName: "Testers",
      updatedAt: joinedAt,
    });
    batch.set(doc(collection(rookieDb, "leagues/online-alpha/events")), {
      createdAt: joinedAt,
      createdByUserId: "online-rookie",
      payload: {
        teamId: "online-team-b",
      },
      type: "user_joined_league",
    });

    await assertSucceeds(batch.commit());
    await assertFails(updateDoc(doc(outsiderDb, "leagues/online-alpha"), {
      memberCount: 99,
      updatedAt: new Date(),
      version: 99,
    }));
    await assertFails(setDoc(doc(outsiderDb, "leagues/online-alpha/memberships/online-outsider"), {
      displayName: "Online Outsider",
      joinedAt: new Date(),
      lastSeenAt: new Date(),
      ready: false,
      role: "gm",
      status: "active",
      teamId: "online-team-b",
      userId: "online-outsider",
      username: "Online Outsider",
    }));
  });

  it("denies production control documents to normal and unauthenticated clients", async () => {
    const gmDb = testEnv.authenticatedContext("online-gm").firestore();
    const anonymousDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(gmDb, "admin/global-control")));
    await assertFails(setDoc(doc(gmDb, "admin/global-control"), {
      enabled: true,
    }));
    await assertFails(getDoc(doc(anonymousDb, "control/weekly-simulation")));
    await assertFails(setDoc(doc(anonymousDb, "control/weekly-simulation"), {
      status: "run",
    }));
  });

  it("denies unknown collections by default", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(getDoc(doc(aliceDb, "internalFlags/feature-rollout")));
    await assertFails(
      setDoc(doc(aliceDb, "internalFlags/feature-rollout"), {
        enabled: true,
      }),
    );
  });
});

async function seedFixtureData(testEnv: RulesTestEnvironment) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, "users/alice"), {
      createdAt: new Date(),
      displayName: "Alice",
      id: "alice",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "users/bob"), {
      createdAt: new Date(),
      displayName: "Bob",
      id: "bob",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "users/admin"), {
      createdAt: new Date(),
      displayName: "Admin",
      id: "admin",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "users/charlie"), {
      createdAt: new Date(),
      displayName: "Charlie",
      id: "charlie",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "leagues/league-alpha"), {
      createdAt: new Date(),
      id: "league-alpha",
      name: "Alpha League",
      ownerId: "admin",
      status: "ACTIVE",
      updatedAt: new Date(),
      weekState: "READY",
    });
    await setDoc(doc(db, "leagues/league-beta"), {
      createdAt: new Date(),
      id: "league-beta",
      name: "Beta League",
      ownerId: "bob",
      status: "ACTIVE",
      updatedAt: new Date(),
      weekState: "READY",
    });
    await setDoc(doc(db, "leagues/league-owned"), {
      createdAt: new Date(),
      id: "league-owned",
      name: "Owner Only League",
      ownerId: "charlie",
      status: "ACTIVE",
      updatedAt: new Date(),
      weekState: "READY",
    });
    await setDoc(doc(db, "leagueMembers/league-alpha_alice"), {
      createdAt: new Date(),
      id: "league-alpha_alice",
      leagueId: "league-alpha",
      role: "GM",
      status: "ACTIVE",
      updatedAt: new Date(),
      userId: "alice",
    });
    await setDoc(doc(db, "leagueMembers/league-alpha_admin"), {
      createdAt: new Date(),
      id: "league-alpha_admin",
      leagueId: "league-alpha",
      role: "ADMIN",
      status: "ACTIVE",
      updatedAt: new Date(),
      userId: "admin",
    });
    await setDoc(doc(db, "leagueMembers/league-beta_bob"), {
      createdAt: new Date(),
      id: "league-beta_bob",
      leagueId: "league-beta",
      role: "GM",
      status: "ACTIVE",
      updatedAt: new Date(),
      userId: "bob",
    });
    await setDoc(doc(db, "teams/team-alpha"), {
      abbreviation: "ALP",
      createdAt: new Date(),
      id: "team-alpha",
      leagueId: "league-alpha",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "leagues/online-alpha"), {
      createdAt: new Date(),
      createdByUserId: "online-admin",
      currentSeason: 1,
      currentWeek: 1,
      id: "online-alpha",
      maxTeams: 16,
      memberCount: 2,
      name: "Online Alpha",
      settings: {
        onlineBackbone: true,
      },
      status: "lobby",
      updatedAt: new Date(),
      version: 1,
    });
    await setDoc(doc(db, "leagues/online-alpha/memberships/online-admin"), {
      displayName: "Online Admin",
      joinedAt: new Date(),
      lastSeenAt: new Date(),
      ready: false,
      role: "admin",
      status: "active",
      teamId: "",
      userId: "online-admin",
      username: "Online Admin",
    });
    await setDoc(doc(db, "leagues/online-alpha/memberships/online-gm"), {
      displayName: "Online GM",
      joinedAt: new Date(),
      lastSeenAt: new Date(),
      ready: false,
      role: "gm",
      status: "active",
      teamId: "online-team-a",
      userId: "online-gm",
      username: "Online GM",
    });
    await setDoc(doc(db, "leagues/online-alpha/memberships/online-peer"), {
      displayName: "Online Peer",
      joinedAt: new Date(),
      lastSeenAt: new Date(),
      ready: false,
      role: "gm",
      status: "active",
      teamId: "online-team-peer",
      userId: "online-peer",
      username: "Online Peer",
    });
    await setDoc(doc(db, "leagues/online-alpha/teams/online-team-a"), {
      assignedUserId: "online-gm",
      createdAt: new Date(),
      displayName: "Online Testers",
      id: "online-team-a",
      status: "assigned",
      teamName: "Testers",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "leagues/online-alpha/teams/online-team-peer"), {
      assignedUserId: "online-peer",
      createdAt: new Date(),
      displayName: "Peer Testers",
      id: "online-team-peer",
      status: "assigned",
      teamName: "Testers",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "leagues/online-alpha/teams/online-team-b"), {
      assignedUserId: null,
      cityId: "rookie-city",
      cityName: "Rookie City",
      createdAt: new Date(),
      displayName: "Available Rookies",
      id: "online-team-b",
      status: "available",
      teamName: "Rookies",
      teamNameId: "rookies",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "leagues/online-alpha/weeks/s1-w1"), {
      createdAt: new Date(),
      id: "s1-w1",
      season: 1,
      status: "scheduled",
      updatedAt: new Date(),
      week: 1,
    });
    await setDoc(doc(db, "leagues/online-alpha/adminLogs/server-log"), {
      action: "createLeague",
      adminUserId: "server-admin",
      createdAt: new Date(),
    });
    await setDoc(doc(db, "leagues/online-alpha/draft/main"), {
      completedAt: null,
      currentTeamId: "online-team-a",
      draftOrder: ["online-team-a", "online-team-peer"],
      draftRunId: "draft-run-1",
      leagueId: "online-alpha",
      pickNumber: 1,
      round: 1,
      startedAt: new Date(),
      status: "active",
    });
    await setDoc(doc(db, "leagues/online-alpha/draft/main/picks/0000"), {
      draftRunId: "draft-run-1",
      pickedByUserId: "online-admin",
      pickNumber: 0,
      playerId: "player-history",
      round: 0,
      teamId: "online-team-peer",
      timestamp: new Date(),
    });
    await setDoc(doc(db, "leagues/online-alpha/draft/main/availablePlayers/player-qb-1"), {
      age: 24,
      displayName: "Draft Quarterback",
      draftRunId: "draft-run-1",
      overall: 81,
      playerId: "player-qb-1",
      playerName: "Draft Quarterback",
      position: "QB",
      status: "active",
    });
    await setDoc(doc(db, "admin/global-control"), {
      enabled: true,
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "control/weekly-simulation"), {
      status: "idle",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "teams/team-beta"), {
      abbreviation: "BET",
      createdAt: new Date(),
      id: "team-beta",
      leagueId: "league-beta",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "teams/team-owned"), {
      abbreviation: "OWN",
      createdAt: new Date(),
      id: "team-owned",
      leagueId: "league-owned",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "players/player-alpha"), {
      createdAt: new Date(),
      fullName: "Casey Alpha",
      id: "player-alpha",
      leagueId: "league-alpha",
      roster: {
        teamId: "team-alpha",
      },
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "seasons/season-alpha"), {
      createdAt: new Date(),
      id: "season-alpha",
      leagueId: "league-alpha",
      updatedAt: new Date(),
      year: 2026,
    });
    await setDoc(doc(db, "weeks/week-alpha"), {
      createdAt: new Date(),
      id: "week-alpha",
      leagueId: "league-alpha",
      seasonId: "season-alpha",
      updatedAt: new Date(),
      weekNumber: 1,
    });
    await setDoc(doc(db, "matches/match-alpha"), {
      createdAt: new Date(),
      id: "match-alpha",
      leagueId: "league-alpha",
      seasonId: "season-alpha",
      status: "SCHEDULED",
      updatedAt: new Date(),
      weekId: "week-alpha",
      weekNumber: 1,
    });
    await setDoc(doc(db, "gameEvents/event-alpha"), {
      createdAt: new Date(),
      id: "event-alpha",
      leagueId: "league-alpha",
      matchId: "match-alpha",
      sequence: 1,
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "playerStats/player-stat-alpha"), {
      createdAt: new Date(),
      id: "player-stat-alpha",
      leagueId: "league-alpha",
      playerId: "player-alpha",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "teamStats/team-stat-alpha"), {
      createdAt: new Date(),
      id: "team-stat-alpha",
      leagueId: "league-alpha",
      teamId: "team-alpha",
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "reports/report-alpha"), {
      createdAt: new Date(),
      id: "report-alpha",
      leagueId: "league-alpha",
      type: "MATCH_REPORT",
      updatedAt: new Date(),
    });
  });
}
