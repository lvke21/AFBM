import { expect, type Page } from "@playwright/test";

export const E2E_NAVIGATION_TIMEOUT_MS = Number(
  process.env.E2E_NAVIGATION_TIMEOUT_MS ?? 45_000,
);
export const E2E_ACTION_TIMEOUT_MS = Number(process.env.E2E_ACTION_TIMEOUT_MS ?? 45_000);
const E2E_DEV_LOGIN_ATTEMPT_TIMEOUT_MS = Math.min(15_000, E2E_NAVIGATION_TIMEOUT_MS);

function pathAndSearchFromLocation(location: string) {
  try {
    const url = new URL(location);
    return `${url.pathname}${url.search}`;
  } catch {
    return location;
  }
}

function saveGameIdFromAppPath(path: string) {
  const match = path.match(/^\/app\/savegames\/([^/?#]+)/);

  return match ? decodeURIComponent(match[1]) : null;
}

async function markOnboardingCompleteForE2E(page: Page, callbackUrl: string) {
  const saveGameId = saveGameIdFromAppPath(callbackUrl);

  if (!saveGameId) {
    return;
  }

  const initPayload = { saveGameId };

  await page.addInitScript(({ saveGameId: targetSaveGameId }) => {
    window.localStorage.setItem(
      `afbm:onboarding:v1:${targetSaveGameId}`,
      JSON.stringify(["team", "depth-chart", "inbox", "game-start"]),
    );
  }, initPayload);
}

export async function gotoAppRoute(page: Page, path: string) {
  await expect(async () => {
    const response = await page.goto(path, {
      timeout: E2E_NAVIGATION_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });

    if (response) {
      expect(response.status()).toBeLessThan(400);
    }
  }).toPass({ timeout: E2E_NAVIGATION_TIMEOUT_MS + 15_000 });
}

export async function signInViaDevLogin(page: Page, callbackUrl: string) {
  await markOnboardingCompleteForE2E(page, callbackUrl);

  await expect(async () => {
    const response = await page.request.get(
      `/api/e2e/dev-login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      {
        maxRedirects: 0,
        timeout: E2E_DEV_LOGIN_ATTEMPT_TIMEOUT_MS,
      },
    );

    expect([307, 308]).toContain(response.status());
    expect(pathAndSearchFromLocation(response.headers().location ?? "")).toBe(callbackUrl);
  }).toPass({ timeout: E2E_NAVIGATION_TIMEOUT_MS + E2E_DEV_LOGIN_ATTEMPT_TIMEOUT_MS });

  await gotoAppRoute(page, callbackUrl);
}

export async function waitForServerActionRedirect(
  page: Page,
  postPath: string,
  submit: () => Promise<void>,
) {
  const redirectResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === postPath &&
      response.request().method() === "POST" &&
      response.status() === 303
    );
  }, { timeout: E2E_ACTION_TIMEOUT_MS });

  await submit();
  await redirectResponse;
}
