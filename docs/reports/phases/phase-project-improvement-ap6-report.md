# AP 6 - Simulation-Orchestrator und Background-Job-Vorbereitung

Datum: 2026-04-26

Status: Gruen

## Ziel

Die Season-Simulation soll als nachvollziehbare Pipeline vorbereitet werden, ohne bereits Worker-Infrastruktur zu erzwingen. AP6 modelliert die spaeteren Background-Job-Schritte fuer Locking, Simulation, Output-/Stats-Persistenz, Readmodel-Erzeugung und Unlock.

## Scope

Umgesetzt innerhalb des AP6-Scopes:

- explizites Orchestrator-Statusmodell fuer Season-Week-Simulationen
- deterministische Job-ID pro Savegame, Season und Woche
- Pipeline-Schritte:
  - `lock`
  - `simulate`
  - `persist-game-output`
  - `persist-stats`
  - `generate-readmodels`
  - `unlock`
- strukturierte Fehlerobjekte fuer spaeteres UI-Polling
- Match-ID-Liste als chunkbare Arbeitsgrundlage
- Integration in `simulateSeasonWeekForUser`
- E2E-Harness-Stabilisierung: Playwright-Artefakte liegen ausserhalb des Next-Dev-Watch-Verzeichnisses

Nicht umgesetzt:

- keine Worker-Infrastruktur
- keine produktive Firestore-Aktivierung
- keine Aenderung an Auth
- keine Aenderung an Game Engine oder Week-State-Fachlogik

## Umsetzung

Geaendert:

- `src/modules/seasons/application/simulation/simulation-orchestrator.ts`
- `src/modules/seasons/application/simulation/simulation-orchestrator.test.ts`
- `src/modules/seasons/application/season-simulation.service.ts`
- `src/modules/seasons/application/season-simulation.service.test.ts`
- `playwright.config.ts`
- `e2e/week-loop.spec.ts`
- `docs/reports/phases/phase-project-improvement-ap6-report.md`

Details:

- Der Orchestrator erzeugt einen Snapshot mit Job-Status, Match-IDs und geordneten Schritten.
- Jeder Schritt kann `PENDING`, `RUNNING`, `COMPLETED`, `SKIPPED` oder `FAILED` sein.
- Fehler werden als `{ name, message }` normalisiert.
- Die bestehende Prisma-Simulation bleibt fachlich unveraendert und liefert zusaetzlich Orchestrator-Metadaten.
- Prisma-Readmodels bleiben query-derived; der Readmodel-Schritt wird deshalb nachvollziehbar als `SKIPPED` markiert.
- Der AP5-Browser-E2E schrieb Playwright-Artefakte bisher in projektinterne Ordner. Next Dev beobachtete diese Dateien, loeste Fast-Refresh/Server-Reloads aus und erzeugte waehrend des Tests sporadische `Unexpected end of JSON input`-500er. Die Artefakte liegen nun standardmaessig in `/tmp`.

## Tests

Gruen:

- `npx vitest run src/modules/seasons/application/season-simulation.service.test.ts src/modules/seasons/application/simulation/simulation-orchestrator.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/engine-state-machine.test.ts src/modules/seasons/application/simulation/simulation-api.service.test.ts src/modules/seasons/application/simulation/production-qa.test.ts`
  - 6 Testdateien / 36 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:game-output && npm run test:firebase:stats && npm run test:firebase:readmodels && npm run test:firebase:week-state"`
  - Game Output: 1 Testdatei / 4 Tests.
  - Stats: 1 Testdatei / 4 Tests.
  - Readmodels: 1 Testdatei / 3 Tests.
  - Week State: 1 Testdatei / 8 Tests.
- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.
- `npx tsc --noEmit`
- `npm run lint`

## Bewertung

AP6 ist gruen. Die Simulation kann deterministisch pro Match nachvollzogen und spaeter in Background-Schritte zerlegt werden. Die bestehenden Persistenzpfade bleiben unveraendert, und die AP5-Week-Loop-Regression ist nach der E2E-Harness-Stabilisierung wieder gruen.

## Bekannte Einschraenkungen

- Es gibt noch keinen echten Background Worker und keine Persistenz eines Job-Status in Datenbank oder Firestore.
- Prisma-Readmodels werden weiterhin aus Abfragen aufgebaut und nicht materialisiert.
- Firestore bleibt in diesem AP nur ueber Emulator-Regressionen abgesichert; keine produktive Firestore-Aktivierung.

## Freigabe

Das naechste Arbeitspaket ist freigegeben, wurde aber nicht gestartet.

Status: Gruen.
