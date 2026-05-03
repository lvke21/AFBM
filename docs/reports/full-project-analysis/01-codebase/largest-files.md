# Largest Files

Stand: 2026-05-02

## Ziel der Analyse

Identifikation der groessten Dateien nach Zeilen und Bytes, getrennt nach Source-Hotspots und Repo-weiten Artefakten.

## Top 10 groesste Source-Dateien

| Rang | Datei | Kategorie | Zeilen | Bytes |
|---:|---|---|---:|---:|
| 1 | `src/lib/online/online-league-service.ts` | Logic | 8.882 | 267.684 |
| 2 | `src/modules/gameplay/infrastructure/play-library.ts` | Logic | 6.971 | 245.423 |
| 3 | `src/modules/seasons/application/simulation/match-engine.ts` | Logic | 5.226 | 191.711 |
| 4 | `src/modules/gameplay/application/play-selection-engine.ts` | Logic | 2.748 | 78.947 |
| 5 | `src/modules/gameplay/application/outcome-resolution-engine.ts` | Logic | 2.716 | 79.194 |
| 6 | `src/lib/admin/online-admin-actions.ts` | Logic | 1.913 | 64.911 |
| 7 | `src/components/online/online-league-placeholder.tsx` | UI | 1.766 | 74.052 |
| 8 | `src/components/admin/admin-league-detail.tsx` | UI | 1.642 | 63.239 |
| 9 | `src/components/online/online-league-detail-model.ts` | UI/Model | 1.573 | 51.860 |
| 10 | `src/modules/gameplay/application/play-library-service.ts` | Logic | 1.557 | 42.081 |

## Weitere grosse Source-Dateien

| Datei | Zeilen | Einschaetzung |
|---|---:|---|
| `src/components/dashboard/dashboard-model.ts` | 1.499 | Model/Copy/State-Buendel, fachlich breit |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | 1.468 | Firebase Repository mit hohem Datenfluss-Risiko |
| `src/modules/seasons/application/simulation/extended-season-balance-suite.ts` | 1.444 | Simulations-/QA-Logik, vermutlich bewusst gross |
| `src/components/match/post-game-report-model.ts` | 1.338 | Grosses Report-/Copy-/State-Modell |
| `src/modules/savegames/application/bootstrap/initial-roster.ts` | 1.311 | Grosse Seed-/Roster-Datenstruktur |
| `src/lib/online/online-league-service.test.ts` | 1.253 | Breiter Regressionstest fuer Online-Service |
| `src/components/match/match-report-model.ts` | 1.252 | Grosses Anzeige-/Report-Modell |

## Repo-weit groesste Dateien

| Rang | Datei | Zeilen | Hinweis |
|---:|---|---:|---|
| 1 | `src/lib/online/online-league-service.ts` | 8.882 | Produktivlogik |
| 2 | `src/modules/gameplay/infrastructure/play-library.ts` | 6.971 | Gameplay-Daten/Regeln |
| 3 | `docs/reports/code-analysis/codebase-size-analysis.json` | 6.441 | Analyse-Artefakt |
| 4 | `src/modules/seasons/application/simulation/match-engine.ts` | 5.226 | Engine |
| 5 | `src/modules/gameplay/application/play-selection-engine.ts` | 2.748 | Engine |
| 6 | `src/modules/gameplay/application/outcome-resolution-engine.ts` | 2.716 | Engine |
| 7 | `scripts/simulations/qa-extended-engine-balance-suite.ts` | 2.572 | QA/Simulation Script |
| 8 | `src/lib/admin/online-admin-actions.ts` | 1.913 | Admin/Firestore Actions |
| 9 | `scripts/seeds/e2e-seed.ts` | 1.860 | E2E Seed |
| 10 | `scripts/simulations/qa-new-engine-balance-suite.ts` | 1.789 | QA/Simulation Script |

## Grosse Komponenten

| Komponente | Zeilen | Problem |
|---|---:|---|
| `src/components/online/online-league-placeholder.tsx` | 1.766 | UI, State, Action-Handler und Online-Derivationen in einer Datei |
| `src/components/admin/admin-league-detail.tsx` | 1.642 | Detail-UI, Admin-Actions, Debug und Statuslogik nah beieinander |
| `src/components/admin/admin-control-center.tsx` | 748 | Dashboard-UI und Action-Navigation in grosser Komponente |
| `src/components/team/roster-table.tsx` | 601 | Tabelle mit Darstellung, Interaktion und derived data |
| `src/components/online/online-league-dashboard-panels.tsx` | 454 | Viele Multiplayer-Dashboard-Abschnitte in einer Datei |

## Grosse Services

| Service | Zeilen | Problem |
|---|---:|---|
| `src/lib/online/online-league-service.ts` | 8.882 | Monolithischer Online-Domain-Service |
| `src/lib/admin/online-admin-actions.ts` | 1.913 | Admin API und Firebase Writes stark gebuendelt |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | 1.468 | Firestore Mapping/Reads/Writes in einem breiten Repository |
| `src/modules/seasons/application/season-simulation.service.ts` | 401 | Zentrale Season Mutation; fachlich sensibel |
| `src/modules/seasons/application/season-management.service.ts` | 390 | Season Advance; fachlich sensibel |

## Risiken

- Datei-Groesse korreliert hier mit realer Verantwortungskonzentration, nicht nur mit viel Copy.
- Engine-Dateien duerfen nicht wie normale UI-Monolithen refactored werden; hier braucht es Golden-Master-Tests.
- Admin und Online Services sind releasekritisch, weil kleine Fehler Firestore-Daten oder Berechtigungen betreffen koennen.

## Empfehlungen

- Top-Source-Dateien nicht per Big-Bang splitten.
- Bei UI-Komponenten zuerst reine Display-Komponenten oder derived-data Helper extrahieren.
- Bei Services zuerst read-only Helper/Mapper extrahieren, keine Transactions oder Writes bewegen.
- Bei Engine-Dateien zuerst Testabdeckung und deterministische Fixtures ausbauen.
