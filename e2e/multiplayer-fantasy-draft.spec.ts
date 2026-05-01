import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "crypto";

import { E2E_NAVIGATION_TIMEOUT_MS } from "./helpers/e2e-harness";

const ADMIN_E2E_CODE = process.env.AFBM_ADMIN_ACCESS_CODE ?? "e2e-admin-code";
const ADMIN_E2E_SESSION_SECRET =
  process.env.AFBM_ADMIN_SESSION_SECRET ?? ADMIN_E2E_CODE;
const ONLINE_LEAGUES_STORAGE_KEY = "afbm.online.leagues";
const ONLINE_LAST_LEAGUE_ID_STORAGE_KEY = "afbm.online.lastLeagueId";
const ONLINE_USER_ID_STORAGE_KEY = "afbm.online.userId";
const ONLINE_USERNAME_STORAGE_KEY = "afbm.online.username";
const EXPERT_MODE_STORAGE_KEY = "afbm-online-league-expert-mode";
const TEAM_COUNT = 16;
const ROSTER_REQUIREMENTS = {
  QB: 2,
  RB: 3,
  WR: 5,
  TE: 2,
  OL: 8,
  DL: 6,
  LB: 5,
  CB: 5,
  S: 3,
  K: 1,
  P: 1,
} as const;
const ROSTER_TARGET_SIZE = Object.values(ROSTER_REQUIREMENTS).reduce(
  (sum, count) => sum + count,
  0,
);
const EXPECTED_POOL_SIZE = Object.values(ROSTER_REQUIREMENTS).reduce(
  (sum, count) => sum + Math.ceil(count * TEAM_COUNT * 1.2),
  0,
);

type DraftPosition = keyof typeof ROSTER_REQUIREMENTS;

type StoredDraftPick = {
  pickNumber: number;
  round: number;
  teamId: string;
  playerId: string;
  pickedByUserId: string;
  timestamp: string;
};

type StoredDraftState = {
  status: "not_started" | "active" | "completed";
  round: number;
  pickNumber: number;
  currentTeamId: string;
  draftOrder: string[];
  picks: StoredDraftPick[];
  availablePlayerIds: string[];
  startedAt: string | null;
  completedAt: string | null;
};

type StoredPlayer = {
  playerId: string;
  playerName: string;
  position: DraftPosition;
  overall: number;
  age: number;
  status?: string;
};

type StoredLeagueUser = {
  userId: string;
  username: string;
  teamId: string;
  teamName: string;
  teamDisplayName?: string;
  contractRoster?: StoredPlayer[];
};

type StoredLeague = {
  id: string;
  name: string;
  maxUsers: number;
  status: string;
  currentWeek: number;
  weekStatus?: string;
  teams: Array<{ id: string; name: string }>;
  users: StoredLeagueUser[];
  fantasyDraft?: StoredDraftState;
  fantasyDraftPlayerPool?: StoredPlayer[];
};

type LocalAdminStatePatch = {
  leaguesJson: string | null;
  lastLeagueId: string | null;
  resetCurrentUser?: boolean;
};

type AdminActionResponse = {
  ok: boolean;
  message: string;
  league?: StoredLeague | null;
  leagues?: StoredLeague[];
  localState?: LocalAdminStatePatch;
};

function createAdminSessionToken() {
  return createHmac("sha256", ADMIN_E2E_SESSION_SECRET)
    .update("afbm-admin-session-v1")
    .digest("hex");
}

async function resetOnlineLocalState(page: Page) {
  await page.goto("/", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
  await page.evaluate(
    ({
      leaguesKey,
      lastLeagueKey,
      userIdKey,
      usernameKey,
      expertModeKey,
    }) => {
      localStorage.removeItem(leaguesKey);
      localStorage.removeItem(lastLeagueKey);
      localStorage.removeItem(userIdKey);
      localStorage.removeItem(usernameKey);
      localStorage.removeItem(expertModeKey);
    },
    {
      leaguesKey: ONLINE_LEAGUES_STORAGE_KEY,
      lastLeagueKey: ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
      userIdKey: ONLINE_USER_ID_STORAGE_KEY,
      usernameKey: ONLINE_USERNAME_STORAGE_KEY,
      expertModeKey: EXPERT_MODE_STORAGE_KEY,
    },
  );
}

async function loginAsAdmin(page: Page) {
  await page.goto("/", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  await page.context().addCookies([
    {
      name: "afbm.admin.session",
      value: createAdminSessionToken(),
      url: `${new URL(page.url()).origin}/admin`,
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  ]);

  await page.goto("/admin", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Neue Online-Liga" })).toBeVisible();
}

async function readLeague(page: Page, leagueId: string): Promise<StoredLeague | null> {
  return page.evaluate(
    ({ leaguesKey, targetLeagueId }) => {
      const leagues = JSON.parse(
        localStorage.getItem(leaguesKey) ?? "[]",
      ) as StoredLeague[];

      return leagues.find((league) => league.id === targetLeagueId) ?? null;
    },
    {
      leaguesKey: ONLINE_LEAGUES_STORAGE_KEY,
      targetLeagueId: leagueId,
    },
  );
}

async function findLeagueByName(page: Page, leagueName: string): Promise<StoredLeague | null> {
  return page.evaluate(
    ({ leaguesKey, targetLeagueName }) => {
      const leagues = JSON.parse(
        localStorage.getItem(leaguesKey) ?? "[]",
      ) as StoredLeague[];

      return leagues.find((league) => league.name === targetLeagueName) ?? null;
    },
    {
      leaguesKey: ONLINE_LEAGUES_STORAGE_KEY,
      targetLeagueName: leagueName,
    },
  );
}

async function requireLeague(page: Page, leagueId: string) {
  const league = await readLeague(page, leagueId);

  expect(league, `league ${leagueId} should exist`).not.toBeNull();

  return league as StoredLeague;
}

async function runLocalAdminAction(
  page: Page,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<AdminActionResponse> {
  return page.evaluate(
    async ({
      targetAction,
      actionPayload,
      leaguesKey,
      lastLeagueKey,
      userIdKey,
      usernameKey,
    }) => {
      const localState = {
        leaguesJson: localStorage.getItem(leaguesKey),
        lastLeagueId: localStorage.getItem(lastLeagueKey),
        userId: localStorage.getItem(userIdKey),
        username: localStorage.getItem(usernameKey),
      };
      const response = await fetch("/admin/api/online/actions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: targetAction,
          backendMode: "local",
          localState,
          ...actionPayload,
        }),
      });
      const result = (await response.json()) as AdminActionResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Admin-Aktion konnte nicht ausgefuehrt werden.");
      }

      if (result.localState) {
        if (result.localState.leaguesJson) {
          localStorage.setItem(leaguesKey, result.localState.leaguesJson);
        } else {
          localStorage.removeItem(leaguesKey);
        }

        if (result.localState.lastLeagueId) {
          localStorage.setItem(lastLeagueKey, result.localState.lastLeagueId);
        } else {
          localStorage.removeItem(lastLeagueKey);
        }

        if (result.localState.resetCurrentUser) {
          localStorage.removeItem(userIdKey);
          localStorage.removeItem(usernameKey);
        }
      }

      return result;
    },
    {
      targetAction: action,
      actionPayload: payload,
      leaguesKey: ONLINE_LEAGUES_STORAGE_KEY,
      lastLeagueKey: ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
      userIdKey: ONLINE_USER_ID_STORAGE_KEY,
      usernameKey: ONLINE_USERNAME_STORAGE_KEY,
    },
  );
}

async function waitForPickCount(page: Page, leagueId: string, expectedCount: number) {
  await expect
    .poll(
      async () => {
        const league = await readLeague(page, leagueId);

        return league?.fantasyDraft?.picks.length ?? -1;
      },
      { timeout: 30_000 },
    )
    .toBe(expectedCount);
}

function expectedSnakeTeamId(draftOrder: string[], pickIndex: number) {
  const roundIndex = Math.floor(pickIndex / draftOrder.length);
  const indexInRound = pickIndex % draftOrder.length;
  const roundOrder = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();

  return roundOrder[indexInRound];
}

function countRosterPositions(roster: StoredPlayer[]) {
  return roster.reduce<Record<DraftPosition, number>>(
    (counts, player) => ({
      ...counts,
      [player.position]: counts[player.position] + 1,
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

test.describe("Multiplayer Fantasy Draft E2E", () => {
  test.use({ actionTimeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await resetOnlineLocalState(page);
  });

  test("erstellt, startet und beendet einen kompletten 16-Team-Fantasy-Draft", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const leagueName = `Fantasy Draft E2E ${Date.now()}`;

    await test.step("Admin erstellt eine Liga und fuellt sie mit 16 Teams/Usern", async () => {
      await loginAsAdmin(page);
      const createResult = await runLocalAdminAction(page, "createLeague", {
        name: leagueName,
        maxUsers: TEAM_COUNT,
        startWeek: 1,
      });

      expect(createResult.message).toBe(`${leagueName} wurde erstellt.`);

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("link", { name: `Öffnen ${leagueName}` })).toBeVisible();

      const fillResult = await runLocalAdminAction(page, "debugFillLeague");

      expect(fillResult.message).toBe("Liga wurde mit Debug-Spielern gefüllt.");
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText("16/16 Spieler")).toBeVisible();

      const league = await findLeagueByName(page, leagueName);

      expect(league).not.toBeNull();
      expect(league?.teams).toHaveLength(TEAM_COUNT);
      expect(league?.users).toHaveLength(TEAM_COUNT);
      expect(league?.fantasyDraftPlayerPool).toHaveLength(EXPECTED_POOL_SIZE);
      expect(new Set(league?.fantasyDraftPlayerPool?.map((player) => player.playerId)).size).toBe(
        EXPECTED_POOL_SIZE,
      );
    });

    const createdLeague = await findLeagueByName(page, leagueName);
    const leagueId = createdLeague?.id;

    expect(leagueId).toBeTruthy();

    await test.step("Admin initialisiert und startet den Draft", async () => {
      await page.getByRole("link", { name: `Öffnen ${leagueName}` }).click();
      await expect(page.getByText("Fantasy Draft Control")).toBeVisible();

      const initializeResult = await runLocalAdminAction(page, "initializeFantasyDraft", {
        leagueId,
      });

      expect(initializeResult.message).toBe("Fantasy Draft wurde initialisiert.");

      const startResult = await runLocalAdminAction(page, "startFantasyDraft", {
        leagueId,
      });

      expect(startResult.message).toBe("Fantasy Draft wurde gestartet.");
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText("Status").first()).toBeVisible();
      await expect(page.getByText("active").first()).toBeVisible();

      const league = await requireLeague(page, leagueId as string);

      expect(league.fantasyDraft?.status).toBe("active");
      expect(league.fantasyDraft?.round).toBe(1);
      expect(league.fantasyDraft?.pickNumber).toBe(1);
      expect(league.fantasyDraft?.draftOrder).toHaveLength(TEAM_COUNT);
      expect(league.fantasyDraft?.availablePlayerIds).toHaveLength(EXPECTED_POOL_SIZE);
    });

    await test.step("Ein falsches Team kann im Draft Room nicht picken", async () => {
      const league = await requireLeague(page, leagueId as string);
      const currentTeamId = league.fantasyDraft?.currentTeamId;
      const wrongUser = league.users.find((user) => user.teamId !== currentTeamId);

      expect(wrongUser).toBeTruthy();

      await page.evaluate(
        ({ userIdKey, usernameKey, user }) => {
          localStorage.setItem(userIdKey, user.userId);
          localStorage.setItem(usernameKey, user.username);
        },
        {
          userIdKey: ONLINE_USER_ID_STORAGE_KEY,
          usernameKey: ONLINE_USERNAME_STORAGE_KEY,
          user: wrongUser as StoredLeagueUser,
        },
      );
      await page.goto(`/online/league/${leagueId}`, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible();
      await expect(page.getByText("Draft Room")).toHaveCount(0);
      await page.getByRole("link", { name: "Draft" }).click();
      await expect(page.getByText("Draft Room")).toBeVisible();
      await expect(page.getByText("Warte auf anderes Team")).toBeVisible();
      await expect(page.getByRole("button", { name: "Pick bestaetigen" })).toBeDisabled();

      await page.goto(`/admin/league/${leagueId}`, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByText("Fantasy Draft Control")).toBeVisible();
    });

    await test.step("Snake-Reihenfolge, Reload und verfuegbare Spieler bleiben konsistent", async () => {
      const leagueBeforePicks = await requireLeague(page, leagueId as string);
      const draftOrder = leagueBeforePicks.fantasyDraft?.draftOrder ?? [];
      const observedTeamIds: string[] = [];

      for (let index = 0; index < TEAM_COUNT + 2; index += 1) {
        const beforePick = await requireLeague(page, leagueId as string);
        const beforeDraft = beforePick.fantasyDraft;

        expect(beforeDraft?.status).toBe("active");
        expect(beforeDraft?.currentTeamId).toBe(expectedSnakeTeamId(draftOrder, index));
        observedTeamIds.push(beforeDraft?.currentTeamId ?? "");

        await runLocalAdminAction(page, "autoDraftNextFantasyDraft", {
          leagueId,
        });
        await waitForPickCount(page, leagueId as string, index + 1);

        if (index === 0) {
          const afterFirstPick = await requireLeague(page, leagueId as string);
          const firstPick = afterFirstPick.fantasyDraft?.picks[0];

          expect(afterFirstPick.fantasyDraft?.availablePlayerIds).toHaveLength(
            EXPECTED_POOL_SIZE - 1,
          );
          expect(afterFirstPick.fantasyDraft?.availablePlayerIds).not.toContain(
            firstPick?.playerId,
          );
          expect(new Set(afterFirstPick.fantasyDraft?.picks.map((pick) => pick.playerId)).size).toBe(
            1,
          );
        }

        if (index === 2) {
          await page.reload({ waitUntil: "domcontentloaded" });
          await expect(page.getByText("Fantasy Draft Control")).toBeVisible();
          await waitForPickCount(page, leagueId as string, 3);
        }
      }

      expect(observedTeamIds).toEqual(
        Array.from({ length: TEAM_COUNT + 2 }, (_, index) =>
          expectedSnakeTeamId(draftOrder, index),
        ),
      );
    });

    await test.step("Admin fuehrt alle restlichen Picks aus und schliesst den Draft ab", async () => {
      const autoDraftResult = await runLocalAdminAction(page, "autoDraftToEndFantasyDraft", {
        leagueId,
      });

      expect(autoDraftResult.message).toContain("Auto-Draft ausgefuehrt");

      await expect
        .poll(
          async () => {
            const league = await readLeague(page, leagueId as string);

            return league?.fantasyDraft?.status ?? "missing";
          },
          { timeout: 120_000 },
        )
        .toBe("completed");
    });

    await test.step("Pick-Historie, Kader und Week-1-Ready-Phase sind korrekt", async () => {
      const league = await requireLeague(page, leagueId as string);
      const draft = league.fantasyDraft;
      const picks = draft?.picks ?? [];
      const pickedPlayerIds = picks.map((pick) => pick.playerId);
      const pickedUserIds = picks.map((pick) => pick.pickedByUserId);

      expect(draft?.status).toBe("completed");
      expect(draft?.currentTeamId).toBe("");
      expect(draft?.completedAt).toBeTruthy();
      expect(league.status).toBe("active");
      expect(league.currentWeek).toBe(1);
      expect(league.weekStatus).toBe("ready");
      expect(picks).toHaveLength(TEAM_COUNT * ROSTER_TARGET_SIZE);
      expect(new Set(pickedPlayerIds).size).toBe(pickedPlayerIds.length);
      expect(new Set(pickedUserIds).size).toBe(TEAM_COUNT);
      expect(draft?.availablePlayerIds).toHaveLength(
        EXPECTED_POOL_SIZE - TEAM_COUNT * ROSTER_TARGET_SIZE,
      );
      expect(draft?.availablePlayerIds.some((playerId) => pickedPlayerIds.includes(playerId))).toBe(
        false,
      );

      picks.forEach((pick, index) => {
        expect(pick.pickNumber).toBe(index + 1);
        expect(pick.round).toBe(Math.floor(index / TEAM_COUNT) + 1);
        expect(pick.teamId).toBe(expectedSnakeTeamId(draft?.draftOrder ?? [], index));
        expect(pick.timestamp).toBeTruthy();
      });

      league.users.forEach((user) => {
        const roster = user.contractRoster?.filter((player) => player.status === "active") ?? [];
        const rosterCounts = countRosterPositions(roster);

        expect(roster).toHaveLength(ROSTER_TARGET_SIZE);
        Object.entries(ROSTER_REQUIREMENTS).forEach(([position, requiredCount]) => {
          expect(rosterCounts[position as DraftPosition]).toBeGreaterThanOrEqual(requiredCount);
        });
      });
    });

    await test.step("Nach Abschluss oeffnet der Spieler das Liga-Dashboard statt des Draft Rooms", async () => {
      const league = await requireLeague(page, leagueId as string);
      const firstUser = league.users[0];

      await page.evaluate(
        ({ userIdKey, usernameKey, user }) => {
          localStorage.setItem(userIdKey, user.userId);
          localStorage.setItem(usernameKey, user.username);
        },
        {
          userIdKey: ONLINE_USER_ID_STORAGE_KEY,
          usernameKey: ONLINE_USERNAME_STORAGE_KEY,
          user: firstUser,
        },
      );
      await page.goto(`/online/league/${leagueId}`, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page.getByText("Draft Room")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible();
    });
  });
});
