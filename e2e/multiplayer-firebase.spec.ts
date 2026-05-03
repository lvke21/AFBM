import { expect, test, type Page } from "@playwright/test";

import { E2E_NAVIGATION_TIMEOUT_MS } from "./helpers/e2e-harness";

const LEAGUE_ID = "e2e-multiplayer-league";
const ADMIN_WEEK_LEAGUE_ID = "e2e-admin-week-league";
const ADMIN_MISSING_ROSTER_LEAGUE_ID = "e2e-admin-missing-roster-league";
const ADMIN_INVALID_DEPTH_LEAGUE_ID = "e2e-admin-invalid-depth-league";
const ADMIN_BROKEN_SCHEDULE_LEAGUE_ID = "e2e-admin-broken-schedule-league";
const NO_TEAM_LEAGUE_ID = "e2e-no-team-league";
const NO_ROSTER_LEAGUE_ID = "e2e-no-roster-league";
const RACE_LEAGUE_ID = "e2e-race-league";
const REJOIN_LEAGUE_ID = "e2e-rejoin-league";
const STALE_TEAM_LEAGUE_ID = "e2e-stale-team-league";
const E2E_ADMIN_EMAIL = "afbm-admin-e2e@example.test";
const E2E_ADMIN_PASSWORD = "AFBM-e2e-admin-pass-123!";
const E2E_STATE_EMAIL = "afbm-state-e2e@example.test";
const E2E_STATE_PASSWORD = "AFBM-e2e-state-pass-123!";
const E2E_REJOIN_EMAIL = "afbm-rejoin-e2e@example.test";
const E2E_REJOIN_PASSWORD = "AFBM-e2e-rejoin-pass-123!";
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

type FirestoreCollectionResponse = {
  documents?: FirestoreDocument[];
};

type AdminWeekBrowserSnapshot = {
  results: string;
  standings: string;
};

const MULTIPLAYER_SUBPAGE_ROUTES = [
  { label: "Dashboard", path: (leagueId: string) => `/online/league/${leagueId}` },
  { label: "Spielablauf", path: (leagueId: string) => `/online/league/${leagueId}/schedule` },
  { label: "Roster", path: (leagueId: string) => `/online/league/${leagueId}/roster` },
  { label: "Depth Chart", path: (leagueId: string) => `/online/league/${leagueId}/depth-chart` },
  { label: "League/Standings", path: (leagueId: string) => `/online/league/${leagueId}/standings` },
  { label: "Draft", path: (leagueId: string) => `/online/league/${leagueId}/draft` },
  {
    label: "Coming Soon",
    path: (leagueId: string) => `/online/league/${leagueId}/coming-soon/contracts-cap`,
  },
];
const NON_MVP_COMING_SOON_FEATURES = [
  { feature: "contracts-cap", heading: "Contracts/Cap kommt später" },
  { feature: "development", heading: "Development kommt später" },
  { feature: "training", heading: "Training kommt später" },
  { feature: "trade-board", heading: "Trade Board kommt später" },
  { feature: "inbox", heading: "Inbox kommt später" },
  { feature: "finance", heading: "Finance kommt später" },
];

function documentUrl(path: string) {
  return `${FIRESTORE_EMULATOR_ORIGIN}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}

function fieldString(document: FirestoreDocument, fieldName: string) {
  return document.fields?.[fieldName]?.stringValue ?? "";
}

function fieldBoolean(document: FirestoreDocument, fieldName: string) {
  return document.fields?.[fieldName]?.booleanValue ?? false;
}

function fieldInteger(document: FirestoreDocument, fieldName: string) {
  return Number(document.fields?.[fieldName]?.integerValue ?? "0");
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

async function signInSeededAdmin(page: Page) {
  const response = await page.goto("/online", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Passwort").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Einloggen" }).click();
  await expect(page.getByRole("heading", { name: "Online Liga" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Firebase Email/Passwort").first()).toBeVisible({
    timeout: 15_000,
  });
}

async function signInSeededStateUser(page: Page) {
  const response = await page.goto("/online", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
  await page.getByLabel("Email").fill(E2E_STATE_EMAIL);
  await page.getByLabel("Passwort").fill(E2E_STATE_PASSWORD);
  await page.getByRole("button", { name: "Einloggen" }).click();
  await expect(page.getByRole("heading", { name: "Online Liga" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Firebase Email/Passwort").first()).toBeVisible({
    timeout: 15_000,
  });
}

async function signInSeededRejoinUser(page: Page) {
  const response = await page.goto("/online", {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status(), "Rejoin GM login page must load from local E2E app.").toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
  await page.getByLabel("Email").fill(E2E_REJOIN_EMAIL);
  await page.getByLabel("Passwort").fill(E2E_REJOIN_PASSWORD);
  await page.getByRole("button", { name: "Einloggen" }).click();
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
  await expect(page.getByText("Online verbunden").first()).toBeVisible();
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
    name: "Beitreten Firebase Multiplayer E2E League",
  }).first();

  await expect(
    joinButton,
    "Expected the default multiplayer E2E league card to expose a join button.",
  ).toBeEnabled();
  await joinButton.click();
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(selectedTeamName).first()).toBeVisible();

  return selectedTeamName;
}

async function prepareLeagueJoin(page: Page, leagueName: string) {
  await openOnlineHub(page);
  await page.getByRole("button", { name: "Liga suchen" }).click();
  await expect(page.getByText("Gefundene Ligen")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(leagueName)).toBeVisible();
  await suggestTeam(page);

  const selectedTeamName = await getPreviewTeamName(page);
  const joinButton = page.getByRole("button", { name: `Beitreten ${leagueName}` }).first();

  await expect(joinButton, `Expected ${leagueName} to expose a join button.`).toBeEnabled();

  return { joinButton, selectedTeamName };
}

async function openLeagueDashboard(page: Page, leagueId: string, leagueName: string) {
  const response = await page.goto(`/online/league/${leagueId}`, {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status(), `Expected browser to open league dashboard ${leagueId}.`).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(leagueName).first()).toBeVisible({
    timeout: 15_000,
  });
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
  leagueId = LEAGUE_ID,
) {
  const response = await firestoreFetch(
    documentUrl(`leagues/${leagueId}/memberships/${userId}`),
    session,
  );

  expect(response.status, `Expected membership ${leagueId}/${userId} to be readable.`).toBe(200);

  return (await response.json()) as FirestoreDocument;
}

async function getOptionalMembership(
  session: FirebaseAuthSession,
  userId: string,
  leagueId = LEAGUE_ID,
) {
  const response = await firestoreFetch(
    documentUrl(`leagues/${leagueId}/memberships/${userId}`),
    session,
  );

  if (response.status === 404 || response.status === 403) {
    return null;
  }

  expect(response.status, `Expected optional membership ${leagueId}/${userId} to be readable.`).toBe(200);

  return (await response.json()) as FirestoreDocument;
}

async function getLeagueDocument(session: FirebaseAuthSession, leagueId = LEAGUE_ID) {
  const response = await firestoreFetch(documentUrl(`leagues/${leagueId}`), session);

  expect(response.status, `Expected league ${leagueId} to be readable.`).toBe(200);

  return (await response.json()) as FirestoreDocument;
}

async function listTeams(session: FirebaseAuthSession, leagueId = LEAGUE_ID) {
  const response = await firestoreFetch(documentUrl(`leagues/${leagueId}/teams`), session);

  expect(response.status, `Expected league ${leagueId} teams to be listable.`).toBe(200);

  return ((await response.json()) as FirestoreCollectionResponse).documents ?? [];
}

async function getTeam(session: FirebaseAuthSession, teamId: string, leagueId = LEAGUE_ID) {
  const response = await firestoreFetch(
    documentUrl(`leagues/${leagueId}/teams/${teamId}`),
    session,
  );

  expect(response.status, `Expected team ${leagueId}/${teamId} to be readable.`).toBe(200);

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

async function expectStaleLastLeagueRecoveryAndRejoin(
  page: Page,
  expectedTeamName: string,
  leagueId = LEAGUE_ID,
  leagueName = "Firebase Multiplayer E2E League",
) {
  await openOnlineHub(page);
  await page.evaluate(() => {
    localStorage.setItem("afbm.online.lastLeagueId", "missing-e2e-league");
  });

  await page.getByRole("button", { name: "Weiterspielen" }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("afbm.online.lastLeagueId")))
    .toBeNull();
  await expect(page.getByRole("button", { name: "Liga suchen" })).toBeVisible();

  await searchLeagues(page);
  await expect(page.getByText(leagueName).first()).toBeVisible({
    timeout: 10_000,
  });
  const rejoinButton = page.getByRole("button", {
    name: new RegExp(`Beitreten ${leagueName}`),
  }).first();

  await expect(rejoinButton, `Expected ${leagueName} to expose a rejoin button.`).toBeEnabled();
  await expect(rejoinButton).toContainText("Wieder beitreten");
  await rejoinButton.click();
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(expectedTeamName).first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("afbm.online.lastLeagueId")))
    .toBe(leagueId);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(expectedTeamName).first()).toBeVisible();

  await openOnlineHub(page);
  await page.getByRole("button", { name: "Weiterspielen" }).click();
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible();
  await expect(page.getByText(expectedTeamName).first()).toBeVisible();
}

async function clickReadyForWeek(page: Page, weekNumber: number) {
  const readyButton = page.getByRole("button", {
    name: new RegExp(`^Bereit für Woche ${weekNumber}$`),
  });

  await expect(readyButton).toBeEnabled();
  await readyButton.scrollIntoViewIfNeeded();
  await readyButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
}

async function openAdminWeekLeague(page: Page) {
  const response = await page.goto(`/admin/league/${ADMIN_WEEK_LEAGUE_ID}`, {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Firebase Admin Week E2E League" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(ADMIN_WEEK_LEAGUE_ID).first()).toBeVisible();
}

async function expectAdminWeekReadyForSimulation(page: Page) {
  await expect(
    page.getByText("Alle Voraussetzungen sind grün. Die Simulation kann einmal ausgeführt werden.").first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Woche simulieren und abschließen/ })).toBeEnabled();
}

async function expectAdminWeekSimulatedState(page: Page) {
  await expect(page.getByText("Woche abgeschlossen").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Saison 1, Woche 1" })).toBeVisible();
  await expect(page.getByText("Bereits simulierte Games").first()).toBeVisible();
  await expect(page.getByText(/S1 W1/).first()).toBeVisible();
  await expect(page.getByText("Standings / Records").first()).toBeVisible();
  await expect(page.getByText(/GP 1/).first()).toBeVisible();
  await expect(page.getByText("Woche 2").first()).toBeVisible();
}

async function getAdminWeekBrowserSnapshot(page: Page): Promise<AdminWeekBrowserSnapshot> {
  const resultsCard = page
    .getByText("Bereits simulierte Games", { exact: true })
    .locator("xpath=ancestor::div[1]");
  const standingsCard = page
    .getByText("Standings / Records", { exact: true })
    .locator("xpath=ancestor::div[1]");

  await expect(resultsCard, "Admin week results card must stay visible in the browser.").toBeVisible();
  await expect(standingsCard, "Admin week standings card must stay visible in the browser.").toBeVisible();

  return {
    results: normalizeBrowserText(await resultsCard.innerText()),
    standings: normalizeBrowserText(await standingsCard.innerText()),
  };
}

function normalizeBrowserText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

async function expectDuplicateAdminWeekSimulationBlocked(
  page: Page,
  session: FirebaseAuthSession,
) {
  const response = await runAdminWeekSimulationApi(page, session, ADMIN_WEEK_LEAGUE_ID);

  expect(response.status).toBe(400);
  expect(response.body.ok).toBe(false);
  expect(response.body.code).toBe("week_already_simulated");
  await expect(
    page.getByRole("button", { name: /Woche simulieren und abschließen/ }),
    "Admin week simulation button must remain disabled after the week was completed.",
  ).toBeDisabled();
}

async function runAdminWeekSimulationApi(
  page: Page,
  session: FirebaseAuthSession,
  leagueId: string,
) {
  return page.evaluate(
    async ({ accessToken, leagueId: targetLeagueId }) => {
      const apiResponse = await fetch("/admin/api/online/actions", {
        body: JSON.stringify({
          action: "simulateWeek",
          backendMode: "firebase",
          confirmed: true,
          leagueId: targetLeagueId,
          season: 1,
          week: 1,
        }),
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
      });

      return {
        body: (await apiResponse.json()) as {
          code?: string;
          message?: string;
          ok?: boolean;
        },
        status: apiResponse.status,
      };
    },
    {
      accessToken: session.accessToken,
      leagueId,
    },
  );
}

async function expectAdminWeekSimulationApiBlocked(
  page: Page,
  session: FirebaseAuthSession,
  leagueId: string,
  expectedCode: string,
) {
  const before = await getLeagueDocument(session, leagueId);
  const response = await runAdminWeekSimulationApi(page, session, leagueId);
  const after = await getLeagueDocument(session, leagueId);

  expect(response.status, `${leagueId} must reject invalid simulation input.`).toBe(400);
  expect(response.body.ok).toBe(false);
  expect(response.body.code).toBe(expectedCode);
  expect(response.body.message, `${leagueId} must expose a clear blocker message.`).toBeTruthy();
  expect(fieldInteger(after, "currentWeek")).toBe(fieldInteger(before, "currentWeek"));
  expect(fieldString(after, "weekStatus")).toBe(fieldString(before, "weekStatus"));
}

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

async function expectTeamRecoveryForDirectRoute(
  page: Page,
  routePath: string,
  expectedHeading: RegExp,
) {
  const response = await page.goto(routePath, {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: expectedHeading })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page
      .getByText(/kein aktives Team|nicht erreichbar|Membership-Projektion inkonsistent|widerspruechlich/)
      .first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Zurueck zum Onlinebereich|Zurueck zum Online Hub/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toHaveCount(0);
}

async function expectNoRosterDirectRoute(page: Page, routePath: string) {
  const response = await page.goto(routePath, {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Noch kein Team-Kader geladen.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Zurück zum Onlinebereich|Zurück zum Online Hub/ })).toBeVisible();
}

async function expectComingSoonDirectRoute(page: Page, routePath: string) {
  const response = await page.goto(routePath, {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Contracts/Cap kommt später" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Nicht Teil des aktuellen Multiplayer MVP.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Zurück zum Dashboard" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const element = document.documentElement;

          return element.scrollWidth <= element.clientWidth + 1;
        }),
      {
        message: "Dashboard viewport must not create document-level horizontal overflow.",
      },
    )
    .toBe(true);
}

async function expectOnlineSidebarMvpScope(page: Page) {
  const navigation = page.getByRole("navigation", { name: "Manager-Navigation" });

  await expect(navigation).toBeVisible();
  await expect(navigation.getByText("Core Actions")).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Spielablauf" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Roster" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Depth Chart" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Team Overview" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "League" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Draft" })).toBeVisible();

  for (const nonMvpLabel of [
    "Contracts/Cap",
    "Development",
    "Training",
    "Trade Board",
    "Inbox",
    "Finance",
  ]) {
    await expect(
      navigation.getByText(nonMvpLabel, { exact: true }),
      `${nonMvpLabel} must not be prominent in the online MVP sidebar.`,
    ).toHaveCount(0);
  }
}

async function expectDashboardButtonsHaveAccessibleNames(page: Page) {
  await expect(page.getByRole("button", { name: "Bereit-Status erklären" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bereit für Woche 1/ })).toBeVisible();
}

test.describe.serial("Firebase Multiplayer E2E", () => {
  test.setTimeout(90_000);

  test("seeded GM rejoins the same team after reload and stale lastLeagueId recovery", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND !== "firebase",
      "GM rejoin E2E requires the Firebase emulator multiplayer seed.",
    );

    await test.step("Login/Auth with the seeded rejoin GM", async () => {
      await signInSeededRejoinUser(page);
    });

    const session = await getFirebaseAuthSession(page);
    const membership = await getMembership(session, session.uid, REJOIN_LEAGUE_ID);
    const teamId = fieldString(membership, "teamId");

    expect(teamId, "Seeded rejoin membership must point at a team.").toBeTruthy();

    const team = await getTeam(session, teamId, REJOIN_LEAGUE_ID);
    const teamName = fieldString(team, "displayName");

    expect(fieldString(membership, "status"), "Seeded rejoin membership must be active.").toBe(
      "active",
    );
    expect(
      fieldString(team, "assignedUserId"),
      "Seeded rejoin team projection must point at the logged-in GM.",
    ).toBe(session.uid);
    expect(teamName, "Seeded rejoin team must have a display name for browser assertions.").toBeTruthy();

    await test.step("Open league and verify existing membership/team assignment", async () => {
      await openLeagueDashboard(page, REJOIN_LEAGUE_ID, "Firebase GM Rejoin E2E League");
      await expect(page.getByText(teamName).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Reload keeps the GM on the same team", async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Was jetzt tun?" })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(teamName).first()).toBeVisible();
    });

    await test.step("Stale lastLeagueId is cleared, then rejoin returns to the same team", async () => {
      await expectStaleLastLeagueRecoveryAndRejoin(
        page,
        teamName,
        REJOIN_LEAGUE_ID,
        "Firebase GM Rejoin E2E League",
      );

      const rejoinedMembership = await getMembership(session, session.uid, REJOIN_LEAGUE_ID);
      const rejoinedTeamId = fieldString(rejoinedMembership, "teamId");
      const rejoinedTeam = await getTeam(session, rejoinedTeamId, REJOIN_LEAGUE_ID);

      expect(rejoinedTeamId, "Rejoin must preserve the canonical membership teamId.").toBe(teamId);
      expect(
        fieldString(rejoinedTeam, "assignedUserId"),
        "Rejoin must not move the GM to another team projection.",
      ).toBe(session.uid);
    });
  });

  test("two independent users join, sync ready state, persist reloads and block cross-user writes", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

      await registerOnlineUser(pageA, "A");
      const sessionA = await getFirebaseAuthSession(pageA);
      await registerOnlineUser(pageB, "B");
      const sessionB = await getFirebaseAuthSession(pageB);

      await test.step("Simultaneous same-team join race assigns at most one GM", async () => {
        const [raceJoinA, raceJoinB] = await Promise.all([
          prepareLeagueJoin(pageA, "Firebase Race E2E League"),
          prepareLeagueJoin(pageB, "Firebase Race E2E League"),
        ]);

        expect(raceJoinA.selectedTeamName).toBe(raceJoinB.selectedTeamName);

        await Promise.allSettled([
          raceJoinA.joinButton.click(),
          raceJoinB.joinButton.click(),
        ]);

        await expect
          .poll(async () => fieldInteger(await getLeagueDocument(sessionA, RACE_LEAGUE_ID), "memberCount"))
          .toBe(1);

        const [raceMembershipA, raceMembershipB] = await Promise.all([
          getOptionalMembership(sessionA, sessionA.uid, RACE_LEAGUE_ID),
          getOptionalMembership(sessionB, sessionB.uid, RACE_LEAGUE_ID),
        ]);
        const activeRaceMemberships = [raceMembershipA, raceMembershipB].filter(
          (membership) => fieldString(membership ?? {}, "status") === "active",
        );
        const raceTeams = await listTeams(sessionA, RACE_LEAGUE_ID);
        const assignedRaceTeams = raceTeams.filter(
          (team) => fieldString(team, "status") === "assigned" && fieldString(team, "assignedUserId"),
        );

        expect(activeRaceMemberships).toHaveLength(1);
        expect(assignedRaceTeams).toHaveLength(1);
      });

      const teamNameA = await joinSeededLeague(pageA);

      await expect(pageA.getByText("1/2 Spieler", { exact: true }).first()).toBeVisible();

      const teamNameB = await joinSeededLeague(pageB);

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
      await expect(pageA.getByText("Du bist bereit für Woche 1.").first()).toBeVisible();
      await expect(pageB.getByText(/1\/2 .*bereit/).first()).toBeVisible({
        timeout: 15_000,
      });

      const readyMembershipA = await getMembership(sessionB, sessionA.uid);
      expect(fieldBoolean(readyMembershipA, "ready")).toBe(true);

      await expectLastLeaguePersistence(pageA);
      await expectLastLeaguePersistence(pageB);

      await test.step("GM rejoin survives stale lastLeagueId and reload", async () => {
        await expectStaleLastLeagueRecoveryAndRejoin(pageA, teamNameA);
        const rejoinedMembershipA = await getMembership(sessionA, sessionA.uid);

        expect(fieldString(rejoinedMembershipA, "teamId")).toBe(teamIdA);
      });

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
      await expect(pageA.getByRole("heading", { name: "Firebase Adminrechte erforderlich" })).toBeVisible();
      await expect(pageA.getByText("Simulationssteuerung")).toHaveCount(0);
  });

  test("admin simulates a week once and keeps results and standings after reload", async ({ page }) => {
    test.skip(
      process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND !== "firebase",
      "Admin week E2E requires the Firebase emulator multiplayer seed.",
    );

    await test.step("Admin Login/Auth", async () => {
      await signInSeededAdmin(page);
    });
    const adminSession = await getFirebaseAuthSession(page);

    await test.step("Open league and verify ready state", async () => {
      await openAdminWeekLeague(page);
      await expectAdminWeekReadyForSimulation(page);
    });

    await test.step("Simulate week and show results/standings", async () => {
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: /Woche simulieren und abschließen/ }).click();
      await expectAdminWeekSimulatedState(page);
      const simulatedLeague = await getLeagueDocument(adminSession, ADMIN_WEEK_LEAGUE_ID);

      expect(fieldInteger(simulatedLeague, "currentWeek")).toBe(2);
      expect(fieldString(simulatedLeague, "weekStatus")).toBe("pre_week");
    });
    const snapshotBeforeReload = await getAdminWeekBrowserSnapshot(page);

    await test.step("Reload keeps results and standings unchanged", async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectAdminWeekSimulatedState(page);
      const reloadedLeague = await getLeagueDocument(adminSession, ADMIN_WEEK_LEAGUE_ID);

      expect(fieldInteger(reloadedLeague, "currentWeek")).toBe(2);
      expect(fieldString(reloadedLeague, "weekStatus")).toBe("pre_week");
      expect(await getAdminWeekBrowserSnapshot(page)).toEqual(snapshotBeforeReload);
    });

    await test.step("Duplicate simulation is blocked and reload remains stable", async () => {
      await expectDuplicateAdminWeekSimulationBlocked(page, adminSession);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectAdminWeekSimulatedState(page);
      expect(await getAdminWeekBrowserSnapshot(page)).toEqual(snapshotBeforeReload);
    });
  });

  test("admin simulation contract blocks invalid league data before running the engine", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND !== "firebase",
      "Admin simulation contract E2E requires the Firebase emulator multiplayer seed.",
    );

    await signInSeededAdmin(page);
    const adminSession = await getFirebaseAuthSession(page);

    for (const contractCase of [
      {
        code: "roster_missing",
        leagueId: ADMIN_MISSING_ROSTER_LEAGUE_ID,
        name: "missing roster",
      },
      {
        code: "depth_chart_invalid",
        leagueId: ADMIN_INVALID_DEPTH_LEAGUE_ID,
        name: "invalid depth chart",
      },
      {
        code: "team_missing",
        leagueId: ADMIN_BROKEN_SCHEDULE_LEAGUE_ID,
        name: "broken schedule",
      },
    ]) {
      await test.step(`${contractCase.name} blocks simulation`, async () => {
        await expectAdminWeekSimulationApiBlocked(
          page,
          adminSession,
          contractCase.leagueId,
          contractCase.code,
        );
      });
    }
  });

  test("online MVP navigation, coming soon routes and mobile dashboard stay usable", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND !== "firebase",
      "Online UX smoke requires the Firebase emulator multiplayer seed.",
    );

    await page.setViewportSize({ height: 900, width: 1280 });
    const browserErrors = collectBrowserErrors(page);

    await test.step("Login/Auth and desktop dashboard navigation", async () => {
      await signInSeededRejoinUser(page);
      await openLeagueDashboard(page, REJOIN_LEAGUE_ID, "Firebase GM Rejoin E2E League");
      await expectOnlineSidebarMvpScope(page);
      await expectDashboardButtonsHaveAccessibleNames(page);
      expect(browserErrors).toEqual([]);
    });

    for (const { feature, heading } of NON_MVP_COMING_SOON_FEATURES) {
      await test.step(`${feature} direct URL shows Coming Soon`, async () => {
        const response = await page.goto(
          `/online/league/${REJOIN_LEAGUE_ID}/coming-soon/${feature}`,
          {
            timeout: E2E_NAVIGATION_TIMEOUT_MS,
            waitUntil: "domcontentloaded",
          },
        );

        expect(response?.status()).toBeLessThan(400);
        await expect(page.getByRole("heading", { name: heading })).toBeVisible({
          timeout: 15_000,
        });
        await expect(page.getByText("Nicht Teil des aktuellen Multiplayer MVP.")).toBeVisible();
        await expect(page.getByRole("link", { name: "Zurück zum Dashboard" })).toBeVisible();
        expect(browserErrors).toEqual([]);
        browserErrors.length = 0;
      });
    }

    await test.step("Mobile dashboard loads without obvious layout break", async () => {
      await page.setViewportSize({ height: 844, width: 390 });
      await openLeagueDashboard(page, REJOIN_LEAGUE_ID, "Firebase GM Rejoin E2E League");
      await expectDashboardButtonsHaveAccessibleNames(page);
      await expectNoHorizontalOverflow(page);
      expect(browserErrors).toEqual([]);
    });
  });

  test("multiplayer subpages recover cleanly when the GM has no active team or a stale team link", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND !== "firebase",
      "Missing team subpage E2E requires the Firebase emulator multiplayer seed.",
    );

    await signInSeededStateUser(page);
    const browserErrors = collectBrowserErrors(page);

    const recoveryCases = [
      {
        expectedHeading:
          /Team-Zuordnung fehlt|Online-Liga konnte nicht geladen werden\.|Draft nicht verfügbar|Multiplayer-Bereich nicht verfügbar/,
        leagueId: NO_TEAM_LEAGUE_ID,
      },
      {
        expectedHeading:
          /Team-Zuordnung fehlt|Online-Liga konnte nicht geladen werden\.|Draft nicht verfügbar|Multiplayer-Bereich nicht verfügbar/,
        leagueId: STALE_TEAM_LEAGUE_ID,
      },
    ];

    for (const recoveryCase of recoveryCases) {
      for (const route of MULTIPLAYER_SUBPAGE_ROUTES) {
        await test.step(`${recoveryCase.leagueId}: ${route.label} shows team recovery`, async () => {
          await expectTeamRecoveryForDirectRoute(
            page,
            route.path(recoveryCase.leagueId),
            recoveryCase.expectedHeading,
          );
          expect(browserErrors).toEqual([]);
          browserErrors.length = 0;
        });
      }
    }
  });

  test("multiplayer subpages keep direct URL access stable when the GM has a team but no roster", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND !== "firebase",
      "No-roster subpage E2E requires the Firebase emulator multiplayer seed.",
    );

    await signInSeededStateUser(page);
    const browserErrors = collectBrowserErrors(page);

    for (const route of MULTIPLAYER_SUBPAGE_ROUTES.filter(
      (candidate) => candidate.label !== "Draft" && candidate.label !== "Coming Soon",
    )) {
      await test.step(`${route.label} shows the no-roster state without redirect loops`, async () => {
        await expectNoRosterDirectRoute(page, route.path(NO_ROSTER_LEAGUE_ID));
        expect(browserErrors).toEqual([]);
        browserErrors.length = 0;
      });
    }

    const comingSoonRoute = MULTIPLAYER_SUBPAGE_ROUTES.find(
      (candidate) => candidate.label === "Coming Soon",
    );
    expect(comingSoonRoute).toBeDefined();
    await test.step("Coming Soon remains a stable explanatory placeholder without redirect loops", async () => {
      await expectComingSoonDirectRoute(page, comingSoonRoute!.path(NO_ROSTER_LEAGUE_ID));
      expect(browserErrors).toEqual([]);
      browserErrors.length = 0;
    });

    const response = await page.goto(`/online/league/${NO_ROSTER_LEAGUE_ID}/draft`, {
      timeout: E2E_NAVIGATION_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Draft abgeschlossen" })).toBeVisible({
      timeout: 15_000,
    });
    expect(browserErrors).toEqual([]);
  });
});
