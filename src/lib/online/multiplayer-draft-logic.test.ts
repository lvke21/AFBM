import { describe, expect, it } from "vitest";

import type { OnlineContractPlayer, OnlineFantasyDraftPick } from "./online-league-types";
import {
  createPreparedMultiplayerDraftState,
  createSnakeDraftSequence,
  getNextPreparedMultiplayerDraftState,
  getSnakeDraftTeamId,
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
    ).toMatchObject({ ok: false, status: "player-unavailable" });
  });
});
