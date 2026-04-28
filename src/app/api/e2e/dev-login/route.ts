import { NextResponse, type NextRequest } from "next/server";

import { signIn } from "@/auth";

function e2eDevLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_ENABLED === "true";
}

function e2eAuthBypassEnabled() {
  return e2eDevLoginEnabled() && process.env.E2E_AUTH_BYPASS === "true";
}

function safeCallbackUrl(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") ?? "/app/savegames";

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/app/savegames";
  }

  return callbackUrl;
}

export async function GET(request: NextRequest) {
  if (!e2eDevLoginEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const callbackUrl = safeCallbackUrl(request);

  if (e2eAuthBypassEnabled()) {
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  }

  const email = process.env.AUTH_DEV_EMAIL;
  const password = process.env.AUTH_DEV_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ error: "Dev credentials are not configured" }, { status: 500 });
  }

  const redirectUrl = await signIn("dev-credentials", {
    email,
    password,
    redirect: false,
    redirectTo: callbackUrl,
  });

  return NextResponse.redirect(new URL(String(redirectUrl), request.url));
}
