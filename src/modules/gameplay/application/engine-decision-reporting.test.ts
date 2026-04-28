import { describe, expect, it } from "vitest";

import {
  buildEngineDecisionExamples,
  buildEngineDecisionSummary,
  renderEngineDecisionReportHtml,
} from "./engine-decision-reporting";

describe("engine decision reporting", () => {
  it("builds ten user-readable play explanations for the new engine stages", () => {
    const examples = buildEngineDecisionExamples();
    const stages = examples.map((example) => example.stage);

    expect(examples).toHaveLength(10);
    expect(stages).toEqual(
      expect.arrayContaining([
        "PLAY_CALL",
        "PASS_PROTECTION",
        "QB_DECISION",
        "RECEIVER_MATCHUP",
        "RUN_LANE",
        "CHEMISTRY",
        "COACH_MOMENTUM",
      ]),
    );
    expect(examples.every((example) => example.userSummary.length > 24)).toBe(true);
    expect(examples.every((example) => example.developerDetails.length > 0)).toBe(true);
  });

  it("summarizes report readiness for GUI and developer debug mode", () => {
    const summary = buildEngineDecisionSummary();

    expect(summary.hasExamples).toBe(true);
    expect(summary.developerDebugAvailable).toBe(true);
    expect(summary.userReadable).toBe(true);
  });

  it("renders an HTML report with explanation tables", () => {
    const html = renderEngineDecisionReportHtml();

    expect(html).toContain("Neue Engine Entscheidungen");
    expect(html).toContain("10 Beispiel-Plays");
    expect(html).toContain("Blocker vs Rusher");
    expect(html).toContain("Head Coach stabilisiert");
  });
});
