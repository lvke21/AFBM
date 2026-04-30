# Firebase Multiplayer E2E Two-Context Report

Datum: 2026-04-30

Scope: Playwright-Smoke fuer echten Firebase-Multiplayer mit zwei unabhaengigen Browser-Kontexten.

Status: Gruen nach lokalem Emulatorlauf am 2026-04-30.

## Setup

Neuer Befehl:

```bash
npm run test:e2e:multiplayer:firebase
```

Der Befehl startet per Firebase CLI nur lokale Emulatoren:

- Firestore Emulator: `127.0.0.1:8080`
- Auth Emulator: `127.0.0.1:9099`
- Projekt: `demo-afbm`

Vor dem Playwright-Lauf seedet `scripts/seeds/multiplayer-e2e-firestore-seed.ts` eine reproduzierbare Lobby-Liga:

- `leagues/e2e-multiplayer-league`
- Name: `Firebase Multiplayer E2E League`
- zwei verfuegbare Teams
- keine Memberships
- keine produktiven Daten

## Abgedeckte Szenarien

- User A oeffnet den Online Hub im Live-Multiplayer-Modus und joint die Seed-Liga.
- User B nutzt einen zweiten isolierten Browser-Kontext und joint dieselbe Liga.
- Beide User haben unterschiedliche Firebase Anonymous UIDs.
- Beide erhalten unterschiedliche `teamId`/`assignedUserId`-Zuordnungen.
- Beide Dashboards sehen `2/2 Spieler`.
- User A setzt Ready.
- User B sieht den synchronisierten Status `1/2 Spieler bereit`.
- Beide reloaden und koennen ueber `Weiterspielen` die letzte Liga laden.
- User A kann per direktem Firestore-REST-Write weder User Bs Membership noch User Bs Team manipulieren.
- Adminbereich bleibt ohne Admin-Cookie getrennt vom normalen Online-GM.

## Implementierungsnotizen

- Der Firebase Client verbindet sich nur bei gesetzten Public-Env-Variablen mit Emulatoren:
  - `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST`
  - `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`
- Fuer den Cross-User-Write-Test liest Playwright das Auth-Emulator-ID-Token aus dem jeweiligen Browser-Kontext und ruft den Firestore Emulator direkt an.
- Das Liga-Dashboard startet die Detail-Subscription erst nach wiederhergestelltem Online-User. Dadurch bleibt Reload/Persistenz im Firebase-Auth-Emulator reproduzierbar.
- Der Test nutzt keine Test-Hooks im Produkt-UI und keine Production-Firebase-Projekte.

## Verifikation

Ausgefuehrte Commands:

- `npx tsc --noEmit` -> bestanden
- `npm run lint` -> bestanden
- `npm run test:e2e:multiplayer:firebase` -> bestanden, 1 Playwright-Test mit 2 Browser-Kontexten

## Bekannte Flakiness-Risiken

- Realtime-Propagation zwischen zwei Browser-Kontexten kann auf langsamen Maschinen einige Sekunden dauern; der Test nutzt deshalb explizite `expect`-Timeouts.
- Firebase Auth speichert Sessions in IndexedDB. Falls Browser-Storage APIs in einer Umgebung deaktiviert sind, kann der Token-Check scheitern.
- Der Test ist bewusst seriell, weil er eine einzelne reproduzierbare Seed-Liga nutzt.
