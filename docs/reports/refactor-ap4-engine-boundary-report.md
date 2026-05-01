# Refactor AP4: Engine Boundary Report

Status: Gruen

## Executive Summary

AP4 trennt die Season-/Game-Engine klarer von App-Infrastruktur. Die produktiven Dateien unter `src/modules/seasons/application/simulation` enthalten nach dem Schnitt keine Prisma-, Repository-, API-Store-, React-, Next-, Firebase-, Firestore-, Browser-Storage-, Router- oder Multiplayer-Abhaengigkeiten mehr.

Das Verhalten wurde stabil gehalten: Die bestehenden Use-Cases, API-Routen und Tests nutzen weiterhin dieselben Funktionen, importieren sie aber nun aus der Infrastruktur-/Adapter-Schicht.

## Ausgangslage

Die Gameplay-Engine unter `src/modules/gameplay` war bereits weitgehend sauber. Die relevanten Grenzverletzungen lagen in `src/modules/seasons/application/simulation`:

- Match-Kontext-Mapping war an Repository-Typen gekoppelt.
- Match-Result-Persistenz lag im Engine-Ordner und kannte Prisma/Repository-Commands.
- Weekly Preparation schrieb direkt ueber Command-Repositories und Player-History.
- Stat-Anchor-Reparatur schrieb Persistenz-Shells.
- Playoff-Scheduling erzeugte Matches ueber Persistenz-Repositories.
- Player Development enthielt Prisma-Transaktionen und Team-State-Recalculation.
- Simulation API Service hielt einen In-Memory-Store und validierte API-Input im Engine-Ordner.

Damit war die reine Engine zwar funktional testbar, aber die Ordnergrenze war unscharf: App-/Persistenzadapter lagen neben deterministischen Simulationsmodulen.

## Identifizierte Infrastruktur-Abhaengigkeiten

| Alte Datei | Infrastruktur-Abhaengigkeit | Bewertung |
| --- | --- | --- |
| `src/modules/seasons/application/simulation/match-context.ts` | Repository-Typ fuer Week-Match-Records | Adapter, nicht Engine |
| `src/modules/seasons/application/simulation/match-result-persistence.ts` | `@prisma/client`, Command Repository, Player History | Persistenzadapter |
| `src/modules/seasons/application/simulation/player-development.ts` | `Prisma.TransactionClient`, DB-Updates, Team-Recalculation | Persistenzadapter |
| `src/modules/seasons/application/simulation/playoff-scheduling.ts` | `Prisma.TransactionClient`, Command Repository | Persistenzadapter |
| `src/modules/seasons/application/simulation/stat-anchors.ts` | Command/Query Repository, Stat-Shell-Erzeugung | Persistenzadapter |
| `src/modules/seasons/application/simulation/weekly-preparation.ts` | Command Repository, Player History | Persistenzadapter |
| `src/modules/seasons/application/simulation/simulation-api.service.ts` | In-Memory Store, API-Input-Validation, `randomUUID`, `zod` | API Adapter |

## Umgesetzter Schnitt

Diese Dateien wurden aus dem Engine-Ordner in die Infrastruktur-Schicht verschoben:

| Von | Nach |
| --- | --- |
| `src/modules/seasons/application/simulation/match-context.ts` | `src/modules/seasons/infrastructure/simulation/match-context.ts` |
| `src/modules/seasons/application/simulation/match-context.test.ts` | `src/modules/seasons/infrastructure/simulation/match-context.test.ts` |
| `src/modules/seasons/application/simulation/match-result-persistence.ts` | `src/modules/seasons/infrastructure/simulation/match-result-persistence.ts` |
| `src/modules/seasons/application/simulation/match-result-persistence.test.ts` | `src/modules/seasons/infrastructure/simulation/match-result-persistence.test.ts` |
| `src/modules/seasons/application/simulation/player-development.ts` | `src/modules/seasons/infrastructure/simulation/player-development.ts` |
| `src/modules/seasons/application/simulation/player-development.test.ts` | `src/modules/seasons/infrastructure/simulation/player-development.test.ts` |
| `src/modules/seasons/application/simulation/playoff-scheduling.ts` | `src/modules/seasons/infrastructure/simulation/playoff-scheduling.ts` |
| `src/modules/seasons/application/simulation/stat-anchors.ts` | `src/modules/seasons/infrastructure/simulation/stat-anchors.ts` |
| `src/modules/seasons/application/simulation/stat-anchors.test.ts` | `src/modules/seasons/infrastructure/simulation/stat-anchors.test.ts` |
| `src/modules/seasons/application/simulation/weekly-preparation.ts` | `src/modules/seasons/infrastructure/simulation/weekly-preparation.ts` |
| `src/modules/seasons/application/simulation/weekly-preparation.test.ts` | `src/modules/seasons/infrastructure/simulation/weekly-preparation.test.ts` |
| `src/modules/seasons/application/simulation/simulation-api.service.ts` | `src/modules/seasons/infrastructure/simulation/simulation-api.service.ts` |
| `src/modules/seasons/application/simulation/simulation-api.service.test.ts` | `src/modules/seasons/infrastructure/simulation/simulation-api.service.test.ts` |

## Aktualisierte Call-Sites

- `src/modules/seasons/application/season-simulation.service.ts`
  - importiert Persistenz-/Adapter-Funktionen nun aus `../infrastructure/simulation/*`.
  - behält reine Engine-Funktionen aus `./simulation/*`.
- `src/modules/seasons/application/season-simulation.service.test.ts`
  - Mocks auf neue Adapterpfade angepasst.
- `src/app/api/simulation/*`
  - API-Routen importieren `simulation-api.service` aus der Infrastruktur-Schicht.
- `src/modules/savegames/application/weekly-player-development.service.ts`
  - nutzt Player-Development-Persistenzadapter aus `infrastructure/simulation`.
- `src/modules/teams/application/team-roster.service.ts`
- `src/modules/teams/application/team-trade.service.ts`
- `src/modules/seasons/application/season-management.service.ts`
  - Team-State-Recalculation auf neuen Adapterpfad umgestellt.

## Aktuelle Engine-Grenze

Produktive Engine-Dateien bleiben unter:

```text
src/modules/seasons/application/simulation/
  depth-chart.ts
  engine-rules.ts
  engine-state-machine.ts
  extended-season-balance-suite.ts
  fatigue-recovery.ts
  game-balance.ts
  match-engine.ts
  player-condition.ts
  production-qa-suite.ts
  season-progression.ts
  simulation-balancing.ts
  simulation-debug.service.ts
  simulation-orchestrator.ts
  simulation-random.ts
  simulation.types.ts
```

Adapter und Persistenz liegen unter:

```text
src/modules/seasons/infrastructure/simulation/
  match-context.ts
  match-result-persistence.ts
  player-development.ts
  playoff-scheduling.ts
  season-simulation.command-repository.ts
  season-simulation.repository.ts
  simulation-api.service.ts
  stat-anchors.ts
  weekly-preparation.ts
```

## Boundary Check

Suche in produktiven Engine-Dateien:

```text
src/modules/gameplay
src/modules/seasons/application/simulation
```

Gepruefte Infrastruktur-Marker:

- React / Next / Router / `redirect` / `notFound`
- Firebase / Firestore
- Prisma / DB-Prisma-Client
- `localStorage` / `sessionStorage` / `window` / `document`
- Online-/Multiplayer-spezifische Services
- Season Simulation Repositories
- Simulation API Store

Ergebnis: Keine produktiven Treffer in `src/modules/seasons/application/simulation`. Die Treffer in `src/modules/gameplay` waren nur fachliche Textstrings mit dem Wort `window`, keine Browser-API-Abhaengigkeiten.

## Verhalten

Kein fachliches Verhalten wurde geaendert:

- Match Engine bleibt deterministisch.
- Simulation-Orchestrierung ruft dieselben Use-Cases auf.
- API-Routen liefern dieselben Responses.
- Persistenzfunktionen wurden verschoben, nicht umgeschrieben.
- Tests wurden auf neue Pfade angepasst.

## Validierung

| Befehl | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/engine-state-machine.test.ts src/modules/seasons/application/simulation/simulation-orchestrator.test.ts src/modules/seasons/application/simulation/simulation-balancing.test.ts src/modules/seasons/application/simulation/production-qa.test.ts src/modules/seasons/infrastructure/simulation/match-context.test.ts src/modules/seasons/infrastructure/simulation/match-result-persistence.test.ts src/modules/seasons/infrastructure/simulation/player-development.test.ts src/modules/seasons/infrastructure/simulation/simulation-api.service.test.ts src/modules/seasons/infrastructure/simulation/stat-anchors.test.ts src/modules/seasons/infrastructure/simulation/weekly-preparation.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/app/api/simulation/simulation-routes.test.ts` | Gruen, 11 Testdateien / 49 Tests |
| `npx vitest run src/modules/gameplay src/modules/seasons/application/simulation src/modules/seasons/infrastructure/simulation` | Gruen, 32 Testdateien / 190 Tests |

## Verbleibende Risiken

- `match-engine.ts` bleibt mit ueber 5.000 Zeilen sehr gross. Das ist jetzt eher ein fachlicher Modularisierungsauftrag, nicht mehr primaer ein Infrastruktur-Boundary-Problem.
- `extended-season-balance-suite.ts` und `production-qa-suite.ts` liegen weiterhin im Engine-Ordner, sind aber QA-/Harness-Code ohne App-Infrastruktur.
- `simulation-debug.service.ts` ist engine-nah, aber breit. Eine spaetere Trennung in Debug-Report-Builder und reine Engine-Diagnostics waere sinnvoll.
- `player-development.ts` liegt nun als Persistenzadapter in `infrastructure/simulation`; eine spaetere feinere Trennung in pure Development-Plans und DB-Apply-Schicht waere moeglich.

## Fazit

Die Engine-Grenze ist nach AP4 deutlich sauberer: reine Simulation bleibt in `application/simulation`, App-/Persistenz-/API-Adapter liegen in `infrastructure/simulation`. Die bestehende Funktionalitaet wurde ueber TypeScript, Lint und breite Engine-/Simulationstests validiert.

Status: Gruen
