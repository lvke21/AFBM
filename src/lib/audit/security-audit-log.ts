import { createHash } from "crypto";
import type { NextRequest } from "next/server";

type AuditOutcome = "success" | "denied" | "failed";

type AuditActor = {
  adminSessionId?: string | null;
  source?: string;
  userId?: string | null;
};

type AuditInput = {
  event: string;
  outcome: AuditOutcome;
  action?: string;
  actor?: AuditActor;
  leagueId?: string;
  targetUserId?: string;
  reason?: string;
  code?: string;
  request?: NextRequest;
  metadata?: Record<string, unknown>;
};

const SENSITIVE_KEY_PATTERN = /(password|secret|token|code|credential|private.?key|authorization|cookie)/i;

export function createAuditId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function auditSecurityEvent(input: AuditInput) {
  const entry = {
    type: "security_audit",
    createdAt: new Date().toISOString(),
    event: input.event,
    outcome: input.outcome,
    action: input.action,
    actor: sanitizeMetadata(input.actor ?? {}),
    leagueId: input.leagueId,
    targetUserId: input.targetUserId,
    reason: input.reason,
    code: input.code,
    request: input.request ? getRequestMeta(input.request) : undefined,
    metadata: sanitizeMetadata(input.metadata ?? {}),
  };
  const line = JSON.stringify(entry);

  if (input.outcome === "success") {
    console.info(line);
    return entry;
  }

  console.warn(line);
  return entry;
}

export function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMetadata(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : sanitizeMetadata(entry),
    ]),
  );
}

function getRequestMeta(request: NextRequest) {
  return {
    path: request.nextUrl.pathname,
    userAgent: request.headers.get("user-agent") ?? "unknown",
    forwardedFor: request.headers.get("x-forwarded-for") ?? undefined,
  };
}
