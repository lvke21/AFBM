"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import { requirePageUserId } from "@/lib/auth/session";
import {
  advanceWeekForUser,
  finishGameForUser,
  prepareWeekForUser,
  startGameForUser,
} from "@/modules/savegames/application/week-flow.service";
import {
  normalizeWeeklyPlanInput,
  type WeeklyOpponentFocus,
  type WeeklyPlanIntensity,
} from "@/modules/savegames/domain/weekly-plan";

function readRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function readWeeklyPlan(formData: FormData) {
  return normalizeWeeklyPlanInput({
    developmentFocusPlayerIds: formData
      .getAll("developmentFocusPlayerId")
      .map((value) => String(value)),
    intensity: String(formData.get("weeklyPlanIntensity") ?? "") as WeeklyPlanIntensity,
    opponentFocus: String(formData.get("weeklyOpponentFocus") ?? "") as WeeklyOpponentFocus,
  });
}

function dashboardHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}`;
}

function gameHref(saveGameId: string, matchId: string) {
  return `/app/savegames/${saveGameId}/game/live?matchId=${encodeURIComponent(matchId)}`;
}

function reportHref(saveGameId: string, matchId: string) {
  return `/app/savegames/${saveGameId}/game/report?matchId=${encodeURIComponent(matchId)}`;
}

function revalidateWeekFlow(saveGameId: string) {
  revalidatePath(`/app/savegames/${saveGameId}`);
  revalidatePath(`/app/savegames/${saveGameId}/inbox`);
  revalidatePath(`/app/savegames/${saveGameId}/league`);
  revalidatePath(`/app/savegames/${saveGameId}/game/setup`);
  revalidatePath(`/app/savegames/${saveGameId}/game/live`);
  revalidatePath(`/app/savegames/${saveGameId}/game/report`);
}

export async function prepareWeekAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = readRequired(formData, "saveGameId");
  let redirectHref = dashboardHref(saveGameId);

  try {
    const weeklyPlan = readWeeklyPlan(formData);
    const result = await prepareWeekForUser({ saveGameId, userId, weeklyPlan });
    revalidateWeekFlow(saveGameId);
    redirectHref = withActionFeedback(redirectHref, {
      impact: `Week state: ${result.weekState}. Wochenplan: ${weeklyPlan.intensity}, Fokus: ${weeklyPlan.developmentFocusPlayerIds.length} Spieler.`,
      message: "Die Woche wurde vorbereitet.",
      title: "Woche bereit",
      tone: "success",
    });
  } catch (error) {
    redirectHref = withActionFeedback(redirectHref, {
      impact: "Der Week-State wurde nicht veraendert.",
      message: actionErrorMessage(error),
      title: "Woche nicht vorbereitet",
      tone: "error",
    });
  }

  redirect(redirectHref);
}

export async function startGameAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = readRequired(formData, "saveGameId");
  const matchId = readRequired(formData, "matchId");
  let redirectHref = gameHref(saveGameId, matchId);

  try {
    const result = await startGameForUser({ matchId, saveGameId, userId });
    revalidateWeekFlow(saveGameId);
    redirectHref = withActionFeedback(redirectHref, {
      impact: `Week state: ${result.weekState}. Match ${matchId} laeuft.`,
      message: "Das Spiel wurde gestartet.",
      title: "Game gestartet",
      tone: "success",
    });
  } catch (error) {
    redirectHref = withActionFeedback(dashboardHref(saveGameId), {
      impact: "Match und Week-State bleiben unveraendert.",
      message: actionErrorMessage(error),
      title: "Game nicht gestartet",
      tone: "error",
    });
  }

  redirect(redirectHref);
}

export async function finishGameAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = readRequired(formData, "saveGameId");
  const matchId = readRequired(formData, "matchId");
  let redirectHref = reportHref(saveGameId, matchId);

  try {
    const result = await finishGameForUser({
      matchId,
      saveGameId,
      userId,
    });
    revalidateWeekFlow(saveGameId);
    redirectHref = withActionFeedback(redirectHref, {
      impact: `Week state: ${result.weekState}. Ergebnis wurde gespeichert.`,
      message: "Das Spiel wurde abgeschlossen.",
      title: "Game abgeschlossen",
      tone: "success",
    });
  } catch (error) {
    redirectHref = withActionFeedback(gameHref(saveGameId, matchId), {
      impact: "Match und Week-State bleiben unveraendert.",
      message: actionErrorMessage(error),
      title: "Game nicht abgeschlossen",
      tone: "error",
    });
  }

  redirect(redirectHref);
}

export async function advanceWeekAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = readRequired(formData, "saveGameId");
  let redirectHref = dashboardHref(saveGameId);

  try {
    const result = await advanceWeekForUser({ saveGameId, userId });
    revalidateWeekFlow(saveGameId);
    redirectHref = withActionFeedback(redirectHref, {
      impact: `Neue Phase/Woche: ${result.phase} Woche ${result.week}. Week state: ${result.weekState}.`,
      message: "Die naechste Woche wurde geladen.",
      title: "Woche fortgeschrieben",
      tone: "success",
    });
  } catch (error) {
    redirectHref = withActionFeedback(redirectHref, {
      impact: "Season, Match und Week-State bleiben unveraendert.",
      message: actionErrorMessage(error),
      title: "Woche nicht fortgeschrieben",
      tone: "error",
    });
  }

  redirect(redirectHref);
}
