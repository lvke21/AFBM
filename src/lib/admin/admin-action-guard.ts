import { NextResponse, type NextRequest } from "next/server";

import { auditSecurityEvent } from "@/lib/audit/security-audit-log";
import {
  getAdminClaimAuditId,
  requireFirebaseAdminClaim,
} from "@/lib/admin/admin-claims";

export type AdminActionActor = {
  adminSessionId: string;
  adminUserId: string;
  source: "firebase-admin-claim";
};

export type AdminAuditStatus = "success" | "denied" | "failed";

export class AdminActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export async function requireAdminActionSession(request: NextRequest): Promise<AdminActionActor> {
  const claims = await requireFirebaseAdminClaim(request);

  if (!claims) {
    throw new AdminActionError(
      "Du bist nicht als Firebase-Admin angemeldet.",
      401,
      "ADMIN_UNAUTHORIZED",
    );
  }

  return {
    adminSessionId: getAdminClaimAuditId(claims.uid),
    adminUserId: claims.uid,
    source: "firebase-admin-claim",
  };
}

export function adminActionErrorResponse(error: unknown) {
  if (error instanceof AdminActionError) {
    return NextResponse.json(
      {
        ok: false,
        code: error.code,
        message: error.message,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      code: "ADMIN_ACTION_FAILED",
      message: "Admin-Aktion konnte nicht ausgeführt werden.",
    },
    { status: 500 },
  );
}

export function auditAdminAction(input: {
  request: NextRequest;
  actor?: AdminActionActor;
  action: string;
  status: AdminAuditStatus;
  leagueId?: string;
  targetUserId?: string;
  reason?: string;
  code?: string;
}) {
  return auditSecurityEvent({
    request: input.request,
    event: "admin_action",
    action: input.action,
    outcome: input.status,
    actor: {
      adminSessionId: input.actor?.adminSessionId,
      source: input.actor?.source ?? "firebase-admin-claim",
      userId: input.actor?.adminUserId ?? "anonymous",
    },
    leagueId: input.leagueId,
    targetUserId: input.targetUserId,
    reason: input.reason,
    code: input.code,
  });
}
