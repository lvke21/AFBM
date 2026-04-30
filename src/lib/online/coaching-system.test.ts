import { describe, expect, it } from "vitest";

import {
  createOnlineLeague,
  fireOnlineCoach,
  generateOnlineTrainingOutcome,
  getAvailableOnlineCoaches,
  hireOnlineCoach,
  joinOnlineLeague,
  submitWeeklyTrainingPlan,
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

const DEVELOPMENT_PLAN = {
  intensity: "normal" as const,
  primaryFocus: "player_development" as const,
  riskTolerance: "medium" as const,
  youngPlayerPriority: 90,
  veteranMaintenance: 50,
};

function createJoinedLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Coaching League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

function submitPlan(league: OnlineLeague, storage: MemoryStorage) {
  const result = submitWeeklyTrainingPlan(
    league.id,
    "user-1",
    DEVELOPMENT_PLAN,
    storage,
  );

  if (result.status !== "submitted") {
    throw new Error("Expected submitted training plan");
  }

  return result.league;
}

function getOutcome(league: OnlineLeague | null) {
  const outcome = league?.users[0]?.trainingOutcomes?.[0];

  if (!outcome) {
    throw new Error("Expected training outcome");
  }

  return outcome;
}

function getDevelopmentCoachId(league: OnlineLeague) {
  const coach = getAvailableOnlineCoaches(league).find(
    (candidate) => candidate.role === "development_coach",
  );

  if (!coach) {
    throw new Error("Expected available development coach");
  }

  return coach.coachId;
}

describe("online coaching system", () => {
  it("lets a hired development coach improve training outcomes", () => {
    const interimStorage = new MemoryStorage();
    const hiredStorage = new MemoryStorage();
    const interimLeague = createJoinedLeague(interimStorage);
    const hiredLeague = createJoinedLeague(hiredStorage);

    fireOnlineCoach(
      interimLeague.id,
      "user-1",
      "development_coach",
      interimStorage,
    );
    const hired = hireOnlineCoach(
      hiredLeague.id,
      "user-1",
      getDevelopmentCoachId(hiredLeague),
      hiredStorage,
    );

    expect(hired.status).toBe("success");

    const interimPlanned = submitPlan(interimLeague, interimStorage);
    const hiredPlanned = submitPlan(hired.league as OnlineLeague, hiredStorage);
    const interimOutcome = getOutcome(
      generateOnlineTrainingOutcome(interimPlanned.id, "user-1", interimStorage),
    );
    const hiredOutcome = getOutcome(
      generateOnlineTrainingOutcome(hiredPlanned.id, "user-1", hiredStorage),
    );

    expect(hiredOutcome.coachExecutionRating).toBeGreaterThan(
      interimOutcome.coachExecutionRating,
    );
    expect(hiredOutcome.developmentDeltaSummary).toBeGreaterThan(
      interimOutcome.developmentDeltaSummary,
    );
  });

  it("hires and fires coaches while updating staff, market and history", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const coachId = getDevelopmentCoachId(league);
    const hired = hireOnlineCoach(league.id, "user-1", coachId, storage);

    expect(hired.status).toBe("success");

    if (hired.status !== "success") {
      throw new Error("Expected hired coach");
    }

    const hiredUser = hired.league.users[0];

    expect(hiredUser?.coachingStaffProfile?.developmentCoachName).toBe(
      hired.coach.name,
    );
    expect(getAvailableOnlineCoaches(hired.league).some((coach) => coach.coachId === coachId)).toBe(false);
    expect(hired.league.coachHistory?.[0]).toMatchObject({
      action: "hired",
      coachId,
      role: "development_coach",
    });

    const fired = fireOnlineCoach(
      hired.league.id,
      "user-1",
      "development_coach",
      storage,
    );

    expect(fired.status).toBe("success");

    if (fired.status !== "success") {
      throw new Error("Expected fired coach");
    }

    const firedUser = fired.league.users[0];

    expect(firedUser?.coachingStaffProfile?.developmentCoachName).toBe(
      "Interim Development Coach",
    );
    expect(
      getAvailableOnlineCoaches(fired.league).some(
        (coach) => coach.name === hired.coach.name,
      ),
    ).toBe(true);
    expect(fired.league.coachHistory?.[0]).toMatchObject({
      action: "fired",
      role: "development_coach",
    });
  });
});
