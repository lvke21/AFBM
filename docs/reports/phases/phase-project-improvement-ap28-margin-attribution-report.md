# AP28 - Extended Suite Diagnostics & Margin Attribution

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP28 erweitert die Extended Balance Suite um Diagnose-Ausgaben, um die nach AP24 verbleibenden Blowouts zu erklaeren. Es wurden keine Gameplay-, Balance-, Score-, Fatigue- oder Injury-Parameter veraendert.

## Implementierter Scope

- Margin-Diagnose nach Woche, Teamprofil, Fatigue-Level, Injury-Count, AI/Gameplan-Archetype und Home/Away.
- Long-Term-Phasenvergleich: early, middle, late.
- Score-Spike-Muster: hohe Winner Scores, sehr niedrige Loser Scores und kombinierte Winner-Take-All-Spiele.
- Korrelationsauswertung zwischen Margin und messbaren Faktoren.
- HTML/JSON-Suite-Output um Diagnose-Tabellen erweitert.
- Reproduzierbares Schema per Unit-Test abgesichert.

## AP28 Diagnose-Lauf

Vergleichbarer Extended Short Batch: 2 Saisons, 8 Wochen, 128 Spiele.

| Metrik | Wert |
| --- | ---: |
| Avg Margin | 39.60 |
| Blowout Rate | 81.3% |
| Close Game Rate | 4.7% |
| Avg Score | 44.49 |
| Injury Rate | 1.547 / Spiel |
| Severe Injury Rate | 0.219 / Spiel |

Zusaetzlich wurde der bestehende Default-Exporter mit 18 Saisons, 14 Wochen und 2.016 Spielen ausgefuehrt. Der Full Run bestaetigt die Attribution:

| Metrik | Full-Run-Wert |
| --- | ---: |
| Avg Margin | 42.27 |
| Blowout Rate | 80.2% |
| Close Game Rate | 9.7% |
| Avg Score | 46.53 |
| Fatigue Median | 70 |
| Fatigue P90 | 99 |

## Margin nach Woche

| Woche | Avg Margin | Blowout Rate | Close Rate | Winner Score | Loser Score |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 32.38 | 75.0% | 6.3% | 36.25 | 3.88 |
| 2 | 36.94 | 68.8% | 0.0% | 39.31 | 2.38 |
| 3 | 35.13 | 75.0% | 12.5% | 38.56 | 3.44 |
| 4 | 35.88 | 81.3% | 6.3% | 37.94 | 2.06 |
| 5 | 43.00 | 87.5% | 0.0% | 44.69 | 1.69 |
| 6 | 44.75 | 87.5% | 0.0% | 47.75 | 3.00 |
| 7 | 45.88 | 93.8% | 0.0% | 46.50 | 0.63 |
| 8 | 42.88 | 81.3% | 12.5% | 45.38 | 2.50 |

Interpretation: Blowouts entstehen nicht erst spaet; sie sind ab Woche 1 sichtbar. Im 128-Spiele-Lauf steigen sie ab Woche 5 sichtbar an. Im 2.016-Spiele-Full-Run bleibt die Wochenverteilung dagegen relativ flach mit Blowout Rates um ca. 79-82%; Long-Term-Fortschreibung ist damit ein Verstaerker, aber nicht die Primaerursache.

## Margin nach Teamprofil

| Profilpaar | Avg Margin | Blowout Rate | Close Rate | Winner Score | Loser Score |
| --- | ---: | ---: | ---: | ---: | ---: |
| equal-vs-equal | 18.06 | 37.5% | 25.0% | 26.06 | 8.00 |
| medium-vs-medium | 34.44 | 68.8% | 6.3% | 38.06 | 3.63 |
| equal-vs-weak | 44.81 | 87.5% | 6.3% | 46.13 | 1.31 |
| strong-vs-medium | 42.19 | 87.5% | 0.0% | 44.31 | 2.13 |
| medium-vs-strong | 38.13 | 93.8% | 0.0% | 39.88 | 1.75 |
| strong-vs-weak | 46.25 | 93.8% | 0.0% | 47.06 | 0.81 |
| weak-vs-equal | 43.44 | 87.5% | 0.0% | 44.50 | 1.06 |
| weak-vs-strong | 49.50 | 93.8% | 0.0% | 50.38 | 0.88 |

Interpretation: AP24 hat Equal-vs-Equal deutlich entschaerft, aber schon Medium-vs-Medium kippt wieder stark. Das Muster ist weniger ein reines Rating-Problem und staerker ein Score-/Drive-Outcome-Problem: Verlierer bleiben oft bei 0-7 Punkten.

## Fatigue und Injuries

### Fatigue-Band

| Fatigue-Band | Spiele | Avg Margin | Blowout Rate | Close Rate |
| --- | ---: | ---: | ---: | ---: |
| 0-29 | 39 | 29.36 | 69.2% | 7.7% |
| 30-49 | 89 | 44.09 | 86.5% | 3.4% |

### Injury-Count-Band

| Aktive Injuries | Spiele | Avg Margin | Blowout Rate | Close Rate |
| --- | ---: | ---: | ---: | ---: |
| 0 | 13 | 38.54 | 76.9% | 7.7% |
| 1-3 | 17 | 35.00 | 70.6% | 5.9% |
| 4-7 | 32 | 34.59 | 78.1% | 3.1% |
| 8-11 | 29 | 42.34 | 86.2% | 3.4% |
| 12+ | 37 | 44.27 | 86.5% | 5.4% |

Interpretation: Fatigue und Injuries korrelieren positiv mit hoeheren Margins, sind aber nicht alleinige Ursache. Selbst bei 0 aktiven Injuries liegt die Blowout Rate bei 76.9%.

## AI/Gameplan und Home/Away

| AI-Archetype-Paar | Spiele | Avg Margin | Blowout Rate | Close Rate |
| --- | ---: | ---: | ---: | ---: |
| BALANCED_MATCHUP-vs-BALANCED_MATCHUP | 55 | 33.55 | 69.1% | 9.1% |
| FAVORITE_CONTROL-vs-UNDERDOG_VARIANCE | 48 | 44.42 | 89.6% | 2.1% |
| UNDERDOG_VARIANCE-vs-FAVORITE_CONTROL | 25 | 43.68 | 92.0% | 0.0% |

Home/Away ist kein Haupttreiber:

| Winner Venue | Spiele | Avg Margin | Blowout Rate |
| --- | ---: | ---: | ---: |
| Away | 65 | 38.58 | 81.5% |
| Home | 62 | 41.31 | 82.3% |
| Tie | 1 | 0.00 | 0.0% |

Interpretation: AI-Archetypes folgen dem Mismatch, erklaeren ihn aber nicht allein. Home/Away ist nahezu neutral.

## Score-Spikes und Winner-Take-All

| Muster | Spiele | Rate | Avg Margin |
| --- | ---: | ---: | ---: |
| Winner Score 42+ | 68 | 53.1% | 53.34 |
| Loser Score <= 7 | 113 | 88.3% | 42.85 |
| Winner 42+ und Loser <= 7 | 66 | 51.6% | 53.92 |

Staerkstes Signal: Der Verlierer punktet fast nie ausreichend. Im 128-Spiele-Lauf haben 88.3% der Spiele einen Loser Score von maximal 7; im 2.016-Spiele-Full-Run sind es 90.4%. Das ist der klarste Hinweis auf Winner-Take-All-Drive-Outcome statt nur zu hohe Siegerpunkte.

## Korrelationen mit Margin

| Faktor | Korrelation |
| --- | ---: |
| Winner Score | 0.963 |
| Loser Score | -0.607 |
| Max Average Fatigue | 0.426 |
| Chronological Game Index | 0.307 |
| Absolute Injury Diff | 0.213 |
| Total Active Injuries | 0.202 |
| Absolute Fatigue Diff | 0.158 |

Interpretation: Der staerkste Treiber ist Score-Separation selbst: Siegerpunkte steigen und Verliererpunkte fallen. Der 2.016-Spiele-Full-Run bestaetigt das mit `winnerScore` 0.974 und `loserScore` -0.651. Fatigue und Zeitverlauf verstaerken die Lage punktuell, aber die Ursache sitzt primaer in der Art, wie Matchups in Punkte beziehungsweise Stops uebersetzt werden.

## Attribution

1. **Score-/Drive-Outcome Compression fehlt**: Verlierer bleiben in 88.3% der Spiele bei maximal 7 Punkten.
2. **Long-Term-Fortschreibung verstaerkt Blowouts**: Week 5-7 steigen Avg Margin und Blowout Rate sichtbar.
3. **Fatigue/Injuries sind Verstaerker, nicht Primaerursache**: hohe Bands sind schlechter, aber Blowouts existieren auch ohne Injury-Last.
4. **Teamprofile bleiben relevant**: Mismatches sind erwartbar hoch, aber Medium-vs-Medium und Equal-vs-Equal sind noch zu einseitig.
5. **AI/Gameplan folgt der Spielstaerke**: FAVORITE_CONTROL vs UNDERDOG_VARIANCE hat hohe Margins, aber Balanced-vs-Balanced ist ebenfalls zu hoch.

## Empfehlung

Naechstes Arbeitspaket: **AP25 - Score Margin Compression & Drive Outcome Volatility Tuning**.

Begruendung: AP28 zeigt, dass die groesste erklaerende Groesse nicht Roster, Home/Away oder AI ist, sondern Winner-Take-All-Scoring: Verlierer erzielen zu selten Punkte. AP26 Fatigue sollte danach folgen, weil Fatigue/Long-Term-Fortschreibung die Margins ab Woche 5 verstaerkt. AP27 Underdog-Tuning sollte erst nach AP25/AP26 kommen, sonst kaschiert AI-Tuning nur ein grundlegenderes Drive-/Score-Problem.

## Tests

- `npx vitest run src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `npx tsx -e '<AP28 128-Spiele Diagnose-Lauf>'`
- `npx tsc --noEmit`
- `npm run lint`

## Ergebnis

AP28 ist Gruen:

- Diagnose-Schema ist stabil und reproduzierbar.
- Blowout-Treiber sind plausibel eingegrenzt.
- Naechstes AP ist klar: AP25 vor AP26/AP27.
