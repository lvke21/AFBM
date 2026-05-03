# Staging Auth Smoke Gate

## Ziel

Der Staging-Smoke prueft reproduzierbar mit echtem Firebase Login, ob der Live-Stand fuer `afbm-staging` authentifizierte Multiplayer-Flows laden kann. Der neue Auth-Smoke ist read-only und fuehrt keine Admin-Mutation aus.

## Smoke-Command

```bash
CONFIRM_STAGING_SMOKE=true \
STAGING_FIREBASE_TEST_EMAIL=<admin-test-email> \
STAGING_FIREBASE_TEST_PASSWORD=<admin-test-password> \
npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league
```

Alternative mit vorhandenem Firebase ID Token:

```bash
CONFIRM_STAGING_SMOKE=true \
E2E_FIREBASE_ADMIN_ID_TOKEN=<real-firebase-id-token> \
npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league
```

IAM-Fallback ohne manuelle Token-Kopie:

```bash
CONFIRM_STAGING_SMOKE=true \
GOOGLE_CLOUD_PROJECT=afbm-staging \
npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league
```

## Gepruefte Punkte

- Firebase Login oder ID-Token-Aufnahme funktioniert.
- Admin API akzeptiert den Bearer Token fuer `listLeagues`.
- Liga `afbm-multiplayer-test-league` wird ueber `getLeague` geladen.
- Der authentifizierte User ist als Membership in der Liga vorhanden.
- Die Membership enthaelt eine `teamId`.
- Das Team existiert in der Liga.
- Falls `team.assignedUserId` gesetzt ist, muss sie zur authentifizierten UID passen.

## Ergebnislogik

- Gruen: Script endet mit Exit-Code `0` und loggt `[staging-smoke] status=GREEN`.
- Rot: Script endet mit Exit-Code `1` und loggt `[staging-smoke] status=RED` inklusive konkreter Ursache.
- Der read-only Smoke schreibt keine Ready-States, simuliert keine Woche und veraendert keine Firestore-Daten.

## Benoetigte Konfiguration

Pflicht:

- `CONFIRM_STAGING_SMOKE=true`
- Staging League ID, normalerweise `afbm-multiplayer-test-league`

Bevorzugter Auth-Weg:

- `STAGING_FIREBASE_TEST_EMAIL`
- `STAGING_FIREBASE_TEST_PASSWORD`

Alternativer Token-Weg:

- `E2E_FIREBASE_ADMIN_ID_TOKEN`

IAM-Fallback:

- `GOOGLE_CLOUD_PROJECT=afbm-staging`
- Lokale ADC/gcloud Auth fuer die verwendete Identitaet
- Zugriff auf `firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com`
- Berechtigung `iam.serviceAccounts.signJwt`
- Empfohlene Rolle: `roles/iam.serviceAccountTokenCreator` nur auf dem Staging-Service-Account
- Identity Toolkit API im Projekt `afbm-staging` aktiviert

## N118: IAM signJwt Blocker

Wenn weder Email/Passwort noch `E2E_FIREBASE_ADMIN_ID_TOKEN` gesetzt sind, erzeugt das Script ein kurzlebiges Firebase Custom Token ueber `gcloud iam service-accounts sign-jwt`. Dieser Weg kann an IAM scheitern.

Sicherer Fix:

```bash
gcloud config set project afbm-staging
gcloud auth application-default login
gcloud auth application-default set-quota-project afbm-staging
gcloud services enable identitytoolkit.googleapis.com --project afbm-staging
gcloud iam service-accounts add-iam-policy-binding \
  firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com \
  --project=afbm-staging \
  --member=user:lukas.haenzi@gmail.com \
  --role=roles/iam.serviceAccountTokenCreator
```

## Sicherheitsregeln

- Keine Secrets in Git, Reports oder Logs schreiben.
- Keine Production-Projekte verwenden.
- Keine Seeds oder Reset-Scripts in diesem Smoke ausfuehren.
- `--base-url` wird auf HTTPS App Hosting URLs mit `afbm-staging` und `hosted.app` begrenzt.
- Der Auth-Smoke ist read-only; fuer schreibende Week-Simulation bleibt `npm run staging:smoke:admin-week` getrennt.

## Aktueller Live-Lauf

Datum: 2026-05-02

Command:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league
```

Ergebnis:

- Token-Quelle: IAM sign-jwt Custom Token
- Admin API `listLeagues`: erfolgreich
- Liga `afbm-multiplayer-test-league`: erfolgreich geladen
- Aktuelle Woche: 5
- Teams: 8
- Memberships/User: 2
- Schedule-Eintraege: 28
- Authentifizierter User: Team `basel-rhinos`
- Team-Zuordnung: `assignedUserId` passt zur authentifizierten UID
- Status: GREEN

## Commit-Gate Update 2026-05-02

Staging-Smoke ist ab jetzt nur noch gruen, wenn der deployte Staging-Stand den
erwarteten Commit ueber `/api/build-info` ausweist.

Neuer Ziel-Commit fuer diese Pruefung:

```text
9bd4d2cc604f28d699c1d3dc7ee0e1463f290665
```

Ausgefuehrter Command:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league --expected-commit 9bd4d2c
```

Ergebnis:

- Status: RED
- Ursache: `/api/build-info` lieferte HTTP 404 auf Staging.
- Konsequenz: Auth/Login, League Load, User-Team-Link, Ready-State,
  Admin-Week-Simulation und Results/Standings Reload wurden fuer diesen
  Ziel-Commit nicht als frisch verifiziert gewertet.

Aktuelle Entscheidung: **Staging No-Go**, bis der Ziel-Commit deployed ist und
`/api/build-info` den erwarteten Commit ausweist.
