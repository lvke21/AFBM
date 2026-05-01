# Firebase App Hosting Setup

Status: Staging/Preview-Setup. Kein Production-Go-Live ohne separate Production-Secret-Matrix.

## Ziel

Diese Anleitung beschreibt, wie die bestehende Next.js-App fuer Firebase App Hosting in Staging betrieben wird. Production nutzt dieselben Secret-Regeln, braucht aber eine eigene Freigabe und `AFBM_DEPLOY_ENV=production`.

## Grundsatz

- `AFBM_DEPLOY_ENV=staging`.
- Keine Prisma-Entfernung.
- removed session and provider login ist entfernt; Online nutzt Firebase Anonymous Auth, Admin nutzt Code-Login.
- Keine Firestore-Production-Aktivierung ohne separates Flag.
- Kein Deployment ohne explizite Freigabe.

## Voraussetzungen

- Git-Repository mit sauberem Baseline-Commit.
- Dediziertes Firebase-Staging-Projekt.
- Firebase App Hosting Backend im Firebase Console Flow.
- Firebase Auth Custom Claim fuer Admin-User.

## App Hosting Konfiguration

Die Root-Datei `apphosting.yaml` ist bewusst staging-orientiert:

- konservative Cloud-Run-Ressourcen
- `AFBM_DEPLOY_ENV=staging`
- `DATA_BACKEND=firestore`
- Adminzugriff ueber Firebase Auth Custom Claim
- Secret-Referenzen fuer Firebase Admin SDK, falls Firestore Admin SDK genutzt wird
- keine Emulator- oder Preview-Flags

App Hosting sollte die Next.js-Adapter verwenden. Deshalb werden Build- und Run-Commands nicht in `apphosting.yaml` ueberschrieben.

Erwartetes Build-Verhalten:

- Install: App Hosting installiert Dependencies aus `package-lock.json`.
- Postinstall: `prisma generate`
- Build: `npm run build`
- Runtime: App Hosting startet die Next.js-App ueber den Framework-Adapter.

## Benoetigte ENV

In `apphosting.yaml` gesetzt:

- `AFBM_DEPLOY_ENV=staging`
- `NEXT_PUBLIC_AFBM_DEPLOY_ENV=staging`
- `DATA_BACKEND=firestore`
- `AFBM_ONLINE_BACKEND=firebase`
- `NEXT_PUBLIC_AFBM_ONLINE_BACKEND=firebase`
- `FIREBASE_PROJECT_ID=afbm-staging`
- Firebase Admin SDK nutzt in App Hosting die Default Credentials des Runtime-Service-Accounts.
- `NEXT_PUBLIC_FIREBASE_*` als oeffentliche Staging-Web-App-Konfiguration, nicht als Secret.

Diese Legacy-Variablen duerfen nicht gesetzt werden:

- `OLD_SESSION_URL`
- `NEXTOLD_SESSION_URL`
- `OLD_SESSION_KEY`
- `OLD_GH_PROVIDER_ID`
- `OLD_GH_PROVIDER_KEY`
- `OLD_GH_APP_ID`
- `OLD_GH_APP_KEY`
- `OLD_PUBLIC_LOGIN_FLAG`

## Prisma/PostgreSQL

App Hosting braucht im Staging-Firestore-Pfad keine PostgreSQL-Datenbank.

Pflichten:

- `DATABASE_URL` nicht in `apphosting.yaml` setzen, solange `DATA_BACKEND=firestore` aktiv ist.
- Prisma/PostgreSQL bleibt nur als lokale Legacy- und E2E-Fallback-Infrastruktur erhalten.

Wichtig: Dieses Setup startet keine Migration automatisch.

## Firebase/Firestore

Firestore bleibt strikt auf Staging begrenzt:

- `AFBM_DEPLOY_ENV=staging`
- `DATA_BACKEND=firestore`
- keine `FIRESTORE_EMULATOR_HOST` Variable im Hosting
- keine `FIRESTORE_PREVIEW_DRY_RUN=true` Variable im Hosting
- keine `demo-*` Projekt-ID
- keine Production-Projekt-ID

Damit greifen die Runtime- und Firestore-Guards gegen versehentliche Emulator-/Production-Vermischung.

## Staging Rollout

1. Firebase-Staging-Projekt erstellen.
2. App Hosting Backend im Firebase Console Flow erstellen.
3. GitHub Repository und Branch verbinden.
4. Admin-Claim fuer berechtigte UID setzen.
5. Ersten Rollout manuell freigeben.
6. Smoke-Test:
   - App laedt.
   - Online Spielen oeffnet keinen external provider auth-Flow.
   - Adminbereich funktioniert nach normalem Firebase Login mit `admin: true`.
   - SaveGame-Liste laedt.
   - Dashboard laedt.
   - Prepare Week / Match Flow laeuft gegen Firestore.
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
- Admin Login Fehler
- Datenbankverbindung instabil
- unerwarteter Firestore-Zugriff
- stark erhoehte Latenz im Week Loop

## Offene Risiken

- Next.js-Version ist neuer als die konservativ dokumentierten aktiven App-Hosting-Versionen und muss im Staging real validiert werden.
- Prisma benoetigt eine stabile PostgreSQL-Verbindung in der Hosting-Umgebung.
- Server Actions fuehren echte Prisma-Writes aus; Staging darf keine Production-Datenbank verwenden.
