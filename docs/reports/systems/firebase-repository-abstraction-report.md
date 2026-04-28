# Firebase Repository Abstraction Report

Datum: 2026-04-26

Ausgangslage:
- `docs/reports/systems/firebase-migration-analysis.md`
- `docs/reports/systems/firebase-migration-readiness-plan.md`

Ziel dieses Slices: Eine minimale Repository-Schicht vorbereiten, ohne Firebase einzubauen und ohne aktive Datenpfade von Prisma wegzuschalten.

## Ergebnis

Status: Gruen

Prisma bleibt der einzige aktive Backend-Pfad. Es wurden keine Firebase SDKs installiert, keine Firestore-Repositories implementiert, keine Prisma-Dateien geloescht, keine Auth-Umstellung vorgenommen und keine produktiven Datenpfade auf Firebase umgestellt.

## Geaenderte Dateien

Neu:
- `src/server/repositories/types.ts`
- `src/server/repositories/index.ts`
- `src/server/repositories/saveGameRepository.prisma.ts`
- `src/server/repositories/teamRepository.prisma.ts`
- `src/server/repositories/playerRepository.prisma.ts`
- `src/server/repositories/seasonRepository.prisma.ts`
- `src/server/repositories/matchRepository.prisma.ts`
- `src/server/repositories/statsRepository.prisma.ts`
- `src/server/repositories/index.test.ts`
- `docs/reports/systems/firebase-repository-abstraction-report.md`

Aktualisiert:
- `src/modules/savegames/application/savegame-query.service.ts`
- `src/modules/teams/application/team-query.service.ts`
- `src/modules/players/application/player-query.service.ts`
- `src/modules/seasons/application/season-query.service.ts`
- `src/modules/seasons/application/match-query.service.ts`

## Repository-Architektur

Die neue Fassade liegt unter `src/server/repositories`.

Aktiver Provider:
- `getRepositories()` in `src/server/repositories/index.ts`
- Default: `DATA_BACKEND` leer oder `prisma`
- Erlaubt aktuell ausschliesslich `prisma`
- `DATA_BACKEND=firestore` wirft bewusst einen Fehler, damit kein nicht implementierter Backend-Pfad versehentlich aktiviert wird

Vorbereitete Repository-Bereiche:
- `saveGames`
- `teams`
- `teamManagement`
- `players`
- `seasons`
- `seasonSimulation`
- `seasonSimulationCommands`
- `matchPreparation`
- `matches`
- `stats`

Die meisten Prisma-Implementierungen delegieren aktuell auf bestehende Infrastructure-Repositories. Das ist absichtlich minimal: Die App bekommt eine zentrale Server-Fassade, ohne dass fachliche Logik oder Datenmodelle geaendert werden.

## Abstrahierte Prisma-Zugriffe

Direkt abstrahiert:
- `src/modules/seasons/application/match-query.service.ts`
  - Vorher: direkter `prisma.match.findFirst(...)` im Application Service.
  - Jetzt: `getRepositories().matches.findDetailForUser(...)`.
  - Die Prisma-Query liegt in `src/server/repositories/matchRepository.prisma.ts`.

Auf zentrale Repository-Fassade umgestellt:
- `src/modules/savegames/application/savegame-query.service.ts`
  - nutzt jetzt `getRepositories().saveGames`.
- `src/modules/teams/application/team-query.service.ts`
  - nutzt jetzt `getRepositories().teams`.
- `src/modules/players/application/player-query.service.ts`
  - nutzt jetzt `getRepositories().players`.
- `src/modules/seasons/application/season-query.service.ts`
  - nutzt jetzt `getRepositories().seasons`.

Provider-Tests:
- `src/server/repositories/index.test.ts`
  - bestaetigt Prisma als Default.
  - bestaetigt, dass `firestore` noch nicht aktivierbar ist.

## Bewusst Noch Offene Prisma-Zugriffe

Bewusst offen, weil sie komplexe Transaktionen oder groessere Service-Grenzen betreffen:

- `src/modules/savegames/application/savegame-command.service.ts`
  - Savegame-Bootstrap via Prisma-Transaktion.
- `src/modules/savegames/application/week-flow.service.ts`
  - Week-State-Transaktionen und Match-State.
- `src/modules/seasons/application/season-management.service.ts`
  - Saisonwechsel, Contract-Rollover, Schedule-Erzeugung.
- `src/modules/seasons/application/season-simulation.service.ts`
  - Week-Simulation, Locking, Persistenz-Orchestrierung.
- `src/modules/seasons/application/simulation/match-result-persistence.ts`
  - Match-Ergebnisse, Drives, Team-/Player-Stats, Development.
- `src/modules/seasons/application/simulation/player-development.ts`
  - Attribute, Evaluation, Team-State-Recalculation.
- `src/modules/draft/application/draft-query.service.ts`
  - Draft Board Readmodel mit mehreren Queries.
- `src/modules/draft/application/draft-pick.service.ts`
  - Draft Counter + conditional Update in Transaktion.
- `src/modules/draft/application/scouting-command.service.ts`
  - Scouting Upsert.
- `src/modules/inbox/infrastructure/inbox-task.repository.ts`
  - einfacher Upsert, spaeter guter Kandidat fuer naechsten Slice.
- `src/modules/shared/infrastructure/reference-data.ts`
  - Seed-/Referenzdaten-Upserts.
- `scripts/seeds/e2e-seed.ts`
  - bewusst Prisma/PostgreSQL-gebundener E2E-Seed.
- `prisma/seed.ts`
  - bestehender Prisma-Seed bleibt unveraendert.

Ebenfalls offen bleiben bestehende Infrastructure-Repositories unter `src/modules/**/infrastructure`. Sie sind weiter Prisma-Implementierungen und werden nun teilweise ueber `src/server/repositories` exponiert.

## Risiken

- Die neue Fassade ist ein erster Schnitt, noch keine vollstaendige Port-Abstraktion fuer alle Schreibpfade.
- `week-flow.service.ts` und Simulation bleiben bewusst direkt Prisma-transaktional, weil ein zu schneller Umbau dort riskant waere.
- `DATA_BACKEND` akzeptiert absichtlich noch kein Firestore. Das ist sicher, bedeutet aber: Firestore kann erst nach spaeteren Slices aktiviert werden.
- Full-Unit-Run zeigte bestehende Timeout-Anfaelligkeit in gameplay-lastigen Tests. Die geaenderten Repository-/Query-/Week-Pfade waren nicht betroffen.
- E2E konnte lokal nicht abgeschlossen werden, weil PostgreSQL auf `localhost:5432` nicht erreichbar war.

## Testergebnisse

Erfolgreich:
- `npx tsc --noEmit`
- `npm run lint`
- `npx vitest run src/server/repositories/index.test.ts src/modules/seasons/application/match-query.service.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 3 Test Files, 11 Tests bestanden.
- `npx vitest run src/modules/gameplay/application/play-selection-engine.test.ts`
  - beim Einzel-Rerun bestanden.

Vollstaendige Unit-Suite:
- `npm run test:run`
  - 65 von 67 Test Files bestanden.
  - 317 von 319 Tests bestanden.
  - Fehlgeschlagen durch Timeouts:
    - `src/modules/gameplay/application/play-selection-engine.test.ts`
      - beim Einzel-Rerun bestanden.
    - `src/modules/gameplay/application/gameplay-calibration.test.ts`
      - blieb auch einzeln bei einem bestehenden 5s-Timeout haengen.

E2E:
- `npm run test:e2e:week-loop`
  - erster Versuch im Sandbox-Kontext scheiterte, weil `tsx` keine IPC Pipe anlegen durfte.
  - erneuter Lauf ausserhalb der Sandbox erreichte den Seed, scheiterte dann an fehlender DB:
    - `Datenbank nicht erreichbar unter localhost:5432`.
  - Kein E2E-Ergebnis gegen die App, weil lokale PostgreSQL-Testvoraussetzung fehlt.

## Statuspruefung

App-Verhalten unveraendert?

Status: Gruen. Es wurden nur Repository-Zugriffe umgeleitet oder ein direkter Match-Read in eine Prisma-Implementierung verschoben. Datenmodell, Queries und Prisma als aktiver Pfad bleiben gleich.

Prisma bleibt aktiv?

Status: Gruen. `getRepositories()` liefert ausschliesslich Prisma-Implementierungen. `DATA_BACKEND=firestore` wird bewusst abgelehnt.

Repository-Schicht vorhanden?

Status: Gruen. `src/server/repositories/types.ts` und `src/server/repositories/index.ts` existieren, plus Prisma-Implementierungen fuer die priorisierten Bereiche.

Kein Firebase-Code eingebaut?

Status: Gruen. Es wurden keine Firebase-Abhaengigkeiten installiert und keine Firebase- oder Firestore-Module implementiert. Die einzigen `firestore`-Treffer im Code sind Provider-Tests, die den nicht verfuegbaren Backend-Wert absichern.

Tests gruen oder klar dokumentiert?

Status: Gruen mit Einschraenkung. Typecheck, Lint und fokussierte Repository-/Week-/Match-Tests sind gruen. Die vollstaendige Unit-Suite hat einen bestehenden gameplay-lastigen Timeout behalten; E2E ist durch fehlende lokale PostgreSQL-Verbindung blockiert. Beide Punkte sind oben dokumentiert.

## Empfehlung Fuer Den Naechsten Schritt

Naechster sicherer Slice:

1. Inbox-Repository ueber `src/server/repositories` fuehren, weil es ein kleiner Upsert-Pfad ist.
2. Danach Draft Query als reines Readmodel abstrahieren.
3. Erst danach Week Flow oder Season Simulation angehen, weil dort Transaktions- und Locking-Invarianten hohes Risiko tragen.

Vor einem Firebase-Setup sollte ausserdem der lokale PostgreSQL/E2E-Seed wieder lauffaehig sein, damit Week-Loop-E2E als Regressionstest genutzt werden kann.
