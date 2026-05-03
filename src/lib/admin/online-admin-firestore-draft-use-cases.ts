import {
  FieldValue,
  type DocumentReference,
  type Transaction,
  type WriteBatch,
} from "firebase-admin/firestore";

import type { AdminActionActor } from "@/lib/admin/admin-action-guard";
import {
  createAdminDraftDepthChart,
  getBestAdminAutoDraftPlayer,
  getCurrentDraftUser,
  getNextAdminDraftState,
} from "@/lib/admin/online-admin-draft-use-cases";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  createFantasyDraftPlayerPool,
  createInitialFantasyDraftState,
} from "@/lib/online/online-league-service";
import {
  belongsToCurrentMultiplayerDraftRun,
  getMultiplayerDraftPickDocumentId,
  isCurrentMultiplayerDraftPickDocumentOccupied,
  validateMultiplayerDraftSourceConsistency,
  validateMultiplayerDraftStateIntegrity,
} from "@/lib/online/multiplayer-draft-logic";
import { normalizeOnlineLeagueCoreLifecycle } from "@/lib/online/online-league-lifecycle";
import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
  OnlineFantasyDraftState,
  OnlineLeague,
} from "@/lib/online/online-league-types";
import type {
  FirestoreOnlineDraftAvailablePlayerDoc,
  FirestoreOnlineDraftPickDoc,
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineEventDoc,
  FirestoreOnlineLeagueDoc,
} from "@/lib/online/types";
import { readFirestoreFantasyDraftState } from "@/lib/online/repositories/firebase-online-league-mappers";
import { createSeededId } from "@/lib/random/seeded-rng";
import type {
  OnlineAdminActionInput,
  OnlineAdminActionResult,
} from "./online-admin-actions";

type CreateFirestoreAdminEvent = (
  type: string,
  actor: AdminActionActor,
  payload?: Record<string, unknown>,
) => FirestoreOnlineEventDoc;

type FirestoreAdminDraftContext = {
  actor: AdminActionActor;
  createEvent: CreateFirestoreAdminEvent;
  createValidationError: (message: string) => Error;
  input: OnlineAdminActionInput;
  leagueId: string;
  leagueRef: DocumentReference;
  mapFirestoreLeague: (leagueId: string) => Promise<OnlineLeague | null>;
};

function nowIso() {
  return new Date().toISOString();
}

function isDevelopmentOrTestRuntime() {
  return process.env.NODE_ENV !== "production";
}

export function getFirestoreDraftRef(leagueId: string) {
  return getFirebaseAdminFirestore()
    .collection("leagues")
    .doc(leagueId)
    .collection("draft")
    .doc("main");
}

export function createDraftRunId(leagueId: string, createdAt: string) {
  return createSeededId("draft-run", `${leagueId}:${createdAt}`, 8);
}

function toFirestoreDraftStateDoc(
  state: OnlineFantasyDraftState,
  draftRunId: string,
): FirestoreOnlineDraftStateDoc {
  return {
    leagueId: state.leagueId,
    status: state.status,
    round: state.round,
    pickNumber: state.pickNumber,
    currentTeamId: state.currentTeamId,
    draftOrder: state.draftOrder,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    draftRunId,
  };
}

function toFirestoreAvailablePlayerDoc(
  player: OnlineContractPlayer,
  draftRunId: string,
): FirestoreOnlineDraftAvailablePlayerDoc {
  return {
    ...player,
    displayName: player.playerName,
    draftRunId,
  };
}

function toFirestoreDraftPickDoc(
  pick: OnlineFantasyDraftPick,
  player: OnlineContractPlayer,
  draftRunId: string,
): FirestoreOnlineDraftPickDoc {
  return {
    ...pick,
    draftRunId,
    playerSnapshot: player,
  };
}

export async function writeFirestoreDraftPlayerPool(
  leagueId: string,
  playerPool: OnlineContractPlayer[],
  draftRunId: string,
) {
  const firestore = getFirebaseAdminFirestore();
  const draftRef = getFirestoreDraftRef(leagueId);
  const chunkSize = 400;

  for (let index = 0; index < playerPool.length; index += chunkSize) {
    const batch = firestore.batch();
    playerPool.slice(index, index + chunkSize).forEach((player) => {
      batch.set(
        draftRef.collection("availablePlayers").doc(player.playerId),
        toFirestoreAvailablePlayerDoc(player, draftRunId),
      );
    });
    await batch.commit();
  }
}

export function setFirestoreDraftState(
  writer: Transaction | WriteBatch,
  leagueId: string,
  state: OnlineFantasyDraftState,
  draftRunId: string,
) {
  (writer as WriteBatch).set(getFirestoreDraftRef(leagueId), toFirestoreDraftStateDoc(state, draftRunId), {
    merge: true,
  });
}

async function addDraftAdminAudit(input: {
  action: string;
  actor: AdminActionActor;
  leagueRef: DocumentReference;
  payload?: Record<string, unknown>;
  transaction: Transaction;
}) {
  input.transaction.set(input.leagueRef.collection("adminLogs").doc(), {
    action: input.action,
    createdAt: nowIso(),
    adminSessionId: input.actor.adminSessionId,
    adminUserId: input.actor.adminUserId,
    payload: input.payload ?? {},
  });
}

async function applyFirestoreAdminAutoDraftPick(
  context: FirestoreAdminDraftContext,
): Promise<string> {
  const firestore = getFirebaseAdminFirestore();
  const { actor, createEvent, createValidationError, leagueId, leagueRef, mapFirestoreLeague } =
    context;
  const mappedLeague = await mapFirestoreLeague(leagueId);
  const player = mappedLeague ? getBestAdminAutoDraftPlayer(mappedLeague) : null;
  const draftTeamId = mappedLeague?.fantasyDraft?.currentTeamId ?? "";
  const draftUser = mappedLeague ? getCurrentDraftUser(mappedLeague) : null;
  const draftRef = getFirestoreDraftRef(leagueId);

  if (!mappedLeague || !draftTeamId || !draftUser) {
    return "Auto-Draft konnte keinen gueltigen Pick finden.";
  }

  if (!player) {
    return "Draft-Quellen sind inkonsistent: Available-Player-Docs fehlen oder kein verfuegbarer Spieler passt.";
  }

  return firestore.runTransaction(async (transaction) => {
    const [leagueSnapshot, draftSnapshot, availablePlayerSnapshot] = await Promise.all([
      transaction.get(leagueRef),
      transaction.get(draftRef),
      transaction.get(draftRef.collection("availablePlayers").doc(player.playerId)),
    ]);
    const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

    if (!league) {
      throw createValidationError("Liga konnte nicht gefunden werden.");
    }

    const draftDoc = draftSnapshot.exists
      ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
      : null;

    if (!draftDoc) {
      return "Fantasy Draft ist nicht initialisiert. Draft Doc fehlt.";
    }

    const state = mappedLeague.fantasyDraft ?? null;

    if (!state || state.status !== "active") {
      return "Fantasy Draft ist nicht aktiv.";
    }

    const integrity = validateMultiplayerDraftStateIntegrity(state);

    if (!integrity.ok) {
      return `Draft-State ist inkonsistent: ${integrity.issues[0]?.message ?? "Bitte Draft neu laden."}`;
    }

    const playerPool = mappedLeague.fantasyDraftPlayerPool ?? [];

    if (playerPool.length === 0) {
      return "Draft-Quellen sind inkonsistent: Available-Player-Docs fehlen.";
    }

    const sourceConsistency = validateMultiplayerDraftSourceConsistency({
      state,
      playerPool,
      legacyState: readFirestoreFantasyDraftState(league),
    });

    if (!sourceConsistency.ok) {
      return `Draft-Quellen sind inkonsistent: ${sourceConsistency.issues[0]?.message ?? "Bitte Draft neu laden."}`;
    }

    const draftRunId = "draftRunId" in state && typeof state.draftRunId === "string"
      ? state.draftRunId
      : createDraftRunId(leagueId, state.startedAt ?? nowIso());
    const pickRef = draftRef
      .collection("picks")
      .doc(getMultiplayerDraftPickDocumentId(state.pickNumber));
    const pickSnapshot = await transaction.get(pickRef);
    const existingPick = pickSnapshot.exists
      ? (pickSnapshot.data() as FirestoreOnlineDraftPickDoc)
      : null;
    const availablePlayer = availablePlayerSnapshot.exists
      ? (availablePlayerSnapshot.data() as FirestoreOnlineDraftAvailablePlayerDoc)
      : null;

    if (
      state.currentTeamId !== draftTeamId ||
      !mappedLeague.fantasyDraft?.availablePlayerIds.includes(player.playerId) ||
      !belongsToCurrentMultiplayerDraftRun(availablePlayer, draftRunId) ||
      mappedLeague.fantasyDraft.picks.some((pick) => pick.playerId === player.playerId) ||
      isCurrentMultiplayerDraftPickDocumentOccupied(existingPick, draftRunId)
    ) {
      return "Draft-State wurde zwischenzeitlich aktualisiert. Bitte erneut ausfuehren.";
    }

    const now = nowIso();
    const pick: OnlineFantasyDraftPick = {
      pickNumber: state.pickNumber,
      round: state.round,
      teamId: state.currentTeamId,
      playerId: player.playerId,
      pickedByUserId: draftUser.userId,
      timestamp: now,
    };
    const currentState = mappedLeague.fantasyDraft;

    if (!currentState) {
      return "Fantasy Draft ist nicht aktiv.";
    }

    const pickedState: OnlineFantasyDraftState = {
      ...currentState,
      picks: [...currentState.picks, pick],
      availablePlayerIds: currentState.availablePlayerIds.filter((candidate) => candidate !== player.playerId),
    };
    const nextState = getNextAdminDraftState(pickedState, playerPool, now);

    transaction.set(
      pickRef,
      toFirestoreDraftPickDoc(pick, player, draftRunId),
    );
    transaction.delete(draftRef.collection("availablePlayers").doc(player.playerId));
    transaction.set(draftRef, toFirestoreDraftStateDoc(nextState, draftRunId), { merge: true });
    transaction.update(leagueRef, { updatedAt: now, version: FieldValue.increment(1) });
    transaction.set(
      leagueRef.collection("events").doc(),
      createEvent("draft_pick_made", actor, {
        teamId: pick.teamId,
        playerId: pick.playerId,
        playerName: player.playerName,
        pickNumber: pick.pickNumber,
        autoDraft: true,
      }),
    );
    await addDraftAdminAudit({
      action: "autoDraftNextFantasyDraft",
      actor,
      leagueRef,
      payload: {
        teamId: pick.teamId,
        playerId: pick.playerId,
        pickNumber: pick.pickNumber,
      },
      transaction,
    });

    if (nextState.status === "completed") {
      const playersById = new Map(playerPool.map((candidate) => [candidate.playerId, candidate]));

      nextState.draftOrder.forEach((teamId) => {
        const roster = nextState.picks
          .filter((candidate) => candidate.teamId === teamId)
          .sort((left, right) => left.pickNumber - right.pickNumber)
          .map((candidate) => playersById.get(candidate.playerId))
          .filter((candidate): candidate is OnlineContractPlayer => Boolean(candidate));

        transaction.update(leagueRef.collection("teams").doc(teamId), {
          contractRoster: roster,
          depthChart: createAdminDraftDepthChart(roster, now),
          updatedAt: now,
        });
      });
      transaction.update(leagueRef, {
        status: "active",
        currentWeek: 1,
        currentSeason: 1,
        updatedAt: now,
        version: FieldValue.increment(1),
      });
    }

    return nextState.status === "completed"
      ? "Auto-Draft Pick gespeichert. Fantasy Draft abgeschlossen."
      : "Auto-Draft Pick gespeichert.";
  });
}

export async function executeFirestoreAdminDraftAction(
  context: FirestoreAdminDraftContext,
): Promise<OnlineAdminActionResult> {
  const { actor, createEvent, createValidationError, input, leagueId, leagueRef, mapFirestoreLeague } =
    context;
  const firestore = getFirebaseAdminFirestore();

  switch (input.action) {
    case "initializeFantasyDraft": {
      const createdAt = nowIso();
      let playerPool: OnlineContractPlayer[] = [];
      let draftRunId = "";
      await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw createValidationError("Liga konnte nicht gefunden werden.");
        }

        const draftState = createInitialFantasyDraftState(leagueId, league.maxTeams);
        playerPool = createFantasyDraftPlayerPool(leagueId, league.maxTeams);
        draftRunId = createDraftRunId(leagueId, createdAt);
        setFirestoreDraftState(transaction, leagueId, draftState, draftRunId);
        transaction.update(leagueRef, {
          status: "lobby",
          currentWeek: 1,
          currentSeason: 1,
          "settings.onlineBackbone": true,
          "settings.fantasyDraft": FieldValue.delete(),
          "settings.fantasyDraftPlayerPool": FieldValue.delete(),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("fantasy_draft_initialized", actor),
        );
        await addDraftAdminAudit({
          action: "initializeFantasyDraft",
          actor,
          leagueRef,
          payload: { draftRunId },
          transaction,
        });
      });
      await writeFirestoreDraftPlayerPool(leagueId, playerPool, draftRunId);

      return { ok: true, message: "Fantasy Draft wurde initialisiert.", league: await mapFirestoreLeague(leagueId) };
    }
    case "autoDraftNextFantasyDraft": {
      const message = await applyFirestoreAdminAutoDraftPick(context);

      return { ok: true, message, league: await mapFirestoreLeague(leagueId) };
    }
    case "autoDraftToEndFantasyDraft": {
      let picksMade = 0;
      let mappedLeague = await mapFirestoreLeague(leagueId);

      while (
        mappedLeague &&
        normalizeOnlineLeagueCoreLifecycle({
          league: mappedLeague,
          requiresDraft: Boolean(mappedLeague.fantasyDraft),
        }).draftStatus === "active"
      ) {
        const message = await applyFirestoreAdminAutoDraftPick(context);

        if (!message.includes("gespeichert")) {
          break;
        }

        picksMade += 1;
        mappedLeague = await mapFirestoreLeague(leagueId);
      }

      return {
        ok: true,
        message: `Auto-Draft ausgefuehrt: ${picksMade} Picks.`,
        league: mappedLeague,
      };
    }
    case "completeFantasyDraftIfReady": {
      const mappedLeague = await mapFirestoreLeague(leagueId);
      const message = await firestore.runTransaction(async (transaction) => {
        const draftRef = getFirestoreDraftRef(leagueId);
        const [leagueSnapshot, draftSnapshot] = await Promise.all([
          transaction.get(leagueRef),
          transaction.get(draftRef),
        ]);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw createValidationError("Liga konnte nicht gefunden werden.");
        }

        const draftDoc = draftSnapshot.exists
          ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
          : null;
        const state = mappedLeague?.fantasyDraft ?? null;
        const playerPool = mappedLeague?.fantasyDraftPlayerPool ?? [];

        if (!state) {
          return "Fantasy Draft ist nicht initialisiert.";
        }

        if (playerPool.length === 0) {
          return "Draft-Quellen sind inkonsistent: Available-Player-Docs fehlen.";
        }

        if (draftDoc && draftDoc.pickNumber !== state.pickNumber) {
          return "Draft-State wurde zwischenzeitlich aktualisiert. Bitte erneut ausfuehren.";
        }

        const integrity = validateMultiplayerDraftStateIntegrity(state);

        if (!integrity.ok) {
          return `Draft-State ist inkonsistent: ${integrity.issues[0]?.message ?? "Bitte Draft neu laden."}`;
        }

        const sourceConsistency = validateMultiplayerDraftSourceConsistency({
          state,
          playerPool,
          legacyState: readFirestoreFantasyDraftState(league),
        });

        if (!sourceConsistency.ok) {
          return `Draft-Quellen sind inkonsistent: ${sourceConsistency.issues[0]?.message ?? "Bitte Draft neu laden."}`;
        }

        const now = nowIso();
        const nextState = getNextAdminDraftState(state, playerPool, now);
        const draftRunId = draftDoc?.draftRunId ?? createDraftRunId(leagueId, state.startedAt ?? now);

        if (nextState.status !== "completed") {
          return "Fantasy Draft ist noch nicht vollstaendig.";
        }

        const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
        nextState.draftOrder.forEach((teamId) => {
          const roster = nextState.picks
            .filter((pick) => pick.teamId === teamId)
            .sort((left, right) => left.pickNumber - right.pickNumber)
            .map((pick) => playersById.get(pick.playerId))
            .filter((player): player is OnlineContractPlayer => Boolean(player));

          transaction.update(leagueRef.collection("teams").doc(teamId), {
            contractRoster: roster,
            depthChart: createAdminDraftDepthChart(roster, now),
            updatedAt: now,
          });
        });
        transaction.update(leagueRef, {
          status: "active",
          currentWeek: 1,
          currentSeason: 1,
          "settings.fantasyDraft": FieldValue.delete(),
          "settings.fantasyDraftPlayerPool": FieldValue.delete(),
          updatedAt: now,
          version: FieldValue.increment(1),
        });
        transaction.set(draftRef, toFirestoreDraftStateDoc(nextState, draftRunId), { merge: true });
        await addDraftAdminAudit({
          action: "completeFantasyDraftIfReady",
          actor,
          leagueRef,
          payload: { draftRunId, pickCount: nextState.picks.length },
          transaction,
        });

        return "Fantasy Draft abgeschlossen. Liga ist bereit fuer Week 1.";
      });

      return { ok: true, message, league: await mapFirestoreLeague(leagueId) };
    }
    case "resetFantasyDraft": {
      if (!isDevelopmentOrTestRuntime()) {
        throw createValidationError("Draft Reset ist nur in Development/Test erlaubt.");
      }

      const createdAt = nowIso();
      let playerPool: OnlineContractPlayer[] = [];
      let draftRunId = "";
      await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw createValidationError("Liga konnte nicht gefunden werden.");
        }

        const draftState = createInitialFantasyDraftState(leagueId, league.maxTeams);
        playerPool = createFantasyDraftPlayerPool(leagueId, league.maxTeams);
        draftRunId = createDraftRunId(leagueId, createdAt);
        setFirestoreDraftState(transaction, leagueId, draftState, draftRunId);
        transaction.update(leagueRef, {
          status: "lobby",
          currentWeek: 1,
          currentSeason: 1,
          "settings.onlineBackbone": true,
          "settings.fantasyDraft": FieldValue.delete(),
          "settings.fantasyDraftPlayerPool": FieldValue.delete(),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        await addDraftAdminAudit({
          action: "resetFantasyDraft",
          actor,
          leagueRef,
          payload: { draftRunId },
          transaction,
        });
      });
      await writeFirestoreDraftPlayerPool(leagueId, playerPool, draftRunId);

      return { ok: true, message: "Fantasy Draft wurde zurueckgesetzt.", league: await mapFirestoreLeague(leagueId) };
    }
    default:
      throw createValidationError("Diese Draft-Admin-Aktion ist nicht verfügbar.");
  }
}
