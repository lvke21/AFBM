import { NextResponse, type NextRequest } from "next/server";

import {
  AdminActionError,
  adminActionErrorResponse,
  auditAdminAction,
  requireAdminActionSession,
} from "@/lib/admin/admin-action-guard";
import {
  executeOnlineAdminAction,
  toOnlineAdminActionError,
  type OnlineAdminActionInput,
} from "@/lib/admin/online-admin-actions";

export async function POST(request: NextRequest) {
  let input: OnlineAdminActionInput | null = null;
  let actor;

  try {
    input = (await request.json()) as OnlineAdminActionInput;
    actor = await requireAdminActionSession();
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
    const result = await executeOnlineAdminAction(input, actor);

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
    const actionError = toOnlineAdminActionError(error);

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
