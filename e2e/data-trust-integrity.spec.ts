import { expect, test, type Page } from "@playwright/test";

import {
  E2E_TEST_IDS,
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
const PLAYER_ROUTE = `${E2E_TEST_ROUTES.dashboard}/players/e2e-bos-qb`;
const DEVELOPMENT_ROUTE = `${E2E_TEST_ROUTES.dashboard}/development`;
const UPCOMING_MATCH_QUERY = `matchId=${encodeURIComponent(E2E_TEST_IDS.upcomingMatchId)}`;
const TECHNICAL_UI_LABEL = /\b(?:DERIVED|UI-FIXTURE|UI FIXTURE|READ MODEL|READ-MODEL|READ_MODEL|FALLBACK)\b/i;

function weekLoopPanel(page: Page) {
  return page.locator("#week-loop");
}

async function expectNoTechnicalLabels(page: Page) {
  await expect(page.getByText(TECHNICAL_UI_LABEL)).toHaveCount(0);
}

async function makeDepthChartChoice(page: Page) {
  await gotoAppRoute(page, DEPTH_CHART_ROUTE);

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
}

async function completeWeekOneGame(page: Page) {
  await waitForServerActionRedirect(page, E2E_TEST_ROUTES.dashboard, () =>
    weekLoopPanel(page).getByRole("button", { name: "Woche vorbereiten" }).click({
      noWaitAfter: true,
    }),
  );
  await makeDepthChartChoice(page);
  await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
  await gotoAppRoute(page, `${GAME_SETUP_ROUTE}?${UPCOMING_MATCH_QUERY}`);
  await waitForServerActionRedirect(page, GAME_SETUP_ROUTE, () =>
    page.getByRole("button", { name: /Spiel starten|Match starten/ }).click({
      noWaitAfter: true,
    }),
  );
  await gotoAppRoute(page, `${GAME_LIVE_ROUTE}?${UPCOMING_MATCH_QUERY}`);

  const finishForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Zum Match Report" }) })
    .first();

  await waitForServerActionRedirect(page, GAME_LIVE_ROUTE, () =>
    finishForm.getByRole("button", { name: "Zum Match Report" }).click({ noWaitAfter: true }),
  );
  await gotoAppRoute(page, `${GAME_REPORT_ROUTE}?${UPCOMING_MATCH_QUERY}`);
}

test.describe("Data Trust Integrity", () => {
  test("haelt Score, Record und UI-Datenlabels ueber Report, Dashboard und Player-Flows konsistent", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await signInViaDevLogin(page, E2E_TEST_ROUTES.dashboard);
    await expectNoTechnicalLabels(page);
    await expect(page.getByText("0-0").first()).toBeVisible();

    await completeWeekOneGame(page);
    await expect(page.getByText("COMPLETED").first()).toBeVisible();
    await expectNoTechnicalLabels(page);

    const reportScore = (await page.getByText(/\d+\s:\s\d+/).first().textContent())?.replace(/\s/g, "");

    expect(reportScore).toMatch(/^\d+:\d+$/);

    await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
    await expect(page.getByText(reportScore!).first()).toBeVisible();
    await expect(page.getByText(/\b(?:1-0|0-1)\b/).first()).toBeVisible();
    await expectNoTechnicalLabels(page);

    await gotoAppRoute(page, PLAYER_ROUTE);
    await expect(page.getByRole("heading", { name: /Evan Stone/ })).toBeVisible();
    await expectNoTechnicalLabels(page);

    await gotoAppRoute(page, DEVELOPMENT_ROUTE);
    await expect(page.getByRole("heading", { name: "Player Development" })).toBeVisible();
    await expectNoTechnicalLabels(page);
  });
});
