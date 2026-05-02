# Refactor Regression Report AP1-AP6

Stand: 2026-05-01

## Zusammenfassung

Die risikoarmen Refactorings AP1-AP6 zeigen in Lint, Typecheck, Build, Vitest und Firebase-Emulator-Tests keine nachgewiesene funktionale Regression.

Nicht vollstaendig gruen ist die Browser-E2E-Schicht:

- `npm run test:e2e` startet die App, scheitert aber an einem strict-mode Locator, weil `AFBM Manager` aktuell zweimal matcht.
- `npm run test:e2e:navigation` scheitert im Seed an einer vorhandenen `SaveGame.id`, also an einem nicht-idempotenten E2E-Fixture.

Diese E2E-Befunde blockieren eine vollstaendige Gruen-Freigabe, wirken aber nicht wie direkte Folgen von AP1-AP6.

Finale Bewertung: **Gelb**

## Ausgefuehrte Checks

| Command | Ergebnis | Notiz |
| --- | --- | --- |
| `npm run lint` | Gruen | ESLint ohne Fehler |
| `npx tsc --noEmit` | Gruen | Seriell nach `npm run build` wiederholt und bestanden |
| `npm run build` | Gruen | Next Production Build erfolgreich |
| `npm run test:run` | Gruen | 154 Testdateien / 912 Tests bestanden |
| `npm run test:firebase:rules` | Gruen | 19 Firestore-Rules-Tests bestanden |
| `npm run test:firebase:parity` | Gruen | 3 Firestore-Parity-Tests bestanden |
| `npm run test:e2e` | Rot | App startet, Test-Locator `getByText("AFBM Manager")` ist nicht eindeutig |
| `npm run test:e2e:navigation` | Rot | `scripts/seeds/e2e-seed.ts` bricht wegen doppelter `SaveGame.id` ab |

Hinweise:

- Ein erster parallel gestarteter `npx tsc --noEmit` lief waehrend `next build` und traf einen temporaeren `.next/types`-Zwischenzustand. Der seriell wiederholte Typecheck war gruen.
- Die ersten Firebase-Emulator-Laeufe innerhalb der Sandbox konnten keine lokalen Ports oeffnen. Seriell und mit erlaubtem Emulator-Portzugriff liefen Rules und Parity gruen.
- Vitest/Firebase geben weiterhin bestehende `punycode` Deprecation Warnings aus Abhaengigkeiten aus.

## Getestete Bereiche

### Singleplayer Flow

Abdeckung:

- Savegame-Snapshot, Savegame-Commands und Bootstrap-Tests
- Dashboard-, Navigation-, Roster-, Team-, Draft-, Week- und Match-Modelle
- Gameplay-, Match-, Season- und Simulation-Tests

Ergebnis:

- Keine Regression in den automatisierten Unit-/Integrationstests.
- Build kompiliert alle Singleplayer-Routen erfolgreich.

Status: **Gruen**

### Multiplayer Join/Load

Abdeckung:

- `src/lib/online/repositories/online-league-repository.test.ts`
- `src/components/online/online-continue-model.test.ts`
- `src/components/online/online-league-search-model.test.ts`
- `src/lib/online/auth/online-auth.test.ts`
- Firebase Rules und Parity Tests

Ergebnis:

- Repository-, Continue-, Search- und Auth-nahe Tests bestanden.
- Rules/Parity bestaetigen den Firestore-nahen Zugriffspfad.
- Browser-E2E fuer Multiplayer wurde in diesem Lauf nicht als gruen nachgewiesen, weil die allgemeine E2E-Schicht bereits an Seed/Locator-Problemen haengt.

Status: **Gelb**

### Team-Zuweisung

Abdeckung:

- Online-League-Service Tests
- Repository Tests
- Multiplayer-Firebase-MVP Actions Tests
- Firestore Rules Tests

Ergebnis:

- Keine automatisierte Regression sichtbar.
- Keine AP1-AP6-Aenderung hat User-Team-Zuordnungen oder Membership-Semantik fachlich veraendert.

Status: **Gruen**

### Draft Flow

Abdeckung:

- `src/lib/online/fantasy-draft.test.ts`
- `src/lib/online/fantasy-draft-service.test.ts`
- `src/lib/online/multiplayer-draft-logic.test.ts`
- `src/app/app/savegames/[savegameId]/draft/actions.test.ts`
- Draft Room wurde durch AP3/AP6 beruehrt und blieb in der vollen Suite gruen.

Ergebnis:

- Fantasy Draft, Draft-Service und Draft-Logik bestanden.
- Keine Regression durch Memoization oder Importpfad-Reduktion sichtbar.

Status: **Gruen**

### Week Simulation

Abdeckung:

- `src/lib/online/online-league-week-simulation.test.ts`
- `src/lib/admin/online-week-simulation.test.ts`
- `src/lib/admin/online-admin-actions.test.ts`
- `src/lib/online/online-league-service.test.ts`
- mehrere Singleplayer Week-/Season-/Simulation-Tests

Ergebnis:

- Week-Simulation, doppelte Simulation, Admin-Actions und Records-nahe Pfade bestanden.
- Keine AP1-AP6-Regression sichtbar.

Status: **Gruen**

### Admin Funktionen

Abdeckung:

- `src/app/api/admin/online/actions/route.test.ts`
- `src/lib/admin/online-admin-actions.test.ts`
- `src/lib/admin/admin-action-hardening.test.ts`
- `src/components/admin/admin-league-form-validation.test.ts`
- Build der Admin-Routen `/admin` und `/admin/league/[leagueId]`

Ergebnis:

- Admin API, Action-Hardening und Formularvalidierung bestanden.
- AP5 reduzierte nur nicht-destruktive Button-Boilerplate; Tests zeigen keine API-Regression.

Status: **Gruen**

### Firebase/Auth

Abdeckung:

- `src/lib/auth/firebase-auth-state.test.ts`
- `src/lib/firebase/admin.test.ts`
- `src/lib/firebase/firestore.rules.test.ts`
- `src/server/repositories/firestoreE2eParity.test.ts`
- Online Auth Tests

Ergebnis:

- Firebase/Auth-nahe Unit- und Emulator-Tests bestanden.
- Keine Auth-/Rules-Regression nach AP1-AP6 sichtbar.

Status: **Gruen**

### GUI Navigation

Abdeckung:

- `src/components/layout/navigation-model.test.ts`
- `src/components/online/online-league-dashboard-panels.test.tsx`
- Build aller App-/Online-/Admin-Routen
- Playwright Smoke und Navigation versucht

Ergebnis:

- Model- und Build-Abdeckung sind gruen.
- `npm run test:e2e` ist rot wegen Strict-Mode-Locator:
  - `getByText("AFBM Manager")` matcht Link `AFBM Manager` und Text `AFBM Manager Hub`.
- `npm run test:e2e:navigation` ist rot wegen nicht-idempotentem Seed:
  - `Unique constraint failed on the fields: (id)` bei `prisma.saveGame.create()`.

Status: **Gelb**

## Fehler

1. **E2E Smoke Locator nicht eindeutig**
   - Command: `npm run test:e2e`
   - Fehler: Playwright strict mode violation fuer `getByText("AFBM Manager")`
   - Auswirkung: Smoke-E2E kann die Startseite nicht mehr eindeutig assertieren.
   - Bewertung: Test-/UX-Selector-Problem; App antwortete mit HTTP 200 und Seite wurde gerendert.

2. **E2E Navigation Seed nicht idempotent**
   - Command: `npm run test:e2e:navigation`
   - Fehler: Prisma `P2002`, doppelter `SaveGame.id`
   - Auswirkung: Navigation-E2E startet nicht.
   - Bewertung: Testdaten-/Seed-Problem; verhindert Browser-Regressionsnachweis.

3. **Parallelisierung von Build und Typecheck erzeugt falschen roten Typecheck**
   - Command: parallel `npx tsc --noEmit` und `npm run build`
   - Fehler: fehlende `.next/types` Dateien waehrend Build-Rewrite
   - Auswirkung: kein Codefehler; seriell wiederholt gruen.
   - Bewertung: QA-Ablauf muss diese beiden Commands seriell ausfuehren.

## Regressionen

Nachgewiesene AP1-AP6-Funktionsregressionen: **keine**.

Nicht nachgewiesen wegen E2E-Blockern:

- Voller Browser-Smoke-Flow
- Voller Browser-Navigation-Flow
- Browser-basierter Multiplayer Join/Rejoin

## Risiken

- **Mittel:** Browser-E2E ist aktuell nicht verlaesslich gruen. Dadurch koennen UI-/Navigationsregressionen trotz gruenem Build und gruenen Unit-Tests unentdeckt bleiben.
- **Mittel:** `scripts/seeds/e2e-seed.ts` ist fuer wiederholte lokale Laeufe nicht robust genug. Das erschwert Regressionstests nach kleinen Refactorings.
- **Niedrig:** AP6 reduziert Importpfade; Runtime-Verhalten ist durch Typecheck/Build abgesichert, Bundle-Wirkung aber noch klein.
- **Niedrig:** AP5 reduziert Admin-Button-Boilerplate; Admin API und nicht-destruktive Actions bleiben durch Tests abgedeckt.

## Empfehlung

Vor Merge/Release der Refactor-Serie:

1. E2E Smoke Locator konkretisieren, z. B. Role-/Link-Assertion statt `getByText("AFBM Manager")`.
2. `scripts/seeds/e2e-seed.ts` idempotent machen oder vor Seed gezielt eigene Fixture-IDs bereinigen.
3. Danach `npm run test:e2e` und `npm run test:e2e:navigation` erneut ausfuehren.

## Finale Bewertung

**Gelb**

Die Code- und Service-Regressionstests sind gruen, aber die Browser-E2E-Schicht ist nicht release-sicher nachgewiesen.
