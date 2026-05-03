import { describe, expect, it } from "vitest";

import { getAdminAuthDecision, hasAdminAccess } from "./admin-auth-model";

describe("admin auth model", () => {
  it("allows custom-claim admins", () => {
    expect(getAdminAuthDecision({ uid: "user-1", claims: { admin: true } })).toEqual({
      allowed: true,
      bootstrapEligible: false,
      reason: null,
      source: "custom-claim",
    });
  });

  it("keeps the UID allowlist as a bootstrap hint without granting access", () => {
    expect(
      getAdminAuthDecision({
        uid: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
        claims: { admin: false },
      }),
    ).toEqual({
      allowed: false,
      bootstrapEligible: true,
      reason: "missing-custom-claim",
      source: null,
    });

    expect(
      hasAdminAccess({
        uid: "KFy5PrqAzzP7vRbfP4wIDamzbh43",
        claims: { admin: false },
      }),
    ).toBe(false);
  });

  it("blocks non-admin identities", () => {
    expect(hasAdminAccess({ uid: "normal-user", claims: { admin: false } })).toBe(false);
    expect(getAdminAuthDecision({ uid: null, claims: null })).toEqual({
      allowed: false,
      bootstrapEligible: false,
      reason: "missing-identity",
      source: null,
    });
    expect(getAdminAuthDecision({ uid: "normal-user", claims: { admin: false } })).toEqual({
      allowed: false,
      bootstrapEligible: false,
      reason: "missing-custom-claim",
      source: null,
    });
  });
});
