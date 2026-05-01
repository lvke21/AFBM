import { describe, expect, it } from "vitest";

import {
  buildMultiplayerTestLeagueSeedDocuments,
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_NAME,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
  MULTIPLAYER_TEST_LEAGUE_TEAMS,
} from "./multiplayer-test-league-firestore-seed";

describe("multiplayer test league foundation seed", () => {
  it("builds exactly one draft-ready multiplayer test league", () => {
    const documents = buildMultiplayerTestLeagueSeedDocuments();

    expect(documents.league).toMatchObject({
      id: MULTIPLAYER_TEST_LEAGUE_ID,
      name: MULTIPLAYER_TEST_LEAGUE_NAME,
      status: "lobby",
      currentSeason: 1,
      currentWeek: 1,
      maxTeams: 8,
      memberCount: 0,
      weekStatus: "pre_week",
      settings: {
        slug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        foundationStatus: "draft_ready",
        playersSeeded: false,
        draftExecuted: false,
      },
    });
  });

  it("builds exactly 8 empty teams assigned to the league seed", () => {
    const documents = buildMultiplayerTestLeagueSeedDocuments();

    expect(documents.teams).toHaveLength(8);
    expect(documents.teams.map((team) => team.id)).toEqual(
      MULTIPLAYER_TEST_LEAGUE_TEAMS.map((team) => team.id),
    );
    expect(documents.teams.every((team) => team.status === "available")).toBe(true);
    expect(documents.teams.every((team) => team.assignedUserId === null)).toBe(true);
    expect(documents.teams.every((team) => team.contractRoster?.length === 0)).toBe(true);
    expect(documents.teams.every((team) => team.depthChart?.length === 0)).toBe(true);
  });

  it("uses unique stable team IDs and abbreviations", () => {
    const documents = buildMultiplayerTestLeagueSeedDocuments();
    const teamIds = documents.teams.map((team) => team.id);
    const abbreviations = documents.teams.map((team) => {
      const sourceTeam = MULTIPLAYER_TEST_LEAGUE_TEAMS.find((candidate) => candidate.id === team.id);

      return sourceTeam?.abbreviation;
    });

    expect(new Set(teamIds).size).toBe(8);
    expect(new Set(abbreviations).size).toBe(8);
    expect(abbreviations).toEqual(["ZUR", "BAS", "GEN", "BER", "LAU", "WIN", "STG", "LUC"]);
  });

  it("keeps teams scoped under the stable league document path", () => {
    const documents = buildMultiplayerTestLeagueSeedDocuments();
    const teamPaths = documents.teams.map(
      (team) => `leagues/${documents.league.id}/teams/${team.id}`,
    );

    expect(documents.league.id).toBe(MULTIPLAYER_TEST_LEAGUE_ID);
    expect(teamPaths).toHaveLength(8);
    expect(teamPaths.every((path) => path.startsWith("leagues/afbm-multiplayer-test-league/teams/"))).toBe(true);
  });

  it("is deterministic and idempotent for repeated builds", () => {
    const first = buildMultiplayerTestLeagueSeedDocuments();
    const second = buildMultiplayerTestLeagueSeedDocuments();

    expect(second).toEqual(first);
  });
});
