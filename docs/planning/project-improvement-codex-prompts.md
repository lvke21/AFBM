# FBManager - Codex-Implementierungsprompts

Datum: 2026-04-26

Quelle: `docs/planning/project-improvement-workpackages.html`

Regel: Das nächste Paket darf erst gestartet werden, wenn das vorherige Paket im zugehörigen Bericht Status **Grün** hat. Jeder Prompt ist einzeln kopierbar und bewusst begrenzt.

## Reihenfolge

1. AP 1 - Gemeinsame Prisma-/Firestore-Parity-Fixtures
2. AP 2 - Parity-Testlauf und lokale PostgreSQL/E2E-Stabilisierung
3. AP 3 - Firestore Query- und Readmodel-Optimierung
4. AP 7 - X-Factor/Gameplan UI als spielbare Entscheidung
5. AP 8 - Post-Game Entscheidungsfeedback im Report
6. AP 4 - Idempotente Stats-/Aggregate-Pipeline härten
7. AP 5 - Week-/Match-State-Machine für Multi-Match-Wochen
8. AP 6 - Simulation-Orchestrator und Background-Job-Vorbereitung
9. AP 11 - Performance Observability für Reads, Writes und Simulation
10. AP 9 - Repository- und Domain-Typ-Grenzen weiter entkoppeln
11. AP 10 - Weekly Decision Layer
12. AP 12 - Prisma-Entscheidungsvorlage aktualisieren

---

## Prompt 1 - Gemeinsame Prisma-/Firestore-Parity-Fixtures

```text
Rolle:
Senior Backend Engineer und QA Engineer

Voraussetzung:
Keine.

Projekt:
American Football Manager / FBManager

Ziel:
Gemeinsame fachliche Fixture-Basis für Prisma-E2E-Seed und Firestore-Emulator-Seed schaffen, damit spätere Backend-Parity belastbar vergleichbar wird.

Wichtig:
- Keine produktive Migration.
- Keine Auth-Umstellung.
- Keine Prisma-Dateien löschen.
- Prisma bleibt Default/Fallback.
- Firestore bleibt nur Emulator/demo-*.

Aufgaben:
1. Lies:
   - docs/planning/project-improvement-workpackages.html
   - docs/reports/systems/firebase-e2e-parity-report.md
   - docs/reports/systems/firebase-seed-report.md

2. Analysiere die aktuellen Seeds:
   - scripts/seeds/e2e-seed.ts
   - scripts/seeds/firestore-seed.ts
   - scripts/seeds/firestore-reset.ts
   - scripts/seeds/firestore-verify.ts
   - e2e/fixtures/minimal-e2e-context.ts

3. Extrahiere eine gemeinsame Fixture-Basis für:
   - League/SaveGame
   - 8 Teams
   - 64 Spieler
   - 1 Season
   - 7 Weeks
   - 28 Matches
   - initiale Team-/Player-Stats
   - Report/Readmodel-Minimaldaten

4. Stelle Firestore-Seed auf stabile gemeinsame IDs um.

5. Stelle Prisma-E2E-Seed auf dieselben fachlichen IDs um oder dokumentiere ein eindeutiges Mapping, falls 1:1 nicht risikoarm möglich ist.

6. Erweitere Verify/Parity-Checks um:
   - Counts
   - IDs
   - Match-Zuordnung
   - Team-/Player-Zuordnung

7. Erstelle/aktualisiere:
   docs/reports/phases/phase-project-improvement-ap1-fixtures-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- npm run firebase:reset
- npm run firebase:seed
- npm run test:firebase:parity
- npm run test:e2e:seed, falls lokale PostgreSQL-Instanz verfügbar ist

Bei fehlender PostgreSQL-Instanz:
- Exakten Grund dokumentieren.
- Firestore-Seed/Verify trotzdem ausführen.
- Status nur Grün, wenn die Fixture-Basis technisch umgesetzt und Prisma-Teil entweder erfolgreich getestet oder sauber als Infrastrukturblocker dokumentiert ist.

Statusprüfung:
- Gemeinsame Fixture-Basis vorhanden?
- Firestore-Seed nutzt stabile IDs?
- Prisma-E2E-Seed nutzt gleiche IDs oder dokumentiertes Mapping?
- Keine produktiven Firebase-Zugriffe?
- Tests grün oder Infrastrukturblocker klar dokumentiert?

Status: Grün oder Rot
```

---

## Prompt 2 - Parity-Testlauf und lokale PostgreSQL/E2E-Stabilisierung

```text
Rolle:
QA Engineer, Backend Engineer und Release Engineer

Voraussetzung:
Prompt 1 / AP 1 hat Status Grün.

Projekt:
American Football Manager / FBManager

Ziel:
Prisma- und Firestore-Testläufe reproduzierbar machen und den Parity-Status serverseitig belastbar bewerten.

Wichtig:
- Keine produktive Firebase-Aktivierung.
- Keine Auth-Umstellung.
- Keine Prisma-Entfernung.
- Browser-E2E mit Firestore nur vorbereiten/dokumentieren, nicht erzwingen.

Aufgaben:
1. Lies:
   - docs/reports/phases/phase-project-improvement-ap1-fixtures-report.md
   - docs/reports/systems/firebase-e2e-parity-report.md
   - scripts/tools/e2e-preflight.mjs
   - package.json

2. Verbessere den lokalen E2E-Preflight:
   - klare PostgreSQL-Erreichbarkeit prüfen
   - verständliche Fehlermeldung für localhost:5432
   - konkrete lokale Start-/Fix-Hinweise dokumentieren

3. Definiere eine Parity-Testmatrix für:
   - Seed-Daten
   - Team Overview
   - Player/Roster
   - Season Overview
   - Match Detail
   - Week Loop
   - Game Finish
   - Advance Week
   - Stats
   - Reports

4. Stelle sicher, dass Prisma- und Firestore-Testläufe getrennt ausführbar bleiben.

5. Aktualisiere:
   docs/reports/systems/firebase-e2e-parity-report.md
   docs/reports/phases/phase-project-improvement-ap2-parity-stabilization-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- npm run test:firebase:parity
- npm run test:firebase
- npm run test:e2e:seed
- relevante Playwright-Specs, falls Seed erfolgreich ist

Statusprüfung:
- PostgreSQL-Preflight verständlich?
- Prisma-Testlauf ausführbar oder Infrastrukturblocker eindeutig?
- Firestore-Parity-Testlauf grün?
- Parity-Matrix dokumentiert?
- Keine produktiven Firebase-Zugriffe?

Status: Grün oder Rot
```

---

## Prompt 3 - Firestore Query- und Readmodel-Optimierung

```text
Rolle:
Firestore Performance Engineer und Backend Engineer

Voraussetzung:
Prompt 2 / AP 2 hat Status Grün oder dokumentiert nur lokale Infrastrukturblocker, die dieses Paket nicht betreffen.

Projekt:
American Football Manager / FBManager

Ziel:
Firestore-Reads für Team-, Player-, Season-, Match- und Readmodel-Pfade effizienter machen.

Wichtig:
- Keine neue Migration aktivieren.
- Keine produktiven Firebase-Zugriffe.
- Prisma bleibt Default/Fallback.
- Keine UI-Neugestaltung.

Aufgaben:
1. Lies:
   - docs/planning/project-improvement-workpackages.html
   - docs/reports/systems/firebase-reports-readmodels-report.md
   - docs/reports/systems/firebase-season-week-match-read-report.md
   - docs/reports/systems/firebase-teams-players-migration.md

2. Analysiere N+1-Read-Pfade in:
   - src/server/repositories/teamRepository.firestore.ts
   - src/server/repositories/playerRepository.firestore.ts
   - src/server/repositories/matchRepository.firestore.ts
   - src/server/repositories/seasonRepository.firestore.ts
   - src/server/repositories/readModelRepository.firestore.ts

3. Optimiere nur risikoarme Firestore-Reads:
   - Queries mit leagueId/seasonId/scope/teamId/playerId scopen
   - offensichtliche per-Entity-Nachladepfade reduzieren
   - Roster-Listen als leichte Daten laden, wo möglich
   - Match-Week-Reads stärker über Aggregates/Summaries nutzen

4. Ergänze fehlende Indexe nur, wenn die optimierten Queries sie brauchen.

5. Erstelle:
   docs/reports/project-improvement-ap3-firestore-read-optimization-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- npm run test:firebase
- npm run test:firebase:readmodels
- npm run test:firebase:season-week-match
- npm run test:firebase:teams-players, falls vorhanden
- relevante UI-Model-Tests für Team/Player/Match

Statusprüfung:
- N+1-Pfade reduziert oder dokumentiert?
- Keine offenen Full-Collection-Reads neu eingeführt?
- Queries korrekt gescoped?
- Indexe passend?
- Prisma bleibt Default/Fallback?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 4 - X-Factor/Gameplan UI als spielbare Entscheidung

```text
Rolle:
Senior Fullstack Engineer und Game Designer

Voraussetzung:
Prompt 3 / AP 3 hat Status Grün.

Projekt:
American Football Manager / FBManager

Ziel:
Pre-Game X-Factor/Gameplan als echte Spielerentscheidung sichtbar und speicherbar machen.

Wichtig:
- Kein kompletter Engine-Umbau.
- Keine neue Persistenzmigration.
- Keine Auth-Umstellung.
- Prisma bleibt Default/Fallback.
- Keine Firestore-Produktivaktivierung.

Aufgaben:
1. Lies:
   - docs/reports/systems/project-analysis-report.html
   - docs/planning/project-improvement-workpackages.html
   - src/modules/gameplay/domain/pre-game-x-factor.ts

2. Analysiere bestehende Gameplan-/Setup-Pfade:
   - src/components/match/game-preparation-panel.tsx
   - src/components/match/game-preparation-model.ts
   - src/app/app/savegames/[savegameId]/matches/[matchId]/actions.ts
   - src/modules/seasons/application/match-preparation.service.ts
   - src/modules/savegames/application/savegame-snapshot.ts

3. Implementiere eine kleine X-Factor-Auswahl im Pre-Game Setup:
   - Offensive Focus
   - Defensive Focus
   - Aggression
   - Protection Plan
   - Offensive Matchup Focus
   - Defensive Matchup Focus
   - Turnover Plan

4. Ergänze verständliche Trade-off-Texte:
   - Vorteil
   - Risiko
   - betroffene Spielsituationen

5. Speichere und validiere den Plan serverseitig.

6. Prüfe, ob der Plan tatsächlich an die relevante Simulation/Report-Schicht weitergereicht wird. Wenn nicht risikoarm möglich, dokumentiere die genaue Lücke und setze Status Rot.

7. Erstelle:
   docs/reports/project-improvement-ap7-xfactor-gameplan-ui-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- relevante Game-Preparation-Model-Tests
- Match-Preparation-Service-Tests
- Action-Tests, falls vorhanden
- X-Factor-/Outcome-/Play-Selection-Tests, soweit betroffen

Statusprüfung:
- X-Factor-Plan in UI auswählbar?
- Plan serverseitig validiert?
- Plan gespeichert?
- Trade-offs verständlich?
- Keine Scheinsteuerung ohne dokumentierte Lücke?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 5 - Post-Game Entscheidungsfeedback im Report

```text
Rolle:
Game UX Engineer und QA Engineer

Voraussetzung:
Prompt 4 / AP 7 hat Status Grün.

Projekt:
American Football Manager / FBManager

Ziel:
Match Reports sollen verständlich erklären, welche Managerentscheidungen, Ratings und Matchups den Spielausgang beeinflusst haben.

Wichtig:
- Keine neuen persistenzkritischen Writes.
- Keine Stats-Migration.
- Keine UI-Neugestaltung.
- Keine Kausalität behaupten, die nicht durch vorhandene Daten gestützt ist.

Aufgaben:
1. Lies:
   - docs/reports/project-improvement-ap7-xfactor-gameplan-ui-report.md
   - docs/reports/systems/project-analysis-report.html

2. Analysiere:
   - src/components/match/match-report-model.ts
   - src/components/match/why-game-outcome.tsx
   - src/components/match/engine-decision-panel.tsx
   - src/modules/gameplay/application/engine-decision-reporting.ts
   - src/modules/gameplay/application/game-stats-reporting.ts

3. Ergänze Report-Modelle um Entscheidungsfeedback:
   - Gameplan/X-Factor-Effekt
   - wichtige Rating-Unterschiede
   - Matchup-Schlüsselstellen
   - 2-4 klare Faktoren statt Rohdatenflut

4. Alte Matchdaten ohne Trace oder X-Factor-Daten müssen weiterhin sauber angezeigt werden.

5. Erstelle:
   docs/reports/project-improvement-ap8-postgame-feedback-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- npx vitest run src/components/match/match-report-model.test.ts
- npx vitest run src/modules/gameplay/application/engine-decision-reporting.test.ts, falls vorhanden
- relevante Game-Report-Smoke-/E2E-Tests, falls lokal möglich

Statusprüfung:
- Report erklärt Entscheidungen verständlich?
- Keine unbewiesene Kausalität?
- Alte/teilweise Daten funktionieren?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 6 - Idempotente Stats-/Aggregate-Pipeline härten

```text
Rolle:
Data Engineer, Backend Engineer und QA Engineer

Voraussetzung:
Prompt 5 / AP 8 hat Status Grün.
Prompt 1 und Prompt 2 müssen ebenfalls Grün sein.

Projekt:
American Football Manager / FBManager

Ziel:
Stats und Aggregates so härten, dass Replays und erneute Matchpersistenz nicht doppelt zählen und Produktionskosten bewertbar werden.

Wichtig:
- Keine Reports-Migration als Nebenaufgabe.
- Keine Auth-Umstellung.
- Keine Prisma-Entfernung.
- Prisma bleibt Default/Fallback.

Aufgaben:
1. Lies:
   - docs/reports/systems/firebase-stats-aggregates-report.md
   - docs/reports/systems/firebase-game-output-persistence-report.md
   - docs/reports/phases/phase-project-improvement-ap2-parity-stabilization-report.md

2. Analysiere:
   - src/server/repositories/statsRepository.firestore.ts
   - src/server/repositories/statsRepository.prisma.ts
   - src/modules/seasons/application/simulation/match-result-persistence.ts
   - src/modules/gameplay/application/game-stats-aggregation.ts
   - src/server/repositories/firestoreStatsAggregates.test.ts

3. Definiere und implementiere minimal:
   - Idempotenzschlüssel für Match-Stats
   - klare Replay-/Double-Finish-Strategie
   - dokumentierte Rebuild-vs-Delta-Entscheidung
   - Kostenbewertung für lange Seasons

4. Ergänze Tests für:
   - gleiches Match zweimal persistieren
   - geänderter Match Output als Replay
   - Team-Season-Aggregate
   - Player-Season-Aggregate

5. Erstelle:
   docs/reports/project-improvement-ap4-stats-idempotency-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- npm run test:firebase:stats
- npm run test:firebase:game-output
- npm run test:firebase
- relevante Game-Engine-/Stats-Aggregation-Tests
- Prisma-Fallback-Tests, falls betroffen

Statusprüfung:
- Keine doppelte Zählung bei erneuter Persistenz?
- Replay-Verhalten klar?
- Kostenrisiko dokumentiert?
- Prisma bleibt Default/Fallback?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 7 - Week-/Match-State-Machine für Multi-Match-Wochen

```text
Rolle:
Game State Engineer, Backend Engineer und QA Engineer

Voraussetzung:
Prompt 6 / AP 4 hat Status Grün.

Projekt:
American Football Manager / FBManager

Ziel:
Week- und Match-State-Machine für Wochen mit mehreren Matches robust machen.

Wichtig:
- Keine Stats-/Report-Migration.
- Keine vollständige Game-Engine-Migration.
- Keine Auth-Umstellung.
- Prisma bleibt Default/Fallback.

Aufgaben:
1. Lies:
   - docs/reports/systems/firebase-week-match-state-write-report.md
   - docs/reports/systems/project-analysis-report.html
   - docs/planning/project-improvement-workpackages.html

2. Analysiere:
   - src/modules/savegames/application/week-flow.service.ts
   - src/server/repositories/weekMatchStateRepository.firestore.ts
   - src/app/app/savegames/[savegameId]/week-actions.ts
   - src/components/dashboard/week-loop-panel.tsx
   - src/server/repositories/firestoreWeekMatchState.test.ts
   - src/modules/savegames/application/week-flow.service.test.ts

3. Definiere eine klare State-Machine-Tabelle für:
   - Single-Match-Wochen
   - Multi-Match-Wochen
   - offene SCHEDULED Matches
   - laufende IN_PROGRESS Matches
   - abgeschlossene COMPLETED Matches

4. Implementiere nur notwendige Flow-Härtung:
   - klare Advance-Week-Regeln
   - klare Fehlertexte
   - keine Deadlocks bei mehreren Matches
   - keine illegalen Transitions

5. Erstelle:
   docs/reports/project-improvement-ap5-week-state-machine-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- npm run test:firebase:week-state
- npx vitest run src/modules/savegames/application/week-flow.service.test.ts
- npx vitest run src/app/app/savegames/[savegameId]/week-actions.test.ts, falls vorhanden
- e2e/week-loop.spec.ts, falls lokale E2E-Voraussetzungen erfüllt sind

Statusprüfung:
- Multi-Match-Wochen ohne Deadlock?
- Offene Matches werden korrekt blockierend angezeigt?
- Illegale Transitions blockiert?
- Prisma-Fallback unverändert?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 8 - Simulation-Orchestrator und Background-Job-Vorbereitung

```text
Rolle:
Senior Backend Architect, Game Engine Engineer und QA Engineer

Voraussetzung:
Prompt 7 / AP 5 hat Status Grün.

Projekt:
American Football Manager / FBManager

Ziel:
Simulationserzeugung und Persistenz als klare, wiederholbare Pipeline strukturieren und spätere Background Jobs vorbereiten.

Wichtig:
- Noch keine echte Worker-/Queue-Infrastruktur erzwingen.
- Keine produktive Firebase-Aktivierung.
- Keine Prisma-Entfernung.
- Prisma bleibt Default/Fallback.

Aufgaben:
1. Lies:
   - docs/reports/systems/firebase-game-output-persistence-report.md
   - docs/reports/systems/firebase-stats-aggregates-report.md
   - docs/reports/systems/firebase-reports-readmodels-report.md
   - docs/reports/project-improvement-ap5-week-state-machine-report.md

2. Analysiere:
   - src/modules/seasons/application/season-simulation.service.ts
   - src/modules/seasons/application/simulation/match-engine.ts
   - src/modules/seasons/application/simulation/match-result-persistence.ts
   - src/server/repositories/gameOutputRepository.firestore.ts
   - src/server/repositories/statsRepository.firestore.ts
   - src/server/repositories/readModelRepository.firestore.ts

3. Baue eine kleine Orchestrator-Struktur oder dokumentierte Pipeline ein:
   - lock
   - simulate
   - persist game output
   - persist stats
   - generate/update readmodels
   - unlock

4. Jeder Schritt soll nachvollziehbar und möglichst wiederholbar sein.

5. Definiere Status-/Fehlerobjekte als Vorbereitung für spätere Background Jobs.

6. Erstelle:
   docs/reports/project-improvement-ap6-simulation-orchestrator-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- relevante Season-Simulation-Tests
- relevante Match-Engine-Tests
- npm run test:firebase:game-output
- npm run test:firebase:stats
- npm run test:firebase:readmodels
- Week-Flow-Tests

Statusprüfung:
- Pipeline-Schritte klar getrennt?
- Teilschritte wiederholbar oder Fehler klar dokumentiert?
- Keine Reihenfolge-Risiken zwischen State, Output, Stats, Reports?
- Keine produktive Firestore-Aktivierung?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 9 - Performance Observability

```text
Rolle:
Performance Engineer und Backend Engineer

Voraussetzung:
Prompt 8 / AP 6 hat Status Grün.

Projekt:
American Football Manager / FBManager

Ziel:
Entwicklungsmodus soll relevante Performance-Kennzahlen für Reads, Writes, Batch-Größen und Simulation sichtbar machen.

Wichtig:
- Keine produktive Telemetriepflicht.
- Kein Logging sensibler Daten.
- Tests dürfen nicht flakig werden.
- Keine Fachlogik umbauen.

Aufgaben:
1. Lies:
   - docs/reports/systems/project-analysis-report.html
   - docs/planning/project-improvement-workpackages.html

2. Analysiere mögliche Messpunkte:
   - src/server/repositories/*
   - src/modules/seasons/application/season-simulation.service.ts
   - src/modules/seasons/application/simulation/match-engine.ts
   - scripts/simulations/qa-*.ts optional

3. Implementiere einen minimalen Performance-Logger hinter ENV-Flag, z.B. AFBM_PERF_LOG=1.

4. Messe nur grob:
   - Simulationsdauer pro Match/Week
   - Firestore-Read-/Write-Abschnitte, soweit ohne großen Umbau möglich
   - Batch-Größen
   - Orchestrator-Schrittdauer, falls vorhanden

5. Ohne ENV-Flag darf keine störende Ausgabe entstehen.

6. Erstelle:
   docs/reports/project-improvement-ap11-performance-observability-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- relevante Repository-Tests
- relevante Simulation-Tests
- Smoke mit ENV-Flag an/aus, falls lokal möglich

Statusprüfung:
- Performance-Logger hinter ENV-Flag?
- Keine sensiblen Daten im Log?
- Ohne Flag ruhig?
- Messpunkte dokumentiert?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 10 - Repository- und Domain-Typ-Grenzen weiter entkoppeln

```text
Rolle:
Lead Backend Architect und TypeScript Engineer

Voraussetzung:
Prompt 9 / AP 11 hat Status Grün.
Prompt 1 und Prompt 2 müssen Grün sein.

Projekt:
American Football Manager / FBManager

Ziel:
Fachlogik schrittweise von Prisma-Enums/-Typen entkoppeln, ohne Prisma zu entfernen.

Wichtig:
- Keine Prisma-Dateien löschen.
- Keine Auth-Umstellung.
- Keine produktive Firebase-Aktivierung.
- Prisma bleibt Default/Fallback.
- Paket klein halten: nur die wichtigsten Enum-/Typgrenzen anfassen.

Aufgaben:
1. Lies:
   - docs/reports/systems/firebase-final-migration-decision.md
   - docs/reports/systems/firebase-repository-abstraction-report.md
   - docs/planning/project-improvement-workpackages.html

2. Inventarisiere Prisma-Typimporte in:
   - src/modules/*/domain
   - src/modules/*/application
   - src/server/repositories
   - Firestore-Tests

3. Wähle einen kleinen ersten Slice:
   - WeekState
   - MatchStatus
   - SeasonPhase
   - RosterStatus nur falls risikoarm

4. Definiere Domain-Typen oder konsolidiere vorhandene Typen.

5. Ergänze Prisma-/Firestore-Mapper, wo nötig.

6. Stelle nur risikoarme Aufrufstellen auf Domain-Typen um.

7. Erstelle:
   docs/reports/project-improvement-ap9-domain-type-decoupling-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- Repository-Tests
- Week-Flow-Tests
- Simulation-Tests, falls betroffen
- npm run test:firebase, falls Firestore-Mapper betroffen sind

Statusprüfung:
- Erster Domain-Typ-Slice umgesetzt?
- Prisma-Enums an Fachlogik reduziert?
- Werte kompatibel?
- Prisma bleibt Default/Fallback?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 11 - Weekly Decision Layer

```text
Rolle:
Game Designer, Fullstack Engineer und QA Engineer

Voraussetzung:
Prompt 10 / AP 9 hat Status Grün.
Prompt 4 und Prompt 5 müssen Grün sein.

Projekt:
American Football Manager / FBManager

Ziel:
Vor jeder Woche kleine, verständliche Managemententscheidungen ermöglichen: Training, Recovery und Development Focus.

Wichtig:
- Kleine erste Version.
- Balance konservativ halten.
- Keine vollständige neue Trainingssimulation.
- Keine Firestore-Produktivaktivierung.
- Prisma bleibt Default/Fallback.

Aufgaben:
1. Lies:
   - docs/reports/systems/project-analysis-report.html
   - docs/reports/project-improvement-ap7-xfactor-gameplan-ui-report.md
   - docs/reports/project-improvement-ap8-postgame-feedback-report.md

2. Analysiere:
   - src/components/dashboard/week-loop-panel.tsx
   - src/modules/savegames/application/weekly-player-development.service.ts
   - src/modules/seasons/application/simulation/weekly-preparation.ts
   - src/modules/seasons/application/simulation/player-condition.ts
   - src/app/app/savegames/[savegameId]/page.tsx

3. Definiere eine kleine Weekly-Plan-Version:
   - Recovery
   - Balanced
   - Intense
   - begrenzter Development Focus

4. Baue UI und serverseitige Validierung.

5. Integriere Wirkung nur klein und testbar:
   - Fatigue/Readiness
   - Development-Chance
   - klare Trade-off-Erklärung

6. Erstelle:
   docs/reports/project-improvement-ap10-weekly-decision-layer-report.md

Tests:
- npx tsc --noEmit
- npm run lint
- Weekly-Development-Tests
- Player-Condition-Tests
- Dashboard-/Week-Loop-Model-Tests
- Week-Loop-E2E, falls lokal möglich

Statusprüfung:
- Weekly Plan auswählbar?
- Wirkung klein und nachvollziehbar?
- Balance-Risiken dokumentiert?
- Kein Deadlock im Week Flow?
- Tests grün?

Status: Grün oder Rot
```

---

## Prompt 12 - Prisma-Entscheidungsvorlage aktualisieren

```text
Rolle:
Lead Engineer, Release Manager und Technical Architect

Voraussetzung:
Prompt 11 / AP 10 hat Status Grün.
Prompt 1 bis Prompt 8 müssen Grün sein.

Projekt:
American Football Manager / FBManager

Ziel:
Nach den technischen Verbesserungen neu entscheiden, ob Prisma behalten, als Legacy/Fallback geführt oder später entfernt werden kann.

Wichtig:
- Noch nichts entfernen.
- Keine Prisma-Dateien löschen.
- Keine Auth-Umstellung als Nebenaufgabe.
- Keine produktive Firebase-Aktivierung.
- Nur Entscheidungsvorlage/Plan.

Aufgaben:
1. Lies alle aktuellen Reports:
   - docs/reports/firebase-*.md
   - docs/reports/project-improvement-*.md
   - docs/reports/systems/project-analysis-report.html

2. Suche alle verbliebenen Prisma-Abhängigkeiten:
   - Imports
   - Services
   - Tests
   - Seeds
   - ENV
   - Dokumentation
   - package.json Scripts

3. Bewerte erneut:
   - Option A: Prisma behalten
   - Option B: Prisma nur Legacy/Fallback
   - Option C: Prisma entfernen

4. Prüfe:
   - Parity-Status
   - Auth-/SaveGame-Blocker
   - Rollback-Möglichkeit
   - Testabdeckung
   - Kosten/Performance
   - Datenmigration

5. Falls Entfernung empfohlen wird:
   - keine Dateien löschen
   - separaten Removal-Plan erstellen
   - klare Go/No-Go-Kriterien definieren

6. Erstelle/aktualisiere:
   docs/reports/systems/firebase-final-migration-decision.md
   docs/reports/phases/phase-project-improvement-ap12-prisma-decision-refresh-report.md

Tests:
- Keine Code-Tests erforderlich, wenn nur Reports geändert werden.
- Verweise aber auf zuletzt erfolgreiche Testläufe aus den Reports.

Statusprüfung:
- Alle Prisma-Abhängigkeiten bekannt?
- Empfehlung nachvollziehbar?
- Rollback-Plan vorhanden?
- Nichts vorschnell entfernt?
- Entscheidung passt zum aktuellen Parity-Status?

Status: Grün oder Rot
```

---

## Statusprüfung

- Alle wichtigen Arbeitspakete abgedeckt? **Grün**. Alle 12 Pakete aus `project-improvement-workpackages.html` sind als Prompts enthalten.
- Prompts klein genug? **Grün**. Jeder Prompt fokussiert ein Paket und vermeidet Nebenmigrationen.
- Tests je Paket vorhanden? **Grün**. Jeder Prompt endet mit konkreten Tests und Statusprüfung.
- Reihenfolge korrekt? **Grün**. Die Prompts folgen der empfohlenen Reihenfolge und enthalten Grün-Gates.

Status: **Grün**
