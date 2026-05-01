# Testability AP6: Regression Tests Report

## Executive Summary

Status: Gruen

Deterministische Snapshot-Regressionstests fuer die Simulation wurden erstellt. Sie frieren zentrale Engine-Ergebnisse ein, sodass unbeabsichtigte Aenderungen an Scoring, Stats, Event-Reihenfolge oder Mini-Season-Outcomes sofort sichtbar werden.

## Neue Testdateien

- `src/modules/seasons/application/simulation/simulation-regression-snapshots.test.ts`
- `src/modules/seasons/application/simulation/__snapshots__/simulation-regression-snapshots.test.ts.snap`

## Snapshot-Abdeckung

### Match Result

Test:

- `snapshots a canonical match result`

Seed:

- `balanced-game`

Snapshot-Inhalt:

- finaler Score
- Gewinner
- Anzahl Drives
- geplante Drives
- komplette Drive/Event-Reihenfolge mit:
  - sequence
  - phase
  - offense
  - resultType
  - points
  - totalYards
  - turnover
  - Score nach Drive
  - Summary

### Stats

Test:

- `snapshots canonical stats output`

Seed:

- `high-scoring`

Snapshot-Inhalt:

- Team-Stats fuer Home/Away
- Passing Leaders
- Rushing Leaders
- Receiving Leaders
- Defensive Leaders

### Season Outcome

Test:

- `snapshots a deterministic mini-season outcome`

Seeds:

- `balanced-game`
- `high-scoring`
- `edge-case`
- `low-rating`
- `high-scoring:return`
- `edge-case:return`

Snapshot-Inhalt:

- Spielplan-Ergebnisse einer kleinen Mini-Season
- Winner pro Spiel
- Scores pro Spiel
- sortierte Standings mit:
  - wins
  - losses
  - ties
  - pointsFor
  - pointsAgainst
  - pointDiff

## Expected vs Actual

Expected:

- Die Snapshot-Datei `simulation-regression-snapshots.test.ts.snap`

Actual:

- Zur Testlaufzeit neu erzeugte Simulationsergebnisse aus `generateMatchStats(...)`

Vergleich:

- Vitest `toMatchSnapshot()`
- Bei jeder unbeabsichtigten Engine- oder Balancing-Aenderung schlagen die Tests fehl und zeigen den Diff zwischen expected Snapshot und actual Ergebnis.

## Stabilitaetsmassnahmen

Die Snapshot-Objekte sind bewusst normalisiert:

- keine Wall-Clock-Zeitstempel
- keine Persistenz-Metadaten
- keine `createdAt`/`updatedAt`/`simulatedAt`
- stabile Player-IDs statt nicht vorhandener Namensfelder
- sortierte Leaderboards mit stabiler Tie-Break-Order
- sortierte Mini-Season-Standings mit stabilem Tie-Break

Snapshot-Audit:

- keine `Date`
- kein `createdAt`
- kein `updatedAt`
- kein `simulatedAt`
- kein `NaN`
- kein `undefined`

## Snapshot-Regel

Snapshots duerfen nur aktualisiert werden, wenn die Engine- oder Balancing-Aenderung bewusst gewollt ist.

Empfohlener Ablauf bei bewusstem Update:

1. Engine-/Balancing-Aenderung fachlich begruenden.
2. Snapshot-Diff pruefen.
3. Report oder PR-Notiz mit dem erwarteten Verhalten ergaenzen.
4. Snapshot gezielt aktualisieren:

```bash
npx vitest run src/modules/seasons/application/simulation/simulation-regression-snapshots.test.ts -u
```

## Ausgefuehrte Validierung

```bash
npx vitest run src/modules/seasons/application/simulation/simulation-regression-snapshots.test.ts
```

Ergebnis:

- Test Files: 1 passed
- Tests: 3 passed

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

- Test Files: 136 passed
- Tests: 782 passed
- Hinweis: Vitest meldet bestehende Node-Deprecation-Warnings fuer `punycode`; keine Testfehler.

## Bewertung

Die Regressionsebene deckt jetzt drei wichtige Risikoarten ab:

- direkte Match-Ergebnisverschiebungen
- Stats-/Leader-Verschiebungen
- aggregierte Season-Outcome-Verschiebungen

Damit werden unbeabsichtigte Engine- und Balancing-Aenderungen sofort sichtbar.

## Grenzen

- Die Mini-Season ist ein deterministisches QA-Fixture, kein voller Repository-/Persistenz-End-to-End-Seasonlauf.
- Snapshots pruefen bewusst ausgewaehlte Ergebnisoberflaechen, nicht jedes interne Zwischenobjekt.
- Wenn Gameplay bewusst neu balanciert wird, sind Snapshot-Diffs erwartbar und muessen dokumentiert aktualisiert werden.

Status: Gruen
