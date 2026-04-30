import { describe, expect, it } from "vitest";

import {
  acceptOnlineTradeProposal,
  createOnlineLeague,
  createOnlineTradeProposal,
  joinOnlineLeague,
  saveOnlineLeague,
  type OnlineLeague,
  type OnlineLeagueUser,
  type OnlineContractPlayer,
  type OnlineDraftPick,
  type SalaryCap,
} from "./online-league-service";
import type { TeamIdentitySelection } from "./team-identity-options";

class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }

  removeItem(key: string) {
    this.items.delete(key);
  }
}

type TradeTestUser = OnlineLeagueUser & {
  contractRoster: OnlineContractPlayer[];
  draftPicks: OnlineDraftPick[];
  salaryCap: SalaryCap;
};

const BERLIN_WOLVES: TeamIdentitySelection = {
  cityId: "berlin",
  category: "aggressive_competitive",
  teamNameId: "wolves",
};

const ZURICH_FORGE: TeamIdentitySelection = {
  cityId: "zurich",
  category: "identity_city",
  teamNameId: "forge",
};

function createTwoTeamLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Trade League" }, storage);
  const firstJoin = joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  );

  return joinOnlineLeague(
    firstJoin.league.id,
    { userId: "user-2", username: "Coach_5678" },
    ZURICH_FORGE,
    storage,
  ).league;
}

function getUser(league: OnlineLeague, userId: string): TradeTestUser {
  const user = league.users.find((candidate) => candidate.userId === userId);

  if (!user?.contractRoster || !user.draftPicks || !user.salaryCap) {
    throw new Error(`Expected complete trade user ${userId}`);
  }

  return user as TradeTestUser;
}

function getFirstActivePlayer(user: TradeTestUser) {
  const player = user.contractRoster.find((candidate) => candidate.status === "active");

  if (!player) {
    throw new Error("Expected active player");
  }

  return player;
}

describe("online trade system", () => {
  it("moves players and draft picks correctly when a trade is accepted", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamLeague(storage);
    const fromUser = getUser(league, "user-1");
    const toUser = getUser(league, "user-2");
    const offeredPlayer = getFirstActivePlayer(fromUser);
    const requestedPlayer = getFirstActivePlayer(toUser);
    const offeredPick = fromUser.draftPicks[0];

    if (!offeredPick) {
      throw new Error("Expected draft pick");
    }

    const proposal = createOnlineTradeProposal(
      league.id,
      fromUser.userId,
      {
        toUserId: toUser.userId,
        playersOffered: [offeredPlayer.playerId],
        playersRequested: [requestedPlayer.playerId],
        picksOffered: [offeredPick.pickId],
      },
      storage,
    );

    expect(proposal.status).toBe("success");

    const accepted = acceptOnlineTradeProposal(
      league.id,
      proposal.status === "success" ? proposal.trade.tradeId : "",
      toUser.userId,
      storage,
    );
    const nextFromUser = getUser(accepted.league as OnlineLeague, "user-1");
    const nextToUser = getUser(accepted.league as OnlineLeague, "user-2");

    expect(accepted.status).toBe("success");
    expect(nextFromUser.contractRoster.some((player) => player.playerId === requestedPlayer.playerId)).toBe(true);
    expect(nextToUser.contractRoster.some((player) => player.playerId === offeredPlayer.playerId)).toBe(true);
    expect(nextToUser.draftPicks.some((pick) => pick.pickId === offeredPick.pickId && pick.currentTeamId === nextToUser.teamId)).toBe(true);
  });

  it("keeps salary caps valid after an accepted trade", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamLeague(storage);
    const fromUser = getUser(league, "user-1");
    const toUser = getUser(league, "user-2");
    const proposal = createOnlineTradeProposal(
      league.id,
      fromUser.userId,
      {
        toUserId: toUser.userId,
        playersOffered: [getFirstActivePlayer(fromUser).playerId],
        playersRequested: [getFirstActivePlayer(toUser).playerId],
      },
      storage,
    );

    const accepted = acceptOnlineTradeProposal(
      league.id,
      proposal.status === "success" ? proposal.trade.tradeId : "",
      toUser.userId,
      storage,
    );
    const nextFromUser = getUser(accepted.league as OnlineLeague, "user-1");
    const nextToUser = getUser(accepted.league as OnlineLeague, "user-2");

    expect(nextFromUser.salaryCap.currentCapUsage).toBeLessThanOrEqual(nextFromUser.salaryCap.capLimit);
    expect(nextToUser.salaryCap.currentCapUsage).toBeLessThanOrEqual(nextToUser.salaryCap.capLimit);
  });

  it("blocks trades that would break the salary cap", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamLeague(storage);
    const fromUser = getUser(league, "user-1");
    const toUser = getUser(league, "user-2");
    const expensivePlayer = fromUser.contractRoster[0];
    const cheapPlayer = toUser.contractRoster[toUser.contractRoster.length - 1];

    if (!expensivePlayer || !cheapPlayer) {
      throw new Error("Expected trade players");
    }

    saveOnlineLeague(
      {
        ...league,
        users: league.users.map((user) =>
          user.userId === toUser.userId
            ? {
                ...user,
                salaryCap: {
                  ...toUser.salaryCap,
                  capLimit: toUser.salaryCap.currentCapUsage + 1_000_000,
                },
              }
            : user,
        ),
      },
      storage,
    );
    const proposal = createOnlineTradeProposal(
      league.id,
      fromUser.userId,
      {
        toUserId: toUser.userId,
        playersOffered: [expensivePlayer.playerId],
        playersRequested: [cheapPlayer.playerId],
      },
      storage,
    );
    const accepted = acceptOnlineTradeProposal(
      league.id,
      proposal.status === "success" ? proposal.trade.tradeId : "",
      toUser.userId,
      storage,
    );

    expect(accepted.status).toBe("blocked");
    expect(accepted.message).toContain("Salary Cap");
  });

  it("does not execute the same trade twice", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamLeague(storage);
    const fromUser = getUser(league, "user-1");
    const toUser = getUser(league, "user-2");
    const proposal = createOnlineTradeProposal(
      league.id,
      fromUser.userId,
      {
        toUserId: toUser.userId,
        playersOffered: [getFirstActivePlayer(fromUser).playerId],
        playersRequested: [getFirstActivePlayer(toUser).playerId],
      },
      storage,
    );
    const tradeId = proposal.status === "success" ? proposal.trade.tradeId : "";

    const firstAccept = acceptOnlineTradeProposal(league.id, tradeId, toUser.userId, storage);
    const secondAccept = acceptOnlineTradeProposal(league.id, tradeId, toUser.userId, storage);

    expect(firstAccept.status).toBe("success");
    expect(secondAccept.status).toBe("blocked");
    expect(secondAccept.league?.tradeHistory).toHaveLength(1);
  });
});
