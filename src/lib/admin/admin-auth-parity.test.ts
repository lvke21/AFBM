import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminAuthDecision } from "@/lib/admin/admin-auth-model";
import { verifyFirebaseAdminBearerToken } from "@/lib/admin/admin-claims";

const verifyIdTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
  }),
}));

const UID_ALLOWLISTED_USER = "KFy5PrqAzzP7vRbfP4wIDamzbh43";

const ADMIN_PARITY_MATRIX = [
  {
    claims: { admin: true },
    expectedBootstrapEligible: false,
    expectedServerStatus: "admin",
    expectedUiAllowed: true,
    label: "custom-claim admin",
    token: "claim-admin-token",
    uid: "claim-admin",
  },
  {
    claims: { admin: false },
    expectedBootstrapEligible: true,
    expectedServerStatus: "not-admin",
    expectedUiAllowed: false,
    label: "UID allowlist without claim",
    token: "uid-allowlist-token",
    uid: UID_ALLOWLISTED_USER,
  },
  {
    claims: { admin: false },
    expectedBootstrapEligible: false,
    expectedServerStatus: "not-admin",
    expectedUiAllowed: false,
    label: "normal user",
    token: "normal-user-token",
    uid: "normal-user",
  },
  {
    claims: null,
    expectedBootstrapEligible: false,
    expectedServerStatus: "missing-token",
    expectedUiAllowed: false,
    label: "unauthenticated",
    token: null,
    uid: null,
  },
] as const;

function adminRequest(token: string | null) {
  return new NextRequest("http://localhost/api/admin/online/actions", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("admin auth parity matrix", () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
  });

  it.each(ADMIN_PARITY_MATRIX)(
    "keeps UI gate and server guard aligned for $label",
    async (matrixCase) => {
      const uiDecision = getAdminAuthDecision({
        claims: matrixCase.claims,
        uid: matrixCase.uid,
      });

      if (matrixCase.token) {
        verifyIdTokenMock.mockResolvedValue({
          uid: matrixCase.uid,
          email: `${matrixCase.uid}@example.test`,
          admin: matrixCase.claims?.admin,
          auth_time: 1_765_000_000,
        });
      }

      const serverDecision = await verifyFirebaseAdminBearerToken(adminRequest(matrixCase.token));
      const serverAllowsAdmin = serverDecision.status === "admin";

      expect(uiDecision.allowed).toBe(matrixCase.expectedUiAllowed);
      expect(uiDecision.bootstrapEligible).toBe(matrixCase.expectedBootstrapEligible);
      expect(serverDecision.status).toBe(matrixCase.expectedServerStatus);
      expect(serverAllowsAdmin).toBe(uiDecision.allowed);
    },
  );
});
