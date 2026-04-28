# AP 11 - Performance Observability fuer Reads, Writes und Simulation

Datum: 2026-04-26

Status: Gruen

## Ziel

Performance-Risiken bei Firestore-Reads/-Writes und Simulation sollen im Entwicklungsmodus sichtbar werden, ohne produktive Telemetriepflicht und ohne stoerende Testausgaben.

## Scope

Umgesetzt:

- minimaler Performance-Logger hinter `AFBM_PERFORMANCE_LOG`
- strukturierte Log-Zeilen mit Dauer, Bereich, Operation, Status und nicht-sensitiven Metadaten
- Firestore-Observability fuer:
  - Game-Output-Persistenz
  - Stats-Persistenz
  - Team-/Player-Readmodels
  - Stats-Views
  - Report-Reads
- Simulation-Observability fuer:
  - Match-Ergebnis-Erzeugung pro Woche
  - Persistenz der Wochen-Match-Ergebnisse
- Tests fuer Flag-Verhalten, stille Defaults und Rueckgabewert-Stabilitaet

Nicht umgesetzt:

- keine externe Telemetrie
- keine UI-Anzeige
- keine Datenbank-Persistenz von Performance-Metriken
- keine Aenderung an Auth
- keine Aenderung an Game Engine, Week-State- oder AP6-Fachlogik

## Umsetzung

Geaendert:

- `src/lib/observability/performance.ts`
- `src/lib/observability/performance.test.ts`
- `src/server/repositories/gameOutputRepository.firestore.ts`
- `src/server/repositories/statsRepository.firestore.ts`
- `src/server/repositories/readModelRepository.firestore.ts`
- `src/modules/seasons/application/season-simulation.service.ts`
- `docs/reports/phases/phase-project-improvement-ap11-report.md`

Details:

- Ohne `AFBM_PERFORMANCE_LOG` erzeugt die Instrumentierung keine Ausgabe.
- Mit `AFBM_PERFORMANCE_LOG=true` oder `AFBM_PERFORMANCE_LOG=1` werden Logs im Format `[afbm:perf] { ... }` geschrieben.
- Die Metadaten enthalten nur technische Zaehler wie geplante Reads, Batch-/Drive-/Line-Counts, Match-Anzahl und Woche.
- Fehlerpfade werden ebenfalls gemessen und als `status: "error"` mit Fehlerklasse protokolliert.

## Tests

Gruen:

- `npx vitest run src/lib/observability/performance.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/seasons/application/simulation/simulation-orchestrator.test.ts`
  - 3 Testdateien / 10 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:game-output && npm run test:firebase:stats && npm run test:firebase:readmodels"`
  - Game Output: 1 Testdatei / 4 Tests.
  - Stats: 1 Testdatei / 4 Tests.
  - Readmodels: 1 Testdatei / 3 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:week-state"`
  - 1 Testdatei / 8 Tests.
- `npm run test:e2e:week-loop`
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.
- `npx tsc --noEmit`
- `npm run lint`

## Bewertung

AP11 ist gruen. Mit ENV-Flag sind Query-/Write-/Dauerwerte fuer die relevanten Firestore- und Simulationspfade sichtbar. Ohne Flag bleibt die Ausgabe ruhig und bestehende Tests bleiben stabil.

## Bekannte Einschraenkungen

- Es gibt keine zentrale Aggregation oder UI fuer die Metriken.
- Die Read-/Write-Zaehler sind bewusst technische Plan-/Result-Counts und ersetzen kein vollstaendiges Tracing.
- Produktive Telemetrie ist nicht aktiviert.

## Freigabe

Das naechste Arbeitspaket ist freigegeben, wurde aber nicht gestartet.

Status: Gruen.
