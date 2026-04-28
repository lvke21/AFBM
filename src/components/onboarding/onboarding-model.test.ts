import { describe, expect, it } from "vitest";

import {
  buildOnboardingSteps,
  isOnboardingComplete,
  mergeCompletedOnboardingSteps,
  nextOnboardingStep,
  onboardingStorageKey,
  routeStepId,
} from "./onboarding-model";

describe("onboarding model", () => {
  it("builds the fixed first-five-minutes flow for a savegame", () => {
    const steps = buildOnboardingSteps({
      nextGameHref: "/app/savegames/save-1/game/setup?matchId=match-1",
      saveGameId: "save-1",
    });

    expect(steps.map((step) => step.id)).toEqual([
      "team",
      "depth-chart",
      "inbox",
      "game-start",
    ]);
    expect(steps[0].href).toBe("/app/savegames/save-1/team/roster");
    expect(steps[3].href).toBe("/app/savegames/save-1/game/setup?matchId=match-1");
    expect(onboardingStorageKey("save-1")).toBe("afbm:onboarding:v1:save-1");
  });

  it("maps routes to the matching onboarding step", () => {
    expect(routeStepId("/app/savegames/save-1/team/roster")).toBe("team");
    expect(routeStepId("/app/savegames/save-1/team/depth-chart")).toBe("depth-chart");
    expect(routeStepId("/app/savegames/save-1/inbox")).toBe("inbox");
    expect(routeStepId("/app/savegames/save-1/game/setup?matchId=match-1")).toBe("game-start");
    expect(routeStepId("/app/savegames/save-1/league")).toBeNull();
  });

  it("advances completed steps without creating dead ends", () => {
    const steps = buildOnboardingSteps({
      nextGameHref: null,
      saveGameId: "save-1",
    });
    const completed = mergeCompletedOnboardingSteps(["team"], "inbox");

    expect([...completed]).toEqual(["team", "depth-chart", "inbox"]);
    expect(nextOnboardingStep(steps, completed)?.id).toBe("game-start");
    expect(isOnboardingComplete(completed)).toBe(false);
    expect(isOnboardingComplete(mergeCompletedOnboardingSteps(completed, "game-start"))).toBe(
      true,
    );
  });
});
