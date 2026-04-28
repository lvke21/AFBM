import { beforeAll, describe, expect, it } from "vitest";

import type { SelectionUsageMemory } from "../domain/play-selection";
import { defaultCalibrationSuite } from "./calibration-suite";
import {
  buildCalibrationObservations,
  createDefaultCalibrationExpectations,
  createDefaultCalibrationScenarios,
  simulateGameplayCalibrationReport,
  simulateGameplayCalibrationScenario,
} from "./gameplay-calibration";

function familyShare(
  shares: Partial<Record<string, number>>,
  families: string[],
) {
  return families.reduce((sum, family) => sum + (shares[family] ?? 0), 0);
}

function playShare(
  shares: Record<string, number>,
  playId: string,
) {
  return shares[playId] ?? 0;
}

function maybeLogCalibrationReport(label: string, payload: unknown) {
  if (process.env.CALIBRATION_REPORT === "1") {
    console.info(`${label}: ${JSON.stringify(payload, null, 2)}`);
  }
}

const CALIBRATION_SETUP_TIMEOUT_MS = 30_000;

describe("gameplay calibration", () => {
  const ruleset = "NFL_PRO" as const;
  const scenarioReports = new Map<string, ReturnType<typeof simulateGameplayCalibrationScenario>>();
  let aggregateReport: ReturnType<typeof simulateGameplayCalibrationReport>;

  beforeAll(() => {
    const scenarios = createDefaultCalibrationScenarios(ruleset);

    aggregateReport = simulateGameplayCalibrationReport({
      ruleset,
      scenarios,
    });

    for (const report of aggregateReport.scenarios) {
      scenarioReports.set(report.scenario.id, report);
    }

    maybeLogCalibrationReport("aggregate", {
      metrics: aggregateReport.aggregate,
      observations: aggregateReport.observations,
    });
    maybeLogCalibrationReport(
      "scenarios",
      aggregateReport.scenarios.map((report) => ({
        id: report.scenario.id,
        metrics: report.metrics,
        offenseFamilyShares: report.selection.offenseFamilyShares,
        defenseFamilyShares: report.selection.defenseFamilyShares,
      })),
    );
  }, CALIBRATION_SETUP_TIMEOUT_MS);

  it("stays inside the macro calibration bands for the default batch mix", () => {
    const calibrationReport = defaultCalibrationSuite.evaluate({
      ruleset,
      expectations: createDefaultCalibrationExpectations(ruleset),
      observations: buildCalibrationObservations(aggregateReport.aggregate),
    });

    if (!calibrationReport.passed) {
      throw new Error(JSON.stringify(calibrationReport.violations, null, 2));
    }

    expect(aggregateReport.aggregate.illegalPreSnapRate).toBe(0);
  });

  it("shows plausible situational play distributions", () => {
    const thirdShort = scenarioReports.get("third-short");
    const thirdLong = scenarioReports.get("third-long");
    const redZone = scenarioReports.get("red-zone");
    const twoMinute = scenarioReports.get("two-minute");

    expect(thirdShort).toBeDefined();
    expect(thirdLong).toBeDefined();
    expect(redZone).toBeDefined();
    expect(twoMinute).toBeDefined();

    expect(
      familyShare(thirdShort!.selection.offenseFamilyShares, [
        "GAP_RUN",
        "ZONE_RUN",
        "DESIGNED_QB_RUN",
        "QUICK_PASS",
        "OPTION_RPO",
      ]),
    ).toBeGreaterThan(0.72);
    expect(
      familyShare(thirdLong!.selection.offenseFamilyShares, [
        "QUICK_PASS",
        "DROPBACK",
        "SCREEN",
        "MOVEMENT_PASS",
        "EMPTY_TEMPO",
      ]),
    ).toBeGreaterThan(0.8);
    expect(familyShare(thirdLong!.selection.offenseFamilyShares, ["ZONE_RUN", "GAP_RUN"])).toBeLessThan(
      0.16,
    );
    expect(
      familyShare(redZone!.selection.offenseFamilyShares, [
        "GAP_RUN",
        "QUICK_PASS",
        "PLAY_ACTION",
        "ZONE_RUN",
        "DESIGNED_QB_RUN",
        "MOVEMENT_PASS",
      ]),
    ).toBeGreaterThan(0.68);
    expect(
      familyShare(redZone!.selection.defenseFamilyShares, [
        "RED_ZONE_PACKAGE",
        "BRACKET_SPECIALTY",
        "RUN_BLITZ",
      ]),
    ).toBeGreaterThan(0.45);
    expect(
      familyShare(twoMinute!.selection.offenseFamilyShares, [
        "QUICK_PASS",
        "DROPBACK",
        "SCREEN",
        "EMPTY_TEMPO",
        "MOVEMENT_PASS",
      ]),
    ).toBeGreaterThan(0.72);
  });

  it("keeps calibration field position aligned with the tagged field zone", () => {
    const redZone = createDefaultCalibrationScenarios(ruleset).find(
      (scenario) => scenario.id === "red-zone",
    );

    expect(redZone).toBeDefined();
    expect(redZone!.situation.fieldZone).toBe("LOW_RED_ZONE");
    expect(redZone!.situation.ballOnYardLine).toBeGreaterThanOrEqual(90);
    expect(redZone!.situation.ballOnYardLine).toBeLessThan(97);
  });

  it("keeps four-down menus and tendency-breakers coach-plausible", () => {
    const defaultScenarios = createDefaultCalibrationScenarios(ruleset);
    const fourDownBase = defaultScenarios.find(
      (scenario) => scenario.id === "four-down-territory",
    );

    if (!fourDownBase) {
      throw new Error("Missing four-down calibration scenario.");
    }

    const conservative = simulateGameplayCalibrationScenario({
      scenario: {
        ...fourDownBase,
        id: "four-down-conservative",
        offenseMode: "CONSERVATIVE",
      },
    });
    const aggressive = simulateGameplayCalibrationScenario({
      scenario: {
        ...fourDownBase,
        id: "four-down-aggressive",
        offenseMode: "AGGRESSIVE",
        defenseMode: "AGGRESSIVE",
      },
    });
    const baseline = simulateGameplayCalibrationScenario({
      scenario: {
        ...defaultScenarios[0],
        id: "tendency-baseline",
        iterations: 260,
      },
    });
    const memory: SelectionUsageMemory = {
      totalCalls: 120,
      playCallCounts: {
        "off-zone-inside-split": 46,
        "off-gap-counter-gt": 18,
        "off-rpo-glance-bubble": 18,
      },
      familyCallCounts: {
        ZONE_RUN: 46,
        GAP_RUN: 18,
        OPTION_RPO: 18,
      },
      recentPlayIds: [
        "off-zone-inside-split",
        "off-zone-inside-split",
        "off-zone-inside-split",
        "off-gap-counter-gt",
      ],
      recentFamilyCalls: ["ZONE_RUN", "ZONE_RUN", "ZONE_RUN", "GAP_RUN"],
    };
    const withMemory = simulateGameplayCalibrationScenario({
      scenario: {
        ...defaultScenarios[0],
        id: "tendency-memory",
        iterations: 260,
        offenseUsageMemory: memory,
      },
    });

    maybeLogCalibrationReport("four-down", {
      conservative: conservative.selection.offenseFamilyShares,
      aggressive: aggressive.selection.offenseFamilyShares,
    });
    maybeLogCalibrationReport("tendency-break", {
      baseline: baseline.selection.offensePlayShares,
      withMemory: withMemory.selection.offensePlayShares,
    });

    expect(
      familyShare(aggressive.selection.offenseFamilyShares, [
        "QUICK_PASS",
        "OPTION_RPO",
        "EMPTY_TEMPO",
        "MOVEMENT_PASS",
      ]),
    ).toBeGreaterThan(
      familyShare(conservative.selection.offenseFamilyShares, [
        "QUICK_PASS",
        "OPTION_RPO",
        "EMPTY_TEMPO",
        "MOVEMENT_PASS",
      ]) + 0.05,
    );
    expect(
      playShare(withMemory.selection.offensePlayShares, "off-zone-inside-split"),
    ).toBeLessThan(playShare(baseline.selection.offensePlayShares, "off-zone-inside-split"));
    expect(
      playShare(withMemory.selection.offensePlayShares, "off-zone-read-slice"),
    ).toBeGreaterThan(
      playShare(baseline.selection.offensePlayShares, "off-zone-read-slice"),
    );
  });
});
