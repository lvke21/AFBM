import type { NextRequest } from "next/server";

import { createAuditId } from "@/lib/audit/security-audit-log";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export type FirebaseAdminClaims = {
  uid: string;
  email?: string | null;
  admin: boolean;
  authTime?: number;
};

function readBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function verifyFirebaseAdminBearerToken(
  request: NextRequest,
): Promise<FirebaseAdminClaims | null> {
  const token = readBearerToken(request);

  if (!token) {
    return null;
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token, true);

    if (decodedToken.admin !== true) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      admin: true,
      authTime: decodedToken.auth_time,
    };
  } catch {
    return null;
  }
}

export function getAdminClaimAuditId(uid: string) {
  return createAuditId(`firebase-admin:${uid}`);
}

export async function requireFirebaseAdminClaim(request: NextRequest) {
  const claims = await verifyFirebaseAdminBearerToken(request);

  if (!claims) {
    return null;
  }

  return claims;
}
