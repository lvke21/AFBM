# Firebase App Hosting Readiness Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Status: Gruen fuer Staging-Vorbereitung, kein Production-Go-Live

## Executive Summary

Die bestehende Next.js-App kann sicher fuer Firebase App Hosting vorbereitet werden, solange der erste Rollout strikt als Staging/Preview erfolgt und `DATA_BACKEND=prisma` aktiv bleibt.

Es wurde kein Deployment ausgefuehrt, keine Firebase-Production-Aktivierung vorgenommen, keine Prisma-Entfernung umgesetzt und kein Firestore-Datenpfad aktiviert.

Neu erstellt:

- `apphosting.yaml`
- `docs/guides/firebase-app-hosting-setup.md`

Lokale Validierung ist gruen:

- `npm install`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Quellenbasis

Firebase App Hosting unterstuetzt Next.js-Apps und nutzt Framework-Adapter, die mit den Default-Build-Skripten arbeiten. Firebase dokumentiert ausserdem `apphosting.yaml` fuer Run-Konfiguration, ENV und Secret-Referenzen sowie environment-spezifische YAML-Dateien.

Referenzen:

- https://firebase.google.com/docs/app-hosting/configure
- https://firebase.google.com/docs/app-hosting/frameworks-tooling
- https://firebase.google.com/docs/app-hosting/multiple-environments

## Analyse

### package.json

Relevante Scripts:

- `build`: `next build`
- `start`: `next start`
- `postinstall`: `prisma generate`
- `lint`: `eslint .`

Bewertung:

- App Hosting kann den Next.js-Adapter mit dem vorhandenen `npm run build` nutzen.
- Kein Custom Build-/Run-Command wurde gesetzt, damit die Firebase Framework-Optimierungen nicht umgangen werden.
- `postinstall` generiert Prisma Client und lief lokal erfolgreich.

### next.config.ts

Aktuell:

- `reactStrictMode: true`

Bewertung:

- Minimal und kompatibel.
- Lokaler Build meldete eine Warnung, weil ausserhalb des Projekts eine weitere Lockfile unter `/Users/lukashanzi/package-lock.json` existiert. In App Hosting sollte der Git-Repository-Root massgeblich sein; im Staging-Build muss trotzdem geprueft werden, dass die Tracing-Root korrekt ist.

### apphosting.yaml

Neu erstellt.

Bewusste Entscheidungen:

- `DATA_BACKEND=prisma`
- Secrets fuer `DATABASE_URL`, `OLD_SESSION_KEY`, `OLD_GH_PROVIDER_ID`, `OLD_GH_PROVIDER_KEY`
- keine Firebase Admin Credentials
- keine `FIRESTORE_PREVIEW_DRY_RUN=true`
- keine `FIRESTORE_EMULATOR_HOST`
- keine Build-/Run-Command-Overrides

### ENV-Abhaengigkeiten

Erforderlich fuer Staging:

- `DATABASE_URL`
- `OLD_SESSION_KEY`
- `OLD_GH_PROVIDER_ID`
- `OLD_GH_PROVIDER_KEY`
- optional nach Backend-Erstellung: `OLD_SESSION_URL`
- `DATA_BACKEND=prisma`

Nicht fuer Staging-Hosting setzen:

- `FIRESTORE_EMULATOR_HOST`
- `FIREBASE_EMULATOR_HOST`
- `FIRESTORE_PREVIEW_DRY_RUN=true`
- `FIRESTORE_PREVIEW_CONFIRM_WRITE=true`
- Firebase Admin Service Account Secrets, solange Firestore nicht freigegeben ist

### Prisma/PostgreSQL

Die App ist fuer den aktiven Produktpfad weiterhin Prisma/PostgreSQL-abhaengig.

Risiken:

- `DATABASE_URL` muss als Secret verfuegbar sein.
- App Hosting Runtime muss die Datenbank erreichen koennen.
- Staging darf niemals auf eine Production-Datenbank zeigen.
- Migrationen werden nicht automatisch gestartet und muessen separat kontrolliert werden.
- Connection-Limits der Datenbank muessen gegen Cloud-Run-Skalierung geprueft werden.

### legacy session system / legacy session library

Konfiguration:

- PrismaAdapter aktiv.
- GitHub external provider nur aktiv, wenn `OLD_GH_PROVIDER_ID` und `OLD_GH_PROVIDER_KEY` gesetzt sind.
- Dev-Credentials sind nur ausserhalb von Production aktivierbar.
- `trustHost: true` ist gesetzt.

Risiken:

- Ohne GitHub external provider wird die App auf Setup Required umleiten.
- GitHub external provider auth Callback muss exakt zur Staging-URL passen.
- `OLD_SESSION_KEY` ist zwingend als Secret zu setzen.
- `OLD_SESSION_URL` sollte nach Erstellen des App-Hosting-Backends geprueft und bei Bedarf gesetzt werden.

### Firebase Admin / Firestore

Firebase Admin ist im Code vorhanden, aber der aktive Repository-Pfad bleibt Prisma.

Guardrails:

- `DATA_BACKEND` defaultet auf Prisma.
- `DATA_BACKEND=firestore` wird ausserhalb Emulator/Preview-Guard blockiert.
- Preview-Guard blockiert `NODE_ENV=production`.
- Firestore Seed/Reset/Verify bleiben Emulator-orientiert.

Bewertung:

- Keine Firestore-Production-Aktivierung durch App Hosting Vorbereitung.
- Firestore-ENV sollte im Hosting bewusst nicht gesetzt werden.

## App-Hosting-Plan

### Rollout-Reihenfolge

1. Lokal: Build und Tests gruen halten.
2. Firebase Staging-Projekt erstellen.
3. GitHub Remote/Repository verbinden.
4. App Hosting Backend im Staging-Projekt erstellen.
5. Secrets im Staging-Projekt anlegen.
6. App Hosting Service Account Zugriff auf Secrets geben.
7. Staging-Datenbank bereitstellen.
8. GitHub external provider auth Callback fuer Staging setzen.
9. Ersten Rollout manuell pruefen.
10. Erst nach Staging-Erfolg ueber Production-Readiness entscheiden.

### Benoetigte Secrets

- `afbm-staging-database-url`
- `afbm-staging-auth-secret`
- `afbm-staging-auth-github-id`
- `afbm-staging-auth-github-secret`

### Build

Erwartet:

- Install aus `package-lock.json`
- `postinstall` -> `prisma generate`
- `npm run build`

### Startverhalten

Kein eigener `runCommand` in `apphosting.yaml`.

Grund:

- Firebase App Hosting soll die Next.js Framework-Adapter verwenden.

### Rollback

Rollback ueber App Hosting Rollout-Historie:

- letzte funktionierende Revision wieder aktivieren
- Logs pruefen
- Datenbank-Snapshot separat behandeln
- `DATA_BACKEND` bleibt `prisma`
- bei unerwartetem Firestore-Zugriff Rollout sofort stoppen

## Testergebnisse

| Check | Ergebnis | Hinweis |
| --- | --- | --- |
| `npm install` | Gruen | Prisma Client v6.15.0 generiert |
| `npx tsc --noEmit` | Gruen | Keine TypeScript-Fehler |
| `npm run lint` | Gruen | Keine ESLint-Fehler |
| `npm run build` | Gruen | Next Production Build erfolgreich |

Build-Hinweis:

- Next.js warnte lokal vor einer zusaetzlichen Lockfile ausserhalb des Projekts. Das ist ein lokaler Workspace-Hinweis und kein Build-Abbruch, sollte aber im Staging-Cloud-Build kontrolliert werden.

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| App Hosting geeignet? | Ja, fuer Staging-Vorbereitung |
| Build lokal gruen? | Ja |
| ENV/Secrets vollstaendig dokumentiert? | Ja |
| Prisma/Auth Risiken benannt? | Ja |
| Kein Deployment ausgefuehrt? | Ja |
| Firebase-Datenpfad aktiviert? | Nein |
| Prisma entfernt? | Nein |
| Auth umgestellt? | Nein |

## Verbleibende Risiken

- Kein Remote ist aktuell verbunden; App Hosting braucht fuer den empfohlenen Flow ein GitHub Repository.
- Next.js `15.5.15` ist lokal baubar, muss aber im Firebase App Hosting Staging-Backend real validiert werden.
- Datenbank-Netzwerkzugriff aus App Hosting ist noch nicht getestet.
- Auth external provider auth Callback ist erst nach bekannter Staging-URL final pruefbar.
- npm audit meldet weiterhin Findings; es wurde bewusst kein `npm audit fix` ausgefuehrt.

## Finaler Status

Gruen: Die App ist fuer einen sicheren Firebase App Hosting Staging-Dry-Run vorbereitet. Production bleibt nicht aktiviert und ist nicht freigegeben.
