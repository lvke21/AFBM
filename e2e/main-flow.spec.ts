import { expect, test, type Page } from "@playwright/test";

import { gotoAppRoute, signInViaDevLogin } from "./helpers/e2e-harness";

async function signInWithDevCredentials(page: Page) {
  await signInViaDevLogin(page, "/app/savegames");
}

async function createSaveGame(page: Page) {
  const saveGameName = `E2E Main Flow ${Date.now()}`;

  await gotoAppRoute(page, "/app/savegames");
  await page.getByLabel("Savegame-Name").fill(saveGameName);
  await page.getByRole("button", { name: "Savegame erstellen" }).click();
  await page.waitForURL(/\/app\/savegames\/[^/?]+/, { timeout: 90_000 });

  return {
    basePath: new URL(page.url()).pathname,
    name: saveGameName,
  };
}

async function expectActiveNavigation(page: Page, label: string) {
  await expect(page.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
}

test.describe.skip("GM Haupt-Flow", () => {
  test("navigiert durch Dashboard, Inbox, Team, Finance und Game mit zentralen Actions", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await signInWithDevCredentials(page);
    const saveGame = await createSaveGame(page);

    await expect(page.getByText("GM Status")).toBeVisible();
    await expect(page.getByText(saveGame.name)).toBeVisible();
    await expectActiveNavigation(page, "Dashboard");

    await page.getByRole("link", { name: "Inbox" }).click();
    await page.waitForURL("**/inbox");
    await expect(page.getByRole("heading", { name: "Inbox / Aufgaben" })).toBeVisible();
    await expectActiveNavigation(page, "Inbox");

    await page.getByRole("link", { name: "Alle" }).click();
    await page.waitForURL("**/inbox?filter=all");
    const firstTask = page.locator("article").first();
    await expect(firstTask).toBeVisible();
    await firstTask.getByRole("button", { name: "Gelesen" }).click();
    await expect(firstTask.getByText("Gelesen")).toBeVisible();

    await page.getByRole("link", { name: "Team" }).click();
    await page.waitForURL("**/team");
    await expect(page.getByText("Team Command Center")).toBeVisible();
    await expect(page.getByRole("link", { name: /Kader verwalten/ })).toBeVisible();
    await expectActiveNavigation(page, "Team");

    await page.getByRole("link", { name: "Finance" }).click();
    await page.waitForURL("**/finance");
    await expect(page.getByText("Cap Space")).toBeVisible();
    await expect(page.getByText("Contracts")).toBeVisible();
    await expectActiveNavigation(page, "Finance");

    await page.getByRole("link", { name: "Game" }).click();
    await page.waitForURL(/\/game\/(setup|live|report)/);
    await expect(page.getByText("Spielvorbereitung")).toBeVisible();
    await expectActiveNavigation(page, "Game");

    await page.getByRole("button", { name: "Gameplan speichern" }).click();
    await expect(page.getByText("Gameplan gespeichert")).toBeVisible();

    await expect(page.getByRole("link", { name: "Zum Game Center" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Zum Report" })).toBeVisible();
  });
});
