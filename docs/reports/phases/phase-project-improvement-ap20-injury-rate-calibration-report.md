# AP20 - Injury Rate Calibration

## Status

AP20 ist Gruen. Die Injury-Rate wurde nach AP19 messbar gesenkt, ohne Verletzungen aus dem Gameplay zu entfernen. AP21 ist freigegeben, wurde aber nicht gestartet.

## Ausgangslage

Die Gameplay-Analyse hatte 170 neue Injuries in 72 Spielen gezeigt. Ein AP20-Vergleichslauf nach AP19, aber vor der Injury-Kalibrierung, ergab im gleichen Long-Term-Harness 275 neue Injuries in 112 Spielen. Das entsprach 2.46 neuen Injuries pro Spiel und 80 schweren Ausfaellen (`OUT` oder `INJURED_RESERVE`).

## Umgesetzter Scope

- Injury-Basisrate reduziert.
- Exposure-Multiplikator reduziert.
- Fatigue-Anteil der Injury-Formel geglaettet.
- Maximalrisiko gesenkt.
- Severity-Verteilung neu kalibriert:
  - `QUESTIONABLE` ist jetzt der haeufigste Minor-Status und bleibt spielrelevant, ohne den Spieler automatisch aus dem Roster zu nehmen.
  - `DOUBTFUL`, `OUT` und `INJURED_RESERVE` treten seltener auf.
  - `INJURED_RESERVE` bleibt moeglich, ist aber deutlich seltener.

## Formel- und Parametervergleich

| Parameter | Vor AP20 | Nach AP20 |
| --- | ---: | ---: |
| Basisrate | 0.015 | 0.006 |
| Exposure-Multiplikator | 0.035 | 0.022 |
| Mindestchance | 0.015 | 0.004 |
| Maximalchance | 0.18 | 0.11 |
| Fatigue-Divisor | 140 | 220 |

## Severity-Verteilung

| Status | Vor AP20 | Nach AP20 |
| --- | ---: | ---: |
| `QUESTIONABLE` | 55% | 70% |
| `DOUBTFUL` | 17% | 17% |
| `OUT` | 16% | 10% |
| `INJURED_RESERVE` | 12% | 3% |
| Schwere Ausfaelle (`OUT` + `INJURED_RESERVE`) | 28% | 13% |

## Long-Term-Ergebnis

Long-Term-Batch: 4 Saisons, 14 Wochen, 2 Spiele pro Woche, 112 Spiele gesamt.

| Metrik | Vor AP20 | Nach AP20 |
| --- | ---: | ---: |
| Spiele | 112 | 112 |
| Neue Injuries | 275 | 182 |
| Injuries pro Spiel | 2.46 | 1.63 |
| Schwere Ausfaelle | 80 | 35 |
| Schwere Ausfaelle pro Spiel | 0.71 | 0.31 |

Die Injury-Rate sinkt damit um 33.8%. Schwere Ausfaelle sinken um 56.3%. Auf die urspruengliche Analyse von 170 Injuries in 72 Spielen bezogen entspricht die neue Rate etwa 117 Injuries in 72 Spielen.

### Statusverteilung nach AP20

| Status | Anzahl |
| --- | ---: |
| `QUESTIONABLE` | 122 |
| `DOUBTFUL` | 25 |
| `OUT` | 24 |
| `INJURED_RESERVE` | 11 |

### Team-Snapshot nach AP20

| Team | Bilanz | Neue Injuries | Schwere Ausfaelle | Avg. Fatigue |
| --- | ---: | ---: | ---: | ---: |
| A | 47-9 | 36 | 5 | 26.04 |
| B | 0-56 | 50 | 12 | 26.43 |
| C | 28-28 | 50 | 9 | 25.14 |
| D | 37-19 | 46 | 9 | 27.08 |

## Bewertung

Injuries bleiben sichtbar und gameplay-relevant: Es entstehen weiterhin Minor- und Availability-Entscheidungen, und schwere Verletzungen sind nicht verschwunden. Gleichzeitig dominieren sie das Roster-Management nicht mehr in der bisherigen Haerte, weil Minor-Statuses klar von echten Ausfaellen getrennt sind und `INJURED_RESERVE` deutlich seltener entsteht.

AP19 hat die Injury-Rate indirekt nicht ausreichend geloest. Der AP20-Vergleichslauf nach AP19 lag weiterhin bei 275 Injuries in 112 Spielen. Die AP20-Kalibrierung war deshalb notwendig.

## Tests

| Command | Ergebnis |
| --- | --- |
| `npx vitest run src/modules/players/domain/player-injury.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/seasons/application/simulation/weekly-preparation.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts` | Gruen: 4 Files, 15 Tests |
| `npx vitest run src/modules/players/domain/player-injury.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/seasons/application/simulation/weekly-preparation.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/simulation-balancing.test.ts` | Gruen: 7 Files, 32 Tests |
| `npx vitest run src/modules/seasons/application/simulation/production-qa.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/savegames/application/week-flow.service.test.ts` | Gruen: 3 Files, 17 Tests |
| Long-Term-Injury-Batch, 112 Spiele | Gruen: 182 neue Injuries, 35 schwere Ausfaelle |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run test:e2e:week-loop` | Gruen ausserhalb der Sandbox: 1 Playwright-Test bestanden |

Hinweis: Der erste Sandbox-Lauf von `npm run test:e2e:week-loop` scheiterte vor Playwright an `tsx` IPC mit `EPERM` auf einer lokalen Pipe. Der identische Lauf ausserhalb der Sandbox war gruen.

## Geaenderte Dateien

- `src/modules/players/domain/player-injury.ts`
- `src/modules/players/domain/player-injury.test.ts`
- `src/modules/seasons/application/simulation/player-condition.test.ts`
- `docs/reports/phases/phase-project-improvement-ap20-injury-rate-calibration-report.md`

## Bekannte Einschraenkungen

- Der Long-Term-Batch nutzt synthetische Teamprofile und dient als Kalibrierungsnachweis, nicht als finale Liga-Realismusstudie.
- Minor-Injuries werden weiterhin als neue Injury-Ereignisse gezaehlt, obwohl `QUESTIONABLE` den Spieler nicht automatisch aus dem Roster nimmt.
- Es wurde keine neue Medical-, Reha- oder UI-Mechanik eingefuehrt.

## Freigabe

AP20 ist Gruen. AP21 darf freigegeben werden. AP21 wurde nicht gestartet.
