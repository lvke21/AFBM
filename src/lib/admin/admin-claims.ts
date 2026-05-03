import type { NextRequest } from "next/server";

import { getAdminAuthDecision } from "@/lib/admin/admin-auth-model";
import { createAuditId } from "@/lib/audit/security-audit-log";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export type FirebaseAdminClaims = {
  uid: string;
  email?: string | null;
  admin: boolean;
  authTime?: number;
};

export type FirebaseAdminVerificationResult =
  | {
      status: "admin";
      claims: FirebaseAdminClaims;
    }
  | {
      status: "not-admin";
      uid: string;
      email?: string | null;
    }
  | {
      status: "missing-token" | "invalid-token";
    };

function readBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function verifyFirebaseAdminBearerToken(request: NextRequest): Promise<FirebaseAdminVerificationResult> {
  const token = readBearerToken(request);

  if (!token) {
    return { status: "missing-token" };
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token, true);
    const adminDecision = getAdminAuthDecision({
      claims: { admin: decodedToken.admin },
      uid: decodedToken.uid,
    });

    if (!adminDecision.allowed) {
      return {
        status: "not-admin",
        uid: decodedToken.uid,
        email: decodedToken.email ?? null,
      };
    }

    return {
      status: "admin",
      claims: {
        uid: decodedToken.uid,
        email: decodedToken.email ?? null,
        admin: true,
        authTime: decodedToken.auth_time,
      },
    };
  } catch {
    return { status: "invalid-token" };
  }
}

export function getAdminClaimAuditId(uid: string) {
  return createAuditId(`firebase-admin:${uid}`);
}

export async function requireFirebaseAdminClaim(request: NextRequest) {
  const result = await verifyFirebaseAdminBearerToken(request);

  if (result.status !== "admin") {
    return result;
  }

  return result;
}
