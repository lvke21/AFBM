# AP21 - Development Focus Anti-Meta Tuning

## Status

AP21 ist Gruen. Development Focus bleibt ein spuerbarer Weekly-XP-Hebel, verliert bei wiederholtem Fokus auf denselben Spieler aber leicht an Effizienz. AP22 ist freigegeben, wurde aber nicht gestartet.

## Gefundene Meta-Ursache

Die Progression-Analyse zeigte, dass `developmentFocus` in `calculateWeeklyTrainingXp` pauschal +22 XP gab. Dadurch konnte ein Spieler ohne weitere Kosten jede Woche ueber die Trainingsschwelle gedrueckt werden, z. B. von 64 auf 86 XP. Da der Bonus nicht wusste, ob derselbe Spieler bereits in den Vorwochen fokussiert wurde, war die dominante Strategie: dieselben High-Potential-Starter dauerhaft markieren.

## Gewaehlte Anti-Meta-Loesung

AP21 fuehrt fuer Weekly Training leichte Diminishing Returns auf den Development-Focus-Bonus ein:

- erster Focus in Serie: +22 XP
- zweite Woche in Serie: +18 XP
- dritte Woche in Serie: +14 XP
- vierte und weitere Wochen in Serie: +10 XP

Der Bonus bleibt damit klar positiv, faellt aber nicht mehr dauerhaft ohne Trade-off maximal aus. High-Potential-Spieler profitieren weiterhin, aber Rotation zwischen Fokus-Spielern wird attraktiver.

Die Serie wird minimal-invasiv aus bestehenden Development-History-Events abgeleitet. Es gibt keine neue Tabelle und keine neue Trainingsarchitektur. Neue History-Beschreibungen enthalten den angewendeten Focus-Bonus, damit Folgewochen die Serie erkennen koennen.

## Alte vs neue XP-Beispiele

| Beispiel | Vor AP21 | Nach AP21 |
| --- | ---: | ---: |
| Kein Focus | 64 XP | 64 XP |
| Frischer Focus | 86 XP | 86 XP |
| 1 vorherige Focus-Woche | 86 XP | 82 XP |
| 2 vorherige Focus-Wochen | 86 XP | 78 XP |
| 3+ vorherige Focus-Wochen | 86 XP | 74 XP |

Domain-Testprofil:

| Szenario | XP |
| --- | ---: |
| Kein Focus | 68 |
| Frischer Focus | 90 |
| 3+ vorherige Focus-Wochen | 78 |

## Umgesetzter Scope

- Weekly-Focus-XP in eine eigene Domain-Funktion gekapselt.
- Optionales `developmentFocusStreakWeeks` im Progression-Kontext ergaenzt.
- Week-Development-Service berechnet den Focus-Streak aus bisherigen Development-History-Events derselben Season.
- Development-History beschreibt neuen Focus-Bonus fuer zukuenftige Streak-Erkennung.
- Tests fuer Focus-vs-No-Focus, wiederholten Focus, Caps und Edge Cases erweitert.

## Geaenderte Dateien

- `src/modules/players/domain/player-progression.ts`
- `src/modules/players/domain/player-progression.test.ts`
- `src/modules/seasons/application/simulation/player-development.ts`
- `src/modules/seasons/application/simulation/player-development.test.ts`
- `src/modules/savegames/application/weekly-player-development.service.ts`
- `src/modules/savegames/application/weekly-player-development.service.test.ts`
- `src/app/app/savegames/[savegameId]/week-actions.test.ts`
- `docs/reports/phases/phase-project-improvement-ap21-development-focus-anti-meta-report.md`

## Tests

| Command | Ergebnis |
| --- | --- |
| `npx vitest run src/modules/players/domain/player-progression.test.ts src/modules/seasons/application/simulation/player-development.test.ts src/modules/savegames/application/weekly-player-development.service.test.ts src/modules/savegames/domain/weekly-plan.test.ts` | Gruen: 4 Files, 17 Tests |
| `npx vitest run src/modules/savegames/application/week-flow.service.test.ts 'src/app/app/savegames/[savegameId]/week-actions.test.ts' src/modules/seasons/application/season-simulation.service.test.ts` | Gruen: 3 Files, 20 Tests |
| `npx vitest run src/modules/players/domain/player-progression.test.ts src/modules/seasons/application/simulation/player-development.test.ts src/modules/savegames/application/weekly-player-development.service.test.ts src/modules/savegames/domain/weekly-plan.test.ts src/modules/savegames/application/week-flow.service.test.ts 'src/app/app/savegames/[savegameId]/week-actions.test.ts' src/modules/seasons/application/season-simulation.service.test.ts` | Gruen: 7 Files, 37 Tests |
| `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/seasons/application/simulation/simulation-balancing.test.ts src/modules/seasons/application/simulation/production-qa.test.ts` | Gruen: 4 Files, 22 Tests |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run test:e2e:week-loop` | Gruen ausserhalb der Sandbox: 1 Playwright-Test bestanden |

Hinweis: Der Sandbox-Lauf von `npm run test:e2e:week-loop` scheiterte vor Playwright an `tsx` IPC mit `EPERM` auf einer lokalen Pipe. Der identische Lauf ausserhalb der Sandbox war gruen.

## Bekannte Einschraenkungen

- Der Streak wird aus Development-History-Events abgeleitet. Wenn ein fokussierter Spieler in einer Woche keine Attributentwicklung ausloest und deshalb kein Development-Event geschrieben wird, zaehlt diese Woche nicht als fortgesetzter Focus-Streak.
- Die Anti-Meta-Loesung betrifft bewusst Weekly Training. Game-XP bleibt unveraendert, damit AP21 keine Match-Progression oder Simulationsergebnisse neu balanciert.
- Bestehende alte History-Eintraege ohne Focus-Marker starten nicht rueckwirkend mit einem Streak. Die neue Wirkung greift sauber ab AP21-Eintraegen.

## Bewertung

AP21 erfuellt die Akzeptanzkriterien: Focus bleibt attraktiv, wiederholter Focus verliert leicht an Effizienz, XP-Caps bleiben aktiv, Edge Cases sind getestet, und Week Loop sowie Simulation bleiben stabil.

## Freigabe

AP21 ist Gruen. AP22 darf freigegeben werden. AP22 wurde nicht gestartet.
