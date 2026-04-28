# AP 9 - Repository- und Domain-Typ-Grenzen entkoppeln

Datum: 2026-04-26

Status: Gruen

## Ziel

Domain- und Application-Code soll fachliche Enum-Werte nicht mehr direkt aus Prisma beziehen, wenn diese Werte als stabile Domain-Typen ausreichen. Prisma bleibt als Persistenz-Backend und fuer Transaktions-/Query-Typen erhalten.

## Scope

Umgesetzt:

- zentrale Domain-Enums unter `src/modules/shared/domain/enums.ts`
- Kompatibilitaetstest gegen Prisma-Enum-Werte
- Umstellung fachlicher Enum-Imports in Domain-, Application- und Firestore-Testpfaden
- Beibehaltung von Prisma-Typimporten an Persistenz- und Transaktionsgrenzen
- keine Aenderung an Enum-Werten, Datenbankmodell oder Firestore-Parity-Logik

Nicht umgesetzt:

- keine Entfernung von Prisma
- keine Repository-Neustrukturierung
- keine Aenderung an Auth
- keine Aenderung an Week-State-Fachlogik oder Game Engine

## Umsetzung

Geaendert:

- `src/modules/shared/domain/enums.ts`
- `src/modules/shared/domain/enums.test.ts`
- `src/modules/shared/domain/roster-status.ts`
- `src/modules/shared/domain/roster-status.test.ts`
- `src/modules/inbox/application/inbox-task.service.ts`
- `src/modules/savegames/application/week-flow.service.ts`
- `src/modules/savegames/application/week-flow.service.test.ts`
- `src/modules/savegames/application/weekly-player-development.service.ts`
- `src/modules/savegames/application/weekly-player-development.service.test.ts`
- `src/modules/savegames/application/bootstrap/initial-roster.ts`
- `src/modules/players/application/player-history.service.ts`
- `src/modules/seasons/application/match-preparation.service.ts`
- `src/modules/seasons/application/match-preparation.service.test.ts`
- `src/modules/seasons/application/season-management.service.ts`
- `src/modules/seasons/application/season-simulation.service.ts`
- `src/modules/seasons/application/season-simulation.service.test.ts`
- `src/modules/seasons/application/simulation/engine-state-machine.ts`
- `src/modules/seasons/application/simulation/engine-state-machine.test.ts`
- `src/modules/seasons/application/simulation/match-context.test.ts`
- `src/modules/seasons/application/simulation/match-result-persistence.ts`
- `src/modules/seasons/application/simulation/player-condition.ts`
- `src/modules/seasons/application/simulation/player-condition.test.ts`
- `src/modules/seasons/application/simulation/production-qa-suite.ts`
- `src/modules/seasons/application/simulation/season-progression.ts`
- `src/modules/seasons/application/simulation/simulation-api.service.ts`
- `src/modules/seasons/application/simulation/simulation.types.ts`
- `src/modules/seasons/application/simulation/weekly-preparation.ts`
- `src/modules/draft/application/draft-pick.service.ts`
- `src/modules/draft/application/draft-pick.service.test.ts`
- `src/modules/draft/application/draft-query.service.ts`
- `src/modules/draft/application/draft-query.service.test.ts`
- `src/modules/draft/application/scouting-command.service.ts`
- `src/modules/draft/application/scouting-command.service.test.ts`
- `src/modules/teams/application/team-finance.service.ts`
- `src/modules/teams/application/team-management.service.test.ts`
- `src/modules/teams/application/team-management.shared.ts`
- `src/modules/teams/application/team-roster.service.ts`
- `src/modules/teams/application/team-roster.service.test.ts`
- `src/server/repositories/gameOutputRepository.firestore.ts`
- `src/server/repositories/weekMatchStateRepository.firestore.ts`
- `src/server/repositories/firestoreE2eParity.test.ts`
- `src/server/repositories/firestoreGameOutput.test.ts`
- `src/server/repositories/firestoreStatsAggregates.test.ts`
- `src/server/repositories/firestoreWeekMatchState.test.ts`
- `docs/reports/phases/phase-project-improvement-ap9-report.md`

Details:

- Domain-Enums decken die aktuell fachlich genutzten Werte fuer Match, Season, Week, Player, Roster, Injury, Draft, Contract, Finance, Inbox, Dominant Hand und Development Trait ab.
- Der neue Kompatibilitaetstest stellt sicher, dass Domain-Enum-Werte exakt mit Prisma-Persistenzwerten uebereinstimmen.
- Application-Code verwendet fachliche Domain-Enums; `type Prisma` bleibt dort erhalten, wo Transaktionsclients oder Prisma-Payload-Typen die Schnittstelle bilden.

## Tests

Gruen:

- `npx tsc --noEmit`
- `npm run lint`
- `npx vitest run src/modules/shared/domain/enums.test.ts src/modules/shared/domain/roster-status.test.ts src/modules/inbox/application/inbox-task.service.test.ts src/modules/savegames/application/week-flow.service.test.ts src/modules/savegames/application/weekly-player-development.service.test.ts src/modules/seasons/application/season-management.service.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/seasons/application/simulation/engine-state-machine.test.ts src/modules/seasons/application/simulation/match-context.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/draft/application/draft-query.service.test.ts src/modules/draft/application/scouting-command.service.test.ts src/modules/draft/application/draft-pick.service.test.ts src/modules/teams/application/team-management.service.test.ts src/modules/teams/application/team-roster.service.test.ts`
  - 14 Testdateien / 51 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:week-state"`
  - 1 Testdatei / 8 Tests.
- `npm run test:e2e:week-loop`
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

## Bewertung

AP9 ist gruen. Fachliche Enum-Nutzung ist aus Prisma herausgezogen, waehrend Persistenzgrenzen stabil bleiben. Die Regressionstests zeigen keine Auswirkungen auf Week-State, Firestore-State oder Browser-Week-Loop.

## Bekannte Einschraenkungen

- Prisma-Typimporte bleiben bewusst in Repository-, Bootstrap- und Transaktionsschnittstellen bestehen.
- Die Entkopplung ist auf fachliche Enum-Werte fokussiert; eine vollstaendige Repository-Abstraktion war nicht Scope von AP9.

## Freigabe

Das naechste Arbeitspaket ist freigegeben und wird gemaess Sequenz gestartet.

Status: Gruen.
