# AP22 - AI/Gameplan Report Persistence Light

## Status

AP22 ist Gruen. AI-/Gameplan-Informationen werden nach der Simulation leichtgewichtig pro Team-Match-Stat persistiert und im Match Report aus historischen Matchdaten gelesen. AP23 ist freigegeben, wurde aber nicht gestartet.

## Umgesetzter Scope

- `TeamMatchStat` wurde um ein optionales JSON-Feld `gameplanSummary` erweitert.
- Beim Persistieren eines Match-Ergebnisses wird aus `SimulationMatchContext.teamGameplans` pro Team ein kompaktes Report-Summary erzeugt.
- Die Match-Query mappt `gameplanSummary` defensiv und gibt bei alten Matches ohne Feld `null` zurueck.
- Das Match-Report-Model bevorzugt die persistierte Summary vor aktuellen Team-X-Factor-Plans.
- Fehlt die historische Summary, zeigt der Report explizit: `AI-/Gameplan-Zusammenfassung nicht verfuegbar.`

## Gespeicherte und angezeigte AI-Information

Persistiert wird pro Team:

- `aiStrategyArchetype`, z. B. `UNDERDOG_VARIANCE`
- menschenlesbares `label`, z. B. `underdog variance`
- menschenlesbare `summary`, z. B. `AI/Gameplan: underdog variance, pass first, aggressive, hurry up.`
- grober `offenseFocus`
- grober `defenseFocus`
- grobe `aggression`

Die UI nutzt diese Summary im bestehenden Feedback-Block `AI/Gameplan` und im `Gameplan & X-Factor`-Faktor, ohne neue Report-Architektur.

## Geaenderte Dateien

- `prisma/schema.prisma`
- `prisma/migrations/20260426180000_ap22_ai_gameplan_report/migration.sql`
- `src/modules/seasons/application/simulation/match-result-persistence.ts`
- `src/modules/seasons/application/simulation/match-result-persistence.test.ts`
- `src/modules/seasons/application/match-query.service.ts`
- `src/modules/seasons/application/match-query.service.test.ts`
- `src/components/match/match-report-model.ts`
- `src/components/match/match-report-model.test.ts`
- `docs/reports/phases/phase-project-improvement-ap22-ai-gameplan-report-persistence-report.md`

## Tests

| Command | Ergebnis |
| --- | --- |
| `npm run prisma:generate` | Gruen: Prisma Client neu generiert |
| `npx prisma db execute --file prisma/migrations/20260426180000_ap22_ai_gameplan_report/migration.sql --schema prisma/schema.prisma` | Gruen: lokale AP22-Spalte angelegt |
| `npx prisma migrate resolve --applied 20260426180000_ap22_ai_gameplan_report` | Gruen: Migration lokal als angewendet markiert |
| `npx prisma migrate status` | Gruen: Database schema is up to date |
| `npx vitest run src/modules/seasons/application/simulation/match-result-persistence.test.ts src/modules/seasons/application/match-query.service.test.ts src/components/match/match-report-model.test.ts` | Gruen: 3 Files, 17 Tests |
| `npx vitest run src/modules/seasons/application/simulation/match-result-persistence.test.ts src/modules/seasons/application/match-query.service.test.ts src/components/match/match-report-model.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/production-qa.test.ts` | Gruen: 6 Files, 37 Tests |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run test:e2e:week-loop` | Gruen ausserhalb der Sandbox: 1 Playwright-Test bestanden |

## Bekannte Einschraenkungen

- Bestehende alte Matches erhalten kein rueckwirkendes Gameplan-Summary und zeigen bewusst `nicht verfuegbar`.
- Das Summary ist absichtlich grob und reportt keine komplette Playcalling-Trace.
- Firestore wurde nicht produktiv migriert; Prisma bleibt Default.
- Der lokale Prisma-Migrationslauf brauchte außerhalb der Sandbox Zugriff auf PostgreSQL. Der erste Sandbox-Zugriff auf `db:up` war durch Netzwerk-/Socket-Rechte blockiert.

## Bewertung

AP22 erfuellt das Ziel: Nach neuen Spielen kann der Spieler im Match Report nachvollziehen, welche grobe AI-/Gameplan-Strategie der Gegner verwendet hat. Alte Matches bleiben crashfrei und zeigen einen klaren Fallback.

## Freigabe

AP22 ist Gruen. AP23 darf freigegeben werden. AP23 wurde nicht gestartet.
