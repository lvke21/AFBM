import { expect, test } from "@playwright/test";

import { E2E_TEST_ROUTES } from "./fixtures/minimal-e2e-context";
import {
  gotoAppRoute,
  signInViaDevLogin,
  waitForServerActionRedirect,
} from "./helpers/e2e-harness";

test.describe("Time to Fun", () => {
  test("landet direkt im Dashboard und erlaubt den ersten sinnvollen Klick unter 2 Sekunden", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await signInViaDevLogin(page, "/app");
    await expect(page).toHaveURL(new RegExp(`${E2E_TEST_ROUTES.dashboard}(?:\\?.*)?$`));

    const measurementStart = Date.now();
    const primaryAction = page.locator('[data-primary-action="true"]').first();

    await expect(page.getByText("Du bist GM - bereite das naechste Spiel vor").first()).toBeVisible();
    await expect(primaryAction).toBeVisible();
    await expect(primaryAction).toBeEnabled();

    const timeToFirstActionMs = Date.now() - measurementStart;
    console.log(`[time-to-fun] primary action visible/enabled after ${timeToFirstActionMs}ms`);
    expect(timeToFirstActionMs).toBeLessThan(2_000);

    await waitForServerActionRedirect(page, E2E_TEST_ROUTES.dashboard, () =>
      primaryAction.click({ noWaitAfter: true }),
    );
    await gotoAppRoute(page, E2E_TEST_ROUTES.dashboard);
    await expect(page.getByText("READY").first()).toBeVisible({ timeout: 20_000 });
  });
});
