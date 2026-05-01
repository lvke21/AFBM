# Testability AP2: Seeded RNG Integration Report

Status: Gruen

## Ziel

Nicht-deterministische Zufallsquellen in kritischer Logik wurden auf einen zentralen, Seed-basierten Generator umgestellt. Wahrscheinlichkeiten, Balancing-Werte und Spielmechaniken wurden nicht geaendert.

Zielzustand:

- gleiche Inputs + gleicher Seed => identische RNG-Sequenz
- kein direktes `Math.random` mehr in produktivem `src`
- kein produktives `randomUUID`/`crypto.randomUUID` mehr in `src`
- zentrale RNG-Erzeugung mit serialisierbarem Zustand

## Neuer Zentraler Einstiegspunkt

Neu:

- `src/lib/random/seeded-rng.ts`

Exportierte API:

- `createRng(seedOrSnapshot)`
- `createSeededRandom(seed)`
- `createSeededId(prefix, seed, length)`
- `deriveSeed(seed, scope)`
- `hashSeed(input)`
- `SeededRngSnapshot`

Eigenschaften:

- Algorithmus: FNV-1a-artiger String-Hash + `mulberry32`
- schnell und leichtgewichtig
- deterministic fuer gleichen Seed
- serialisierbar ueber `snapshot()`
- fortsetzbar ueber `createRng(snapshot)`
- Substreams ueber `fork(scope)`

## Umgestellte RNG-Fassaden

Bestehende oeffentliche Funktionen bleiben erhalten, nutzen jetzt aber den zentralen RNG:

- `src/modules/seasons/application/simulation/simulation-random.ts`
  - `createSeededRandom`
  - `deriveSimulationSeed`

- `src/modules/gameplay/application/play-selection-engine.ts`
  - `createSelectionRandom`

- `src/modules/gameplay/application/outcome-resolution-engine.ts`
  - `createResolutionRandom`

- `src/modules/gameplay/application/receiver-matchup-resolution.ts`
  - `createReceiverMatchupRandom`

- `src/modules/gameplay/application/qb-decision-time-resolution.ts`
  - `createQuarterbackDecisionRandom`

- `src/modules/gameplay/application/press-coverage-resolution.ts`
  - `createPressCoverageRandom`

Damit bleiben Call-Sites stabil, aber die RNG-Implementierung ist nicht mehr mehrfach dupliziert.

## Ersetzte Nicht-Deterministische Quellen

### Simulation

- `src/modules/savegames/application/minimal-drive-simulation.ts`
  - eigener lokaler RNG wurde durch `createSeededRandom(seed)` ersetzt.
  - Seed bleibt aus Match-Kontext abgeleitet: `minimal-drive:${matchId}:w${week}:${homeOverall}-${awayOverall}`.
  - Wahrscheinlichkeitstabellen und Drive-Mechanik wurden nicht geaendert.

- `src/modules/seasons/infrastructure/simulation/simulation-api.service.ts`
  - `randomUUID()` fuer implizite `gameId` wurde entfernt.
  - Neue implizite IDs werden mit `createSeededId(...)` aus Simulation-API-Kontext und `createdAt` erzeugt.
  - Explizit uebergebene `gameId` bleibt unveraendert.

### Events / Online IDs

- `src/lib/online/online-league-service.ts`
  - Log-IDs nutzen `createSeededId("log", ...)`.
  - Event-IDs nutzen `createSeededId("event", ...)`.
  - Trade-IDs nutzen `createSeededId("trade", ...)`.
  - lokale Online-Entity-IDs nutzen `createSeededId(prefix, ...)`.

- `src/lib/admin/online-admin-actions.ts`
  - Admin-Liga-IDs nutzen `createSeededId(slug, ...)` statt `Math.random`.

- `src/lib/online/online-user-service.ts`
  - UUID-Fallback und Default-Username-Suffix nutzen `createRng(...)` statt `Math.random`.
  - `crypto.randomUUID` wurde in diesem produktiven Pfad entfernt.

## Validierung Der Fundstellen

Ausgefuehrt:

```bash
rg -n "Math\\.random|randomUUID|crypto\\.randomUUID" src --glob '!**/*.test.ts' --glob '!**/*.test.tsx'
```

Ergebnis:

- keine produktiven Treffer in `src`

Hinweis:

- Ein deterministischer `hashString` in `src/server/repositories/weekMatchStateRepository.firestore.ts` bleibt bestehen. Das ist keine Zufallsquelle, sondern ein Hash fuer systemische Firestore-Ergebnisse.

## Determinismusbewertung

### Gruen

- Core-Match-Simulation nutzt weiterhin `simulationSeed`.
- Game-Day-Availability und Injuries bleiben seedbasiert.
- Gameplay-Engine-RNGs sind zentralisiert.
- Produktive direkte `Math.random`-Aufrufe wurden entfernt.
- Produktive direkte UUID-Zufallsquellen wurden aus den geprueften `src`-Pfaden entfernt.

### Gelb / bewusstes Restrisiko

- Einige Entity-IDs werden mit `createdAt` oder `Date.now()` als Seed-Kontext erzeugt.
- Das ist kein globaler Zufall mehr, aber weiterhin zeitabhaengig.
- Fuer vollstaendige Replay-Faehigkeit sollten diese Flows spaeter eine explizite `operationSeed` oder injizierbare Clock erhalten.

### Nicht geaendert

- Wahrscheinlichkeiten
- Balancing-Konstanten
- Simulationsentscheidungslogik
- Draft-Mechanik
- Player-Progression-Regeln
- Injury-Wahrscheinlichkeiten

## Tests

Ausgefuehrt:

```bash
npx tsc --noEmit
npm run lint
```

Ergebnisse:

- `npx tsc --noEmit`: Gruen
- `npm run lint`: Gruen

## Offene Empfehlungen

1. `operationSeed` fuer Online/Admin/Simulation-API-Aktionen einfuehren.
2. Zeitquelle zentral injizieren, z.B. `now()`-Service fuer Tests.
3. Stable Tie-Breaker aus AP1 nachziehen:
   - Depth Chart final nach `player.id`
   - Match-Order final nach `id`
   - Playoff-Standings final nach `team.id`
4. Replay-Test einfuehren:
   - gleicher Match-Context + gleicher Seed => identischer Output
   - gleicher Week-Snapshot + gleicher Seed => identische Ergebnisse

## Fazit

Der Seed-basierte RNG ist zentral verfuegbar, serialisierbar und in den relevanten Simulations-/Gameplay-/Event-Pfaden angebunden. Direkte produktive `Math.random`- und UUID-Zufallsquellen in `src` wurden entfernt. Die naechste Testability-Stufe sollte explizite Operation-Seeds und stabile Tie-Breaker einfuehren.

Status: Gruen
