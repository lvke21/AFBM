import { FieldValue, type Transaction } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import {
  createPreparedMultiplayerDraftState,
  getNextPreparedMultiplayerDraftState,
  validatePreparedMultiplayerDraftPick,
} from "../../src/lib/online/multiplayer-draft-logic";
import type {
  FirestoreOnlineDraftAvailablePlayerDoc,
  FirestoreOnlineDraftPickDoc,
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineTeamDoc,
} from "../../src/lib/online/types";
import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
  OnlineFantasyDraftState,
} from "../../src/lib/online/online-league-types";
import {
  MULTIPLAYER_TEST_LEAGUE_ID,
  MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
  MULTIPLAYER_TEST_LEAGUE_SLUG,
  MULTIPLAYER_TEST_LEAGUE_TEAMS,
} from "./multiplayer-test-league-firestore-seed";
import { MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID } from "./multiplayer-player-pool-firestore-seed";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./multiplayer-firestore-env";

export const MULTIPLAYER_DRAFT_PREPARED_AT = "2026-05-01T11:00:00.000Z";
export const MULTIPLAYER_DRAFT_ACTOR_ID = "server-draft-foundation";

type DraftPlayerResult =
  | {
      status: "success" | "completed";
      pick: OnlineFantasyDraftPick;
      nextState: OnlineFantasyDraftState;
      message: string;
    }
  | {
      status:
        | "missing-league"
        | "missing-draft"
        | "draft-inconsistent"
        | "draft-not-active"
        | "missing-team"
        | "wrong-team"
        | "missing-player"
        | "player-unavailable"
        | "roster-limit";
      message: string;
    };

function toFirestoreDraftStateDoc(
  state: OnlineFantasyDraftState,
  draftRunId = MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
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
    seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
    testData: true,
    leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
    createdBySeed: true,
  };
}

function toLocalDraftState(
  draftDoc: FirestoreOnlineDraftStateDoc,
  picks: OnlineFantasyDraftPick[],
  availablePlayerIds: string[],
): OnlineFantasyDraftState {
  return {
    leagueId: draftDoc.leagueId,
    status: draftDoc.status,
    round: draftDoc.round,
    pickNumber: draftDoc.pickNumber,
    currentTeamId: draftDoc.currentTeamId,
    draftOrder: draftDoc.draftOrder,
    picks,
    availablePlayerIds,
    startedAt: draftDoc.startedAt,
    completedAt: draftDoc.completedAt,
  };
}

async function readAvailablePlayers(leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore
    .collection("leagues")
    .doc(leagueId)
    .collection("draft")
    .doc("main")
    .collection("availablePlayers")
    .get();

  return snapshot.docs.map((document) => document.data() as FirestoreOnlineDraftAvailablePlayerDoc);
}

export function buildPreparedMultiplayerDraftState(
  availablePlayerIds: string[],
  leagueId = MULTIPLAYER_TEST_LEAGUE_ID,
) {
  return createPreparedMultiplayerDraftState({
    leagueId,
    teamIds: MULTIPLAYER_TEST_LEAGUE_TEAMS.map((team) => team.id),
    availablePlayerIds,
    startedAt: MULTIPLAYER_DRAFT_PREPARED_AT,
    draftRunId: MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
  });
}

export async function prepareMultiplayerDraft(leagueId = MULTIPLAYER_TEST_LEAGUE_ID) {
  const environment = configureMultiplayerFirestoreEnvironment();
  logMultiplayerFirestoreEnvironment(environment, "prepare multiplayer draft");

  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const draftRef = leagueRef.collection("draft").doc("main");
  const availablePlayers = await readAvailablePlayers(leagueId);

  if (availablePlayers.length === 0) {
    throw new Error("Cannot prepare multiplayer draft without available players.");
  }

  const state = buildPreparedMultiplayerDraftState(
    availablePlayers.map((player) => player.playerId),
    leagueId,
  );
  const batch = firestore.batch();

  batch.set(draftRef, toFirestoreDraftStateDoc(state), { merge: true });
  batch.set(
    leagueRef,
    {
      updatedAt: MULTIPLAYER_DRAFT_PREPARED_AT,
      settings: {
        foundationStatus: "draft_ready",
        draftPrepared: true,
        draftRunId: MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
        seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
        testData: true,
        leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        createdBySeed: true,
      },
      version: FieldValue.increment(1),
    },
    { merge: true },
  );
  batch.set(leagueRef.collection("events").doc("foundation-draft-prepared"), {
    type: "fantasy_draft_initialized",
    createdAt: MULTIPLAYER_DRAFT_PREPARED_AT,
    createdByUserId: MULTIPLAYER_DRAFT_ACTOR_ID,
    payload: {
      source: "multiplayer-draft-prep-firestore-seed",
      seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
      testData: true,
      draftOrder: state.draftOrder,
      playerCount: availablePlayers.length,
    },
  });

  await withMultiplayerFirestoreTimeout(batch.commit(), "prepare multiplayer draft", environment);

  return {
    leagueId,
    status: state.status,
    round: state.round,
    pickNumber: state.pickNumber,
    currentTeamId: state.currentTeamId,
    draftOrder: state.draftOrder,
    availablePlayerCount: availablePlayers.length,
  };
}

function sortPickDocuments(picks: FirestoreOnlineDraftPickDoc[]) {
  return [...picks].sort((left, right) => left.pickNumber - right.pickNumber);
}

async function readDraftTransactionData(
  transaction: Transaction,
  leagueId: string,
  playerId: string,
) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const draftRef = leagueRef.collection("draft").doc("main");
  const [leagueSnapshot, draftSnapshot, teamsSnapshot, availablePlayersSnapshot, picksSnapshot, playerSnapshot] =
    await Promise.all([
      transaction.get(leagueRef),
      transaction.get(draftRef),
      transaction.get(leagueRef.collection("teams")),
      transaction.get(draftRef.collection("availablePlayers")),
      transaction.get(draftRef.collection("picks")),
      transaction.get(draftRef.collection("availablePlayers").doc(playerId)),
    ]);

  return {
    leagueRef,
    draftRef,
    league: leagueSnapshot.exists ? (leagueSnapshot.data() as FirestoreOnlineLeagueDoc) : null,
    draftDoc: draftSnapshot.exists ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc) : null,
    teams: teamsSnapshot.docs.map((document) => document.data() as FirestoreOnlineTeamDoc),
    availablePlayers: availablePlayersSnapshot.docs.map(
      (document) => document.data() as FirestoreOnlineDraftAvailablePlayerDoc,
    ),
    picks: sortPickDocuments(
      picksSnapshot.docs.map((document) => document.data() as FirestoreOnlineDraftPickDoc),
    ),
    playerSnapshot,
  };
}

export async function draftMultiplayerPlayer(
  leagueId: string,
  teamId: string,
  playerId: string,
): Promise<DraftPlayerResult> {
  const environment = configureMultiplayerFirestoreEnvironment();
  logMultiplayerFirestoreEnvironment(environment, "draft multiplayer player");

  const firestore = getFirebaseAdminFirestore();

  return withMultiplayerFirestoreTimeout(firestore.runTransaction(async (transaction) => {
    const data = await readDraftTransactionData(transaction, leagueId, playerId);

    if (!data.league) {
      return {
        status: "missing-league",
        message: "Liga konnte nicht gefunden werden.",
      };
    }

    const team = data.teams.find((candidate) => candidate.id === teamId);
    const picks = data.picks.map((pick) => ({
      pickNumber: pick.pickNumber,
      round: pick.round,
      teamId: pick.teamId,
      playerId: pick.playerId,
      pickedByUserId: pick.pickedByUserId,
      timestamp: pick.timestamp,
    }));
    const availablePlayerIds = data.availablePlayers.map((player) => player.playerId);
    const state = data.draftDoc
      ? toLocalDraftState(data.draftDoc, picks, availablePlayerIds)
      : null;
    const validation = validatePreparedMultiplayerDraftPick({
      state,
      teamIds: data.teams.map((candidate) => candidate.id),
      teamId,
      playerId,
      availablePlayers: data.availablePlayers,
      existingPicks: picks,
      rosterSize: team?.contractRoster?.length ?? picks.filter((pick) => pick.teamId === teamId).length,
    });

    if (!validation.ok) {
      return {
        status: validation.status,
        message: validation.message,
      };
    }

    if (!state || !team) {
      return {
        status: "missing-team",
        message: "Team gehoert nicht zu dieser Liga.",
      };
    }

    const now = new Date().toISOString();
    const selectedPlayer: OnlineContractPlayer = {
      ...validation.player,
      status: "active",
    };
    const pick: OnlineFantasyDraftPick = {
      pickNumber: state.pickNumber,
      round: state.round,
      teamId,
      playerId,
      pickedByUserId: MULTIPLAYER_DRAFT_ACTOR_ID,
      timestamp: now,
    };
    const nextPicks = [...picks, pick];
    const nextAvailablePlayerIds = availablePlayerIds.filter((candidate) => candidate !== playerId);
    const nextState = getNextPreparedMultiplayerDraftState({
      state,
      nextPicks,
      nextAvailablePlayerIds,
      now,
    });

    transaction.set(
      data.draftRef.collection("picks").doc(String(pick.pickNumber).padStart(4, "0")),
      {
        ...pick,
        draftRunId: data.draftDoc?.draftRunId ?? MULTIPLAYER_PLAYER_POOL_DRAFT_RUN_ID,
        playerSnapshot: selectedPlayer,
      } satisfies FirestoreOnlineDraftPickDoc,
    );
    transaction.delete(data.playerSnapshot.ref);
    transaction.set(data.draftRef, toFirestoreDraftStateDoc(nextState), { merge: true });
    transaction.update(data.leagueRef.collection("teams").doc(teamId), {
      contractRoster: [...(team.contractRoster ?? []), selectedPlayer],
      updatedAt: now,
    });
    transaction.update(data.leagueRef, {
      updatedAt: now,
      version: FieldValue.increment(1),
    });
    transaction.set(data.leagueRef.collection("events").doc(), {
      type: "draft_pick_made",
      createdAt: now,
      createdByUserId: MULTIPLAYER_DRAFT_ACTOR_ID,
      payload: {
        teamId,
        playerId,
        playerName: selectedPlayer.playerName,
        pickNumber: pick.pickNumber,
        round: pick.round,
      },
    });

    return {
      status: nextState.status === "completed" ? "completed" : "success",
      pick,
      nextState,
      message:
        nextState.status === "completed"
          ? "Fantasy Draft abgeschlossen."
          : "Pick gespeichert.",
    };
  }), "draft multiplayer player", environment);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  prepareMultiplayerDraft()
    .then((summary) => {
      console.log(
        `Prepared ${summary.leagueId}: ${summary.availablePlayerCount} players, current team ${summary.currentTeamId}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
