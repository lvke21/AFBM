# Depth Chart Impact Validation Report

## Status
Gruen

## Executive Summary
Der Depth-Chart-Impact wirkt messbar, bleibt aber kontrolliert. Im 100-Spiele-Vergleich verbessert das beste Lineup gegenueber dem schlechtesten Lineup die Win Rate um `+17pp`, Punkte pro Spiel um `+3.12` und Point Differential um `+4.57`. Der Effekt ist klar kleiner als ein echter Team-/Rating-Gap: ein 84-OVR-Team gegen ein 68-OVR-Team erzeugt im gleichen 100-Spiele-Setup `+30.18` Point Differential pro Spiel.

Die Kontrollgruppe mit identischem Lineup ist exakt deterministisch (`0.000` Delta in allen gemessenen Kennzahlen). Damit ist der gemessene Effekt reproduzierbar und nicht durch Harness-Zufall verursacht.

## Code-Audit

### Eingriffspunkte
- `src/modules/seasons/application/simulation/match-engine.ts`
  - `STARTER_LINEUP_BONUS = 1.04`
  - `BACKUP_LINEUP_PENALTY = 0.97`
  - `RESERVE_LINEUP_PENALTY = 0.95`
  - `lineupAdjustedSkill(...)` multipliziert bestehende Skill-Werte anhand `depthChartSlot`.
- `src/modules/seasons/application/simulation/simulation.types.ts`
  - `MatchSimulationResult.engineNotes?: string[]` fuer optionales Logging.

### Betroffene Engine-Metriken
- QB: `quarterbackPassing`, `quarterbackDecision`, `passGame`, `ballSecurity`.
- RB/FB: `rushingSkill`, `runGame`, `ballSecurity`.
- OL: `passProtection`, `runBlocking`, `passGame`, `runGame`.
- Defense: `passRushSkill`, `coverageUnitSkill`, `frontSevenSkill`, `passDefense`, `runDefense`, `takeawayPressure`.

### Bewertung
- Nutzt nur vorhandene Ratings, Attribute, Readiness und `depthChartSlot`.
- Keine neuen Attribute.
- Keine neue Engine-Architektur.
- Modifier liegen innerhalb der Vorgabe von maximal `+/-3-5%`.
- Der Modifier greift vor bestehenden Team-Metriken, aber nicht direkt als harter Win-/Score-Bonus.
- Versteckte Nebenwirkung: `depthChartSlot` bestimmt bereits Starter-/Rotation-Sortierung und Snaps. Der neue Modifier verstaerkt diese bestehende Bedeutung leicht. Das ist fachlich gewollt, sollte aber bei kuenftigen Balance-Aenderungen mitgedacht werden.
- Logging ist bewusst allgemein: es bestaetigt, dass Starter-Bonus-Bereiche vorhanden sind, nicht dass ein einzelnes Play kausal exakt durch den Bonus entschieden wurde.

## Testsetup
- Engine: `generateMatchStats`.
- Teams fuer Lineup-Test:
  - Home: `BOS`, Boston Guardians, Roster Index `0`, Prestige `74`.
  - Away: `NYT`, New York Titans, Roster Index `1`, Prestige `74`.
- Spiele pro Szenario: `100`.
- Seeds: identisch pro Szenario (`depth-chart-validation-seed-1` bis `depth-chart-validation-seed-100`).
- Away-Team: konstantes bestes Lineup.
- Home-Szenarien:
  - Bestes Lineup: beste verfuegbare Spieler innerhalb relevanter Positionsgruppen vorne.
  - Schlechtestes Lineup: niedrigste verfuegbare Spieler innerhalb relevanter Positionsgruppen vorne.
  - Gemischtes Lineup: Skill-Positionen besser, Trenches/Defense bewusst schlechter.
  - Kontrollgruppe A/B: identisches bestes Lineup zweimal.
- Rating-Gap-Vergleich:
  - `STR` Prestige `84` gegen `WEK` Prestige `68`, jeweils bestes Lineup, 100 Spiele.

## Simulationsergebnisse

| Szenario | Spiele | Win Rate | Punkte | Gegenpunkte | Diff | Pass Comp % | Pass Y/A | Rush Y/A | Turnovers | Sacks Allowed | Sacks Made | Explosive |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Bestes Lineup | 100 | 40.0% | 17.01 | 18.19 | -1.18 | 13.3% | 4.24 | 4.42 | 0.80 | 1.45 | 1.08 | 4.22 |
| Schlechtestes Lineup | 100 | 23.0% | 13.89 | 19.64 | -5.75 | 11.9% | 4.39 | 3.12 | 0.81 | 1.32 | 1.26 | 3.61 |
| Gemischtes Lineup | 100 | 29.0% | 17.98 | 21.54 | -3.56 | 13.3% | 4.29 | 4.52 | 0.98 | 1.35 | 1.23 | 4.36 |
| Kontrolle A | 100 | 40.0% | 17.01 | 18.19 | -1.18 | 13.3% | 4.24 | 4.42 | 0.80 | 1.45 | 1.08 | 4.22 |
| Kontrolle B | 100 | 40.0% | 17.01 | 18.19 | -1.18 | 13.3% | 4.24 | 4.42 | 0.80 | 1.45 | 1.08 | 4.22 |
| Rating Gap 84 vs 68 | 100 | 100.0% | 41.17 | 10.99 | +30.18 | 34.4% | 5.39 | 7.69 | 0.91 | 1.10 | 1.25 | 9.80 |

## Delta-Auswertung

| Vergleich | Win Rate | Punkte | Diff | Pass Comp % | Pass Y/A | Rush Y/A | Turnovers | Sacks Allowed | Explosive |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Bestes vs schlechtestes Lineup | +17.0pp | +3.12 | +4.57 | +1.5pp | -0.15 | +1.31 | -0.01 | +0.13 | +0.61 |
| Kontrolle A vs B | 0.0pp | 0.00 | 0.00 | 0.0pp | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Rating Gap 84 vs 68 | 100.0% Win Rate | 41.17 PPG | +30.18 | 34.4% | 5.39 | 7.69 | 0.91 | 1.10 | 9.80 |

## Bewertung des Effekts
- Messbarkeit: Gruen. Bestes Lineup erzeugt ueber 100 Spiele klar bessere Ergebnisqualitaet als schlechtestes Lineup.
- Balance: Gruen. Der Lineup-Effekt ist deutlich kleiner als ein harter Rating-Gap und wirkt nicht wie ein dominanter Ergebnishebel.
- Determinismus: Gruen. Identisches Lineup mit identischen Seeds erzeugt identische Ergebnisse.
- Passing-Signal: Gelb als Beobachtung, nicht als Blocker. Completion Rate verbessert sich leicht, Passing Y/A ist im 100er-Sample minimal schlechter. Das wirkt nach Game-Script-/Varianzrauschen, sollte aber in kuenftigen Balance-Runs mit groesserem Sample beobachtet werden.
- Defense/Sacks: Gelb als Beobachtung. Sacks allowed und sacks generated sind nicht streng monoton. Das ist bei nur 100 Spielen und indirektem Protection-/Defense-Effekt plausibel, aber kein starkes Signal.

## Erkannte Risiken
- Die neue Wirkung ist nicht isoliert vom bestehenden Depth-Chart-Effekt, weil `depthChartSlot` bereits Auswahl, Sortierung und Snaps beeinflusst.
- `engineNotes` kann wie eine harte Kausalitaetsmeldung gelesen werden. Es ist aktuell nur ein Hinweis auf angewendete Lineup-Multiplikatoren.
- 100 Spiele reichen fuer eine Produktfreigabe des kleinen Modifiers, aber nicht fuer finale Liga-Balance.
- Sehr extreme Lineups koennen durch die Kombination aus schlechterem Starter-Pool und Modifier deutlich sichtbar schlechter werden. Der Effekt bleibt im Test aber unterhalb echter Team-Staerkeunterschiede.

## Balancing-Empfehlungen
1. Modifier vorerst unveraendert lassen: `+4%`, `-3%`, `-5%` ist messbar und nicht dominant.
2. In der naechsten Balance-Runde 500- bis 1000-Spiel-Samples fuer QB-only, OL-only, RB-only und Defense-only laufen lassen.
3. `engineNotes` spaeter im UI als "Engine-Hinweis" oder "Lineup-Modifikator aktiv" formulieren, nicht als sichere Play-Kausalitaet.
4. Bei auffaelligen Passing-Y/A- oder Sack-Signalen nicht sofort Modifier aendern, sondern erst isolierte Positions-Szenarien messen.

## Regression
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen
- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts src/modules/seasons/application/simulation/production-qa.test.ts`
  - Ergebnis: Gruen, 3 Testdateien, 23 Tests
- `npm run test:e2e:week-loop`
  - Erster Versuch: Rot, weil Sandbox `tsx`-IPC blockierte; danach Rot wegen belegtem Port `3100`.
  - Wiederholung: `E2E_PORT=3110 npm run test:e2e:week-loop`
  - Ergebnis: Gruen, 1 Test bestanden.
- `npm run test:e2e:depth-chart`
  - Wiederholung: `E2E_PORT=3111 npm run test:e2e:depth-chart`
  - Ergebnis: Gruen, 1 Test bestanden.

## Geaenderte Dateien
- `docs/game-engine/depth-chart-impact-validation-report.md`

Status: Gruen
