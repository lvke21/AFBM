import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { hasConfiguredAuthProviders } from "@/lib/auth/provider-config";

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthConfigurationError extends Error {
  constructor(message = "No authentication provider configured") {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

function getE2EBypassUserId() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.AUTH_DEV_ENABLED !== "true" ||
    process.env.E2E_AUTH_BYPASS !== "true"
  ) {
    return null;
  }

  return process.env.E2E_USER_ID ?? `dev-user:${process.env.AUTH_DEV_EMAIL ?? "e2e-gm@example.test"}`;
}

export async function getSessionUserId() {
  const e2eUserId = getE2EBypassUserId();

  if (e2eUserId) {
    return e2eUserId;
  }

  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requirePageUserId() {
  if (!hasConfiguredAuthProviders) {
    redirect("/auth/setup-required");
  }

  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/api/auth/signin");
  }

  return userId;
}

export async function requireApiUserId() {
  if (!hasConfiguredAuthProviders) {
    throw new AuthConfigurationError();
  }

  const userId = await getSessionUserId();

  if (!userId) {
    throw new AuthenticationError();
  }

  return userId;
}
