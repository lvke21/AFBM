import { describe, expect, it } from "vitest";

import { RosterStatus } from "./enums";
import {
  countsTowardActiveRosterLimit,
  isGameDayEligibleRosterStatus,
  parseRosterStatus,
  shouldClearLineupAssignments,
} from "./roster-status";

describe("roster status rules", () => {
  it("distinguishes active roster usage from game-day eligibility", () => {
    expect(countsTowardActiveRosterLimit(RosterStatus.INACTIVE)).toBe(true);
    expect(isGameDayEligibleRosterStatus(RosterStatus.INACTIVE)).toBe(false);
    expect(isGameDayEligibleRosterStatus(RosterStatus.PRACTICE_SQUAD)).toBe(false);
    expect(isGameDayEligibleRosterStatus(RosterStatus.BACKUP)).toBe(true);
  });

  it("marks non-playing statuses for lineup cleanup", () => {
    expect(shouldClearLineupAssignments(RosterStatus.INJURED_RESERVE)).toBe(true);
    expect(shouldClearLineupAssignments(RosterStatus.PRACTICE_SQUAD)).toBe(true);
    expect(shouldClearLineupAssignments(RosterStatus.STARTER)).toBe(false);
  });

  it("rejects invalid roster status values", () => {
    expect(() => parseRosterStatus("NOT_A_STATUS")).toThrow("Invalid roster status");
    expect(parseRosterStatus("BACKUP")).toBe(RosterStatus.BACKUP);
  });
});
