import { describe, expect, it } from "vitest";

import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
} from "@/lib/online/online-league-types";
import {
  createDraftPlayerMap,
  deriveAvailableDraftPlayers,
  deriveDraftOrderRows,
  deriveDraftRosterCounts,
  derivePickedDraftPlayers,
  deriveTeamDraftRoster,
} from "./online-fantasy-draft-room-model";

function player(
  playerId: string,
  position: string,
  overall: number,
  playerName = `Player ${playerId}`,
): OnlineContractPlayer {
  return {
    playerId,
    playerName,
    position,
    attributes: {},
    age: 24,
    overall,
    potential: overall + 3,
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

function pick(
  pickNumber: number,
  teamId: string,
  playerId: string,
): OnlineFantasyDraftPick {
  return {
    pickNumber,
    round: Math.ceil(pickNumber / 2),
    teamId,
    playerId,
    pickedByUserId: `${teamId}-gm`,
    timestamp: `2026-05-01T08:0${pickNumber}:00.000Z`,
  };
}

describe("online fantasy draft room model", () => {
  it("derives available players from current ids, position filter and sort direction", () => {
    const playerPool = [
      player("qb-b", "QB", 88, "Blake Arlen"),
      player("wr-a", "WR", 80, "Wes Arden"),
      player("rb-a", "RB", 91, "Rian Vale"),
      player("qb-a", "QB", 88, "Aaron Vale"),
    ];

    expect(
      deriveAvailableDraftPlayers({
        availablePlayerIds: ["qb-a", "qb-b", "wr-a"],
        playerPool,
        positionFilter: "QB",
        sortDirection: "desc",
      }).map((candidate) => candidate.playerId),
    ).toEqual(["qb-a", "qb-b"]);

    expect(
      deriveAvailableDraftPlayers({
        availablePlayerIds: ["qb-a", "qb-b", "wr-a"],
        playerPool,
        positionFilter: "ALL",
        sortDirection: "asc",
      }).map((candidate) => candidate.playerId),
    ).toEqual(["wr-a", "qb-a", "qb-b"]);
  });

  it("derives recent picked players, own roster and position counts without missing-player leakage", () => {
    const playersById = createDraftPlayerMap([
      player("qb-a", "QB", 88),
      player("wr-a", "WR", 81),
      player("rb-a", "RB", 77),
    ]);
    const picks = [
      pick(1, "team-a", "qb-a"),
      pick(2, "team-b", "wr-a"),
      pick(3, "team-a", "missing-player"),
      pick(4, "team-a", "rb-a"),
    ];

    expect(
      derivePickedDraftPlayers(picks, playersById).map((entry) => entry.player.playerId),
    ).toEqual(["rb-a", "wr-a", "qb-a"]);

    const ownRoster = deriveTeamDraftRoster(picks, "team-a", playersById);

    expect(ownRoster.map((candidate) => candidate.playerId)).toEqual(["qb-a", "rb-a"]);
    expect(deriveDraftRosterCounts(ownRoster)).toEqual(
      expect.arrayContaining([
        { position: "QB", count: 1, target: 2 },
        { position: "RB", count: 1, target: 3 },
        { position: "WR", count: 0, target: 5 },
      ]),
    );
  });

  it("derives pick order rows and marks the current team", () => {
    const rows = deriveDraftOrderRows({
      currentTeamId: "team-b",
      draftOrder: ["team-a", "team-b", "team-c"],
      teamNameById: new Map([
        ["team-a", "Zurich Guardians"],
        ["team-b", "Basel Rhinos"],
      ]),
    });

    expect(rows).toEqual([
      {
        index: 1,
        isCurrent: false,
        teamId: "team-a",
        teamName: "Zurich Guardians",
      },
      {
        index: 2,
        isCurrent: true,
        teamId: "team-b",
        teamName: "Basel Rhinos",
      },
      {
        index: 3,
        isCurrent: false,
        teamId: "team-c",
        teamName: "team-c",
      },
    ]);
  });
});
