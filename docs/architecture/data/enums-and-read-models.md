# Enums, Readmodelle und API-Responses

## Zweck

Dieses Dokument beschreibt die festen Wertebereiche des Prisma-Schemas sowie die heute verwendeten Read-DTOs und JSON-Responses.

## 1. Prisma-Enums

| Enum | Werte | Verwendet in |
|---|---|---|
| `SaveGameStatus` | `ACTIVE`, `ARCHIVED` | `SaveGame.status` |
| `RosterUnit` | `OFFENSE`, `DEFENSE`, `SPECIAL_TEAMS` | `PositionGroupDefinition.unit`, `PositionDefinition.unit` |
| `SideOfBall` | `OFFENSE`, `DEFENSE`, `SPECIAL_TEAMS` | `PositionGroupDefinition.side`, `PositionDefinition.side` |
| `PlayerStatus` | `ACTIVE`, `INJURED`, `FREE_AGENT`, `RETIRED` | `Player.status` |
| `InjuryStatus` | `HEALTHY`, `QUESTIONABLE`, `DOUBTFUL`, `OUT`, `INJURED_RESERVE` | `Player.injuryStatus` |
| `DominantHand` | `RIGHT`, `LEFT`, `AMBIDEXTROUS` | `Player.dominantHand` |
| `DevelopmentTrait` | `NORMAL`, `IMPACT`, `STAR`, `ELITE` | `Player.developmentTrait` |
| `RosterStatus` | `STARTER`, `ROTATION`, `BACKUP`, `PRACTICE_SQUAD`, `INACTIVE`, `INJURED_RESERVE`, `FREE_AGENT` | `PlayerRosterProfile.rosterStatus` |
| `AttributeCategory` | `GENERAL`, `QUARTERBACK`, `BALL_CARRIER`, `RECEIVING`, `OFFENSIVE_LINE`, `FRONT_SEVEN`, `COVERAGE`, `KICKING`, `SPECIAL_TEAMS` | `AttributeDefinition.category` |
| `ContractStatus` | `ACTIVE`, `EXPIRED`, `RELEASED` | `Contract.status` |
| `SeasonPhase` | `PRESEASON`, `REGULAR_SEASON`, `PLAYOFFS`, `OFFSEASON` | `Season.phase` |
| `MatchKind` | `PRESEASON`, `REGULAR_SEASON`, `PLAYOFF` | `Match.kind` |
| `MatchStatus` | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED` | `Match.status` |
| `RosterTransactionType` | `DRAFT`, `SIGNING`, `TRADE`, `RELEASE` | `RosterTransaction.type` |
| `TeamFinanceEventType` | `SIGNING_BONUS`, `RELEASE_PAYOUT`, `SEASON_SALARY` | `TeamFinanceEvent.type` |

## 2. Read-DTOs fuer UI und API

### Savegames

**Datei:** `src/modules/savegames/domain/savegame.types.ts`

| Typ | Zweck | Wichtige Felder |
|---|---|---|
| `SaveGameListItem` | Listenansicht fuer Savegames | `id`, `name`, `status`, `leagueName`, `currentSeasonLabel`, `teamCount`, `playerCount`, `updatedAt` |
| `SaveGameTeamSummary` | kompakter Teamblock im Savegame-Detail | `id`, `name`, `abbreviation`, `conferenceName`, `divisionName`, `managerControlled`, `overallRating`, `rosterSize`, `salaryCapSpace`, `currentRecord` |
| `SaveGameSeasonSummary` | kompakter Saisonblock im Savegame-Detail | `id`, `year`, `phase`, `week`, `matchCount` |
| `SaveGameDetail` | Detailansicht eines Savegames | Kopf, Settings, Teams, Seasons |
| `SaveGameFlowSnapshot` | Savegame plus hervorgehobenes Team und aktuelle Season | `saveGame`, `featuredTeamId`, `currentSeasonId` |

### Seasons

**Datei:** `src/modules/seasons/domain/season.types.ts`

| Typ | Zweck | Wichtige Felder |
|---|---|---|
| `SeasonStandingRow` | Tabellenzeile fuer Standings | `teamId`, `name`, `abbreviation`, `record`, `pointsFor`, `pointsAgainst`, `touchdownsFor`, `turnoverDifferential`, `passingYards`, `rushingYards`, `sacks`, `explosivePlays`, `redZoneTrips`, `redZoneTouchdowns` |
| `SeasonMatchSummary` | kompakter Matchblock | `id`, `week`, `scheduledAt`, `status`, Heim- und Gastteam, Scores |
| `SeasonOverview` | gesamte Saisonansicht | `id`, `year`, `phase`, `week`, `standings`, `matches` |

### Teams

**Datei:** `src/modules/teams/domain/team.types.ts`

| Typ | Zweck | Wichtige Felder |
|---|---|---|
| `TeamPlayerSummary` | kompakter Spielerblock in der Teamansicht | Basisdaten, Rollen, Evaluation, `detailRatings`, `keyAttributes`, `schemeFitScore`, `developmentFocus`, Vertragsausschnitt, `seasonLine` |
| `TeamDetail` | Teamansicht | `id`, `name`, `abbreviation`, `conferenceName`, `divisionName`, Team-Schemes, Contract Outlook, Finance Log, `players` |

### Players

**Datei:** `src/modules/players/domain/player.types.ts`

| Typ | Zweck | Wichtige Felder |
|---|---|---|
| `PlayerAttributeGroup` | gruppierte Rohattribute fuer die Spieleransicht | `category`, `label`, `attributes` |
| `PlayerDetail` | tiefe Spieleransicht | Kopf, Roster-Kontext, Team-Schemes, `schemeFitScore`, Evaluation, `detailRatings`, `compositeRatings`, Attributgruppen, Latest Season, Career |

## 3. API-Responses

### `GET /api/savegames`

Erfolgsantwort:

```json
{
  "items": [
    {
      "id": "savegame-id",
      "name": "My Save",
      "status": "ACTIVE"
    }
  ]
}
```

Tatsaechliche Vollform:
- `items` ist ein Array aus `SaveGameListItem`

### `POST /api/savegames`

Request:

```json
{
  "name": "My Save",
  "managerTeamAbbreviation": "BOS"
}
```

Erfolgsantwort:

```json
{
  "id": "savegame-id",
  "currentSeasonId": "season-id"
}
```

### `GET /api/savegames/[savegameId]`

Erfolgsantwort:
- `SaveGameDetail`

### `GET /api/savegames/[savegameId]/teams/[teamId]`

Erfolgsantwort:
- `TeamDetail`

### `GET /api/savegames/[savegameId]/players/[playerId]`

Erfolgsantwort:
- `PlayerDetail`

### `GET /api/savegames/[savegameId]/seasons/[seasonId]`

Erfolgsantwort:
- `SeasonOverview`

## 4. Gemeinsame API-Fehlerantworten

| Status | Ursache | Beispiel |
|---|---|---|
| `401` | keine gueltige Session | `{ "message": "Unauthorized" }` |
| `404` | Objekt nicht gefunden oder nicht im Benutzerkontext vorhanden | `{ "message": "Not found" }` |
| `503` | kein Auth-Provider konfiguriert | `{ "message": "Authentication provider is not configured" }` |

## 5. Server Action

### `createSaveGameAction(formData)`

Ort:
- `src/app/app/savegames/actions.ts`

Eingaben aus dem Formular:
- `name`
- `managerTeamAbbreviation`

Verhalten:
- loest `userId` ueber die Session auf
- ruft `createSaveGame()`
- leitet bei Erfolg nach `/app/savegames/{id}` um

### `simulateSeasonWeekAction(formData)`

Ort:
- `src/app/app/savegames/[savegameId]/seasons/[seasonId]/actions.ts`

Eingaben aus dem Formular:
- `saveGameId`
- `seasonId`

Verhalten:
- loest `userId` ueber die Session auf
- ruft `simulateSeasonWeekForUser()`
- revalidiert Savegame-, Team- und Saisonpfade und leitet zur Saisonansicht zurueck

### `advanceToNextSeasonAction(formData)`

Ort:
- `src/app/app/savegames/[savegameId]/seasons/[seasonId]/actions.ts`

Eingaben aus dem Formular:
- `saveGameId`
- `seasonId`

Verhalten:
- loest `userId` ueber die Session auf
- ruft `advanceToNextSeasonForUser()`
- erzeugt bei Bedarf die naechste Saison und leitet auf deren Saisonseite weiter

## 6. Wichtige technische Hinweise

- Die API liefert heute ausschliesslich Readmodelle oder kleine Write-Resultate, keine rohen Prisma-Datensaetze.
- `TeamPlayerSummary.keyAttributes` verwendet gezielt nur einen Ausschnitt der Rohattribute fuer die tabellarische Teamansicht, darunter jetzt auch neue Football-Felder wie:
  - `SPEED`
  - `STRENGTH`
  - `AWARENESS`
  - `MOBILITY`
  - `HANDS`
  - `COVERAGE_RANGE`
  - `LB_MAN_COVERAGE`
  - `LB_ZONE_COVERAGE`
  - `LEADERSHIP`
  - `DISCIPLINE`
  - `DURABILITY`
  - `KICK_CONSISTENCY`
  - `SNAP_ACCURACY`
  - `SNAP_VELOCITY`

## Weiterfuehrende Dokumente

- [entities.md](./entities.md)
- [player-model.md](./player-model.md)
- [../data-flow.md](../data-flow.md)
