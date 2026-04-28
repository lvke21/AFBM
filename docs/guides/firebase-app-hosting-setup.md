# Firebase App Hosting Setup

Status: Vorbereitung nur fuer Staging/Preview. Kein Production-Go-Live.

## Ziel

Diese Anleitung beschreibt, wie die bestehende Next.js-App fuer Firebase App Hosting vorbereitet werden kann, ohne Firestore als produktiven Datenpfad zu aktivieren. Prisma/PostgreSQL bleibt der aktive Backend-Pfad.

## Grundsatz

- `DATA_BACKEND` bleibt `prisma`.
- Keine Prisma-Entfernung.
- Keine Auth-Umstellung.
- Keine Firestore-Production-Aktivierung.
- Kein Deployment ohne explizite Freigabe.

## Voraussetzungen

- Git-Repository mit sauberem Baseline-Commit.
- Dediziertes Firebase-Staging-Projekt.
- Firebase App Hosting Backend im Firebase Console Flow.
- Externe oder gemanagte PostgreSQL-Datenbank fuer Staging.
- GitHub OAuth App fuer die Staging-URL.
- Cloud Secret Manager Secrets fuer Datenbank und Auth.

## App Hosting Konfiguration

Die Root-Datei `apphosting.yaml` ist bewusst staging-orientiert:

- konservative Cloud-Run-Ressourcen
- `DATA_BACKEND=prisma`
- Secret-Referenzen fuer Datenbank und Auth
- Firestore-Logging deaktiviert
- keine Firebase Admin Credentials
- keine `FIRESTORE_PREVIEW_DRY_RUN` Aktivierung

App Hosting sollte die Next.js-Adapter verwenden. Deshalb werden Build- und Run-Commands nicht in `apphosting.yaml` ueberschrieben.

Erwartetes Build-Verhalten:

- Install: App Hosting installiert Dependencies aus `package-lock.json`.
- Postinstall: `prisma generate`
- Build: `npm run build`
- Runtime: App Hosting startet die Next.js-App ueber den Framework-Adapter.

## Benoetigte Secrets

In Cloud Secret Manager fuer das Staging-Projekt anlegen:

- `afbm-staging-database-url`
- `afbm-staging-auth-secret`
- `afbm-staging-auth-github-id`
- `afbm-staging-auth-github-secret`

Die App-Hosting-Service-Accounts muessen Zugriff auf diese Secrets erhalten.

## Benoetigte ENV

In `apphosting.yaml` gesetzt:

- `DATA_BACKEND=prisma`
- `DATABASE_URL` aus Secret
- `AUTH_SECRET` aus Secret
- `AUTH_GITHUB_ID` aus Secret
- `AUTH_GITHUB_SECRET` aus Secret
- `AFBM_FIRESTORE_OPERATION_LOG=false`
- `FIRESTORE_USAGE_LOGGING=false`

Nach Erstellen des Backends pruefen, ob fuer Auth.js zusaetzlich eine feste Canonical URL benoetigt wird:

- `AUTH_URL=https://<staging-backend-id>--<project-id>.<region>.hosted.app`

Falls gesetzt, muss die URL zur GitHub OAuth Callback-URL passen.

## GitHub OAuth

Fuer Staging eine eigene GitHub OAuth App verwenden.

Callback:

```text
https://<staging-host>/api/auth/callback/github
```

Dev-Credentials duerfen in Production/Staging nicht aktiviert werden:

- `AUTH_DEV_ENABLED` nicht setzen oder `false`
- `E2E_AUTH_BYPASS` nicht setzen oder `false`

## Prisma/PostgreSQL

App Hosting braucht zur Laufzeit eine erreichbare PostgreSQL-Datenbank.

Pflichten:

- `DATABASE_URL` als Secret, nicht im Repo.
- Datenbank vor Rollout migrieren.
- Connection Limits der Datenbank pruefen.
- Rollback-Plan fuer DB-Schema-Aenderungen separat definieren.

Wichtig: Dieses Setup startet keine Migration automatisch.

## Firebase/Firestore

Firestore bleibt fuer die App deaktiviert:

- `DATA_BACKEND=prisma`
- keine `FIRESTORE_EMULATOR_HOST` Variable im Hosting
- keine `FIRESTORE_PREVIEW_DRY_RUN=true` Variable im Hosting
- keine Firebase Admin Service Account Secrets im Hosting

Damit greifen die bestehenden Firestore-Guards weiterhin gegen versehentliche Nicht-Emulator-Nutzung.

## Staging Rollout

1. Firebase-Staging-Projekt erstellen.
2. App Hosting Backend im Firebase Console Flow erstellen.
3. GitHub Repository und Branch verbinden.
4. Secrets im Staging-Projekt anlegen.
5. Secret-Zugriff fuer App Hosting Service Accounts vergeben.
6. Staging-Postgres bereitstellen und `DATABASE_URL` als Secret setzen.
7. GitHub OAuth Callback fuer Staging setzen.
8. Ersten Rollout manuell freigeben.
9. Smoke-Test:
   - App laedt.
   - Auth Login funktioniert.
   - SaveGame-Liste laedt.
   - Dashboard laedt.
   - Prepare Week / Match Flow laeuft gegen Prisma.
   - Logs enthalten keinen Firestore-Production-Zugriff.

## Rollback

Rollback erfolgt ueber App Hosting Rollout-Historie:

1. Letzte funktionierende Revision in Firebase App Hosting auswaehlen.
2. Rollback ausloesen.
3. Logs pruefen.
4. Datenbank nicht automatisch zuruecksetzen.
5. Bei Dateninkonsistenz Prisma/Postgres-Snapshot separat wiederherstellen.

Rollback-Kriterium:

- 500er im Core-Flow
- Auth Callback Fehler
- Datenbankverbindung instabil
- unerwarteter Firestore-Zugriff
- stark erhoehte Latenz im Week Loop

## Offene Risiken

- Next.js-Version ist neuer als die konservativ dokumentierten aktiven App-Hosting-Versionen und muss im Staging real validiert werden.
- Prisma benoetigt eine stabile PostgreSQL-Verbindung in der Hosting-Umgebung.
- Auth.js OAuth braucht korrekte Host-/Callback-Konfiguration.
- Server Actions fuehren echte Prisma-Writes aus; Staging darf keine Production-Datenbank verwenden.
