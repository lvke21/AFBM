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
const TRADE_BOARD_ROUTE = `${E2E_TEST_ROUTES.dashboard}/team/trades`;
const PLAYER_ROUTE = `${E2E_TEST_ROUTES.dashboard}/players/e2e-bos-qb`;

test.describe("Trade Board Smoke", () => {
  test("oeffnet Trade Board aus dem Player Profile und prueft Auswahl ohne Ausfuehrung", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await test.step("Player Profile oeffnen", async () => {
      await signInViaDevLogin(page, PLAYER_ROUTE);
      await expect(page).toHaveURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/players/e2e-bos-qb$`));
      await expect(page.getByRole("heading", { name: "Evan Stone" })).toBeVisible();
      await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Trade Board oeffnen" }).first()).toHaveAttribute(
        "href",
        TRADE_BOARD_ROUTE,
      );
    });

    await test.step("Trade Board oeffnen", async () => {
      await page.getByRole("link", { name: "Trade Board oeffnen" }).click({ noWaitAfter: true });
      await page.waitForURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/trades$`), {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page.getByRole("heading", { name: "Trade Board", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Trade Vorbereitung" })).toBeVisible();
      await expect(page.getByText("UI Draft · keine Action")).toBeVisible();
      await expect(page.getByText("keine Ausfuehrung")).toBeVisible();
      await expect(page.getByText("Eigene Spieler")).toBeVisible();
      await expect(page.getByText("Potenzielle Targets")).toBeVisible();
      await expect(page.getByText("Evan Stone").first()).toBeVisible();
      await expect(page.getByText("Ryan Cole").first()).toBeVisible();
      await expect(page.getByText("Trade Balance Hinweis")).toBeVisible();
      await expect(page.getByText(/Fairer Trade|Ungleiches Angebot|Cap-Risiko|Auswahl unvollstaendig/)).toBeVisible();
    });

    await test.step("Auswahl lokal veraendern und Balance sichtbar halten", async () => {
      await page.getByRole("button", { name: /Miles Grant/ }).click();

      await expect(page.getByText("Outgoing Value")).toBeVisible();
      await expect(page.getByText("Incoming Value")).toBeVisible();
      await expect(page.getByText("Fuer echte Angebote bleibt eine spaetere Action-Schicht noetig.")).toBeVisible();
    });

    await test.step("Rueckweg zum Roster funktioniert", async () => {
      await page.getByRole("link", { name: "Roster oeffnen" }).click({ noWaitAfter: true });
      await page.waitForURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/roster$`), {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      await expect(page).toHaveURL(new RegExp(`/app/savegames/${E2E_TEST_IDS.saveGameId}/team/roster$`));
      await expect(page.getByRole("heading", { name: "Team Roster", exact: true })).toBeVisible();
      await expect(page.getByText("Roster Command")).toBeVisible();
      await expect(page.getByRole("link", { name: "Trade Board oeffnen" }).first()).toHaveAttribute(
        "href",
        TRADE_BOARD_ROUTE,
      );
      await expect(page.url()).toContain(ROSTER_ROUTE);
    });
  });
});
