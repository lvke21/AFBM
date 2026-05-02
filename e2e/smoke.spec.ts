import { expect, test } from "@playwright/test";

import { E2E_NAVIGATION_TIMEOUT_MS, gotoAppRoute } from "./helpers/e2e-harness";

test.describe("E2E Smoke", () => {
  test("startet die App und behandelt den E2E-Auth-Bypass ohne Savegame-Bootstrapping", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await test.step("App startet", async () => {
      const response = await page.goto("/", {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      expect(
        response?.ok(),
        `Startseite konnte nicht geladen werden. Status: ${response?.status() ?? "keine Antwort"}.`,
      ).toBe(true);
      await expect(page.getByRole("link", { name: "AFBM Manager", exact: true })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Was möchtest du als Nächstes tun?", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /Fortsetzen/ })).toBeVisible();
    });

    await test.step("Savegame-Hub ist im E2E-Auth-Bypass erreichbar", async () => {
      await gotoAppRoute(page, "/app/savegames");
      await expect(page).toHaveURL(/\/app\/savegames$/);
      await expect(page.getByRole("heading", { name: "Savegames", exact: true })).toBeVisible();
      await expect(page.getByLabel("Dynasty-Name")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Deine Franchises", exact: true })).toBeVisible();
    });
  });
});
