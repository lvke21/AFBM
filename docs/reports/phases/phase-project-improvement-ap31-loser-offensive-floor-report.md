# AP31 - Loser Offensive Floor by Matchup Band

Status: Gruen  
Datum: 2026-04-26

## Entscheidung

AP31 noetig als Diagnose: Ja.  
AP31 noetig als Gameplay-Aenderung: Nein.

Nach AP30 sind Equal- und Near-Peer-Matchups gesund. Die verbleibenden Blowouts kommen fast ausschliesslich aus echten Mismatch-Bands. Ein getesteter, bandbasierter Field-Goal-Floor fuer Rating-Underdogs ab Delta 6 senkte zwar einzelne `loser <= 7` Werte, verschlechterte aber die Full Balanced Suite. Deshalb wurde keine neue Gameplay-Mechanik uebernommen.

## Matchup-Band-Analyse nach AP30

Gezielter 240-Spiele-Batch:

| Band | Matchup | Avg Margin | Blowout | Close | Loser <= 7 | Avg Loser | Favorit |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 74 vs 74 | 6.34 | 1.3% | 66.7% | 31.3% | 12.50 | n/a |
| 1 | 76 vs 75 | 6.29 | 2.1% | 68.8% | 39.6% | 10.74 | 47.5% |
| 6 | 82 vs 76 | 11.23 | 8.3% | 41.2% | 21.2% | 14.30 | 85.4% |
| 16 | 84 vs 68 | 28.92 | 70.8% | 2.9% | 35.0% | 10.38 | 99.6% |

Full Balanced Suite nach AP30:

| Metrik | Wert |
| --- | ---: |
| Games | 1.008 |
| Avg Margin | 25.45 |
| Blowout Rate | 48.5% |
| Close Game Rate | 26.0% |
| Loser Score <= 7 | 53.8% |
| Winner Score >= 42 | 36.7% |
| Winner >= 42 und Loser <= 7 | 28.9% |

Szenario-Hinweise:

- `equal-vs-equal`: 2.8% Blowouts, 55.6% Close Rate.
- `medium-vs-medium`: 2.8% Blowouts, 63.9% Close Rate.
- `strong-vs-strong`: 0.0% Blowouts, 69.4% Close Rate.
- `strong-vs-weak`: 100.0% Blowouts, 100.0% Favoriten-Winrate.
- `weak-vs-medium` und `weak-vs-strong` bleiben sehr hart, aber das sind echte Qualitaetsunterschiede.

## Gepruefter Prototyp

Getestet wurde ein minimaler Field-Goal-Floor:

- nur Rating-Underdogs ab Delta 6
- nur wenn das Team nicht fuehrt
- nur wenn das Team bei maximal 7 Punkten steht
- keine Wirkung bei Equal/Near-Peer
- Fokus auf Field Goals statt Touchdowns

Ergebnis des Prototyps:

| Metrik | AP30 Baseline | AP31 Prototyp |
| --- | ---: | ---: |
| Full Avg Margin | 25.45 | 27.33 |
| Full Blowout Rate | 48.5% | 54.8% |
| Full Close Game Rate | 26.0% | 17.1% |
| 82 vs 76 Loser <= 7 | 21.2% | 12.5% |
| 84 vs 68 Loser <= 7 | 35.0% | 24.2% |
| 84 vs 68 Blowout | 70.8% | 74.2% |

Bewertung: Der Prototyp loeste das Symptom `loser <= 7` in einzelnen Mismatch-Bands teilweise, verschlechterte aber Margin und Blowout Rate. Das deutet darauf hin, dass ein isolierter Underdog-Floor an dieser Stelle nicht der richtige naechste Balance-Hebel ist.

## Geaenderte Mechanik

Keine produktive Gameplay-Mechanik wurde uebernommen.

Nicht geaendert:

- Rating-Delta-Kompression 0-5
- Schedule
- Fatigue
- Injuries
- Roster/Prestige
- Score Engine allgemein

## Vorher/Nachher Kennzahlen

Da keine Mechanik uebernommen wurde, bleibt die produktive Balance auf AP30-Stand:

| Metrik | AP30 / AP31 final |
| --- | ---: |
| Avg Margin | 25.45 |
| Blowout Rate | 48.5% |
| Close Game Rate | 26.0% |
| Medium-vs-Medium Blowout | 2.8% |
| Strong-vs-Weak Favoriten-Winrate | 100.0% |

## Tests

- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/simulation-balancing.test.ts src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `npx tsx scripts/simulations/qa-extended-season-balance-suite.ts`
- gezielter 240-Spiele-Band-Batch fuer 74-vs-74, 76-vs-75, 82-vs-76 und 84-vs-68
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`

Alle finalen Checks sind gruen.

## Geaenderte Dateien

- `docs/reports/simulations/extended-season-balance-results.json`
- `docs/reports/simulations/extended-season-balance-results.html`
- `docs/reports/phases/phase-project-improvement-ap31-loser-offensive-floor-report.md`

## Ergebnis

Status AP31: Gruen  
Freigabe AP32: Ja, aber AP32 wurde nicht gestartet
