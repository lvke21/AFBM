# AP 8 - Post-Game Entscheidungsfeedback im Report

Datum: 2026-04-26

Status: Gruen

## Ziel

Post-Game-Reports sollen Managerentscheidungen besser erklaeren: Gameplan, X-Factor, Ratings und Matchups in normaler Sprache, ohne technische Rohdatenflut und ohne neue Persistenzpflicht.

## Umsetzung

Aktualisiert:

- `src/components/match/match-report-model.ts`
- `src/components/match/match-report-model.test.ts`
- `src/modules/seasons/application/match-query.service.ts`

## Was umgesetzt wurde

- `MatchReportTeam` kennt jetzt optional die persistierten X-Factor-Plaene aus AP 7.
- `toMatchTeamSummary` normalisiert alte oder fehlende X-Factor-Daten graceful zu `null`.
- Der Why-Won/Lost-Faktor `Gameplan` wurde zu `Gameplan & X-Factor` erweitert.
- Der Report ergaenzt kurze Entscheidungsfeedback-Saetze:
  - Offense-Fokus
  - Protection
  - Offense Matchup
  - Defense-Fokus
  - Defense Matchup
  - Takeaway-Plan
- Alte Reports ohne X-Factor-Daten bleiben lesbar und fallen auf die bisherigen Gameplan-Erklaerungen zurueck.

## Bewusste Grenzen

- Keine neue Persistenz.
- Keine Behauptung harter Kausalitaet jenseits vorhandener BoxScore-/Drive-/Gameplan-Daten.
- Keine UI-Grossumbauten; die bestehenden Why-Won/Lost-Komponenten nutzen das erweiterte Modell weiter.

## Tests

Gruen:

- `npx tsc --noEmit`
- `npx vitest run src/components/match/match-report-model.test.ts src/modules/gameplay/application/engine-decision-reporting.test.ts`
  - 2 Testdateien / 11 Tests.
- `npx vitest run src/modules/gameplay/application/game-stats-reporting.test.ts`
  - 1 Testdatei / 1 Test.
- `npm run lint`

## Akzeptanzkriterien

- Report benennt nachvollziehbare Entscheidungs-/Rating-Faktoren: Gruen.
- Gameplan/X-Factor erscheint als kompakter Faktor: Gruen.
- Alte Matchdaten ohne Plan bleiben lesbar: Gruen.
- Keine Rohdatenflut im Report-Modell: Gruen.

Status: Gruen.
