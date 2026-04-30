import { NextResponse, type NextRequest } from "next/server";

import { auditSecurityEvent, createAuditId } from "@/lib/audit/security-audit-log";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionToken,
  isAdminAccessConfigured,
  verifyAdminAccessCode,
} from "@/lib/admin/admin-session";

function safeNextPath(value: FormDataEntryValue | null) {
  const nextPath = typeof value === "string" ? value : "/admin";

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/admin";
  }

  return nextPath;
}

function redirectToLogin(request: NextRequest, error: string, nextPath: string) {
  const url = new URL("/admin/login", request.url);

  url.searchParams.set("error", error);
  url.searchParams.set("next", nextPath);

  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const nextPath = safeNextPath(formData.get("next"));
  const code = formData.get("code");

  if (!isAdminAccessConfigured()) {
    auditSecurityEvent({
      request,
      event: "admin_login",
      action: "login",
      outcome: "denied",
      code: "ADMIN_NOT_CONFIGURED",
    });
    return redirectToLogin(request, "not-configured", nextPath);
  }

  if (typeof code !== "string" || !verifyAdminAccessCode(code)) {
    auditSecurityEvent({
      request,
      event: "admin_login",
      action: "login",
      outcome: "denied",
      code: "ADMIN_INVALID_CODE",
    });
    return redirectToLogin(request, "invalid-code", nextPath);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  const sessionToken = getAdminSessionToken();

  auditSecurityEvent({
    request,
    event: "admin_login",
    action: "login",
    outcome: "success",
    actor: {
      adminSessionId: createAuditId(sessionToken),
      source: "admin-session",
      userId: "admin-session",
    },
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
