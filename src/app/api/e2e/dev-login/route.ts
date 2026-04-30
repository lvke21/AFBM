import { NextResponse, type NextRequest } from "next/server";

function e2eDevLoginEnabled() {
  return process.env.NODE_ENV !== "production";
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
  return NextResponse.redirect(new URL(callbackUrl, request.url));
}
