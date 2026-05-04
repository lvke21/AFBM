import { createAdminSimulationLockId } from "@/lib/admin/admin-action-hardening";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  increment,
  runTransaction,
  type Firestore,
} from "firebase/firestore";

import {
  type JoinOnlineLeagueResult,
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
  type OnlineContractPlayer,
  type OnlineDepthChartEntry,
  type OnlineFantasyDraftPick,
  type OnlineFantasyDraftPickResult,
  type OnlineFantasyDraftState,
} from "../online-league-service";
import { normalizeOnlineCoreLifecycle } from "../online-league-lifecycle";
import {
  clearStoredLastOnlineLeagueId,
  getOptionalBrowserOnlineLeagueStorage,
  getStoredLastOnlineLeagueId,
  setStoredLastOnlineLeagueId,
} from "../online-league-storage";
import { resolveTeamIdentitySelection, type TeamIdentitySelection } from "../team-identity-options";
import {
  hasSameDepthChartPayload,
  isSafeOnlineSyncId,
} from "../sync-guards";
import {
  belongsToCurrentMultiplayerDraftRun,
  getMultiplayerDraftPickDocumentId,
  isCurrentMultiplayerDraftPickDocumentOccupied,
  type MultiplayerDraftPickValidationResult,
  validatePreparedMultiplayerDraftPick,
  validateMultiplayerDraftSourceConsistency,
  validateMultiplayerDraftStateIntegrity,
} from "../multiplayer-draft-logic";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreLeagueMemberMirrorDoc,
  type FirestoreOnlineDraftAvailablePlayerDoc,
  type FirestoreOnlineDraftPickDoc,
  type FirestoreOnlineDraftStateDoc,
  type FirestoreOnlineEventDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
  type OnlineLeagueRepository,
  type OnlineLeagueReadyStepGuard,
} from "../types";
import {
  chooseAvailableFirestoreTeamForIdentity,
  createLeagueMemberMirrorFromMembership,
  createMembershipProjectionConflictMessage,
  createUnavailableOnlineLeague,
  getMembershipProjectionProblem,
  getTeamProjectionWithoutMembershipProblem,
  isFirestoreWeekSimulationLockActive,
  isLeagueMemberMirrorAligned,
  isMembershipMirrorProjectionProblem,
  isMembershipTeamProjectionProblem,
  readDocData,
  readFirestoreFantasyDraftState,
  resolveFirestoreMembershipForUser,
  toFirestoreDraftPickDoc,
  toFirestoreDraftStateDoc,
} from "./firebase-online-league-mappers";
import {
  getFirebaseCurrentUser,
  mapFirebaseMemberScopedLeague,
  mapFirebaseOnlineLeague,
} from "./firebase-online-league-queries";

function leagueRef(db: Firestore, leagueId: string) {
  return doc(db, "leagues", leagueId);
}

function membershipRef(db: Firestore, leagueId: string, userId: string) {
  return doc(db, "leagues", leagueId, "memberships", userId);
}

function leagueMemberRef(db: Firestore, leagueId: string, userId: string) {
  return doc(db, "leagueMembers", `${leagueId}_${userId}`);
}

function teamsRef(db: Firestore, leagueId: string) {
  return collection(db, "leagues", leagueId, "teams");
}

function teamRef(db: Firestore, leagueId: string, teamId: string) {
  return doc(db, "leagues", leagueId, "teams", teamId);
}

function eventsRef(db: Firestore, leagueId: string) {
  return collection(db, "leagues", leagueId, "events");
}

function draftRef(db: Firestore, leagueId: string) {
  return doc(db, "leagues", leagueId, "draft", "main");
}

function draftPicksRef(db: Firestore, leagueId: string) {
  return collection(db, "leagues", leagueId, "draft", "main", "picks");
}

function draftAvailablePlayersRef(db: Firestore, leagueId: string) {
  return collection(db, "leagues", leagueId, "draft", "main", "availablePlayers");
}

export function nowIso() {
  return new Date().toISOString();
}

export function createFirebaseOnlineEvent(
  type: string,
  createdByUserId: string,
  payload: Record<string, unknown> = {},
): FirestoreOnlineEventDoc {
  return {
    type,
    createdAt: nowIso(),
    createdByUserId,
    payload,
  };
}

function getSnakeDraftTeamId(draftOrder: string[], pickIndex: number) {
  if (draftOrder.length === 0) {
    return "";
  }

  const roundIndex = Math.floor(pickIndex / draftOrder.length);
  const indexInRound = pickIndex % draftOrder.length;
  const order = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();

  return order[indexInRound] ?? "";
}

export function createRosterDepthChart(
  roster: OnlineContractPlayer[],
  updatedAt: string,
): OnlineDepthChartEntry[] {
  const playersByPosition = new Map<string, OnlineContractPlayer[]>();

  roster.forEach((player) => {
    if (player.status !== "active") {
      return;
    }

    playersByPosition.set(player.position, [
      ...(playersByPosition.get(player.position) ?? []),
      player,
    ]);
  });

  return Array.from(playersByPosition.entries()).map(([position, players]) => {
    const sortedPlayers = [...players].sort((left, right) => right.overall - left.overall);

    return {
      position,
      starterPlayerId: sortedPlayers[0]?.playerId ?? "",
      backupPlayerIds: sortedPlayers.slice(1).map((player) => player.playerId),
      updatedAt,
    };
  });
}

function hasCompletedDraftRoster(
  teamId: string,
  picks: OnlineFantasyDraftPick[],
  playersById: Map<string, OnlineContractPlayer>,
) {
  const teamPicks = picks.filter((pick) => pick.teamId === teamId);

  if (teamPicks.length < ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE) {
    return false;
  }

  return ONLINE_FANTASY_DRAFT_POSITIONS.every((position) => {
    const count = teamPicks.filter(
      (pick) => playersById.get(pick.playerId)?.position === position,
    ).length;

    return count >= ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position];
  });
}

export function getNextFantasyDraftState(
  state: OnlineFantasyDraftState,
  playerPool: OnlineContractPlayer[],
  now: string,
): OnlineFantasyDraftState {
  const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
  const completed = state.draftOrder.length > 0 &&
    state.draftOrder.every((teamId) => hasCompletedDraftRoster(teamId, state.picks, playersById));

  if (completed) {
    return {
      ...state,
      status: "completed",
      currentTeamId: "",
      completedAt: state.completedAt ?? now,
    };
  }

  const nextPickIndex = state.picks.length;

  return {
    ...state,
    status: "active",
    round: Math.floor(nextPickIndex / Math.max(1, state.draftOrder.length)) + 1,
    pickNumber: nextPickIndex + 1,
    currentTeamId: getSnakeDraftTeamId(state.draftOrder, nextPickIndex),
  };
}

export function createUnsafeLeagueIdError() {
  return new Error("Ungueltige Online-Liga-ID. Bitte suche die Liga erneut.");
}

export function assertWritableOnlineUser(user: { userId: string; username: string }) {
  if (!isSafeOnlineSyncId(user.userId)) {
    throw new Error("Firebase Auth ist noch nicht bereit. Bitte lade die Seite neu.");
  }

  if (!user.username.trim()) {
    throw new Error("Online-Profil ist unvollstaendig. Bitte lade die Seite neu.");
  }
}

export function getFirebaseLastLeagueId() {
  const storage = getOptionalBrowserOnlineLeagueStorage();
  const lastLeagueId = storage ? getStoredLastOnlineLeagueId(storage) : null;

  return isSafeOnlineSyncId(lastLeagueId) ? lastLeagueId : null;
}

export function setFirebaseLastLeagueId(leagueId: string) {
  if (!isSafeOnlineSyncId(leagueId)) {
    return;
  }

  const storage = getOptionalBrowserOnlineLeagueStorage();

  if (storage) {
    setStoredLastOnlineLeagueId(storage, leagueId);
  }
}

export function clearFirebaseLastLeagueId(leagueId?: string) {
  const storage = getOptionalBrowserOnlineLeagueStorage();

  if (!storage) {
    return;
  }

  clearStoredLastOnlineLeagueId(storage, leagueId);
}

function mapDraftPickValidationStatus(
  status: Extract<MultiplayerDraftPickValidationResult, { ok: false }>["status"],
) {
  if (status === "wrong-team") {
    return "wrong-team" as const;
  }

  if (status === "draft-inconsistent") {
    return "draft-inconsistent" as const;
  }

  if (status === "draft-not-active" || status === "missing-draft") {
    return "draft-not-active" as const;
  }

  if (status === "missing-team") {
    return "missing-user" as const;
  }

  return "player-unavailable" as const;
}

export async function joinFirebaseLeague(
  db: Firestore,
  leagueId: string,
  teamIdentity?: TeamIdentitySelection,
): Promise<JoinOnlineLeagueResult> {
  if (!isSafeOnlineSyncId(leagueId)) {
    return {
      status: "missing-league",
      league: createUnavailableOnlineLeague(leagueId),
      message: "Ungueltige Liga-ID. Bitte suche die Liga erneut.",
    };
  }

  const user = await getFirebaseCurrentUser();
  assertWritableOnlineUser(user);
  const publicTeamsSnapshot = await getDocs(teamsRef(db, leagueId));
  const publicTeams = publicTeamsSnapshot.docs.map(
    (team) => team.data() as FirestoreOnlineTeamDoc,
  );

  const joinedLeague = await runTransaction(db, async (transaction) => {
    const leagueSnapshot = await transaction.get(leagueRef(db, leagueId));
    const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);

    if (!league) {
      return {
        status: "missing-league" as const,
        leagueId,
        message: "Diese Liga konnte nicht gefunden werden.",
      };
    }

    const membershipSnapshot = await transaction.get(membershipRef(db, leagueId, user.userId));
    const existingMembership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);
    const mirrorSnapshot = await transaction.get(leagueMemberRef(db, leagueId, user.userId));
    const existingMirror = readDocData<FirestoreLeagueMemberMirrorDoc>(mirrorSnapshot);
    if (existingMembership && existingMembership.userId !== user.userId) {
      return {
        status: "missing-league" as const,
        leagueId,
        message: createMembershipProjectionConflictMessage(
          leagueId,
          user.userId,
          `membership-user-mismatch:${existingMembership.userId}`,
        ),
      };
    }

    const teamRefs = publicTeams.map((team) => teamRef(db, leagueId, team.id));
    const teamSnapshots = await Promise.all(
      teamRefs.map((teamRef) => transaction.get(teamRef)),
    );
    const createdAt = nowIso();
    const teams = publicTeams.map((team, index) => {
      const existingTeam = readDocData<FirestoreOnlineTeamDoc>(
        teamSnapshots[index] ?? null,
      );

      return existingTeam ?? {
        ...team,
        createdAt: team.createdAt ?? createdAt,
        updatedAt: team.updatedAt ?? createdAt,
      };
    });
    const existingResolvedMembership = resolveFirestoreMembershipForUser(
      existingMembership,
      existingMirror,
      teams,
      user,
      leagueId,
    );

    if (existingResolvedMembership) {
      const membershipProblem = getMembershipProjectionProblem(
        existingResolvedMembership,
        teams,
        existingMirror,
        leagueId,
      );

      if (
        membershipProblem &&
        (isMembershipTeamProjectionProblem(membershipProblem) ||
          !isMembershipMirrorProjectionProblem(membershipProblem))
      ) {
        return {
          status: "missing-league" as const,
          leagueId,
          message: createMembershipProjectionConflictMessage(
            leagueId,
            user.userId,
            membershipProblem,
          ),
        };
      }

      const canonicalMirror = createLeagueMemberMirrorFromMembership(
        leagueId,
        league,
        existingResolvedMembership,
        createdAt,
      );

      if (!isLeagueMemberMirrorAligned(existingMirror, leagueId, existingResolvedMembership)) {
        console.warn("[online-league] repairing membership mirror from canonical membership", {
          leagueId,
          membershipTeamId: existingResolvedMembership.teamId,
          mirrorTeamId: existingMirror?.teamId,
          mirrorStatus: existingMirror?.status,
          userId: user.userId,
        });
        transaction.set(leagueMemberRef(db, leagueId, user.userId), canonicalMirror, {
          merge: true,
        });
      }

      return {
        status: "already-member" as const,
        leagueId,
      };
    }

    const teamOnlyProjectionProblem = getTeamProjectionWithoutMembershipProblem(
      existingMembership,
      teams,
      user.userId,
    );

    if (teamOnlyProjectionProblem) {
      return {
        status: "missing-league" as const,
        leagueId,
        message: createMembershipProjectionConflictMessage(
          leagueId,
          user.userId,
          teamOnlyProjectionProblem,
        ),
      };
    }

    if (league.status !== "lobby") {
      return {
        status: "missing-league" as const,
        leagueId,
        message:
          "Du bist mit dieser Liga nicht als aktiver Manager verbunden. Suche eine Lobby-Liga oder kontaktiere einen Admin.",
      };
    }

    const resolvedIdentity = teamIdentity ? resolveTeamIdentitySelection(teamIdentity) : null;

    if (teamIdentity && !resolvedIdentity) {
      return {
        status: "invalid-team-identity" as const,
        leagueId,
        message: "Bitte wähle zuerst Stadt, Kategorie und Teamnamen.",
      };
    }

    if (league.memberCount >= league.maxTeams) {
      return {
        status: "full" as const,
        leagueId,
      };
    }

    const teamPool = teams.slice(0, league.maxTeams);

    if (teamPool.length === 0) {
      return {
        status: "full" as const,
        leagueId,
      };
    }

    const identityTaken = resolvedIdentity
      ? teams.some(
          (team) =>
            team.status !== "available" &&
            team.cityId === resolvedIdentity.cityId &&
            team.teamNameId === resolvedIdentity.teamNameId,
        )
      : false;

    if (identityTaken) {
      return {
        status: "team-identity-taken" as const,
        leagueId,
      };
    }

    const availableTeam = chooseAvailableFirestoreTeamForIdentity(
      teamPool,
      resolvedIdentity
        ? {
            cityId: resolvedIdentity.cityId,
            teamNameId: resolvedIdentity.teamNameId,
          }
        : null,
    );

    if (!availableTeam) {
      return {
        status: "full" as const,
        leagueId,
      };
    }

    if (availableTeam.status !== "available" && availableTeam.status !== "vacant") {
      return {
        status: "full" as const,
        leagueId,
      };
    }

    const nextTeam: FirestoreOnlineTeamDoc = {
      ...availableTeam,
      cityId: resolvedIdentity?.cityId ?? availableTeam.cityId,
      cityName: resolvedIdentity?.cityName ?? availableTeam.cityName,
      teamNameId: resolvedIdentity?.teamNameId ?? availableTeam.teamNameId,
      teamName: resolvedIdentity?.teamName ?? availableTeam.teamName,
      displayName: resolvedIdentity?.teamDisplayName ?? availableTeam.displayName,
      assignedUserId: user.userId,
      status: "assigned",
      updatedAt: createdAt,
    };
    const membership: FirestoreOnlineMembershipDoc = {
      userId: user.userId,
      username: user.username,
      role: existingMembership?.role === "admin" ? "admin" : "gm",
      teamId: nextTeam.id,
      joinedAt: existingMembership?.joinedAt ?? createdAt,
      lastSeenAt: createdAt,
      ready: false,
      status: "active",
      displayName: user.displayName,
    };
    const leagueMemberMirror = createLeagueMemberMirrorFromMembership(
      leagueId,
      league,
      membership,
      createdAt,
    );

    transaction.set(teamRef(db, leagueId, nextTeam.id), nextTeam, { merge: true });
    transaction.set(membershipRef(db, leagueId, user.userId), membership, { merge: true });
    transaction.set(leagueMemberRef(db, leagueId, user.userId), leagueMemberMirror, { merge: true });
    transaction.update(leagueRef(db, leagueId), {
      memberCount: increment(existingMembership?.teamId ? 0 : 1),
      updatedAt: createdAt,
      version: increment(1),
    });
    transaction.set(
      doc(eventsRef(db, leagueId)),
      createFirebaseOnlineEvent("user_joined_league", user.userId, {
        teamId: nextTeam.id,
        teamDisplayName: nextTeam.displayName,
      }),
    );

    return {
      status: "joined" as const,
      leagueId,
    };
  });
  const league =
    (await mapFirebaseMemberScopedLeague(db, leagueId, user)) ??
    createUnavailableOnlineLeague(leagueId);

  if (joinedLeague.status === "joined" || joinedLeague.status === "already-member") {
    setFirebaseLastLeagueId(leagueId);
  }

  if (joinedLeague.status === "missing-league") {
    return {
      status: "missing-league",
      league,
      message: joinedLeague.message,
    };
  }

  if (joinedLeague.status === "full") {
    return {
      status: "full",
      league,
      message: "Diese Liga ist bereits voll.",
    };
  }

  if (joinedLeague.status === "invalid-team-identity") {
    return {
      status: "invalid-team-identity",
      league,
      message: joinedLeague.message,
    };
  }

  if (joinedLeague.status === "team-identity-taken") {
    return {
      status: "team-identity-taken",
      league,
      message: "Diese Team-Identität ist in der Liga bereits vergeben.",
    };
  }

  return {
    status: joinedLeague.status,
    league,
  };
}

export async function setFirebaseUserReady(
  db: Firestore,
  leagueId: string,
  ready: boolean,
  expectedStep?: OnlineLeagueReadyStepGuard,
) {
  if (!isSafeOnlineSyncId(leagueId)) {
    throw createUnsafeLeagueIdError();
  }

  const user = await getFirebaseCurrentUser();
  assertWritableOnlineUser(user);
  const updatedAt = nowIso();

  await runTransaction(db, async (transaction) => {
    const leagueSnapshot = await transaction.get(leagueRef(db, leagueId));
    const membershipSnapshot = await transaction.get(membershipRef(db, leagueId, user.userId));
    const draftSnapshot = await transaction.get(draftRef(db, leagueId));
    const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);
    const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);
    const draftState = readDocData<FirestoreOnlineDraftStateDoc>(draftSnapshot);

    if (!league) {
      throw new Error("Online-Liga konnte nicht geladen werden.");
    }

    if (
      expectedStep &&
      (league.currentSeason !== expectedStep.season || league.currentWeek !== expectedStep.week)
    ) {
      throw new Error("Woche wurde bereits weitergeschaltet. Lade die Liga neu.");
    }

    const lockSnapshot = await transaction.get(
      doc(
        leagueRef(db, leagueId),
        "adminActionLocks",
        createAdminSimulationLockId(
          leagueId,
          league.currentSeason ?? 1,
          league.currentWeek,
        ),
      ),
    );

    if (isFirestoreWeekSimulationLockActive(lockSnapshot.data())) {
      throw new Error("Simulation läuft gerade. Bereit-Status kann erst danach geändert werden.");
    }

    if (!membership || membership.status !== "active") {
      throw new Error("Nur aktive Liga-Mitglieder können Ready setzen.");
    }

    if (!membership.teamId) {
      throw new Error("Bereit-Status ist nur mit zugewiesenem Team möglich.");
    }

    const teamSnapshot = await transaction.get(teamRef(db, leagueId, membership.teamId));
    const team = readDocData<FirestoreOnlineTeamDoc>(teamSnapshot);
    if (!team) {
      throw new Error(
        createMembershipProjectionConflictMessage(
          leagueId,
          user.userId,
          `missing-team:${membership.teamId}`,
        ),
      );
    }

    const membershipProblem = getMembershipProjectionProblem(
      membership,
      [team],
      null,
      leagueId,
    );

    if (membershipProblem) {
      throw new Error(
        createMembershipProjectionConflictMessage(leagueId, user.userId, membershipProblem),
      );
    }

    const mappedLeague = mapFirestoreSnapshotToOnlineLeague({
      league,
      draftState: draftState ?? undefined,
      memberships: [membership],
      teams: [team],
    });
    const lifecycle = normalizeOnlineCoreLifecycle({
      currentUser: { userId: user.userId, username: user.username },
      league: mappedLeague,
      requiresDraft: true,
    });

    if (!lifecycle.canSetReady) {
      throw new Error(
        lifecycle.reasons[0] ?? "Bereit-Status ist aktuell durch den Lifecycle gesperrt.",
      );
    }

    if (membership.ready === ready) {
      return;
    }

    transaction.update(membershipRef(db, leagueId, user.userId), {
      ready,
      lastSeenAt: updatedAt,
    });
    transaction.set(
      doc(eventsRef(db, leagueId)),
      createFirebaseOnlineEvent(ready ? "gm_ready_set" : "gm_ready_unset", user.userId, {
        teamId: membership.teamId,
      }),
    );
  });

  return mapFirebaseOnlineLeague(db, leagueId, { includeDraftPlayerPool: false });
}

export async function updateFirebaseDepthChart(
  db: Firestore,
  leagueId: string,
  depthChart: OnlineDepthChartEntry[],
) {
  if (!isSafeOnlineSyncId(leagueId)) {
    throw createUnsafeLeagueIdError();
  }

  const user = await getFirebaseCurrentUser();
  assertWritableOnlineUser(user);
  const updatedAt = nowIso();

  await runTransaction(db, async (transaction) => {
    const membershipSnapshot = await transaction.get(membershipRef(db, leagueId, user.userId));
    const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

    if (!membership || membership.status !== "active" || !membership.teamId) {
      throw new Error("Nur aktive Manager können ihre eigene Depth Chart ändern.");
    }

    const teamSnapshot = await transaction.get(teamRef(db, leagueId, membership.teamId));
    const team = readDocData<FirestoreOnlineTeamDoc>(teamSnapshot);
    if (!team) {
      throw new Error(
        createMembershipProjectionConflictMessage(
          leagueId,
          user.userId,
          `missing-team:${membership.teamId}`,
        ),
      );
    }

    const membershipProblem = getMembershipProjectionProblem(
      membership,
      [team],
      null,
      leagueId,
    );

    if (membershipProblem) {
      throw new Error(
        createMembershipProjectionConflictMessage(leagueId, user.userId, membershipProblem),
      );
    }

    if (hasSameDepthChartPayload(team.depthChart, depthChart)) {
      return;
    }

    transaction.update(teamRef(db, leagueId, membership.teamId), {
      depthChart: depthChart.map((entry) => ({
        ...entry,
        updatedAt,
      })),
      updatedAt,
    });
    transaction.set(
      doc(eventsRef(db, leagueId)),
      createFirebaseOnlineEvent("depth_chart_updated", user.userId, {
        teamId: membership.teamId,
      }),
    );
  });

  return mapFirebaseOnlineLeague(db, leagueId, { includeDraftPlayerPool: false });
}

export async function makeFirebaseFantasyDraftPick(
  db: Firestore,
  leagueId: string,
  teamId: string,
  playerId: string,
): Promise<OnlineFantasyDraftPickResult> {
  if (!isSafeOnlineSyncId(leagueId) || !isSafeOnlineSyncId(teamId) || !isSafeOnlineSyncId(playerId)) {
    throw createUnsafeLeagueIdError();
  }

  const user = await getFirebaseCurrentUser();
  assertWritableOnlineUser(user);
  const now = nowIso();
  const mappedLeagueBeforePick = await mapFirebaseOnlineLeague(db, leagueId);
  const result = await runTransaction(db, async (transaction) => {
    const activeDraftRef = draftRef(db, leagueId);
    const availablePlayerRef = doc(draftAvailablePlayersRef(db, leagueId), playerId);
    const [leagueSnapshot, draftSnapshot, availablePlayerSnapshot] = await Promise.all([
      transaction.get(leagueRef(db, leagueId)),
      transaction.get(activeDraftRef),
      transaction.get(availablePlayerRef),
    ]);
    const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);

    if (!league) {
      return {
        status: "missing-league" as const,
        message: "Liga konnte nicht gefunden werden.",
      };
    }

    const draftDoc = readDocData<FirestoreOnlineDraftStateDoc>(draftSnapshot);

    if (!draftDoc) {
      return {
        status: "draft-not-active" as const,
        message: "Fantasy Draft ist nicht initialisiert. Draft Doc fehlt.",
      };
    }

    const state = mappedLeagueBeforePick?.fantasyDraft ?? null;
    const playerPool = mappedLeagueBeforePick?.fantasyDraftPlayerPool ?? [];

    if (!state) {
      return {
        status: "draft-inconsistent" as const,
        message: "Draft-Quellen sind inkonsistent: Draft Doc konnte nicht gelesen werden.",
      };
    }

    if (state.status !== "active") {
      return {
        status: "draft-not-active" as const,
        message: "Fantasy Draft ist nicht aktiv.",
      };
    }

    if (playerPool.length === 0) {
      return {
        status: "draft-inconsistent" as const,
        message: "Draft-Quellen sind inkonsistent: Available-Player-Docs fehlen.",
      };
    }

    const integrity = validateMultiplayerDraftStateIntegrity(state);

    if (!integrity.ok) {
      console.error("[online-draft] blocked by draft state integrity conflict", {
        issueCodes: integrity.issues.map((issue) => issue.code),
        issueMessages: integrity.issues.map((issue) => issue.message),
        leagueId,
      });
      return {
        status: "draft-inconsistent" as const,
        message: `Draft-State ist inkonsistent: ${integrity.issues[0]?.message ?? "Bitte lade den Draft neu."}`,
      };
    }

    const sourceConsistency = validateMultiplayerDraftSourceConsistency({
      state,
      playerPool,
      legacyState: readFirestoreFantasyDraftState(league),
    });

    if (!sourceConsistency.ok) {
      console.error("[online-draft] blocked by contradictory draft sources", {
        issueCodes: sourceConsistency.issues.map((issue) => issue.code),
        issueMessages: sourceConsistency.issues.map((issue) => issue.message),
        leagueId,
      });
      return {
        status: "draft-inconsistent" as const,
        message: `Draft-Quellen sind inkonsistent: ${sourceConsistency.issues[0]?.message ?? "Bitte lade den Draft neu."}`,
      };
    }

    const membershipSnapshot = await transaction.get(membershipRef(db, leagueId, user.userId));
    const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

    if (!membership || membership.status !== "active" || membership.teamId !== teamId) {
      return {
        status: "missing-user" as const,
        message: "Manager gehoert nicht zu diesem Team.",
      };
    }

    if (state.currentTeamId !== teamId) {
      return {
        status: "wrong-team" as const,
        message: "Dieses Team ist aktuell nicht am Zug.",
      };
    }

    if (draftDoc && draftDoc.pickNumber !== state.pickNumber) {
      return {
        status: "draft-inconsistent" as const,
        message: `Draft-Quellen sind inkonsistent: Draft-Doc erwartet Pick ${draftDoc.pickNumber}, Pick-Docs ergeben Pick ${state.pickNumber}.`,
      };
    }

    if (draftDoc && draftDoc.currentTeamId !== state.currentTeamId) {
      return {
        status: "draft-inconsistent" as const,
        message: `Draft-Quellen sind inkonsistent: Draft-Doc erwartet Team ${draftDoc.currentTeamId || "n/a"}, Pick-Docs ergeben Team ${state.currentTeamId || "n/a"}.`,
      };
    }

    if (draftDoc && draftDoc.status !== state.status) {
      return {
        status: "draft-inconsistent" as const,
        message: `Draft-Quellen sind inkonsistent: Draft-Doc ist ${draftDoc.status}, Pick-Docs/Available-Players ergeben ${state.status}.`,
      };
    }

    const draftRunId = draftDoc?.draftRunId;
    const availablePlayer = readDocData<FirestoreOnlineDraftAvailablePlayerDoc>(
      availablePlayerSnapshot,
    );

    if (
      !state.availablePlayerIds.includes(playerId) ||
      state.picks.some((pick) => pick.playerId === playerId) ||
      !belongsToCurrentMultiplayerDraftRun(availablePlayer, draftRunId)
    ) {
      return {
        status: "player-unavailable" as const,
        message: "Spieler ist nicht mehr verfuegbar.",
      };
    }

    const validation = validatePreparedMultiplayerDraftPick({
      state,
      teamIds: mappedLeagueBeforePick?.users.map((candidate) => candidate.teamId) ?? [],
      teamId,
      playerId,
      availablePlayers: playerPool,
      existingPicks: state.picks,
      rosterSize: state.picks.filter((pick) => pick.teamId === teamId).length,
    });

    if (!validation.ok) {
      return {
        status: mapDraftPickValidationStatus(validation.status),
        message: validation.message,
      };
    }

    const selectedPlayer = validation.player;

    const pickRef = doc(
      draftPicksRef(db, leagueId),
      getMultiplayerDraftPickDocumentId(state.pickNumber),
    );
    const existingPickSnapshot = await transaction.get(pickRef);
    const existingPick = readDocData<FirestoreOnlineDraftPickDoc>(existingPickSnapshot);

    if (isCurrentMultiplayerDraftPickDocumentOccupied(existingPick, draftRunId)) {
      return {
        status: "draft-not-active" as const,
        message: "Draft-State wurde aktualisiert. Bitte lade den Draft neu.",
      };
    }

    const pick: OnlineFantasyDraftPick = {
      pickNumber: state.pickNumber,
      round: state.round,
      teamId,
      playerId,
      pickedByUserId: user.userId,
      timestamp: now,
    };
    const pickedState: OnlineFantasyDraftState = {
      ...state,
      picks: [...state.picks, pick],
      availablePlayerIds: state.availablePlayerIds.filter((candidate) => candidate !== playerId),
    };
    const nextState = getNextFantasyDraftState(pickedState, playerPool, now);

    transaction.set(
      pickRef,
      toFirestoreDraftPickDoc(pick, selectedPlayer, draftRunId),
    );
    transaction.delete(availablePlayerRef);
    transaction.set(activeDraftRef, toFirestoreDraftStateDoc(nextState, draftRunId), { merge: true });
    transaction.set(
      doc(eventsRef(db, leagueId)),
      createFirebaseOnlineEvent("draft_pick_made", user.userId, {
        teamId,
        playerId,
        playerName: selectedPlayer.playerName,
        pickNumber: pick.pickNumber,
        round: pick.round,
      }),
    );

    if (nextState.status === "completed") {
      const playersById = new Map(playerPool.map((player) => [player.playerId, player]));

      nextState.draftOrder.forEach((draftTeamId) => {
        const roster = nextState.picks
          .filter((candidate) => candidate.teamId === draftTeamId)
          .sort((left, right) => left.pickNumber - right.pickNumber)
          .map((candidate) => playersById.get(candidate.playerId))
          .filter((player): player is OnlineContractPlayer => Boolean(player));

        transaction.update(teamRef(db, leagueId, draftTeamId), {
          contractRoster: roster,
          depthChart: createRosterDepthChart(roster, now),
          updatedAt: now,
        });
      });
      transaction.update(leagueRef(db, leagueId), {
        status: "active",
        currentWeek: 1,
        currentSeason: 1,
        "settings.fantasyDraft": deleteField(),
        "settings.fantasyDraftPlayerPool": deleteField(),
        updatedAt: now,
        version: increment(1),
      });
      transaction.set(
        doc(eventsRef(db, leagueId)),
        createFirebaseOnlineEvent("fantasy_draft_completed", user.userId, {
          totalPicks: nextState.picks.length,
        }),
      );
    } else {
      transaction.update(leagueRef(db, leagueId), {
        updatedAt: now,
        version: increment(1),
      });
    }

    return {
      status: nextState.status === "completed" ? "completed" as const : "success" as const,
      pick,
      message:
        nextState.status === "completed"
          ? "Fantasy Draft abgeschlossen. Liga ist bereit fuer Week 1."
          : "Pick gespeichert.",
    };
  });
  const mappedLeague = await mapFirebaseOnlineLeague(db, leagueId);

  if ("pick" in result) {
    return {
      ...result,
      league: mappedLeague ?? createUnavailableOnlineLeague(leagueId),
    };
  }

  return {
    ...result,
    league: mappedLeague,
  };
}

function rejectClientAdminAction<T>(): Promise<T> {
  return Promise.reject(
    new Error("Admin-Aktionen werden serverseitig über den Admin-Route-Handler ausgeführt."),
  );
}

export function createFirebaseClientAdminRejections(): OnlineLeagueRepository["admin"] {
  return {
    archiveLeague: async () => rejectClientAdminAction<void>(),
    resetLeague: async () => rejectClientAdminAction(),
    removeMember: async () => rejectClientAdminAction<void>(),
    markTeamVacant: async () => rejectClientAdminAction<void>(),
    setAllReady: async () => rejectClientAdminAction(),
    startLeague: async () => rejectClientAdminAction(),
    simulateWeekPlaceholder: async () => rejectClientAdminAction(),
  };
}
