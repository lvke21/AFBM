import type { AdminActionActor } from "@/lib/admin/admin-action-guard";
import { LocalAdminMemoryStorage } from "@/lib/admin/local-admin-storage";
import {
  getBestAdminAutoDraftPlayer,
  getCurrentDraftUser,
  resetFantasyDraftState,
} from "@/lib/admin/online-admin-draft-use-cases";
import {
  applyOnlineRevenueSharing,
  authorizeOnlineGmRemoval,
  completeOnlineFantasyDraftIfReady,
  createOnlineLeague,
  deleteOnlineLeague,
  fillOnlineLeagueWithFakeUsers,
  getOnlineLeagueById,
  getOnlineLeagues,
  makeOnlineFantasyDraftPick,
  markOnlineTeamVacant,
  recordOnlineGmMissedWeek,
  removeOnlineGmByAdmin,
  removeOnlineLeagueUser,
  resetOnlineLeague,
  resetOnlineLeagues,
  resetWeeklyTrainingPlan,
  saveOnlineLeague,
  setAllOnlineLeagueUsersReady,
  setAllOnlineLeaguesUsersReady,
  simulateOnlineLeagueWeek as simulateLocalOnlineLeagueWeek,
  startOnlineFantasyDraft,
  startOnlineLeague,
  warnOnlineGm,
  addFakeUserToOnlineLeague,
} from "@/lib/online/online-league-service";
import { normalizeOnlineLeagueCoreLifecycle } from "@/lib/online/online-league-lifecycle";
import type { OnlineLeague } from "@/lib/online/online-league-types";
import type {
  OnlineAdminActionInput,
  OnlineAdminActionResult,
} from "./online-admin-actions";

type LocalAdminActionValidationContext = {
  createValidationError: (message: string) => Error;
  isDevelopmentOrTestRuntime: () => boolean;
  requireCreateLeagueMaxUsers: (input: OnlineAdminActionInput) => number;
  requireCreateLeagueName: (input: OnlineAdminActionInput) => string;
  requireExpectedSimulationStep: (input: OnlineAdminActionInput) => {
    season: number;
    week: number;
  };
  requireLeagueId: (input: OnlineAdminActionInput) => string;
  requireReason: (input: OnlineAdminActionInput) => string;
  requireTargetUserId: (input: OnlineAdminActionInput) => string;
};

export function executeLocalOnlineAdminAction(
  input: OnlineAdminActionInput,
  actor: AdminActionActor,
  context: LocalAdminActionValidationContext,
): OnlineAdminActionResult {
  const storage = new LocalAdminMemoryStorage(input.localState);
  let league: OnlineLeague | null = null;
  let leagues: OnlineLeague[] | undefined;
  let message = "Admin-Aktion wurde ausgeführt.";
  let resetCurrentUser = false;

  switch (input.action) {
    case "listLeagues":
      leagues = getOnlineLeagues(storage);
      message = "Ligen geladen.";
      break;
    case "getLeague":
      league = getOnlineLeagueById(context.requireLeagueId(input), storage);
      message = league ? "Liga geladen." : "Liga konnte nicht gefunden werden.";
      break;
    case "createLeague":
      league = createOnlineLeague(
        {
          name: context.requireCreateLeagueName(input),
          maxUsers: context.requireCreateLeagueMaxUsers(input),
          startWeek: input.startWeek,
        },
        storage,
      );
      message = `${league.name} wurde erstellt.`;
      break;
    case "deleteLeague":
      leagues = deleteOnlineLeague(context.requireLeagueId(input), storage);
      message = "Liga wurde gelöscht.";
      break;
    case "resetLeague":
      league = resetOnlineLeague(context.requireLeagueId(input), storage);
      message = "Liga wurde zurückgesetzt.";
      break;
    case "debugDeleteAllLeagues":
      resetOnlineLeagues(storage);
      leagues = [];
      message = "Alle lokalen Ligen wurden gelöscht.";
      break;
    case "debugAddFakeUser":
      league = addFakeUserToOnlineLeague(storage);
      message = "Fake User wurde hinzugefügt.";
      break;
    case "debugFillLeague":
      league = fillOnlineLeagueWithFakeUsers(storage);
      message = "Liga wurde mit Debug-Spielern gefüllt.";
      break;
    case "debugSetAllReady":
      leagues = setAllOnlineLeaguesUsersReady(storage);
      message = "Alle Spieler wurden auf Ready gesetzt.";
      break;
    case "debugResetOnlineState":
      resetOnlineLeagues(storage);
      leagues = [];
      resetCurrentUser = true;
      message = "Online State wurde zurückgesetzt.";
      break;
    case "setAllReady":
      league = setAllOnlineLeagueUsersReady(context.requireLeagueId(input), storage);
      message = "Alle Spieler wurden auf Ready gesetzt.";
      break;
    case "startLeague":
      league = startOnlineLeague(context.requireLeagueId(input), storage);
      message = "Liga wurde gestartet.";
      break;
    case "initializeFantasyDraft": {
      const leagueId = context.requireLeagueId(input);
      const currentLeague = getOnlineLeagueById(leagueId, storage);

      league = currentLeague ? saveOnlineLeague(resetFantasyDraftState(currentLeague), storage) : null;
      message = "Fantasy Draft wurde initialisiert.";
      break;
    }
    case "startFantasyDraft":
      league = startOnlineFantasyDraft(context.requireLeagueId(input), storage);
      message = "Fantasy Draft wurde gestartet.";
      break;
    case "autoDraftNextFantasyDraft": {
      const leagueId = context.requireLeagueId(input);
      const currentLeague = getOnlineLeagueById(leagueId, storage);
      const player = currentLeague ? getBestAdminAutoDraftPlayer(currentLeague) : null;
      const user = currentLeague ? getCurrentDraftUser(currentLeague) : null;

      if (!currentLeague || !player || !user || !currentLeague.fantasyDraft) {
        league = currentLeague;
        message = "Auto-Draft konnte keinen gueltigen Pick finden.";
        break;
      }

      const result = makeOnlineFantasyDraftPick(
        leagueId,
        currentLeague.fantasyDraft.currentTeamId,
        player.playerId,
        user.userId,
        storage,
      );

      league = result.league;
      message = result.message;
      break;
    }
    case "autoDraftToEndFantasyDraft": {
      const leagueId = context.requireLeagueId(input);
      let currentLeague = getOnlineLeagueById(leagueId, storage);
      let picksMade = 0;

      while (
        currentLeague &&
        normalizeOnlineLeagueCoreLifecycle({
          league: currentLeague,
          requiresDraft: Boolean(currentLeague.fantasyDraft),
        }).draftStatus === "active"
      ) {
        const player = getBestAdminAutoDraftPlayer(currentLeague);
        const user = getCurrentDraftUser(currentLeague);
        const currentDraft = currentLeague.fantasyDraft;

        if (!player || !user || !currentDraft?.currentTeamId) {
          break;
        }

        const result = makeOnlineFantasyDraftPick(
          leagueId,
          currentDraft.currentTeamId,
          player.playerId,
          user.userId,
          storage,
        );

        if (result.status !== "success" && result.status !== "completed") {
          currentLeague = result.league;
          break;
        }

        currentLeague = result.league;
        picksMade += 1;
      }

      league = currentLeague;
      message = `Auto-Draft ausgefuehrt: ${picksMade} Picks.`;
      break;
    }
    case "completeFantasyDraftIfReady":
      league = completeOnlineFantasyDraftIfReady(context.requireLeagueId(input), storage);
      message =
        league &&
        normalizeOnlineLeagueCoreLifecycle({
          league,
          requiresDraft: Boolean(league.fantasyDraft),
        }).draftStatus === "completed"
          ? "Fantasy Draft abgeschlossen. Liga ist bereit fuer Week 1."
          : "Fantasy Draft ist noch nicht vollstaendig.";
      break;
    case "resetFantasyDraft": {
      if (!context.isDevelopmentOrTestRuntime()) {
        throw context.createValidationError("Draft Reset ist nur in Development/Test erlaubt.");
      }

      const currentLeague = getOnlineLeagueById(context.requireLeagueId(input), storage);
      league = currentLeague ? saveOnlineLeague(resetFantasyDraftState(currentLeague), storage) : null;
      message = "Fantasy Draft wurde zurueckgesetzt.";
      break;
    }
    case "removePlayer":
      league = removeOnlineLeagueUser(
        context.requireLeagueId(input),
        context.requireTargetUserId(input),
        storage,
      );
      message = "Spieler wurde aus der Liga entfernt.";
      break;
    case "simulateWeek": {
      const leagueId = context.requireLeagueId(input);
      const expectedStep = context.requireExpectedSimulationStep(input);
      const currentLeague = getOnlineLeagues(storage).find(
        (candidate) => candidate.id === leagueId,
      );

      if (!currentLeague) {
        league = null;
        message = "Liga konnte nicht gefunden werden.";
        break;
      }

      if ((currentLeague.currentSeason ?? 1) !== expectedStep.season || currentLeague.currentWeek !== expectedStep.week) {
        league = currentLeague;
        message = "Die Woche wurde bereits weitergeschaltet.";
        break;
      }

      const lifecycle = normalizeOnlineLeagueCoreLifecycle({
        league: currentLeague,
        requiresDraft: Boolean(currentLeague.fantasyDraft),
      });

      if (!lifecycle.canSimulate) {
        league = currentLeague;
        message =
          lifecycle.reasons[0] ??
          "Week-Simulation ist gesperrt, bis alle aktiven Teams ready sind.";
        break;
      }

      league = simulateLocalOnlineLeagueWeek(leagueId, storage, {
        simulatedByUserId: actor.adminUserId,
      });
      message = "Die Woche wurde simuliert. Die nächste Week ist vorbereitet.";
      break;
    }
    case "applyRevenueSharing":
      league = applyOnlineRevenueSharing(context.requireLeagueId(input), storage);
      message = "Revenue Sharing wurde angewendet.";
      break;
    case "resetTrainingPlan":
      league = resetWeeklyTrainingPlan(
        context.requireLeagueId(input),
        context.requireTargetUserId(input),
        Math.max(1, Math.floor(input.season ?? 1)),
        Math.max(1, Math.floor(input.week ?? 1)),
        storage,
      );
      message = "Trainingsplan wurde zurückgesetzt.";
      break;
    case "recordMissedWeek":
      league = recordOnlineGmMissedWeek(
        context.requireLeagueId(input),
        context.requireTargetUserId(input),
        storage,
      );
      message = "Verpasste Woche wurde erfasst.";
      break;
    case "warnGm":
      league = warnOnlineGm(
        context.requireLeagueId(input),
        context.requireTargetUserId(input),
        input.message ?? "",
        input.deadlineAt ?? "",
        storage,
      );
      message = "GM wurde verwarnt.";
      break;
    case "authorizeRemoval":
      league = authorizeOnlineGmRemoval(
        context.requireLeagueId(input),
        context.requireTargetUserId(input),
        context.requireReason(input),
        storage,
      );
      message = "Entlassung wurde ermächtigt.";
      break;
    case "adminRemoveGm":
      league = removeOnlineGmByAdmin(
        context.requireLeagueId(input),
        context.requireTargetUserId(input),
        context.requireReason(input),
        storage,
      );
      message = "GM wurde entfernt und das Team ist vakant.";
      break;
    case "markVacant":
      league = markOnlineTeamVacant(
        context.requireLeagueId(input),
        context.requireTargetUserId(input),
        context.requireReason(input),
        storage,
      );
      message = "Team wurde als vakant markiert.";
      break;
    default:
      throw context.createValidationError("Unbekannte Admin-Aktion.");
  }

  return {
    ok: true,
    message,
    league,
    leagues: leagues ?? getOnlineLeagues(storage),
    localState: storage.toLocalState(resetCurrentUser),
  };
}
