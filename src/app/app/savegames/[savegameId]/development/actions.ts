"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import { requirePageUserId } from "@/lib/auth/session";
import { parseRosterStatus } from "@/modules/shared/domain/roster-status";
import { updateRosterAssignmentForUser } from "@/modules/teams/application/team-management.service";

function developmentHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/development`;
}

function teamHref(saveGameId: string, section?: string) {
  const base = `/app/savegames/${saveGameId}/team`;

  return section ? `${base}/${section}` : base;
}

function revalidateDevelopmentPaths(saveGameId: string, teamId: string) {
  const legacyBase = `/app/savegames/${saveGameId}/teams/${teamId}`;

  revalidatePath(`/app/savegames/${saveGameId}`);
  revalidatePath(developmentHref(saveGameId));
  revalidatePath(`${developmentHref(saveGameId)}/training`);
  revalidatePath(teamHref(saveGameId));
  revalidatePath(teamHref(saveGameId, "roster"));
  revalidatePath(teamHref(saveGameId, "depth-chart"));
  revalidatePath(legacyBase);
  revalidatePath(`${legacyBase}/roster`);
  revalidatePath(`${legacyBase}/depth-chart`);
}

export async function setDevelopmentFocusAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const depthChartValue = String(formData.get("depthChartSlot") ?? "").trim();
  const depthChartSlot = depthChartValue ? Number(depthChartValue) : null;
  const rosterStatus = String(formData.get("rosterStatus") ?? "BACKUP");
  const captainFlag = formData.get("captainFlag") === "on";
  const developmentFocus = formData.get("developmentFocus") === "on";
  const specialRole = String(formData.get("specialRole") ?? "").trim() || null;
  const targetHref = developmentHref(saveGameId);
  let redirectHref = targetHref;

  try {
    const result = await updateRosterAssignmentForUser({
      userId,
      saveGameId,
      teamId,
      playerId,
      depthChartSlot,
      rosterStatus: parseRosterStatus(rosterStatus),
      captainFlag,
      developmentFocus,
      specialRole,
    });

    revalidateDevelopmentPaths(saveGameId, teamId);

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: developmentFocus ? "Training Focus gesetzt" : "Training Focus entfernt",
      message: `${result.playerName} wurde aktualisiert.`,
      effects: [
        {
          direction: result.developmentFocus ? "up" : "neutral",
          label: result.developmentFocus ? "Entwicklung fokussiert" : "Fokus entfernt",
        },
      ],
      impact: `${result.positionCode} · ${result.rosterStatus}${result.depthChartSlot ? ` · Slot #${result.depthChartSlot}` : " · ohne aktiven Slot"}${result.developmentFocus ? " · Development Focus" : ""}`,
      valueFeedback: {
        impact: result.developmentFocus ? "positive" : "neutral",
        reason: result.developmentFocus
          ? "Guter Value fuer Entwicklung: Der Spieler bekommt klare Trainingsprioritaet."
          : "Fokus geloest: Der Spieler bleibt im Kader, aber ohne besondere Trainingsprioritaet.",
        context: "Training Focus",
      },
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Training Focus nicht gespeichert",
      message: actionErrorMessage(error),
      effects: [{ direction: "neutral", label: "Keine Aenderung" }],
      impact: "Development Focus und Rosterrolle bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}
