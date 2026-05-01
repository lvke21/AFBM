import { expect, test, type Page } from "@playwright/test";

import { E2E_NAVIGATION_TIMEOUT_MS } from "./helpers/e2e-harness";

const E2E_FIREBASE_ADMIN_ID_TOKEN = process.env.E2E_FIREBASE_ADMIN_ID_TOKEN ?? "";

async function openOnlineHub(page: Page) {
  const response = await page.goto("/online", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Online Liga" })).toBeVisible();
}

async function searchLeagues(page: Page) {
  const searchButton = page.getByRole("button", { name: "Liga suchen" });

  await expect(searchButton).toBeVisible();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const hasStarted =
      (await page.getByText("Suche nach verfügbaren Ligen").count()) > 0 ||
      (await page.getByText("Gefundene Ligen").count()) > 0;

    if (hasStarted) {
      break;
    }

    await searchButton.click();
    await page.waitForTimeout(350);
  }

  await expect(page.getByText("Gefundene Ligen")).toBeVisible({ timeout: 10_000 });
}

async function suggestTeam(page: Page) {
  await page.getByRole("button", { name: /Team vorschlagen/ }).click();
  await expect(page.getByText("Vollständiger Teamname", { exact: true })).toBeVisible();
}

async function getPreviewTeamName(page: Page) {
  return page
    .getByText("Vollständiger Teamname", { exact: true })
    .locator("xpath=following-sibling::p[1]")
    .innerText();
}

async function joinFirstLeague(page: Page) {
  await openOnlineHub(page);
  await searchLeagues(page);
  await suggestTeam(page);

  const suggestedTeamName = await getPreviewTeamName(page);
  const joinButton = page.getByRole("button", { name: /Beitreten/ }).first();

  await expect(joinButton).toBeEnabled();
  await joinButton.click();
  await joinButton.click({ timeout: 500 }).catch(() => undefined);
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 10_000,
  });

  const memberCount = await page.evaluate(() => {
    const leagues = JSON.parse(localStorage.getItem("afbm.online.leagues") ?? "[]");
    const lastLeagueId = localStorage.getItem("afbm.online.lastLeagueId");
    const userId = localStorage.getItem("afbm.online.userId");
    const league = leagues.find((candidate: { id: string }) => candidate.id === lastLeagueId);

    return league?.users?.filter((user: { userId: string }) => user.userId === userId).length ?? 0;
  });

  expect(memberCount).toBe(1);

  return suggestedTeamName;
}

async function openJoinedLeagueDashboard(page: Page) {
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible();
}

type LocalAdminActionResult = {
  ok: boolean;
  message: string;
  league?: {
    id: string;
    currentWeek: number;
    weekStatus?: string;
    users?: Array<{ userId: string; username: string }>;
    matchResults?: Array<{
      matchId: string;
      homeTeamName: string;
      awayTeamName: string;
      homeScore: number;
      awayScore: number;
    }>;
    completedWeeks?: Array<{
      weekKey: string;
      season: number;
      week: number;
      resultMatchIds: string[];
      nextWeek: number;
    }>;
  } | null;
  localState?: {
    leaguesJson: string | null;
    lastLeagueId: string | null;
    resetCurrentUser?: boolean;
  };
};

async function runLocalAdminAction(
  page: Page,
  action: string,
  payload: Record<string, unknown> = {},
) {
  return page.evaluate(
    async ({ actionName, actionPayload, adminToken }) => {
      const keys = {
        leagues: "afbm.online.leagues",
        lastLeagueId: "afbm.online.lastLeagueId",
        userId: "afbm.online.userId",
        username: "afbm.online.username",
      };
      const response = await fetch("/admin/api/online/actions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: actionName,
          backendMode: "local",
          localState: {
            leaguesJson: localStorage.getItem(keys.leagues),
            lastLeagueId: localStorage.getItem(keys.lastLeagueId),
            userId: localStorage.getItem(keys.userId),
            username: localStorage.getItem(keys.username),
          },
          ...actionPayload,
        }),
      });
      const result = (await response.json()) as LocalAdminActionResult;

      if (!response.ok || !result.ok) {
        throw new Error(result.message || `Admin action failed: ${actionName}`);
      }

      if (result.localState) {
        if (result.localState.leaguesJson) {
          localStorage.setItem(keys.leagues, result.localState.leaguesJson);
        } else {
          localStorage.removeItem(keys.leagues);
        }

        if (result.localState.lastLeagueId) {
          localStorage.setItem(keys.lastLeagueId, result.localState.lastLeagueId);
        } else {
          localStorage.removeItem(keys.lastLeagueId);
        }

        if (result.localState.resetCurrentUser) {
          localStorage.removeItem(keys.userId);
          localStorage.removeItem(keys.username);
        }
      }

      return result;
    },
    { actionName: action, actionPayload: payload, adminToken: E2E_FIREBASE_ADMIN_ID_TOKEN },
  );
}

async function useOnlineUser(page: Page, user: { userId: string; username: string }) {
  await page.evaluate((nextUser) => {
    localStorage.setItem("afbm.online.userId", nextUser.userId);
    localStorage.setItem("afbm.online.username", nextUser.username);
  }, user);
}

test.describe("Multiplayer E2E Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", {
      timeout: E2E_NAVIGATION_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    await page.evaluate(() => {
      localStorage.removeItem("afbm.online.leagues");
      localStorage.removeItem("afbm.online.lastLeagueId");
      localStorage.removeItem("afbm.online.userId");
      localStorage.removeItem("afbm.online.username");
      localStorage.removeItem("afbm-online-league-expert-mode");
    });
  });

  test("Online Hub zeigt Modus, sucht Ligen und behandelt ungueltige lokale Daten", async ({
    page,
  }) => {
    await openOnlineHub(page);
    await expect(page.getByText("Lokaler Testmodus").first()).toBeVisible();
    await expect(page.getByText("Offline/Testdaten").first()).toBeVisible();
    await expect(page.getByText("Rolle: GM").first()).toBeVisible();
    await searchLeagues(page);
    await expect(page.getByText("Global Test League").first()).toBeVisible();
    await expect(page.getByText("Aktuell ist keine Liga verfügbar.")).toHaveCount(0);

    await page.evaluate(() => {
      localStorage.setItem("afbm.online.lastLeagueId", "missing-e2e-league");
      localStorage.setItem("afbm.online.leagues", "[]");
    });
    await page.goto("/online/league/missing-e2e-league", {
      timeout: E2E_NAVIGATION_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText("Liga konnte nicht gefunden werden."),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Die angeforderte lokale Testliga existiert auf diesem Gerät nicht oder wurde zurückgesetzt.",
      ),
    ).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem("afbm.online.leagues", "{broken-json");
    });
    await openOnlineHub(page);
    await expect(page.getByRole("button", { name: "Liga suchen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Online Liga" })).toBeVisible();
  });

  test("Join Flow oeffnet das Guided Dashboard und Ready-Flow speichert Status", async ({
    page,
  }) => {
    const suggestedTeamName = await joinFirstLeague(page);

    await openJoinedLeagueDashboard(page);
    await expect(page.getByText(suggestedTeamName).first()).toBeVisible();
    await expect(page.getByText("Was jetzt tun?")).toBeVisible();
    await expect(page.getByText("Liga-Regeln")).toBeVisible();
    await expect(page.getByText("Du bist noch nicht bereit für Week 1.")).toBeVisible();

    const readyButton = page.getByRole("button", { name: /^Bereit für Week 1$/ });
    await readyButton.dispatchEvent("click");
    await expect(page.getByText("Du bist bereit für Week 1.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Du bist bereit für Week 1/ })).toBeDisabled();
  });

  test("Admin Flow simuliert eine ready Week und zeigt Ergebnisse nach Reload", async ({
    page,
  }) => {
    const created = await runLocalAdminAction(page, "createLeague", {
      name: "E2E Week Closeout",
      maxUsers: 2,
    });
    const leagueId = created.league?.id;

    expect(leagueId).toBeTruthy();

    await runLocalAdminAction(page, "debugAddFakeUser");
    await runLocalAdminAction(page, "debugAddFakeUser");
    await runLocalAdminAction(page, "startFantasyDraft", { leagueId });
    await runLocalAdminAction(page, "autoDraftToEndFantasyDraft", { leagueId });

    const blocked = await runLocalAdminAction(page, "simulateWeek", {
      leagueId,
      season: 1,
      week: 1,
    });

    expect(blocked.message).toContain("gesperrt");

    await runLocalAdminAction(page, "setAllReady", { leagueId });

    const simulated = await runLocalAdminAction(page, "simulateWeek", {
      leagueId,
      season: 1,
      week: 1,
    });

    expect(simulated.league?.currentWeek).toBe(2);
    expect(simulated.league?.weekStatus).toBe("pre_week");
    expect(simulated.league?.matchResults).toHaveLength(1);
    expect(simulated.league?.completedWeeks?.[0]).toMatchObject({
      weekKey: "s1-w1",
      season: 1,
      week: 1,
      nextWeek: 2,
    });

    const repeated = await runLocalAdminAction(page, "simulateWeek", {
      leagueId,
      season: 1,
      week: 1,
    });

    expect(repeated.message).toContain("bereits weitergeschaltet");
    expect(repeated.league?.currentWeek).toBe(2);
    expect(repeated.league?.matchResults).toEqual(simulated.league?.matchResults);

    const firstUser = simulated.league?.users?.[0];

    if (!leagueId || !firstUser) {
      throw new Error("Expected a simulated league with at least one user.");
    }

    await useOnlineUser(page, firstUser);
    await page.goto(`/online/league/${leagueId}`, {
      timeout: E2E_NAVIGATION_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("Zuletzt abgeschlossen: Season 1, Week 1.")).toBeVisible();
    await expect(page.getByText("1 Ergebnis gespeichert")).toBeVisible();
    await expect(page.getByText("Nächste Woche offen")).toBeVisible();

    await page.goto(`/admin/league/${leagueId}`, {
      timeout: E2E_NAVIGATION_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("Woche abgeschlossen")).toBeVisible();
    await expect(page.getByText("1 Ergebnis fixiert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Simulation starten" })).toBeDisabled();
  });

  test("Gefaehrliche Contract-Aktionen zeigen Confirm Dialog und koennen abgebrochen werden", async ({
    page,
  }) => {
    await joinFirstLeague(page);
    await openJoinedLeagueDashboard(page);
    await page.getByRole("button", { name: "Expertenmodus anzeigen" }).dispatchEvent("click");
    await expect(page.getByText("Vertragsrisiko verstehen")).toBeVisible();

    let releaseConfirm = "";
    page.once("dialog", async (dialog) => {
      releaseConfirm = dialog.message();
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: "Entlassen" }).first().dispatchEvent("click");
    expect(releaseConfirm).toContain("Dead Cap:");
    expect(releaseConfirm).toContain("Neuer geschätzter Cap Space:");
    await expect(
      page.getByText("Entlassung abgebrochen. Keine Vertragsdaten wurden geändert."),
    ).toBeVisible();

    let extensionConfirm = "";
    page.once("dialog", async (dialog) => {
      extensionConfirm = dialog.message();
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: "+1 Jahr verlängern" }).first().dispatchEvent("click");
    expect(extensionConfirm).toContain("Neue Laufzeit:");
    expect(extensionConfirm).toContain("Signing Bonus:");
    expect(extensionConfirm).toContain("Geschätzter Cap Hit/Jahr:");
    await expect(
      page.getByText("Verlängerung abgebrochen. Keine Vertragsdaten wurden geändert."),
    ).toBeVisible();
  });
});
