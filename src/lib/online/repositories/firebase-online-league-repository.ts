import {
  deleteDoc,
  doc,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

import { getFirebaseClientApp } from "@/lib/firebase/client";

import {
  type JoinOnlineLeagueResult,
  type OnlineDepthChartEntry,
  type OnlineFantasyDraftPickResult,
  type OnlineLeague,
} from "../online-league-service";
import type { TeamIdentitySelection } from "../team-identity-options";
import {
  type FirestoreOnlineEventDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
  type OnlineLeagueRepository,
  type OnlineLeagueReadOptions,
  type OnlineLeagueReadyStepGuard,
  type OnlineLeagueRepositoryUnsubscribe,
} from "../types";
import {
  clearFirebaseLastLeagueId,
  createFirebaseClientAdminRejections,
  getFirebaseLastLeagueId,
  joinFirebaseLeague,
  makeFirebaseFantasyDraftPick,
  setFirebaseUserReady,
  setFirebaseLastLeagueId,
  updateFirebaseDepthChart,
} from "./firebase-online-league-commands";
import {
  getFirebaseAvailableLeagues,
  getFirebaseCurrentUser,
  getFirebaseLeagueById,
} from "./firebase-online-league-queries";
import {
  subscribeToFirebaseAvailableLeagues,
  subscribeToFirebaseCurrentUserMembership,
  subscribeToFirebaseLeague,
  subscribeToFirebaseLeagueEvents,
  subscribeToFirebaseMemberships,
  subscribeToFirebaseTeams,
} from "./firebase-online-league-subscriptions";

export {
  canLoadOnlineLeagueFromMembership,
  chooseAvailableFirestoreTeamForIdentity,
  chooseFirstAvailableFirestoreTeam,
  createLeagueMemberMirrorFromMembership,
  getMembershipProjectionProblem,
  getTeamProjectionWithoutMembershipProblem,
  isFirestoreWeekSimulationLockActive,
  isLeagueMemberMirrorAligned,
  resolveFirestoreMembershipForUser,
} from "./firebase-online-league-mappers";
export { resolveLeagueDiscoveryCandidateIds } from "./firebase-online-league-queries";

export class FirebaseOnlineLeagueRepository implements OnlineLeagueRepository {
  readonly mode = "firebase" as const;
  private readonly db: Firestore;

  constructor(db = getFirestore(getFirebaseClientApp())) {
    this.db = db;
  }

  async getCurrentUser() {
    return getFirebaseCurrentUser();
  }

  async createLeague(): Promise<OnlineLeague> {
    throw new Error(
      "Admin-Aktionen werden serverseitig über den Admin-Route-Handler ausgeführt.",
    );
  }

  async getAvailableLeagues() {
    return getFirebaseAvailableLeagues(this.db);
  }

  async getLeagueById(leagueId: string, options?: OnlineLeagueReadOptions) {
    return getFirebaseLeagueById(this.db, leagueId, options);
  }

  async joinLeague(
    leagueId: string,
    teamIdentity?: TeamIdentitySelection,
  ): Promise<JoinOnlineLeagueResult> {
    return joinFirebaseLeague(this.db, leagueId, teamIdentity);
  }

  async setUserReady(
    leagueId: string,
    ready: boolean,
    expectedStep?: OnlineLeagueReadyStepGuard,
  ) {
    return setFirebaseUserReady(this.db, leagueId, ready, expectedStep);
  }

  async updateDepthChart(leagueId: string, depthChart: OnlineDepthChartEntry[]) {
    return updateFirebaseDepthChart(this.db, leagueId, depthChart);
  }

  async makeFantasyDraftPick(
    leagueId: string,
    teamId: string,
    playerId: string,
  ): Promise<OnlineFantasyDraftPickResult> {
    return makeFirebaseFantasyDraftPick(this.db, leagueId, teamId, playerId);
  }

  getLastLeagueId() {
    return getFirebaseLastLeagueId();
  }

  setLastLeagueId(leagueId: string) {
    setFirebaseLastLeagueId(leagueId);
  }

  clearLastLeagueId(leagueId?: string) {
    clearFirebaseLastLeagueId(leagueId);
  }

  subscribeToLeague(
    leagueId: string,
    onNext: (league: OnlineLeague | null) => void,
    onError?: (error: Error) => void,
    options?: OnlineLeagueReadOptions,
  ): OnlineLeagueRepositoryUnsubscribe {
    return subscribeToFirebaseLeague(this.db, leagueId, onNext, onError, options);
  }

  subscribeToAvailableLeagues(
    onNext: (leagues: OnlineLeague[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return subscribeToFirebaseAvailableLeagues(this.db, onNext, onError);
  }

  subscribeToMemberships(
    leagueId: string,
    onNext: (memberships: FirestoreOnlineMembershipDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return subscribeToFirebaseMemberships(this.db, leagueId, onNext, onError);
  }

  subscribeToTeams(
    leagueId: string,
    onNext: (teams: FirestoreOnlineTeamDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return subscribeToFirebaseTeams(this.db, leagueId, onNext, onError);
  }

  subscribeToCurrentUserMembership(
    leagueId: string,
    userId: string,
    onNext: (membership: FirestoreOnlineMembershipDoc | null) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return subscribeToFirebaseCurrentUserMembership(this.db, leagueId, userId, onNext, onError);
  }

  subscribeToLeagueEvents(
    leagueId: string,
    onNext: (events: FirestoreOnlineEventDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return subscribeToFirebaseLeagueEvents(this.db, leagueId, onNext, onError);
  }

  admin = createFirebaseClientAdminRejections();
}

export async function deleteFirebaseOnlineLeagueForTest(
  db: Firestore,
  leagueId: string,
) {
  await deleteDoc(doc(db, "leagues", leagueId));
}
