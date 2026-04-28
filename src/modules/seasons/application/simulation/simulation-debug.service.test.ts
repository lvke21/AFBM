import { describe, expect, it } from "vitest";

import { createProductionMatchContext } from "./production-qa-suite";
import {
  createSimulationDebugReport,
  renderSimulationDebugHtml,
} from "./simulation-debug.service";

describe("simulation debug service", () => {
  it("creates a drive-level debug report with WHY reasons and derived play outcome logs", () => {
    const context = createProductionMatchContext(0, {
      matchId: "debug-test-game-1",
      seed: "debug-test-seed-1",
    });
    const report = createSimulationDebugReport({
      context,
      generatedAt: "2026-04-25T00:00:00.000Z",
    });

    expect(report.status).toBe("GRUEN");
    expect(report.metadata.matchId).toBe("debug-test-game-1");
    expect(report.metadata.seed).toBe("debug-test-seed-1");
    expect(report.driveDebug.length).toBeGreaterThan(0);
    expect(report.playOutcomeLogs.length).toBeGreaterThan(report.driveDebug.length);
    expect(report.decisionReasons).toHaveLength(report.driveDebug.length);
    expect(report.checks.driveLogAvailable).toBe(true);
    expect(report.checks.whyReasonsAvailable).toBe(true);
    expect(report.checks.derivedPlayOutcomeLogsAvailable).toBe(true);
    expect(report.checks.engineDecisionExamplesAvailable).toBe(true);
    expect(report.checks.nativeSnapPlayByPlayAvailable).toBe(false);
    expect(report.engineDecisionExamples).toHaveLength(10);

    for (const drive of report.driveDebug) {
      expect(drive.why.length).toBeGreaterThan(0);
      expect(drive.playOutcomeLogs.length).toBeGreaterThanOrEqual(4);
      expect(drive.playOutcomeLogs[0]?.stage).toBe("DRIVE_START");
    }
  });

  it("keeps fourth-down decision evidence visible when the engine provides it", () => {
    const report = createSimulationDebugReport({
      seed: "debug-fourth-down-seed-1",
      matchId: "debug-fourth-down-game-1",
      generatedAt: "2026-04-25T00:00:00.000Z",
    });
    const fourthDownDrive = report.driveDebug.find(
      (drive) => drive.fourthDown.decision != null,
    );

    expect(fourthDownDrive).toBeDefined();
    expect(fourthDownDrive?.fourthDown.why.join(" ")).toContain("4th");
    expect(
      fourthDownDrive?.playOutcomeLogs.some(
        (log) => log.stage === "FOURTH_DOWN_DECISION",
      ),
    ).toBe(true);
  });

  it("renders the requested HTML debug sections", () => {
    const report = createSimulationDebugReport({
      seed: "debug-html-seed-1",
      matchId: "debug-html-game-1",
      generatedAt: "2026-04-25T00:00:00.000Z",
    });
    const html = renderSimulationDebugHtml(report);

    expect(html).toContain("Simulation Debug Report");
    expect(html).toContain("Drive Debug View");
    expect(html).toContain("Neue Engine-Entscheidungen");
    expect(html).toContain("Blocker vs Rusher");
    expect(html).toContain("Play Outcome Logs");
    expect(html).toContain("WHY Entscheidungsbegruendung");
    expect(html).toContain("Native Snap Logs: NEIN");
  });
});
