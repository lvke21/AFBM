import { expect, test, type Page } from "@playwright/test";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import {
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
  type OnlineContractPlayer,
  type OnlineFantasyDraftPosition,
  type OnlineLeague,
} from "../src/lib/online/online-league-service";
import { E2E_NAVIGATION_TIMEOUT_MS } from "./helpers/e2e-harness";

const E2E_FIREBASE_ADMIN_ID_TOKEN = process.env.E2E_FIREBASE_ADMIN_ID_TOKEN ?? "";
const TEAM_COUNT = 16;
const EXPECTED_PICK_COUNT = TEAM_COUNT * ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE;
const EXPECTED_POOL_SIZE = Object.values(ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS).reduce(
  (sum, count) => sum + Math.ceil(count * TEAM_COUNT * 1.2),
  0,
);

process.env.FIREBASE_PROJECT_ID ??= process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-afbm";
process.env.FIRESTORE_EMULATOR_HOST ??=
  process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

type AdminActionResponse = {
  ok: boolean;
  message: string;
  league?: OnlineLeague | null;
};

async function openAdminContext(page: Page) {
  await page.goto("/", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
}

async function runFirebaseAdminAction(
  page: Page,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<AdminActionResponse> {
  return page.evaluate(
    async ({ targetAction, actionPayload, adminToken }) => {
      const response = await fetch("/admin/api/online/actions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: targetAction,
          backendMode: "firebase",
          ...actionPayload,
        }),
      });
      const result = (await response.json()) as AdminActionResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Firebase Admin-Aktion fehlgeschlagen.");
      }

      return result;
    },
    {
      targetAction: action,
      actionPayload: payload,
      adminToken: E2E_FIREBASE_ADMIN_ID_TOKEN,
    },
  );
}

async function seedSixteenFirebaseUsers(league: OnlineLeague) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(league.id);
  const batch = firestore.batch();
  const now = new Date("2026-05-01T08:00:00.000Z").toISOString();
  const teams = league.teams.slice(0, TEAM_COUNT);

  expect(teams).toHaveLength(TEAM_COUNT);

  teams.forEach((team, index) => {
    const userId = `firebase-draft-user-${String(index + 1).padStart(2, "0")}`;
    const username = `Firebase Draft User ${String(index + 1).padStart(2, "0")}`;

    batch.set(leagueRef.collection("memberships").doc(userId), {
      userId,
      username,
      displayName: username,
      role: "gm",
      teamId: team.id,
      joinedAt: now,
      lastSeenAt: now,
      ready: false,
      status: "active",
    });
    batch.update(leagueRef.collection("teams").doc(team.id), {
      assignedUserId: userId,
      status: "assigned",
      updatedAt: now,
    });
  });

  batch.update(leagueRef, {
    memberCount: teams.length,
    updatedAt: now,
    version: FieldValue.increment(1),
  });

  await batch.commit();
}

async function readLeagueFromAdminAction(page: Page, leagueId: string) {
  const result = await runFirebaseAdminAction(page, "initializeFantasyDraft", { leagueId });

  expect(result.league).not.toBeNull();

  return result.league as OnlineLeague;
}

async function readFirestoreLeague(leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueId);
  const [leagueSnapshot, draftSnapshot, picksSnapshot, availablePlayersSnapshot] =
    await Promise.all([
      leagueRef.get(),
      leagueRef.collection("draft").doc("main").get(),
      leagueRef.collection("draft").doc("main").collection("picks").orderBy("pickNumber").get(),
      leagueRef.collection("draft").doc("main").collection("availablePlayers").get(),
    ]);

  expect(leagueSnapshot.exists).toBe(true);

  return {
    league: leagueSnapshot.data() as {
      status: string;
      currentWeek: number;
      currentSeason: number;
      weekStatus?: string;
      settings?: {
        fantasyDraft?: OnlineLeague["fantasyDraft"];
        fantasyDraftPlayerPool?: OnlineContractPlayer[];
      };
    },
    draftState: draftSnapshot.data() as
      | {
          status: string;
          round: number;
          pickNumber: number;
          currentTeamId: string;
          completedAt?: string;
          draftOrder: string[];
        }
      | undefined,
    picks: picksSnapshot.docs.map((document) => document.data() as {
      pickNumber: number;
      round: number;
      teamId: string;
      playerId: string;
      pickedByUserId: string;
      timestamp: string;
      playerSnapshot?: OnlineContractPlayer;
    }),
    availablePlayers: availablePlayersSnapshot.docs.map(
      (document) => document.data() as OnlineContractPlayer,
    ),
  };
}

async function readFirestoreTeamRosters(leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore.collection("leagues").doc(leagueId).collection("teams").get();

  return snapshot.docs.map((document) => ({
    teamId: document.id,
    roster: ((document.data().contractRoster as OnlineContractPlayer[] | undefined) ?? []).filter(
      (player) => player.status === "active",
    ),
  }));
}

function expectedSnakeTeamId(draftOrder: string[], pickIndex: number) {
  const roundIndex = Math.floor(pickIndex / draftOrder.length);
  const indexInRound = pickIndex % draftOrder.length;
  const roundOrder = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();

  return roundOrder[indexInRound];
}

function countRosterPositions(roster: OnlineContractPlayer[]) {
  return roster.reduce<Record<OnlineFantasyDraftPosition, number>>(
    (counts, player) => ({
      ...counts,
      [player.position as OnlineFantasyDraftPosition]:
        counts[player.position as OnlineFantasyDraftPosition] + 1,
    }),
    {
      QB: 0,
      RB: 0,
      WR: 0,
      TE: 0,
      OL: 0,
      DL: 0,
      LB: 0,
      CB: 0,
      S: 0,
      K: 0,
      P: 0,
    },
  );
}

test.describe.serial("Firebase 16-Team Fantasy Draft E2E", () => {
  test.setTimeout(360_000);

  test("erstellt, startet und beendet einen kompletten 16-Team-Fantasy-Draft", async ({
    page,
  }) => {
    const leagueName = `Firebase 16 Team Draft ${Date.now()}`;
    let leagueId = "";

    await openAdminContext(page);

    await test.step("Liga wird ueber Firebase-Admin-Action erstellt", async () => {
      const created = await runFirebaseAdminAction(page, "createLeague", {
        name: leagueName,
        maxUsers: TEAM_COUNT,
        startWeek: 1,
      });

      expect(created.message).toBe(`${leagueName} wurde erstellt.`);
      expect(created.league?.teams).toHaveLength(TEAM_COUNT);
      expect(created.league?.fantasyDraftPlayerPool).toHaveLength(EXPECTED_POOL_SIZE);

      leagueId = created.league?.id ?? "";
      expect(leagueId).toBeTruthy();
    });

    await test.step("16 Teams/User werden im Firestore-Emulator simuliert", async () => {
      const initializedLeague = await readLeagueFromAdminAction(page, leagueId);

      await seedSixteenFirebaseUsers(initializedLeague);

      const reloadedLeague = await readLeagueFromAdminAction(page, leagueId);

      expect(reloadedLeague.users).toHaveLength(TEAM_COUNT);
      expect(reloadedLeague.users.every((user) => user.teamId && user.userId)).toBe(true);
    });

    await test.step("Draft startet mit 16 Teams und stabiler Reihenfolge", async () => {
      const started = await runFirebaseAdminAction(page, "startFantasyDraft", { leagueId });
      const draft = started.league?.fantasyDraft;

      expect(started.message).toBe("Fantasy Draft wurde gestartet.");
      expect(draft?.status).toBe("active");
      expect(draft?.round).toBe(1);
      expect(draft?.pickNumber).toBe(1);
      expect(draft?.draftOrder).toHaveLength(TEAM_COUNT);
      expect(draft?.availablePlayerIds).toHaveLength(EXPECTED_POOL_SIZE);
      expect(new Set(draft?.draftOrder).size).toBe(TEAM_COUNT);
    });

    await test.step("Draft-State bleibt nach Reload korrekt", async () => {
      for (let index = 0; index < 3; index += 1) {
        const result = await runFirebaseAdminAction(page, "autoDraftNextFantasyDraft", {
          leagueId,
        });

        expect(result.message).toContain("Auto-Draft Pick gespeichert");
      }

      const beforeReload = await readFirestoreLeague(leagueId);
      expect(beforeReload.league.settings?.fantasyDraft).toBeUndefined();
      expect(beforeReload.league.settings?.fantasyDraftPlayerPool).toBeUndefined();
      expect(beforeReload.picks).toHaveLength(3);
      expect(beforeReload.draftState?.round).toBe(1);
      expect(beforeReload.draftState?.pickNumber).toBe(4);
      expect(
        beforeReload.availablePlayers.some(
          (player) => player.playerId === (beforeReload.picks[0]?.playerId ?? ""),
        ),
      )
        .toBe(false);

      await page.goto("/", {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });
      await page.reload({ waitUntil: "domcontentloaded" });

      const afterReload = await readFirestoreLeague(leagueId);
      expect(afterReload.picks).toHaveLength(3);
      expect(afterReload.draftState?.round).toBe(1);
      expect(afterReload.draftState?.pickNumber).toBe(4);
    });

    await test.step("Alle restlichen Picks laufen durch", async () => {
      const completed = await runFirebaseAdminAction(page, "autoDraftToEndFantasyDraft", {
        leagueId,
      });

      expect(completed.message).toContain("Auto-Draft ausgefuehrt");
      expect(completed.league?.fantasyDraft?.status).toBe("completed");
    });

    await test.step("Pick-Historie, Doppelpick-Schutz, Kader und Week 1 sind korrekt", async () => {
      const { league, draftState, picks, availablePlayers } = await readFirestoreLeague(leagueId);
      const playerPool = [
        ...availablePlayers,
        ...picks
          .map((pick) => pick.playerSnapshot)
          .filter((player): player is OnlineContractPlayer => Boolean(player)),
      ];
      const pickedPlayerIds = picks.map((pick) => pick.playerId);

      expect(league.settings?.fantasyDraft).toBeUndefined();
      expect(league.settings?.fantasyDraftPlayerPool).toBeUndefined();
      expect(draftState?.status).toBe("completed");
      expect(draftState?.currentTeamId).toBe("");
      expect(draftState?.completedAt).toBeTruthy();
      expect(picks).toHaveLength(EXPECTED_PICK_COUNT);
      expect(new Set(pickedPlayerIds).size).toBe(pickedPlayerIds.length);
      expect(availablePlayers).toHaveLength(EXPECTED_POOL_SIZE - EXPECTED_PICK_COUNT);
      expect(
        availablePlayers.some((player) => pickedPlayerIds.includes(player.playerId)),
      ).toBe(false);
      expect(playerPool).toHaveLength(EXPECTED_POOL_SIZE);

      picks.forEach((pick, index) => {
        expect(pick.pickNumber).toBe(index + 1);
        expect(pick.round).toBe(Math.floor(index / TEAM_COUNT) + 1);
        expect(pick.teamId).toBe(expectedSnakeTeamId(draftState?.draftOrder ?? [], index));
        expect(pick.pickedByUserId).toBeTruthy();
        expect(pick.timestamp).toBeTruthy();
      });

      const rosters = await readFirestoreTeamRosters(leagueId);

      expect(rosters).toHaveLength(TEAM_COUNT);
      rosters.forEach(({ roster }) => {
        const counts = countRosterPositions(roster);

        expect(roster).toHaveLength(ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE);
        Object.entries(ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS).forEach(
          ([position, requiredCount]) => {
            expect(counts[position as OnlineFantasyDraftPosition]).toBeGreaterThanOrEqual(
              requiredCount,
            );
          },
        );
      });

      expect(league.status).toBe("active");
      expect(league.currentSeason).toBe(1);
      expect(league.currentWeek).toBe(1);
    });
  });
});
