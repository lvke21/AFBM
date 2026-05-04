import { expect, type Page, test, type TestInfo } from "@playwright/test";

const STAGING_BASE_URL = "https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app";
const LAST_LEAGUE_STORAGE_KEY = "afbm.online.lastLeagueId";

const playerEmail = process.env.STAGING_PLAYER_EMAIL;
const playerPassword = process.env.STAGING_PLAYER_PASSWORD;
const leagueId = process.env.STAGING_PLAYER_LEAGUE_ID ?? "afbm-playability-test";
const expectedTeamName = process.env.STAGING_PLAYER_TEAM_NAME ?? "Basel Rhinos";

function requireStagingPlayerConfig() {
  const missing = [
    playerEmail ? null : "STAGING_PLAYER_EMAIL",
    playerPassword ? null : "STAGING_PLAYER_PASSWORD",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Browser player login/rejoin smoke needs real staging credentials. Missing: ${missing.join(", ")}`,
    );
  }

  const baseUrl = process.env.E2E_BASE_URL ?? "";

  if (!baseUrl.startsWith(STAGING_BASE_URL)) {
    throw new Error(
      `Browser player login/rejoin smoke must run against staging. E2E_BASE_URL=${baseUrl || "(unset)"}`,
    );
  }
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);

  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function assertNoDisconnectedPlayerState(page: Page) {
  await expect(page.getByText(/Benutzer nicht verbunden/i)).toHaveCount(0);
  await expect(page.getByText(/Kein Manager-Team verbunden/i)).toHaveCount(0);
}

async function assertLoggedInHub(page: Page) {
  await expect(page.getByRole("heading", { name: "Online Liga" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(playerEmail ?? "", { exact: false }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Firebase Email/Passwort").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Anmelden" })).toHaveCount(0);
}

async function loginWithEmailPassword(page: Page) {
  await page.goto("/online", { waitUntil: "domcontentloaded" });

  if (await page.getByRole("heading", { name: "Online Liga" }).isVisible()) {
    return;
  }

  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByLabel("Email").fill(playerEmail ?? "");
  await page.getByLabel("Passwort").fill(playerPassword ?? "");
  await page.getByRole("button", { name: "Einloggen" }).click();
  await assertLoggedInHub(page);
}

async function openLeagueAndAssertTeam(page: Page) {
  await page.goto(`/online/league/${leagueId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByText(expectedTeamName, { exact: false }).first()).toBeVisible({
    timeout: 30_000,
  });
  await assertNoDisconnectedPlayerState(page);
  await expect(page.getByRole("heading", { name: "Anmelden" })).toHaveCount(0);
}

test.describe.serial("Staging real player login and rejoin", () => {
  test.beforeAll(() => {
    requireStagingPlayerConfig();
  });

  test("player logs in, opens league, reloads, rejoins after storage clear, and rejoins after logout", async ({
    page,
  }, testInfo) => {
    page.on("console", (message) => {
      if (message.type() === "error") {
        void testInfo.attach(`console-error-${Date.now()}`, {
          body: message.text(),
          contentType: "text/plain",
        });
      }
    });

    await test.step("Email/password login opens the Online hub", async () => {
      await loginWithEmailPassword(page);
      await attachScreenshot(page, testInfo, "01-online-hub-after-login");
    });

    await test.step("Direct league open resolves existing membership and team", async () => {
      await openLeagueAndAssertTeam(page);
      await attachScreenshot(page, testInfo, "02-league-team-visible");
    });

    await test.step("Reload keeps the same player connected to the same team", async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`/online/league/${leagueId}`));
      await expect(page.getByText(expectedTeamName, { exact: false }).first()).toBeVisible({
        timeout: 30_000,
      });
      await assertNoDisconnectedPlayerState(page);
      await expect(page.getByRole("heading", { name: "Anmelden" })).toHaveCount(0);
      await attachScreenshot(page, testInfo, "03-after-reload");
    });

    await test.step("Cleared app league storage does not break direct membership rejoin", async () => {
      await page.evaluate((key) => window.localStorage.removeItem(key), LAST_LEAGUE_STORAGE_KEY);
      await openLeagueAndAssertTeam(page);
      await attachScreenshot(page, testInfo, "04-direct-rejoin-after-localstorage-clear");
    });

    await test.step("Continue button works when the league id is stored again", async () => {
      await page.goto("/online", { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ key, id }) => window.localStorage.setItem(key, id),
        { key: LAST_LEAGUE_STORAGE_KEY, id: leagueId },
      );
      await page.getByRole("button", { name: "Weiterspielen" }).click();
      await expect(page).toHaveURL(new RegExp(`/online/league/${leagueId}`), {
        timeout: 30_000,
      });
      await expect(page.getByText(expectedTeamName, { exact: false }).first()).toBeVisible({
        timeout: 30_000,
      });
      await assertNoDisconnectedPlayerState(page);
      await attachScreenshot(page, testInfo, "05-continue-rejoin");
    });

    await test.step("Logout and fresh login still resolve the same league team", async () => {
      await page.goto("/online", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /^Logout$/ }).click();
      await page.goto("/online", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible({
        timeout: 30_000,
      });
      await loginWithEmailPassword(page);
      await openLeagueAndAssertTeam(page);
      await attachScreenshot(page, testInfo, "06-after-logout-login-rejoin");
    });
  });
});
