# AP 4 - Idempotente Stats-/Aggregate-Pipeline haerten

Datum: 2026-04-26

Status: Gruen

## Ziel

Stats-Persistenz gegen erneute Matchabschluesse und Replays haerten, ohne Prisma als Default/Fallback zu entfernen und ohne Report-Migration als Nebenaufgabe.

## Umsetzung

Aktualisiert:

- `src/server/repositories/statsRepository.firestore.ts`
- `src/server/repositories/firestoreStatsAggregates.test.ts`

## Was umgesetzt wurde

- Firestore-Match-Stats erhalten explizite Idempotenz-Metadaten:
  - `idempotencyKey`
  - `simulationRunId`
- Firestore-Season-Aggregates erhalten nachvollziehbare Rebuild-Metadaten:
  - `idempotencyKey`
  - `simulationRunId`
  - `sourceMatchStatIds`
- Team-Season-Aggregates summieren jetzt auch `totalYards`.
- Replay-Test ergaenzt:
  - Gleiches Match wird zuerst mit Ergebnis A persistiert.
  - Danach wird dasselbe Match mit Ergebnis B erneut persistiert.
  - Match-Stats werden ersetzt.
  - Season-Aggregates bleiben bei `gamesPlayed: 1` und uebernehmen Ergebnis B statt doppelt zu zaehlen.

## Bewusste Grenzen

- Prisma-Fallback bleibt unveraendert.
- Kein produktiver Firestore-Zugriff.
- Keine neue Career-Stats-Pipeline; AP4 haertet den vorhandenen Match-/Season-Pfad.
- Keine Report-Migration.

## Tests

Gruen:

- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:stats"`
  - 1 Testdatei / 4 Tests.
- `npx tsc --noEmit`
- `npm run lint`
- `npx vitest run src/modules/gameplay/application/game-stats-aggregation.test.ts src/modules/seasons/application/simulation/match-result-persistence.test.ts`
  - 1 vorhandene Testdatei / 1 Test. Hinweis: `match-result-persistence.test.ts` existiert aktuell nicht.
- `npx vitest run src/modules/gameplay/application/outcome-stats-recorder.test.ts src/modules/seasons/application/simulation/match-engine.test.ts`
  - 2 Testdateien / 13 Tests.

## Akzeptanzkriterien

- Erneutes Persistieren desselben Match-Outputs zaehlt nicht doppelt: Gruen.
- Replay mit geaendertem Match-Output ersetzt Aggregates statt zu addieren: Gruen.
- Aggregates enthalten nachvollziehbare Idempotenz-/Source-Metadaten: Gruen.
- Prisma bleibt Default/Fallback: Gruen.

Status: Gruen.
