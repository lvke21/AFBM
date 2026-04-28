# AP25 - Score Margin Compression & Drive Outcome Volatility Tuning

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP25 reduziert Winner-Take-All-Scoring, ohne Roster-Kalibrierung, Fatigue oder Injuries zu veraendern. Fokus war ausschliesslich der Drive-/Scoring-Pfad.

## Gefundene Ursache

AP28 zeigte, dass die extremen Margins primaer aus sehr niedrigen Verlierer-Scores entstehen:

- Full Suite vor AP25: Loser Score <= 7 in 90.4% der Spiele.
- Winner Score korrelierte mit Margin bei 0.974.
- Fatigue und Injuries verstaerkten den Effekt, waren aber nicht die Hauptursache.

Die Detailanalyse bestaetigte: Fresh Equal- und Medium-Batches waren bereits gesund, aber klare Mismatches hielten den Verlierer fast immer bei maximal 7 Punkten. Der Drive-Pfad hatte keinen ausreichenden late/trailing Floor fuer realistische Underneath-Yards, Field-Goal-Punkte oder kontrollierte Garbage-Time-Scoring-Sequenzen.

## Umsetzung

Geaendert wurde nur `match-engine.ts` im Drive-/Scoring-Pfad:

- Trailing-only Drive Relief:
  - Aktiv, wenn ein Team mit mindestens 10 Punkten zurueckliegt.
  - Nur zwischen 40:00 und 3:00 Restspielzeit.
  - Erhoeht moderat Underneath-/Sustained-Drive-Yards.
  - Reduziert Turnover-Varianz leicht fuer deutlich zurueckliegende Offenses.
  - Erhoeht Drive Quality moderat, damit Field-Goal-Range realistischer erreichbar wird.

- Trailing Field-Goal Floor:
  - Zurueckliegende Teams koennen bei erreichter Plus-Territory-Position eher kontrolliert Punkte nehmen.
  - Fuehrt zu Field-Goal-Made/Missed-Statistik, keinen freien Punkten.
  - Kickdistanz und Make Chance bleiben kicker- und distanzabhaengig.

- Leading Drive Throttle:
  - Teams mit deutlicher Fuehrung spielen ab Mitte des Spiels etwas konservativer.
  - Reduziert extreme Winner-Score-Spikes, ohne kneel-down oder Clock-Logic neu zu bauen.

Nicht geaendert:

- Roster-/Prestige-Kalibrierung
- Fatigue
- Injuries
- Depth Chart
- AI/Gameplan
- Firestore/Prisma-Pfade

## Vorher/Nachher

### Fresh Batch, je 120 Spiele

| Szenario | Vorher Avg Margin | Nachher Avg Margin | Vorher Blowout | Nachher Blowout | Vorher Loser <= 7 | Nachher Loser <= 7 | Favorit nachher |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Equal vs Equal | 7.32 | 6.39 | 3.3% | 1.7% | 35.8% | 35.0% | 45.8% |
| Medium vs Medium | 8.65 | 7.72 | 7.5% | 3.3% | 41.7% | 27.5% | 69.2% |
| Strong vs Weak | 37.52 | 32.85 | 91.7% | 75.8% | 98.3% | 60.0% | 100.0% |

### Extended Short Batch, 128 Spiele

| Metrik | Vor AP25 | Nach AP25 |
| --- | ---: | ---: |
| Avg Margin | 39.60 | 36.02 |
| Blowout Rate | 81.3% | 78.1% |
| Close Game Rate | 4.7% | 7.8% |
| Loser Score <= 7 | 88.3% | 73.4% |

### Extended Full Suite, 2.016 Spiele

| Metrik | Vor AP25 | Nach AP25 |
| --- | ---: | ---: |
| Avg Margin | 42.27 | 38.26 |
| Blowout Rate | 80.2% | 77.8% |
| Close Game Rate | 9.7% | 10.2% |
| Winner Score 42+ | 63.0% | 57.5% |
| Loser Score <= 7 | 90.4% | 79.7% |
| Winner 42+ und Loser <= 7 | 62.7% | 53.7% |

## Bewertung

AP25 reduziert das Hauptproblem messbar:

- Verlierer bleiben deutlich seltener bei maximal 7 Punkten.
- Avg Margin sinkt in Fresh-, Short- und Full-Suite.
- Winner-Score-Spikes sinken.
- Favoritenvorteil bleibt erhalten, vor allem in Strong-vs-Weak.
- Equal-vs-Equal bleibt gesund.

Die Full Suite bleibt aber noch zu blowout-lastig. Nach AP25 ist der grobe Score-Floor besser, aber Medium-vs-Medium und Weak-Mismatch-Szenarien zeigen weiterhin langfristige Eskalation. Das spricht fuer AP26 als naechsten Schritt, weil Fatigue/Long-Term-Fortschreibung nach AP28/AP25 weiterhin als Verstaerker sichtbar bleibt.

## Tests

- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts`
- `npx vitest run src/modules/seasons/application/simulation/production-qa.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `npx tsx -e '<AP25 Fresh Batch Equal/Medium/StrongWeak>'`
- `npx tsx -e '<AP25 Extended Short Batch 128 Spiele>'`
- `npx tsx scripts/simulations/qa-extended-season-balance-suite.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`

Alle finalen Checks sind gruen.

## Bekannte Einschraenkungen

- AP25 komprimiert Margins, loest aber nicht alle Blowouts.
- Long-Term-Suite zeigt weiterhin zu hohe Blowout-Werte, besonders bei schwachen Teams und fortgeschriebenem Zustand.
- Production-QA-Fingerprints wurden aktualisiert, weil AP25 bewusst scoring-relevante Match-Ergebnisse veraendert.

## Ergebnis

Status AP25: Gruen  
Freigabe AP26: Ja
