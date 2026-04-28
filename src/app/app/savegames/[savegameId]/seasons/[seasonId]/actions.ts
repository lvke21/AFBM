"use server";

import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import { requirePageUserId } from "@/lib/auth/session";
import { advanceToNextSeasonForUser } from "@/modules/seasons/application/season-management.service";
import { simulateSeasonWeekForUser } from "@/modules/seasons/application/season-simulation.service";

export async function simulateSeasonWeekAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const targetHref = `/app/savegames/${saveGameId}/league`;
  let redirectHref = targetHref;

  try {
    await simulateSeasonWeekForUser({
      userId,
      saveGameId,
      seasonId,
    });

    redirectHref = withActionFeedback(targetHref, {
      impact: "Standings, Schedule, Records und Match-Reports wurden neu geladen.",
      message: "Die aktuelle Woche wurde simuliert.",
      title: "Woche simuliert",
      tone: "success",
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      impact: "Saison, Matches und Records bleiben unveraendert.",
      message: actionErrorMessage(error),
      title: "Woche nicht simuliert",
      tone: "error",
    });
  }

  redirect(redirectHref);
}

export async function advanceToNextSeasonAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const targetHref = `/app/savegames/${saveGameId}/league`;
  let redirectHref = targetHref;

  try {
    const result = await advanceToNextSeasonForUser({
      userId,
      saveGameId,
      seasonId,
    });

    redirectHref = withActionFeedback(targetHref, {
      impact: result
        ? `Neue aktive Saison: ${result.year}. Schedule, Spielerstatus und Vertrage wurden fortgeschrieben.`
        : "Es wurde keine neue Saison erstellt.",
      message: result
        ? "Die naechste Saison ist aktiv."
        : "Die Saison konnte nicht gewechselt werden.",
      title: result ? "Saison fortgeschrieben" : "Saison unveraendert",
      tone: result ? "success" : "error",
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      impact: "Aktive Saison, Schedule und Roster bleiben unveraendert.",
      message: actionErrorMessage(error),
      title: "Saisonwechsel fehlgeschlagen",
      tone: "error",
    });
  }

  redirect(redirectHref);
}
