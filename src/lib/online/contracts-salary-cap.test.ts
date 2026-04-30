import { describe, expect, it } from "vitest";

import {
  advanceOnlineContractsOneYear,
  createOnlineLeague,
  extendOnlinePlayerContract,
  joinOnlineLeague,
  releaseOnlinePlayer,
  saveOnlineLeague,
  signOnlineFreeAgent,
  type OnlineLeague,
  type OnlineLeagueUser,
  type OnlineContractPlayer,
  type PlayerContract,
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

const BERLIN_WOLVES: TeamIdentitySelection = {
  cityId: "berlin",
  category: "aggressive_competitive",
  teamNameId: "wolves",
};

type ContractLeagueUser = OnlineLeagueUser & {
  contractRoster: OnlineContractPlayer[];
  salaryCap: SalaryCap;
};

function createJoinedLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Contract League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

function getUser(league: OnlineLeague): ContractLeagueUser {
  const user = league.users[0];

  if (!user?.contractRoster || !user.salaryCap) {
    throw new Error("Expected user with contract roster and salary cap");
  }

  return user as ContractLeagueUser;
}

function getFirstActivePlayer(league: OnlineLeague) {
  const player = getUser(league).contractRoster?.find(
    (candidate) => candidate.status === "active",
  );

  if (!player) {
    throw new Error("Expected active contract player");
  }

  return player;
}

function contract(
  overrides: Partial<PlayerContract> = {},
): PlayerContract {
  const salaryPerYear = overrides.salaryPerYear ?? 5_000_000;
  const yearsRemaining = overrides.yearsRemaining ?? 2;
  const guaranteedMoney = overrides.guaranteedMoney ?? 2_000_000;
  const signingBonus = overrides.signingBonus ?? 500_000;

  return {
    salaryPerYear,
    yearsRemaining,
    totalValue: overrides.totalValue ?? salaryPerYear * yearsRemaining + signingBonus,
    guaranteedMoney,
    signingBonus,
    contractType: overrides.contractType ?? "regular",
    capHitPerYear:
      overrides.capHitPerYear ?? Math.round(salaryPerYear + signingBonus / yearsRemaining),
    deadCapPerYear:
      overrides.deadCapPerYear ?? Math.round((guaranteedMoney + signingBonus) / yearsRemaining),
  };
}

describe("online contracts and salary cap", () => {
  it("calculates salary cap usage from active contracts and dead cap", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const user = getUser(league);
    const activeSalary = user.contractRoster
      .filter((player) => player.status === "active")
      .reduce((sum, player) => sum + player.contract.capHitPerYear, 0);

    expect(user.salaryCap).toMatchObject({
      capLimit: 200_000_000,
      activeSalary,
      currentCapUsage: activeSalary,
      deadCap: 0,
      availableCap: 200_000_000 - activeSalary,
    });
  });

  it("extends a player contract when cap remains valid", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const player = getFirstActivePlayer(league);
    const yearsRemaining = player.contract.yearsRemaining + 1;
    const extension: PlayerContract = contract({
      salaryPerYear: player.contract.salaryPerYear,
      yearsRemaining,
      totalValue: player.contract.salaryPerYear * yearsRemaining + player.contract.signingBonus,
      guaranteedMoney: player.contract.guaranteedMoney,
      signingBonus: player.contract.signingBonus,
      contractType: player.contract.contractType,
    });

    const result = extendOnlinePlayerContract(
      league.id,
      "user-1",
      player.playerId,
      extension,
      storage,
    );

    expect(result.status).toBe("success");
    expect(result.league?.users[0]?.contractRoster?.find(
      (candidate) => candidate.playerId === player.playerId,
    )?.contract.yearsRemaining).toBe(player.contract.yearsRemaining + 1);
  });

  it("creates dead cap when releasing a player", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const player = getFirstActivePlayer(league);

    const result = releaseOnlinePlayer(league.id, "user-1", player.playerId, storage);
    const releasedPlayer = result.league?.users[0]?.contractRoster?.find(
      (candidate) => candidate.playerId === player.playerId,
    );

    expect(result.status).toBe("success");
    expect(releasedPlayer?.status).toBe("released");
    expect(result.league?.users[0]?.salaryCap?.deadCap).toBe(player.contract.deadCapPerYear);
  });

  it("keeps dead cap on the books after a contract year advances", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const player = getFirstActivePlayer(league);
    const released = releaseOnlinePlayer(league.id, "user-1", player.playerId, storage);

    if (released.status !== "success") {
      throw new Error("Expected released player");
    }

    const advancedLeague = advanceOnlineContractsOneYear(released.league.id, storage);

    expect(advancedLeague?.users[0]?.salaryCap?.deadCap).toBeGreaterThan(0);
    expect(advancedLeague?.users[0]?.contractRoster?.find(
      (candidate) => candidate.playerId === player.playerId,
    )?.status).toBe("released");
  });

  it("blocks free agent signing when it would exceed the cap", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const user = getUser(league);
    const savedLeague = saveOnlineLeague(
      {
        ...league,
        users: [
          {
            ...user,
            salaryCap: {
              ...user.salaryCap,
              capLimit: user.salaryCap.currentCapUsage + 1_000_000,
            },
          },
        ],
      },
      storage,
    );
    const freeAgentId = savedLeague.freeAgents?.[0]?.playerId;

    if (!freeAgentId) {
      throw new Error("Expected free agent");
    }

    const result = signOnlineFreeAgent(
      savedLeague.id,
      "user-1",
      freeAgentId,
      undefined,
      storage,
    );

    expect(result.status).toBe("blocked");
    expect(result.league?.users[0]?.contractRoster).toHaveLength(user.contractRoster.length);
  });

  it("signs a free agent when cap space is available", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const freeAgent = league.freeAgents?.[0];

    if (!freeAgent) {
      throw new Error("Expected free agent");
    }

    const result = signOnlineFreeAgent(
      league.id,
      "user-1",
      freeAgent.playerId,
      undefined,
      storage,
    );

    expect(result.status).toBe("success");
    expect(result.league?.users[0]?.contractRoster?.some(
      (player) => player.playerId === freeAgent.playerId,
    )).toBe(true);
    expect(result.league?.freeAgents?.some(
      (player) => player.playerId === freeAgent.playerId,
    )).toBe(false);
  });

  it("keeps star contracts inside the intended cap percentage band", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const user = getUser(league);
    const starPlayer = user.contractRoster.find(
      (player) => player.contract.contractType === "star",
    );

    if (!starPlayer) {
      throw new Error("Expected star contract");
    }

    const capShare = starPlayer.contract.capHitPerYear / user.salaryCap.capLimit;

    expect(capShare).toBeGreaterThanOrEqual(0.15);
    expect(capShare).toBeLessThanOrEqual(0.25);
  });

  it("moves expired contracts to free agency when a contract year advances", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const user = getUser(league);
    const expiringPlayer = getFirstActivePlayer(league);
    const savedLeague = saveOnlineLeague(
      {
        ...league,
        users: [
          {
            ...user,
            contractRoster: user.contractRoster.map((player) =>
              player.playerId === expiringPlayer.playerId
                ? {
                    ...player,
                    contract: {
                      ...player.contract,
                      yearsRemaining: 1,
                    },
                  }
                : player,
            ),
          },
        ],
      },
      storage,
    );

    const updatedLeague = advanceOnlineContractsOneYear(savedLeague.id, storage);

    expect(updatedLeague?.users[0]?.contractRoster?.some(
      (player) => player.playerId === expiringPlayer.playerId,
    )).toBe(false);
    expect(updatedLeague?.freeAgents?.some(
      (player) => player.playerId === expiringPlayer.playerId,
    )).toBe(true);
  });
});
