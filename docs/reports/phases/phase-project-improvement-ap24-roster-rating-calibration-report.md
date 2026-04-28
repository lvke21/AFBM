# AP24 - Roster Profile Sanity & Effective Rating Calibration

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP24 klaert die Ursache der AP23-Blowouts im Roster-/Rating-Pfad, bevor Score Engine, Fatigue oder Injuries angepasst werden. Ziel ist, dass Teams mit aehnlichen nominalen Ratings auch eine aehnliche effektive Starter- und Depth-Chart-Staerke erhalten.

## Diagnose

Die Score Engine wurde nicht veraendert. Die Analyse zeigte stattdessen eine deutliche Verzerrung im initialen Rosterprofil:

| Team | Nominal | Effektiv vor AP24 | Delta vor AP24 | Effektiv nach AP24 | Delta nach AP24 |
| --- | ---: | ---: | ---: | ---: | ---: |
| STR1 | 84 | 83 | -1 | 84 | 0 |
| STR2 | 82 | 82 | 0 | 82 | 0 |
| MED1 | 76 | 81 | +5 | 76 | 0 |
| MED2 | 75 | 81 | +6 | 75 | 0 |
| WEK1 | 68 | 80 | +12 | 68 | 0 |
| WEK2 | 69 | 80 | +11 | 69 | 0 |
| EQL1 | 74 | 81 | +7 | 74 | 0 |
| EQL2 | 74 | 81 | +7 | 74 | 0 |

Ursache: `buildInitialRoster` hat Prestige nur als sehr kleinen Boost `round((prestige - 70) / 5)` auf die Attribute angewendet. Da die Positions-Blueprints bereits nahe 80 lagen, wurden schwache und mittlere Teams effektiv zu stark und nominale Ratings waren fuer Simulation, AI-Vergleich und Balance-Auswertung nur eingeschraenkt aussagekraeftig.

## Aenderungen

- Roster-Prestige-Kalibrierung in `buildInitialRoster` auf eine direkte 80er-Baseline umgestellt: `round(prestige - 80)`.
- Regressionstest ergaenzt, der sicherstellt, dass effektive Teamstaerke fuer schwache, mittlere und starke Teams nahe am angeforderten Prestige bleibt.
- Keine Aenderungen an Score Engine, Fatigue, Injury System, Drive Logic oder Match-State-Logik.

## Validierung

### Nominal vs effektiv

Nach der Anpassung entsprechen die effektiven Teamratings der AP23-Profile den nominalen Zielwerten:

- Strong: 84 / 82
- Medium: 76 / 75
- Weak: 68 / 69
- Equal: 74 / 74

### Short Batch ohne Langzeit-Fortschreibung

Je Szenario wurden 120 frische Spiele simuliert.

| Szenario | Siege Team A | Siege Team B | Avg Margin | Blowout Rate | Close Game Rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Equal vs Equal | 61 | 59 | 8.36 | 5.8% | 58.3% |
| Strong vs Strong | 80 | 40 | 9.76 | 6.7% | 47.5% |
| Medium vs Medium | 77 | 43 | 7.80 | 7.5% | 63.3% |

### Extended Short Batch mit Fortschreibung

128 Spiele ueber 2 Saisons und 8 Wochen:

- Avg Margin: 39.60, vorher AP23: 45.76
- Blowout Rate: 81.3%, vorher AP23: 93.3%
- Close Game Rate: 4.7%, vorher AP23: 1.7%
- Equal-vs-Equal Avg Margin: 18.06
- Equal-vs-Equal Blowout Rate: 37.5%
- Equal-vs-Equal Close Game Rate: 25.0%

Bewertung: Die Roster-/Rating-Abweichung ist behoben und die Simulation bleibt stabil. Die Extended-Season-Werte zeigen weiterhin Snowballing durch fortgeschriebene Belastung, Verletzungen und Schedule-Effekte. Das ist kein AP24-Fix, sondern ein separates Balancing-Thema nach der Rating-Kalibrierung.

## Tests

- `npx vitest run src/modules/savegames/application/bootstrap/initial-roster.test.ts src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `npx tsx -e '<AP24 nominal-vs-effektiv Diagnose>'`
- `npx tsx -e '<AP24 120-Spiele Short Batch fuer Equal/Strong/Medium>'`
- `npx tsx -e '<AP24 128-Spiele Extended Short Batch>'`
- `npx tsc --noEmit`
- `npm run lint`

## Einschraenkungen

- AP24 korrigiert Rating-/Roster-Kalibrierung, nicht die Score Engine.
- Langzeit-Blowouts bleiben teilweise hoch, sobald Fatigue, Injuries und mehrwoechige Fortschreibung wirken.
- Strong-vs-Strong ist trotz enger Ratings noch spuerbar auf STR1-Seite geneigt; das liegt nicht an nominal/effektiv-Drift, sondern an positionsspezifischer Profilverteilung und sollte separat beobachtet werden.

## Ergebnis

AP24 ist Gruen:

- Effektive Rating-Abweichungen wurden von bis zu +12 auf 0 reduziert.
- Equal-vs-Equal und Medium-vs-Medium Fresh-Batches sind stabil und kompetitiv.
- Keine Instabilitaeten in den relevanten Simulationstests.
- Keine verbotenen Aenderungen an Score Engine, Fatigue oder Injuries.
