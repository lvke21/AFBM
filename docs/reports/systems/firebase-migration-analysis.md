# Firebase Migration Analysis

Datum: 2026-04-26

Rolle: Senior Fullstack Architect, Firebase Migration Engineer und Code Reviewer

Scope: Analyse und sicherer Migrationsplan von Prisma/PostgreSQL zu Firebase Cloud Firestore. Keine produktive Migration, keine Entfernung bestehender Persistenz, keine Prisma-Loeschung, keine Auth-Umstellung.

## Executive Summary

Die aktuelle Datenstruktur ist stark savegame-zentriert und relational modelliert. Laufzeitdaten sind fast durchgaengig ueber `saveGameId` isoliert, viele Relationen nutzen zusammengesetzte Schluessel wie `[id, saveGameId]`. Das ist fachlich sauber, passt aber nicht direkt zu Firestore: Firestore braucht dokumentorientierte Aggregate, explizite Denormalisierung und Query-getriebene Collection-Zuschnitte.

Eine sichere Migration ist schrittweise moeglich, aber nicht als Big Bang. Der passende Zielpfad ist: Firebase parallel einfuehren, Repository-Layer abstrahieren, Emulator/Teststrategie aufbauen, zunaechst Referenzdaten und read-only/read-modelartige Savegame-Views spiegeln, danach einzelne Schreibaggregate migrieren. Auth bleibt vorerst bei der bestehenden Loesung.

Status: Rot

Grund: Die DB-Struktur und Zielrichtung sind verstanden, aber eine sichere produktive Migration darf noch nicht starten, solange Repository-Grenzen, Firestore-Regeln, Emulator-Tests, Transaktionsersatz fuer Simulation/Roster/Finance und eine Dual-Write/Backfill-Strategie nicht implementiert und validiert sind.

## Analysierter Datenzugriff

### Prisma Schema

Quelle: `prisma/schema.prisma`

Hauptbereiche:
- Auth: `User`, `Account`, `Session`, `VerificationToken`
- Referenzdaten: League, Conference, Division, Franchise, Position, Archetype, Scheme, Attribute
- Savegame-Kern: `SaveGame`, `SaveGameSetting`, `Season`, `Team`, `Match`
- Spieler/Kader/Vertrag: `Player`, `PlayerRosterProfile`, `PlayerEvaluation`, `PlayerAttributeRating`, `Contract`
- Draft/Scouting: `DraftClass`, `DraftPlayer`, `ScoutingData`
- Statistiken: Team-, Player-Career-, Player-Season-, Player-Match-Statfamilien
- Events: `RosterTransaction`, `PlayerHistoryEvent`, `TeamFinanceEvent`, `InboxTaskState`, `MatchSimulationDrive`

Wichtige relationale Eigenschaften:
- `SaveGame` ist der fachliche Root fuer fast alle Laufzeitdaten.
- `userId` schuetzt Ownership auf Query-Ebene.
- Viele Tabellen haben `@@unique([..., saveGameId])` oder `@@index([saveGameId, ...])`.
- Statistikfamilien sind normalisiert in Basisdatensatz plus 1:1 Detailtabellen.
- Prisma-Transaktionen sichern komplexe Multi-Entity-Updates.

### Models und Dokumentation

Relevante bestehende Daten-Dokumente:
- `docs/architecture/data/entities.md`
- `docs/architecture/data/relations.md`
- `docs/architecture/data/state-boundaries.md`
- `docs/architecture/data/statistics.md`
- `docs/architecture/data/enums-and-read-models.md`
- `docs/architecture/data/player-model.md`

Die Dokumentation bestaetigt die drei Datenklassen: Auth-Daten, Referenzdaten und savegame-gebundener Laufzeitzustand.

### Server Actions und API Routes

Server Actions:
- `src/app/app/savegames/actions.ts`: Savegame-Erstellung.
- `src/app/app/savegames/[savegameId]/team/actions.ts`: Roster, Schemes, Release, Contract-Release.
- `src/app/app/savegames/[savegameId]/free-agents/actions.ts`: Free-Agent-Signing.
- `src/app/app/savegames/[savegameId]/week-actions.ts`: Week-State und Match-Flow.
- `src/app/app/savegames/[savegameId]/seasons/[seasonId]/actions.ts`: Wochensimulation und Saisonwechsel.
- `src/app/app/savegames/[savegameId]/draft/actions.ts`: Draft Pick.
- `src/app/app/savegames/[savegameId]/development/scouting/actions.ts`: Scouting-Update.
- `src/app/app/savegames/[savegameId]/inbox/actions.ts`: Inbox Task State.
- `src/app/app/savegames/[savegameId]/matches/[matchId]/actions.ts`: Gameplan/Schemes.

API Routes:
- `src/app/api/savegames/*`: Savegame-, Team-, Player-, Season-Reads und Savegame-Erstellung.
- `src/app/api/simulation/*`: separate Simulation-API mit in-memory Store, nicht Prisma-persistent.
- `src/app/api/auth/[...nextauth]/route.ts`: Auth.js, explizit nicht Teil der Migration.

### Services und Repositories

Direkter Prisma-Zugriff liegt in:
- `src/lib/db/prisma.ts`
- `src/modules/savegames/infrastructure/savegame.repository.ts`
- `src/modules/teams/infrastructure/team.repository.ts`
- `src/modules/teams/infrastructure/team-management.repository.ts`
- `src/modules/players/infrastructure/player.repository.ts`
- `src/modules/seasons/infrastructure/season.repository.ts`
- `src/modules/seasons/infrastructure/match-preparation.repository.ts`
- `src/modules/seasons/infrastructure/simulation/*`
- `src/modules/inbox/infrastructure/inbox-task.repository.ts`
- teilweise direkt in Application Services: Draft, Season Management, Savegame Command, Week Flow.

Besonders migrationsrelevant:
- Savegame-Detail und Team-Detail nutzen tiefe Prisma `include`-Baeume.
- Free-Agent-Market liest viele Spieler mit Profil, Evaluation und Attributen.
- Simulation laedt komplette Teamroster mit Attributen, Stats und Gesundheitszustand.
- Roster/Contracts/Finance schreiben mehrere Modelle atomar.
- Season Simulation nutzt Locks ueber `Match.status`, Statuszaehlungen und transaktionale Fortschreibung.

### Game Engine Persistenz

Die produktive Season-Simulation schreibt persistent:
- `Match`: Status, Scores, Seeds, Start/Completion-Zeitpunkte.
- `MatchSimulationDrive`: Drive Log je Match.
- `TeamMatchStat`: Team-Match-Aggregate.
- `TeamSeasonStat`: Standings und Saisonaggregate.
- `PlayerMatchStat` plus Match-Statfamilien.
- `PlayerSeasonStat` plus Season-Statfamilien.
- `PlayerCareerStat` plus Career-Statfamilien.
- `Player`: Injury/Fatigue/Morale/Status.
- `PlayerAttributeRating` und `PlayerEvaluation`: Entwicklung.
- `PlayerHistoryEvent`: Injury/Recovery/Development.
- `Team`: recalculated `overallRating`, `salaryCapSpace`.

Zusatz: `src/modules/seasons/application/simulation/simulation-api.service.ts` bietet eine getrennte in-memory Simulation-API. Sie ist kein dauerhafter Datenbankpfad, kann aber als Emulator-/Testreferenz dienen.

### Seed-Skripte

Seeds:
- `prisma/seed.ts`: ruft `ensureReferenceData` auf.
- `src/modules/shared/infrastructure/reference-data.ts`: zentrale Stammdatenquelle und Prisma-Upserts.
- `scripts/seeds/e2e-seed.ts`: baut deterministische E2E-Daten inklusive User, Savegame, Teams, Spieler, Draft, Scouting, Matches und Finance Event.

Migrationseffekt:
- Referenzdaten sollten zuerst in Firestore gespiegelt werden.
- E2E-Seed braucht spaeter eine Firestore-Variante gegen den Emulator.
- Die TypeScript-Konstanten bleiben kurzfristig als Source of Truth fuer Referenzdaten sinnvoll.

### Tests und E2E-Fixtures

Unit-/Service-Tests mocken haeufig Prisma-Methoden. Relevante Bereiche:
- Savegame Command/Query/Snapshot/Week Flow
- Team Roster/Management/Schemes/Free Agency
- Draft Query/Pick/Scouting
- Season Simulation/Match Engine/Player Development
- Inbox Task Service
- UI-Model-Tests fuer Dashboard, Team, Player, Finance, Season, Draft, Match

E2E:
- `e2e/fixtures/minimal-e2e-context.ts` definiert stabile IDs.
- `scripts/seeds/e2e-seed.ts` ist PostgreSQL/Prisma-gebunden.
- Playwright-Specs greifen ueber UI auf diese Seed-Daten zu.

## Firestore Zielmodell

Leitprinzipien:
- `users/{userId}/saveGames/{saveGameId}` wird der zentrale Ownership-Pfad fuer spielbare Daten.
- Auth-Tabellen werden nicht migriert.
- Referenzdaten liegen global unter `reference/*` oder versioniert unter `referenceSets/{version}`.
- Schreibintensive Simulation bleibt serverseitig ueber Admin SDK.
- Tiefe Prisma-Includes werden durch voraggregierte Dokumente und gezielte Subcollections ersetzt.
- Normalisierte 1:1-Statfamilien werden in Firestore als verschachtelte Maps gespeichert.

Empfohlener Root:

```text
reference/leagues/{leagueId}
reference/conferences/{conferenceId}
reference/divisions/{divisionId}
reference/franchises/{franchiseId}
reference/positions/{positionId}
reference/positionGroups/{groupId}
reference/archetypes/{archetypeId}
reference/schemeFits/{schemeFitId}
reference/attributes/{attributeId}

users/{userId}/saveGames/{saveGameId}
users/{userId}/saveGames/{saveGameId}/seasons/{seasonId}
users/{userId}/saveGames/{saveGameId}/teams/{teamId}
users/{userId}/saveGames/{saveGameId}/players/{playerId}
users/{userId}/saveGames/{saveGameId}/matches/{matchId}
users/{userId}/saveGames/{saveGameId}/draftClasses/{draftClassId}
users/{userId}/saveGames/{saveGameId}/draftClasses/{draftClassId}/prospects/{draftPlayerId}
users/{userId}/saveGames/{saveGameId}/inboxTasks/{taskKey}
```

## Mapping-Tabelle

| Prisma Model | Firestore Ziel | Dokumentstruktur | Subcollections | Queries | Indizes | Risiken |
|---|---|---|---|---|---|---|
| `User` | vorerst Prisma/Auth.js | unveraendert | keine | Auth.js | bestehend | Keine Auth-Umstellung im Scope. |
| `Account` | vorerst Prisma/Auth.js | unveraendert | keine | Auth.js | bestehend | OAuth Tokens nicht in Client-Firestore legen. |
| `Session` | vorerst Prisma/Auth.js | unveraendert | keine | Auth.js | bestehend | Keine Session-Migration. |
| `VerificationToken` | vorerst Prisma/Auth.js | unveraendert | keine | Auth.js | bestehend | Keine Token-Migration. |
| `LeagueDefinition` | `reference/leagues/{id}` | `code`, `name` | optional `conferences` | by `code` | `code` | Referenzversionierung noetig. |
| `ConferenceDefinition` | `reference/conferences/{id}` | `leagueId`, `code`, `name` | keine | by `leagueId`, `code` | `leagueId + code` | Joins zu Teams denormalisieren. |
| `DivisionDefinition` | `reference/divisions/{id}` | `conferenceId`, `code`, `name` | keine | by `conferenceId`, `code` | `conferenceId + code` | Team-Views brauchen Namen als Snapshot. |
| `PositionGroupDefinition` | `reference/positionGroups/{id}` | `code`, `name`, `unit`, `side` | keine | by `code` | `code` | Muss stabil versioniert bleiben. |
| `PositionDefinition` | `reference/positions/{id}` | `groupId`, `code`, `name`, `unit`, `side` | keine | by `code`, by `groupId` | `code`, `groupId` | Viele Reads; lokal cachen. |
| `ArchetypeDefinition` | `reference/archetypes/{id}` | `groupId`, `positionId?`, `code`, `name`, `description` | keine | by `code`, by `groupId` | `code`, `groupId` | Denormalisierte Namen in Player-Profilen. |
| `SchemeFitDefinition` | `reference/schemeFits/{id}` | `groupId`, `code`, `name`, `description` | keine | by `code`, by `groupCode` | `code`, `groupId + code` | Scheme-Validierung serverseitig. |
| `AttributeDefinition` | `reference/attributes/{id}` | `code`, `name`, `category`, `sortOrder`, `description` | keine | ordered by `sortOrder` | `category + sortOrder`, `code` | Attribute-Ratings besser als Map keyed by code. |
| `FranchiseTemplate` | `reference/franchises/{id}` | league/conference/division IDs plus Snapshot-Namen, city, nickname, abbreviation, budget | keine | by `leagueId`, by `abbreviation` | `leagueId + abbreviation` | Formular nutzt aktuell TS-Konstanten; Quelle klaeren. |
| `SaveGame` | `users/{userId}/saveGames/{saveGameId}` | name, status, weekState, currentSeasonId, league snapshot, counts, timestamps | `settings`, `teams`, `players`, `seasons`, `matches`, etc. | list by user ordered `updatedAt`; get by id | implizit im User-Pfad; ggf. `status + updatedAt` | Counts muessen denormalisiert oder per Aggregation gepflegt werden. |
| `SaveGameSetting` | Field `settings` im SaveGame oder `settings/main` | salaryCap, limits, seasonLengthWeeks | keine | get with SaveGame | keine | Decimal als integer cents speichern. |
| `Season` | `.../seasons/{seasonId}` | year, phase, week, startsAt, endsAt, matchCount | `teamSeasonStats`, optional `playerSeasonStats` | by year desc; current by id | `year desc` | CurrentSeason-Join entfaellt; Snapshot im SaveGame halten. |
| `Team` | `.../teams/{teamId}` | franchise snapshot, conference/division snapshot, schemes, ratings, finance, managerControlled | `roster`, `contracts`, `financeEvents`, `seasonStats`, `matchStats` | by abbreviation, managerControlled, list all teams | `managerControlled`, `abbreviation` | Team-Detail braucht denormalisierte Roster-Readmodelle. |
| `DraftClass` | `.../draftClasses/{draftClassId}` | year, seasonId, status, name, prospectCount | `prospects`, optional `scoutingByTeam` | active/upcoming by `seasonId/status/year` | `status + year`, `seasonId + year` | Pick-Nummern brauchen Transaction/Counter. |
| `DraftPlayer` | `.../draftClasses/{draftClassId}/prospects/{draftPlayerId}` | bio, position snapshot, true values server-only, visible fields optional, status, draftedBy | `scouting/{teamId}` | list by projectedRound/status/potential; draftedByTeam | `status + projectedRound + truePotential`, `draftedByTeamId` | True Overall/Potential nie clientlesbar machen. |
| `ScoutingData` | `.../draftClasses/{draftClassId}/prospects/{draftPlayerId}/scouting/{teamId}` | level, visible ranges, notes, strengths, weaknesses | keine | get for manager team; list by team | collection group: `teamId + level` optional | Security Rules muessen Teamzugriff begrenzen. |
| `Player` | `.../players/{playerId}` | identity, status, injury, fatigue, morale, developmentTrait, profile/evaluation/attributes snapshots | `history`, `contracts`, `seasonStats`, `matchStats` optional | by status, by lastName, roster/team views | `status`, `lastName + firstName` | Player-Dokument kann gross werden; Attribute als Map ok, Stats separieren. |
| `PlayerRosterProfile` | Field `rosterProfile` im Player plus Team-Roster-View `teams/{teamId}/roster/{playerId}` | teamId, position snapshots, rosterStatus, depthChartSlot, flags | keine | by teamId, position, rosterStatus | `teamId + positionCode`, `teamId + rosterStatus`, `primaryPositionCode + rosterStatus` | Doppelte Daten zwischen Player und Team-Roster synchron halten. |
| `PlayerEvaluation` | Field `evaluation` im Player und Team-Roster-View | potentialRating, overall-Felder | keine | sort/filter by positionOverall | ggf. `teamId + positionOverall` in roster view | Wird oft neu berechnet; server-only writes. |
| `PlayerAttributeRating` | Field `attributes: { [code]: value }` im Player | Map statt einzelne Docs | keine | kein globaler Attributscan im aktuellen Code | keine, optional einzelne bekannte Attribute | Firestore kann Map-Felder indizieren, aber breite Ad-hoc-Attributqueries vermeiden. |
| `Contract` | `.../players/{playerId}/contracts/{contractId}` plus `teams/{teamId}/contracts/{contractId}` | status, years, salaryCents, bonusCents, capHitCents, dates | keine | active by player/team; team contracts | `status`, `teamId + status`, ggf. team subcollection | Doppelte Contract-Views atomar per Batch/Transaction pflegen. |
| `Match` | `.../matches/{matchId}` und optional `seasons/{seasonId}/matches/{matchId}` | seasonId, week, kind, status, team snapshots, score, seed, timestamps | `drives`, `teamStats`, `playerStats` | by season/week/status, by matchId | `seasonId + week + status`, `status + updatedAt` | Week-locking muss per Firestore transaction/lease neu gebaut werden. |
| `MatchSimulationDrive` | `.../matches/{matchId}/drives/{sequence}` | drive summary, teams, scores, plays, result | keine | ordered by sequence | `sequence` | Viele Writes pro Match; Batch-Limit beachten. |
| `TeamSeasonStat` | `.../seasons/{seasonId}/teamStats/{teamId}` plus Team snapshot | aggregate standings | keine | standings ordered wins/pointsFor | `wins desc + pointsFor desc`, `turnoversCommitted` | Sortierung ueber mehrere Felder braucht Composite Index. |
| `PlayerCareerStat` | `.../players/{playerId}/careerStats/main` oder Field `careerStats` | base plus stat families as maps | keine | get with Player | keine | Hohe Update-Frequenz; 1 Doc pro Spieler kann Hotspot werden, aber pro Spieler begrenzt. |
| `PlayerSeasonStat` | `.../players/{playerId}/seasonStats/{seasonId_teamId}` und optional `seasons/{seasonId}/playerStats/{playerId_teamId}` | base plus stat families | keine | by season/team/player | `seasonId + teamId`, team subcollection | Doppelte Views fuer Team/Season Reports noetig. |
| `PlayerMatchStat` | `.../matches/{matchId}/playerStats/{playerId}` | snapshot name/position/team, snaps, stat families | keine | by match, by team | `teamId`, collection group optional | Match-Report gut geeignet; Karriereaggregat getrennt halten. |
| `PlayerCareerPassingStat` | Map in `careerStats.passing` | passing fields | keine | get with career | keine | Nicht als eigenes Doc noetig. |
| `PlayerCareerRushingStat` | Map in `careerStats.rushing` | rushing fields | keine | get with career | keine | Nicht als eigenes Doc noetig. |
| `PlayerCareerReceivingStat` | Map in `careerStats.receiving` | receiving fields | keine | get with career | keine | Nicht als eigenes Doc noetig. |
| `PlayerCareerBlockingStat` | Map in `careerStats.blocking` | blocking fields | keine | get with career | keine | Nicht als eigenes Doc noetig. |
| `PlayerCareerDefensiveStat` | Map in `careerStats.defensive` | defensive fields, `sacksTenths` | keine | get with career | keine | Decimal als integer tenths. |
| `PlayerCareerKickingStat` | Map in `careerStats.kicking` | kicking fields | keine | get with career | keine | Nicht als eigenes Doc noetig. |
| `PlayerCareerPuntingStat` | Map in `careerStats.punting` | punting fields | keine | get with career | keine | Nicht als eigenes Doc noetig. |
| `PlayerCareerReturnStat` | Map in `careerStats.returns` | return fields | keine | get with career | keine | Nicht als eigenes Doc noetig. |
| `PlayerSeasonPassingStat` | Map in season stat `passing` | passing fields | keine | get with season stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerSeasonRushingStat` | Map in season stat `rushing` | rushing fields | keine | get with season stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerSeasonReceivingStat` | Map in season stat `receiving` | receiving fields | keine | get with season stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerSeasonBlockingStat` | Map in season stat `blocking` | blocking fields | keine | get with season stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerSeasonDefensiveStat` | Map in season stat `defensive` | defensive fields, `sacksTenths` | keine | get with season stat | keine | Decimal als integer tenths. |
| `PlayerSeasonKickingStat` | Map in season stat `kicking` | kicking fields | keine | get with season stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerSeasonPuntingStat` | Map in season stat `punting` | punting fields | keine | get with season stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerSeasonReturnStat` | Map in season stat `returns` | return fields | keine | get with season stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerMatchPassingStat` | Map in match player stat `passing` | passing fields | keine | get with match stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerMatchRushingStat` | Map in match player stat `rushing` | rushing fields | keine | get with match stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerMatchReceivingStat` | Map in match player stat `receiving` | receiving fields | keine | get with match stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerMatchBlockingStat` | Map in match player stat `blocking` | blocking fields | keine | get with match stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerMatchDefensiveStat` | Map in match player stat `defensive` | defensive fields, `sacksTenths` | keine | get with match stat | keine | Decimal als integer tenths. |
| `PlayerMatchKickingStat` | Map in match player stat `kicking` | kicking fields | keine | get with match stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerMatchPuntingStat` | Map in match player stat `punting` | punting fields | keine | get with match stat | keine | Nicht als eigenes Doc noetig. |
| `PlayerMatchReturnStat` | Map in match player stat `returns` | return fields | keine | get with match stat | keine | Nicht als eigenes Doc noetig. |
| `TeamMatchStat` | `.../matches/{matchId}/teamStats/{teamId}` | team aggregate fields | keine | get by match | keine | Einfaches Subcollection-Modell. |
| `RosterTransaction` | `.../players/{playerId}/transactions/{id}` plus optional `saveGameEvents/{id}` | type, from/to team snapshots, occurredAt, description | keine | by occurredAt, by player | `occurredAt desc`, collection group optional | Audit-Daten server-only schreiben. |
| `PlayerHistoryEvent` | `.../players/{playerId}/history/{id}` plus optional team view | type, seasonId, team snapshot, week, title, occurredAt | keine | last 12 by player; by team | `occurredAt desc`, `teamId + occurredAt` optional | Historien koennen wachsen; Pagination noetig. |
| `TeamFinanceEvent` | `.../teams/{teamId}/financeEvents/{id}` | type, amountCents, capImpactCents, cashBalanceAfterCents, player snapshot | keine | last 8 by team | `occurredAt desc` | Server-only; Money als integer cents. |
| `InboxTaskState` | `.../inboxTasks/{taskKey}` | status, priorityOverride, read/completed/hidden timestamps | keine | ordered by updatedAt, filter status | `status + updatedAt desc` | Client darf nur eigene Savegames schreiben; Operationen validieren. |

## Kritische Bewertung

### Gut geeignet fuer Firestore

- Savegame-Isolation: Der Pfad `users/{userId}/saveGames/{saveGameId}` passt sehr gut zu Firestore Security Rules.
- Referenzdaten: Klein, selten geaendert, gut cachebar.
- Inbox Tasks, Finance Events, History Events, Roster Transactions: append-/upsert-artige Dokumente mit klaren Query-Patterns.
- Match Reports: `matches/{matchId}/drives`, `teamStats`, `playerStats` sind natuerliche Subcollections.
- Draft/Scouting: Subcollections und teambezogene Sichtbarkeit passen gut zu Firestore.

### Problematisch fuer Firestore

- Tiefe Prisma-Includes in Team-, Player-, Season- und Simulation-Reads. Firestore hat keine Joins.
- Simulation schreibt viele Dokumente und Aggregate in einem fachlichen Vorgang.
- Firestore-Transaktionen haben Limits und retry-Semantik; lange Simulationen duerfen nicht innerhalb einer langen DB-Transaktion laufen.
- Normalisierte Statistikfamilien muessen zu Maps zusammengelegt werden.
- Aggregationen wie `contract.aggregate(_sum.capHit)` und `playerRosterProfile.aggregate(_max.depthChartSlot)` muessen als Counter, Query oder serverseitige Berechnung ersetzt werden.
- `count`-basierte Draft-Pick-Nummern brauchen transaktionale Counter oder monotone Sequenzen.

### Fehlende Joins und notwendige Denormalisierung

Denormalisierung ist noetig fuer:
- Team-Detail: Team + Conference/Division + Schemes + Roster + Player + Evaluation + Attribute + Active Contract + Current Season Stat.
- Player-Detail: Player + Team + Positions + Evaluation + Attributes + Active Contract + Season Stats + Career Stats + History.
- Season Overview: Season + Team standings + Team names + Schedule + Team names.
- Simulation Context: Match + Team snapshots + komplette aktive Roster + Ratings + Attribute + Stat-Anker.
- Draft Board: Prospects + Position snapshots + Scouting fuer Manager-Team + drafted team name + Team Needs.

Empfehlung: Fuer UI-Reads gezielte Readmodelle pflegen:
- `teams/{teamId}/roster/{playerId}` als kompakter Team-Roster-Eintrag.
- `players/{playerId}` mit `profile`, `evaluation`, `attributes` und `activeContractSummary`.
- `seasons/{seasonId}/teamStats/{teamId}` mit Team-Snapshot.
- `matches/{matchId}` mit Home/Away-Team-Snapshot.
- `saveGames/{saveGameId}` mit `currentSeasonSnapshot`, `teamCount`, `playerCount`.

### Nur serverseitig schreiben

Diese Daten duerfen ausschliesslich ueber Admin SDK / Server Actions / Cloud Functions geschrieben werden:
- Savegame-Bootstrap und Weltgenerierung.
- Team-Schemes, Roster, Depth Chart, Contract, Free-Agent Signing, Release.
- Finance Events und Team-Cash/Cap-Space.
- Simulationsergebnisse, Statistiken, Match-Status, Locks.
- Player Development, Attribute, Evaluation, Injuries.
- Draft Picks und Scouting-Level-Berechnung.
- Referenzdaten.
- Alle Felder wie `trueOverall`, `truePotential`, `salaryCapSpace`, `overallRating`, `cashBalance`.

Client SDK sollte maximal lesen und fuer harmlose User-Interaktionen nur ueber validierte Serverpfade schreiben. Wenn Client SDK fuer Inbox-Status erlaubt wird, muessen Security Rules exakt auf `request.auth.uid == userId`, erlaubte Felder und erlaubte Statuswerte begrenzen.

### Potenziell teure Reads/Writes

- Free-Agent-Market: viele freie Spieler mit Attributen/Evaluation; sollte paginiert, vorgerankt oder als kompakte Market-Docs gespeichert werden.
- Simulation Context: Laden kompletter Teamroster inklusive Attribute/Stats; sinnvoll als serverseitiger Bulk-Read, nicht Client.
- Match Persistenz: Drives + PlayerMatchStats + Stat-Aggregate koennen viele Writes pro Match erzeugen.
- Team-Detail: Ohne Team-Roster-Readmodel wuerde jeder Spieler mehrere Reads verursachen.
- Player-Detail: Season-Stats und History brauchen Pagination/Limits.
- Standings: Sortierung nach Wins/PointsFor ist ok, aber Composite Index noetig.
- Counts: `_count` aus Prisma wird in Firestore nicht gratis; Counter oder Aggregation Queries einplanen.

## Zielarchitektur

### SDK-Aufteilung

- Firebase Client SDK: Browser-Reads fuer freigegebene Savegame-Daten, optional Inbox-Status mit restriktiven Rules.
- Firebase Admin SDK: alle Server Actions, API Routes, Migration Scripts, Seeds, Simulation, Finance, Draft, Roster.
- Keine Auth-Umstellung: bestehende Auth bleibt massgeblich. Serverseitig wird bestehende `userId` in Firestore-Pfade uebersetzt.

### Repository Layer

Neue Ports definieren, bevor Firestore produktiv schreibt:
- `SaveGameRepository`
- `ReferenceDataRepository`
- `TeamRepository`
- `TeamManagementRepository`
- `PlayerRepository`
- `SeasonRepository`
- `SimulationRepository`
- `DraftRepository`
- `InboxTaskRepository`

Implementierungen:
- `*.prisma.repository.ts` bleibt aktiv.
- `*.firestore.repository.ts` entsteht parallel.
- Services sprechen nur noch Repository-Interfaces an.
- Feature Flag je Aggregat: `DATA_BACKEND=prisma|firestore|dual-read|dual-write`.

### Firebase Emulator

Pflicht vor Migration:
- `firebase.json` mit Firestore Emulator.
- `firestore.rules`.
- `firestore.indexes.json`.
- Seed gegen Emulator fuer Referenzdaten und E2E-Minimalwelt.
- Test-Setup fuer Admin SDK und Rules Unit Tests.

### Security Rules

Grundregel:

```text
users/{userId}/saveGames/{saveGameId}: read nur fuer request.auth.uid == userId.
```

Writes:
- Default deny fuer Savegame-Subcollections.
- Client-writable nur explizit erlauben, z.B. `inboxTasks/{taskKey}` mit Feld-Allowlist.
- Server-only Daten werden nicht durch Rules geschuetzt, sondern via Admin SDK geschrieben; Rules verweigern Client-Writes.
- Referenzdaten: client read, write deny.
- Draft true values: entweder in server-only Docs auslagern oder per Rules nie an Clients ausliefern. Sicherer: `privateProspectData/{draftPlayerId}` server-only unter Admin-Pfad.

### Migration Scripts

Noetige Skripte:
- `scripts/firebase/seed-reference-data.ts`
- `scripts/firebase/export-prisma-savegame.ts`
- `scripts/firebase/import-savegame-firestore.ts`
- `scripts/firebase/verify-savegame-parity.ts`
- `scripts/firebase/e2e-seed.ts`

Migrationsmodus:
- idempotent.
- schreibt unter neuem Firestore Namespace.
- Parity-Checks gegen Prisma.
- Kein Loeschen von Prisma-Daten.
- Decimal-Migration: Money als cents, `sacks` als tenths.

### Teststrategie

Unit:
- Repository-Contract-Tests gegen Prisma und Firestore Emulator.
- Mapping-Tests fuer Decimal/Timestamp/Enum/Stats-Maps.

Integration:
- Savegame erstellen.
- Team Detail lesen.
- Free Agent sign/release.
- Week Flow.
- Season Simulation einer Woche.
- Draft Scout/Pick.
- Inbox State.

Rules:
- User A darf eigene Savegames lesen.
- User A darf User B Savegames nicht lesen.
- Client darf server-only Collections nicht schreiben.
- Client darf keine Finance/Stats/Player-True-Values schreiben.

E2E:
- Firestore Emulator Seed analog zu `scripts/seeds/e2e-seed.ts`.
- Bestehende Playwright-Specs mit Backend-Flag gegen Firestore laufen lassen.

## Konkrete Arbeitspakete

### Paket 1: Repository-Grenzen und Zugriffsinventar finalisieren

Ziel: Prisma-Zugriff hinter Interfaces kapseln, ohne Verhalten zu aendern.

Dateien:
- `src/modules/**/infrastructure/*.repository.ts`
- `src/modules/draft/application/*.service.ts`
- `src/modules/savegames/application/*.service.ts`
- `src/modules/seasons/application/*.service.ts`
- neue `src/modules/*/application/*repository-port.ts` oder lokale Ports.

Tests:
- bestehende Unit-Tests muessen unveraendert gruen bleiben.
- neue Contract-Tests fuer wichtige Repository-Methoden.

Statuspruefung:
- `rg "prisma\\." src` zeigt nur noch Prisma-Implementierungen und bewusst dokumentierte Legacy-Stellen.

### Paket 2: Firebase Basis ohne Produktivumschaltung

Ziel: Firebase Projektkonfiguration, Admin/Client Initialisierung, Emulator und Rules lokal etablieren.

Dateien:
- `src/lib/firebase/admin.ts`
- `src/lib/firebase/client.ts`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `.env.example` oder Setup-Dokumentation.

Tests:
- Emulator Smoke Test.
- Rules Unit Tests fuer Ownership und Default-Deny.

Statuspruefung:
- Firestore Emulator startet lokal.
- Kein produktiver Codepfad nutzt Firestore ohne Feature Flag.

### Paket 3: Referenzdaten nach Firestore spiegeln

Ziel: Globale Referenzdaten aus `reference-data.ts` in Firestore schreiben und lesen koennen.

Dateien:
- `scripts/firebase/seed-reference-data.ts`
- `src/modules/shared/infrastructure/reference-data.firestore.repository.ts`
- optional `docs/guides/operations-firebase.md`

Tests:
- Parity-Test: Prisma Seed vs Firestore Seed fuer Codes/Counts.
- Emulator-Test fuer `listPositionDefinitions`, `listSchemeFitDefinitions`, `requireDefaultLeagueDefinition`.

Statuspruefung:
- Referenzdaten sind idempotent im Emulator vorhanden.
- Bestehende Prisma-Seeds bleiben unveraendert nutzbar.

### Paket 4: Firestore Savegame Readmodel und Parity

Ziel: Ein bestehendes Prisma-Savegame in Firestore abbilden und read-only mit UI-Readmodellen vergleichen.

Dateien:
- `scripts/firebase/export-prisma-savegame.ts`
- `scripts/firebase/import-savegame-firestore.ts`
- `scripts/firebase/verify-savegame-parity.ts`
- Firestore-Implementierungen fuer SaveGame/Team/Player/Season Reads.

Tests:
- Detail-Parity fuer Savegame, Team, Player, Season.
- E2E-Minimalwelt als Firestore Emulator Seed.

Statuspruefung:
- `getSaveGameDetail`, `getTeamDetail`, `getPlayerDetail`, `getSeasonOverview` liefern fachlich gleiche Viewmodels.
- Keine Firestore Writes aus UI-Actions ausser Seed/Migration.

### Paket 5: Server-only Schreibaggregate schrittweise migrieren

Ziel: Mutationen mit hohem Risiko einzeln auf Firestore vorbereiten, zuerst im Emulator.

Reihenfolge:
- Inbox Task State.
- Draft Scouting.
- Draft Pick mit Counter/Transaction.
- Roster Assignment.
- Free-Agent Sign/Release/Contract/Finance.
- Week Flow.
- Season Simulation.

Dateien:
- Firestore-Repositories je Aggregat.
- `firestore.indexes.json`
- Rules-Tests.
- Service-Contract-Tests.

Tests:
- Repository-Contract-Tests.
- Integration pro Schreibpfad.
- Simulations-Parity fuer eine deterministische Woche.
- Kosten-/Write-Count-Protokoll pro Match.

Statuspruefung:
- Jeder Schreibpfad laeuft im Emulator deterministisch.
- Fehlerfaelle hinterlassen keine teilmigrierten fachlichen Zustaende.
- Prisma bleibt weiterhin verfuegbar.

## Statuspruefung

Ist die aktuelle DB-Struktur vollstaendig verstanden?

Status: Gruen. Prisma-Schema, Datenregionen, Relationstypen, Transaktionsschwerpunkte, Seeds, Tests, E2E-Fixtures und produktive Zugriffspfade sind identifiziert.

Ist das Firestore-Zielmodell konkret beschrieben?

Status: Gruen. Zielpfade, Dokumentstruktur, Subcollections, Denormalisierung, Query-Patterns und Indexbedarf sind modelliert.

Sind Risiken klar benannt?

Status: Gruen. HauptRisiken sind Joins, Denormalisierung, server-only Writes, Multi-Doc-Transaktionen, Simulation-Write-Volumen, Counters, Security Rules und Kosten.

Ist eine sichere schrittweise Migration moeglich?

Status: Rot. Sie ist architektonisch moeglich, aber noch nicht startbereit. Vor produktiver Umsetzung fehlen Repository-Abstraktion, Emulator/Rules/Indexes, Parity-Skripte, Firestore-Seeds, Kostenmessung und Transaktionsersatz fuer die Schreibaggregate.

## Gesamtstatus

Status: Rot

Gruende:
- Noch kein Firestore Repository Layer vorhanden.
- Bestehende Services sind teils direkt an Prisma gekoppelt.
- Tiefe relational-normalisierte Reads benoetigen dedizierte Firestore-Readmodelle.
- Simulation und Roster/Finance verwenden komplexe Prisma-Transaktionen, die nicht unveraendert nach Firestore uebernommen werden koennen.
- Security Rules und Emulator-Tests existieren noch nicht.
- E2E-Seed und Tests sind PostgreSQL/Prisma-gebunden.

Keine Umsetzung starten, bevor Paket 1 und Paket 2 abgeschlossen und Paket 4 mindestens read-only im Emulator validiert ist.
