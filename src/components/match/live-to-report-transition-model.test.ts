import { describe, expect, it } from "vitest";

import { finalKeyStatements, finalLeader } from "./live-to-report-transition-model";
import type { LiveSimulationState, LiveTimelineEntry } from "./live-simulation-model";

function createState(): Pick<LiveSimulationState, "awayTeam" | "homeTeam"> {
  return {
    awayTeam: {
      abbreviation: "NYT",
      isManagerTeam: false,
      name: "New York Titans",
      score: 17,
      side: "Away",
    },
    homeTeam: {
      abbreviation: "BOS",
      isManagerTeam: true,
      name: "Boston Guardians",
      score: 24,
      side: "Home",
    },
  };
}

function createEntry(overrides: Partial<LiveTimelineEntry> = {}): LiveTimelineEntry {
  return {
    description: "Touchdown nach langem Drive.",
    defenseTeamAbbreviation: "NYT",
    highlight: "touchdown",
    isImportant: true,
    lineupContext: null,
    meta: "Q4",
    offenseTeamAbbreviation: "BOS",
    phaseLabel: "Q4",
    resultLabel: "Touchdown",
    scoreChangeLabel: "17 - 17 -> 24 - 17",
    sequence: 4,
    title: "Touchdown",
    tone: "success",
    ...overrides,
  };
}

describe("live to report transition", () => {
  it("names the final leader from the visible score", () => {
    expect(finalLeader("BOS", "NYT", { away: 17, home: 24 })).toBe("BOS");
    expect(finalLeader("BOS", "NYT", { away: 21, home: 21 })).toBe("Unentschieden");
  });

  it("builds a short final whistle summary with score context and decisive drive", () => {
    const statements = finalKeyStatements(createState(), [createEntry()], { away: 17, home: 24 });

    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("BOS bringt ein enges Spiel");
    expect(statements[1]).toContain("Touchdown");
  });

  it("falls back to a report handoff when no drives are visible", () => {
    const statements = finalKeyStatements(createState(), [], { away: 0, home: 0 });

    expect(statements[0]).toContain("Kein Team");
    expect(statements[1]).toContain("Report");
  });
});
