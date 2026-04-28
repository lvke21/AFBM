# Datenfluss

## Zweck

Dieses Dokument beschreibt die wichtigsten aktuellen Datenfluesse des Systems. Es konzentriert sich auf reale, im Code vorhandene Fluesse und trennt klar zwischen:

- Seed-Flows
- Savegame-Schreibpfaden
- Lesepfaden fuer UI und API
- produktiven Gameplay-Flows
- in-memory Gameplay-Engine-Flows

## 1. Referenzdaten-Seed

### Beteiligte Komponenten

- `prisma/seed.ts`
- `src/modules/shared/infrastructure/reference-data.ts`

### Ablauf

1. `npm run prisma:seed` startet `prisma/seed.ts`.
2. `seed.ts` ruft `ensureReferenceData(prisma)` auf.
3. Die Seedlogik upsertet:
   - Liga
   - Konferenzen
   - Divisionen
   - Franchise-Templates
   - Positionsgruppen
   - Positionen
   - Archetypen
   - Scheme Fits
   - Attributdefinitionen

### Ergebnis

Die Anwendung kann anschliessend Savegames auf Basis relational gespeicherter Referenzdaten anlegen. Der Seed erzeugt keine Savegames und keine Laufzeitdaten.

## 2. Authentifizierung und Zugang zum App-Bereich

### Beteiligte Komponenten

- `src/auth.ts`
- `src/lib/auth/provider-config.ts`
- `src/lib/auth/session.ts`
- `src/app/app/layout.tsx`

### Ablauf

1. Ein Request auf `/app` oder einen untergeordneten Pfad trifft auf `src/app/app/layout.tsx`.
2. Das Layout ruft `requirePageUserId()` auf.
3. Wenn kein Provider konfiguriert ist, erfolgt eine Umleitung nach `/auth/setup-required`.
4. Wenn ein Provider konfiguriert ist, aber keine Session besteht, erfolgt eine Umleitung nach `/api/auth/signin`.
5. Bei gueltiger Session wird `session.user.id` verwendet und die Seite darf laden.

### Ergebnis

Alle geschuetzten Pages, APIs und Actions laufen im Benutzerkontext. Es gibt keinen anonymen Fallback.

## 3. Savegame-Erstellung ueber die UI

### Beteiligte Komponenten

- `src/components/ui/create-savegame-form.tsx`
- `src/app/app/savegames/actions.ts`
- `src/modules/savegames/application/savegame-command.service.ts`

### Ablauf

1. Das Formular sendet `name` und optional `managerTeamAbbreviation` an `createSaveGameAction(formData)`.
2. Die Server Action loest den Benutzer ueber `requirePageUserId()` auf.
3. `createSaveGame()` validiert die Eingaben mit Zod.
4. Der Service laedt die Default-Liga aus den Referenzdaten.
5. Es werden `SaveGame`, `SaveGameSetting` und `Season` angelegt.
6. `SaveGame.currentSeasonId` wird gesetzt.
7. `bootstrapSaveGameWorld()` erzeugt den Startzustand.
8. Die Server Action leitet nach `/app/savegames/{id}` weiter.

## 4. Savegame-Erstellung ueber die API

### Beteiligte Komponenten

- `POST /api/savegames`
- `createSaveGame()`

### Request-Form

```json
{
  "name": "My Save",
  "managerTeamAbbreviation": "BOS"
}
```

### Response bei Erfolg

```json
{
  "id": "savegame-id",
  "currentSeasonId": "season-id"
}
```

### Fehler

- `401` bei fehlender Session
- `503` bei fehlendem Auth-Provider

## 5. World-Bootstrap eines neuen Savegames

### Beteiligte Komponenten

- `bootstrap-savegame-world.service.ts`
- `initial-roster.ts`
- `player-stat-shells.ts`
- `double-round-robin-schedule.ts`

### Ablauf

1. Referenzdaten fuer Positionen, Franchises, Archetypen, Scheme Fits und Attribute werden geladen.
2. Aus jedem Franchise-Template wird ein savegame-spezifisches `Team`.
3. Fuer jedes Team wird ein leerer `TeamSeasonStat` fuer die Startseason angelegt.
4. `buildInitialRoster()` erzeugt pro Team einen 53-Spieler-Kader.
5. Pro Spieler werden gespeichert:
   - `Player`
   - `PlayerRosterProfile`
   - `PlayerEvaluation`
   - mehrere `PlayerAttributeRating`
   - `Contract`
   - `RosterTransaction` vom Typ `SIGNING`
6. `createInitialPlayerStatShells()` erzeugt pro Spieler:
   - `PlayerCareerStat` plus alle Career-Statblocke
   - `PlayerSeasonStat` plus alle Season-Statblocke
7. `buildDoubleRoundRobinSchedule()` erzeugt fuer die 8-Team-Liga einen 14-Wochen-Spielplan.
8. Fuer jedes geplante Spiel wird ein `Match` gespeichert.

### Wichtige Praezisierung

Der Bootstrap erzeugt aktuell **keine**:
- `PlayerMatchStat`
- `TeamMatchStat`

Diese Tabellen werden erst waehrend der laufenden Matchsimulation beschrieben.

## 6. Dashboard- und Savegame-Lesefluss

### Beteiligte Komponenten

- `src/app/app/page.tsx`
- `src/app/app/savegames/page.tsx`
- `src/modules/savegames/application/savegame-query.service.ts`
- `src/modules/savegames/infrastructure/savegame.repository.ts`

### Ablauf

1. Die Page fordert Savegames fuer den aktuellen Benutzer an.
2. Das Repository laedt Savegames inklusive Liga, aktueller Season, Teams und Counts.
3. Der Query-Service mappt auf `SaveGameListItem`.
4. Dashboard und Savegame-Hub rendern ausschliesslich das Readmodell.

## 7. Savegame-Detail-Lesefluss

### Beteiligte Komponenten

- `src/app/app/savegames/[savegameId]/page.tsx`
- `getSaveGameFlowSnapshot()`
- `getSaveGameDetail()`

### Ablauf

1. Die Page laedt das Savegame fuer den aktuellen Benutzer.
2. `getSaveGameDetail()` mappt:
   - Savegame-Kopfdaten
   - Settings
   - Teams
   - Seasons
3. `getSaveGameFlowSnapshot()` leitet daraus zusaetzlich:
   - `featuredTeamId`
   - `currentSeasonId`
   ab.

### Ergebnis

Die Seite kennt weder Prisma-Graphen noch Ownership-Logik direkt.

## 8. Team-Detail-Lesefluss

### Beteiligte Komponenten

- `src/app/app/savegames/[savegameId]/teams/[teamId]/page.tsx`
- `getTeamDetailForUser()`
- `team.repository.ts`

### Ablauf

1. Der Benutzer fordert ein Team innerhalb eines Savegames an.
2. Ownership wird im Query-Pfad geprueft.
3. Das Repository laedt:
   - Team
   - Conference und Division
   - Roster-Profile
   - Player
   - Evaluation
   - Attribute
   - aktuelle Contracts
   - PlayerSeasonStats
4. Der Query-Service mappt das Ergebnis auf:
   - `TeamDetail`
   - `TeamPlayerSummary`

### Wichtige Praezisierung

Die Teamansicht liest nur einen kompakten Saisonstatistik-Ausschnitt pro Spieler. Sie ist keine vollstaendige Player-Stat-Detailansicht.

## 9. Saison-Lesefluss

### Beteiligte Komponenten

- `src/app/app/savegames/[savegameId]/seasons/[seasonId]/page.tsx`
- `getSeasonOverviewForUser()`
- `season.repository.ts`

### Ablauf

1. Der Benutzer fordert eine Saison innerhalb eines Savegames an.
2. Ownership und Savegame-Kontext werden geprueft.
3. Das Repository laedt:
   - Season
   - TeamSeasonStats
   - Matches
4. Der Query-Service mappt auf `SeasonOverview`.

### Ergebnis

Die Seite zeigt Standings, Matchliste und den Einstiegspunkt fuer die aktuelle Wochensimulation. Match-Event-Details oder Play-by-Play sind weiterhin nicht vorhanden.

## 10. Saisonfortschritt und Matchsimulation

### Beteiligte Komponenten

- `src/app/app/savegames/[savegameId]/seasons/[seasonId]/actions.ts`
- `src/modules/seasons/application/season-simulation.service.ts`
- `src/modules/seasons/application/simulation/*`
- `src/modules/seasons/infrastructure/simulation/season-simulation.repository.ts`

### Ablauf

1. Die Saisonseite sendet `saveGameId` und `seasonId` an `simulateSeasonWeekAction(formData)`.
2. Die Action loest den Benutzer ueber `requirePageUserId()` auf.
3. `simulateSeasonWeekForUser()` laedt den Season-Header und die noch offenen Matches der aktuellen Woche.
4. `buildMatchContext()` mappt die geladenen Teams, Roster-Profile, Attribute und Statistikanker auf einen engine-tauglichen Simulationskontext.
5. `generateMatchStats()` simuliert jedes Match drive-basiert.
6. Pro Match werden geschrieben:
   - `Match.status`, `homeScore`, `awayScore`
   - `TeamMatchStat`
   - `PlayerMatchStat` und relevante Match-Statblocke
7. Anschliessend werden fortgeschrieben:
   - `TeamSeasonStat`
   - `PlayerSeasonStat` plus Season-Statblocke
   - `PlayerCareerStat` plus Career-Statblocke
8. `updateSeasonProgression()` bestimmt die naechste Woche und Phase.

## 11. Gameplay-Engine-Flow ausserhalb des produktiven Write-Pfads

### Beteiligte Komponenten

- `src/modules/gameplay/application/pre-snap-legality-engine.ts`
- `src/modules/gameplay/application/play-library-service.ts`
- `src/modules/gameplay/application/play-selection-engine.ts`
- `src/modules/gameplay/application/outcome-resolution-engine.ts`
- `src/modules/gameplay/application/gameplay-calibration.ts`

### Ablauf

1. Eine Spielsituation wird als `GameSituationSnapshot` normalisiert.
2. Ein `PreSnapStructureSnapshot` wird aus der Play-Definition oder einem kombinierten Offense-/Defense-Snapshot aufgebaut.
3. `validatePreSnapStructure()` prueft die Snap-Legalitaet.
4. `DefaultPlaySelectionEngine.select()` waehlt den Offense- und Defense-Call aus Playbook und Play-Library.
5. `DefaultOutcomeResolutionEngine.resolve()` loest den Call probabilistisch auf.
6. `DefaultStateValueModel` bewertet den Zustandswechsel ueber `PlayValueAssessment`.
7. `simulateGameplayCalibrationScenario()` bzw. `simulateGameplayCalibrationReport()` prueft die Verteilungen ueber Batch-Simulationen.

### Wichtige Praezisierung

Dieser Flow ist heute testbar und architektonisch fuehrend fuer die naechste Engine-Stufe, schreibt aber noch keine produktiven Season-, Match- oder Player-Stats in die Datenbank.
9. `Season.week` und `Season.phase` werden aktualisiert.

### Aktueller fachlicher Zuschnitt

- vereinfachtes Drive-Modell
- Starter-/Backup-Auswahl auf Basis von `depthChartSlot`
- Sekundaerpositionen fuer Return-Rollen
- noch kein Play-by-Play, keine Verletzungen, keine Trainings- oder Finanzfolgen

## 11. API-Lesefluesse

### Verfuegbare Endpunkte

- `GET /api/savegames` -> `{ items: SaveGameListItem[] }`
- `GET /api/savegames/[savegameId]` -> `SaveGameDetail`
- `GET /api/savegames/[savegameId]/teams/[teamId]` -> `TeamDetail`
- `GET /api/savegames/[savegameId]/seasons/[seasonId]` -> `SeasonOverview`

### Gemeinsame Fehlerfaelle

- `401` bei fehlender Session
- `404` wenn das Zielobjekt nicht zum Benutzer oder Savegame gehoert
- `503` wenn kein Auth-Provider konfiguriert ist

## 12. Heute noch nicht vorhandene Datenfluesse

Diese Fluesse sind derzeit nicht implementiert:

- Training, das Attribute oder Entwicklung fortschreibt
- Transfer-Workflows mit mehreren Transaktionen und Teamwechseln
- Finanzprozesse mit Buchungszeilen
- Verletzungshistorie mit Verlauf ueber mehrere Zeitpunkte

## Weiterfuehrende Dokumente

- [architecture.md](./architecture.md)
- [modules.md](./modules.md)
- [./data/enums-and-read-models.md](./data/enums-and-read-models.md)
