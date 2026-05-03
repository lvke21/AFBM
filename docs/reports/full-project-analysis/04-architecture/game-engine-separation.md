# Game Engine Separation

Stand: 2026-05-02

## Ziel der Analyse

Bewertung, wie gut Game Engine, Simulation, Week Flow, Singleplayer und Multiplayer voneinander getrennt sind und wo Architekturentscheidungen die Engine-Weiterentwicklung riskant machen.

## Untersuchte Dateien/Bereiche

- `src/modules/gameplay/*`
- `src/modules/seasons/application/simulation/*`
- `src/modules/seasons/infrastructure/simulation/*`
- `src/modules/savegames/application/week-flow.service.ts`
- `src/lib/online/online-game-simulation.ts`
- `src/lib/online/online-league-week-simulation.ts`
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`

## Aktuelle Engine-Karte

```text
Singleplayer Week Flow
  -> savegames/application/week-flow.service
  -> seasons/application/simulation
  -> seasons/infrastructure/simulation/match-engine
  -> gameplay domain/application
  -> teams/players domain
  -> persistence repositories

Multiplayer Week Flow
  -> admin API simulateWeek
  -> admin/online-admin-actions
  -> admin/online-week-simulation
  -> online/online-league-week-simulation
  -> online/online-game-simulation
  -> gameplay/application/minimal-match-simulation
  -> Firestore writes
```

## Wichtigste Findings

1. Die grosse Singleplayer-Simulation ist in `src/modules` isoliert und wird nicht direkt von UI-Komponenten gesteuert.
2. Multiplayer nutzt nicht blind die volle Singleplayer-Engine, sondern Adapter/Fallbacks in `online-game-simulation.ts`.
3. Das ist aktuell sicherer fuer Firebase-Daten, aber es erzeugt zwei Simulationspfade mit moeglichen fachlichen Abweichungen.
4. Week Simulation fuer Online laeuft serverseitig ueber Admin API, nicht direkt im Client. Das ist richtig.
5. Engine-Dateien sind intern sehr gross: `match-engine.ts`, `play-library.ts`, `play-selection-engine.ts`, `outcome-resolution-engine.ts`.
6. `play-library.ts` ist eher Content-/Regel-Daten, aber als TS-Modul potentiell bundle-/parse-riskant, falls falsch importiert.
7. Singleplayer Week Flow koppelt Simulation, Persistence, Player Development und Season Transition eng.
8. Online Week Flow koppelt Schedule, Results, Standings und Firestore Transaction/Locking in Admin/Online-Modulen.

## Gute Trennungen

- UI simuliert keine echte Liga-Woche direkt.
- Admin Week Simulation nutzt serverseitige Guards.
- Online Game Simulation ist als Adaptermodul sichtbar.
- Domain-nahe Engine nutzt keine React-Komponenten.
- Tests fuer Online Week Simulation und Firestore Parity existieren.

## Schwache Trennungen

### Zwei Engine-Sprachen

Singleplayer nutzt die grosse Season/Match Engine. Multiplayer nutzt eine kleinere Online-Game-Simulation mit kontrollierten Fallbacks.

Risiko: Ergebnisse, Ratings, Injuries, Stats und Records koennen zwischen Modi auseinanderlaufen.

Empfehlung: Gemeinsames Engine-Port-Interface definieren:

```text
SimulationTeamAdapter -> EngineInput -> EngineResult -> ResultReducer
```

Dann koennen Singleplayer und Multiplayer unterschiedliche Adapter, aber denselben Kernvertrag nutzen.

### Week Flow und Persistence nahe beieinander

Singleplayer:

- `week-flow.service.ts` orchestriert kritische Spielfortschritte.

Multiplayer:

- `online-admin-actions.ts` fuehrt Simulation und Firestore Writes zusammen.

Risiko: Refactors koennen halb gespeicherte oder doppelte Week-States erzeugen.

Empfehlung: Reducer fuer Week Result/Standings rein halten, Persistence nur als Transaction-Orchestrierung.

### Engine-Groesse

`match-engine.ts` und verwandte Dateien sind zu gross fuer sichere Verhaltensaenderungen ohne sehr starke Tests.

Empfehlung: Keine Engine-Refactors ohne:

- deterministische Golden-Master-Snapshots
- Seed-basierte Regression
- Balance-Suite
- Performance-Budget

## Minimal sinnvolle Zielarchitektur

```text
modules/seasons/application/simulation
  engine port
  deterministic simulation input/output
  pure result reducers

modules/gameplay
  play library
  play selection
  outcome resolution
  no persistence

lib/online
  online team adapter
  online schedule adapter
  online standings reducer

lib/admin
  transaction command only
```

## Risiken

- Eine Vereinheitlichung der Engine kann Multiplayer-Balance veraendern.
- Online-Fallbacks koennen Spielerfahrung vereinfachen, aber unklar kommuniziert werden.
- Engine-Content in TS kann bei falschen Client-Imports Bundle-Risiken erzeugen.
- Week Flow ist releasekritisch; kleine Fehler wirken direkt auf Spielstaende.

## Empfehlungen

1. Engine erst nicht zerlegen, sondern Vertrag dokumentieren.
2. Online/Singleplayer Result-DTOs vergleichen und gemeinsame Minimalfelder definieren.
3. Pure Standings-/Record-Reducer aus Persistence-Kontext herausloesen.
4. Online Simulation Adapter testseitig gegen plausible Singleplayer-Engine-Erwartungen absichern.
5. Play Library mittelfristig in data-only Chunks trennen, aber erst nach Import-Analyse.

## Offene Fragen

- Soll Multiplayer langfristig die volle Singleplayer-Engine verwenden?
- Welche Stats muessen fuer Multiplayer MVP wirklich persistiert werden?
- Werden Injuries, Contracts und Development im Online-Modus MVP-relevant?

## Naechste Arbeitspakete

- AP-GE1: Engine-Port-Interface als Dokument/Typentwurf ohne Implementierungswechsel.
- AP-GE2: Online Simulation Adapter Golden Tests erweitern.
- AP-GE3: Pure Result/Standings Reducer weiter isolieren.
- AP-GE4: Engine-Content Import-Grenzen pruefen.
- AP-GE5: Erst danach kleine Engine-Interne Refactors.
