import { NextResponse, type NextRequest } from "next/server";

import { auditSecurityEvent } from "@/lib/audit/security-audit-log";
import {
  getAdminSessionAuditId,
  hasAdminSession,
  isAdminAccessConfigured,
} from "@/lib/admin/admin-session";

export type AdminActionActor = {
  adminSessionId: string;
  adminUserId: string;
  source: "admin-session";
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

export async function requireAdminActionSession(): Promise<AdminActionActor> {
  if (!isAdminAccessConfigured()) {
    throw new AdminActionError(
      "Adminzugang ist serverseitig nicht konfiguriert.",
      503,
      "ADMIN_NOT_CONFIGURED",
    );
  }

  if (!(await hasAdminSession())) {
    throw new AdminActionError(
      "Du bist nicht als Admin angemeldet.",
      401,
      "ADMIN_UNAUTHORIZED",
    );
  }

  return {
    adminSessionId: (await getAdminSessionAuditId()) ?? "unknown",
    adminUserId: "admin-session",
    source: "admin-session",
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
      source: input.actor?.source ?? "admin-session",
      userId: input.actor?.adminUserId ?? "anonymous",
    },
    leagueId: input.leagueId,
    targetUserId: input.targetUserId,
    reason: input.reason,
    code: input.code,
  });
}
