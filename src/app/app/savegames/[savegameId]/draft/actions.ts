"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import { requirePageUserId } from "@/lib/auth/session";
import { pickDraftPlayerForUser } from "@/modules/draft/application/draft-pick.service";

function draftHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/draft`;
}

export async function pickDraftPlayerAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const draftPlayerId = String(formData.get("draftPlayerId") ?? "");
  const targetHref = draftHref(saveGameId);
  let redirectHref = targetHref;

  try {
    const result = await pickDraftPlayerForUser({
      userId,
      saveGameId,
      draftPlayerId,
    });

    revalidatePath(targetHref);

    redirectHref = withActionFeedback(targetHref, {
      actionHref: `/app/savegames/${saveGameId}/team/roster`,
      actionLabel: "Roster und Needs pruefen",
      tone: "success",
      title: "Prospect gedraftet",
      message: `${result.prospectName} wurde von deinem Team ausgewaehlt.`,
      impact: `Round ${result.round} · Pick ${result.pickNumber}. Rookie Rights sind im Draft Board sichtbar.`,
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Pick nicht abgeschlossen",
      message: actionErrorMessage(error),
      impact: "Draft Board und Team-Zuordnung bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}
