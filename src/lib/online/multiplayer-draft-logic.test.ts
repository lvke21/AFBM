import { describe, expect, it } from "vitest";

import type { OnlineContractPlayer, OnlineFantasyDraftPick } from "./online-league-types";
import {
  belongsToCurrentMultiplayerDraftRun,
  createPreparedMultiplayerDraftState,
  createSnakeDraftSequence,
  getNextPreparedMultiplayerDraftState,
  getMultiplayerDraftPickDocumentId,
  getSnakeDraftTeamId,
  isCurrentMultiplayerDraftPickDocumentOccupied,
  validateMultiplayerDraftSourceConsistency,
  validateMultiplayerDraftStateIntegrity,
  validatePreparedMultiplayerDraftPick,
} from "./multiplayer-draft-logic";

const TEAM_IDS = [
  "zurich-guardians",
  "basel-rhinos",
  "geneva-falcons",
  "bern-wolves",
  "lausanne-lions",
  "winterthur-titans",
  "st-gallen-bears",
  "lucerne-hawks",
];

function player(playerId: string): OnlineContractPlayer {
  return {
    playerId,
    playerName: `Player ${playerId}`,
    position: "QB",
    attributes: {
      throwingPower: 75,
      throwingAccuracy: 75,
      awareness: 75,
      mobility: 70,
    },
    age: 24,
    overall: 75,
    potential: 82,
    developmentPath: "solid",
    developmentProgress: 0,
    xFactors: [],
    contract: {
      salaryPerYear: 1_000_000,
      yearsRemaining: 1,
      totalValue: 1_000_000,
      guaranteedMoney: 100_000,
      signingBonus: 50_000,
      contractType: "regular",
      capHitPerYear: 1_000_000,
      deadCapPerYear: 50_000,
    },
    status: "free_agent",
  };
}

describe("multiplayer draft foundation logic", () => {
  it("creates a reproducible 8-team snake draft order", () => {
    const sequence = createSnakeDraftSequence(TEAM_IDS, 3);

    expect(sequence.slice(0, 8).map((pick) => pick.teamId)).toEqual(TEAM_IDS);
    expect(sequence.slice(8, 16).map((pick) => pick.teamId)).toEqual([...TEAM_IDS].reverse());
    expect(sequence.slice(16, 24).map((pick) => pick.teamId)).toEqual(TEAM_IDS);
    expect(sequence[0]).toMatchObject({ round: 1, pickInRound: 1, overallPick: 1 });
    expect(sequence[8]).toMatchObject({ round: 2, pickInRound: 1, overallPick: 9 });
  });

  it("resolves the current team by snake pick index", () => {
    expect(getSnakeDraftTeamId(TEAM_IDS, 0)).toBe("zurich-guardians");
    expect(getSnakeDraftTeamId(TEAM_IDS, 7)).toBe("lucerne-hawks");
    expect(getSnakeDraftTeamId(TEAM_IDS, 8)).toBe("lucerne-hawks");
    expect(getSnakeDraftTeamId(TEAM_IDS, 15)).toBe("zurich-guardians");
    expect(getSnakeDraftTeamId(TEAM_IDS, 16)).toBe("zurich-guardians");
  });

  it("uses stable pick document ids and detects current-run draft documents", () => {
    const pick: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };

    expect(getMultiplayerDraftPickDocumentId(1)).toBe("0001");
    expect(getMultiplayerDraftPickDocumentId(27)).toBe("0027");
    expect(isCurrentMultiplayerDraftPickDocumentOccupied(null, "run-1")).toBe(false);
    expect(isCurrentMultiplayerDraftPickDocumentOccupied(pick, "run-1")).toBe(true);
    expect(
      isCurrentMultiplayerDraftPickDocumentOccupied({ ...pick, draftRunId: "run-1" }, "run-1"),
    ).toBe(true);
    expect(
      isCurrentMultiplayerDraftPickDocumentOccupied({ ...pick, draftRunId: "old-run" }, "run-1"),
    ).toBe(false);
    expect(belongsToCurrentMultiplayerDraftRun(null, "run-1")).toBe(false);
    expect(belongsToCurrentMultiplayerDraftRun({}, "run-1")).toBe(true);
    expect(belongsToCurrentMultiplayerDraftRun({ draftRunId: "run-1" }, "run-1")).toBe(true);
    expect(belongsToCurrentMultiplayerDraftRun({ draftRunId: "old-run" }, "run-1")).toBe(false);
  });

  it("prepares an active draft state from the seeded player pool", () => {
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p1", "p2"],
      startedAt: "2026-05-01T11:00:00.000Z",
      draftRunId: "run",
    });

    expect(state).toMatchObject({
      leagueId: "league",
      status: "active",
      round: 1,
      pickNumber: 1,
      currentTeamId: TEAM_IDS[0],
      draftOrder: TEAM_IDS,
      availablePlayerIds: ["p1", "p2"],
      startedAt: "2026-05-01T11:00:00.000Z",
      completedAt: null,
      draftRunId: "run",
    });
  });

  it("accepts the first pick and advances to the next team", () => {
    const pool = [player("p1"), player("p2")];
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: pool.map((candidate) => candidate.playerId),
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const validation = validatePreparedMultiplayerDraftPick({
      state,
      teamIds: TEAM_IDS,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      availablePlayers: pool,
      existingPicks: [],
      rosterSize: 0,
    });

    expect(validation.ok).toBe(true);

    const pick: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };
    const nextState = getNextPreparedMultiplayerDraftState({
      state,
      nextPicks: [pick],
      nextAvailablePlayerIds: ["p2"],
      now: pick.timestamp,
    });

    expect(nextState.pickNumber).toBe(2);
    expect(nextState.round).toBe(1);
    expect(nextState.currentTeamId).toBe(TEAM_IDS[1]);
    expect(nextState.availablePlayerIds).toEqual(["p2"]);
  });

  it("blocks duplicate picks, wrong teams and missing players", () => {
    const pool = [player("p1")];
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p1"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const existingPick: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };

    expect(
      validatePreparedMultiplayerDraftPick({
        state,
        teamIds: TEAM_IDS,
        teamId: TEAM_IDS[1],
        playerId: "p1",
        availablePlayers: pool,
        existingPicks: [],
        rosterSize: 0,
      }),
    ).toMatchObject({ ok: false, status: "wrong-team" });
    expect(
      validatePreparedMultiplayerDraftPick({
        state,
        teamIds: TEAM_IDS,
        teamId: TEAM_IDS[0],
        playerId: "missing",
        availablePlayers: pool,
        existingPicks: [],
        rosterSize: 0,
      }),
    ).toMatchObject({ ok: false, status: "missing-player" });
    expect(
      validatePreparedMultiplayerDraftPick({
        state: { ...state, availablePlayerIds: [] },
        teamIds: TEAM_IDS,
        teamId: TEAM_IDS[0],
        playerId: "p1",
        availablePlayers: pool,
        existingPicks: [existingPick],
        rosterSize: 0,
      }),
    ).toMatchObject({ ok: false, status: "draft-inconsistent" });
  });

  it("detects inconsistent draft state before accepting picks", () => {
    const pool = [player("p1"), player("p2")];
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p1", "p2"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const picked: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };
    const inconsistentState = {
      ...state,
      picks: [picked],
      availablePlayerIds: ["p1", "p2"],
      pickNumber: 1,
      currentTeamId: TEAM_IDS[0],
    };
    const integrity = validateMultiplayerDraftStateIntegrity(inconsistentState);

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "picked-player-still-available",
        "active-pick-cursor-mismatch",
        "active-current-team-mismatch",
      ]),
    );
    expect(
      validatePreparedMultiplayerDraftPick({
        state: inconsistentState,
        teamIds: TEAM_IDS,
        teamId: TEAM_IDS[0],
        playerId: "p2",
        availablePlayers: pool,
        existingPicks: inconsistentState.picks,
        rosterSize: 1,
      }),
    ).toMatchObject({ ok: false, status: "draft-inconsistent" });
  });

  it("treats pick docs as canonical when the draft doc cursor contradicts them", () => {
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p2"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const pick: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };
    const fromPickDocs = {
      ...state,
      picks: [pick],
      availablePlayerIds: ["p2"],
      pickNumber: 2,
      currentTeamId: TEAM_IDS[1],
    };
    const contradictoryDraftDoc = {
      ...fromPickDocs,
      picks: [],
      availablePlayerIds: ["p1", "p2"],
      pickNumber: 1,
      currentTeamId: TEAM_IDS[0],
    };
    const consistency = validateMultiplayerDraftSourceConsistency({
      state: fromPickDocs,
      playerPool: [player("p1"), player("p2")],
      legacyState: contradictoryDraftDoc,
    });

    expect(validateMultiplayerDraftStateIntegrity(fromPickDocs)).toEqual({
      ok: true,
      issues: [],
    });
    expect(consistency.ok).toBe(false);
    expect(consistency.issues.map((issue) => issue.code)).toContain(
      "legacy-draft-state-conflict",
    );
  });

  it("reports available-player docs that still contain an already picked player", () => {
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p1", "p2"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const picked: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };
    const integrity = validateMultiplayerDraftStateIntegrity({
      ...state,
      picks: [picked],
      pickNumber: 2,
      currentTeamId: TEAM_IDS[1],
    });

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toContain(
      "picked-player-still-available",
    );
  });

  it("reports completed drafts when canonical pick docs are missing", () => {
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: [TEAM_IDS[0], TEAM_IDS[1]],
      availablePlayerIds: [],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const completedState = {
      ...state,
      status: "completed" as const,
      picks: [
        {
          pickNumber: 1,
          round: 1,
          teamId: TEAM_IDS[0],
          playerId: "p1",
          pickedByUserId: "test",
          timestamp: "2026-05-01T11:01:00.000Z",
        },
      ],
      pickNumber: 2,
      currentTeamId: "",
      completedAt: "2026-05-01T12:00:00.000Z",
    };
    const integrity = validateMultiplayerDraftStateIntegrity(completedState, {
      expectedPickCount: 2,
    });

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toContain("completed-picks-missing");
    expect(integrity.issues.map((issue) => issue.message)).toContain(
      "Abgeschlossener Draft erwartet 2 Picks, gespeichert sind 1.",
    );
  });

  it("detects duplicate pick slots and duplicate picked players", () => {
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p3"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const firstPick: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };
    const secondPick: OnlineFantasyDraftPick = {
      ...firstPick,
      teamId: TEAM_IDS[1],
      pickedByUserId: "test-2",
      timestamp: "2026-05-01T11:02:00.000Z",
    };
    const integrity = validateMultiplayerDraftStateIntegrity({
      ...state,
      picks: [firstPick, secondPick],
      pickNumber: 3,
      round: 1,
      currentTeamId: TEAM_IDS[2],
    });

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["duplicate-pick-number", "duplicate-picked-player"]),
    );
  });

  it("detects source conflicts between draft state, player pool and legacy draft blob", () => {
    const pool = [player("p1"), player("p2")];
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p1"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const legacyState = {
      ...state,
      pickNumber: 2,
      currentTeamId: TEAM_IDS[1],
    };
    const sourceConsistency = validateMultiplayerDraftSourceConsistency({
      state,
      playerPool: pool,
      legacyState,
    });

    expect(sourceConsistency.ok).toBe(false);
    expect(sourceConsistency.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "legacy-draft-state-conflict",
        "pool-player-missing-from-availability",
      ]),
    );
  });

  it("hard-fails when a player is missing from availability without an existing pick", () => {
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p1"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const sourceConsistency = validateMultiplayerDraftSourceConsistency({
      state,
      playerPool: [player("p1"), player("p2")],
    });

    expect(sourceConsistency.ok).toBe(false);
    expect(sourceConsistency.issues.map((issue) => issue.code)).toContain(
      "pool-player-missing-from-availability",
    );
  });

  it("hard-fails when a completed draft still exposes an open pick cursor", () => {
    const completedState = {
      ...createPreparedMultiplayerDraftState({
        leagueId: "league",
        teamIds: [TEAM_IDS[0], TEAM_IDS[1]],
        availablePlayerIds: [],
        startedAt: "2026-05-01T11:00:00.000Z",
      }),
      status: "completed" as const,
      picks: [
        {
          pickNumber: 1,
          round: 1,
          teamId: TEAM_IDS[0],
          playerId: "p1",
          pickedByUserId: "test",
          timestamp: "2026-05-01T11:01:00.000Z",
        },
        {
          pickNumber: 2,
          round: 1,
          teamId: TEAM_IDS[1],
          playerId: "p2",
          pickedByUserId: "test-2",
          timestamp: "2026-05-01T11:02:00.000Z",
        },
      ],
      pickNumber: 3,
      round: 2,
      currentTeamId: "",
      completedAt: "2026-05-01T12:00:00.000Z",
    };
    const integrity = validateMultiplayerDraftStateIntegrity(completedState, {
      expectedPickCount: 2,
    });

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "completed-pick-cursor-mismatch",
        "completed-round-mismatch",
      ]),
    );
  });

  it("detects picked or available players that are missing from the draft pool", () => {
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["missing-available"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const picked: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "missing-picked",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };
    const sourceConsistency = validateMultiplayerDraftSourceConsistency({
      state: {
        ...state,
        picks: [picked],
        availablePlayerIds: ["missing-available"],
        pickNumber: 2,
        currentTeamId: TEAM_IDS[1],
      },
      playerPool: [player("p1")],
    });

    expect(sourceConsistency.ok).toBe(false);
    expect(sourceConsistency.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "picked-player-missing-from-pool",
        "available-player-missing-from-pool",
        "pool-player-missing-from-availability",
      ]),
    );
  });

  it("accepts a consistent active draft cursor", () => {
    const state = createPreparedMultiplayerDraftState({
      leagueId: "league",
      teamIds: TEAM_IDS,
      availablePlayerIds: ["p2"],
      startedAt: "2026-05-01T11:00:00.000Z",
    });
    const pick: OnlineFantasyDraftPick = {
      pickNumber: 1,
      round: 1,
      teamId: TEAM_IDS[0],
      playerId: "p1",
      pickedByUserId: "test",
      timestamp: "2026-05-01T11:01:00.000Z",
    };
    const nextState = {
      ...state,
      picks: [pick],
      availablePlayerIds: ["p2"],
      pickNumber: 2,
      round: 1,
      currentTeamId: TEAM_IDS[1],
    };

    expect(validateMultiplayerDraftStateIntegrity(nextState)).toEqual({
      ok: true,
      issues: [],
    });
  });
});
