# Firebase Preview/Staging Setup

Status: Vorbereitung, kein Production-Go-Live

## Ziel

Ein separates Firebase Preview/Staging-Projekt so vorbereiten, dass Firestore Rules/Indexes und ein kontrollierter Backfill/Compare-Dry-Run getestet werden koennen, ohne Production zu aktivieren.

## Sicherheitsregeln

- Production bleibt No-Go.
- `DATA_BACKEND=firestore` nicht in Production setzen.
- Keine echten Nutzerdaten verwenden.
- Prisma nicht entfernen.
- Auth nicht umstellen.
- Seed/Reset/Verify duerfen niemals gegen Preview, Staging oder Production laufen.
- Backfill/Compare gegen Staging nur mit `FIRESTORE_PREVIEW_DRY_RUN=true` und allowlisteter Projekt-ID.
- Service Account Keys nur als Secret speichern, nie committen.

## Firebase Projekt Erstellen

1. In der Firebase Console ein neues Projekt erstellen.
2. Einen eindeutigen Staging-Namen waehlen, z.B. `afbm-staging`.
3. Keine Production-Projekt-ID verwenden.
4. Firestore aktivieren.
5. Region bewusst waehlen und dokumentieren.
6. Web-App registrieren, falls ein Preview-App-Deploy spaeter getestet wird.

## Projekt-ID Festlegen

In der lokalen oder CI-Umgebung:

```bash
FIREBASE_STAGING_PROJECT_ID="replace-with-afbm-staging-project-id"
FIREBASE_PROJECT_ID="$FIREBASE_STAGING_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="$FIREBASE_STAGING_PROJECT_ID"
FIRESTORE_PREVIEW_DRY_RUN=true
FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS="$FIREBASE_STAGING_PROJECT_ID"
```

Production-Schutz:

```bash
FIREBASE_PRODUCTION_PROJECT_ID="replace-with-production-project-id-if-known"
```

## Firebase Alias Einrichten

Aus `.firebaserc.example` eine lokale `.firebaserc` erstellen:

```json
{
  "projects": {
    "staging": "replace-with-afbm-staging-project-id"
  }
}
```

`.firebaserc` darf nur eine Staging-ID enthalten, wenn diese im Projekt bewusst freigegeben wurde. Keine echte Production-ID eintragen.

## Authentifizierung

Lokal:

```bash
firebase login
firebase use staging
```

CI:

- Workload Identity oder Secret-basierten Service Account verwenden.
- `FIREBASE_CLIENT_EMAIL` und `FIREBASE_PRIVATE_KEY` nur im Secret Store setzen.
- Keine Service Account JSON-Datei committen.
- Least-Privilege Rollen verwenden.

## Rules/Indexes Deploy Gegen Staging

Nur nach expliziter Freigabe:

```bash
npm run firebase:staging:use
npm run firebase:staging:deploy:rules
npm run firebase:staging:deploy:indexes
```

Alternativ direkt:

```bash
firebase deploy --only firestore:rules -P staging
firebase deploy --only firestore:indexes -P staging
```

Kein `firebase deploy` ohne `--only`.

## Backfill/Compare Dry Run

Backfill nach Staging ist nur erlaubt, wenn alle Bedingungen erfuellt sind:

- `FIRESTORE_PREVIEW_DRY_RUN=true`
- `FIREBASE_PROJECT_ID` steht in `FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS`
- `NODE_ENV` ist nicht `production`
- Projekt-ID ist nicht production-like
- `FIRESTORE_PREVIEW_CONFIRM_WRITE=true`

Sicherer Backfill ohne destructive Deletes:

```bash
npm run firebase:staging:backfill
```

Compare:

```bash
npm run firebase:staging:compare
```

Destructive Deletes gegen Preview sind standardmaessig blockiert. Nur nach separater, schriftlicher Freigabe:

```bash
FIRESTORE_PREVIEW_CONFIRM_DELETE=true FIRESTORE_PREVIEW_DRY_RUN=true FIRESTORE_PREVIEW_CONFIRM_WRITE=true tsx scripts/firestore-backfill.ts
```

Seed/Reset/Verify bleiben Emulator-only:

```bash
npm run firebase:seed
npm run firebase:reset
npm run firebase:verify
```

Diese Befehle duerfen nicht fuer Staging verwendet werden.

## Logging Fuer Dry Run

```bash
FIRESTORE_USAGE_LOGGING=true
AFBM_FIRESTORE_OPERATION_LOG=true
AFBM_PERFORMANCE_LOG=true
```

Pruefen:

- Permission Denied
- Repository Errors
- Write Failures
- State Transition Failures
- ungewoehnlich hohe Reads/Writes
- Latenz
- Backfill-/Compare-Abweichungen
- unerwarteter Prisma-Fallback

## Stop-Kriterien

Sofort stoppen bei:

- Critical Compare Difference
- Write Failure
- Permission Denied
- `DATA_BACKEND` Fehlkonfiguration
- unerwartetem Prisma-Fallback
- Projekt-ID nicht allowlisted
- Production-like Projekt-ID

## Production Bleibt No-Go

Diese Anleitung bereitet nur Preview/Staging vor. Sie ist keine Freigabe fuer:

- Production Firestore Runtime
- Prisma-Removal
- Auth-Migration
- echte Userdaten
- breiten Nutzertraffic
