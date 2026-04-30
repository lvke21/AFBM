"use server";

import { redirect } from "next/navigation";

import { withActionFeedback } from "@/lib/actions/action-feedback";
import { requirePageUserId } from "@/lib/auth/session";
import {
  createSaveGame,
  saveGameCreationErrorMessage,
} from "@/modules/savegames/application/savegame-command.service";

export async function createSaveGameAction(formData: FormData) {
  const userId = await requirePageUserId();
  const name = String(formData.get("name") ?? "");
  const managerTeamAbbreviation =
    String(formData.get("managerTeamAbbreviation") ?? "").trim() || undefined;
  let redirectHref = "/app/savegames";

  try {
    const saveGame = await createSaveGame({
      userId,
      name,
      managerTeamAbbreviation,
    });

    redirectHref = withActionFeedback(`/app/savegames/${saveGame.id}`, {
      impact: `Manager-Team ${managerTeamAbbreviation ?? "automatisch"} · Saisonkontext wurde initialisiert.`,
      message: `${name.trim() || "Neues Savegame"} wurde angelegt und ist jetzt bereit.`,
      title: "Savegame erstellt",
      tone: "success",
    });
  } catch (error) {
    redirectHref = withActionFeedback("/app/savegames", {
      impact: "Es wurde kein neuer Spielstand angelegt.",
      message: saveGameCreationErrorMessage(error),
      title: "Savegame nicht erstellt",
      tone: "error",
    });
  }

  redirect(redirectHref);
}
