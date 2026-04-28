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

const ROSTER_ROUTE = `${E2E_TEST_ROUTES.dashboard}/team/roster`;
const PLAYER_ROUTE_PATTERN = new RegExp(
  `/app/savegames/${E2E_TEST_IDS.saveGameId}/players/e2e-bos-qb$`,
);

test.describe("Contracts / Salary Cap Smoke", () => {
  test("oeffnet Contracts vom Roster, prueft Cap-Entscheidungen und kehrt zurueck", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await test.step("Roster oeffnen", async () => {
      await signInViaDevLogin(page, ROSTER_ROUTE);
      await expect(page).toHaveURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/roster$`));
      await expect(page.getByRole("heading", { name: "Team Roster", exact: true })).toBeVisible();
      await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
      await expect(page.getByText("Roster Actions")).toBeVisible();
    });

    await test.step("Contracts / Cap Screen oeffnen", async () => {
      await page.getByRole("link", { name: "Contracts und Cap Hits ansehen" }).click({
        noWaitAfter: true,
      });
      await page.waitForURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/contracts$`), {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page.getByRole("heading", { name: "Team Contracts", exact: true })).toBeVisible();
      await expect(page.getByText("Contract Decision Layer")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Cap Overview" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Salary Cap Risiken" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Vertraege", exact: true })).toBeVisible();
      await expect(page.getByText("Decision Impact")).toBeVisible();
      await expect(page.getByText("Cap Space").first()).toBeVisible();
      await expect(page.getByText("Cap Hit").first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Evan Stone" })).toBeVisible();
    });

    await test.step("Player Profile aus Contract-Entscheidung oeffnen", async () => {
      await page.getByRole("link", { name: "Evan Stone" }).first().click({ noWaitAfter: true });
      await page.waitForURL(PLAYER_ROUTE_PATTERN, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page.getByRole("heading", { name: "Evan Stone" })).toBeVisible();
      await expect(page.getByText("Decision Summary")).toBeVisible();
      await expect(page.getByRole("link", { name: "Roster" }).first()).toHaveAttribute(
        "href",
        ROSTER_ROUTE,
      );
    });

    await test.step("Rueckweg zum Roster funktioniert", async () => {
      await page.getByRole("link", { name: "Roster" }).first().click({ noWaitAfter: true });
      await page.waitForURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/roster$`), {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page.getByRole("heading", { name: "Team Roster", exact: true })).toBeVisible();
      await expect(page.getByText("Roster Command")).toBeVisible();
    });
  });
});
