# AP 13 - Player Progression System

Datum: 2026-04-26

Status: Gruen

## Ziel

Spieler sollen sich ueber Training und Spiele nachvollziehbar entwickeln. Die erste Version bleibt bewusst minimal, deterministisch testbar und nutzt die vorhandenen Attribute, Evaluations und Player-History-Events.

## Umgesetzter Scope

Umgesetzt:

- neues Domain-Modul fuer Player Progression und XP-Regeln
- deterministische XP-Berechnung fuer:
  - Weekly Training / Week Advance
  - Game Performance / Post-Game-Entwicklung
- Attribut-Progression ueber positionsspezifische Zielattribute
- harte Progressionsgrenzen:
  - kein Growth ueber Potential-Grenze
  - Attribute maximal `99`
  - Training maximal 1 Attributpunkt pro Woche
  - Game-Progression maximal 3 Attributpunkte, mit Development Focus maximal 4
- Weekly Plan aus AP10 beeinflusst Progression ueber:
  - Development-Focus-Auswahl
  - Fatigue-/Morale-Effekte, die in XP einberechnet werden
- Development-History enthaelt jetzt XP im Beschreibungstext
- bestehende Prisma-Default-Pfade bleiben erhalten

Nicht umgesetzt:

- keine neue Datenbanktabelle fuer persistente XP-Konten
- keine komplette Karriere-Simulation
- keine Firestore-Produktivmigration
- keine Auth-Aenderung
- keine UI-Erweiterung, weil XP aktuell nur als History-/Progressionsereignis sauber verfuegbar ist

## Geaenderte Dateien

- `src/modules/players/domain/player-progression.ts`
- `src/modules/players/domain/player-progression.test.ts`
- `src/modules/seasons/application/simulation/player-development.ts`
- `src/modules/seasons/application/simulation/player-development.test.ts`
- `src/modules/seasons/application/simulation/match-result-persistence.ts`
- `src/modules/savegames/application/weekly-player-development.service.ts`
- `src/modules/savegames/application/weekly-player-development.service.test.ts`
- `docs/reports/phases/phase-project-improvement-ap13-player-progression-report.md`

## Progression-Regeln

### Weekly Training XP

Training-XP entsteht beim Week Advance aus:

- Roster-Rolle:
  - Starter mehr XP als Rotation, Backup und Practice Squad
- Depth-Chart-Slot:
  - Slot 1 bis 3 geben kleine Boni
- Potential-Gap:
  - Spieler mit Abstand zu ihrem Potential koennen wachsen
  - Spieler am oder ueber Potential erhalten keine Attributsteigerung
- Development Trait:
  - `IMPACT`, `STAR`, `ELITE` geben gestaffelte XP-Boni
- Morale/Fatigue:
  - hohe Moral hilft leicht
  - hohe Fatigue bremst
- Development Focus:
  - gibt einen klaren XP-Bonus
  - wird vom AP10 Weekly Plan gesetzt

Training wandelt XP ab `70` XP in maximal einen Attributpunkt pro Woche um.

### Game XP

Game-XP entsteht nach einem Spiel aus:

- Snap Count
- Starter-Status
- Big Plays
- Touchdowns
- Mistakes wie Interceptions, Fumbles oder Drops
- Potential-Gap
- Development Trait
- Alter
- Morale/Fatigue
- Development Focus

Game-Progression wandelt XP ab `100` XP in Attributpunkte um. Pro Spiel sind maximal 3 Attributpunkte moeglich, bei Development Focus maximal 4.

### Attributauswahl

Attribute sind positionsspezifisch priorisiert. Beispiele:

- WR: `HANDS`, `ROUTE_RUNNING`, `SEPARATION`, `RELEASE`, `RUN_AFTER_CATCH`
- QB: `THROW_ACCURACY_SHORT`, `THROW_ACCURACY_MEDIUM`, `DECISION_MAKING`, `AWARENESS`, `MOBILITY`
- Defense-Positionen nutzen passende Coverage-, Rush-, Pursuit- oder Tackling-Ziele.

Attribute steigen nur bis maximal `99`. Wenn ein Zielattribut bereits gedeckelt ist, wird das naechste positionsspezifische Ziel versucht.

### Regression

Die vorhandene Alters-/Low-Usage-Regression bleibt konservativ:

- nur fuer Spieler ab 31
- nur bei sehr geringer Spielbelastung
- nur wenn kaum Potential-Gap vorhanden ist
- Attribut-Floor bleibt erhalten

## Tests

Gruen:

- `npx vitest run src/modules/players/domain/player-progression.test.ts src/modules/seasons/application/simulation/player-development.test.ts src/modules/savegames/application/weekly-player-development.service.test.ts src/modules/savegames/domain/weekly-plan.test.ts`
  - 4 Testdateien / 12 Tests.
- `npx vitest run src/modules/players/domain/player-progression.test.ts src/modules/seasons/application/simulation/player-development.test.ts src/modules/savegames/application/weekly-player-development.service.test.ts src/modules/savegames/domain/weekly-plan.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/seasons/application/simulation/match-result-persistence.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 7 Testdateien / 27 Tests.
  - Hinweis: `match-result-persistence.test.ts` existiert aktuell nicht und wurde von Vitest nicht als Testdatei ausgefuehrt.
- `npx vitest run src/modules/savegames/application/weekly-player-development.service.test.ts src/modules/players/domain/player-progression.test.ts src/modules/seasons/application/simulation/player-development.test.ts`
  - 3 Testdateien / 10 Tests.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

## Bekannte Einschraenkungen

- XP wird nicht als eigener langfristiger Kontostand persistiert.
- Die sichtbare UI bleibt unveraendert; XP erscheint aktuell in Development-History-Beschreibungen.
- Weekly Plan beeinflusst Progression indirekt ueber Development Focus, Fatigue und Morale, nicht ueber einen separat gespeicherten Wochenplan.
- Balance-Werte sind konservative Startwerte und sollten nach groesseren Saison-Simulationen nachjustiert werden.

## Bewertung

AP13 ist gruen. Spielerentwicklung ist jetzt als XP-basiertes, deterministisches Regelwerk gekapselt und in die bestehenden Training-/Game-Development-Pfade eingebunden. Die Progression bleibt begrenzt, testbar und nutzt vorhandene Persistenz statt neue Migrationen zu erzwingen.

## Freigabe

AP14 ist fachlich freigegeben, wurde aber nicht gestartet.

Status: Gruen.
