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

const DASHBOARD_ROUTE = E2E_TEST_ROUTES.dashboard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const GAME_SETUP_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/setup`;
const GAME_LIVE_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/live`;
const GAME_REPORT_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/report`;
const DEPTH_CHART_ROUTE = `${E2E_TEST_ROUTES.dashboard}/team/depth-chart`;
const UPCOMING_MATCH_QUERY = `matchId=${encodeURIComponent(E2E_TEST_IDS.upcomingMatchId)}`;

async function signInToDashboard(page: Page) {
  await signInViaDevLogin(page, E2E_TEST_ROUTES.dashboard);
}

async function expectDashboard(page: Page, reload = false) {
  await expect(async () => {
    if (reload) {
      await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
    }

    await expect(page).toHaveURL(new RegExp(`${DASHBOARD_ROUTE}(?:\\?.*)?$`));
    await expect(page.getByText("GM Buero")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
  }).toPass({ timeout: 20_000 });
}

function weekLoopPanel(page: Page) {
  return page.locator("#week-loop");
}

async function expectFinishedReport(page: Page) {
  await expect(async () => {
    await gotoAppRoute(page, `${GAME_REPORT_ROUTE}?${UPCOMING_MATCH_QUERY}`);
    await expect(page).toHaveURL(/\/game\/report\?matchId=e2e-match-week-1/);
    await expect(page.getByText("Beendet").first()).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 20_000 });

  await expect(page.getByText("Beendet").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Die wichtigsten Ursachen" })).toBeVisible();
  await expect(page.getByText("Key Factor").first()).toBeVisible();
  await expect(page.getByText("Turning Point").first()).toBeVisible();
  await expect(page.getByText("Team Stats").first()).toBeVisible();
  await expect(page.getByText("Key Moments").first()).toBeVisible();
  await expect(page.getByText("NOCH KEINE DRIVES")).toHaveCount(0);
}

test.describe("Minimaler Week Loop", () => {
  test("durchlaeuft PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await test.step("PRE_WEEK anzeigen", async () => {
      await signInToDashboard(page);
      await expectDashboard(page);
      await expect(weekLoopPanel(page).getByText("Woche vorbereiten").first()).toBeVisible();
      await expect(weekLoopPanel(page).getByRole("button", { name: "Woche vorbereiten" })).toBeVisible();
    });

    await test.step("prepareWeekAction ausfuehren und READY pruefen", async () => {
      await waitForServerActionRedirect(page, E2E_TEST_ROUTES.dashboard, () =>
        weekLoopPanel(page)
          .getByRole("button", { name: "Woche vorbereiten" })
          .click({ noWaitAfter: true }),
      );
      await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
      await expect(weekLoopPanel(page).getByText("Bereit").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("link", { name: "Gameplan vorbereiten" }).first()).toBeVisible();
    });

    await test.step("Depth-Chart-Wahl treffen", async () => {
      await gotoAppRoute(page, DEPTH_CHART_ROUTE);
      await expect(page.getByRole("heading", { name: "Team Depth Chart", exact: true })).toBeVisible();
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
      await expect(page.getByRole("link", { name: "Gameplan vorbereiten" }).first()).toHaveAttribute(
        "href",
        `${GAME_SETUP_ROUTE}?${UPCOMING_MATCH_QUERY}`,
      );
      await gotoAppRoute(page, `${GAME_SETUP_ROUTE}?${UPCOMING_MATCH_QUERY}`);
      await expect(page).toHaveURL(/\/game\/setup\?matchId=e2e-match-week-1/, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
      });
      await expect(page.getByText("Spielvorschau").first()).toBeVisible();
      await expect(page.getByText(E2E_TEST_LABELS.opponentTeamName).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Spiel starten|Match starten/ })).toBeVisible();
    });

    await test.step("startGameAction ausfuehren und GAME_RUNNING pruefen", async () => {
      await waitForServerActionRedirect(page, GAME_SETUP_ROUTE, () =>
        page.getByRole("button", { name: /Spiel starten|Match starten/ }).click({ noWaitAfter: true }),
      );
      await gotoAppRoute(page, `${GAME_LIVE_ROUTE}?${UPCOMING_MATCH_QUERY}`);
      await expect(page).toHaveURL(/\/game\/live\?matchId=e2e-match-week-1/);
      await expect(page.getByText("Spiel laeuft").first()).toBeVisible();
      await expect(page.getByText("Live").first()).toBeVisible();
      await expect(page.getByText(/Drive Timeline/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Report nach Schlusspfiff" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Zum Match Report" })).toBeEnabled({ timeout: 20_000 });
    });

    await test.step("finishGameAction ausfuehren und POST_GAME pruefen", async () => {
      const finishForm = page
        .locator("form")
        .filter({ has: page.getByRole("button", { name: "Zum Match Report" }) })
        .first();

      await waitForServerActionRedirect(page, GAME_LIVE_ROUTE, () =>
        finishForm.getByRole("button", { name: "Zum Match Report" }).click({ noWaitAfter: true }),
      );
      await expectFinishedReport(page);
    });

    await test.step("advanceWeekAction ausfuehren und neue PRE_WEEK pruefen", async () => {
      await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
      await expectDashboard(page, true);
      await expect(weekLoopPanel(page).getByText("Nach dem Spiel").first()).toBeVisible();
      await expect(page.getByText(/\b(?:1-0|0-1)\b/).first()).toBeVisible();
      await expect(weekLoopPanel(page).getByRole("button", { name: "Naechste Woche" })).toBeVisible();

      await waitForServerActionRedirect(page, E2E_TEST_ROUTES.dashboard, () =>
        weekLoopPanel(page).getByRole("button", { name: "Naechste Woche" }).click({ noWaitAfter: true }),
      );
      await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
      await expect(weekLoopPanel(page).getByText("Woche vorbereiten").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("2026 · Woche 2").first()).toBeVisible();
      await expect(weekLoopPanel(page).getByRole("button", { name: "Woche vorbereiten" })).toBeVisible();
      await expect(page.getByText(E2E_TEST_IDS.nextWeekMatchId)).toHaveCount(0);
    });
  });
});
