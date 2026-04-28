import { describe, expect, it } from "vitest";

import { resolvePressCoverage } from "./press-coverage-resolution";

function resolve(input: Partial<Parameters<typeof resolvePressCoverage>[0]> = {}) {
  return resolvePressCoverage({
    routeType: "QUICK_SLANT",
    defender: {
      press: 78,
      manCoverage: 76,
      speed: 76,
      acceleration: 76,
    },
    receiver: {
      release: 76,
      routeRunning: 76,
      separation: 76,
      speed: 76,
      acceleration: 76,
    },
    coverageShell: "ONE_HIGH",
    defenseFamily: "MAN_COVERAGE",
    safetyHelp: false,
    qbTiming: 0.72,
    pressSeed: "default-press",
    ...input,
  });
}

describe("press coverage resolution", () => {
  it("lets an elite press CB visibly disrupt a weak WR", () => {
    const result = resolve({
      defender: {
        press: 94,
        manCoverage: 90,
        speed: 86,
        acceleration: 88,
      },
      receiver: {
        release: 58,
        routeRunning: 62,
        separation: 60,
        speed: 72,
        acceleration: 70,
      },
      pressSeed: "elite-press-cb",
    });

    expect(result.outcome).toBe("PRESS_WIN");
    expect(result.timingDisruption).toBeGreaterThan(0.45);
    expect(result.routeDevelopmentTimeDelta).toBeGreaterThan(0.18);
    expect(result.separationDelta).toBeLessThan(0);
    expect(result.bigPlayRiskDelta).toBeLessThanOrEqual(0);
  });

  it("lets a weak press CB get punished by elite release", () => {
    const result = resolve({
      routeType: "GO",
      defender: {
        press: 52,
        manCoverage: 58,
        speed: 78,
        acceleration: 76,
      },
      receiver: {
        release: 94,
        routeRunning: 91,
        separation: 90,
        speed: 94,
        acceleration: 93,
      },
      coverageShell: "ZERO",
      defenseFamily: "ZERO_PRESSURE",
      safetyHelp: false,
      pressSeed: "weak-press-elite-release",
    });

    expect(["RELEASE_WIN", "STACKED_OVER_TOP"]).toContain(result.outcome);
    expect(result.separationDelta).toBeGreaterThan(0);
    expect(result.bigPlayRiskDelta).toBeGreaterThan(0.08);
    expect(result.routeDevelopmentTimeDelta).toBeLessThanOrEqual(0.12);
  });

  it("raises big-play risk when press has no safety help", () => {
    const withoutHelp = resolve({
      routeType: "GO",
      coverageShell: "ZERO",
      defenseFamily: "ZERO_PRESSURE",
      safetyHelp: false,
      defender: {
        press: 68,
        manCoverage: 70,
        speed: 80,
        acceleration: 79,
      },
      receiver: {
        release: 84,
        routeRunning: 82,
        separation: 83,
        speed: 90,
        acceleration: 89,
      },
      pressSeed: "same-release-no-help",
    });

    expect(withoutHelp.safetyHelpActive).toBe(false);
    expect(withoutHelp.bigPlayRiskDelta).toBeGreaterThan(0.05);
  });

  it("reduces punishment when safety help is present", () => {
    const noHelp = resolve({
      routeType: "GO",
      coverageShell: "ZERO",
      defenseFamily: "ZERO_PRESSURE",
      safetyHelp: false,
      defender: {
        press: 68,
        manCoverage: 70,
        speed: 80,
        acceleration: 79,
      },
      receiver: {
        release: 84,
        routeRunning: 82,
        separation: 83,
        speed: 90,
        acceleration: 89,
      },
      pressSeed: "same-release-no-help",
    });
    const withHelp = resolve({
      routeType: "GO",
      coverageShell: "TWO_HIGH",
      defenseFamily: "BRACKET_SPECIALTY",
      safetyHelp: true,
      defender: {
        press: 68,
        manCoverage: 70,
        speed: 80,
        acceleration: 79,
      },
      receiver: {
        release: 84,
        routeRunning: 82,
        separation: 83,
        speed: 90,
        acceleration: 89,
      },
      pressSeed: "same-release-no-help",
    });

    expect(withHelp.safetyHelpActive).toBe(true);
    expect(withHelp.bigPlayRiskDelta).toBeLessThan(noHelp.bigPlayRiskDelta);
    expect(withHelp.releaseWinProbability).toBeLessThan(noHelp.releaseWinProbability);
  });

  it("press makes a quick slant timing window harder", () => {
    const result = resolve({
      routeType: "QUICK_SLANT",
      defender: {
        press: 86,
        manCoverage: 82,
        speed: 80,
        acceleration: 84,
      },
      receiver: {
        release: 76,
        routeRunning: 78,
        separation: 77,
        speed: 82,
        acceleration: 82,
      },
      qbTiming: 0.58,
      pressSeed: "quick-slant-press",
    });

    expect(result.quickPassPenalty).toBeGreaterThan(0.2);
    expect(result.routeDevelopmentTimeDelta).toBeGreaterThan(0.1);
    expect(result.timingDisruption).toBeGreaterThan(0.3);
  });

  it("press against a go route can win or expose the defense without automatic dominance", () => {
    const result = resolve({
      routeType: "GO",
      defender: {
        press: 82,
        manCoverage: 80,
        speed: 83,
        acceleration: 82,
      },
      receiver: {
        release: 82,
        routeRunning: 80,
        separation: 80,
        speed: 88,
        acceleration: 87,
      },
      coverageShell: "ONE_HIGH",
      defenseFamily: "MAN_COVERAGE",
      safetyHelp: false,
      pressSeed: "go-route-balanced",
    });

    expect(result.pressWinProbability).toBeGreaterThan(0.2);
    expect(result.releaseWinProbability).toBeGreaterThan(0.2);
    expect(result.pressWinProbability).toBeLessThan(0.7);
    expect(result.releaseWinProbability).toBeLessThan(0.7);
    expect(result.trace.gameReportRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Press Outcome" }),
        expect.objectContaining({ label: "Route Development Delta" }),
      ]),
    );
  });
});
