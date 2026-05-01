import { expect, test, type Page } from "@playwright/test";

import { E2E_NAVIGATION_TIMEOUT_MS } from "./helpers/e2e-harness";

const LEAGUE_ID = "e2e-multiplayer-league";
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-afbm";
const FIRESTORE_EMULATOR_ORIGIN = `http://${
  process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"
}`;
let e2eAccountCounter = 0;

type FirebaseAuthSession = {
  uid: string;
  accessToken: string;
};

type FirestoreDocument = {
  fields?: Record<
    string,
    {
      booleanValue?: boolean;
      integerValue?: string;
      stringValue?: string;
    }
  >;
};

function documentUrl(path: string) {
  return `${FIRESTORE_EMULATOR_ORIGIN}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}

function fieldString(document: FirestoreDocument, fieldName: string) {
  return document.fields?.[fieldName]?.stringValue ?? "";
}

function fieldBoolean(document: FirestoreDocument, fieldName: string) {
  return document.fields?.[fieldName]?.booleanValue ?? false;
}

function createE2eEmail(label: string) {
  e2eAccountCounter += 1;
  return `afbm-${label.toLowerCase()}-${Date.now()}-${e2eAccountCounter}@example.test`;
}

async function registerOnlineUser(page: Page, label: string) {
  const response = await page.goto("/online", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
  await page.getByRole("button", { name: "Registrieren" }).click();
  await page.getByLabel("Anzeigename").fill(`E2E Coach ${label}`);
  await page.getByLabel("Email").fill(createE2eEmail(label));
  await page.getByLabel("Passwort").fill("AFBM-e2e-pass-123!");
  await page.getByRole("button", { name: "Account erstellen" }).click();
  await expect(page.getByRole("heading", { name: "Online Liga" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Firebase Email/Passwort").first()).toBeVisible({
    timeout: 15_000,
  });
}

async function openOnlineHub(page: Page) {
  const response = await page.goto("/online", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Online Liga" })).toBeVisible();
  await expect(page.getByText("Live Multiplayer").first()).toBeVisible();
  await expect(page.getByText("Firebase verbunden").first()).toBeVisible();
  await expect(page.getByText("Firebase Email/Passwort").first()).toBeVisible({
    timeout: 15_000,
  });
}

async function searchLeagues(page: Page) {
  await page.getByRole("button", { name: "Liga suchen" }).click();
  await expect(page.getByText("Gefundene Ligen")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Firebase Multiplayer E2E League")).toBeVisible();
}

async function suggestTeam(page: Page) {
  await page.getByRole("button", { name: /Team vorschlagen/ }).click();
  await expect(page.getByText("Vollständiger Teamname", { exact: true })).toBeVisible();
}

async function getPreviewTeamName(page: Page) {
  return page
    .getByText("Vollständiger Teamname", { exact: true })
    .locator("xpath=following-sibling::p[1]")
    .innerText();
}

async function joinSeededLeague(page: Page) {
  await openOnlineHub(page);
  await searchLeagues(page);
  await suggestTeam(page);

  const selectedTeamName = await getPreviewTeamName(page);
  const joinButton = page.getByRole("button", {
    name: /Beitreten Firebase Multiplayer E2E League|Beitreten/,
  }).first();

  await expect(joinButton).toBeEnabled();
  await joinButton.click();
  await expect(page.getByText("Du bist der Liga beigetreten.")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("link", { name: "Liga öffnen" }).click();
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(selectedTeamName).first()).toBeVisible();

  return selectedTeamName;
}

async function getFirebaseAuthSession(page: Page): Promise<FirebaseAuthSession> {
  return page.evaluate(async () => {
    const request = indexedDB.open("firebaseLocalStorageDb");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    try {
      const transaction = database.transaction("firebaseLocalStorage", "readonly");
      const store = transaction.objectStore("firebaseLocalStorage");
      const records = await new Promise<unknown[]>((resolve, reject) => {
        const getAllRequest = store.getAll();

        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      });
      const candidates = records.flatMap((record) => {
        const maybeRecord = record as { value?: unknown };

        return [record, maybeRecord.value];
      });
      const authUser = candidates.find((candidate) => {
        const maybeUser = candidate as {
          stsTokenManager?: { accessToken?: string };
          uid?: string;
        };

        return Boolean(maybeUser?.uid && maybeUser.stsTokenManager?.accessToken);
      }) as {
        stsTokenManager: { accessToken: string };
        uid: string;
      } | undefined;

      if (!authUser) {
        throw new Error("Firebase Auth session not found in IndexedDB.");
      }

      return {
        uid: authUser.uid,
        accessToken: authUser.stsTokenManager.accessToken,
      };
    } finally {
      database.close();
    }
  });
}

async function getMembership(
  session: FirebaseAuthSession,
  userId: string,
) {
  const response = await firestoreFetch(
    documentUrl(`leagues/${LEAGUE_ID}/memberships/${userId}`),
    session,
  );

  expect(response.status).toBe(200);

  return (await response.json()) as FirestoreDocument;
}

async function getTeam(session: FirebaseAuthSession, teamId: string) {
  const response = await firestoreFetch(
    documentUrl(`leagues/${LEAGUE_ID}/teams/${teamId}`),
    session,
  );

  expect(response.status).toBe(200);

  return (await response.json()) as FirestoreDocument;
}

async function firestoreFetch(
  url: string,
  session: FirebaseAuthSession,
  init: RequestInit = {},
) {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(8_000),
  });
}

async function expectLastLeaguePersistence(page: Page) {
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("afbm.online.lastLeagueId")))
    .toBe(LEAGUE_ID);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("afbm.online.lastLeagueId")))
    .toBe(LEAGUE_ID);
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 15_000,
  });

  await openOnlineHub(page);
  await page.getByRole("button", { name: "Weiterspielen" }).click();
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible();
}

async function clickReadyForWeek(page: Page, weekNumber: number) {
  const readyButton = page.getByRole("button", {
    name: new RegExp(`^Bereit für Week ${weekNumber}$`),
  });

  await expect(readyButton).toBeEnabled();
  await readyButton.scrollIntoViewIfNeeded();
  await readyButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

test.describe.serial("Firebase Multiplayer E2E", () => {
  test.setTimeout(90_000);

  test("two independent users join, sync ready state, persist reloads and block cross-user writes", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

      await registerOnlineUser(pageA, "A");
      const teamNameA = await joinSeededLeague(pageA);
      const sessionA = await getFirebaseAuthSession(pageA);

      await expect(pageA.getByText("1/2 Spieler", { exact: true }).first()).toBeVisible();

      await registerOnlineUser(pageB, "B");
      const teamNameB = await joinSeededLeague(pageB);
      const sessionB = await getFirebaseAuthSession(pageB);

      expect(sessionA.uid).not.toBe(sessionB.uid);
      expect(teamNameA).not.toBe(teamNameB);

      await expect(pageA.getByText("2/2 Spieler", { exact: true }).first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(pageB.getByText("2/2 Spieler", { exact: true }).first()).toBeVisible();

      const membershipA = await getMembership(sessionA, sessionA.uid);
      const membershipB = await getMembership(sessionA, sessionB.uid);
      const teamIdA = fieldString(membershipA, "teamId");
      const teamIdB = fieldString(membershipB, "teamId");

      expect(teamIdA).toBeTruthy();
      expect(teamIdB).toBeTruthy();
      expect(teamIdA).not.toBe(teamIdB);

      const teamA = await getTeam(sessionA, teamIdA);
      const teamB = await getTeam(sessionA, teamIdB);

      expect(fieldString(teamA, "assignedUserId")).toBe(sessionA.uid);
      expect(fieldString(teamB, "assignedUserId")).toBe(sessionB.uid);

      await clickReadyForWeek(pageA, 1);
      await expect(pageA.getByText("Du bist bereit für Week 1.").first()).toBeVisible();
      await expect(pageB.getByText(/1\/2 .*bereit/).first()).toBeVisible({
        timeout: 15_000,
      });

      const readyMembershipA = await getMembership(sessionB, sessionA.uid);
      expect(fieldBoolean(readyMembershipA, "ready")).toBe(true);

      await expectLastLeaguePersistence(pageA);
      await expectLastLeaguePersistence(pageB);

      const forbiddenMembershipWrite = await firestoreFetch(
        `${documentUrl(`leagues/${LEAGUE_ID}/memberships/${sessionB.uid}`)}?updateMask.fieldPaths=ready`,
        sessionA,
        {
          method: "PATCH",
          body: JSON.stringify({
            fields: {
              ready: { booleanValue: false },
            },
          }),
        },
      );

      expect(forbiddenMembershipWrite.status).toBe(403);

      const forbiddenTeamWrite = await firestoreFetch(
        `${documentUrl(`leagues/${LEAGUE_ID}/teams/${teamIdB}`)}?updateMask.fieldPaths=depthChart`,
        sessionA,
        {
          method: "PATCH",
          body: JSON.stringify({
            fields: {
              depthChart: { arrayValue: { values: [] } },
            },
          }),
        },
      );

      expect(forbiddenTeamWrite.status).toBe(403);

      await pageA.goto(`/admin/league/${LEAGUE_ID}`, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });
      await expect(pageA.getByRole("heading", { name: "Admin Control Center entsperren" })).toBeVisible();
      await expect(pageA.getByText("Simulationssteuerung")).toHaveCount(0);
  });
});
