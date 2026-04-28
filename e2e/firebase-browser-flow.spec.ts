import { expect, test, type Page, type Response } from "@playwright/test";

import {
  FIRESTORE_PARITY_IDS,
  makeFirestoreMatchId,
} from "../scripts/seeds/parity-fixture";
import {
  E2E_NAVIGATION_TIMEOUT_MS,
  gotoAppRoute,
  signInViaDevLogin,
  waitForServerActionRedirect,
} from "./helpers/e2e-harness";

const SAVEGAME_ID = FIRESTORE_PARITY_IDS.leagueId;
const SEASON_ID = FIRESTORE_PARITY_IDS.seasonId;
const MATCH_ID = FIRESTORE_PARITY_IDS.firstMatchId;
const PLAYER_ID = "team-demo-arrows-qb";
const DASHBOARD_ROUTE = `/app/savegames/${SAVEGAME_ID}`;
const GAME_SETUP_ROUTE = `${DASHBOARD_ROUTE}/game/setup`;
const GAME_LIVE_ROUTE = `${DASHBOARD_ROUTE}/game/live`;
const GAME_REPORT_ROUTE = `${DASHBOARD_ROUTE}/game/report`;
const MATCH_QUERY = `matchId=${encodeURIComponent(MATCH_ID)}`;

function installNoSilentServerErrorGuard(page: Page) {
  const serverErrors: Array<{ status: number; url: string }> = [];

  page.on("response", (response: Response) => {
    if (response.status() >= 500) {
      serverErrors.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });

  return serverErrors;
}

function weekLoopPanel(page: Page) {
  return page.locator("#week-loop");
}

async function expectNoServerErrors(serverErrors: Array<{ status: number; url: string }>) {
  expect(serverErrors, JSON.stringify(serverErrors, null, 2)).toEqual([]);
}

async function expectDashboard(page: Page) {
  await expect(page).toHaveURL(new RegExp(`${DASHBOARD_ROUTE}(?:\\?.*)?$`), {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
  });
  await expect(page.getByText("Firebase Demo League 2026").first()).toBeVisible();
  await expect(page.getByText("Austin Arrows").first()).toBeVisible();
}

test.describe("Firestore Browser E2E gegen Emulator", () => {
  test.skip(
    process.env.DATA_BACKEND !== "firestore",
    "Firestore browser flow must run with DATA_BACKEND=firestore.",
  );

  test("oeffnet Kernbereiche und durchlaeuft PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const serverErrors = installNoSilentServerErrorGuard(page);

    await test.step("lokaler Test-Auth-Einstieg und SaveGame oeffnen", async () => {
      await signInViaDevLogin(page, "/app");
      await expectDashboard(page);
      await expect(page.getByText("E2E Minimal Savegame")).toHaveCount(0);
    });

    await test.step("Team Overview, Roster und Player Detail oeffnen", async () => {
      await gotoAppRoute(page, `${DASHBOARD_ROUTE}/team`);
      await expect(page.getByRole("heading", { name: "Team Command Center" })).toBeVisible();
      await expect(page.getByText("Austin Arrows").first()).toBeVisible();

      await gotoAppRoute(page, `${DASHBOARD_ROUTE}/team/roster`);
      await expect(page.getByRole("heading", { name: "Roster Command" })).toBeVisible();
      await expect(page.locator("body")).toContainText("QB Arrows 1");

      await gotoAppRoute(page, `${DASHBOARD_ROUTE}/players/${PLAYER_ID}`);
      await expect(page.getByText("QB Arrows 1").first()).toBeVisible();
      await expect(page.locator("body")).toContainText("QB");
    });

    await test.step("Season Overview und Match Detail oeffnen", async () => {
      await gotoAppRoute(page, `${DASHBOARD_ROUTE}/seasons/${SEASON_ID}`);
      await expect(page.getByText("Standings").first()).toBeVisible();
      await expect(page.getByText("Schedule").first()).toBeVisible();
      await expect(page.getByText("Austin Arrows").first()).toBeVisible();

      await gotoAppRoute(page, `${DASHBOARD_ROUTE}/matches/${MATCH_ID}`);
      await expect(page).toHaveURL(new RegExp(`/game/report\\?matchId=${MATCH_ID}`), {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
      });
      await expect(page.getByText(/Vor dem Spiel|Spielbericht|Match Report/i).first()).toBeVisible();
    });

    await test.step("Week vorbereiten", async () => {
      await gotoAppRoute(page, DASHBOARD_ROUTE);
      await expectDashboard(page);
      await expect(weekLoopPanel(page).getByRole("button", { name: "Woche vorbereiten" })).toBeVisible();

      await waitForServerActionRedirect(page, DASHBOARD_ROUTE, () =>
        weekLoopPanel(page)
          .getByRole("button", { name: "Woche vorbereiten" })
          .click({ noWaitAfter: true }),
      );
      await gotoAppRoute(page, DASHBOARD_ROUTE);
      await expect(weekLoopPanel(page).getByText("Bereit").first()).toBeVisible({ timeout: 20_000 });
    });

    await test.step("Game Preview oeffnen und Match starten", async () => {
      await gotoAppRoute(page, `${GAME_SETUP_ROUTE}?${MATCH_QUERY}`);
      await expect(page).toHaveURL(new RegExp(`/game/setup\\?matchId=${MATCH_ID}`), {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
      });
      await expect(page.getByText("Spielvorschau").first()).toBeVisible();
      await expect(page.getByText("Austin Arrows").first()).toBeVisible();
      await expect(page.getByText("Boston Bison").first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Match starten|Spiel starten/ })).toBeVisible();

      await waitForServerActionRedirect(page, GAME_SETUP_ROUTE, () =>
        page.getByRole("button", { name: /Match starten|Spiel starten/ }).click({ noWaitAfter: true }),
      );
    });

    await test.step("Live Simulation beobachten und Match abschliessen", async () => {
      await gotoAppRoute(page, `${GAME_LIVE_ROUTE}?${MATCH_QUERY}`);
      await expect(page).toHaveURL(new RegExp(`/game/live\\?matchId=${MATCH_ID}`));
      await expect(page.getByText("Spiel laeuft").first()).toBeVisible();
      await expect(page.getByText(/Drive Timeline/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Zum Match Report" })).toBeEnabled({ timeout: 20_000 });

      const finishForm = page
        .locator("form")
        .filter({ has: page.getByRole("button", { name: "Zum Match Report" }) })
        .first();

      await waitForServerActionRedirect(page, GAME_LIVE_ROUTE, () =>
        finishForm.getByRole("button", { name: "Zum Match Report" }).click({ noWaitAfter: true }),
      );
    });

    await test.step("Match Report pruefen und naechste Woche erreichen", async () => {
      await gotoAppRoute(page, `${GAME_REPORT_ROUTE}?${MATCH_QUERY}`);
      await expect(page.getByText("Beendet").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("heading", { name: "Die wichtigsten Ursachen" })).toBeVisible();
      await expect(page.getByText("Team Stats").first()).toBeVisible();

      await gotoAppRoute(page, DASHBOARD_ROUTE);
      await expect(weekLoopPanel(page).getByText("Nach dem Spiel").first()).toBeVisible();
      await expect(weekLoopPanel(page).getByRole("button", { name: "Naechste Woche" })).toBeVisible();

      await waitForServerActionRedirect(page, DASHBOARD_ROUTE, () =>
        weekLoopPanel(page).getByRole("button", { name: "Naechste Woche" }).click({ noWaitAfter: true }),
      );
      await gotoAppRoute(page, DASHBOARD_ROUTE);
      await expect(weekLoopPanel(page).getByText("Woche vorbereiten").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("2026 · Woche 2").first()).toBeVisible();
      await expect(page.getByText(makeFirestoreMatchId(2, 1))).toHaveCount(0);
    });

    await expectNoServerErrors(serverErrors);
    await expect(page.locator("body")).not.toContainText("Prisma");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
