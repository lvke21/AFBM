import {
  FieldValue,
  type DocumentReference,
} from "firebase-admin/firestore";

import {
  createAdminSimulationLockId,
  isSafeAdminEntityId,
  normalizeBoundedAdminInteger,
  normalizeExpectedAdminSimulationStep,
} from "@/lib/admin/admin-action-hardening";
import {
  assertOnlineAdminActionPolicy,
  OnlineAdminActionPolicyError,
} from "@/lib/admin/online-admin-action-policy";
import { createSeededId } from "@/lib/random/seeded-rng";
import type { AdminActionActor } from "@/lib/admin/admin-action-guard";
import type {
  LocalAdminStateInput,
  LocalAdminStateOutput,
} from "@/lib/admin/local-admin-storage";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { executeLocalOnlineAdminAction } from "@/lib/admin/online-admin-local-actions";
import {
  createDraftRunId,
  executeFirestoreAdminDraftAction,
  getFirestoreDraftRef,
  setFirestoreDraftState,
  writeFirestoreDraftPlayerPool,
} from "@/lib/admin/online-admin-firestore-draft-use-cases";
import {
  assertCanCompleteOnlineLeagueWeekSimulation,
  assertCanStartOnlineLeagueWeekSimulation,
  getOnlineLeagueSimulationLockStatus,
  isOnlineLeagueWeekSimulationLockStale,
  OnlineLeagueWeekSimulationError,
  prepareOnlineLeagueWeekSimulation,
  type OnlineLeagueWeekSimulationErrorCode,
  type OnlineLeagueWeekSimulationSummary,
} from "@/lib/admin/online-week-simulation";
import {
  createFantasyDraftPlayerPool,
  createInitialFantasyDraftState,
} from "@/lib/online/online-league-service";
import { ONLINE_MVP_TEAM_POOL } from "@/lib/online/online-league-constants";
import {
  canCreateOnlineLeagueSchedule,
  createOnlineLeagueSchedule,
} from "@/lib/online/online-league-schedule";
import type {
  OnlineLeague,
  OnlineLeagueTeam,
} from "@/lib/online/online-league-types";
import { getOnlineLeagueReadyChangeState } from "@/lib/online/online-league-week-service";
import {
  mapFirestoreSnapshotToOnlineLeague,
  mapLocalTeamToFirestoreTeam,
  type FirestoreOnlineDraftAvailablePlayerDoc,
  type FirestoreOnlineDraftPickDoc,
  type FirestoreOnlineDraftStateDoc,
  type FirestoreOnlineEventDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
  type FirestoreOnlineWeekDoc,
} from "@/lib/online/types";
import {
  createMembershipProjectionConflictMessage,
  getMembershipProjectionProblem,
  readFirestoreFantasyDraftState,
} from "@/lib/online/repositories/firebase-online-league-mappers";

export type OnlineAdminActionName =
  | "listLeagues"
  | "getLeague"
  | "createLeague"
  | "deleteLeague"
  | "resetLeague"
  | "debugDeleteAllLeagues"
  | "debugAddFakeUser"
  | "debugFillLeague"
  | "debugSetAllReady"
  | "debugResetOnlineState"
  | "setAllReady"
  | "startLeague"
  | "removePlayer"
  | "simulateWeek"
  | "applyRevenueSharing"
  | "resetTrainingPlan"
  | "recordMissedWeek"
  | "warnGm"
  | "authorizeRemoval"
  | "adminRemoveGm"
  | "markVacant"
  | "initializeFantasyDraft"
  | "startFantasyDraft"
  | "completeFantasyDraftIfReady"
  | "autoDraftNextFantasyDraft"
  | "autoDraftToEndFantasyDraft"
  | "resetFantasyDraft";

export type OnlineAdminActionInput = {
  action: OnlineAdminActionName;
  backendMode?: "local" | "firebase";
  leagueId?: string;
  targetUserId?: string;
  name?: string;
  maxUsers?: number;
  startWeek?: number;
  reason?: string;
  message?: string;
  deadlineAt?: string;
  season?: number;
  week?: number;
  confirmed?: boolean;
  localState?: LocalAdminStateInput;
};

export type OnlineAdminActionResult = {
  ok: true;
  message: string;
  league?: OnlineLeague | null;
  leagues?: OnlineLeague[];
  simulation?: OnlineLeagueWeekSimulationSummary;
  localState?: LocalAdminStateOutput;
};

class OnlineAdminActionValidationError extends Error {}

const ADMIN_CREATE_LEAGUE_MIN_USERS = 2;
const ADMIN_CREATE_LEAGUE_MAX_USERS = 32;
const ADMIN_CREATE_LEAGUE_NAME_MIN_LENGTH = 3;
const ADMIN_CREATE_LEAGUE_NAME_MAX_LENGTH = 60;
const ADMIN_EXPANSION_TEAM_POOL: OnlineLeagueTeam[] = [
  { id: "austin-comets", name: "Austin Comets", abbreviation: "AUS" },
  { id: "charlotte-copperheads", name: "Charlotte Copperheads", abbreviation: "CHA" },
  { id: "columbus-forge", name: "Columbus Forge", abbreviation: "COL" },
  { id: "memphis-riverhawks", name: "Memphis Riverhawks", abbreviation: "MEM" },
  { id: "okc-mustangs", name: "Oklahoma City Mustangs", abbreviation: "OKC" },
  { id: "raleigh-redwoods", name: "Raleigh Redwoods", abbreviation: "RAL" },
  { id: "salt-lake-sentinels", name: "Salt Lake Sentinels", abbreviation: "SLS" },
  { id: "san-antonio-voyagers", name: "San Antonio Voyagers", abbreviation: "SAV" },
  { id: "birmingham-steel", name: "Birmingham Steel", abbreviation: "BIR" },
  { id: "omaha-pioneers", name: "Omaha Pioneers", abbreviation: "OMA" },
  { id: "tulsa-tempest", name: "Tulsa Tempest", abbreviation: "TUL" },
  { id: "boise-summit", name: "Boise Summit", abbreviation: "BOI" },
  { id: "madison-monarchs", name: "Madison Monarchs", abbreviation: "MAD" },
  { id: "des-moines-aviators", name: "Des Moines Aviators", abbreviation: "DSM" },
  { id: "richmond-rapids", name: "Richmond Rapids", abbreviation: "RIC" },
  { id: "hartford-harbor", name: "Hartford Harbor", abbreviation: "HAR" },
];

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createLeagueId(name: string) {
  const slug = slugify(name) || "online-liga";
  return createSeededId(slug, `admin-league:${slug}:${nowIso()}`, 6);
}

function getAdminLeagueTeamPool(maxTeams: number) {
  return [...ONLINE_MVP_TEAM_POOL, ...ADMIN_EXPANSION_TEAM_POOL].slice(0, maxTeams);
}

function requireCreateLeagueName(input: OnlineAdminActionInput) {
  const name = input.name?.trim() ?? "";

  if (!name) {
    throw new OnlineAdminActionValidationError("Liga Name ist erforderlich.");
  }

  if (name.length < ADMIN_CREATE_LEAGUE_NAME_MIN_LENGTH) {
    throw new OnlineAdminActionValidationError(
      `Liga Name muss mindestens ${ADMIN_CREATE_LEAGUE_NAME_MIN_LENGTH} Zeichen lang sein.`,
    );
  }

  if (name.length > ADMIN_CREATE_LEAGUE_NAME_MAX_LENGTH) {
    throw new OnlineAdminActionValidationError(
      `Liga Name darf maximal ${ADMIN_CREATE_LEAGUE_NAME_MAX_LENGTH} Zeichen lang sein.`,
    );
  }

  return name;
}

function requireCreateLeagueMaxUsers(input: OnlineAdminActionInput) {
  const maxUsers = input.maxUsers;

  if (typeof maxUsers !== "number" || !Number.isFinite(maxUsers) || Math.floor(maxUsers) !== maxUsers) {
    throw new OnlineAdminActionValidationError("Max Spieler muss eine ganze Zahl sein.");
  }

  if (maxUsers < ADMIN_CREATE_LEAGUE_MIN_USERS || maxUsers > ADMIN_CREATE_LEAGUE_MAX_USERS) {
    throw new OnlineAdminActionValidationError(
      `Max Spieler muss zwischen ${ADMIN_CREATE_LEAGUE_MIN_USERS} und ${ADMIN_CREATE_LEAGUE_MAX_USERS} liegen.`,
    );
  }

  return maxUsers;
}

function requireLeagueId(input: OnlineAdminActionInput) {
  if (!input.leagueId?.trim() || !isSafeAdminEntityId(input.leagueId)) {
    throw new OnlineAdminActionValidationError("Liga-ID fehlt.");
  }

  return input.leagueId;
}

function requireTargetUserId(input: OnlineAdminActionInput) {
  if (!input.targetUserId?.trim() || !isSafeAdminEntityId(input.targetUserId)) {
    throw new OnlineAdminActionValidationError("Zielspieler fehlt.");
  }

  return input.targetUserId;
}

function requireExpectedSimulationStep(input: OnlineAdminActionInput) {
  const expectedStep = normalizeExpectedAdminSimulationStep(input);

  if (!expectedStep) {
    throw new OnlineAdminActionValidationError(
      "Simulationsziel fehlt. Bitte lade die Admin-Liga neu.",
    );
  }

  return expectedStep;
}

function requireReason(input: OnlineAdminActionInput) {
  if (!input.reason?.trim()) {
    throw new OnlineAdminActionValidationError("Für diese Admin-Aktion ist ein Grund erforderlich.");
  }

  return input.reason.trim();
}

function createAdminSimulationAttemptId(actor: AdminActionActor, createdAt: string) {
  return `${actor.adminSessionId}:${actor.adminUserId}:${createdAt}`;
}

function createEvent(
  type: string,
  actor: AdminActionActor,
  payload: Record<string, unknown> = {},
): FirestoreOnlineEventDoc {
  return {
    type,
    createdAt: nowIso(),
    createdByUserId: actor.adminUserId,
    payload,
  };
}

export function shouldMarkFirestoreWeekSimulationFailed(input: {
  errorCode: OnlineLeagueWeekSimulationErrorCode;
  lockAttemptId?: string;
  lockStatus: ReturnType<typeof getOnlineLeagueSimulationLockStatus>;
  simulationAttemptId: string;
}) {
  if (input.errorCode === "simulation_in_progress") {
    return false;
  }

  if (input.lockStatus === "simulated") {
    return false;
  }

  if (
    input.lockStatus === "simulating" &&
    input.lockAttemptId &&
    input.lockAttemptId !== input.simulationAttemptId
  ) {
    return false;
  }

  return true;
}

async function markFirestoreWeekSimulationFailed(input: {
  actor: AdminActionActor;
  error: OnlineLeagueWeekSimulationError;
  failedAt: string;
  leagueId: string;
  lockRef: DocumentReference;
  season: number;
  simulationAttemptId: string;
  week: number;
}) {
  const firestore = getFirebaseAdminFirestore();

  await firestore.runTransaction(async (transaction) => {
    const lockSnapshot = await transaction.get(input.lockRef);
    const lockStatus = lockSnapshot.exists
      ? getOnlineLeagueSimulationLockStatus(lockSnapshot.data())
      : "idle";
    const lockData = lockSnapshot.exists
      ? (lockSnapshot.data() as { simulationAttemptId?: string } | undefined)
      : undefined;
    const lockAttemptId = lockData?.simulationAttemptId;

    if (!shouldMarkFirestoreWeekSimulationFailed({
      errorCode: input.error.code,
      lockAttemptId,
      lockStatus,
      simulationAttemptId: input.simulationAttemptId,
    })) {
      return;
    }

    transaction.set(
      input.lockRef,
      {
        action: "simulateWeek",
        adminSessionId: input.actor.adminSessionId,
        adminUserId: input.actor.adminUserId,
        errorCode: input.error.code,
        errorMessage: input.error.message,
        failedAt: input.failedAt,
        leagueId: input.leagueId,
        season: input.season,
        simulationAttemptId: input.simulationAttemptId,
        status: "failed",
        updatedAt: input.failedAt,
        week: input.week,
      },
      { merge: true },
    );
  });
}

async function mapFirestoreLeague(leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const draftRef = getFirestoreDraftRef(leagueId);
  const [leagueSnapshot, membershipsSnapshot, teamsSnapshot, eventsSnapshot, draftSnapshot, draftPicksSnapshot, availablePlayersSnapshot] = await Promise.all([
    leagueRef.get(),
    leagueRef.collection("memberships").get(),
    leagueRef.collection("teams").get(),
    firestore
      .collection("leagues")
      .doc(leagueId)
      .collection("events")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
    draftRef.get(),
    draftRef.collection("picks").get(),
    draftRef.collection("availablePlayers").get(),
  ]);

  if (!leagueSnapshot.exists) {
    return null;
  }

  return mapFirestoreSnapshotToOnlineLeague({
    league: leagueSnapshot.data() as FirestoreOnlineLeagueDoc,
    memberships: membershipsSnapshot.docs.map(
      (snapshot) => snapshot.data() as FirestoreOnlineMembershipDoc,
    ),
    teams: teamsSnapshot.docs.map((snapshot) => snapshot.data() as FirestoreOnlineTeamDoc),
    events: eventsSnapshot.docs.map((snapshot) => snapshot.data() as FirestoreOnlineEventDoc),
    draftState: draftSnapshot.exists
      ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
      : undefined,
    draftPicks: draftPicksSnapshot.docs.map(
      (snapshot) => snapshot.data() as FirestoreOnlineDraftPickDoc,
    ),
    draftAvailablePlayers: availablePlayersSnapshot.docs.map(
      (snapshot) => snapshot.data() as FirestoreOnlineDraftAvailablePlayerDoc,
    ),
  });
}

async function listFirestoreAdminLeagues() {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore
    .collection("leagues")
    .where("settings.onlineBackbone", "==", true)
    .get();
  const leagues = await Promise.all(snapshot.docs.map((document) => mapFirestoreLeague(document.id)));

  return leagues
    .filter((league): league is OnlineLeague => Boolean(league))
    .sort((left, right) => {
      const leftCreatedAt = left.createdAt ?? "";
      const rightCreatedAt = right.createdAt ?? "";

      return rightCreatedAt.localeCompare(leftCreatedAt);
    });
}

function isDevelopmentOrTestRuntime() {
  return process.env.NODE_ENV !== "production";
}

async function addFirestoreAdminLog(
  leagueId: string,
  actor: AdminActionActor,
  action: string,
  payload: Record<string, unknown> = {},
) {
  const firestore = getFirebaseAdminFirestore();
  await firestore.collection("leagues").doc(leagueId).collection("adminLogs").add({
    action,
    createdAt: nowIso(),
    adminSessionId: actor.adminSessionId,
    adminUserId: actor.adminUserId,
    payload,
  });
}

async function executeFirebaseAction(
  input: OnlineAdminActionInput,
  actor: AdminActionActor,
): Promise<OnlineAdminActionResult> {
  const firestore = getFirebaseAdminFirestore();

  if (input.action === "listLeagues") {
    return {
      ok: true,
      message: "Ligen geladen.",
      leagues: await listFirestoreAdminLeagues(),
    };
  }

  if (input.action === "getLeague") {
    const league = await mapFirestoreLeague(requireLeagueId(input));

    return {
      ok: true,
      message: league ? "Liga geladen." : "Liga konnte nicht gefunden werden.",
      league,
    };
  }

  if (input.action === "createLeague") {
    const name = requireCreateLeagueName(input);
    const leagueId = createLeagueId(name);
    const maxTeams = requireCreateLeagueMaxUsers(input);
    const teamPool = getAdminLeagueTeamPool(maxTeams);
    const schedule = canCreateOnlineLeagueSchedule(teamPool)
      ? createOnlineLeagueSchedule(leagueId, teamPool)
      : [];
    const currentWeek = normalizeBoundedAdminInteger(input.startWeek, 1, 1, 18);
    const createdAt = nowIso();
    const batch = firestore.batch();
    const leagueRef = firestore.collection("leagues").doc(leagueId);

    batch.set(leagueRef, {
      id: leagueId,
      name,
      status: "lobby",
      createdByUserId: actor.adminUserId,
      createdAt,
      updatedAt: createdAt,
      maxTeams,
      memberCount: 0,
      currentWeek,
      currentSeason: 1,
      weekStatus: "pre_week",
      settings: {
        onlineBackbone: true,
      },
      schedule,
      version: 1,
    } satisfies FirestoreOnlineLeagueDoc);
    const initialDraftState = createInitialFantasyDraftState(leagueId, maxTeams);
    const initialPlayerPool = createFantasyDraftPlayerPool(leagueId, maxTeams);
    const draftRunId = createDraftRunId(leagueId, createdAt);

    setFirestoreDraftState(batch, leagueId, initialDraftState, draftRunId);
    teamPool.forEach((team) => {
      batch.set(
        leagueRef.collection("teams").doc(team.id),
        mapLocalTeamToFirestoreTeam(team, createdAt),
      );
    });
    batch.set(leagueRef.collection("events").doc(), createEvent("league_created", actor, { name }));
    batch.set(leagueRef.collection("adminLogs").doc(), {
      action: "createLeague",
      createdAt,
      adminSessionId: actor.adminSessionId,
      adminUserId: actor.adminUserId,
      payload: {
        name,
        maxTeams,
      },
    });
    await batch.commit();
    await writeFirestoreDraftPlayerPool(leagueId, initialPlayerPool, draftRunId);

    return {
      ok: true,
      message: `${name} wurde erstellt.`,
      league: await mapFirestoreLeague(leagueId),
    };
  }

  const leagueId = requireLeagueId(input);
  const leagueRef = firestore.collection("leagues").doc(leagueId);

  switch (input.action) {
    case "deleteLeague": {
      const reason = input.reason?.trim() || "Archived from Admin Control Center";
      const result = await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        if (league.status === "archived") {
          return {
            message: "Liga war bereits archiviert.",
          };
        }

        transaction.update(leagueRef, {
          status: "archived",
          updatedAt: nowIso(),
          version: FieldValue.increment(1),
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("league_archived", actor, { reason }),
        );

        return {
          message: "Liga wurde archiviert.",
        };
      });
      await addFirestoreAdminLog(leagueId, actor, "archiveLeague", { reason });

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    case "resetLeague": {
      const createdAt = nowIso();
      const leagueSnapshot = await leagueRef.get();
      const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

      if (!league) {
        throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
      }

      const [memberships, teams] = await Promise.all([
        leagueRef.collection("memberships").get(),
        leagueRef.collection("teams").get(),
      ]);
      const batch = firestore.batch();
      memberships.docs.forEach((membership) => {
        const data = membership.data() as FirestoreOnlineMembershipDoc;
        if (data.role !== "admin") {
          batch.delete(membership.ref);
        } else {
          batch.update(membership.ref, { ready: false, teamId: "" });
        }
      });
      teams.docs.forEach((team) => {
        batch.update(team.ref, {
          assignedUserId: null,
          status: "available",
          updatedAt: createdAt,
        });
      });
      batch.update(leagueRef, {
        memberCount: 0,
        currentWeek: 1,
        currentSeason: 1,
        status: "lobby",
        "settings.onlineBackbone": true,
        "settings.fantasyDraft": FieldValue.delete(),
        "settings.fantasyDraftPlayerPool": FieldValue.delete(),
        updatedAt: createdAt,
        version: FieldValue.increment(1),
      });
      const draftState = createInitialFantasyDraftState(leagueId, league.maxTeams);
      const playerPool = createFantasyDraftPlayerPool(leagueId, league.maxTeams);
      const draftRunId = createDraftRunId(leagueId, createdAt);

      setFirestoreDraftState(batch, leagueId, draftState, draftRunId);
	      batch.set(leagueRef.collection("adminLogs").doc(), {
	        action: "resetLeague",
	        createdAt,
	        adminSessionId: actor.adminSessionId,
	        adminUserId: actor.adminUserId,
	        reason: input.reason?.trim() || "Reset from Admin Control Center",
      });
      batch.set(leagueRef.collection("events").doc(), createEvent("league_reset", actor));
      await batch.commit();
      await writeFirestoreDraftPlayerPool(leagueId, playerPool, draftRunId);
      return { ok: true, message: "Liga wurde zurückgesetzt.", league: await mapFirestoreLeague(leagueId) };
    }
    case "setAllReady": {
      const ready = true;
      const createdAt = nowIso();
      const result = await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);

        if (!leagueSnapshot.exists) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc;
        if (league.weekStatus === "season_complete") {
          throw new OnlineAdminActionValidationError("Die Saison ist abgeschlossen. Offseason kommt bald.");
        }

        const memberships = await transaction.get(leagueRef.collection("memberships"));
        const teams = await transaction.get(leagueRef.collection("teams"));
        const membershipDocs = memberships.docs.map(
          (membership) => membership.data() as FirestoreOnlineMembershipDoc,
        );
        const teamDocs = teams.docs.map((team) => team.data() as FirestoreOnlineTeamDoc);
        const mappedLeague = mapFirestoreSnapshotToOnlineLeague({
          league,
          memberships: membershipDocs,
          teams: teamDocs,
        });
        let updatedMembers = 0;

        memberships.docs.forEach((membership) => {
          const data = membership.data() as FirestoreOnlineMembershipDoc;
          if (data.status !== "active") {
            return;
          }

          const membershipProblem = getMembershipProjectionProblem(data, teamDocs, null, leagueId);

          if (membershipProblem) {
            throw new OnlineAdminActionValidationError(
              createMembershipProjectionConflictMessage(
                leagueId,
                data.userId,
                membershipProblem,
              ),
            );
          }

          const mappedUser = mappedLeague.users.find((user) => user.userId === data.userId);
          const readyChangeState = getOnlineLeagueReadyChangeState(mappedLeague, mappedUser);

          if (!readyChangeState.allowed) {
            throw new OnlineAdminActionValidationError(readyChangeState.reason);
          }

          if (!data.ready) {
            updatedMembers += 1;
            transaction.update(membership.ref, { ready, lastSeenAt: createdAt });
          }
        });

        if (updatedMembers === 0) {
          return {
            message: "Alle Spieler waren bereits ready.",
          };
        }

        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "setAllReady",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
          payload: { ready, updatedMembers },
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("admin_set_all_ready", actor, { ready, updatedMembers }),
        );

        return {
          message: "Alle Spieler wurden auf Ready gesetzt.",
        };
      });

      console.info("[online-week-flow] firebase setAllReady", {
        leagueId,
        message: result.message,
      });

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    case "startLeague": {
      const createdAt = nowIso();
      const result = await firestore.runTransaction(async (transaction) => {
        const draftRef = getFirestoreDraftRef(leagueId);
        const [leagueSnapshot, draftSnapshot] = await Promise.all([
          transaction.get(leagueRef),
          transaction.get(draftRef),
        ]);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;

        if (!league) {
          throw new OnlineAdminActionValidationError("Liga konnte nicht gefunden werden.");
        }

        if (league.status === "active") {
          return {
            message: "Liga war bereits gestartet.",
          };
        }

        if (league.status !== "lobby" || league.memberCount < 2) {
          throw new OnlineAdminActionValidationError("Liga kann noch nicht gestartet werden.");
        }

        const draftDoc = draftSnapshot.exists
          ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
          : null;
        const legacyDraftState = readFirestoreFantasyDraftState(league);

        if (!draftDoc && legacyDraftState) {
          throw new OnlineAdminActionValidationError(
            "Legacy Draft Blob vorhanden, aber Draft Doc fehlt. Bitte Migration oder Repair ausfuehren.",
          );
        }

        const existingDraftStatus = draftDoc?.status ?? null;

        if (existingDraftStatus === "active") {
          return {
            message: "Fantasy Draft war bereits gestartet.",
          };
        }

        if (existingDraftStatus === "completed") {
          transaction.update(leagueRef, {
            status: "active",
            currentWeek: 1,
            currentSeason: 1,
            updatedAt: createdAt,
            version: FieldValue.increment(1),
          });
          transaction.set(leagueRef.collection("weeks").doc("s1-w1"), {
            season: 1,
            week: 1,
            status: "pre_week",
            startedAt: createdAt,
          });

          return {
            message: "Liga wurde gestartet.",
          };
        }

        const memberships = await transaction.get(leagueRef.collection("memberships"));
        const activeTeamIds = new Set(
          memberships.docs
            .map((membership) => membership.data() as FirestoreOnlineMembershipDoc)
            .filter((membership) => membership.status === "active" && membership.teamId)
            .map((membership) => membership.teamId),
        );
        const draftOrder = getAdminLeagueTeamPool(league.maxTeams)
          .map((team) => team.id)
          .filter((teamId) => activeTeamIds.has(teamId));
        const playerPool = createFantasyDraftPlayerPool(leagueId, league.maxTeams);
        const draftState = {
          ...createInitialFantasyDraftState(leagueId, league.maxTeams),
          status: "active" as const,
          draftOrder,
          currentTeamId: draftOrder[0] ?? "",
          availablePlayerIds: playerPool.map((player) => player.playerId),
          startedAt: createdAt,
        };
        const draftRunId = draftDoc?.draftRunId ?? createDraftRunId(leagueId, createdAt);

        if (draftOrder.length < 2) {
          throw new OnlineAdminActionValidationError("Fantasy Draft benoetigt mindestens zwei Teams.");
        }

        setFirestoreDraftState(transaction, leagueId, draftState, draftRunId);
        transaction.update(leagueRef, {
          currentWeek: 1,
          currentSeason: 1,
          "settings.fantasyDraft": FieldValue.delete(),
          "settings.fantasyDraftPlayerPool": FieldValue.delete(),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "startLeague",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("fantasy_draft_started", actor, { draftOrder }),
        );

        return {
          message: "Fantasy Draft wurde gestartet.",
          playerPoolToWrite: {
            playerPool,
            draftRunId,
          },
        };
      });
      const playerPoolToWrite = "playerPoolToWrite" in result ? result.playerPoolToWrite : null;

      if (playerPoolToWrite) {
        await writeFirestoreDraftPlayerPool(
          leagueId,
          playerPoolToWrite.playerPool,
          playerPoolToWrite.draftRunId,
        );
      }

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    case "simulateWeek": {
      const expectedStep = requireExpectedSimulationStep(input);
      const createdAt = nowIso();
      const simulationAttemptId = createAdminSimulationAttemptId(actor, createdAt);
      const lockRef = leagueRef
        .collection("adminActionLocks")
        .doc(createAdminSimulationLockId(leagueId, expectedStep.season, expectedStep.week));
      let simulation: OnlineLeagueWeekSimulationSummary;

      try {
        await firestore.runTransaction(async (transaction) => {
          const lockSnapshot = await transaction.get(lockRef);
          const existingLock = lockSnapshot.exists ? lockSnapshot.data() : null;
          const replacedStaleSimulationAttemptId =
            existingLock &&
            isOnlineLeagueWeekSimulationLockStale(existingLock, createdAt)
              ? (existingLock as { simulationAttemptId?: string }).simulationAttemptId ?? null
              : null;

          if (lockSnapshot.exists) {
            assertCanStartOnlineLeagueWeekSimulation(existingLock, createdAt);
          }

          transaction.set(
            lockRef,
            {
              action: "simulateWeek",
              adminSessionId: actor.adminSessionId,
              adminUserId: actor.adminUserId,
              createdAt,
              leagueId,
              lockOwnerId: actor.adminSessionId,
              replacedStaleSimulationAttemptId,
              season: expectedStep.season,
              simulationAttemptId,
              startedAt: createdAt,
              status: "simulating",
              updatedAt: createdAt,
              week: expectedStep.week,
            },
            { merge: true },
          );
        });

        simulation = await firestore.runTransaction(async (transaction) => {
          const lockSnapshot = await transaction.get(lockRef);

          assertCanCompleteOnlineLeagueWeekSimulation(
            lockSnapshot.exists ? lockSnapshot.data() : null,
            simulationAttemptId,
          );

          const draftRef = getFirestoreDraftRef(leagueId);
          const [leagueSnapshot, draftSnapshot] = await Promise.all([
            transaction.get(leagueRef),
            transaction.get(draftRef),
          ]);
          const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;
          const draftDoc = draftSnapshot.exists
            ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
            : null;
          const memberships = await transaction.get(leagueRef.collection("memberships"));
          const teams = await transaction.get(leagueRef.collection("teams"));
          const weeks = await transaction.get(leagueRef.collection("weeks"));
          const membershipDocs = memberships.docs.map(
            (membership) => membership.data() as FirestoreOnlineMembershipDoc,
          );
          const teamDocs = teams.docs.map((team) => team.data() as FirestoreOnlineTeamDoc);
          const weekDocs = weeks.docs.map((week) => week.data() as FirestoreOnlineWeekDoc);

          const preparedSimulation = prepareOnlineLeagueWeekSimulation({
            actorUserId: actor.adminUserId,
            draftState: draftDoc,
            expectedSeason: expectedStep.season,
            expectedWeek: expectedStep.week,
            league,
            memberships: membershipDocs,
            now: createdAt,
            teams: teamDocs,
            weeks: weekDocs,
          });

          memberships.docs.forEach((membership) => {
            const data = membership.data() as FirestoreOnlineMembershipDoc;
            if (data.status === "active") {
              transaction.update(membership.ref, { ready: false });
            }
          });
          transaction.update(leagueRef, {
            completedWeeks: preparedSimulation.nextCompletedWeeks,
            currentSeason: preparedSimulation.nextSeason,
            currentWeek: preparedSimulation.nextWeek,
            lastSimulatedWeekKey: preparedSimulation.weekKey,
            matchResults: [...preparedSimulation.results, ...preparedSimulation.existingMatchResults],
            standings: preparedSimulation.standingsSummary,
            status: preparedSimulation.seasonComplete ? "completed" : "active",
            weekStatus: preparedSimulation.seasonComplete ? "season_complete" : "pre_week",
            updatedAt: preparedSimulation.updatedAt,
            version: FieldValue.increment(1),
          });
          transaction.set(
            lockRef,
            {
              action: "simulateWeek",
              adminSessionId: actor.adminSessionId,
              adminUserId: actor.adminUserId,
              completedAt: preparedSimulation.updatedAt,
              createdAt,
              leagueId,
              resultCount: preparedSimulation.gamesSimulated,
              season: expectedStep.season,
              simulationAttemptId,
              status: "simulated",
              updatedAt: preparedSimulation.updatedAt,
              week: expectedStep.week,
              weekKey: preparedSimulation.weekKey,
            },
            { merge: true },
          );
          transaction.set(
            leagueRef.collection("weeks").doc(`s${expectedStep.season}-w${expectedStep.week}`),
            {
              season: expectedStep.season,
              week: expectedStep.week,
              status: "completed",
              completedAt: preparedSimulation.updatedAt,
              simulatedByUserId: actor.adminUserId,
            },
            { merge: true },
          );
          if (!preparedSimulation.seasonComplete) {
            transaction.set(
              leagueRef.collection("weeks").doc(`s${preparedSimulation.nextSeason}-w${preparedSimulation.nextWeek}`),
              {
                season: preparedSimulation.nextSeason,
                week: preparedSimulation.nextWeek,
                status: "pre_week",
                startedAt: preparedSimulation.updatedAt,
              },
              { merge: true },
            );
          }
          transaction.set(leagueRef.collection("adminLogs").doc(), {
            action: "simulateWeek",
            createdAt,
            adminSessionId: actor.adminSessionId,
            adminUserId: actor.adminUserId,
            payload: {
              previousSeason: expectedStep.season,
              previousWeek: expectedStep.week,
              nextSeason: preparedSimulation.nextSeason,
              nextWeek: preparedSimulation.nextWeek,
              resultCount: preparedSimulation.gamesSimulated,
              seasonComplete: preparedSimulation.seasonComplete,
            },
          });
          transaction.set(
            leagueRef.collection("events").doc(),
            createEvent("week_simulated", actor, {
              previousSeason: expectedStep.season,
              previousWeek: expectedStep.week,
              nextSeason: preparedSimulation.nextSeason,
              nextWeek: preparedSimulation.nextWeek,
              resultCount: preparedSimulation.gamesSimulated,
              seasonComplete: preparedSimulation.seasonComplete,
            }),
          );

          return preparedSimulation;
        });
        console.info("[online-week-flow] firebase simulation completed", {
          currentWeek: simulation.nextWeek,
          gamesSimulated: simulation.gamesSimulated,
          leagueId,
          seasonComplete: simulation.seasonComplete,
          standingsCount: simulation.standingsSummary.length,
          week: simulation.simulatedWeek,
        });
      } catch (error) {
        const simulationError =
          error instanceof OnlineLeagueWeekSimulationError
            ? error
            : new OnlineLeagueWeekSimulationError(
                "simulation_failed",
                error instanceof Error
                  ? error.message
                  : "Week-Simulation konnte nicht abgeschlossen werden.",
              );

        await markFirestoreWeekSimulationFailed({
          actor,
          error: simulationError,
          failedAt: createdAt,
          leagueId,
          lockRef,
          season: expectedStep.season,
          simulationAttemptId,
          week: expectedStep.week,
        });

        throw error;
      }

      return {
        ok: true,
        message: `Die Woche wurde simuliert. ${simulation.gamesSimulated} Ergebnisse gespeichert, die nächste Week ist vorbereitet.`,
        league: await mapFirestoreLeague(leagueId),
        simulation,
      };
    }
    case "initializeFantasyDraft": {
      return executeFirestoreAdminDraftAction({
        actor,
        createEvent,
        createValidationError: (message) => new OnlineAdminActionValidationError(message),
        input,
        leagueId,
        leagueRef,
        mapFirestoreLeague,
      });
    }
    case "startFantasyDraft":
      return executeFirebaseAction({ ...input, action: "startLeague" }, actor);
    case "autoDraftNextFantasyDraft": {
      return executeFirestoreAdminDraftAction({
        actor,
        createEvent,
        createValidationError: (message) => new OnlineAdminActionValidationError(message),
        input,
        leagueId,
        leagueRef,
        mapFirestoreLeague,
      });
    }
    case "autoDraftToEndFantasyDraft": {
      return executeFirestoreAdminDraftAction({
        actor,
        createEvent,
        createValidationError: (message) => new OnlineAdminActionValidationError(message),
        input,
        leagueId,
        leagueRef,
        mapFirestoreLeague,
      });
    }
    case "completeFantasyDraftIfReady": {
      return executeFirestoreAdminDraftAction({
        actor,
        createEvent,
        createValidationError: (message) => new OnlineAdminActionValidationError(message),
        input,
        leagueId,
        leagueRef,
        mapFirestoreLeague,
      });
    }
    case "resetFantasyDraft": {
      return executeFirestoreAdminDraftAction({
        actor,
        createEvent,
        createValidationError: (message) => new OnlineAdminActionValidationError(message),
        input,
        leagueId,
        leagueRef,
        mapFirestoreLeague,
      });
    }
    case "removePlayer": {
      const targetUserId = requireTargetUserId(input);
      const reason = input.reason?.trim() || "Removed from Admin Control Center";
      const membershipRef = leagueRef.collection("memberships").doc(targetUserId);
      const createdAt = nowIso();
      const result = await firestore.runTransaction(async (transaction) => {
        const membershipSnapshot = await transaction.get(membershipRef);
        const membership = membershipSnapshot.data() as FirestoreOnlineMembershipDoc | undefined;

        if (!membership || membership.status !== "active") {
          return {
            message: "Spieler war bereits entfernt.",
          };
        }

        transaction.update(membershipRef, {
          status: "removed",
          ready: false,
          lastSeenAt: createdAt,
        });
        if (membership.teamId) {
          transaction.update(leagueRef.collection("teams").doc(membership.teamId), {
            status: "vacant",
            assignedUserId: null,
            updatedAt: createdAt,
          });
        }
        transaction.update(leagueRef, {
          memberCount: FieldValue.increment(-1),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "removeMember",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
          targetUserId,
          targetTeamId: membership.teamId,
          reason,
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("gm_removed_by_admin", actor, { targetUserId, reason }),
        );

        return {
          message: "Spieler wurde entfernt.",
        };
      });

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    case "markVacant": {
      const targetUserId = requireTargetUserId(input);
      const reason = requireReason(input);
      const membershipRef = leagueRef.collection("memberships").doc(targetUserId);
      const createdAt = nowIso();
      const result = await firestore.runTransaction(async (transaction) => {
        const membership = await transaction.get(membershipRef);
        const membershipData = membership.data() as FirestoreOnlineMembershipDoc | undefined;

        if (!membershipData?.teamId || membershipData.status !== "active") {
          return {
            message: "Team war bereits vakant oder konnte nicht gefunden werden.",
          };
        }

        transaction.update(leagueRef.collection("teams").doc(membershipData.teamId), {
          status: "vacant",
          assignedUserId: null,
          updatedAt: createdAt,
        });
        transaction.update(membershipRef, {
          status: "removed",
          ready: false,
        });
        transaction.update(leagueRef, {
          memberCount: FieldValue.increment(-1),
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
        transaction.set(leagueRef.collection("adminLogs").doc(), {
          action: "markTeamVacant",
          createdAt,
          adminSessionId: actor.adminSessionId,
          adminUserId: actor.adminUserId,
          targetUserId,
          targetTeamId: membershipData.teamId,
          reason,
        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("team_marked_vacant", actor, { teamId: membershipData.teamId, reason }),
        );

        return {
          message: "Team wurde als vakant markiert.",
        };
      });

      return { ok: true, message: result.message, league: await mapFirestoreLeague(leagueId) };
    }
    default:
      throw new OnlineAdminActionValidationError(
        "Diese Admin-Aktion ist im Firebase-Modus noch nicht serverseitig verfügbar.",
      );
  }
}

export async function simulateOnlineLeagueWeek(
  leagueId: string,
  actor: AdminActionActor,
  options: { expectedSeason?: number; expectedWeek?: number } = {},
) {
  const league = await mapFirestoreLeague(leagueId);

  if (!league) {
    throw new OnlineLeagueWeekSimulationError(
      "league_not_found",
      "Liga konnte nicht gefunden werden.",
    );
  }

  const result = await executeOnlineAdminAction(
    {
      action: "simulateWeek",
      backendMode: "firebase",
      leagueId,
      season: options.expectedSeason ?? league.currentSeason ?? 1,
      week: options.expectedWeek ?? league.currentWeek,
      confirmed: true,
    },
    actor,
  );

  if (!result.simulation) {
    throw new OnlineLeagueWeekSimulationError(
      "simulation_failed",
      "Week-Simulation lieferte kein strukturiertes Ergebnis.",
    );
  }

  return result.simulation;
}

export async function executeOnlineAdminAction(
  input: OnlineAdminActionInput,
  actor: AdminActionActor,
): Promise<OnlineAdminActionResult> {
  if (!input.action) {
    throw new OnlineAdminActionValidationError("Admin-Aktion fehlt.");
  }

  assertOnlineAdminActionPolicy(input);

  if (input.backendMode === "firebase") {
    return executeFirebaseAction(input, actor);
  }

  return executeLocalOnlineAdminAction(input, actor, {
    createValidationError: (message) => new OnlineAdminActionValidationError(message),
    isDevelopmentOrTestRuntime,
    requireCreateLeagueMaxUsers,
    requireCreateLeagueName,
    requireExpectedSimulationStep,
    requireLeagueId,
    requireReason,
    requireTargetUserId,
  });
}

export function toOnlineAdminActionError(error: unknown) {
  if (error instanceof OnlineLeagueWeekSimulationError) {
    return {
      status: 400,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof OnlineAdminActionValidationError) {
    return {
      status: 400,
      code: "ADMIN_ACTION_INVALID",
      message: error.message,
    };
  }

  if (error instanceof OnlineAdminActionPolicyError) {
    return {
      status: 400,
      code: "ADMIN_ACTION_POLICY_VIOLATION",
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      code: "ADMIN_ACTION_FAILED",
      message: error.message || "Admin-Aktion konnte nicht ausgeführt werden.",
    };
  }

  return {
    status: 500,
    code: "ADMIN_ACTION_FAILED",
    message: "Admin-Aktion konnte nicht ausgeführt werden.",
  };
}
