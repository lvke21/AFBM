import { NextResponse, type NextRequest } from "next/server";

import {
  AdminActionError,
  adminActionErrorResponse,
  auditAdminAction,
  requireAdminActionSession,
} from "@/lib/admin/admin-action-guard";
import { isSafeAdminEntityId } from "@/lib/admin/admin-action-hardening";
import {
  executeOnlineAdminAction,
  simulateOnlineLeagueWeek,
  toOnlineAdminActionError,
  type OnlineAdminActionInput,
} from "@/lib/admin/online-admin-actions";

export async function POST(request: NextRequest) {
  let input: OnlineAdminActionInput | null = null;
  let actor;

  try {
    input = (await request.json()) as OnlineAdminActionInput;
    actor = await requireAdminActionSession(request);
  } catch (error) {
    auditAdminAction({
      request,
      action: input?.action ?? "unknown",
	      status: "denied",
	      leagueId: input?.leagueId,
	      targetUserId: input?.targetUserId,
	      code: error instanceof AdminActionError ? error.code : "ADMIN_DENIED",
	    });
    return adminActionErrorResponse(error);
  }

  try {
    const result =
      input.action === "simulateWeek" && input.backendMode === "firebase"
        ? {
            ok: true as const,
            message: "Die Woche wurde simuliert.",
            simulation: await simulateWeekFromApi(input, actor),
          }
        : await executeOnlineAdminAction(input, actor);

    auditAdminAction({
      request,
      actor,
      action: input.action,
      status: "success",
      leagueId: input.leagueId ?? result.league?.id,
      targetUserId: input.targetUserId,
      reason: input.reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    const actionError =
      error instanceof AdminActionError
        ? {
            code: error.code,
            message: error.message,
            status: error.status,
          }
        : toOnlineAdminActionError(error);

    auditAdminAction({
      request,
      actor,
      action: input.action,
      status: "failed",
      leagueId: input.leagueId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      code: actionError.code,
    });

    return NextResponse.json(
      {
        ok: false,
        code: actionError.code,
        message: actionError.message,
      },
      { status: actionError.status },
    );
  }
}

function simulateWeekFromApi(
  input: OnlineAdminActionInput,
  actor: Awaited<ReturnType<typeof requireAdminActionSession>>,
) {
  if (!isSafeAdminEntityId(input.leagueId)) {
    throw new AdminActionError("Liga-ID fehlt.", 400, "ADMIN_ACTION_INVALID");
  }

  return simulateOnlineLeagueWeek(input.leagueId, actor, {
    expectedSeason: input.season,
    expectedWeek: input.week,
  });
}
