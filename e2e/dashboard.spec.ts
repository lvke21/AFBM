import { expect, test, type Page } from "@playwright/test";

import {
  E2E_TEST_LABELS,
  E2E_TEST_ROUTES,
} from "./fixtures/minimal-e2e-context";
import { signInViaDevLogin } from "./helpers/e2e-harness";

const DASHBOARD_ROUTE = E2E_TEST_ROUTES.dashboard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function signInToDashboard(page: Page) {
  await signInViaDevLogin(page, E2E_TEST_ROUTES.dashboard);
}

test.describe("Savegame Dashboard", () => {
  test("rendert Team-Kontext, Saison/Woche, naechste Aktion und Navigation", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await signInToDashboard(page);

    await expect(page).toHaveURL(new RegExp(`${DASHBOARD_ROUTE}/?$`));
    await expect(page.getByRole("heading", { name: "GM Office" })).toBeVisible();
    await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();

    await test.step("Team-Kontext ist sichtbar", async () => {
      await expect(page.getByText("GM Team").first()).toBeVisible();
      await expect(page.getByText("BOS").first()).toBeVisible();
      await expect(page.getByText(E2E_TEST_LABELS.managerTeamName).first()).toBeVisible();
    });

    await test.step("Saison und Woche sind sichtbar", async () => {
      await expect(page.getByText("Week State", { exact: true })).toBeVisible();
      await expect(page.getByText("PRE_WEEK").first()).toBeVisible();
      await expect(page.getByText(/Woche 1/).first()).toBeVisible();
    });

    await test.step("Naechste Aktion ist sichtbar", async () => {
      await expect(page.getByText("Next Best Action")).toBeVisible();
      await expect(
        page.locator("#next-action"),
      ).toBeVisible();
    });

    await test.step("Navigation ist sichtbar und Dashboard ist aktiv", async () => {
      const navigation = page.getByRole("navigation", { name: "GM Navigation" });

      await expect(navigation).toBeVisible();
      await expect(navigation.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      for (const label of [
        "Game Flow",
        "Roster",
        "Depth Chart",
        "Contracts/Cap",
        "Development",
        "Trade Board",
      ]) {
        await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
      }
    });
  });
});
