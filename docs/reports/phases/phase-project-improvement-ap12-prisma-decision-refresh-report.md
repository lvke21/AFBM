# AP 12 - Prisma-Entscheidungsvorlage aktualisieren

Datum: 2026-04-26

Status: Gruen

## Ziel

Nach AP 1 bis AP 11 neu bewerten, ob Prisma behalten, als Legacy/Fallback gefuehrt oder entfernt werden kann.

## Scope

Umgesetzt:

- aktuelle Firebase- und AP-Berichte gelesen
- verbleibende Prisma-Abhaengigkeiten inventarisiert
- `firebase-e2e-parity-report.md` auf den aktuellen serverseitig gruenen Parity-Stand aktualisiert
- `firebase-final-migration-decision.md` aktualisiert
- Option A, B und C neu bewertet
- Rollback-Plan und Go/No-Go-Kriterien aktualisiert
- Parity-Testmatrix an die Multi-Match-Week-State-Machine angepasst

Nicht umgesetzt:

- keine Prisma-Dateien geloescht
- keine Auth-Umstellung
- keine produktive Firebase-Aktivierung
- keine Datenmigration
- kein Removal-Plan als Umsetzung, nur Kriterien und separater Planrahmen

## Umsetzung

Geaendert:

- `src/server/repositories/firestoreE2eParity.test.ts`
- `docs/reports/systems/firebase-e2e-parity-report.md`
- `docs/reports/systems/firebase-final-migration-decision.md`
- `docs/reports/phases/phase-project-improvement-ap12-prisma-decision-refresh-report.md`

Details:

- Der erste AP12-Parity-Lauf fand eine veraltete Erwartung in `firestoreE2eParity.test.ts`: Der Test erwartete `POST_GAME` nach dem ersten abgeschlossenen Match der Woche.
- Die seit AP5 korrekte Multi-Match-State-Machine bleibt bei weiteren offenen Wochenmatches auf `READY` und erreicht `POST_GAME` erst nach dem letzten offenen Match.
- Die Parity-Testmatrix wurde so angepasst, dass das Zielmatch das letzte offene Wochenmatch ist, wenn `POST_GAME` erwartet wird.
- Die finale Entscheidung bleibt konservativ: Prisma behalten. Server-Parity ist gruen, aber Auth.js, SaveGame-Root, Browser-Navigation, Seeds, Referenzdaten und transaktionale Fachpfade blockieren Prisma-Removal weiterhin.

## Tests

Gruen:

- `npm run test:firebase:parity`
  - erster Lauf: Rot wegen veralteter Multi-Match-Erwartung.
  - nach Korrektur: 1 Testdatei / 3 Tests gruen.
- `npx tsc --noEmit`
- `npm run lint`

Aus vorherigen AP10/AP12-Gates weiterhin relevant und gruen:

- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:week-state"`
  - 1 Testdatei / 8 Tests.
- `npm run test:e2e:week-loop`
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

## Entscheidung

Option A: Prisma behalten.

Option B, Prisma als Legacy/Fallback, ist noch nicht freigegeben. Voraussetzungen waeren Firestore-Browser-E2E, Auth-/SaveGame-Klaerung, produktionsnahe Datenmigration und Rollback-Snapshot.

Option C, Prisma entfernen, ist No-Go.

## Bekannte Einschraenkungen

- Firestore ist fuer serverseitige Kernbereiche im Emulator gruen, aber nicht produktiv aktiviert.
- Firestore-Browser-E2E ist wegen Auth/SaveGame-Root noch nicht produktionsnah validiert.
- Prisma bleibt Default, lokaler Entwicklungsanker und Rollback-Pfad.

## Freigabe

Es sind keine weiteren Arbeitspakete aus `project-improvement-workpackages.html` offen.

Status: Gruen.
