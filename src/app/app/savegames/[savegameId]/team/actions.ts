"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import {
  assessTradeValueDecision,
  buildDepthChartLineupEffects,
  buildDepthChartLineupImpact,
  buildDepthChartLineupValueFeedback,
  buildReleaseEffects,
  buildRosterAssignmentEffects,
  buildRosterAssignmentValueFeedback,
  buildTransactionValueEffect,
  buildTransactionValueFeedback,
  buildTradeEffects,
} from "@/lib/actions/decision-effects";
import { requirePageUserId } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils/format";
import { parseRosterStatus } from "@/modules/shared/domain/roster-status";
import {
  extendPlayerContractForUser,
  executeTradeOfferForUser,
  moveDepthChartPlayerForUser,
  releasePlayerForUser,
  updateTeamSchemesForUser,
  updateRosterAssignmentForUser,
} from "@/modules/teams/application/team-management.service";

function teamHref(saveGameId: string, section?: string) {
  const base = `/app/savegames/${saveGameId}/team`;

  return section ? `${base}/${section}` : base;
}

export async function executeTradeOfferAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const kind = String(formData.get("kind") ?? "player-player") as
    | "player-player"
    | "send-for-future"
    | "receive-for-future";
  const managerPlayerId = String(formData.get("managerPlayerId") ?? "").trim() || null;
  const targetPlayerId = String(formData.get("targetPlayerId") ?? "").trim() || null;
  const partnerTeamId = String(formData.get("partnerTeamId") ?? "").trim() || null;
  const targetHref = teamHref(saveGameId, "trades");
  let redirectHref = targetHref;

  try {
    const result = await executeTradeOfferForUser({
      userId,
      saveGameId,
      teamId,
      kind,
      managerPlayerId,
      targetPlayerId,
      partnerTeamId,
    });

    revalidateTeamPaths(saveGameId, teamId);
    revalidatePath(targetHref);

    const valueAssessment = assessTradeValueDecision(result.review);

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Trade akzeptiert",
      message: `${result.managerPlayerName} ↔ ${result.targetPlayerName}`,
      effects: [buildTransactionValueEffect(valueAssessment), ...buildTradeEffects(result.review)],
      impact: `${valueAssessment.label}: ${valueAssessment.reason} ${result.review.reasons.join(" ")}`,
      valueFeedback: buildTransactionValueFeedback(
        valueAssessment,
        result.review.reasons.join(" "),
      ),
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Trade nicht ausgefuehrt",
      message: actionErrorMessage(error),
      effects: [{ direction: "neutral", label: "Keine Aenderung" }],
      impact: "Roster, Contracts, Cap und Depth Chart bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}

function legacyTeamBase(saveGameId: string, teamId: string) {
  return `/app/savegames/${saveGameId}/teams/${teamId}`;
}

function revalidateTeamPaths(saveGameId: string, teamId: string) {
  const legacyBase = legacyTeamBase(saveGameId, teamId);

  revalidatePath(`/app/savegames/${saveGameId}`);
  revalidatePath(`/app/savegames/${saveGameId}/finance`);
  revalidatePath(`/app/savegames/${saveGameId}/finance/contracts`);
  revalidatePath(`/app/savegames/${saveGameId}/finance/events`);
  revalidatePath(`/app/savegames/${saveGameId}/finance/free-agency`);
  revalidatePath(teamHref(saveGameId));
  revalidatePath(teamHref(saveGameId, "roster"));
  revalidatePath(teamHref(saveGameId, "depth-chart"));
  revalidatePath(teamHref(saveGameId, "contracts"));
  revalidatePath(teamHref(saveGameId, "schemes"));
  revalidatePath(teamHref(saveGameId, "gameplan"));
  revalidatePath(legacyBase);
  revalidatePath(`${legacyBase}/roster`);
  revalidatePath(`${legacyBase}/depth-chart`);
  revalidatePath(`${legacyBase}/contracts`);
  revalidatePath(`${legacyBase}/finance`);
  revalidatePath(`${legacyBase}/schemes`);
}

export async function updateRosterAssignmentAction(formData: FormData) {
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
  const targetHref = teamHref(saveGameId, "depth-chart");
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

    revalidateTeamPaths(saveGameId, teamId);

    const lineupFeedbackInput = {
      currentSlot: result.previousDepthChartSlot,
      targetSlot: result.depthChartSlot,
      playerName: result.playerName,
      playerOverall: result.playerOverall,
      positionCode: result.positionCode,
      starterOverallAfter: result.starterOverallAfter,
      starterOverallBefore: result.starterOverallBefore,
      swappedWithPlayerName: null,
      swappedWithPlayerOverall: null,
    };

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Depth Chart aktualisiert",
      message: `${result.playerName} wurde gespeichert.`,
      effects: [
        ...buildRosterAssignmentEffects(result),
        ...buildDepthChartLineupEffects(lineupFeedbackInput),
      ].slice(0, 4),
      impact: `${buildDepthChartLineupImpact(lineupFeedbackInput)} · Status: ${result.rosterStatus}${result.depthChartSlot ? ` · Slot #${result.depthChartSlot}` : " · ohne aktiven Slot"}${result.specialRole ? ` · ${result.specialRole}` : ""}${result.captainFlag ? " · Captain" : ""}${result.developmentFocus ? " · Development Focus" : ""}`,
      valueFeedback: buildRosterAssignmentValueFeedback(result),
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Depth Chart nicht gespeichert",
      message: actionErrorMessage(error),
      effects: [{ direction: "neutral", label: "Keine Aenderung" }],
      impact: "Depth Chart, Rollen und Spezialteams bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}

export async function moveDepthChartPlayerAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const currentSlotValue = String(formData.get("currentSlot") ?? "").trim();
  const targetSlotValue = String(formData.get("targetSlot") ?? "").trim();
  const targetPlayerId = String(formData.get("targetPlayerId") ?? "").trim() || null;
  const currentSlot = currentSlotValue ? Number(currentSlotValue) : null;
  const targetSlot = targetSlotValue ? Number(targetSlotValue) : null;
  const targetHref = teamHref(saveGameId, "depth-chart");
  let redirectHref = targetHref;

  try {
    const result = await moveDepthChartPlayerForUser({
      userId,
      saveGameId,
      teamId,
      playerId,
      currentSlot,
      targetSlot,
      targetPlayerId,
    });

    revalidateTeamPaths(saveGameId, teamId);

    const lineupFeedbackInput = {
      ...result,
      targetSlot: result.depthChartSlot,
    };

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Depth Chart Reihenfolge aktualisiert",
      message: result.swappedWithPlayerName
        ? `${result.playerName} tauscht mit ${result.swappedWithPlayerName}.`
        : `${result.playerName} wurde auf Slot #${result.depthChartSlot} gesetzt.`,
      effects: buildDepthChartLineupEffects(lineupFeedbackInput),
      impact: buildDepthChartLineupImpact(lineupFeedbackInput),
      valueFeedback: buildDepthChartLineupValueFeedback(lineupFeedbackInput),
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Depth Chart Reihenfolge nicht aktualisiert",
      message: actionErrorMessage(error),
      effects: [{ direction: "neutral", label: "Keine Aenderung" }],
      impact: "Depth Chart Reihenfolge bleibt unveraendert.",
    });
  }

  redirect(redirectHref);
}

export async function updateTeamSchemesAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const offenseSchemeCode = String(formData.get("offenseSchemeCode") ?? "");
  const defenseSchemeCode = String(formData.get("defenseSchemeCode") ?? "");
  const specialTeamsSchemeCode = String(formData.get("specialTeamsSchemeCode") ?? "");
  const targetHref = teamHref(saveGameId, "schemes");
  let redirectHref = targetHref;

  try {
    const result = await updateTeamSchemesForUser({
      userId,
      saveGameId,
      teamId,
      offenseSchemeCode,
      defenseSchemeCode,
      specialTeamsSchemeCode,
    });

    revalidateTeamPaths(saveGameId, teamId);
    revalidatePath(`/app/savegames/${saveGameId}/free-agents`);
    revalidatePath(`/app/savegames/${saveGameId}/finance/free-agency`);
    revalidatePath(`/app/savegames/${saveGameId}/game/setup`);

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Schemes gespeichert",
      message: "Team-Identitaet und Scheme Fit wurden aktualisiert.",
      impact: `Offense ${result.offense} · Defense ${result.defense} · Special Teams ${result.specialTeams}`,
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Schemes nicht gespeichert",
      message: actionErrorMessage(error),
      impact: "Scheme Fit und Team-Needs bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}

export async function releasePlayerAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const targetHref = teamHref(saveGameId, "roster");
  let redirectHref = targetHref;

  try {
    const result = await releasePlayerForUser({
      userId,
      saveGameId,
      teamId,
      playerId,
    });

    revalidateTeamPaths(saveGameId, teamId);
    revalidatePath(`/app/savegames/${saveGameId}/free-agents`);
    revalidatePath(`/app/savegames/${saveGameId}/finance/free-agency`);

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Spieler entlassen",
      message: `${result.playerName} wurde aus dem Kader entfernt.`,
      effects: buildReleaseEffects(result),
      impact:
        result.capHit > 0
          ? `Cap Savings ${formatCurrency(result.capSavings)} · Dead Cap ${formatCurrency(result.deadCap)}.`
          : "Kaderplatz frei. Kein aktiver Cap Hit betroffen.",
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Release nicht abgeschlossen",
      message: actionErrorMessage(error),
      effects: [{ direction: "neutral", label: "Keine Aenderung" }],
      impact: "Kader, Vertrag und Finance Events bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}

export async function releaseContractPlayerAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const targetHref = teamHref(saveGameId, "contracts");
  let redirectHref = targetHref;

  try {
    const result = await releasePlayerForUser({
      userId,
      saveGameId,
      teamId,
      playerId,
    });

    revalidateTeamPaths(saveGameId, teamId);
    revalidatePath(`/app/savegames/${saveGameId}/free-agents`);
    revalidatePath(`/app/savegames/${saveGameId}/finance/free-agency`);

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Contract Release abgeschlossen",
      message: `${result.playerName} wurde entlassen.`,
      effects: buildReleaseEffects(result),
      impact:
        result.capHit > 0
          ? `Cap Savings ${formatCurrency(result.capSavings)} · Dead Cap ${formatCurrency(result.deadCap)}.`
          : "Kaderplatz frei. Kein aktiver Cap Hit betroffen.",
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Contract Release nicht abgeschlossen",
      message: actionErrorMessage(error),
      effects: [{ direction: "neutral", label: "Keine Aenderung" }],
      impact: "Kader, Vertrag und Cap bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}

export async function extendContractAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const years = Number(formData.get("years") ?? 1);
  const yearlySalary = Number(formData.get("yearlySalary") ?? 0);
  const targetHref = teamHref(saveGameId, "contracts");
  let redirectHref = targetHref;

  try {
    const result = await extendPlayerContractForUser({
      userId,
      saveGameId,
      teamId,
      playerId,
      years,
      yearlySalary,
    });

    revalidateTeamPaths(saveGameId, teamId);

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Vertrag verlaengert",
      message: `${result.playerName} bleibt fuer ${result.years} Jahre im Team.`,
      impact: `Cap Hit ${formatCurrency(result.previousCapHit)} -> ${formatCurrency(result.newCapHit)} · Cap Space danach ${formatCurrency(result.projectedCapSpace)}.`,
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Vertrag nicht verlaengert",
      message: actionErrorMessage(error),
      impact: "Cap, Vertrag und Kader bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}
