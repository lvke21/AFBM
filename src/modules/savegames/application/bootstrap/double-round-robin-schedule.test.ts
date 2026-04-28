import { describe, expect, it } from "vitest";

import { buildDoubleRoundRobinSchedule } from "./double-round-robin-schedule";

const teams = [
  { id: "1", city: "Boston", abbreviation: "BOS" },
  { id: "2", city: "Chicago", abbreviation: "CHI" },
  { id: "3", city: "Detroit", abbreviation: "DET" },
  { id: "4", city: "Houston", abbreviation: "HOU" },
  { id: "5", city: "Miami", abbreviation: "MIA" },
  { id: "6", city: "New York", abbreviation: "NYT" },
  { id: "7", city: "San Diego", abbreviation: "SDG" },
  { id: "8", city: "Seattle", abbreviation: "SEA" },
];

describe("buildDoubleRoundRobinSchedule", () => {
  it("creates 14 weeks for 8 teams", () => {
    const schedule = buildDoubleRoundRobinSchedule(teams, 2026);
    const weeks = new Set(schedule.map((match) => match.week));

    expect(schedule).toHaveLength(56);
    expect(weeks.size).toBe(14);
  });

  it("creates each pairing exactly twice with mirrored home/away", () => {
    const schedule = buildDoubleRoundRobinSchedule(teams, 2026);
    const pairingCounts = new Map<string, number>();
    const directedPairings = new Set<string>();

    for (const match of schedule) {
      const sortedPairing = [match.homeTeamId, match.awayTeamId].sort().join(":");
      pairingCounts.set(sortedPairing, (pairingCounts.get(sortedPairing) ?? 0) + 1);
      directedPairings.add(`${match.homeTeamId}:${match.awayTeamId}`);
    }

    for (const count of pairingCounts.values()) {
      expect(count).toBe(2);
    }

    expect(directedPairings.has("1:2")).toBe(true);
    expect(directedPairings.has("2:1")).toBe(true);
  });
});
