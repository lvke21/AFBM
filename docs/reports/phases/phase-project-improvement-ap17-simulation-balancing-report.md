# AP 17 - Simulation Balancing

Datum: 2026-04-26

Status: Gruen

## Ziel

Simulationsergebnisse sollen plausibler, stabiler und besser erklaerbar werden. AP17 fuegt dafuer einen kontrollierten Batch-Balancing-Test hinzu und nimmt nur eine kleine, begruendete Parameteranpassung vor.

## Umgesetzter Scope

Umgesetzt:

- neues Balancing-Batch-Modul fuer kontrollierte Simulation-Szenarien
- deterministische Batch-Laeufe mit festen Seeds
- Auswertung von:
  - Favorite Win Rate
  - Upset Rate
  - Score Distribution
  - Blowout Rate
  - Max Total Score
  - Score-Standardabweichung
  - Einfluss von Fatigue auf ein geschwaechtes Team
- Integration von AP16-AI-Team-Gameplans in die Batch-Kontexte
- kleine Balance-Anpassung im klassischen Engine-Readiness-Fatigue-Anteil
- Production-QA-Regression-Fingerprints auf neue deterministische Balance aktualisiert

Nicht umgesetzt:

- keine neue Gameplay-Mechanik
- keine Playcalling-Neuschreibung
- keine Firestore-Produktivmigration
- keine UI-Erweiterung

## Geaenderte Dateien

- `config/game-balance.json`
- `src/modules/seasons/application/simulation/simulation-balancing.ts`
- `src/modules/seasons/application/simulation/simulation-balancing.test.ts`
- `src/modules/seasons/application/simulation/production-qa-suite.ts`
- `docs/reports/phases/phase-project-improvement-ap17-simulation-balancing-report.md`

## Getestete Szenarien

Batch-Groesse: 80 Spiele pro Szenario.

Szenarien:

- `strong-vs-weak`: starkes Heimteam gegen schwaches Auswaertsteam
- `medium-vs-medium`: ausgeglichenes Matchup
- `strong-vs-medium`: Favorit gegen kompetitives Mittelteam
- `weakened-strong-vs-medium`: starkes Team mit moderater Starter-Fatigue gegen Mittelteam

Alle Batch-Laeufe sind deterministisch und mit gleichen Seeds wiederholbar.

## Balancing-Ergebnisse

Gemessene AP17-Batch-Werte:

| Szenario | Favorite Win Rate | Upset Rate | Avg Score | Blowout Rate | Max Score | Score StdDev |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `strong-vs-weak` | 0.613 | 0.275 | 24.38 - 16.89 | 0.125 | 77 | 15.62 |
| `medium-vs-medium` | n/a | n/a | 21.11 - 16.35 | 0.075 | 78 | 15.49 |
| `strong-vs-medium` | 0.525 | 0.375 | 19.27 - 16.26 | 0.050 | 72 | 16.22 |
| `weakened-strong-vs-medium` | 0.075 | 0.863 | 8.86 - 22.31 | 0.175 | 76 | 12.63 |

Bewertung:

- starke Teams gewinnen haeufiger als schwache Teams
- Mittel-vs-Mittel bleibt kompetitiv
- normale Szenarien erzeugen keine auffaelligen Score-Ausreisser
- Blowouts treten auf, dominieren normale Matchups aber nicht
- Fatigue wirkt sichtbar und spielrelevant
- ein kollektiv ermuederter Starter-Kern wird deutlich geschwaecht; das ist gameplay-relevant, bleibt aber ein Bereich fuer spaetere Feinkalibrierung

## Parameteraenderung

Datei: `config/game-balance.json`

Geaendert:

- `playerImpact.readiness.fatigueCenter`: `10` -> `18`
- `playerImpact.readiness.fatigueDivisor`: `220` -> `280`

Begruendung:

Die Batch-Analyse zeigte, dass moderate Starter-Fatigue im klassischen Engine-Readiness-Pfad zu hart wirkte, weil Fatigue bereits ueber AP14-Game-Day-Multiplikatoren einfliesst. Die Anpassung reduziert diese Doppelwirkung leicht, ohne AP14s explizite Fatigue-/Snap-Regeln zu veraendern.

Auswirkung:

- normale Scores bleiben stabil
- geschwaechte Teams werden weiter klar bestraft
- deterministische Simulation-Fingerprints haben sich erwartungsgemaess geaendert und wurden aktualisiert

## Tests

Gruen:

- `npx vitest run src/modules/seasons/application/simulation/simulation-balancing.test.ts`
  - 1 Testdatei / 2 Tests.
- `npx vitest run src/modules/seasons/application/simulation/simulation-balancing.test.ts src/modules/seasons/application/simulation/production-qa.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/gameplay/domain/ai-team-strategy.test.ts src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 8 Testdateien / 43 Tests.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

Hinweis: Der Browser-E2E wurde ausserhalb der Sandbox ausgefuehrt, weil `tsx` in der Sandbox keine lokale IPC-Pipe unter `/var/folders/.../T/tsx-501/*.pipe` oeffnen durfte.

## Bekannte Einschraenkungen

- Die Batch-Szenarien sind bewusst klein und deterministisch; sie ersetzen keine lange Saisonkalibrierung.
- `strong-vs-medium` bleibt kompetitiv mit relativ hoher Upset-Rate. Das ist akzeptabel fuer Varianz, sollte aber nach mehr Saison-Daten beobachtet werden.
- Das geschwaechte starke Team wird sehr deutlich geschlagen; Fatigue bleibt damit strategisch wichtig, aber die Langzeitbalance sollte weiter beobachtet werden.
- Keine UI fuer Balance-Reports.
- Keine Firestore-Produktivmigration; Prisma bleibt Default.

## Bewertung

AP17 ist gruen. Die Simulation besitzt jetzt einen reproduzierbaren Balancing-Batch, der Teamstaerke, Score-Verteilung, Upsets, Blowouts und Fatigue-Einfluss prueft. Die einzige Parameteraenderung ist klein, begruendet und durch Regressionstests abgesichert.

## Freigabe

AP18 ist fachlich freigegeben, wurde aber nicht gestartet.

Status: Gruen.
