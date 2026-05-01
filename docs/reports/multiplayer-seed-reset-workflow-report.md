# Multiplayer Seed Reset Workflow Report

Datum: 2026-05-01

## Analyse

Bestehende Seed-/Reset-Pfade:

- Prisma: `prisma/seed.ts`, `npm run prisma:seed`
- Firestore-Emulator-Fixture: `scripts/seeds/firestore-seed.ts`
- Firestore-Emulator-Reset: `scripts/seeds/firestore-reset.ts`
- Firestore-Verify: `scripts/seeds/firestore-verify.ts`
- Multiplayer-E2E-Seed: `scripts/seeds/multiplayer-e2e-firestore-seed.ts`
- Multiplayer-Foundation-Seeds: Liga, Spielerpool, Draft-Prep

Der allgemeine Firestore-Reset loescht definierte Emulator-Collections global. Fuer die
Multiplayer-Testliga wurde deshalb ein enger Reset gebaut, der nur die eine markierte
Liga und ihre Subcollections entfernt.

## Neue npm Scripts

- `npm run seed:multiplayer:league`
- `npm run seed:multiplayer:players`
- `npm run seed:multiplayer:draft`
- `npm run seed:multiplayer:validate`
- `npm run seed:multiplayer:reset`
- `npm run seed:multiplayer:reset-only`

## Ausfuehrungsreihenfolge

`npm run seed:multiplayer:reset` fuehrt aus:

1. `resetMultiplayerTestLeague()`
2. `seedMultiplayerTestLeague()`
3. `seedMultiplayerPlayerPool()`
4. `prepareMultiplayerDraft()`
5. `validateMultiplayerSeedWorkflow()`

## Schutzmassnahmen

- Reset und Validation nutzen die bestehenden Firestore-Emulator-Guards.
- Reset blockt `NODE_ENV=production` und `AFBM_DEPLOY_ENV=production`.
- Reset/Seed/Validate akzeptieren nur `demo-*` Firebase-Projekte.
- Reset verlangt Firestore-Emulator-Konfiguration.
- Reset loescht nur `leagues/afbm-multiplayer-test-league`.
- Reset verlangt Marker:
  - `seedKey = afbm-multiplayer-foundation-v1`
  - `testData = true`
  - `leagueSlug = afbm-multiplayer-test-league`
  - `createdBySeed = true`
- Auth-User und fremde Ligen werden nicht geloescht.

## Validierung

Das Validierungsscript prueft:

- Liga existiert und traegt Sicherheitsmarker.
- Genau 8 Teams existieren.
- Spielerpool enthaelt mindestens 500 Spieler.
- Positionsverteilung entspricht den Foundation-Targets.
- Draft-State existiert und ist `active`.
- Erster Pick zeigt auf `zurich-guardians`.
- Keine doppelten Team- oder Spieler-IDs.
- Gedraftete Spieler sind nicht mehr verfuegbar.

## Testergebnisse

- `npx vitest run src/lib/online/multiplayer-draft-logic.test.ts scripts/seeds/multiplayer-player-pool-firestore-seed.test.ts scripts/seeds/multiplayer-test-league-firestore-seed.test.ts`: gruen, 16 Tests bestanden.
- `npx tsc --noEmit`: gruen.
- `npx eslint scripts/seeds/multiplayer-test-league-reset.ts scripts/seeds/multiplayer-test-league-validate.ts scripts/seeds/multiplayer-test-league-reset-and-seed.ts scripts/seeds/multiplayer-test-league-firestore-seed.ts scripts/seeds/multiplayer-player-pool-firestore-seed.ts scripts/seeds/multiplayer-draft-prep-firestore-seed.ts src/lib/online/types.ts`: gruen.
- `npm run seed:multiplayer:validate`: rot in dieser Umgebung, weil kein Firestore-Emulator unter `127.0.0.1:8080` erreichbar war.
- `npm run seed:multiplayer:reset`: rot in dieser Umgebung, weil kein Firestore-Emulator unter `127.0.0.1:8080` erreichbar war.

## Risiken

- Der echte End-to-End-Reset muss mit laufendem Emulator erneut ausgefuehrt werden.
- Nicht markierte Alt-Dokumente unter derselben Liga-ID werden absichtlich nicht geloescht.
- Firestore-Regeln/Auth werden durch diesen Workflow nicht getestet.
- Der Workflow ist nicht fuer produktive Cloud-Daten freigegeben.
