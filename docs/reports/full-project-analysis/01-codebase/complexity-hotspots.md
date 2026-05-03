# Complexity Hotspots

Stand: 2026-05-02

## Ziel der Analyse

Identifikation von Dateien und Funktionen mit hoher Komplexitaet, starker Kopplung oder zu vielen Verantwortlichkeiten.

## Lange Funktionen und Komponenten

| Rang | Funktion/Komponente | Datei | Start | Laenge | Risiko |
|---:|---|---|---:|---:|---|
| 1 | `simulateMatch` | `src/modules/seasons/application/simulation/match-engine.ts` | 3049 | 2.163 | Hoch |
| 2 | `OnlineLeaguePlaceholder` | `src/components/online/online-league-placeholder.tsx` | 77 | 1.689 | Mittel/Hoch |
| 3 | `AdminLeagueDetail` | `src/components/admin/admin-league-detail.tsx` | 327 | 1.315 | Mittel/Hoch |
| 4 | `createMinimalFixture` | `scripts/seeds/e2e-seed.ts` | 686 | 1.154 | Mittel |
| 5 | `executeFirebaseAction` | `src/lib/admin/online-admin-actions.ts` | 801 | 764 | Hoch |
| 6 | `chooseFourthDownDecision` | `src/modules/seasons/application/simulation/match-engine.ts` | 520 | 594 | Hoch |
| 7 | `AdminLeagueManager` | `src/components/admin/admin-league-manager.tsx` | 69 | 516 | Mittel |
| 8 | `OnlineLeagueSearch` | `src/components/online/online-league-search.tsx` | 36 | 491 | Mittel |
| 9 | `buildFirestoreBackfillDocuments` | `scripts/firestore-backfill.ts` | 37 | 478 | Mittel |
| 10 | `recordResolvedPlayStats` | `src/modules/gameplay/application/outcome-resolution-engine.ts` | 2170 | 415 | Hoch |
| 11 | `PlayerPage` | `src/app/app/savegames/[savegameId]/players/[playerId]/page.tsx` | 97 | 406 | Mittel |
| 12 | `validateDefensiveStructure` | `src/modules/gameplay/application/play-library-service.ts` | 746 | 382 | Mittel |
| 13 | `DepthChartView` | `src/components/team/depth-chart-view.tsx` | 387 | 368 | Mittel |
| 14 | `SavegamesListSection` | `src/components/savegames/savegames-list-section.tsx` | 38 | 357 | Mittel |
| 15 | `applyPlayerLine` | `src/modules/seasons/infrastructure/simulation/match-result-persistence.ts` | 351 | 355 | Hoch |
| 16 | `DraftOverviewScreen` | `src/components/draft/draft-overview-screen.tsx` | 37 | 338 | Mittel |
| 17 | `AdminControlCenter` | `src/components/admin/admin-control-center.tsx` | 113 | 335 | Mittel |
| 18 | `calculateTeamMetrics` | `src/modules/seasons/application/simulation/match-engine.ts` | 1758 | 330 | Hoch |
| 19 | `simulateSeasonWeekForUser` | `src/modules/seasons/application/season-simulation.service.ts` | 58 | 324 | Hoch |
| 20 | `advanceToNextSeasonForUser` | `src/modules/seasons/application/season-management.service.ts` | 35 | 322 | Hoch |

## Stark gekoppelte interne Module

| Rang | Import-Ziel | Dependents | Bewertung |
|---:|---|---:|---|
| 1 | `src/modules/teams/domain/team.types` | 54 | Zentraler Domain-Typ; Aenderungen breit testen |
| 2 | `src/modules/shared/domain/enums` | 43 | Globaler Enum-Knoten; hohe Regressionsgefahr |
| 3 | `src/lib/utils/format` | 35 | Breite UI-/Copy-Abhaengigkeit |
| 4 | `src/components/ui/status-badge` | 32 | UI-Basisbaustein |
| 5 | `src/lib/auth/session` | 30 | Auth-/Session-kritisch |
| 6 | `src/lib/online/online-league-types` | 26 | Multiplayer-Domain-Typen |
| 7 | `src/components/layout/section-panel` | 25 | UI-Layout-Basis |
| 8 | `src/components/ui/stat-card` | 23 | UI-Metrik-Basis |
| 9 | `src/lib/random/seeded-rng` | 22 | Determinismus-kritisch |
| 10 | `src/lib/firebase/admin` | 18 | Server-only Firebase Admin SDK; Client-Import-Risiko |

## Dateien mit zu vielen Verantwortlichkeiten

| Datei | Verantwortlichkeiten | Warum problematisch |
|---|---|---|
| `src/lib/online/online-league-service.ts` | League CRUD, Membership, Draft, Week Flow, Training, Contracts, Finance, Media, Local Storage | Aenderungen an einem Fachbereich riskieren Nebenwirkungen in anderen |
| `src/lib/admin/online-admin-actions.ts` | Admin Guard Integration, Firebase Actions, lokale Actions, Week Simulation, Response Mapping | API-Sicherheit und Datenmutation liegen in sehr grosser Datei |
| `src/components/online/online-league-placeholder.tsx` | Dashboard UI, lokale States, derived data, Handler, Navigation, Statusanzeigen | Client-Komponente schwer zu reviewen und performance-sensibel |
| `src/components/admin/admin-league-detail.tsx` | Liga-Detail, Debug, Actions, Status, Results, Teams/Memberships | Mutierende und reine Anzeige-Logik schwer trennbar |
| `src/modules/seasons/application/simulation/match-engine.ts` | Match-Ablauf, Decisions, Scoring, Team Metrics, Event-Auswertung | Engine-Kern; hohe Komplexitaet, hoher Testbedarf |
| `src/modules/gameplay/application/outcome-resolution-engine.ts` | Play Outcome, Stats, Effekte, State Updates | Fehler wirken tief in Simulationsergebnisse |
| `scripts/seeds/e2e-seed.ts` | DB Preflight, Fixture-Welt, Savegame, League, Logging | Seed-Idempotenz schwer isoliert zu pruefen |

## Qualitative Risikoanalyse

### Hoch

- Engine-Kern (`match-engine`, `outcome-resolution-engine`, `season-simulation`) wegen deterministischer Ergebnisse und Spiellogik.
- Firebase/Admin/Online Writes wegen Datenintegritaet, Berechtigungen und Staging/Production-Risiko.
- Auth-/Session-/Firebase Admin Module wegen Client/Server-Grenzen.

### Mittel

- Grosse Client-Komponenten, weil UI/State/Handlers schwer reviewbar sind und Renderpfade groesser werden.
- Roster/Depth Chart/Draft-UI, weil sie grosse Listen und fachliche Constraints kombinieren.

### Niedrig

- Test-Fixture-Duplikate.
- Script-Report-Renderer.
- Reine Display-Komponenten ohne Datenmutation.

## Empfehlungen

1. Fuer hohe Risiken zuerst Tests und Charakterisierung ausbauen, nicht direkt refactoren.
2. Komplexe Client-Komponenten in reinen Schritten entlasten: Display, derived data, Handler.
3. Online-/Admin-Services nur ueber API-kompatible read-only Schnitte reduzieren.
4. Stark gekoppelte Typmodule mit Change-Risk-Checkliste versehen.
5. `src/lib/firebase/admin` weiter server-only halten und Client-Importe regelmaessig pruefen.

## Naechste Arbeitspakete

- AP-CX1: Characterization Tests fuer `simulateMatch` und Week Simulation erweitern.
- AP-CX2: `OnlineLeaguePlaceholder` weiter in kleine Hooks/Helper schneiden.
- AP-CX3: `AdminLeagueDetail` Display-Blöcke weiter extrahieren.
- AP-CX4: `online-admin-actions` Action-Gruppen dokumentieren und spaeter trennen.
- AP-CX5: Import-Grenzen fuer `firebase/admin` automatisiert pruefen.
