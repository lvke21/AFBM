# Testability AP5: Standard Test Seeds Report

## Executive Summary

Status: Gruen

Feste Standard-Seeds fuer Simulationstests und Debugging wurden zentral definiert und in die Determinismus-Tests integriert. Bugs koennen damit ueber stabile, benannte QA-Szenarien reproduziert werden.

## Neue Seed-Konfiguration

Datei:

- `src/modules/seasons/application/simulation/simulation-test-seeds.ts`

Exportierte Standard-Seeds:

- `balanced-game`
- `high-scoring`
- `edge-case`
- `low-rating`

Zusatzexports:

- `STANDARD_SIMULATION_TEST_SEEDS`
- `STANDARD_SIMULATION_TEST_SEED_LIST`
- `SIMULATION_TEST_SEED_SCENARIOS`
- `StandardSimulationTestSeed`
- `SimulationTestSeedScenario`

## Mapping: Seed zu erwartetem Verhalten

| Seed | Fixture | Erwartetes QA-Verhalten |
| --- | --- | --- |
| `balanced-game` | Regular Season, 76 vs. 76 Overall | Balanced baseline fixture fuer normale Scoring-, Winner- und Event-Order-Replay-Checks. |
| `high-scoring` | Regular Season, 89 vs. 87 Overall | High-talent fixture fuer Scoring-Volumen, explosive Plays und Stats-Replay-Checks. |
| `edge-case` | Playoff, 78 vs. 78 Overall | Close-strength fixture fuer Late-Game-, Turnover- und Event-Sequence-Stabilitaet. |
| `low-rating` | Regular Season, 55 vs. 56 Overall | Low-rating fixture fuer sloppy-game, punt-heavy und low-efficiency Stats-Replay-Checks. |

Wichtig: Die Seeds aendern keine Gameplay-Regeln. Das erwartete Verhalten beschreibt den QA-Kontext des Fixtures, nicht hart kodierte Gameplay-Resultate.

## Integration in Tests

Datei:

- `src/modules/seasons/application/simulation/determinism-validation.test.ts`

Anpassungen:

- Der Same-Seed-Replay-Test nutzt jetzt `balanced-game`.
- Der Different-Seeds-Test iteriert ueber `STANDARD_SIMULATION_TEST_SEED_LIST`.
- Ein zusaetzlicher Test stellt sicher, dass alle dokumentierten Standard-Seeds abgedeckt sind.
- Pro Seed wird das Ergebnis weiter exakt replayt und normalisiert verglichen.

Gepruefte Ergebnisbereiche:

- Score
- Gewinner
- Team-Stats
- Player-Stats
- Drive/Event-Reihenfolge
- finite und ganzzahlige numerische Werte

## Debugging-Nutzung

Empfohlene Verwendung:

```ts
import {
  SIMULATION_TEST_SEED_SCENARIOS,
  STANDARD_SIMULATION_TEST_SEEDS,
} from "@/modules/seasons/application/simulation/simulation-test-seeds";
```

Beispiel:

```ts
const seed = STANDARD_SIMULATION_TEST_SEEDS.EDGE_CASE;
const scenario = SIMULATION_TEST_SEED_SCENARIOS[seed];
```

Ein UI-Debug-Modus wurde bewusst nicht eingefuehrt, weil die Aufgabe keine sichtbare UI-Aenderung verlangt und Gameplay/UI ausserhalb von Debug-Anzeigen unveraendert bleiben soll.

## Ausgefuehrte Validierung

```bash
npx vitest run src/modules/seasons/application/simulation/determinism-validation.test.ts
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

- Test Files: 135 passed
- Tests: 779 passed
- Hinweis: Vitest meldet bestehende Node-Deprecation-Warnings fuer `punycode`; keine Testfehler.

## Bewertung

Die QA-Seed-Basis ist jetzt reproduzierbar und zentral wartbar. Neue Regressions- oder Debug-Tests koennen benannte Seeds statt frei formulierter Ad-hoc-Strings verwenden.

## Naechste Empfehlung

- Fuer haeufige Bugklassen optional Golden-Snapshots pro Standard-Seed einfuehren.
- Bei zukuenftigen Debug-Reports immer Seed und Scenario-Key mitschreiben.
- Ein UI-Debug-Badge mit Seed-Anzeige erst einfuehren, wenn ein konkreter Debug-Flow dafuer geplant ist.

Status: Gruen
