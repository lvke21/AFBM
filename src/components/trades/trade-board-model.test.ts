import { describe, expect, it } from "vitest";

import type { TradeMarket, TradePlayer, TradeTeam } from "./trade-model";
import {
  buildTradeBoardState,
  estimateTradeBoardBalance,
  getTradeBoardTargetsForTeam,
} from "./trade-board-model";

const teams: TradeTeam[] = [
  {
    abbreviation: "MAN",
    activeRosterCount: 50,
    activeRosterLimit: 53,
    id: "manager",
    managerControlled: true,
    name: "Manager Team",
    needs: [{ needScore: 8, positionCode: "CB" }],
    salaryCapSpace: 10_000_000,
  },
  {
    abbreviation: "CPU",
    activeRosterCount: 50,
    activeRosterLimit: 53,
    id: "cpu",
    managerControlled: false,
    name: "CPU Team",
    needs: [],
    salaryCapSpace: 8_000_000,
  },
  {
    abbreviation: "ALT",
    activeRosterCount: 50,
    activeRosterLimit: 53,
    id: "alt",
    managerControlled: false,
    name: "Alt Team",
    needs: [],
    salaryCapSpace: 12_000_000,
  },
];

function player(overrides: Partial<TradePlayer>): TradePlayer {
  return {
    age: 25,
    capHit: 4_000_000,
    depthChartSlot: null,
    fullName: "Player",
    id: "player",
    positionCode: "WR",
    positionOverall: 72,
    potentialRating: 76,
    rosterStatus: "BACKUP",
    schemeFitScore: 60,
    teamAbbreviation: "MAN",
    teamId: "manager",
    teamName: "Manager Team",
    ...overrides,
  };
}

describe("trade board model", () => {
  it("splits own players, partner teams and targets without executing trade review", () => {
    const market: TradeMarket = {
      managerTeamId: "manager",
      players: [
        player({ id: "own-low", fullName: "Own Low", positionOverall: 70 }),
        player({ id: "own-high", fullName: "Own High", positionOverall: 82 }),
        player({
          fullName: "Target CB",
          id: "target-cb",
          positionCode: "CB",
          positionOverall: 79,
          teamAbbreviation: "CPU",
          teamId: "cpu",
          teamName: "CPU Team",
        }),
      ],
      teams,
    };

    const state = buildTradeBoardState(market);

    expect(state.hasTradePool).toBe(true);
    expect(state.ownPlayers.map((tradePlayer) => tradePlayer.id)).toEqual([
      "own-high",
      "own-low",
    ]);
    expect(state.targetPlayers.map((tradePlayer) => tradePlayer.id)).toEqual(["target-cb"]);
    expect(state.targetPlayers[0]?.managerNeedScore).toBe(8);
    expect(state.targetPlayers[0]?.decisionSummary).toMatchObject({
      label: "Need Fit",
      tone: "positive",
    });
    expect(state.defaultOwnPlayerId).toBe("own-high");
    expect(state.defaultTargetPlayerId).toBe("target-cb");
    expect(state.partnerTeams.map((team) => team.id)).toEqual(["alt", "cpu"]);
  });

  it("filters target players by partner team", () => {
    const state = buildTradeBoardState({
      managerTeamId: "manager",
      players: [
        player({ id: "own" }),
        player({ id: "target-cpu", teamAbbreviation: "CPU", teamId: "cpu" }),
        player({ id: "target-alt", teamAbbreviation: "ALT", teamId: "alt" }),
      ],
      teams,
    });

    expect(getTradeBoardTargetsForTeam(state, "cpu").map((tradePlayer) => tradePlayer.id)).toEqual([
      "target-cpu",
    ]);
    expect(getTradeBoardTargetsForTeam(state, "ALL").map((tradePlayer) => tradePlayer.id)).toEqual([
      "target-cpu",
      "target-alt",
    ]);
  });

  it("returns a stable empty state when targets are missing", () => {
    const state = buildTradeBoardState({
      managerTeamId: "manager",
      players: [player({ id: "own" })],
      teams,
    });

    expect(state.hasTradePool).toBe(false);
    expect(state.defaultTargetPlayerId).toBeNull();
    expect(state.emptyMessage).toContain("mindestens ein CPU-Team");
  });

  it("estimates rough trade balance from selected player value and cap", () => {
    const state = buildTradeBoardState({
      managerTeamId: "manager",
      players: [
        player({ id: "own", positionOverall: 78, potentialRating: 78 }),
        player({
          id: "target",
          positionOverall: 79,
          potentialRating: 80,
          teamAbbreviation: "CPU",
          teamId: "cpu",
          teamName: "CPU Team",
        }),
      ],
      teams,
    });

    const balance = estimateTradeBoardBalance({
      managerTeam: state.managerTeam,
      ownPlayers: [state.ownPlayers[0]!],
      targetPlayers: [state.targetPlayers[0]!],
    });

    expect(balance.label).toBe("Fairer Trade (grob)");
    expect(balance.outgoingValue).toBeGreaterThan(0);
    expect(balance.incomingValue).toBeGreaterThan(0);
  });

  it("flags incomplete, unequal and cap-risk sketches without executing trade logic", () => {
    const limitedCapTeams = teams.map((team) =>
      team.id === "manager" ? { ...team, salaryCapSpace: 1_000_000 } : team,
    );
    const state = buildTradeBoardState({
      managerTeamId: "manager",
      players: [
        player({ id: "own-low", capHit: 1_000_000, positionOverall: 60, potentialRating: 60 }),
        player({
          capHit: 8_000_000,
          id: "target-star",
          positionOverall: 88,
          potentialRating: 90,
          teamAbbreviation: "CPU",
          teamId: "cpu",
          teamName: "CPU Team",
        }),
      ],
      teams: limitedCapTeams,
    });

    expect(
      estimateTradeBoardBalance({
        managerTeam: state.managerTeam,
        ownPlayers: [],
        targetPlayers: [state.targetPlayers[0]!],
      }).label,
    ).toBe("Auswahl unvollstaendig");
    expect(
      estimateTradeBoardBalance({
        managerTeam: { ...state.managerTeam!, salaryCapSpace: 20_000_000 },
        ownPlayers: [state.ownPlayers[0]!],
        targetPlayers: [state.targetPlayers[0]!],
      }).label,
    ).toBe("Ungleiches Angebot");
    expect(
      estimateTradeBoardBalance({
        managerTeam: state.managerTeam,
        ownPlayers: [state.ownPlayers[0]!],
        targetPlayers: [state.targetPlayers[0]!],
      }).label,
    ).toBe("Cap-Risiko");
  });
});
