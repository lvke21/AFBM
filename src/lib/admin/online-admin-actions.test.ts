import { describe, expect, it } from "vitest";

import {
  addFakeUserToOnlineLeague,
  makeOnlineFantasyDraftPick,
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  startOnlineFantasyDraft,
} from "@/lib/online/online-league-service";

import { LocalAdminMemoryStorage, type LocalAdminStateOutput } from "./local-admin-storage";
import {
  executeOnlineAdminAction,
  toOnlineAdminActionError,
} from "./online-admin-actions";

const actor = {
  adminSessionId: "firebase-admin-claim-test",
  adminUserId: "firebase-admin-test",
  source: "firebase-admin-claim" as const,
};

function completeFantasyDraftForLocalState(
  leagueId: string,
  localState: LocalAdminStateOutput,
): LocalAdminStateOutput {
  const storage = new LocalAdminMemoryStorage(localState);
  let league = startOnlineFantasyDraft(leagueId, storage);

  while (league?.fantasyDraft?.status === "active") {
    const draft = league.fantasyDraft;
    const playerPool = league.fantasyDraftPlayerPool ?? [];
    const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
    const currentTeamPicks = draft.picks.filter((pick) => pick.teamId === draft.currentTeamId);
    const neededPosition = ONLINE_FANTASY_DRAFT_POSITIONS.find((position) => {
      const count = currentTeamPicks.filter(
        (pick) => playersById.get(pick.playerId)?.position === position,
      ).length;

      return count < ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position];
    });
    const playerId =
      draft.availablePlayerIds.find(
        (candidate) => playersById.get(candidate)?.position === neededPosition,
      ) ?? draft.availablePlayerIds[0];
    const currentUser = league.users.find((user) => user.teamId === draft.currentTeamId);

    if (!playerId || !currentUser) {
      throw new Error("Expected a draftable player and current draft user.");
    }

    const result = makeOnlineFantasyDraftPick(
      league.id,
      draft.currentTeamId,
      playerId,
      currentUser.userId,
      storage,
    );

    if (result.status !== "success" && result.status !== "completed") {
      throw new Error(`Expected successful draft pick, received ${result.status}.`);
    }

    league = result.league;
  }

  return storage.toLocalState();
}

describe("online admin actions", () => {
  it("starts and controls the fantasy draft from admin actions", async () => {
    const created = await executeOnlineAdminAction(
      {
        action: "createLeague",
        backendMode: "local",
        name: "Admin Draft Control",
        maxUsers: 2,
        localState: {
          leaguesJson: "[]",
        },
      },
      actor,
    );
    const leagueId = created.league?.id;

    if (!leagueId || !created.localState) {
      throw new Error("Expected created admin draft league.");
    }

    const setupStorage = new LocalAdminMemoryStorage(created.localState);

    for (let index = 0; index < 2; index += 1) {
      addFakeUserToOnlineLeague(setupStorage);
    }

    const initialized = await executeOnlineAdminAction(
      {
        action: "initializeFantasyDraft",
        backendMode: "local",
        leagueId,
        localState: setupStorage.toLocalState(),
      },
      actor,
    );
    const started = await executeOnlineAdminAction(
      {
        action: "startFantasyDraft",
        backendMode: "local",
        leagueId,
        localState: initialized.localState,
      },
      actor,
    );

    if (!started.league) {
      throw new Error("Expected started draft league.");
    }

    expect(started.league?.fantasyDraft).toMatchObject({
      status: "active",
      round: 1,
      pickNumber: 1,
      currentTeamId: started.league.users[0].teamId,
    });

    const autoPicked = await executeOnlineAdminAction(
      {
        action: "autoDraftNextFantasyDraft",
        backendMode: "local",
        leagueId,
        localState: started.localState,
      },
      actor,
    );

    expect(autoPicked.league?.fantasyDraft?.picks).toHaveLength(1);
    expect(autoPicked.league?.fantasyDraft?.pickNumber).toBe(2);

    const completed = await executeOnlineAdminAction(
      {
        action: "autoDraftToEndFantasyDraft",
        backendMode: "local",
        leagueId,
        localState: autoPicked.localState,
      },
      actor,
    );

    expect(completed.league?.fantasyDraft?.status).toBe("completed");
    expect(completed.league?.status).toBe("active");
    expect(completed.league?.currentWeek).toBe(1);
    expect(completed.league?.weekStatus).toBe("ready");
    expect(completed.league?.users.every((user) => (user.contractRoster?.length ?? 0) > 0)).toBe(true);
  }, 15_000);

  it("requires an expected week for simulation requests", async () => {
    await expect(
      executeOnlineAdminAction(
        {
          action: "simulateWeek",
          backendMode: "local",
          leagueId: "league-alpha",
          localState: {
            leaguesJson: "[]",
          },
        },
        actor,
      ),
    ).rejects.toThrow("Simulationsziel fehlt");
  });

  it("blocks local week simulation until all active teams are ready", async () => {
    const created = await executeOnlineAdminAction(
      {
        action: "createLeague",
        backendMode: "local",
        name: "Admin Ready Gate",
        maxUsers: 2,
        localState: {
          leaguesJson: "[]",
        },
      },
      actor,
    );
    const leagueId = created.league?.id;

    if (!leagueId || !created.localState) {
      throw new Error("Expected created ready-gate league.");
    }

    const setupStorage = new LocalAdminMemoryStorage(created.localState);

    addFakeUserToOnlineLeague(setupStorage);
    addFakeUserToOnlineLeague(setupStorage);

    const draftCompletedState = completeFantasyDraftForLocalState(
      leagueId,
      setupStorage.toLocalState(),
    );
    const blocked = await executeOnlineAdminAction(
      {
        action: "simulateWeek",
        backendMode: "local",
        leagueId,
        localState: draftCompletedState,
        season: 1,
        week: 1,
      },
      actor,
    );

    expect(blocked.message).toBe(
      "Week-Simulation ist gesperrt, bis alle aktiven Teams ready sind.",
    );
    expect(blocked.league?.currentWeek).toBe(1);

    const ready = await executeOnlineAdminAction(
      {
        action: "setAllReady",
        backendMode: "local",
        leagueId,
        localState: blocked.localState,
      },
      actor,
    );
    const simulated = await executeOnlineAdminAction(
      {
        action: "simulateWeek",
        backendMode: "local",
        leagueId,
        localState: ready.localState,
        season: 1,
        week: 1,
      },
      actor,
    );

    expect(simulated.league?.currentWeek).toBe(2);
  });

  it("keeps repeated local simulation requests for the same expected week idempotent", async () => {
    const created = await executeOnlineAdminAction(
      {
        action: "createLeague",
        backendMode: "local",
        name: "Admin Idempotence League",
        maxUsers: 4,
        startWeek: 1,
        localState: {
          leaguesJson: "[]",
        },
      },
      actor,
    );
    const leagueId = created.league?.id;

    if (!leagueId || !created.localState) {
      throw new Error("Expected created local admin league.");
    }

    const setupStorage = new LocalAdminMemoryStorage(created.localState);

    for (let index = 0; index < 4; index += 1) {
      addFakeUserToOnlineLeague(setupStorage);
    }

    const draftCompletedState = completeFantasyDraftForLocalState(
      leagueId,
      setupStorage.toLocalState(),
    );
    const ready = await executeOnlineAdminAction(
      {
        action: "setAllReady",
        backendMode: "local",
        leagueId,
        localState: draftCompletedState,
      },
      actor,
    );

    const firstSimulation = await executeOnlineAdminAction(
      {
        action: "simulateWeek",
        backendMode: "local",
        leagueId,
        season: 1,
        week: 1,
        localState: ready.localState,
      },
      actor,
    );
    const repeatedSimulation = await executeOnlineAdminAction(
      {
        action: "simulateWeek",
        backendMode: "local",
        leagueId,
        season: 1,
        week: 1,
        localState: firstSimulation.localState,
      },
      actor,
    );

    expect(firstSimulation.league?.currentWeek).toBe(2);
    expect(firstSimulation.league?.weekStatus).toBe("pre_week");
    expect(repeatedSimulation.league?.currentWeek).toBe(2);
    expect(firstSimulation.league?.matchResults).toHaveLength(2);
    expect(firstSimulation.league?.matchResults?.[0]).toMatchObject({
      simulatedAt: expect.any(String),
      simulatedByUserId: actor.adminUserId,
    });
    expect(firstSimulation.league?.completedWeeks?.[0]).toMatchObject({
      weekKey: "s1-w1",
      season: 1,
      week: 1,
      status: "completed",
      resultMatchIds: firstSimulation.league?.matchResults?.map((result) => result.matchId),
      simulatedByUserId: actor.adminUserId,
      nextSeason: 1,
      nextWeek: 2,
    });
    expect(repeatedSimulation.league?.matchResults).toHaveLength(2);
    expect(repeatedSimulation.league?.matchResults).toEqual(firstSimulation.league?.matchResults);
    expect(repeatedSimulation.league?.completedWeeks).toEqual(firstSimulation.league?.completedWeeks);
    expect(repeatedSimulation.message).toBe("Die Woche wurde bereits weitergeschaltet.");
  });

  it("maps invalid admin action errors to client-safe responses", () => {
    const error = toOnlineAdminActionError(new Error("Boom")) as {
      code: string;
      message: string;
      status: number;
    };

    expect(error).toEqual({
      status: 500,
      code: "ADMIN_ACTION_FAILED",
      message: "Boom",
    });
  });
});
