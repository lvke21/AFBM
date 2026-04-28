# Firebase Migration Readiness Plan

Datum: 2026-04-26

Quelle: `docs/reports/systems/firebase-migration-analysis.md`

Ziel: Die roten Blocker aus dem Firebase-Migrationsbericht in minimale, vorgezogene Arbeitspakete uebersetzen. Dieser Plan fuehrt keine Firebase-Installation, keine Migration, keine Prisma-Entfernung, keine Auth-Umstellung und keine produktive Datenpfad-Aenderung durch.

## Executive Summary

Der Status im Analysebericht ist Rot, weil Firebase technisch noch nicht sicher vorbereitet werden kann, ohne vorher die Migrationsgrenzen zu schaerfen. Der naechste sinnvolle Schritt ist nicht Firebase SDK Installation, sondern ein Readiness-Slice:

- Repository-Abstraktion als Zielbild und Schnittstellenumfang festlegen.
- Direkte Prisma-Kopplungen und komplexe Transaktionen inventarisieren.
- Kritische server-only Datenpfade markieren.
- Emulator, Rules, Indexes, Seeds und Parity-Tests als Akzeptanzkriterien konkretisieren.

Status: Gruen

Begruendung: Alle Rot-Gruende aus dem Analysebericht sind konkret in kleine Vorbereitungs-Arbeitspakete uebersetzt. Es wurde keine produktive Migration gestartet.

## Rot-Blocker Aus Der Analyse

### Blocker 1: Kein Firestore Repository Layer vorhanden

Warum blockiert das?

Ohne Repository-Grenze wuerde jede Firebase-Vorbereitung direkt in bestehende Services, Server Actions oder UI-nahe Datenpfade einsickern. Das erhoeht das Risiko, dass Prisma- und Firestore-Logik vermischt werden, bevor klar ist, welche Methoden, Transaktionen und Readmodels wirklich gebraucht werden.

Betroffene Dateien/Bereiche:

- `src/modules/savegames/infrastructure/savegame.repository.ts`
- `src/modules/teams/infrastructure/team.repository.ts`
- `src/modules/teams/infrastructure/team-management.repository.ts`
- `src/modules/players/infrastructure/player.repository.ts`
- `src/modules/seasons/infrastructure/season.repository.ts`
- `src/modules/seasons/infrastructure/match-preparation.repository.ts`
- `src/modules/seasons/infrastructure/simulation/*`
- `src/modules/inbox/infrastructure/inbox-task.repository.ts`
- direkte Prisma-Zugriffe in `src/modules/draft/application/*.ts`
- direkte Prisma-Zugriffe in `src/modules/savegames/application/*.ts`
- direkte Prisma-Zugriffe in `src/modules/seasons/application/*.ts`
- `src/modules/shared/infrastructure/reference-data.ts`

Kleinstes Arbeitspaket:

Erstelle ein Repository-Inventar und Port-Design, ohne Implementierung:

- Datei: `docs/reports/repository-abstraction-inventory.md`
- Inhalt: Repository-Ports, Methodenliste, Input/Output-Typen auf fachlicher Ebene, aktuelle Prisma-Quelle je Methode, Read/Write-Klassifizierung.
- Keine Code-Aenderung an produktiven Services.

Tests, die die Loesung beweisen:

- Statische Vollstaendigkeitspruefung per `rg "prisma\\." src/modules src/app`.
- Jede gefundene produktive Prisma-Stelle ist im Inventar einem Repository-Port zugeordnet oder als bewusstes Legacy-Auth/Seed-Thema markiert.
- Keine neuen Firebase-Imports im `src/app`- oder `src/components`-Bereich.

### Blocker 2: Bestehende Services sind teils direkt an Prisma gekoppelt

Warum blockiert das?

Prompt 2 soll Firebase nur technisch vorbereiten. Wenn direkte Prisma-Zugriffe unkartiert bleiben, kann spaeter nicht sicher geprueft werden, ob Firebase-Konfiguration passiv bleibt oder versehentlich in produktive Pfade geraten ist. Besonders riskant sind Application Services mit direktem `prisma.$transaction`.

Betroffene Dateien/Bereiche:

- `src/modules/savegames/application/savegame-command.service.ts`
- `src/modules/savegames/application/week-flow.service.ts`
- `src/modules/seasons/application/season-management.service.ts`
- `src/modules/draft/application/draft-query.service.ts`
- `src/modules/draft/application/draft-pick.service.ts`
- `src/modules/draft/application/scouting-command.service.ts`
- `src/modules/shared/infrastructure/reference-data.ts`

Kleinstes Arbeitspaket:

Erstelle eine Kopplungsmatrix:

- Datei: `docs/reports/prisma-coupling-map.md`
- Spalten: Datei, Prisma-Modelle, Operationen, Transaktion ja/nein, fachlicher Owner, kritischer Pfad ja/nein, spaeterer Repository-Port.
- Ergebnis: Entscheidung, welche Stellen in einem spaeteren Repository-Slice zuerst gekapselt werden.

Tests, die die Loesung beweisen:

- `rg "prisma\\." src/modules src/app` ist gegen die Matrix abgeglichen.
- `rg "\\$transaction" src/modules` ist vollstaendig in der Matrix enthalten.
- Keine produktive Datei wurde veraendert.

### Blocker 3: Tiefe relational-normalisierte Reads brauchen Firestore-Readmodels

Warum blockiert das?

Firestore hat keine Joins. Aktuelle Prisma-Reads nutzen tiefe `include`-Baeume fuer Savegame-, Team-, Player-, Season- und Simulation-Ansichten. Ohne festgelegte Readmodel-Anforderungen wuerde eine Firebase-Basis zwar technisch existieren, aber nicht wissen, welche Dokumentformen, Indizes und Parity-Checks spaeter noetig sind.

Betroffene Dateien/Bereiche:

- `src/modules/savegames/infrastructure/savegame.repository.ts`
- `src/modules/teams/infrastructure/team.repository.ts`
- `src/modules/players/infrastructure/player.repository.ts`
- `src/modules/seasons/infrastructure/season.repository.ts`
- `src/modules/seasons/infrastructure/simulation/season-simulation.repository.ts`
- `src/modules/draft/application/draft-query.service.ts`
- Viewmodel-Services in `src/modules/*/application/*query*.ts`

Kleinstes Arbeitspaket:

Definiere Readmodel-Vertraege als Dokumentation:

- Datei: `docs/reports/firestore-readmodel-contracts.md`
- Enthalten: SaveGameListItem, SaveGameDetail, TeamDetail, PlayerDetail, SeasonOverview, DraftBoard, SimulationContext.
- Je Contract: aktuelle Prisma-Quelle, benoetigte Felder, Denormalisierung, erwartete Sortierungen, noetige Counts.

Tests, die die Loesung beweisen:

- Bestehende Viewmodel-Tests sind den Contracts zugeordnet.
- Fuer jedes Readmodel ist ein spaeterer Parity-Testfall benannt.
- Kein Firestore-Code wird benoetigt.

### Blocker 4: Simulation und Roster/Finance verwenden komplexe Prisma-Transaktionen

Warum blockiert das?

Firestore-Transaktionen haben andere Grenzen, Retry-Semantik und Batch-Limits. Die aktuelle App verlaesst sich auf Prisma-Transaktionen fuer atomare Multi-Model-Updates. Ohne genaue Transaktionslandkarte kann kein sicheres Firebase-Setup mit spaeteren Smoke-Tests definiert werden.

Betroffene Dateien/Bereiche:

- `src/modules/savegames/application/savegame-command.service.ts`: Savegame + Settings + Season + Bootstrap.
- `src/modules/savegames/application/bootstrap/bootstrap-savegame-world.service.ts`: Teams, Spieler, Roster, Evaluations, Attribute, Contracts, Stats, Transactions, Matches.
- `src/modules/savegames/application/bootstrap/player-stat-shells.ts`: Career-/Season-Stat-Shells mit vielen Upserts.
- `src/modules/savegames/application/week-flow.service.ts`: Week-State und Match-State.
- `src/modules/teams/application/team-roster.service.ts`: Roster Assignment, Release, Contract Extension, Free-Agent Signing.
- `src/modules/teams/application/team-finance.service.ts`: Team Cash + Finance Event.
- `src/modules/seasons/application/season-simulation.service.ts`: Week-Lock, Match-Simulation, Season-Fortschritt.
- `src/modules/seasons/infrastructure/simulation/season-simulation.command-repository.ts`: Locks, Counts, Updates, Drive Replacement, TeamMatchStat Upsert.
- `src/modules/seasons/application/simulation/match-result-persistence.ts`: Match Result, Drives, Team/Player Stats, Condition, Development, History, Team Recalc.
- `src/modules/seasons/application/simulation/player-development.ts`: Attribute/Evaluation Updates, Contract Aggregate fuer Cap.
- `src/modules/seasons/application/season-management.service.ts`: Saisonwechsel, Contract-Rollover, neue Schedule.
- `src/modules/draft/application/draft-pick.service.ts`: Draft Count + conditional Update.
- `src/modules/draft/application/scouting-command.service.ts`: Scouting Upsert.
- `src/modules/inbox/infrastructure/inbox-task.repository.ts`: Inbox Upsert.

Kleinstes Arbeitspaket:

Erstelle eine Transaktionsklassifizierung:

- Datei: `docs/reports/prisma-transaction-readiness.md`
- Kategorien: simple upsert, conditional update, counter/aggregate, multi-document atomic write, long-running simulation, lock/lease, append-only event.
- Je Transaktion: aktuelle Invarianten, Firestore-Risiko, benoetigter spaeterer Ersatzmechanismus.

Tests, die die Loesung beweisen:

- Jede `prisma.$transaction`-Stelle ist klassifiziert.
- Jede `updateMany`, `createMany`, `upsert`, `aggregate`, `count`-Stelle in produktiven Persistenzpfaden ist bewertet.
- Fuer jede kritische Transaktion ist ein spaeterer Contract-/Integration-Test benannt.

### Blocker 5: Security Rules und Emulator-Tests existieren noch nicht

Warum blockiert das?

Der Analysebericht verlangt, dass kritische Daten wie Simulation, Stats, Match State, Player Development, Finance und Draft true values serverseitig geschuetzt bleiben. Ohne vorher definierte Rule-Anforderungen ist Prompt 2 zu breit: Eine technische Firebase-Installation koennte Dateien anlegen, aber nicht beweisen, dass sie spaeter sicher nutzbar ist.

Betroffene Dateien/Bereiche:

- Noch nicht vorhanden: `firebase.json`, `firestore.rules`, `firestore.indexes.json`
- Geplante Firebase-Bibliothek: `src/lib/firebase/*`
- Kritische Datenpfade aus Simulation, Team Management, Draft und Finance.

Kleinstes Arbeitspaket:

Erstelle eine Rules/Emulator-Anforderungsspezifikation:

- Datei: `docs/reports/firestore-security-requirements.md`
- Inhalt: Datenklassifizierung, erlaubte Reads, verbotene Client-Writes, Admin-only Pfade, Rule-Testmatrix.
- Noch keine Rules-Datei schreiben.

Tests, die die Loesung beweisen:

- Testmatrix enthaelt mindestens: eigener Savegame-Read, fremder Savegame-Read verboten, Referenzdaten read-only, Client-Write auf Stats/Match/Finance verboten, optional Inbox-Write nur mit Feld-Allowlist.
- Jede server-only Kategorie aus dem Analysebericht ist abgedeckt.

### Blocker 6: E2E-Seed und Tests sind PostgreSQL/Prisma-gebunden

Warum blockiert das?

Spaetere Firestore-Emulator-Tests brauchen stabile Daten, duerfen aber nicht gegen Produktion laufen und duerfen den Prisma-Flow nicht ersetzen. Der bestehende E2E-Seed ist wertvoll, aber fest an Prisma und PostgreSQL gekoppelt.

Betroffene Dateien/Bereiche:

- `scripts/seeds/e2e-seed.ts`
- `e2e/fixtures/minimal-e2e-context.ts`
- Playwright-Specs in `e2e/*.spec.ts`
- spaeter: `scripts/firebase/e2e-seed.ts` oder `scripts/seeds/firestore-seed.ts`

Kleinstes Arbeitspaket:

Definiere Firestore-Seed-Anforderungen:

- Datei: `docs/reports/firestore-seed-requirements.md`
- Inhalt: stabile IDs, minimale Liga, Teams, Spieler, Season, Weeks/Matches, Draft, Scouting, Stats, Reset-Sicherheitsregeln.
- Kein Seed-Script schreiben.

Tests, die die Loesung beweisen:

- Jede Fixture-ID aus `e2e/fixtures/minimal-e2e-context.ts` ist einem Firestore-Zielpfad zugeordnet.
- Reset-Schutz ist als Anforderung definiert: nur Emulator, Projekt-ID-Allowlist, keine Production Credentials.
- Prisma-E2E-Seed bleibt unveraendert.

### Blocker 7: Parity-Skripte und Validierungsstrategie fehlen

Warum blockiert das?

Eine schrittweise Migration braucht Beweise, dass Firestore-Readmodels fachlich gleiche Daten liefern wie Prisma. Ohne Parity-Anforderungen wuerde Prompt 2 zwar Firebase bereitstellen, aber der naechste Schritt haette keine Messlatte.

Betroffene Dateien/Bereiche:

- spaeter geplante Skripte: `scripts/firebase/export-prisma-savegame.ts`, `scripts/firebase/import-savegame-firestore.ts`, `scripts/firebase/verify-savegame-parity.ts`
- Query Services: SaveGame, Team, Player, Season, Draft, Simulation.
- Tests in `src/modules/**/**/*.test.ts` und E2E.

Kleinstes Arbeitspaket:

Erstelle Parity-Test-Anforderungen:

- Datei: `docs/reports/firestore-parity-test-requirements.md`
- Inhalt: Vergleichsobjekte, normalisierte Felder, tolerierte Unterschiede, deterministische Testdaten, Nicht-Ziele.

Tests, die die Loesung beweisen:

- Parity-Matrix deckt SaveGameDetail, TeamDetail, PlayerDetail, SeasonOverview, DraftBoard und SimulationContext ab.
- Decimal-Konvertierungen sind festgelegt: Money als cents, `sacks` als tenths.
- Timestamps und generierte IDs sind als Normalisierungsregeln dokumentiert.

### Blocker 8: Kostenmessung und Write-Count-Protokoll fehlen

Warum blockiert das?

Die Simulation kann pro Match viele Dokumente schreiben: Drives, PlayerMatchStats, TeamMatchStats, TeamSeasonStats, PlayerSeasonStats, PlayerCareerStats, PlayerCondition, Development und History. Firestore-Kosten und Batch-Grenzen muessen vor einer Aktivierung messbar sein.

Betroffene Dateien/Bereiche:

- `src/modules/seasons/application/simulation/match-result-persistence.ts`
- `src/modules/seasons/infrastructure/simulation/season-simulation.command-repository.ts`
- `src/modules/seasons/application/season-simulation.service.ts`
- spaeter Firestore Repository-Implementierungen fuer Stats und Match Persistenz.

Kleinstes Arbeitspaket:

Erstelle eine Kosten-/Write-Count-Anforderung:

- Datei: `docs/reports/firestore-cost-readiness.md`
- Inhalt: erwartete Read/Write-Zaehler pro Flow, Grenzwerte fuer einen Match, Grenzwerte fuer eine Week, Messpunkte fuer spaetere Tests.

Tests, die die Loesung beweisen:

- Fuer Season-Simulation einer Woche ist definiert, welche Writes gezaehlt werden.
- Fuer TeamDetail und Free-Agent-Market ist definiert, welche Reads gezaehlt werden.
- Keine Messimplementierung in produktivem Code notwendig.

## Komplexe Prisma-Transaktionen Und Kritische Datenpfade

### Transaktionsklassen

| Klasse | Aktuelle Beispiele | Firestore-Risiko | Vor Firebase-Setup noetige Klaerung |
|---|---|---|---|
| Bootstrap-Transaktion | `createSaveGame`, `bootstrapSaveGameWorld`, `player-stat-shells` | viele Docs, viele Abhaengigkeiten, Batch-Limits | Sequenz, Idempotenz und Rollback-Strategie dokumentieren |
| Roster/Contract/Finance | `team-roster.service.ts`, `team-finance.service.ts` | atomare Multi-Doc-Updates, Geldwerte, Cap-Invarianten | server-only markieren, Invarianten und Tests definieren |
| Week Flow | `week-flow.service.ts` | Match- und Savegame-State muessen konsistent bleiben | State-Machine-Invarianten dokumentieren |
| Season Simulation | `season-simulation.service.ts`, `match-result-persistence.ts` | viele Writes, Locks, Aggregat-Updates | Lease-Modell, Write-Count und Parity-Anforderungen definieren |
| Draft | `draft-pick.service.ts`, `scouting-command.service.ts` | Counter, conditional update, true values | Counter-/Privacy-Anforderungen dokumentieren |
| Inbox | `inbox-task.repository.ts` | einfacher Upsert, optional client-writable | Feld-Allowlist und Rule-Test festlegen |
| Reference Data | `reference-data.ts`, `prisma/seed.ts` | globale read-only Daten | Versionierung und idempotente Seeds definieren |

### Server-only Datenpfade

Diese Pfade muessen in Prompt 2 noch nicht implementiert werden, aber ihre Schutzanforderung muss vorliegen:

- Simulationsergebnisse: Match Scores, Drives, TeamMatchStats, PlayerMatchStats.
- Saisonfortschritt: Season phase/week, WeekState, Match status locks.
- Stat-Aggregate: TeamSeasonStat, PlayerSeasonStat, PlayerCareerStat.
- Roster/Contracts/Finance: Team cashBalance, salaryCapSpace, contracts, financeEvents.
- Player Development: attributes, evaluation, fatigue, morale, injury fields.
- Draft true values: trueOverall, truePotential, Draft risk internals.
- Reference Data Writes.
- Savegame Bootstrap.

## Priorisierte Reihenfolge Der Arbeitspakete

1. Repository-Abstraktionsinventar erstellen.
2. Prisma-Kopplungsmatrix erstellen.
3. Transaktionsklassifizierung erstellen.
4. Kritische server-only Datenpfade und Rules-Anforderungen konkretisieren.
5. Firestore-Readmodel-Contracts konkretisieren.
6. Firestore-Seed-Anforderungen konkretisieren.
7. Parity-Test-Anforderungen konkretisieren.
8. Kosten-/Write-Count-Anforderungen konkretisieren.
9. Erst danach reduzierten Prompt 2 ausfuehren.

Diese Reihenfolge haelt Prompt 2 klein: Firebase wird erst technisch vorbereitet, wenn klar ist, welche Dateien passiv bleiben muessen und welche Tests spaeter beweisen, dass keine produktiven Datenpfade umgestellt wurden.

## Go/No-Go-Kriterien Fuer Den Naechsten Schritt

### Go

Prompt 2 darf ausgefuehrt werden, wenn alle folgenden Kriterien erfuellt sind:

- Es gibt ein Repository-Inventar mit allen produktiven Prisma-Zugriffen.
- Jede direkte Prisma-Kopplung ist einem spaeteren Port oder bewusstem Legacy-Bereich zugeordnet.
- Alle komplexen Transaktionen sind klassifiziert und mit Firestore-Risiko markiert.
- Server-only Datenkategorien sind vollstaendig benannt.
- Emulator/Rules/Indexes-Anforderungen sind testbar beschrieben.
- Seed- und Reset-Anforderungen fuer Emulator sind dokumentiert.
- Parity-Test-Anforderungen fuer zentrale Readmodels sind dokumentiert.
- Der geplante Prompt 2 installiert nur Firebase und legt passive Konfiguration/Smoke-Tests an.
- Prisma bleibt Default und produktive Datenpfade bleiben unveraendert.

### No-Go

Prompt 2 darf nicht ausgefuehrt werden, wenn einer dieser Punkte offen ist:

- Unkartierte direkte Prisma-Zugriffe in produktiven Services.
- Unklassifizierte `prisma.$transaction`-Stellen.
- Unklare Schreibrechte fuer Simulation, Stats, Finance, Draft oder Player Development.
- Kein Schutzkonzept gegen versehentliche Production-Seeds/Resets.
- Keine Parity-Messlatte fuer SaveGame/Team/Player/Season/Draft.
- Prompt 2 wuerde Firestore-Repositories oder produktive Datenpfade aktivieren.

## Reduzierter Prompt 2

Rolle:
Senior Backend Engineer

Voraussetzung:
Der Readiness-Plan `docs/reports/systems/firebase-migration-readiness-plan.md` hat Status Gruen. Die darin genannten Go-Kriterien sind erfuellt oder explizit als reine Dokumentationsvorbedingungen akzeptiert.

Ziel:
Firebase technisch passiv im Projekt vorbereiten, ohne Prisma, Auth oder produktive Datenpfade zu veraendern.

Nicht tun:
- keine Firestore-Repositories bauen
- keine produktiven Reads/Writes umstellen
- keine Prisma-Dateien loeschen
- keine Auth-Umstellung
- keine Seed-/Reset-Skripte gegen Firestore schreiben
- keine Security-Rules-Fachlogik ueber das dokumentierte Minimum hinaus erweitern

Aufgaben:
1. Installiere nur die notwendigen Firebase-Abhaengigkeiten:
   - `firebase`
   - `firebase-admin`
   - `firebase-tools` nur wenn fuer lokale Emulator-Skripte sinnvoll und als Dev Dependency
2. Erstelle passive Firebase-Basisdateien:
   - `src/lib/firebase/client.ts`
   - `src/lib/firebase/admin.ts`
   - optional `src/lib/firebase/firestore.ts`
   - `firebase.json`
   - `firestore.rules`
   - `firestore.indexes.json`
3. Ergaenze `.env.example` um:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - optional `FIRESTORE_EMULATOR_HOST`
4. Admin SDK robust initialisieren:
   - kein mehrfaches Initialisieren
   - escaped Private Keys behandeln
   - klare Fehlermeldungen bei fehlenden ENV Variablen
   - server-only Modulgrenze dokumentieren
5. Emulator passiv vorbereiten:
   - Firestore Emulator in `firebase.json`
   - package.json Scripts fuer Start und Smoke Test
   - keine produktiven Seeds
6. Smoke Tests:
   - Admin SDK Initialisierung mit Test-ENV
   - Firestore Emulator Connectivity, falls lokal verfuegbar
   - Typecheck und Lint
   - bestehende Tests duerfen nicht brechen

Output:
- geaenderte Dateien
- ENV Variablen erklaeren
- lokale Startbefehle dokumentieren
- bestaetigen, dass Prisma Default bleibt und keine produktiven Datenpfade Firestore nutzen

Statuspruefung:
- Laeuft die App weiterhin wie vorher?
- Ist Firebase passiv vorbereitet?
- Sind keine produktiven Datenpfade umgestellt?
- Sind Emulator und ENV dokumentiert?

Status: Gruen oder Rot

## Statuspruefung

Sind alle Rot-Gruende konkret aufgeloest oder in Arbeitspakete uebersetzt?

Status: Gruen. Jeder Rot-Grund aus `firebase-migration-analysis.md` ist als Blocker mit Ursache, betroffenen Bereichen, kleinstem Arbeitspaket und Beweistests beschrieben.

Ist klar, was vor Firebase-Setup erledigt werden muss?

Status: Gruen. Vor Firebase-Setup muessen Inventar, Kopplungsmatrix, Transaktionsklassifizierung, Security-Anforderungen, Seed-Anforderungen, Parity-Anforderungen und Kostenanforderungen dokumentiert sein.

Ist der naechste Prompt kleiner und risikoaermer?

Status: Gruen. Der reduzierte Prompt 2 erlaubt nur passive Firebase-Basisdateien, ENV, Emulator-Konfiguration und Smoke Tests. Firestore-Repositories, Seeds, produktive Datenpfade und Migration bleiben ausgeschlossen.

Wurde keine produktive Migration gestartet?

Status: Gruen. Dieser Bericht legt nur eine Markdown-Datei an. Es wurden keine Firebase SDKs installiert, keine Prisma-Dateien geaendert, keine Auth-Umstellung vorgenommen und keine Firestore-Datenpfade aktiviert.

## Gesamtstatus

Status: Gruen

Der naechste Schritt ist nicht sofort die urspruengliche breite Firebase-Vorbereitung, sondern die priorisierten Readiness-Dokumente aus diesem Plan. Erst danach sollte der reduzierte Prompt 2 ausgefuehrt werden.
