import { expect, test } from "@playwright/test";

import {
  E2E_TEST_IDS,
  E2E_TEST_LABELS,
  E2E_TEST_ROUTES,
} from "./fixtures/minimal-e2e-context";
import {
  E2E_NAVIGATION_TIMEOUT_MS,
  signInViaDevLogin,
} from "./helpers/e2e-harness";

const DEVELOPMENT_ROUTE = `${E2E_TEST_ROUTES.dashboard}/development`;

test.describe("Development Week Comparison Smoke", () => {
  test("zeigt den Wochenvergleich transparent auf dem Development Screen", async ({ page }) => {
    test.setTimeout(120_000);

    await signInViaDevLogin(page, DEVELOPMENT_ROUTE);
    await expect(page).toHaveURL(
      new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/development$`),
      { timeout: E2E_NAVIGATION_TIMEOUT_MS },
    );
    await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Development", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Player Development" })).toBeVisible();

    await expect(page.getByText("Wochenvergleich").first()).toBeVisible();
    await expect(page.getByText("Letzte Woche").first()).toBeVisible();
    await expect(page.getByText("Aktueller Stand").first()).toBeVisible();
    await expect(page.getByText("Veraenderung").first()).toBeVisible();
    await expect(page.getByText("Moegliche Ursache").first()).toBeVisible();
    await expect(
      page.getByText(/kein gespeicherter Vorwochenwert|History Woche/).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/nicht gespeichert|\+\d+ OVR|0 OVR|-\d+ OVR/).first(),
    ).toBeVisible();
  });
});
