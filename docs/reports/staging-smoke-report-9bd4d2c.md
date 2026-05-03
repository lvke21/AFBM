# Staging Smoke Report - Target Commit 9bd4d2c

Datum: 2026-05-02

## Ziel

Staging QA darf nur gruen sein, wenn der Ziel-Commit frisch gegen die live
deployte Staging-App verifiziert wurde.

Ziel-Commit:

```text
9bd4d2cc604f28d699c1d3dc7ee0e1463f290665
```

## Smoke-Infrastruktur

Aktualisiert:

- `scripts/staging-admin-week-smoke.ts`
- `src/app/api/build-info/route.ts`
- `package.json`

Neue Regel:

- Der Staging-Smoke prueft vor Auth oder Week-Simulation `/api/build-info`.
- Der Smoke bricht rot ab, wenn der deployte Commit fehlt oder nicht zum
  erwarteten Commit passt.
- `npm run staging:smoke` ist ein Alias fuer `npm run staging:smoke:admin-week`.

## Gepruefte Live-Kommandos

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league --expected-commit 9bd4d2c
```

Ergebnis:

```text
[staging-smoke] baseUrl=https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app
[staging-smoke] leagueId=afbm-multiplayer-test-league
[staging-smoke] expectedCommit=9bd4d2c
[staging-smoke] mode=read-only-auth
[staging-smoke] failed: Staging commit check failed: /api/build-info returned HTTP 404. Deploy the target commit before running the smoke.
[staging-smoke] status=RED
```

Alias ebenfalls geprueft:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke -- --league-id afbm-multiplayer-test-league --expected-commit 9bd4d2c
```

Ergebnis:

```text
[staging-smoke] mode=simulate-week
[staging-smoke] failed: Staging commit check failed: /api/build-info returned HTTP 404. Deploy the target commit before running the smoke.
[staging-smoke] status=RED
```

## Nicht ausgefuehrte Checks

Diese Checks wurden bewusst nicht weiter ausgefuehrt, weil das Commit-Gate vor
Auth und Mutationen rot ist:

- Auth/Login
- League laden
- User-Team-Link
- Ready-State
- Admin Week Simulation
- Results/Standings Reload

Begruendung: Ein Smoke darf diese Flows nicht als gruen melden, solange nicht
nachgewiesen ist, dass Staging den Ziel-Commit bedient.

## Env-Variablen

Pflicht:

- `CONFIRM_STAGING_SMOKE=true`
- `GOOGLE_CLOUD_PROJECT=afbm-staging`
- `--expected-commit <sha>` oder `STAGING_EXPECTED_COMMIT=<sha>`

Auth-Optionen:

- `STAGING_FIREBASE_TEST_EMAIL`
- `STAGING_FIREBASE_TEST_PASSWORD`
- oder `E2E_FIREBASE_ADMIN_ID_TOKEN`
- oder IAM-Fallback ueber `gcloud iam service-accounts sign-jwt`

Build-Info fuer Staging:

- `AFBM_GIT_COMMIT`
- oder `GIT_COMMIT`
- oder `SOURCE_VERSION`
- oder `NEXT_PUBLIC_AFBM_GIT_COMMIT`

Mindestens eine dieser Commit-Variablen muss im App-Hosting-Build/Runtime-Kontext
gesetzt sein, damit `/api/build-info` den Ziel-Commit ausweisen kann.

## IAM-Anforderungen

Nur fuer den IAM-Fallback ohne Testlogin/ID-Token:

- Projekt: `afbm-staging`
- Service Account:
  `firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com`
- Permission: `iam.serviceAccounts.signJwt`
- Empfohlene Rolle:
  `roles/iam.serviceAccountTokenCreator` nur auf diesem Staging-Service-Account
- Identity Toolkit API aktiviert

## Fehlerfaelle

- `/api/build-info` fehlt oder liefert 404:
  Ziel-Commit ist nicht frisch verifizierbar. Staging bleibt No-Go.
- `/api/build-info` liefert keinen Commit:
  App Hosting setzt keine Commit-Env; Build-/Rollout-Konfiguration korrigieren.
- Deployter Commit weicht ab:
  falscher Staging-Stand, kein Smoke-Grün.
- Auth-Token fehlt:
  Testlogin, ID Token oder IAM-Fallback konfigurieren.
- IAM `signJwt` fehlt:
  gezielt `roles/iam.serviceAccountTokenCreator` fuer Staging-Service-Account setzen.

## Statische Checks

| Command | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |

## Entscheidung

Staging: **No-Go**

Grund: Der live deployte Staging-Stand konnte nicht als Ziel-Commit
`9bd4d2c` verifiziert werden. `/api/build-info` ist auf Staging noch nicht
verfuegbar.

Naechster sicherer Schritt:

1. Aktuellen Stand committen.
2. Staging mit diesem Commit deployen.
3. App Hosting so konfigurieren, dass eine Commit-Env wie `AFBM_GIT_COMMIT`
   gesetzt ist.
4. Danach erneut ausfuehren:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit <release-sha>
```
