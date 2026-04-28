import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
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
