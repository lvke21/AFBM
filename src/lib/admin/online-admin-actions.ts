import { FieldValue } from "firebase-admin/firestore";

import type { AdminActionActor } from "@/lib/admin/admin-action-guard";
import { LocalAdminMemoryStorage, type LocalAdminStateInput } from "@/lib/admin/local-admin-storage";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  applyOnlineRevenueSharing,
  authorizeOnlineGmRemoval,
  createOnlineLeague,
  deleteOnlineLeague,
  fillOnlineLeagueWithFakeUsers,
  getOnlineLeagues,
  markOnlineTeamVacant,
  ONLINE_MVP_TEAM_POOL,
  recordOnlineGmMissedWeek,
  removeOnlineGmByAdmin,
  removeOnlineLeagueUser,
  resetOnlineLeague,
  resetOnlineLeagues,
  resetWeeklyTrainingPlan,
  setAllOnlineLeagueUsersReady,
  setAllOnlineLeaguesUsersReady,
  simulateOnlineLeagueWeek,
  startOnlineLeague,
  warnOnlineGm,
  addFakeUserToOnlineLeague,
  type OnlineLeague,
} from "@/lib/online/online-league-service";
import {
  mapFirestoreSnapshotToOnlineLeague,
  mapLocalTeamToFirestoreTeam,
  type FirestoreOnlineEventDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
} from "@/lib/online/types";

export type OnlineAdminActionName =
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
  | "markVacant";

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
  localState?: LocalAdminStateInput;
};

export type OnlineAdminActionResult = {
  ok: true;
  message: string;
  league?: OnlineLeague | null;
  leagues?: OnlineLeague[];
  localState?: ReturnType<LocalAdminMemoryStorage["toLocalState"]>;
};

class OnlineAdminActionValidationError extends Error {}

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
  return `${slugify(name) || "online-liga"}-${Math.random().toString(36).slice(2, 8)}`;
}

function requireLeagueId(input: OnlineAdminActionInput) {
  if (!input.leagueId?.trim()) {
    throw new OnlineAdminActionValidationError("Liga-ID fehlt.");
  }

  return input.leagueId;
}

function requireTargetUserId(input: OnlineAdminActionInput) {
  if (!input.targetUserId?.trim()) {
    throw new OnlineAdminActionValidationError("Zielspieler fehlt.");
  }

  return input.targetUserId;
}

function requireReason(input: OnlineAdminActionInput) {
  if (!input.reason?.trim()) {
    throw new OnlineAdminActionValidationError("Für diese Admin-Aktion ist ein Grund erforderlich.");
  }

  return input.reason.trim();
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

async function mapFirestoreLeague(leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const [leagueSnapshot, membershipsSnapshot, teamsSnapshot, eventsSnapshot] = await Promise.all([
    firestore.collection("leagues").doc(leagueId).get(),
    firestore.collection("leagues").doc(leagueId).collection("memberships").get(),
    firestore.collection("leagues").doc(leagueId).collection("teams").get(),
    firestore
      .collection("leagues")
      .doc(leagueId)
      .collection("events")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
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
  });
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

  if (input.action === "createLeague") {
    const name = input.name?.trim() || "Neue Online Liga";
    const leagueId = createLeagueId(name);
    const maxTeams = Math.min(Math.max(Math.floor(input.maxUsers ?? 16), 1), 16);
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
      currentWeek: Math.max(1, Math.floor(input.startWeek ?? 1)),
      currentSeason: 1,
      settings: {
        onlineBackbone: true,
      },
      version: 1,
    } satisfies FirestoreOnlineLeagueDoc);
    ONLINE_MVP_TEAM_POOL.slice(0, maxTeams).forEach((team) => {
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
      await leagueRef.update({
        status: "archived",
        updatedAt: nowIso(),
        version: FieldValue.increment(1),
      });
      await addFirestoreAdminLog(leagueId, actor, "archiveLeague", { reason });
      await leagueRef.collection("events").add(createEvent("league_archived", actor, { reason }));
      return { ok: true, message: "Liga wurde archiviert.", league: await mapFirestoreLeague(leagueId) };
    }
    case "resetLeague": {
      const createdAt = nowIso();
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
        updatedAt: createdAt,
        version: FieldValue.increment(1),
      });
	      batch.set(leagueRef.collection("adminLogs").doc(), {
	        action: "resetLeague",
	        createdAt,
	        adminSessionId: actor.adminSessionId,
	        adminUserId: actor.adminUserId,
	        reason: input.reason?.trim() || "Reset from Admin Control Center",
      });
      batch.set(leagueRef.collection("events").doc(), createEvent("league_reset", actor));
      await batch.commit();
      return { ok: true, message: "Liga wurde zurückgesetzt.", league: await mapFirestoreLeague(leagueId) };
    }
    case "setAllReady": {
      const ready = true;
      const createdAt = nowIso();
      const memberships = await leagueRef.collection("memberships").get();
      const batch = firestore.batch();
      memberships.docs.forEach((membership) => {
        const data = membership.data() as FirestoreOnlineMembershipDoc;
        if (data.status === "active" && data.teamId) {
          batch.update(membership.ref, { ready, lastSeenAt: createdAt });
        }
      });
	      batch.set(leagueRef.collection("adminLogs").doc(), {
	        action: "setAllReady",
	        createdAt,
	        adminSessionId: actor.adminSessionId,
	        adminUserId: actor.adminUserId,
	        payload: { ready },
      });
      batch.set(leagueRef.collection("events").doc(), createEvent("admin_set_all_ready", actor, { ready }));
      await batch.commit();
      return { ok: true, message: "Alle Spieler wurden auf Ready gesetzt.", league: await mapFirestoreLeague(leagueId) };
    }
    case "startLeague": {
      const createdAt = nowIso();
      await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;
        if (!league || league.status !== "lobby" || league.memberCount < 2) {
          throw new OnlineAdminActionValidationError("Liga kann noch nicht gestartet werden.");
        }
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
	        transaction.set(leagueRef.collection("adminLogs").doc(), {
	          action: "startLeague",
	          createdAt,
	          adminSessionId: actor.adminSessionId,
	          adminUserId: actor.adminUserId,
	        });
        transaction.set(leagueRef.collection("events").doc(), createEvent("league_started", actor));
      });
      return { ok: true, message: "Liga wurde gestartet.", league: await mapFirestoreLeague(leagueId) };
    }
    case "simulateWeek": {
      const createdAt = nowIso();
      const memberships = await leagueRef.collection("memberships").get();
      await firestore.runTransaction(async (transaction) => {
        const leagueSnapshot = await transaction.get(leagueRef);
        const league = leagueSnapshot.data() as FirestoreOnlineLeagueDoc | undefined;
        if (!league || league.status !== "active") {
          throw new OnlineAdminActionValidationError("Nur aktive Ligen können simuliert werden.");
        }
        const nextWeek = league.currentWeek + 1;
        const nextSeason = nextWeek > 18 ? league.currentSeason + 1 : league.currentSeason;
        memberships.docs.forEach((membership) => {
          const data = membership.data() as FirestoreOnlineMembershipDoc;
          if (data.status === "active") {
            transaction.update(membership.ref, { ready: false });
          }
        });
        transaction.update(leagueRef, {
          currentWeek: nextWeek > 18 ? 1 : nextWeek,
          currentSeason: nextSeason,
          updatedAt: createdAt,
          version: FieldValue.increment(1),
        });
	        transaction.set(leagueRef.collection("adminLogs").doc(), {
	          action: "simulateWeek",
	          createdAt,
	          adminSessionId: actor.adminSessionId,
	          adminUserId: actor.adminUserId,
	        });
        transaction.set(
          leagueRef.collection("events").doc(),
          createEvent("week_simulated_placeholder", actor, {
            previousWeek: league.currentWeek,
            nextWeek: nextWeek > 18 ? 1 : nextWeek,
            nextSeason,
          }),
        );
      });
      return {
        ok: true,
        message: "Die Woche wurde simuliert. Die nächste Week ist vorbereitet.",
        league: await mapFirestoreLeague(leagueId),
      };
    }
    case "removePlayer": {
      const targetUserId = requireTargetUserId(input);
      const reason = input.reason?.trim() || "Removed from Admin Control Center";
      const membershipRef = leagueRef.collection("memberships").doc(targetUserId);
      const createdAt = nowIso();
      await firestore.runTransaction(async (transaction) => {
        const membershipSnapshot = await transaction.get(membershipRef);
        const membership = membershipSnapshot.data() as FirestoreOnlineMembershipDoc | undefined;
        if (!membership) {
          return;
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
      });
      return { ok: true, message: "Spieler wurde entfernt.", league: await mapFirestoreLeague(leagueId) };
    }
    case "markVacant": {
      const targetUserId = requireTargetUserId(input);
      const reason = requireReason(input);
      const membership = await leagueRef.collection("memberships").doc(targetUserId).get();
      const membershipData = membership.data() as FirestoreOnlineMembershipDoc | undefined;
      if (!membershipData?.teamId) {
        throw new OnlineAdminActionValidationError("Team konnte nicht gefunden werden.");
      }
      await firestore.runTransaction(async (transaction) => {
        transaction.update(leagueRef.collection("teams").doc(membershipData.teamId), {
          status: "vacant",
          assignedUserId: null,
          updatedAt: nowIso(),
        });
        transaction.update(leagueRef.collection("memberships").doc(targetUserId), {
          status: "removed",
          ready: false,
        });
	        transaction.set(leagueRef.collection("adminLogs").doc(), {
	          action: "markTeamVacant",
	          createdAt: nowIso(),
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
      });
      return { ok: true, message: "Team wurde als vakant markiert.", league: await mapFirestoreLeague(leagueId) };
    }
    default:
      throw new OnlineAdminActionValidationError(
        "Diese Admin-Aktion ist im Firebase-Modus noch nicht serverseitig verfügbar.",
      );
  }
}

function executeLocalAction(input: OnlineAdminActionInput): OnlineAdminActionResult {
  const storage = new LocalAdminMemoryStorage(input.localState);
  let league: OnlineLeague | null = null;
  let leagues: OnlineLeague[] | undefined;
  let message = "Admin-Aktion wurde ausgeführt.";
  let resetCurrentUser = false;

  switch (input.action) {
    case "createLeague":
      league = createOnlineLeague(
        {
          name: input.name ?? "Neue Online Liga",
          maxUsers: input.maxUsers,
          startWeek: input.startWeek,
        },
        storage,
      );
      message = `${league.name} wurde erstellt.`;
      break;
    case "deleteLeague":
      leagues = deleteOnlineLeague(requireLeagueId(input), storage);
      message = "Liga wurde gelöscht.";
      break;
    case "resetLeague":
      league = resetOnlineLeague(requireLeagueId(input), storage);
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
      league = setAllOnlineLeagueUsersReady(requireLeagueId(input), storage);
      message = "Alle Spieler wurden auf Ready gesetzt.";
      break;
    case "startLeague":
      league = startOnlineLeague(requireLeagueId(input), storage);
      message = "Liga wurde gestartet.";
      break;
    case "removePlayer":
      league = removeOnlineLeagueUser(requireLeagueId(input), requireTargetUserId(input), storage);
      message = "Spieler wurde aus der Liga entfernt.";
      break;
    case "simulateWeek":
      league = simulateOnlineLeagueWeek(requireLeagueId(input), storage);
      message = "Die Woche wurde simuliert. Die nächste Week ist vorbereitet.";
      break;
    case "applyRevenueSharing":
      league = applyOnlineRevenueSharing(requireLeagueId(input), storage);
      message = "Revenue Sharing wurde angewendet.";
      break;
    case "resetTrainingPlan":
      league = resetWeeklyTrainingPlan(
        requireLeagueId(input),
        requireTargetUserId(input),
        Math.max(1, Math.floor(input.season ?? 1)),
        Math.max(1, Math.floor(input.week ?? 1)),
        storage,
      );
      message = "Trainingsplan wurde zurückgesetzt.";
      break;
    case "recordMissedWeek":
      league = recordOnlineGmMissedWeek(requireLeagueId(input), requireTargetUserId(input), storage);
      message = "Verpasste Woche wurde erfasst.";
      break;
    case "warnGm":
      league = warnOnlineGm(
        requireLeagueId(input),
        requireTargetUserId(input),
        input.message ?? "",
        input.deadlineAt ?? "",
        storage,
      );
      message = "GM wurde verwarnt.";
      break;
    case "authorizeRemoval":
      league = authorizeOnlineGmRemoval(
        requireLeagueId(input),
        requireTargetUserId(input),
        requireReason(input),
        storage,
      );
      message = "Entlassung wurde ermächtigt.";
      break;
    case "adminRemoveGm":
      league = removeOnlineGmByAdmin(
        requireLeagueId(input),
        requireTargetUserId(input),
        requireReason(input),
        storage,
      );
      message = "GM wurde entfernt und das Team ist vakant.";
      break;
    case "markVacant":
      league = markOnlineTeamVacant(
        requireLeagueId(input),
        requireTargetUserId(input),
        requireReason(input),
        storage,
      );
      message = "Team wurde als vakant markiert.";
      break;
    default:
      throw new OnlineAdminActionValidationError("Unbekannte Admin-Aktion.");
  }

  return {
    ok: true,
    message,
    league,
    leagues: leagues ?? getOnlineLeagues(storage),
    localState: storage.toLocalState(resetCurrentUser),
  };
}

export async function executeOnlineAdminAction(
  input: OnlineAdminActionInput,
  actor: AdminActionActor,
): Promise<OnlineAdminActionResult> {
  if (!input.action) {
    throw new OnlineAdminActionValidationError("Admin-Aktion fehlt.");
  }

  if (input.backendMode === "firebase") {
    return executeFirebaseAction(input, actor);
  }

  return executeLocalAction(input);
}

export function toOnlineAdminActionError(error: unknown) {
  if (error instanceof OnlineAdminActionValidationError) {
    return {
      status: 400,
      code: "ADMIN_ACTION_INVALID",
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
