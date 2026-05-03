import { isAdminUid } from "@/lib/admin/admin-uid-allowlist";

export type AdminAuthClaimSource = "custom-claim";
export type AdminAuthDenyReason = "missing-custom-claim" | "missing-identity";

export type AdminAuthDecision =
  | {
      allowed: true;
      bootstrapEligible: boolean;
      reason: null;
      source: AdminAuthClaimSource;
    }
  | {
      allowed: false;
      bootstrapEligible: boolean;
      reason: AdminAuthDenyReason;
      source: null;
    };

export function getAdminAuthDecision(input: {
  claims?: Record<string, unknown> | null;
  uid: string | null | undefined;
}): AdminAuthDecision {
  const bootstrapEligible = isAdminUid(input.uid);

  if (input.claims?.admin === true) {
    return {
      allowed: true,
      bootstrapEligible,
      reason: null,
      source: "custom-claim",
    };
  }

  return {
    allowed: false,
    bootstrapEligible,
    reason: input.uid ? "missing-custom-claim" : "missing-identity",
    source: null,
  };
}

export function hasAdminAccess(input: {
  claims?: Record<string, unknown> | null;
  uid: string | null | undefined;
}) {
  return getAdminAuthDecision(input).allowed;
}
