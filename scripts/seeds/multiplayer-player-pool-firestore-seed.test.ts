import { describe, expect, it } from "vitest";

import {
  buildMultiplayerPlayerPoolSeedDocuments,
  MULTIPLAYER_PLAYER_POSITION_TARGETS,
  summarizeMultiplayerPlayerPool,
} from "./multiplayer-player-pool-firestore-seed";
import { MULTIPLAYER_TEST_LEAGUE_ID } from "./multiplayer-test-league-firestore-seed";

const REQUIRED_ATTRIBUTES: Record<string, string[]> = {
  QB: ["throwingPower", "throwingAccuracy", "awareness", "mobility"],
  RB: ["speed", "strength", "carrying", "agility"],
  WR: ["catching", "routeRunning", "speed", "release"],
  TE: ["catching", "routeRunning", "speed", "release"],
  OL: ["passBlock", "runBlock", "strength", "awareness"],
  DL: ["tackling", "strength", "blockShedding", "passRush"],
  LB: ["tackling", "strength", "blockShedding", "passRush"],
  CB: ["coverage", "speed", "tackling", "awareness"],
  S: ["coverage", "speed", "tackling", "awareness"],
  K: ["kickPower", "kickAccuracy"],
  P: ["kickPower", "kickAccuracy"],
};

describe("multiplayer player pool foundation seed", () => {
  it("builds at least 500 unassigned draft/free-agent players", () => {
    const documents = buildMultiplayerPlayerPoolSeedDocuments();

    expect(documents.players.length).toBeGreaterThanOrEqual(500);
    expect(documents.players).toHaveLength(504);
    expect(documents.players.every((player) => player.status === "free_agent")).toBe(true);
    expect(documents.draftState).toMatchObject({
      leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
      status: "not_started",
      startedAt: null,
      completedAt: null,
    });
  });

  it("keeps the expected position distribution", () => {
    const documents = buildMultiplayerPlayerPoolSeedDocuments();
    const summary = summarizeMultiplayerPlayerPool(documents.players);

    expect(summary.positions).toEqual(MULTIPLAYER_PLAYER_POSITION_TARGETS);
  });

  it("uses unique stable player IDs and names", () => {
    const documents = buildMultiplayerPlayerPoolSeedDocuments();
    const ids = documents.players.map((player) => player.playerId);
    const names = documents.players.map((player) => player.playerName);

    expect(new Set(ids).size).toBe(documents.players.length);
    expect(new Set(names).size).toBe(documents.players.length);
  });

  it("assigns valid ratings, potentials and balanced rating tiers", () => {
    const documents = buildMultiplayerPlayerPoolSeedDocuments();
    const summary = summarizeMultiplayerPlayerPool(documents.players);

    expect(documents.players.every((player) => player.overall >= 45 && player.overall <= 95)).toBe(true);
    expect(
      documents.players.every(
        (player) => player.potential >= player.overall && player.potential <= 98,
      ),
    ).toBe(true);
    expect(summary.ratings.elite).toBeLessThanOrEqual(12);
    expect(summary.ratings.stars).toBeGreaterThan(0);
    expect(summary.ratings.starters).toBeGreaterThanOrEqual(220);
    expect(summary.ratings.weakFreeAgents).toBeGreaterThan(0);
  });

  it("creates valid position-relevant attributes for every player", () => {
    const documents = buildMultiplayerPlayerPoolSeedDocuments();

    documents.players.forEach((player) => {
      const requiredAttributes = REQUIRED_ATTRIBUTES[player.position];

      expect(requiredAttributes).toBeDefined();
      expect(player.attributes).toBeDefined();

      requiredAttributes.forEach((attribute) => {
        const value = player.attributes?.[attribute];

        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(35);
        expect(value).toBeLessThanOrEqual(99);
      });
    });
  });

  it("has no team references and is reproducible", () => {
    const first = buildMultiplayerPlayerPoolSeedDocuments();
    const second = buildMultiplayerPlayerPoolSeedDocuments();

    expect(second).toEqual(first);
    expect(
      first.players.every((player) => !("teamId" in player) && !("assignedTeamId" in player)),
    ).toBe(true);
  });
});
