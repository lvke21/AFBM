import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "crypto";

import { E2E_NAVIGATION_TIMEOUT_MS } from "./helpers/e2e-harness";

const ADMIN_E2E_CODE = process.env.AFBM_ADMIN_ACCESS_CODE ?? "e2e-admin-code";
const ADMIN_E2E_SESSION_SECRET =
  process.env.AFBM_ADMIN_SESSION_SECRET ?? ADMIN_E2E_CODE;

function createAdminSessionToken() {
  return createHmac("sha256", ADMIN_E2E_SESSION_SECRET)
    .update("afbm-admin-session-v1")
    .digest("hex");
}

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
  await expect(
    page.getByText(/Du bist (der Liga beigetreten|bereits Mitglied dieser Liga)\./),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: "Liga öffnen" })).toBeVisible();

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
  await page.getByRole("link", { name: "Liga öffnen" }).dispatchEvent("click");
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible();
}

async function loginAsAdmin(page: Page, leagueId = "global-test-league") {
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

  await page.goto(`/admin/league/${leagueId}`, {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Simulationssteuerung")).toBeVisible();
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

  test("Admin Flow zeigt Ready-Spieler und bestaetigt Simulation", async ({ page }) => {
    await joinFirstLeague(page);
    await openJoinedLeagueDashboard(page);
    await page.getByRole("button", { name: /^Bereit für Week 1$/ }).dispatchEvent("click");
    await expect(page.getByText("Du bist bereit für Week 1.").first()).toBeVisible();

    await loginAsAdmin(page);
    await expect(page.getByText("Ready", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("1/1", { exact: true })).toBeVisible();
    await expect(page.getByText("Fehlt noch", { exact: true })).toBeVisible();

    let simulationConfirm = "";
    page.once("dialog", async (dialog) => {
      simulationConfirm = dialog.message();
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: "Simulation starten" }).dispatchEvent("click");
    expect(simulationConfirm).toContain("Ready-States werden zurückgesetzt");
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
