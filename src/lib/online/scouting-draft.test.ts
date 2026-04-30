import { describe, expect, it } from "vitest";

import {
  createOnlineLeague,
  getOnlineLeagueProspectsForDisplay,
  joinOnlineLeague,
  makeOnlineDraftPick,
  scoutOnlineProspect,
  type OnlineLeague,
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

const ZURICH_FORGE: TeamIdentitySelection = {
  cityId: "zurich",
  category: "identity_city",
  teamNameId: "forge",
};

function createJoinedLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Scouting League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

function createTwoTeamLeague(storage: MemoryStorage) {
  const league = createJoinedLeague(storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-2", username: "Coach_5678" },
    ZURICH_FORGE,
    storage,
  ).league;
}

function getFirstProspect(league: OnlineLeague) {
  const prospect = getOnlineLeagueProspectsForDisplay(league).find(
    (candidate) => candidate.status === "available",
  );

  if (!prospect) {
    throw new Error("Expected available prospect");
  }

  return prospect;
}

describe("online scouting and draft system", () => {
  it("improves scouting accuracy and moves the scouted rating closer to the true rating", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const prospect = getFirstProspect(league);
    const previousError = Math.abs(prospect.scoutedRating - prospect.trueRating);

    const result = scoutOnlineProspect(
      league.id,
      "user-1",
      prospect.prospectId,
      storage,
    );

    expect(result.status).toBe("success");

    if (result.status !== "success") {
      throw new Error("Expected scouting success");
    }

    const nextError = Math.abs(result.prospect.scoutedRating - result.prospect.trueRating);

    expect(result.prospect.scoutingAccuracy).toBeGreaterThan(prospect.scoutingAccuracy);
    expect(nextError).toBeLessThanOrEqual(previousError);
    expect(result.prospect.scoutedByTeamIds).toContain("berlin-wolves");
  });

  it("creates a new player when a prospect is drafted", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const prospect = getFirstProspect(league);

    const result = makeOnlineDraftPick(
      league.id,
      "user-1",
      prospect.prospectId,
      storage,
    );

    expect(result.status).toBe("success");

    if (result.status !== "success") {
      throw new Error("Expected draft success");
    }

    const leagueUser = result.league.users.find((user) => user.userId === "user-1");

    expect(result.player.playerName).toBe(prospect.playerName);
    expect(result.player.overall).toBe(prospect.trueRating);
    expect(result.prospect.status).toBe("drafted");
    expect(result.league.draftHistory).toHaveLength(1);
    expect(
      leagueUser?.contractRoster?.some(
        (player) => player.playerId === result.player.playerId,
      ),
    ).toBe(true);
  });

  it("blocks a draft pick when another team is on the clock", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamLeague(storage);
    const prospect = getFirstProspect(league);

    const result = makeOnlineDraftPick(
      league.id,
      "user-2",
      prospect.prospectId,
      storage,
    );

    expect(result.status).toBe("blocked");
    expect(result.message).toBe("Dieses Team ist aktuell nicht am Zug.");
  });

  it("does not allow the same prospect to be drafted twice", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const prospect = getFirstProspect(league);

    const firstResult = makeOnlineDraftPick(
      league.id,
      "user-1",
      prospect.prospectId,
      storage,
    );
    const secondResult = makeOnlineDraftPick(
      league.id,
      "user-1",
      prospect.prospectId,
      storage,
    );

    expect(firstResult.status).toBe("success");
    expect(secondResult.status).toBe("blocked");
    expect(secondResult.message).toBe("Dieser Prospect ist nicht mehr verfügbar.");
  });
});
