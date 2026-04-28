"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import { requirePageUserId } from "@/lib/auth/session";
import { parsePreGameXFactorPlan } from "@/modules/gameplay/domain/pre-game-x-factor";
import { updateMatchPreparationForUser } from "@/modules/seasons/application/match-preparation.service";

export async function updateGamePreparationAction(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const offenseSchemeCode = String(formData.get("offenseSchemeCode") ?? "");
  const defenseSchemeCode = String(formData.get("defenseSchemeCode") ?? "");
  const specialTeamsSchemeCode = String(formData.get("specialTeamsSchemeCode") ?? "");
  const offenseXFactorPlan = parsePreGameXFactorPlan({
    aggression: formData.get("offenseAggression"),
    offensiveFocus: formData.get("offensiveFocus"),
    offensiveMatchupFocus: formData.get("offensiveMatchupFocus"),
    protectionPlan: formData.get("protectionPlan"),
    tempoPlan: formData.get("tempoPlan"),
    turnoverPlan: formData.get("offenseTurnoverPlan"),
  });
  const defenseXFactorPlan = parsePreGameXFactorPlan({
    aggression: formData.get("defenseAggression"),
    defensiveFocus: formData.get("defensiveFocus"),
    defensiveMatchupFocus: formData.get("defensiveMatchupFocus"),
    turnoverPlan: formData.get("defenseTurnoverPlan"),
  });
  const targetHref = `/app/savegames/${saveGameId}/game/setup?matchId=${encodeURIComponent(matchId)}`;
  let redirectHref = targetHref;

  try {
    const result = await updateMatchPreparationForUser({
      userId,
      saveGameId,
      matchId,
      teamId,
      offenseSchemeCode,
      defenseSchemeCode,
      specialTeamsSchemeCode,
      offenseXFactorPlan,
      defenseXFactorPlan,
    });

    revalidatePath(`/app/savegames/${saveGameId}/game/setup`);
    revalidatePath(`/app/savegames/${saveGameId}/team/schemes`);
    revalidatePath(`/app/savegames/${saveGameId}/team/gameplan`);
    revalidatePath(`/app/savegames/${saveGameId}/finance/free-agency`);
    revalidatePath(`/app/savegames/${saveGameId}/teams/${teamId}/schemes`);
    revalidatePath(`/app/savegames/${saveGameId}/free-agents`);

    redirectHref = withActionFeedback(targetHref, {
      tone: "success",
      title: "Gameplan gespeichert",
      message: "Pre-Game Setup und Team-Schemes wurden aktualisiert.",
      impact: result.schemes
        ? `Offense ${result.schemes.offense} · Defense ${result.schemes.defense} · ${result.offenseXFactorPlan.offensiveFocus}/${result.defenseXFactorPlan.defensiveFocus}`
        : `Offense ${offenseSchemeCode} · Defense ${defenseSchemeCode} · Special Teams ${specialTeamsSchemeCode}`,
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      tone: "error",
      title: "Gameplan nicht gespeichert",
      message: actionErrorMessage(error),
      impact: "Pre-Game Setup bleibt unveraendert.",
    });
  }

  redirect(redirectHref);
}
