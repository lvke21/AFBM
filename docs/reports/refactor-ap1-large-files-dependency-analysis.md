# Refactor AP1 Large Files Dependency Analysis

Datum: 2026-04-30

## Executive Summary

Status: Gelb

Es wurden keine lokalen Importzyklen gefunden. Die Engine-Kerne unter `src/modules/gameplay` sind weitgehend sauber von React, Next, Firebase und Browser-Storage getrennt. Das groesste Risiko liegt nicht in zyklischen Imports, sondern in sehr grossen Dateien mit mehreren Verantwortlichkeiten und in Service-/UI-Modulen, die Domain-Logik, Persistenzwahl, Firebase, lokale Persistenz und Render-Orchestrierung vermischen.

Der kritischste Refactoring-Kandidat ist `src/lib/online/online-league-service.ts` mit 8.860 Zeilen und 146 Exports. Danach folgen grosse Engine-/Data-Dateien (`play-library.ts`, `match-engine.ts`) und UI-Orchestratoren (`online-league-placeholder.tsx`, `admin-league-detail.tsx`).

## Methodik

- Groessenmessung per frischer Workspace-Analyse am 2026-04-30.
- Ausgeschlossen: `node_modules`, `.next`, `dist`, `build`, `coverage`, `.git`, Emulator-/Test-Artefakte und Lockfiles.
- Fuer die Toplisten wurden Code-, Script-, Schema- und Testdateien betrachtet; Dokumentation wurde nicht als Refactor-Kandidat gewertet.
- Importgraph-Pruefung: einfache lokale TS/TSX/JS/MJS/CJS Analyse fuer relative und `@/` Imports.
- Zyklen-Ergebnis: 0 Zyklen in 626 lokal analysierten Code-Dateien.

## Top 20 Groesste Dateien Nach Zeilen

| Rang | Datei | Zeilen | Zeichen | Bewertung |
| --- | --- | ---: | ---: | --- |
| 1 | `src/lib/online/online-league-service.ts` | 8.860 | 263.428 | Kritisch: Multiplayer-Domain-Monolith |
| 2 | `src/modules/gameplay/infrastructure/play-library.ts` | 6.971 | 245.423 | Gross, aber primär statische Playbook-Daten |
| 3 | `src/modules/seasons/application/simulation/match-engine.ts` | 5.217 | 191.480 | Kritisch: Simulations-Monolith |
| 4 | `src/modules/gameplay/application/play-selection-engine.ts` | 2.769 | 79.442 | Hoch: Auswahl-/Scoring-Engine gebuendelt |
| 5 | `src/modules/gameplay/application/outcome-resolution-engine.ts` | 2.737 | 79.689 | Hoch: Outcome + Stats in einer Datei |
| 6 | `scripts/simulations/qa-extended-engine-balance-suite.ts` | 2.572 | 87.412 | Script, niedriger Refactor-Druck |
| 7 | `src/components/online/online-league-placeholder.tsx` | 2.557 | 105.233 | Kritisch: UI + Domain-Actions + Sync-Orchestrierung |
| 8 | `scripts/seeds/e2e-seed.ts` | 1.849 | 44.895 | Script, mittlerer Wartungsdruck |
| 9 | `scripts/simulations/qa-new-engine-balance-suite.ts` | 1.789 | 58.282 | Script, niedriger Refactor-Druck |
| 10 | `scripts/simulations/gameengine-rating-analysis-report.ts` | 1.715 | 52.644 | Script, niedriger Refactor-Druck |
| 11 | `prisma/migrations/20260426123001_init/migration.sql` | 1.648 | 72.568 | Generierte DB-Historie, nicht refactoren |
| 12 | `src/modules/gameplay/application/play-library-service.ts` | 1.557 | 42.081 | Mittel: Query/Validation/Selection naeher trennen |
| 13 | `src/components/dashboard/dashboard-model.ts` | 1.499 | 47.066 | Mittel: View-Model mit vielen Ableitungen |
| 14 | `src/modules/seasons/application/simulation/extended-season-balance-suite.ts` | 1.444 | 46.729 | QA/Engine-Harness, niedriger Produktivdruck |
| 15 | `scripts/simulations/qa-rating-impact-validation.ts` | 1.399 | 49.690 | Script, niedriger Refactor-Druck |
| 16 | `src/components/online/online-league-detail-model.ts` | 1.389 | 46.144 | Hoch: sehr breites Dashboard-View-Model |
| 17 | `src/components/match/post-game-report-model.ts` | 1.338 | 44.511 | Mittel: Report-Ableitungen gebuendelt |
| 18 | `prisma/schema.prisma` | 1.336 | 47.336 | Legacy/Schema, nicht kurzfristig refactoren |
| 19 | `src/modules/savegames/application/bootstrap/initial-roster.ts` | 1.311 | 30.244 | Datenlastig, mittlerer Druck |
| 20 | `src/components/match/match-report-model.ts` | 1.252 | 42.046 | Mittel: Report-View-Model aufteilbar |

## Top 20 Groesste Dateien Nach Zeichen

| Rang | Datei | Zeichen | Zeilen | Bewertung |
| --- | --- | ---: | ---: | --- |
| 1 | `src/lib/online/online-league-service.ts` | 263.428 | 8.860 | Kritisch |
| 2 | `src/modules/gameplay/infrastructure/play-library.ts` | 245.423 | 6.971 | Datenmodul |
| 3 | `src/modules/seasons/application/simulation/match-engine.ts` | 191.480 | 5.217 | Kritisch |
| 4 | `src/components/online/online-league-placeholder.tsx` | 105.233 | 2.557 | Kritisch |
| 5 | `scripts/simulations/qa-extended-engine-balance-suite.ts` | 87.412 | 2.572 | Script |
| 6 | `src/modules/gameplay/application/outcome-resolution-engine.ts` | 79.689 | 2.737 | Hoch |
| 7 | `src/modules/gameplay/application/play-selection-engine.ts` | 79.442 | 2.769 | Hoch |
| 8 | `prisma/migrations/20260426123001_init/migration.sql` | 72.568 | 1.648 | Schema-Historie |
| 9 | `scripts/simulations/qa-new-engine-balance-suite.ts` | 58.282 | 1.789 | Script |
| 10 | `scripts/simulations/gameengine-rating-analysis-report.ts` | 52.644 | 1.715 | Script |
| 11 | `scripts/simulations/qa-rating-impact-validation.ts` | 49.690 | 1.399 | Script |
| 12 | `prisma/schema.prisma` | 47.336 | 1.336 | Schema |
| 13 | `src/components/dashboard/dashboard-model.ts` | 47.066 | 1.499 | Mittel |
| 14 | `src/modules/seasons/application/simulation/extended-season-balance-suite.ts` | 46.729 | 1.444 | QA |
| 15 | `src/components/online/online-league-detail-model.ts` | 46.144 | 1.389 | Hoch |
| 16 | `scripts/seeds/e2e-seed.ts` | 44.895 | 1.849 | Script |
| 17 | `src/components/match/post-game-report-model.ts` | 44.511 | 1.338 | Mittel |
| 18 | `src/modules/gameplay/application/play-library-service.ts` | 42.081 | 1.557 | Mittel |
| 19 | `src/components/match/match-report-model.ts` | 42.046 | 1.252 | Mittel |
| 20 | `src/components/admin/admin-league-detail.tsx` | 40.975 | 1.069 | Hoch |

## Top Refactoring-Kandidaten

| Prioritaet | Datei / Bereich | Problem | Ziel |
| --- | --- | --- | --- |
| P0 | `src/lib/online/online-league-service.ts` | 8.860 Zeilen, Typen, Defaults, Storage, Validation, League CRUD, Join, Ready, Contracts, Salary Cap, Trades, Draft, Training, Coaching, Stadium, Finance, Media, Job Security, Admin-GM-Entfernung und Week-Simulation in einem Modul. | In fachliche Online-Domain-Services und reine Reducer zerlegen. Public API via Barrel/Facade stabil halten. |
| P0 | `src/components/online/online-league-placeholder.tsx` | React UI, Loading/Error, Firebase-vs-local Branching, Repository-Aufrufe, LocalStorage, Confirm-Dialoge und viele Feature-Actions in einer Komponente. | Container/View-Split: `OnlineLeagueDashboardContainer`, Feature-Panels, Hooks fuer Load/Actions/Recovery. |
| P0 | `src/lib/admin/online-admin-actions.ts` | Server-Firebase-Admin-Transaktionen und Local-Legacy-Actions im selben Dispatcher; kennt Firestore-Dokumente und lokale Domain-Service-Funktionen. | `AdminActionService` als Use-Case-Schicht, getrennte Adapter `FirebaseAdminLeagueRepository` und `LocalAdminLeagueRepository`. |
| P1 | `src/lib/online/repositories/firebase-online-league-repository.ts` | Client-Firestore, Auth-User-Guards, LocalStorage fuer `lastLeagueId`, Mapping, Transactions und Subscription-Ordering in einer Klasse. | Firestore Gateway, Auth Context, Last-League Preference Store und Repository-Facade trennen. |
| P1 | `src/modules/seasons/application/simulation/match-engine.ts` | Engine-Regeln, Clock, Drive, Player-Distribution, Overtime, Scoring und Stat-Line-Produktion in einem Modul. | Pure Sub-Engines: clock, drive-resolution, player-distribution, overtime, stat-lines. |
| P1 | `src/modules/gameplay/application/play-selection-engine.ts` | Situation Classification, Playbook Policies, Candidate Scoring, X-Factor-Modifikatoren und Final Selection gebuendelt. | Candidate-Builder, modifiers, scorer, sampler trennen. |
| P1 | `src/modules/gameplay/application/outcome-resolution-engine.ts` | Outcome-Modell und Stats Recording stark gekoppelt. | Outcome-Aufloesung von Stat-Aggregation trennen. |
| P2 | `src/components/admin/admin-league-detail.tsx` | Admin-UI, LocalStorage-Bridge, Fetch-API, Action-State und Finanz-/GM-Listen in einer Komponente. | Admin Detail Container + `AdminLeagueActionClient` + kleinere Panels. |
| P2 | `src/components/online/online-league-detail-model.ts` | Dashboard-View-Model fuer viele Subdomains. | View-Model pro Panel: roster, finance, training, contracts, draft, admin/status. |
| P2 | `src/components/dashboard/dashboard-model.ts` | Breites Singleplayer-Dashboard-View-Model. | Dashboard-Aggregator mit kleinen Selector-Modulen. |

## Dateien Mit Mehreren Verantwortlichkeiten

### `src/lib/online/online-league-service.ts`

Verantwortlichkeiten in einer Datei:

- Online-League Typmodell und Storage-Keys
- Default-Daten fuer Teams, Contracts, Free Agents, Coaches, Prospects, Owner
- LocalStorage-Zugriff und lokale Persistenz
- Normalisierung und Migration alter League-Daten
- League CRUD, Join, Ready-State, Debug-Fake-User
- Contract-/Salary-Cap-Logik
- Trade-, Draft-, Scouting-, Coaching- und Training-System
- Stadium, Fanbase, Finance, Revenue Sharing
- Team Chemistry, X-Factor, Media Expectations, Franchise Strategy
- GM Job Security, Inactivity, Admin Removal
- Week Simulation fuer Online-Ligen

Risiko: Jede Aenderung an einem Feature kann unbeabsichtigt Typen, Migration, Storage oder andere Subsysteme beruehren. Tests sind zahlreich, aber die Datei selbst bleibt schwer reviewbar.

### `src/components/online/online-league-placeholder.tsx`

Verantwortlichkeiten:

- Firebase/local Repository-Auswahl nutzen
- Current User laden
- League Subscription halten
- Error Recovery darstellen
- Ready-Flow, Training, Contracts, Free Agency, Trades, Draft, Coaching, Stadium Pricing, Strategy und Media-Actions ausloesen
- Expert-Mode in `window.localStorage` speichern
- UI fuer viele unterschiedliche Dashboard-Panels rendern

Risiko: UI-Zustand, Sync-Zustand und Business-Actions sind eng gekoppelt. Das erschwert gezieltes Testen von Reload-/Retry-/Action-Fehlern.

### `src/lib/admin/online-admin-actions.ts`

Verantwortlichkeiten:

- Input-Validation
- Firestore Admin SDK Transaktionen
- lokale Legacy-Admin-Actions
- Mapping Firestore -> `OnlineLeague`
- Admin-Logs
- Week-Simulation-Locking
- Result-/Error-Mapping fuer API-Route

Risiko: Ein Server-Action-Dispatcher kennt zu viele Backend-Details. Firebase- und Local-Verhalten koennen auseinanderlaufen.

### Engine-Grossdateien

- `match-engine.ts`: Simulationskern ist pure genug, aber fachlich zu breit.
- `play-selection-engine.ts`: Bewertungsmodell, Kandidatenfilter und Sampling sind in einer Datei.
- `outcome-resolution-engine.ts`: Outcome-Aufloesung und Stat-Recording sind gekoppelt.
- `play-library.ts`: sehr gross, aber eher statische Daten. Refactor hier ist Struktur-/Ladezeit-Thema, weniger Logikrisiko.

## Services Mit UI-/Engine-/Firebase-Mischlogik

| Bereich | Fundstelle | Mischlogik |
| --- | --- | --- |
| Online Dashboard | `src/components/online/online-league-placeholder.tsx` | React UI + Repository + LocalStorage + Domain-Service-Funktionen + Firebase/local Branching |
| Admin Dashboard | `src/components/admin/admin-league-detail.tsx` | React UI + Fetch zu Admin API + LocalStorage Bridge + Admin-Domain-Interpretation |
| Admin League Manager | `src/components/admin/admin-league-manager.tsx` | React UI + LocalStorage Migration/Reset + Repository-Modus-Anzeige |
| Admin Actions | `src/lib/admin/online-admin-actions.ts` | Firebase Admin SDK + lokale Domain-Funktionen + Mapping + Dispatcher |
| Firebase Online Repository | `src/lib/online/repositories/firebase-online-league-repository.ts` | Firebase Client SDK + Auth + LocalStorage + Mapping + Transactions + Subscriptions |
| Online Local Repository | `src/lib/online/repositories/local-online-league-repository.ts` | Repository Interface + Browser LocalStorage + Legacy Service |
| Repository Provider | `src/lib/online/online-league-repository-provider.ts` | Runtime Backend-Auswahl importiert Firebase- und Local-Repository direkt |

## Engine-Abhaengigkeiten

### Saubere Grenzen

`src/modules/gameplay` zeigt keine produktiven Abhaengigkeiten zu React, Next Router, Firebase, Firestore oder Browser Storage. Das ist positiv: die neue Gameplay-Engine ist im Kern testbar und frameworkfrei.

### Kritische Grenzverletzungen In Season Simulation

In `src/modules/seasons/application/simulation` existieren Application-Engine-Dateien mit Infrastruktur- oder Prisma-Abhaengigkeiten:

- `match-context.ts` importiert `seasonSimulationRepository` aus `../../infrastructure/simulation/season-simulation.repository`.
- `weekly-preparation.ts` importiert `seasonSimulationCommandRepository`.
- `match-result-persistence.ts` importiert `@prisma/client` und `seasonSimulationCommandRepository`.
- `playoff-scheduling.ts` importiert `Prisma` und `seasonSimulationCommandRepository`.
- `stat-anchors.ts` importiert Command- und Query-Repositories.

Bewertung: Die reine Engine (`match-engine.ts`) ist nicht direkt an Firebase/React gekoppelt, aber die Simulation-Application-Schicht mischt Orchestrierung, Persistenz und Prisma-Typen. Das erschwert Firestore/Prisma-Paritaet und macht lokale Tests teilweise backend-sensitiv.

### Reverse Dependencies

Hohe Fan-In Module:

- `src/modules/seasons/application/simulation/match-engine.ts`: 36 lokale Importer
- `src/lib/online/online-league-service.ts`: 31 lokale Importer
- `src/lib/firebase/admin.ts`: 25 lokale Importer
- `src/lib/db/prisma.ts`: 17 lokale Importer

Risiko: Diese Module sind De-facto-Plattform-APIs. Refactors brauchen Facades oder Compatibility Exports, sonst wird der Aenderungsradius sehr gross.

## Zyklische Imports

Ergebnis: Keine lokalen Importzyklen gefunden.

Hinweis zur Methode: Die Pruefung deckt relative Imports und `@/` Alias-Imports in 626 TS/TSX/JS/MJS/CJS-Dateien ab. Dynamische Sonderfaelle und externe Package-Zyklen wurden nicht bewertet.

## Schwer Testbare Module

| Modul | Warum schwer testbar | Bessere Testnaht |
| --- | --- | --- |
| `online-league-service.ts` | Viele globale Storage-Zugriffe, viele fachliche Subsysteme, sehr breite Exportflaeche | Pure Reducer pro Subdomain + Storage-Port |
| `online-league-placeholder.tsx` | Viele UI-States und Async-Actions in einer Komponente | Hook-Tests fuer Load/Action/Recovery + kleine Presentational Components |
| `online-admin-actions.ts` | Firebase Admin SDK und lokale Legacy-Branchs in einem Dispatcher | Repository-Interface mocken, Firebase Adapter separat testen |
| `firebase-online-league-repository.ts` | Firestore Transaktionen, Snapshot-Listener und Auth-User direkt gekoppelt | Firestore Gateway + Auth Provider Port + Subscription Coordinator |
| `match-engine.ts` | Sehr grosse deterministische Engine mit vielen internen Hilfsfunktionen | Sub-Engines exportarm, Property-/Golden-Master-Tests pro Phase |
| `play-selection-engine.ts` | Viele private Scoring-Stufen in einer Datei | Modifier/Scorer/Sampler isolieren |
| `outcome-resolution-engine.ts` | Outcome und Stats Recording gekoppelt | Outcome-DTO erzeugen, Stats Recorder separat testen |

## Empfohlene Zielstruktur

```text
src/lib/online/
  domain/
    league.types.ts
    league-defaults.ts
    league-validation.ts
    league-normalization.ts
    join-flow.ts
    ready-flow.ts
    week-flow.ts
    audit-events.ts
  systems/
    contracts/
    trades/
    draft/
    training/
    coaching/
    stadium-finance/
    chemistry/
    media-expectations/
    gm-job-security/
  persistence/
    online-league-repository.ts
    local/
    firebase/
  application/
    online-league-facade.ts
    online-dashboard-actions.ts

src/lib/admin/
  application/
    online-admin-action-service.ts
  persistence/
    firebase-admin-league-repository.ts
    local-admin-league-repository.ts
  presentation/
    admin-action-dto.ts

src/modules/seasons/application/simulation/
  engine/
    match-engine.ts
    clock-engine.ts
    drive-engine.ts
    player-distribution.ts
    overtime-engine.ts
    stat-line-builder.ts
  orchestration/
    season-week-simulation.ts
  ports/
    simulation-repositories.ts

src/components/online/
  dashboard/
    online-league-dashboard-container.tsx
    online-league-dashboard-view.tsx
    panels/
  hooks/
    use-online-league-load.ts
    use-online-league-actions.ts
    use-online-recovery.ts
```

Zielprinzipien:

- Domain-Funktionen bleiben frameworkfrei.
- Persistence-Adapter kennen Firebase/LocalStorage/Prisma, Domain nicht.
- UI-Komponenten rufen Hooks oder Application-Services auf, aber keine grossen Domain-Monolithen direkt.
- Bestehende Exports werden zuerst ueber Facades stabilisiert, bevor Dateien physisch zerlegt werden.

## Konkrete AP-Reihenfolge

### AP2: Online-Domain-Facade Einziehen

- `online-league-service.ts` nicht sofort gross zerlegen.
- Zuerst Facade-Dateien fuer Typen, Storage, League CRUD, Join/Ready und Week Flow schaffen.
- Imports in UI und Repositories schrittweise auf Facades umstellen.
- Ziel: Aenderungsradius sichtbar machen, ohne Verhalten zu aendern.

### AP3: Multiplayer UI Container/View Split

- `online-league-placeholder.tsx` in Load/Action Hooks und Panels zerlegen.
- Keine Domain-Logik aendern.
- Ziel: Online Dashboard testbarer machen und Action-Fehler isolieren.

### AP4: Admin Action Boundary

- `online-admin-actions.ts` in Application Service plus Firebase/Local Adapter teilen.
- API-Route bleibt stabil.
- Ziel: Firebase Admin und Local Legacy nicht mehr in einem Switch-Block pflegen.

### AP5: Online Persistence Ports Schaerfen

- `firebase-online-league-repository.ts` in Firestore Gateway, Auth-Port, Preference-Store und Repository-Facade zerlegen.
- Ziel: Sync-/Auth-/Storage-Fehler separat testen.

### AP6: Online Domain Subsysteme Extrahieren

- Contracts, Trades, Draft, Training, Coaching, Stadium/Finance, Media und GM Job Security aus `online-league-service.ts` herausziehen.
- Ziel: Monolith unter 2.000 Zeilen druecken, Exportflaeche reduzieren.

### AP7: Simulation Engine Entflechten

- `match-engine.ts` in Clock, Drive Resolution, Player Distribution, Overtime und Stat-Line Builder aufteilen.
- `match-result-persistence.ts`, `stat-anchors.ts`, `weekly-preparation.ts`, `playoff-scheduling.ts` hinter Ports setzen.
- Ziel: reine Engine von Persistenz-Orchestrierung sauber trennen.

### AP8: Gameplay Engine Struktur

- `play-selection-engine.ts` und `outcome-resolution-engine.ts` nach Modifier/Scorer/Sampler/Stats Recorder trennen.
- `play-library.ts` optional in Daten-Slices aufteilen.
- Ziel: kleinere Engine-Testeinheiten und schnellere Reviews.

## Abhaengigkeitsrisiken

| Risiko | Schwere | Begründung |
| --- | --- | --- |
| Online-Monolith als zentrale API | Hoch | 31 Importer und 146 Exports machen jede Aenderung breit. |
| UI-Komponenten triggern Domain-Actions direkt | Hoch | Dashboard-UI entscheidet ueber Firebase/local Branches und lokale Fallbacks. |
| Firebase/Admin und Local Legacy im selben Service | Hoch | Divergierende Semantik zwischen Staging und local kann unbemerkt entstehen. |
| Simulation-Application-Schicht importiert Infrastruktur | Mittel | Firestore/Prisma-Paritaet bleibt an Orchestrierungsdetails gekoppelt. |
| Grosse Engine-Dateien ohne interne Modulgrenzen | Mittel | Tests existieren, aber Review- und Regression-Risiko bleibt hoch. |
| Riesige statische Play-Library | Mittel | Kein Logikfehler per se, aber schwer navigierbar und schlecht diffbar. |
| Keine Importzyklen | Niedrig | Aktuell kein akutes Zyklusproblem gefunden. |

## Fazit

Der Codebase-Zustand ist nicht chaotisch, aber mehrere Module sind ueber ihre natuerliche Grenze hinausgewachsen. Der naechste Refactor sollte nicht mit grossen Verschiebungen beginnen, sondern mit stabilen Facades und Ports. Danach koennen UI-Orchestrierung, Online-Domain und Simulation-Engine in kleinen APs zerlegt werden, ohne Multiplayer, Admin oder Engine-Balancing zu veraendern.

Status: Gelb
