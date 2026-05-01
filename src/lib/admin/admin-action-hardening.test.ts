import { describe, expect, it } from "vitest";

import {
  createAdminSimulationLockId,
  isSafeAdminEntityId,
  normalizeBoundedAdminInteger,
  normalizeExpectedAdminSimulationStep,
} from "./admin-action-hardening";

describe("admin action hardening", () => {
  it("accepts only safe admin entity ids", () => {
    expect(isSafeAdminEntityId("league-alpha_123")).toBe(true);
    expect(isSafeAdminEntityId("league/alpha")).toBe(false);
    expect(isSafeAdminEntityId("../league")).toBe(false);
    expect(isSafeAdminEntityId("")).toBe(false);
  });

  it("normalizes bounded admin integers", () => {
    expect(normalizeBoundedAdminInteger(12.8, 16, 1, 16)).toBe(12);
    expect(normalizeBoundedAdminInteger(99, 16, 1, 16)).toBe(16);
    expect(normalizeBoundedAdminInteger(Number.NaN, 16, 1, 16)).toBe(16);
  });

  it("builds deterministic week simulation lock ids", () => {
    expect(createAdminSimulationLockId("league-alpha", 2, 7)).toBe(
      "league-alpha-simulate-s2-w7",
    );
  });

  it("requires a valid expected simulation step", () => {
    expect(normalizeExpectedAdminSimulationStep({ season: 1, week: 18 })).toEqual({
      season: 1,
      week: 18,
    });
    expect(normalizeExpectedAdminSimulationStep({ season: 1, week: 19 })).toBeNull();
    expect(normalizeExpectedAdminSimulationStep({ season: 0, week: 1 })).toBeNull();
  });
});
