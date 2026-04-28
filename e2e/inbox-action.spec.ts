import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  E2E_TEST_LABELS,
  E2E_TEST_ROUTES,
} from "./fixtures/minimal-e2e-context";
import { E2E_NAVIGATION_TIMEOUT_MS, signInViaDevLogin } from "./helpers/e2e-harness";

const INBOX_ALL_PATH = `${E2E_TEST_ROUTES.dashboard}/inbox?filter=all`;

async function signInToInbox(page: Page) {
  await signInViaDevLogin(page, INBOX_ALL_PATH);
}

async function firstActionableTask(page: Page) {
  const task = page.locator("article").filter({
    has: page.getByRole("button", { name: "Gelesen" }),
  }).first();

  await expect(task).toBeVisible();

  return task;
}

async function taskTitle(task: Locator) {
  const title = await task.locator("h3").first().innerText();

  return title.trim();
}

test.describe("Inbox Action", () => {
  test("markiert ein Inbox-Item als gelesen und behaelt den Zustand nach Reload", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await signInToInbox(page);

    await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();
    await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Inbox", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const task = await firstActionableTask(page);
    const title = await taskTitle(task);

    await test.step("Vorher-Zustand ist offen", async () => {
      await expect(task.getByRole("button", { name: "Offen" })).toBeDisabled();
      await expect(task.getByRole("button", { name: "Gelesen" })).toBeEnabled();
    });

    await test.step("Action ausfuehren und sichtbares Feedback pruefen", async () => {
      await task.getByRole("button", { name: "Gelesen" }).click();
      await expect(task.getByRole("button", { name: "Gelesen" })).toBeDisabled();
      await expect(task.getByRole("button", { name: "Offen" })).toBeEnabled();
    });

    await test.step("Nachher-Zustand bleibt nach Reload erhalten", async () => {
      await page.reload();
      await page.waitForURL(`**${INBOX_ALL_PATH}`, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      const persistedTask = page.locator("article", { hasText: title }).first();

      await expect(persistedTask).toBeVisible();
      await expect(persistedTask.getByRole("button", { name: "Gelesen" })).toBeDisabled();
      await expect(persistedTask.getByRole("button", { name: "Offen" })).toBeEnabled();
    });
  });
});
