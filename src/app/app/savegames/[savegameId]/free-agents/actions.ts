"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import {
  assessPlayerValueDecision,
  buildSigningEffects,
  buildTransactionValueEffect,
  buildTransactionValueFeedback,
} from "@/lib/actions/decision-effects";
import { requirePageUserId } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils/format";
import { signFreeAgentForUser } from "@/modules/teams/application/team-management.service";

export async function signFreeAgentAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const years = Number(formData.get("years") ?? 1);
  const yearlySalary = Number(formData.get("yearlySalary") ?? 850000);
  const targetHref = `/app/savegames/${saveGameId}/finance/free-agency`;
  let redirectHref = targetHref;

  try {
    const result = await signFreeAgentForUser({
      userId,
      saveGameId,
      teamId,
      playerId,
      years,
      yearlySalary,
    });

    revalidatePath(targetHref);
    revalidatePath(`/app/savegames/${saveGameId}/free-agents`);
    revalidatePath(`/app/savegames/${saveGameId}`);
    revalidatePath(`/app/savegames/${saveGameId}/team`);
    revalidatePath(`/app/savegames/${saveGameId}/team/roster`);
    revalidatePath(`/app/savegames/${saveGameId}/team/depth-chart`);
    revalidatePath(`/app/savegames/${saveGameId}/teams/${teamId}`);
    revalidatePath(`/app/savegames/${saveGameId}/teams/${teamId}/roster`);
    revalidatePath(`/app/savegames/${saveGameId}/teams/${teamId}/depth-chart`);
    revalidatePath(`/app/savegames/${saveGameId}/teams/${teamId}/finance`);
    revalidatePath(`/app/savegames/${saveGameId}/finance`);

    const valueAssessment = assessPlayerValueDecision({
      label: result.valueLabel,
      score: result.valueScore,
    });

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Free Agent verpflichtet",
      message: `${result.playerName} ist jetzt im Kader.`,
      effects: [buildTransactionValueEffect(valueAssessment), ...buildSigningEffects(result)],
      impact: `${valueAssessment.label}: ${valueAssessment.reason} · ${result.valueReason} · Cap Hit ${formatCurrency(result.capHit)} · Signing Bonus ${formatCurrency(result.signingBonus)} · Rolle ${result.rosterStatus}${result.depthChartSlot ? ` · Slot #${result.depthChartSlot}` : ""}`,
      valueFeedback: buildTransactionValueFeedback(
        valueAssessment,
        `${result.valueReason} Rolle ${result.rosterStatus}${result.depthChartSlot ? ` · Slot #${result.depthChartSlot}` : ""}`,
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Player rejected the offer")
        ? "Der Spieler lehnt das Angebot ab. Er erwartet am Markt bessere Konditionen."
        : actionErrorMessage(error);

    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Signing nicht abgeschlossen",
      message,
      effects: [{ direction: "neutral", label: "Keine Aenderung" }],
      impact: "Kader, Cap Space und Cash bleiben unveraendert.",
    });
  }

  redirect(redirectHref);
}
