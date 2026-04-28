import { expect, test, type Page } from "@playwright/test";

import {
  E2E_TEST_IDS,
  E2E_TEST_LABELS,
  E2E_TEST_ROUTES,
} from "./fixtures/minimal-e2e-context";
import {
  E2E_NAVIGATION_TIMEOUT_MS,
  gotoAppRoute,
  signInViaDevLogin,
  waitForServerActionRedirect,
} from "./helpers/e2e-harness";

const GAME_SETUP_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/setup`;
const GAME_LIVE_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/live`;
const GAME_REPORT_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/report`;
const DEPTH_CHART_ROUTE = `${E2E_TEST_ROUTES.dashboard}/team/depth-chart`;
const UPCOMING_MATCH_QUERY = `matchId=${encodeURIComponent(E2E_TEST_IDS.upcomingMatchId)}`;

async function signInToDashboard(page: Page) {
  await signInViaDevLogin(page, E2E_TEST_ROUTES.dashboard);
}

function weekLoopPanel(page: Page) {
  return page.locator("#week-loop");
}

test.describe("First 10 Minutes", () => {
  test("fuehrt neue Nutzer vom Dashboard bis zur ersten Auswertung", async ({ page }) => {
    test.setTimeout(150_000);

    await test.step("Savegame oeffnen und naechste Aktion erkennen", async () => {
      await signInToDashboard(page);
      await expect(page.getByText("GM Buero")).toBeVisible();
      await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
      await expect(page.getByText("Next Best Action")).toBeVisible();
      await expect(page.locator('[data-primary-action="true"]')).toHaveCount(1);

      await waitForServerActionRedirect(page, E2E_TEST_ROUTES.dashboard, () =>
        page.locator('[data-primary-action="true"]').click({ noWaitAfter: true }),
      );
      await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
      await expect(weekLoopPanel(page).getByText("Bereit").first()).toBeVisible();
    });

    await test.step("Depth Chart pruefen", async () => {
      await gotoAppRoute(page, DEPTH_CHART_ROUTE);
      await expect(page.getByRole("heading", { name: "Depth Chart & Assignments" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Spieltag-Bereitschaft" })).toBeVisible();
      await expect(page.getByText("Starter · Slot #1").first()).toBeVisible();
      await expect(page.getByText(/Bereit|Pruefen|Blockiert/).first()).toBeVisible();
      await expect(page.getByText("besser jetzt").first()).toBeVisible();
      await expect(page.getByText("besser langfristig").first()).toBeVisible();
      await expect(page.getByText("Risiko").first()).toBeVisible();

      const quarterbackSection = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: "Quarterback" }) })
        .first();

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
    });

    await test.step("Game Setup oeffnen", async () => {
      await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
      await gotoAppRoute(page, `${GAME_SETUP_ROUTE}?${UPCOMING_MATCH_QUERY}`);
      await expect(page.getByText("Spielvorschau").first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "Kann dein Team starten?" })).toBeVisible();
      await expect(page.getByText(E2E_TEST_LABELS.opponentTeamName).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Spiel starten|Match starten/ })).toBeVisible();
    });

    await test.step("Spiel starten und abschliessen", async () => {
      await waitForServerActionRedirect(page, GAME_SETUP_ROUTE, () =>
        page.getByRole("button", { name: /Spiel starten|Match starten/ }).click({ noWaitAfter: true }),
      );
      await gotoAppRoute(page, `${GAME_LIVE_ROUTE}?${UPCOMING_MATCH_QUERY}`);
      await expect(page.getByText("Drive Timeline").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Report nach Schlusspfiff" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Zum Match Report" })).toBeEnabled({ timeout: 20_000 });

      const finishForm = page
        .locator("form")
        .filter({ has: page.getByRole("button", { name: "Zum Match Report" }) })
        .first();

      await waitForServerActionRedirect(page, GAME_LIVE_ROUTE, () =>
        finishForm.getByRole("button", { name: "Zum Match Report" }).click({ noWaitAfter: true }),
      );
    });

    await test.step("Auswertung und naechste Aktion sehen", async () => {
      await gotoAppRoute(page, `${GAME_REPORT_ROUTE}?${UPCOMING_MATCH_QUERY}`);
      await expect(page.getByRole("heading", { name: "Game Report" }).first()).toBeVisible();
      await expect(page.getByText("Key Moments").first()).toBeVisible();
      await expect(page.getByText("NOCH KEINE DRIVES")).toHaveCount(0);
      await expect(page.getByText("Naechster Schritt")).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "Dashboard" })).toHaveAttribute(
        "href",
        E2E_TEST_ROUTES.dashboard,
      );
    });
  });
});
