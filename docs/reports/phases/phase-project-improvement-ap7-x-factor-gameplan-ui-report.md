# AP 7 - X-Factor/Gameplan UI als spielbare Entscheidung

Datum: 2026-04-26

Status: Gruen

## Ziel

Pre-Game-X-Factor-Plaene aus der vorhandenen Engine-Domain im Game-Preparation-Flow nutzbar machen: UI-Auswahl, serverseitige Validierung, persistenter Snapshot und Weitergabe in den Simulationskontext.

## Umsetzung

Aktualisiert:

- `prisma/schema.prisma`
- `prisma/migrations/20260426124434_ap7_x_factor_gameplan/migration.sql`
- `src/modules/gameplay/domain/pre-game-x-factor.ts`
- `src/components/match/game-preparation-model.ts`
- `src/components/match/game-preparation-panel.tsx`
- `src/app/app/savegames/[savegameId]/matches/[matchId]/actions.ts`
- `src/modules/seasons/application/match-preparation.service.ts`
- `src/modules/seasons/infrastructure/match-preparation.repository.ts`
- `src/server/repositories/matchRepository.prisma.ts`
- `src/modules/seasons/application/match-query.service.ts`
- `src/modules/seasons/application/simulation/match-context.ts`
- `src/modules/seasons/application/simulation/simulation.types.ts`
- `src/components/match/game-preparation-model.test.ts`
- `src/modules/seasons/application/match-preparation.service.test.ts`
- `src/modules/seasons/application/simulation/match-context.test.ts`

## Was umgesetzt wurde

- Team-Persistenz fuer X-Factor-Plaene ergaenzt:
  - `Team.offenseXFactorPlan`
  - `Team.defenseXFactorPlan`
- `parsePreGameXFactorPlan` validiert Formwerte gegen die bestehenden X-Factor-Optionen und faellt sicher auf Defaults zurueck.
- Game-Preparation-UI bietet jetzt konkrete X-Factor-Entscheidungen:
  - Offensive Focus
  - Protection
  - Tempo
  - Offense Matchup
  - Defensive Focus
  - Defense Matchup
  - Offense Risk
  - Defense Risk
  - Ball Security
  - Takeaway Plan
- Die UI zeigt Trade-off-Texte direkt an den Controls.
- `updateMatchPreparationForUser` speichert Schemes und X-Factor-Plaene zusammen, aber weiterhin nur fuer das manager-kontrollierte Team und nur vor Kickoff.
- Match-Detail-Reads reichen persistierte X-Factor-Plaene an das Preparation-Model weiter.
- Der Simulationskontext uebernimmt persistierte Plaene, damit Engine-Hooks nicht nur Defaults sehen.

## Bewusste Grenzen

- Keine komplette Engine-Umschreibung.
- Keine produktive Firebase-Aktivierung.
- Keine Report-Erweiterung; Entscheidungsfeedback ist AP 8.
- Die vorhandenen Engine-Hook-Tests pruefen weiterhin die X-Factor-Wirkung in Play Selection und Outcome Resolution.

## Tests

Gruen:

- `npm run prisma:migrate -- --name ap7_x_factor_gameplan`
  - Migration `20260426124434_ap7_x_factor_gameplan` erstellt und angewendet.
- `npx tsc --noEmit`
- `npx vitest run src/components/match/game-preparation-model.test.ts src/modules/seasons/application/match-preparation.service.test.ts src/modules/seasons/application/simulation/match-context.test.ts`
  - 3 Testdateien / 8 Tests.
- `npm run lint`
- `npm run test:e2e:seed`
- `npx vitest run src/modules/gameplay/application/play-selection-engine.test.ts src/modules/gameplay/application/outcome-resolution-engine.test.ts`
  - 2 Testdateien / 32 Tests.

## Akzeptanzkriterien

- Nutzer kann X-Factor-Plan setzen: Gruen.
- Plan wird validiert und gespeichert: Gruen.
- Plan wird im Match-Preparation-Read wieder angezeigt: Gruen.
- Plan wird in den Simulationskontext weitergegeben: Gruen.
- Vorhandene Engine-X-Factor-Wirkung bleibt getestet: Gruen.

Status: Gruen.
