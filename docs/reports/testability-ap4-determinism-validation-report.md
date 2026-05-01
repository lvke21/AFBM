# Testability AP4: Determinism Validation Report

## Executive Summary

Status: Gruen

Die Simulation wurde mit automatisierten Replay-Tests gegen deterministisches Verhalten abgesichert. Gleiche Liga plus gleicher Seed erzeugt ueber mindestens 10 Ausfuehrungen identische Ergebnisse. Verschiedene Seeds erzeugen unterschiedliche Ergebnis-Fingerprints, bleiben aber fuer sich jeweils stabil.

Geprueft wurden:

- Score
- Gewinner
- Team-Stats
- Player-Stats
- Drive- und Event-Reihenfolge
- numerische Stabilitaet

## Neuer automatisierter Test

Datei:

- `src/modules/seasons/application/simulation/determinism-validation.test.ts`

Der Test baut eine feste Liga-Fixture mit denselben Teams, Rostern, Match-Metadaten und Schedule-Daten auf. Nur der Seed wird variiert.

## Testfaelle

### Gleiche Liga + gleicher Seed

Test:

- `replays the same league and seed identically across ten executions`

Vorgehen:

- feste Liga-Fixture
- Seed: `qa-determinism-same-league-seed`
- 10 Wiederholungen
- jede Wiederholung nutzt `generateMatchStats(buildLeagueFixture(seed), createRng(seed))`
- Ergebnis wird normalisiert und exakt mit dem Baseline-Ergebnis verglichen

Validierte Daten:

- `homeScore`
- `awayScore`
- abgeleiteter Gewinner
- `homeTeam`
- `awayTeam`
- komplette `playerLines`
- Drive/Event-Reihenfolge mit:
  - sequence
  - phase
  - offense/defense
  - resultType
  - points
  - score progression
  - plays
  - yards
  - turnover
  - summary

Ergebnis:

- 10/10 Wiederholungen identisch
- keine Reihenfolge-Abweichung
- keine minimale Score-/Stats-Abweichung

### Verschiedene Seeds

Test:

- `keeps different seeds stable while producing different results`

Vorgehen:

- sechs verschiedene Seeds
- pro Seed 10 Wiederholungen
- jede Seed-Gruppe muss exakt replaybar sein
- Fingerprints zwischen Seeds muessen mindestens einmal unterschiedlich sein

Ergebnis:

- alle Seeds stabil
- unterschiedliche Seeds erzeugen unterschiedliche Ergebnis-Fingerprints

## Fehlerklassen-Pruefung

### Minimale Abweichungen

Die Tests nutzen `toEqual` auf normalisierten Ergebnisobjekten. Es gibt keine Toleranzwerte. Jede kleine Abweichung in Score, Stats oder Drive-Daten wuerde fehlschlagen.

Status: Keine Abweichung gefunden.

### Reihenfolge-Instabilitaet

Die Event-Reihenfolge wird ueber `result.drives.map(...)` verglichen. Zusaetzlich wird geprueft, dass `sequence` exakt der Array-Reihenfolge entspricht.

Status: Keine Reihenfolge-Instabilitaet gefunden.

### Floating-Point-Probleme

Alle Zahlen im normalisierten Ergebnis werden rekursiv gesammelt und auf `Number.isFinite` sowie `Number.isInteger` geprueft.

Status: Keine nicht-finiten Werte und keine Fractional-Drifts gefunden.

## Ausgefuehrte Validierung

```bash
npx vitest run src/modules/seasons/application/simulation/determinism-validation.test.ts
```

Ergebnis:

- Test Files: 1 passed
- Tests: 2 passed

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

- Test Files: 135 passed
- Tests: 778 passed
- Hinweis: Vitest meldet bestehende Node-Deprecation-Warnings fuer `punycode`; keine Testfehler.

## Bewertung

Die deterministische Kernsimulation ist fuer den geprueften Liga-/Match-Pfad belastbar abgesichert:

- gleicher Seed: stabil
- verschiedene Seeds: stabil und unterschiedlich
- Score/Stats/Gewinner/Event-Reihenfolge: exakt reproduzierbar
- keine Hinweise auf Floating-Point-Drift

## Grenzen

- Der Test prueft einen repraesentativen Match-Simulationspfad mit zwei festen Teams und sechs Seed-Varianten.
- Persistenz- und Wall-Clock-Metadaten wie `updatedAt` oder `simulatedAt` sind nicht Teil dieses Ergebnis-Fingerprints.
- Vollstaendige Season-/Week-Replays mit Repository-Fixtures bleiben ein sinnvoller naechster Ausbau.

## Empfehlung

Naechster Schritt:

- Golden-Snapshot-Tests fuer mehrere bekannte Seeds speichern.
- Week-Simulation-End-to-End mit Repository-Fixtures deterministisch vergleichen.
- Optional CI-Job fuer deterministische Replay-Tests separat markieren, damit Seed-Regressions sofort sichtbar sind.

Status: Gruen
