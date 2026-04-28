# AP 16 - AI Team Behavior

Datum: 2026-04-26

Status: Gruen

## Ziel

AI-Teams sollen vor Spielen einfache, nachvollziehbare strategische Entscheidungen treffen. Die Entscheidungen sollen ohne ML, ohne Playcalling-Neuschreibung und ohne Firestore-Produktivaktivierung in bestehende Gameplan-/Simulationspfade wirken.

## Umgesetzter Scope

Umgesetzt:

- neues Domain-Modul fuer AI-Team-Strategie
- deterministische Strategieauswahl anhand von:
  - Team-Overall
  - Gegner-Overall
  - Heimvorteil
  - Fatigue
  - Injury-Status wichtiger Spieler
- vier klare Strategie-Archetypen:
  - `FAVORITE_CONTROL`
  - `UNDERDOG_VARIANCE`
  - `BALANCED_MATCHUP`
  - `PROTECT_WEAKENED`
- Match Context fuellt fehlende Team-Gameplans automatisch mit AI-Strategien
- gespeicherte Manager-/Team-Gameplans bleiben vorrangig erhalten
- klassische Simulation nutzt die AI-Offense-Aggression als kleinen Risiko-Bias fuer Drive-/Fourth-Down-Entscheidungen
- bestehende Week-/Simulation-Flows bleiben stabil

Nicht umgesetzt:

- keine ML-/Learning-Logik
- keine komplette Playcalling-Neuschreibung
- keine neue AI-UI
- keine Firestore-Produktivmigration
- keine Aenderung an Auth, Week-State, AP14-Fatigue-Regeln oder AP15-Injury-Regeln

## Geaenderte Dateien

- `src/modules/gameplay/domain/ai-team-strategy.ts`
- `src/modules/gameplay/domain/ai-team-strategy.test.ts`
- `src/modules/seasons/application/simulation/simulation.types.ts`
- `src/modules/seasons/application/simulation/match-context.ts`
- `src/modules/seasons/application/simulation/match-context.test.ts`
- `src/modules/seasons/application/simulation/match-engine.ts`
- `docs/reports/phases/phase-project-improvement-ap16-ai-team-behavior-report.md`

## AI-Regeln

### Effektive Team-Staerke

Die AI berechnet pro Team eine konservative `effectiveRating`:

- Basis ist `overallRating`
- Heimteam erhaelt einen kleinen Bonus
- Fatigue ueber normaler Spieltagsfrische senkt die effektive Staerke
- `QUESTIONABLE`, `DOUBTFUL`, `OUT` und `INJURED_RESERVE` erzeugen steigenden Druck
- Verletzungen auf Schluesselpositionen wie QB, RB, WR, LT, CB, Safety und MLB zaehlen staerker

### Strategie-Archetypen

`PROTECT_WEAKENED`

- greift vor Favorit-/Underdog-Regeln, wenn Fatigue/Injuries kritisch sind
- Offense: Balanced
- Aggression: Conservative
- Tempo: Slow
- Protection: Max Protect
- Turnover Plan: Protect Ball

`FAVORITE_CONTROL`

- bei deutlichem positiven Matchup Edge
- Offense: Run First
- Defense: Stop Run
- Aggression: Conservative
- Tempo: Slow
- Turnover Plan: Protect Ball

`UNDERDOG_VARIANCE`

- bei deutlichem negativen Matchup Edge
- Offense: Pass First
- Defense: Limit Pass
- Aggression: Aggressive
- Tempo: Hurry Up
- Protection: Fast Release
- Turnover Plan: Hunt Turnovers

`BALANCED_MATCHUP`

- bei engem, gesundem Matchup
- nutzt balancierte Default-X-Factors

### Integration

Im `buildMatchContext` werden pro Team Gameplans bereitgestellt:

- gespeicherte `offenseXFactorPlan` / `defenseXFactorPlan` bleiben erhalten
- fehlende Plaene werden durch AI-Strategie ergaenzt
- `teamGameplans` macht die Team-Entscheidung fuer Simulation sichtbar

In der klassischen Simulation beeinflusst die Offense-Aggression den bestehenden Coaching-Risk-Pfad moderat:

- Conservative AI verschiebt Risk Profile in Richtung konservativ
- Aggressive AI verschiebt Risk Profile in Richtung aggressiv
- Balanced bleibt unveraendert

## Tests

Gruen:

- `npx vitest run src/modules/gameplay/domain/ai-team-strategy.test.ts src/modules/seasons/application/simulation/match-context.test.ts src/modules/seasons/application/simulation/match-engine.test.ts`
  - 3 Testdateien / 19 Tests.
- `npx vitest run src/modules/seasons/application/simulation/production-qa.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/savegames/application/week-flow.service.test.ts src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts`
  - 6 Testdateien / 29 Tests.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

Hinweis: Der Browser-E2E wurde ausserhalb der Sandbox ausgefuehrt, weil `tsx` in der Sandbox keine lokale IPC-Pipe unter `/var/folders/.../T/tsx-501/*.pipe` oeffnen durfte.

## Bekannte Einschraenkungen

- AI-Strategien werden noch nicht in einer eigenen UI angezeigt.
- Es gibt keine langfristige Teamidentitaet, Coaching-Tendenz oder Lernkomponente.
- Die klassische Simulation nutzt AP16 bewusst nur als moderaten Risk-Bias; detailliertes Playcalling bleibt weiterhin Aufgabe der bestehenden Engine.
- Balancewerte sind konservative Startwerte und sollten nach laengeren Saison-Laeufen kalibriert werden.
- Keine Firestore-Produktivmigration; Prisma bleibt Default.

## Bewertung

AP16 ist gruen. AI-Teams treffen vor Spielen jetzt nachvollziehbare, deterministische Entscheidungen und reagieren auf Favoritenrolle, Underdog-Situation sowie Fatigue/Injuries. Die Integration bleibt minimal-invasiv und destabilisiert Week Loop, Simulation, Fatigue oder Injury-System nicht.

## Freigabe

AP17 ist fachlich freigegeben, wurde aber nicht gestartet.

Status: Gruen.
