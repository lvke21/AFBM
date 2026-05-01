# Testability AP3: Seed Propagation Report

## Executive Summary

Status: Gruen

Die kritischen Simulationspfade verwenden jetzt einen zentralen deterministischen RNG-Einstieg und koennen explizit mit einer RNG-Instanz ausgefuehrt werden. Die wichtigsten APIs sind damit seed-faehig:

- `simulateGame(context, rng)` in der Match Engine
- `simulateGame(gameId, rng?)` im Simulation API Service
- `simulateWeek(input, rng)` fuer die Week Simulation
- `simulateMinimalDriveGame(input, rng?)` fuer den Offline-Minimal-Drive-Flow

Gleiche Inputs mit gleichem Seed wurden mehrfach gegen Match Engine, Simulation API und Minimal-Drive-Simulation getestet. Die Ergebnisse sind identisch.

## Zielbild

Die Simulation soll keine globalen oder implizit nicht-deterministischen Zufallsquellen nutzen. Ein Seed wird an der API-Grenze in eine `SeededRng`-Instanz uebersetzt und danach explizit weitergegeben oder ueber deterministische Substreams abgeleitet.

Zentrale RNG-API:

- `createRng(seed)`
- `rng.fork(scope)`
- `rng.snapshot()`
- `createSeededRandom(seed)` als Kompatibilitaetswrapper fuer aeltere Engine-Resolver
- `createSeededId(prefix, seed, length)` fuer deterministische IDs

## Implementierte Seed-Propagation

### Match Simulation

Datei: `src/modules/seasons/application/simulation/match-engine.ts`

- `simulateMatch(context, rng)` akzeptiert jetzt `RandomSource`.
- `generateMatchStats(context, rng)` leitet denselben RNG an `simulateMatch` weiter.
- `simulateGame(context, rng)` wurde als klare Game-Simulation-API ergaenzt.
- Der Default bleibt kompatibel: Wenn kein RNG uebergeben wird, entsteht er nur am API-Einstieg aus `context.simulationSeed`.

### Week Simulation

Datei: `src/modules/seasons/application/season-simulation.service.ts`

- `simulateSeasonWeekForUser(input, { rng })` akzeptiert eine optionale RNG-Instanz.
- Pro Match wird ein deterministischer Substream erzeugt:
  - `rng.fork("match:<matchId>:<simulationSeed>")`
- Ohne explizite RNG-Instanz wird weiterhin `context.simulationSeed` verwendet.
- `simulateWeek(input, rng)` wurde als klare Week-Simulation-API ergaenzt.

### Simulation API

Datei: `src/modules/seasons/infrastructure/simulation/simulation-api.service.ts`

- `simulateGame(gameId, rng?)` akzeptiert eine externe `SeededRng`-Instanz.
- Ohne externe Instanz wird `createRng(game.seed)` nur am Service-Einstieg erzeugt.
- Die eigentliche Match Simulation nutzt einen geforkten Match-Substream.

### Minimal Drive Simulation

Datei: `src/modules/savegames/application/minimal-drive-simulation.ts`

- Die lokale eigene RNG-Implementierung wurde entfernt.
- `simulateMinimalDriveGame(input, rng?)` nutzt jetzt den zentralen RNG.
- Der Default-Seed bleibt aus den bestehenden Input-Daten abgeleitet.

### Event- und Resolver-Systeme

Die Gameplay-Resolver verwenden weiterhin `createSeededRandom(seed)` als Kompatibilitaetswrapper. Das ist kein globaler RNG, sondern ein deterministischer Wrapper um `createRng(seed).next`.

Betroffene Resolver:

- `play-selection-engine.ts`
- `outcome-resolution-engine.ts`
- `receiver-matchup-resolution.ts`
- `qb-decision-time-resolution.ts`
- `press-coverage-resolution.ts`

## RNG-Audit

Ausgefuehrte Suche:

```bash
rg -n "Math\.random|randomUUID|crypto\.randomUUID|createRng\(|createSeededRandom\(|createSeededId\(" src --glob '!**/*.test.ts' --glob '!**/*.test.tsx'
```

Ergebnis:

- Keine direkten `Math.random`-Treffer in Produktcode.
- Keine direkten `randomUUID`- oder `crypto.randomUUID`-Treffer in Produktcode.
- Verbleibende `createRng`-/`createSeededRandom`-/`createSeededId`-Treffer liegen an zentralen RNG-Grenzen, deterministischen Substreams oder nicht-simulativen Online/Admin-ID-Pfaden.

Einordnung:

- Kritische Simulation: deterministisch.
- Online/Admin-Zeitstempel und UI-nahe lokale IDs: nicht Teil des deterministischen Match-Ergebnisses.
- Persistenzzeitpunkte wie `simulatedAt`/`updatedAt`: beeinflussen nicht das Ergebnis, koennen aber bei Snapshot-Vergleichen bewusst ausgeklammert werden.

## Tests

### Neu oder erweitert

- `src/lib/random/seeded-rng.test.ts`
  - gleicher Seed erzeugt gleiche Sequenz
  - Snapshot kann serialisiert und fortgesetzt werden

- `src/modules/seasons/application/simulation/match-engine.test.ts`
  - explizite RNG-Instanzen mit gleichem Seed erzeugen identische Match-Ergebnisse

- `src/modules/seasons/infrastructure/simulation/simulation-api.service.test.ts`
  - Simulation API replayt mit gleicher RNG-Instanz und gleichem Seed identische Ergebnisse

- `src/modules/savegames/application/minimal-drive-simulation.test.ts`
  - Minimal-Drive-Simulation replayt mit expliziten RNG-Instanzen identisch

### Ausgefuehrte Validierung

```bash
npx vitest run src/lib/random/seeded-rng.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/infrastructure/simulation/simulation-api.service.test.ts src/modules/savegames/application/minimal-drive-simulation.test.ts
```

Ergebnis:

- Test Files: 4 passed
- Tests: 29 passed

```bash
npx tsc --noEmit
```

Ergebnis: Gruen

```bash
npm run lint
```

Ergebnis: Gruen

```bash
npm test -- --run
```

Ergebnis:

- Test Files: 134 passed
- Tests: 776 passed
- Hinweis: Vitest meldet mehrere Node-Deprecation-Warnings fuer `punycode`; keine Testfehler.

## Bekannte Grenzen

- Zeitstempel in Persistenz-, Admin- und Online-Flows bleiben zeitabhaengig. Diese Werte sind Metadaten und nicht Teil der deterministischen Simulationsergebnisberechnung.
- Einige alte Resolver behalten den Funktionsnamen `createSeededRandom`, nutzen intern aber den zentralen `createRng`.
- `generateMatchStats(context)` erzeugt aus Kompatibilitaetsgruenden weiterhin am API-Einstieg einen Default-RNG aus `context.simulationSeed`, wenn kein RNG uebergeben wird. Kritische Call-Sites koennen und sollen explizit `rng` uebergeben.

## Empfehlung

Naechster sinnvoller Schritt:

- Snapshot-basierte Regressionstests fuer ausgewaehlte Seeds einfuehren.
- Week-Simulation mit Repository-Fixtures end-to-end gegen wiederholte Seeds absichern.
- Optional alte Resolver-Signaturen von `() => number` auf `SeededRng` migrieren, sobald keine Kompatibilitaetsrisiken mehr bestehen.

## Fazit

Der Seed wird in den kritischen Simulationspfaden konsistent propagiert. Versteckte nicht-deterministische Random-Quellen in der Simulation wurden nicht gefunden. Die vorhandenen RNG-Erzeugungen sind entweder zentrale API-Einstiege, deterministische Substreams oder nicht-simulative ID-/Metadatenpfade.

Status: Gruen
