# Recommended Test Plan

## Ziel

Definition einer praktikablen Regressionstest-Suite fuer Entwicklung, Pull Requests, Staging und Release.

## Prinzipien

1. Schnelle Checks frueh, teure Checks spaet.
2. Multiplayer- und Firebase-Risiken nie nur durch Unit-Tests absichern.
3. Staging-Smoke ist fuer Production-Go verpflichtend.
4. E2E-Infrastruktur muss explizit vorbereitet werden.
5. Keine Secrets in Repo oder Reports.

## Lokaler Fast-Check

Ziel:
- Schnelles Entwicklerfeedback vor kleinen Aenderungen.

Commands:

```bash
npx tsc --noEmit
npm run lint
npm test -- --run
```

Akzeptanz:

- Alle gruen.
- Deprecation-Warnungen duerfen nicht eskalieren, sollten aber verfolgt werden.

## Lokaler Full-Check

Ziel:
- Vor Refactor- oder Feature-Abschluss.

Commands:

```bash
npx tsc --noEmit
npm run lint
npm test -- --run
npm run build
npm run test:firebase:parity
```

Voraussetzungen:

- Firebase Emulator darf lokale Ports binden.

## Prisma E2E Check

Ziel:
- Browser-Flows fuer Savegames, Navigation und lokale Spielablaeufe pruefen.

Voraussetzungen:

```bash
npm run db:up
npm run prisma:migrate -- --name init
npm run test:e2e:seed
```

Commands:

```bash
npm run test:e2e
npm run test:e2e:navigation
npm run test:e2e:multiplayer
```

Akzeptanz:

- Keine 404s.
- Keine kaputten Buttons.
- Reload auf getesteten Routen funktioniert.

## Firebase Emulator Regression

Ziel:
- Firestore Rules, Repository-Parity, Firebase Multiplayer und Draft absichern.

Commands:

```bash
npm run test:firebase:rules
npm run test:firebase:parity
npm run test:e2e:multiplayer:firebase
npm run test:e2e:multiplayer:firebase:draft
```

Akzeptanz:

- Emulator startet sauber.
- Keine Port-Konflikte.
- Keine direkten Production Reads/Writes.

## Multiplayer Critical Suite

Ziel:
- Die riskantesten Multiplayer-Regressionen abfangen.

Commands:

```bash
vitest run \
  src/lib/online/online-league-service.test.ts \
  src/lib/online/online-league-week-simulation.test.ts \
  src/lib/online/fantasy-draft-service.test.ts \
  src/lib/admin/online-admin-actions.test.ts \
  src/app/api/admin/online/actions/route.test.ts \
  src/components/online/online-league-route-state-model.test.ts \
  src/components/online/online-league-detail-model.test.ts
```

Zusaetzlich:

```bash
npm run test:e2e:multiplayer
npm run test:firebase:parity
```

## Staging Release Gate

Ziel:
- Beweisen, dass echte Firebase Auth/Admin/Week-Flows auf Staging funktionieren.

Voraussetzungen:

- Dedizierter Staging-Test-Admin-User.
- Secrets nur im lokalen Environment oder CI Secret Store.
- `CONFIRM_STAGING_SMOKE=true`.
- Projekt: `afbm-staging`.

Command:

```bash
CONFIRM_STAGING_SMOKE=true \
STAGING_FIREBASE_TEST_EMAIL=<admin-test-email> \
STAGING_FIREBASE_TEST_PASSWORD=<admin-test-password> \
npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league
```

Akzeptanz:

- Login erfolgreich.
- Admin-Token akzeptiert.
- Team-Zuweisung bestaetigt.
- Ready-State bestaetigt.
- Admin Week Simulation erfolgreich oder korrekt idempotent blockiert.
- Results/Standings nach Reload sichtbar.
- Keine kritischen Staging Logs.

## Nightly / Heavy QA

Ziel:
- Teure Simulation-/Balance-/E2E-Suiten ausserhalb des schnellen PR-Pfads laufen lassen.

Commands:

```bash
npm run qa:production:test
npm run qa:simulation-balancing:test
npm run test:e2e:all
npm run test:firebase:mvp
```

Akzeptanz:

- Keine deterministische Drift ohne bewusste Freigabe.
- Keine neuen Balance-Ausreisser.
- Keine E2E-Flakes ueber mehrere Runs.

## Empfohlene Reihenfolge fuer Release

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm test -- --run`
4. `npm run build`
5. `npm run test:firebase:parity`
6. Prisma E2E: Smoke, Navigation, Multiplayer
7. Firebase E2E: Multiplayer, Draft
8. Staging Admin Week Smoke
9. Logs pruefen
10. Erst danach Production-Go pruefen

## No-Go-Regeln

- Production No-Go, wenn Staging Auth/Admin-Smoke fehlt.
- Production No-Go, wenn E2E wegen Infrastruktur nicht reproduzierbar ist und keine CI-Alternative gruen ist.
- Production No-Go, wenn Firebase Parity oder Rules rot sind.
- Production No-Go, wenn Seeds nicht idempotent validiert wurden.
- Production No-Go, wenn Login/Team-Zuweisung/Week Simulation nicht live geprueft wurden.
