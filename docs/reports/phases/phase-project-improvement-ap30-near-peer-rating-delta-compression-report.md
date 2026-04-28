# AP30 - Near-Peer Rating Delta Compression

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP30 reduziert die Wirkung kleiner Rating-Unterschiede in Matchups, ohne echte Qualitaetsunterschiede zu entwerten. Es wurden keine Schedule-, Fatigue-, Injury-, Roster- oder Prestige-Parameter geaendert.

## Gefundene Rating-Delta-Ursache

Nach AP29 ist der Schedule deutlich fairer, aber `medium-vs-medium` blieb auffaellig. Die Ursache lag nicht mehr im Spielplan, sondern darin, dass kleine Vorteile mehrfach in Drive-Pfaden wirkten:

- Unit-Matchups fuer Pass, Run, Coverage, Pass Rush und Red Zone
- Sack Pressure
- Run Stuff
- Passing/Rushing Yardage
- Drive Quality
- 4th-Down-Conversion und Post-Conversion-Finishes

Ein nomineller Unterschied wie 76 vs 75 konnte dadurch in mehreren Teilformeln gleichzeitig als stabiler Favoritenvorteil auftauchen.

## Geaenderte Mechanik

Geaendert wurde nur `src/modules/seasons/application/simulation/match-engine.ts`.

Neue Near-Peer-Kompression:

- Rating-Delta 0: keine Kompression.
- Rating-Delta 1-2: favorisierte positive Metric-Diffs werden mit Faktor 0.85 gewichtet.
- Rating-Delta 3-5: Faktor steigt weich von 0.85 auf 0.95.
- Rating-Delta ab 6: keine Kompression, klare Qualitaetsunterschiede bleiben erhalten.
- Nur Vorteile, die in Richtung des Rating-Favoriten zeigen, werden komprimiert.
- Gegenlaeufige Unit-Staerken bleiben erhalten, damit echte Matchup-Kontraste nicht verschwinden.

Die Score Engine wurde nicht neu geschrieben. Stattdessen werden die kleinen Near-Peer-Diffs vor ihrer mehrfachen Nutzung leicht geglaettet.

## Vorher/Nachher Full Balanced Suite

Vergleichsbasis: AP29 Balanced Rotation Default.

| Metrik | Vor AP30 | Nach AP30 |
| --- | ---: | ---: |
| Games | 1.008 | 1.008 |
| Avg Margin | 27.03 | 25.45 |
| Blowout Rate | 53.2% | 48.5% |
| Close Game Rate | 18.5% | 26.0% |
| Avg Score | 45.66 | 43.93 |

## Near-Peer-Ergebnisse

Full Balanced Suite:

| Szenario | Vor AP30 Blowout | Nach AP30 Blowout | Vor Avg Margin | Nach Avg Margin | Nach Close Rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| equal-vs-equal | 0.0% | 2.8% | 6.25 | 7.69 | 55.6% |
| medium-vs-medium | 47.2% | 2.8% | 24.08 | 7.42 | 63.9% |
| strong-vs-weak | 100.0% | 100.0% | 46.13 | 45.53 | 0.0% |

Gezielter 200-Spiele-Batch:

| Matchup | Avg Margin | Blowout | Close | Avg Total | Favorit |
| --- | ---: | ---: | ---: | ---: | ---: |
| 74 vs 74 | 6.36 | 1.0% | 69.0% | 33.10 | n/a |
| 76 vs 75 | 6.67 | 0.5% | 66.5% | 29.04 | 47.0% |
| 82 vs 76 | 11.09 | 7.5% | 42.0% | 39.85 | 86.5% |
| 84 vs 68 | 29.25 | 70.5% | 3.5% | 49.30 | 99.0% |

## Favoriten-/Upset-Bewertung

- Near-Peer ist deutlich kompetitiver: 76 vs 75 ist nicht mehr deterministisch.
- Moderate Unterschiede bleiben sichtbar: 82 vs 76 gewinnt noch 86.5%.
- Klare Mismatches bleiben dominant: 84 vs 68 gewinnt 99.0%.
- Strong-vs-Weak bleibt in der Full Suite bei 100% Favoriten-Winrate.
- Es gibt keine unrealistische Upset-Inflation in klaren Mismatches.

## Tests

- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/simulation-balancing.test.ts src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `npx tsx scripts/simulations/qa-extended-season-balance-suite.ts`
- gezielter 200-Spiele-Batch fuer 74-vs-74, 76-vs-75, 82-vs-76 und 84-vs-68
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`

Alle finalen Checks sind gruen.

## Geaenderte Dateien

- `src/modules/seasons/application/simulation/match-engine.ts`
- `src/modules/seasons/application/simulation/simulation-balancing.test.ts`
- `docs/reports/simulations/extended-season-balance-results.json`
- `docs/reports/simulations/extended-season-balance-results.html`
- `docs/reports/phases/phase-project-improvement-ap30-near-peer-rating-delta-compression-report.md`

## Bekannte Einschraenkungen

- Full Balanced Blowout Rate ist mit 48.5% weiterhin hoch, aber deutlich verbessert.
- Weak-vs-Strong/Weak-vs-Medium bleiben erwartbar sehr hart.
- Overtime-Sonderpfade wurden nicht veraendert, weil AP30 auf regulaere Drive-Delta-Wirkung zielt.

## Ergebnis

Status AP30: Gruen  
Freigabe AP31: Ja, aber AP31 wurde nicht gestartet
