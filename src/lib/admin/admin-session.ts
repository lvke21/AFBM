import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createAuditId } from "@/lib/audit/security-audit-log";

export const ADMIN_SESSION_COOKIE = "afbm.admin.session";

function getAdminAccessCode() {
  return process.env.AFBM_ADMIN_ACCESS_CODE ?? process.env.ADMIN_ACCESS_CODE ?? "";
}

function getAdminSessionSecret() {
  const sessionSecret = process.env.AFBM_ADMIN_SESSION_SECRET;

  if (sessionSecret) {
    return sessionSecret;
  }

  if (process.env.NODE_ENV === "production") {
    return "";
  }

  return getAdminAccessCode();
}

function createAdminSessionToken() {
  const secret = getAdminSessionSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update("afbm-admin-session-v1").digest("hex");
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminAccessConfigured() {
  return getAdminAccessCode().trim().length > 0;
}

export function verifyAdminAccessCode(code: string) {
  const expectedCode = getAdminAccessCode();

  return expectedCode.trim().length > 0 && safeEquals(code.trim(), expectedCode);
}

export function getAdminSessionToken() {
  return createAdminSessionToken();
}

export async function hasAdminSession() {
  const token = createAdminSessionToken();

  if (!token) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return Boolean(cookieToken) && safeEquals(cookieToken ?? "", token);
}

export async function getAdminSessionAuditId() {
  const token = createAdminSessionToken();

  if (!token) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!cookieToken || !safeEquals(cookieToken, token)) {
    return null;
  }

  return createAuditId(cookieToken);
}

export async function requireAdminSession(nextPath = "/admin") {
  if (!isAdminAccessConfigured()) {
    redirect(`/admin/login?error=not-configured&next=${encodeURIComponent(nextPath)}`);
  }

  if (!(await hasAdminSession())) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
}
