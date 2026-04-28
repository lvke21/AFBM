import { describe, expect, it } from "vitest";

import { reviewTradeOffer, type TradeMarket, type TradePlayer } from "./trade-model";

const teams = [
  {
    id: "manager",
    name: "Manager Team",
    abbreviation: "MAN",
    managerControlled: true,
    salaryCapSpace: 10_000_000,
    activeRosterCount: 50,
    activeRosterLimit: 53,
    needs: [{ positionCode: "CB", needScore: 8 }],
  },
  {
    id: "cpu",
    name: "CPU Team",
    abbreviation: "CPU",
    managerControlled: false,
    salaryCapSpace: 10_000_000,
    activeRosterCount: 50,
    activeRosterLimit: 53,
    needs: [{ positionCode: "WR", needScore: 9 }],
  },
];

function player(overrides: Partial<TradePlayer>): TradePlayer {
  return {
    id: "player",
    fullName: "Player",
    age: 25,
    teamId: "manager",
    teamName: "Manager Team",
    teamAbbreviation: "MAN",
    positionCode: "WR",
    rosterStatus: "BACKUP",
    depthChartSlot: null,
    positionOverall: 75,
    potentialRating: 78,
    schemeFitScore: 70,
    capHit: 6_000_000,
    ...overrides,
  };
}

describe("trade model", () => {
  it("rejects invalid trade kinds before evaluating players or cap", () => {
    const market: TradeMarket = {
      managerTeamId: "manager",
      teams,
      players: [],
    };

    const review = reviewTradeOffer(market, {
      kind: "invalid-kind" as never,
      managerPlayerId: null,
      targetPlayerId: null,
    });

    expect(review.status).toBe("Rejected");
    expect(review.reasons).toContain("Trade-Typ ist ungueltig.");
  });

  it("accepts a fair player-for-player offer with CPU need", () => {
    const market: TradeMarket = {
      managerTeamId: "manager",
      teams,
      players: [
        player({ id: "send", fullName: "Send WR" }),
        player({
          id: "target",
          fullName: "Target CB",
          teamId: "cpu",
          teamName: "CPU Team",
          teamAbbreviation: "CPU",
          positionCode: "CB",
          positionOverall: 74,
          capHit: 5_500_000,
        }),
      ],
    };

    expect(
      reviewTradeOffer(market, {
        kind: "player-player",
        managerPlayerId: "send",
        targetPlayerId: "target",
      }).status,
    ).toBe("Accepted");
  });

  it("rejects cap violations", () => {
    const market: TradeMarket = {
      managerTeamId: "manager",
      teams: [{ ...teams[0], salaryCapSpace: 1_000_000 }, teams[1]],
      players: [
        player({ id: "send", capHit: 1_000_000 }),
        player({
          id: "target",
          teamId: "cpu",
          teamName: "CPU Team",
          teamAbbreviation: "CPU",
          positionCode: "CB",
          capHit: 10_000_000,
        }),
      ],
    };

    const review = reviewTradeOffer(market, {
      kind: "player-player",
      managerPlayerId: "send",
      targetPlayerId: "target",
    });

    expect(review.status).toBe("Rejected");
    expect(review.reasons).toContain("Manager-Team verletzt den Cap.");
  });

  it("normalizes invalid cap hits before cap validation", () => {
    const market: TradeMarket = {
      managerTeamId: "manager",
      teams: [{ ...teams[0], salaryCapSpace: 1_000_000 }, teams[1]],
      players: [
        player({ id: "send", capHit: Number.NaN }),
        player({
          id: "target",
          teamId: "cpu",
          teamName: "CPU Team",
          teamAbbreviation: "CPU",
          positionCode: "CB",
          capHit: 2_000_000,
        }),
      ],
    };

    const review = reviewTradeOffer(market, {
      kind: "player-player",
      managerPlayerId: "send",
      targetPlayerId: "target",
    });

    expect(review.capDeltaManager).toBe(-2_000_000);
    expect(review.status).toBe("Rejected");
    expect(review.reasons).toContain("Manager-Team verletzt den Cap.");
  });

  it("enforces roster limits for future value offers", () => {
    const market: TradeMarket = {
      managerTeamId: "manager",
      teams: [teams[0], { ...teams[1], activeRosterCount: 53 }],
      players: [player({ id: "send" })],
    };

    const review = reviewTradeOffer(market, {
      kind: "send-for-future",
      managerPlayerId: "send",
      partnerTeamId: "cpu",
      targetPlayerId: null,
    });

    expect(review.status).toBe("Rejected");
    expect(review.reasons).toContain("CPU-Team ueberschreitet das aktive Roster-Limit.");
  });
});
