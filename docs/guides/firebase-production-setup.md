# Firebase Production Setup Guide

Status: Vorbereitung, keine Aktivierung des produktiven Firestore-Datenpfads.

## Grundsatz

Firebase darf fuer Production vorbereitet werden, aber das Spiel nutzt weiterhin Prisma als aktiven Datenpfad.

- `DATA_BACKEND` bleibt leer oder `prisma`.
- `DATA_BACKEND=firestore` bleibt fuer Production blockiert.
- Keine Prisma-Entfernung.
- removed session and provider login ist entfernt; Online nutzt Firebase Anonymous Auth, Admin nutzt Code-Login.
- Keine Seeds, Resets oder Migrationen gegen Production Firestore.

## Production ENV

Diese Werte koennen in der Hosting-/Runtime-Umgebung vorbereitet werden:

```env
AFBM_DEPLOY_ENV="production"
NEXT_PUBLIC_AFBM_DEPLOY_ENV="production"
DATA_BACKEND="prisma"
AFBM_ONLINE_BACKEND="firebase"
NEXT_PUBLIC_AFBM_ONLINE_BACKEND="firebase"

DATABASE_URL="<secret-store>"

NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-production-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-production-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

FIREBASE_PROJECT_ID="your-production-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-production-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Diese Werte duerfen in Production nicht gesetzt werden:

```env
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
DATA_BACKEND="firestore"
OLD_SESSION_URL="https://example.invalid"
NEXTOLD_SESSION_URL="https://example.invalid"
OLD_SESSION_KEY="<legacy-authjs-secret>"
OLD_GH_PROVIDER_ID="<legacy-github-client-id>"
OLD_GH_PROVIDER_KEY="<legacy-github-client-secret>"
OLD_GH_APP_ID="<legacy-github-client-id>"
OLD_GH_APP_KEY="<legacy-github-client-secret>"
OLD_PUBLIC_LOGIN_FLAG="anything"
FIRESTORE_PREVIEW_DRY_RUN="true"
FIRESTORE_CLOUD_SEED_CONFIRM="true"
```

Production verweigert Build/Start ueber `next.config.ts`, wenn kritische Secrets fehlen,
Emulator-/Debug-Flags gesetzt sind, lokale Online-Backends aktiv sind oder Demo-Projekte
verwendet werden.

## Firebase Console Schritte

1. Firebase Projekt erstellen
   - Neues Projekt fuer Production anlegen.
   - Keine Demo-Projekt-ID mit Prefix `demo-` verwenden.

2. Firestore aktivieren
   - Cloud Firestore im Firebase Projekt aktivieren.
   - Native Mode verwenden.
   - Noch keine App-Daten importieren.

3. Region waehlen
   - Region bewusst festlegen, passend zu Hosting, Datenschutz und Latenz.
   - Region nach Aktivierung nur schwer bzw. nicht frei aenderbar behandeln.

4. Web-App registrieren
   - Firebase Web-App im Projekt anlegen.
   - Web-Konfiguration in die `NEXT_PUBLIC_FIREBASE_*` ENV-Werte uebertragen.

5. Service Account erzeugen
   - Firebase Admin SDK Service Account erzeugen.
   - `client_email` als `FIREBASE_CLIENT_EMAIL` setzen.
   - `private_key` als `FIREBASE_PRIVATE_KEY` setzen, Newlines als `\n` erhalten.
   - Secret nur in der Server-/Hosting-Secret-Verwaltung speichern, nicht ins Repository schreiben.

6. ENV setzen
   - `DATA_BACKEND="prisma"` setzen oder `DATA_BACKEND` leer lassen.
   - `AFBM_DEPLOY_ENV="production"` setzen.
   - `AFBM_ONLINE_BACKEND="firebase"` und `NEXT_PUBLIC_AFBM_ONLINE_BACKEND="firebase"` setzen.
   - `DATABASE_URL` aus dem Secret Store setzen.
   - Adminzugriff per Firebase Auth Custom Claim vergeben.
   - Keine removed session and provider login-Variablen setzen.
   - Keine Emulator-Host-Variablen in Production setzen.
   - Deployment erst starten, wenn Secret-Werte vollstaendig sind.

## Bestehende Projektdateien

- `firebase.json` definiert nur lokale Emulator-Ports und verweist auf Rules/Indexes.
- `firestore.rules` ist deny-by-default fuer unbekannte Pfade und verbietet Client-Writes.
- `firestore.indexes.json` enthaelt Query-Indexdefinitionen, aktiviert aber keinen App-Datenpfad.
- `src/lib/firebase/client.ts` liest nur die Firebase Web-App ENV.
- `src/lib/firebase/admin.ts` verlangt ausserhalb des Emulators Admin Credentials.
- `src/server/repositories/firestoreGuard.ts` blockiert `DATA_BACKEND=firestore`, wenn kein Emulator-Host und kein `demo-*` Projekt gesetzt sind.
- `src/lib/env/runtime-env.ts` blockiert unsichere Production-Starts zentral.

## Seed, Reset und Verify

Die lokalen Firestore Fixture-Scripts bleiben Emulator-only:

- `npm run firebase:emulators` startet `--project demo-afbm`.
- `npm run firebase:seed` setzt lokale Defaults fuer `demo-afbm` und `127.0.0.1:8080`.
- `npm run firebase:reset` nutzt dieselbe Seed-/Emulator-Guard.
- `npm run firebase:verify` prueft nur das lokale Fixture-Modell.

Nie gegen Production ausfuehren:

```bash
npm run firebase:seed
npm run firebase:reset
npm run firebase:verify
```

Diese Scripts verweigern Nicht-Demo-Projekte. Trotzdem gilt: In Production keine Emulator-Variablen setzen und keine Fixture-Kommandos ausfuehren.

## Aktivierungs-Gate fuer Firestore Production

Vor einer spaeteren Aktivierung muessen separat erledigt werden:

- Produktive Firestore-Datenmigration geplant, getestet und reviewed.
- Backfill-/Rollback-Strategie dokumentiert.
- Security Rules gegen echte Auth-Claims validiert.
- Read-/Write-Kosten und Indexbedarf geprueft.
- `firestoreGuard` bewusst angepasst, damit Production-Firestore explizit und kontrolliert erlaubt ist.
- Release-Flag oder Betriebsfreigabe fuer `DATA_BACKEND=firestore` definiert.

Bis dahin gilt:

**Production Firestore ist vorbereitet, aber nicht aktiv. Prisma bleibt der Datenpfad.**
