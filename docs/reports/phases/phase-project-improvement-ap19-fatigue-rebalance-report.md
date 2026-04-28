# AP 19 - Fatigue Penalty Rebalance

Datum: 2026-04-26

Status: Gruen

## Ziel

Die Gameplay-Analyse zeigte ein kritisches Problem: ein Team mit hoher Starter-Fatigue verlor im Szenario `intense-fatigue-vs-balanced` 0/60 Spiele, bei 68.3% Blowout Rate. AP19 kalibriert Fatigue so, dass sie weiterhin spuerbar und strategisch relevant bleibt, aber keine automatische Niederlage mehr erzeugt.

## Ursache

Fatigue wirkte an zwei Stellen gleichzeitig:

- `buildFatigueGameDayProfile` senkte Game-Day-Readiness und Snap-Anteile.
- `match-engine.readinessMultiplier` zog rohe Fatigue zusaetzlich linear von der Attribut-Readiness ab.

Bei hoher Fatigue addierten sich beide Effekte zu stark. Das erzeugte vor allem bei kollektiv ermuederen Startern einen Performance-Crash statt eines spielbaren Risikos.

## Alte Kurve

### Game-Day-Profil

- Fatigue bis 35: keine Readiness-Strafe
- Fatigue 35-60: linear `0.002` pro Punkt
- Fatigue ueber 60: linear `0.003` pro Punkt
- Readiness-Untergrenze: `0.82`
- Snap-Untergrenze: `0.78`

Beispiele:

- Fatigue 80: Readiness `0.89`, Snaps `0.8925`
- Fatigue 99: Readiness `0.833`, Snaps `0.807`

### Engine-Readiness

Die Match-Engine nutzte zusaetzlich:

- `(fatigue - fatigueCenter) / fatigueDivisor`

Das war effektiv linear und hatte keinen Soft Cap fuer hohe Werte.

## Neue Kurve

### Game-Day-Profil

Die Kurve ist weiter gestaffelt, aber mit weicheren hohen Werten:

- Fatigue bis 35: keine Readiness-Strafe
- Fatigue 35-60: `0.0008` pro Punkt
- Fatigue ueber 60: `0.02 + 0.001` pro Punkt ueber 60
- Snap-Strafe:
  - Fatigue bis 45: keine Snap-Strafe
  - Fatigue 45-70: `0.0008` pro Punkt
  - Fatigue ueber 70: `0.02 + 0.0012` pro Punkt ueber 70
- Readiness-Untergrenze: `0.92`
- Snap-Untergrenze: `0.88`

Beispiele:

- Fatigue 80: Readiness `0.96`, Snaps `0.968`
- Fatigue 99: Readiness ca. `0.941`, Snaps ca. `0.9452`

### Engine-Readiness Soft Cap

Die rohe Fatigue-Strafe ist nicht mehr linear. Sie nutzt drei Baender:

- Moderate Band: erste 15 Punkte ueber Center mit normalem Divisor
- Heavy Band: naechste 37 Punkte mit stark reduziertem Zuwachs
- Soft-Cap Band: alles darueber mit sehr kleinem Zuwachs
- absolute Strafen-Obergrenze: `0.14`

Damit bleibt mittlere Fatigue sichtbar, aber hohe Fatigue eskaliert nicht mehr endlos.

## Testergebnisse

### Zieltest: `intense-fatigue-vs-balanced`

Batch: 60 Spiele, gleiches Teamniveau, Team A mit Starter-Fatigue 58, beide Teams Balanced Gameplan.

| Metrik | Vor AP19 | Nach AP19 |
| --- | ---: | ---: |
| Win Rate High-Fatigue-Team | 0.000 | 0.100 |
| Average Total Score | 37.55 | 30.93 |
| Average Margin | 30.18 | 13.23 |
| Blowout Rate | 0.683 | 0.133 |
| Close Game Rate | 0.017 | 0.367 |
| Max Total Score | 72 | 62 |

Bewertung:

- 0%-Winrate ist behoben.
- Blowouts sind deutlich reduziert.
- High Fatigue bleibt klar nachteilig: 10% Winrate ist weiterhin hart, aber nicht mehr automatisch verloren.

### Kontrollvergleich: `recovery-fatigue-vs-balanced`

Batch: 60 Spiele, Team A mit niedriger Starter-Fatigue 18.

| Metrik | Nach AP19 |
| --- | ---: |
| Win Rate Recovery-Team | 0.533 |
| Average Total Score | 32.57 |
| Average Margin | 7.80 |
| Blowout Rate | 0.000 |
| Close Game Rate | 0.650 |

Bewertung:

- Recovery bleibt sinnvoll.
- Frische Teams bleiben kompetitiv.
- Fatigue ist nicht egal geworden.

## Ausgefuehrte Tests

Gruen:

- `npx vitest run src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/simulation-balancing.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/players/domain/player-injury.test.ts`
  - 6 Testdateien / 30 Tests.
- `npx vitest run src/modules/seasons/application/simulation/production-qa.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 3 Testdateien / 17 Tests.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

Hinweis: Der Browser-E2E wurde ausserhalb der Sandbox ausgefuehrt, weil `tsx` in der Sandbox keine lokale IPC-Pipe unter `/var/folders/.../T/tsx-501/*.pipe` oeffnen durfte.

## Geaenderte Dateien

- `src/modules/seasons/application/simulation/fatigue-recovery.ts`
- `src/modules/seasons/application/simulation/fatigue-recovery.test.ts`
- `src/modules/seasons/application/simulation/depth-chart.test.ts`
- `src/modules/seasons/application/simulation/match-engine.ts`
- `src/modules/seasons/application/simulation/simulation-balancing.test.ts`
- `src/modules/seasons/application/simulation/production-qa-suite.ts`
- `docs/reports/phases/phase-project-improvement-ap19-fatigue-rebalance-report.md`

## Bekannte Einschraenkungen

- High-Fatigue bleibt sehr schwer zu spielen. 10% Winrate ist bewusst hart, sollte aber in groesseren Saison-Batches weiter beobachtet werden.
- Die Production-QA-Fingerprints mussten aktualisiert werden, weil AP19 absichtlich deterministische Simulationsergebnisse veraendert.
- AP19 loest nicht die separate Injury-Rate-Frage aus der Gameplay-Analyse; das bleibt ein eigenes Folgepaket.

## Bewertung

AP19 ist gruen. Fatigue bleibt ein relevanter Management-Hebel, aber die automatische Niederlage durch hohe Starter-Fatigue wurde entfernt. Die neue Kurve nutzt Diminishing Returns und einen Soft Cap, wodurch hohe Fatigue weiterhin schmerzt, ohne das Spiel komplett zu zerstoeren.

Status: Gruen.
