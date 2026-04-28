import { expect, test } from "@playwright/test";

import {
  E2E_TEST_IDS,
  E2E_TEST_LABELS,
  E2E_TEST_ROUTES,
} from "./fixtures/minimal-e2e-context";
import {
  E2E_NAVIGATION_TIMEOUT_MS,
  signInViaDevLogin,
  waitForServerActionRedirect,
} from "./helpers/e2e-harness";

const ROSTER_ROUTE = `${E2E_TEST_ROUTES.dashboard}/team/roster`;
const DEPTH_CHART_ROUTE = `${E2E_TEST_ROUTES.dashboard}/team/depth-chart`;

test.describe("Depth Chart Smoke", () => {
  test("fuehrt vom Roster in den Depth Chart, aendert die Reihenfolge und kehrt zurueck", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await test.step("Roster oeffnen", async () => {
      await signInViaDevLogin(page, ROSTER_ROUTE);
      await expect(page).toHaveURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/roster$`));
      await expect(page.getByRole("heading", { name: "Team Roster", exact: true })).toBeVisible();
      await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
      await expect(page.getByText("Roster Command")).toBeVisible();
      const evanStoneRow = page.locator("tr", { hasText: "Evan Stone" }).first();

      await expect(evanStoneRow).toBeVisible();
      await expect(evanStoneRow.getByText("QB #1")).toBeVisible();
    });

    await test.step("Vom Roster in den Depth Chart wechseln", async () => {
      await page.getByRole("link", { name: "Starter und Rollen pruefen" }).click({ noWaitAfter: true });
      await page.waitForURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/depth-chart$`), {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page.getByRole("heading", { name: "Team Depth Chart", exact: true })).toBeVisible();
      await expect(page.getByText("Lineup Board")).toBeVisible();
      for (const group of ["QB", "RB", "WR", "OL", "DL", "LB", "DB", "ST"]) {
        await expect(page.getByText(group, { exact: true }).first()).toBeVisible();
      }
      await expect(page.getByText("Starter · Slot #1").first()).toBeVisible();
      await expect(page.getByText("Backup · Slot #2").first()).toBeVisible();
    });

    await test.step("Starter-Reihenfolge aendern und Feedback sehen", async () => {
      const quarterbackSection = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: "Quarterback" }) })
        .first();

      await expect(quarterbackSection.getByText("Evan Stone").first()).toBeVisible();

      await waitForServerActionRedirect(page, DEPTH_CHART_ROUTE, () =>
        quarterbackSection.getByRole("button", { name: "Slot runter" }).first().click({
          noWaitAfter: true,
        }),
      );

      await page.waitForURL(/\/team\/depth-chart\?feedback=success/, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByText("Depth Chart Reihenfolge aktualisiert")).toBeVisible();
      await expect(page.getByText("Evan Stone tauscht mit Casey Hale.")).toBeVisible();
      await expect(page.getByText("Prioritaet reduziert")).toBeVisible();
      await expect(page.getByText("besser jetzt").first()).toBeVisible();
      await expect(page.getByText("besser langfristig").first()).toBeVisible();
      await expect(page.getByText("Risiko").first()).toBeVisible();
      await expect(page.getByText(/Positionsstaerke/).first()).toBeVisible();
      await expect(page.getByText("Value Feedback · negative")).toBeVisible();
      await expect(
        page
          .locator("article")
          .filter({ has: page.getByRole("heading", { name: "Quarterback" }) })
          .first()
          .getByText("Slot #2")
          .first(),
      ).toBeVisible();
    });

    await test.step("Zurueck zum Roster", async () => {
      const teamSections = page.getByRole("navigation", { name: "Team sections" });
      const rosterLink = teamSections.getByRole("link", { name: /Roster/ });

      await expect(rosterLink).toHaveAttribute("href", ROSTER_ROUTE);
      await rosterLink.click({ noWaitAfter: true });
      await page.waitForURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/roster$`), {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page.getByRole("heading", { name: "Team Roster", exact: true })).toBeVisible();
      const evanStoneRow = page.locator("tr", { hasText: "Evan Stone" }).first();

      await expect(evanStoneRow).toBeVisible();
      await expect(evanStoneRow.getByText("QB #2")).toBeVisible();
    });
  });
});
