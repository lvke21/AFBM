"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import { requirePageUserId } from "@/lib/auth/session";
import { scoutProspectForUser } from "@/modules/draft/application/scouting-command.service";

function scoutingHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/development/scouting`;
}

export async function scoutProspectAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const draftPlayerId = String(formData.get("draftPlayerId") ?? "");
  const targetHref = scoutingHref(saveGameId);
  let redirectHref = targetHref;

  try {
    const result = await scoutProspectForUser({
      userId,
      saveGameId,
      draftPlayerId,
    });

    revalidatePath(targetHref);

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: result.changed ? "Prospect gescoutet" : "Scouting bereits vollstaendig",
      message: `${result.prospectName}: ${result.previousLevel} -> ${result.nextLevel}.`,
      impact: result.changed
        ? "Neue Informationen sind im Draft Board sichtbar."
        : "Der Prospect ist bereits auf Focus-Level gescoutet.",
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Scouting nicht abgeschlossen",
      message: actionErrorMessage(error),
      impact: "Draft Board und Scouting-Daten bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}
