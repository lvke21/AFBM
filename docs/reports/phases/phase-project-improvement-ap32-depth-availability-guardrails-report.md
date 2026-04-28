# AP32 - Availability/Depth-Chart Decay Diagnostics & Guardrails

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP32 prueft, ob Availability-, Injury-, Fatigue- oder Depth-Chart-Verfall ueber den Saisonverlauf Blowouts unnoetig verstaerkt. Der Scope war bewusst diagnosegefuehrt: erst messen, dann nur bei echtem Befund Guardrails einbauen.

Nicht geaendert wurden:

- Score Engine
- Rating-Delta-Kompression
- Injury-Rate
- Fatigue-Parameter
- Roster/Prestige
- Schedule

## Diagnose-Erweiterung

Die Extended Balance Suite gibt jetzt zusaetzlich aus:

- Availability Index pro Team/Woche
- Effective Depth Rating pro Team/Woche
- Starter Loss Count
- Backup Usage Rate
- Starter Fatigue vs Backup Fatigue
- Margin-Attribution nach Availability Band
- Margin-Attribution nach Backup Usage Band
- Margin-Attribution nach Effective Depth Rating Band
- Korrelationen zwischen Margin und Availability-/Depth-Faktoren

Die HTML-/JSON-Ergebnisdateien wurden entsprechend erweitert.

## Diagnose-Ergebnisse

Full Balanced Suite nach AP31/AP32-Diagnose:

| Metrik | Wert |
| --- | ---: |
| Games | 1.008 |
| Avg Margin | 25.45 |
| Blowout Rate | 48.5% |
| Close Game Rate | 26.0% |
| Injury Rate | 1.283 |
| Severe Injury Rate | 0.161 |

### Availability ueber Wochen

| Woche | Availability Index | Effective Depth | Starter Loss | Backup Usage |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0.952 | 74.01 | 2.24 | 0.081 |
| 7 | 0.929 | 73.70 | 3.27 | 0.119 |
| 14 | 0.909 | 73.31 | 4.17 | 0.149 |

Interpretation: Es gibt eine erwartbare saisonale Abnutzung, aber keinen abrupten Depth-Chart-Kollaps.

### Availability nach Team

| Team | Profil | Availability | Effective Depth | Starter Loss Avg | Starter Loss Max | Backup Usage |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| STR1 | STRONG | 0.956 | 82.09 | 2.09 | 8 | 0.074 |
| STR2 | STRONG | 0.938 | 80.53 | 2.88 | 9 | 0.103 |
| MED1 | MEDIUM | 0.922 | 74.13 | 3.58 | 10 | 0.129 |
| MED2 | MEDIUM | 0.929 | 73.42 | 3.53 | 11 | 0.124 |
| EQL1 | EQUAL | 0.926 | 72.48 | 3.42 | 9 | 0.122 |
| EQL2 | EQUAL | 0.920 | 72.54 | 3.52 | 8 | 0.134 |
| WEK1 | WEAK | 0.918 | 66.66 | 3.51 | 12 | 0.126 |
| WEK2 | WEAK | 0.923 | 67.39 | 3.21 | 10 | 0.116 |

Interpretation: Strong-Teams haben hoehere Effective Depth Ratings, Weak-Teams niedrigere. Das ist Teamqualitaet, nicht kaputte Availability-Logik.

## Korrelationen mit Margin

| Faktor | Korrelation |
| --- | ---: |
| Winner Score | 0.909 |
| Min Effective Depth Rating | -0.678 |
| Loser Score | -0.563 |
| Absolute Effective Depth Rating Diff | 0.555 |
| Absolute Fatigue Diff | 0.110 |
| Absolute Availability Index Diff | 0.069 |
| Absolute Injury Diff | 0.065 |
| Min Availability Index | -0.021 |
| Total Active Injuries | 0.020 |
| Total Starter Loss Count | -0.020 |
| Max Backup Usage Rate | -0.012 |
| Max Average Fatigue | 0.002 |

Interpretation: Effective Depth Rating korreliert stark, aber das bildet primaer echte Teamstaerke ab. Availability Index, Starter Loss Count, Backup Usage und Fatigue korrelieren kaum mit Margin. Ein Availability-Guardrail wuerde daher wahrscheinlich Symptome kaschieren, nicht die Ursache beheben.

## Band-Auswertung

### Effective Depth Rating

| Band | Games | Avg Margin | Blowout | Close |
| --- | ---: | ---: | ---: | ---: |
| under-70 | 468 | 40.97 | 88.5% | 7.1% |
| 70-74 | 490 | 12.47 | 14.7% | 40.8% |
| 75-79 | 24 | 8.58 | 12.5% | 45.8% |
| 80-plus | 26 | 6.23 | 0.0% | 69.2% |

Das bestaetigt die AP31-Erkenntnis: verbleibende Blowouts sitzen hauptsaechlich in echten Mismatch-Bands, besonders wenn ein schwaches Team beteiligt ist.

### Backup Usage

| Band | Games | Avg Margin | Blowout | Close |
| --- | ---: | ---: | ---: | ---: |
| 0-9% | 313 | 25.70 | 50.2% | 24.3% |
| 10-19% | 380 | 25.47 | 48.4% | 27.6% |
| 20-29% | 256 | 26.09 | 49.2% | 22.7% |
| 30%+ | 59 | 21.17 | 37.3% | 39.0% |

Backup Usage verschlechtert die Margins nicht monoton. Es gibt keinen Hinweis auf kaputte Depth Charts.

### Availability Index

| Band | Games | Avg Margin | Blowout | Close |
| --- | ---: | ---: | ---: | ---: |
| 95-100 | 283 | 26.37 | 51.6% | 22.3% |
| 85-94 | 529 | 24.75 | 46.5% | 27.8% |
| 75-84 | 185 | 25.16 | 47.6% | 27.6% |
| under-75 | 11 | 40.00 | 81.8% | 9.1% |

Nur sehr niedrige Availability ist auffaellig, aber selten. Die Gesamtverteilung rechtfertigt keine globale Guardrail.

## AP32-Guardrail nötig?

Nein.

Begruendung:

- Keine kaputten Depth Charts nachweisbar.
- Kein starker Zusammenhang zwischen Starter Loss Count und Margin.
- Kein starker Zusammenhang zwischen Backup Usage und Margin.
- Availability sinkt ueber Wochen moderat, aber nicht kollapsartig.
- Effective Depth erklaert Blowouts, bildet aber echte Teamqualitaet ab.
- Ein Guardrail wuerde aktuell eher klare Mismatches kuenstlich komprimieren.

## Geaenderte Mechanik

Keine Gameplay-Mechanik wurde geaendert.

AP32 erweitert nur QA-/Suite-Diagnostik und Reporting.

## Vorher/Nachher Kennzahlen

Da keine Guardrail uebernommen wurde, bleiben die AP31/AP30-Balancingwerte stabil:

| Metrik | Final |
| --- | ---: |
| Avg Margin | 25.45 |
| Blowout Rate | 48.5% |
| Close Game Rate | 26.0% |
| Medium-vs-Medium Blowout | 2.8% |
| Strong-vs-Weak Favoriten-Winrate | 100.0% |

## Tests

- `npx vitest run src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/simulation-balancing.test.ts src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/players/domain/player-injury.test.ts`
- `npx tsx scripts/simulations/qa-extended-season-balance-suite.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`

Alle finalen Checks sind gruen. `tsx` musste fuer Suite/E2E wegen Sandbox-IPC-EPERM ausserhalb der Sandbox ausgefuehrt werden.

## Geaenderte Dateien

- `src/modules/seasons/application/simulation/extended-season-balance-suite.ts`
- `src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `scripts/simulations/qa-extended-season-balance-suite.ts`
- `docs/reports/simulations/extended-season-balance-results.json`
- `docs/reports/simulations/extended-season-balance-results.html`
- `docs/reports/phases/phase-project-improvement-ap32-depth-availability-guardrails-report.md`

## Ergebnis

Status AP32: Gruen
