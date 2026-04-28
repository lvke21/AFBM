# Entitaeten

## Zweck

Dieses Dokument beschreibt die persistierten Modelle des aktuellen Projekts auf Ebene des Prisma-Schemas. Es ist die kompakte Entitaetsreferenz und verweist fuer Detailthemen auf die spezialisierten Daten-Dokumente.

Fuehrende Quelle:
- `prisma/schema.prisma`

## Datenregionen

| Region | Beschreibung | Details |
|---|---|---|
| Auth-Daten | Benutzer, Providerkonten und Sessions | [state-boundaries.md](./state-boundaries.md) |
| Referenzdaten | Seed-verwaltete Stammdaten | [state-boundaries.md](./state-boundaries.md) |
| Savegame-Kern | Spielstand, Seasons, Teams, Spieler, Rollen, Vertrage | [relations.md](./relations.md) |
| Statistikdaten | Team- und Spielerstatistiken auf mehreren Ebenen | [statistics.md](./statistics.md) |

## 1. Auth-Modelle

| Modell | Zweck | Wichtige Felder | Aktueller Writer |
|---|---|---|---|
| `User` | Benutzerkonto und Savegame-Besitzer | `id`, `name`, `email`, `createdAt`, `updatedAt` | Auth.js |
| `Account` | OAuth-Providerkonto | `userId`, `provider`, `providerAccountId`, Token-Felder | Auth.js |
| `Session` | Datenbank-Session | `sessionToken`, `userId`, `expires` | Auth.js |
| `VerificationToken` | Tokenbasierte Verifikation | `identifier`, `token`, `expires` | Auth.js |

## 2. Referenzdaten-Modelle

| Modell | Zweck | Wichtige Felder | Aktueller Writer |
|---|---|---|---|
| `LeagueDefinition` | Liga als oberste Referenzstruktur | `code`, `name` | Seed |
| `ConferenceDefinition` | Konferenz innerhalb einer Liga | `leagueDefinitionId`, `code`, `name` | Seed |
| `DivisionDefinition` | Division innerhalb einer Konferenz | `conferenceDefinitionId`, `code`, `name` | Seed |
| `FranchiseTemplate` | statische Franchise-Basis | `city`, `nickname`, `abbreviation`, `marketSize`, `prestige`, `defaultBudget` | Seed |
| `PositionGroupDefinition` | aktuelle Top-Level-Gruppen fuer Offense, Defense und Special Teams | `code`, `name`, `unit`, `side` | Seed |
| `PositionDefinition` | konkrete Positionen wie `QB`, `LT`, `FS`, `KR` | `positionGroupDefinitionId`, `code`, `name`, `unit`, `side` | Seed |
| `ArchetypeDefinition` | Archetypen pro Gruppe oder Position | `positionGroupDefinitionId`, `positionDefinitionId?`, `code`, `name` | Seed |
| `SchemeFitDefinition` | Scheme-Fits fuer Rollen | `positionGroupDefinitionId`, `code`, `name` | Seed |
| `AttributeDefinition` | Lexikon der speicherbaren Spielerattribute | `code`, `name`, `category`, `sortOrder`, `description?` | Seed |

## 3. Savegame-Kernmodelle

| Modell | Zweck | Wichtige Felder | Aktueller Writer |
|---|---|---|---|
| `SaveGame` | Wurzelobjekt eines Spielstands | `userId`, `leagueDefinitionId`, `currentSeasonId?`, `name`, `status` | Savegame-Erstellung |
| `SaveGameSetting` | globale Savegame-Regeln | `salaryCap`, `activeRosterLimit`, `practiceSquadSize`, `seasonLengthWeeks` | Savegame-Erstellung |
| `Season` | Saison innerhalb eines Savegames | `saveGameId`, `year`, `phase`, `week`, `startsAt?`, `endsAt?` | Savegame-Erstellung |
| `Team` | savegame-spezifisches Team | `saveGameId`, `franchiseTemplateId`, `managerControlled`, `overallRating`, `cashBalance`, `salaryCapSpace`, Team-Schemes | Savegame-Bootstrap |
| `Match` | geplantes oder gespieltes Spiel | `saveGameId`, `seasonId`, `week`, `kind`, `status`, `homeTeamId`, `awayTeamId`, `scheduledAt` | Savegame-Bootstrap, Season-Simulation |

## 4. Spieler- und Kadermodelle

| Modell | Zweck | Wichtige Felder | Aktueller Writer |
|---|---|---|---|
| `Player` | Identitaet und Basiszustand eines Spielers | `firstName`, `lastName`, `age`, `heightCm`, `weightKg`, `yearsPro`, `status`, `injuryStatus`, `fatigue`, `morale`, `developmentTrait` | Savegame-Bootstrap |
| `PlayerRosterProfile` | Teamzuordnung, Positionen, Rolle und Scheme-Daten | `teamId?`, `primaryPositionDefinitionId`, `secondaryPositionDefinitionId?`, `positionGroupDefinitionId`, `rosterStatus`, `depthChartSlot?`, `captainFlag`, `developmentFocus`, `injuryRisk`, `practiceSquadEligible?` | Savegame-Bootstrap |
| `PlayerEvaluation` | kompakte Bewertungswerte | `potentialRating`, `positionOverall`, `offensiveOverall?`, `defensiveOverall?`, `specialTeamsOverall?` | Savegame-Bootstrap |
| `PlayerAttributeRating` | konkreter Attributwert eines Spielers | `playerId`, `attributeDefinitionId`, `value` | Savegame-Bootstrap |
| `Contract` | Vertrag zwischen Spieler und Team | `playerId`, `teamId`, `startSeasonId?`, `status`, `years`, `yearlySalary`, `signingBonus`, `capHit` | Savegame-Bootstrap |
| `RosterTransaction` | einfache Historie von Kaderbewegungen | `playerId`, `fromTeamId?`, `toTeamId?`, `type`, `occurredAt`, `description?` | Savegame-Bootstrap, spaetere Kaderprozesse |
| `TeamFinanceEvent` | Finanzverlauf eines Teams | `teamId`, `playerId?`, `seasonId?`, `type`, `amount`, `capImpact`, `cashBalanceAfter` | Team-Management, Saisonfortschritt |

## 5. Team-Statistikmodelle

| Modell | Zweck | Wichtige Felder | Aktueller Writer |
|---|---|---|---|
| `TeamSeasonStat` | Teamaggregate pro Saison | `gamesPlayed`, `wins`, `losses`, `ties`, `pointsFor`, `pointsAgainst`, `touchdownsFor`, `touchdownsAgainst`, `turnoversForced`, `turnoversCommitted` | Savegame-Bootstrap initialisiert leer, Season-Simulation schreibt fort |
| `TeamMatchStat` | Teamaggregate pro Match | `firstDowns`, `totalYards`, `turnovers`, `penalties`, `timeOfPossessionSeconds` | Season-Simulation |

## 6. Spieler-Aggregatmodelle

| Modell | Ebene | Zweck | Aktueller Writer |
|---|---|---|---|
| `PlayerCareerStat` | Career | lebenslange Aggregate eines Spielers innerhalb eines Savegames | Savegame-Bootstrap initialisiert leer, Season-Simulation schreibt fort |
| `PlayerSeasonStat` | Season | saisonbezogene Aggregate eines Spielers und Teams | Savegame-Bootstrap initialisiert leer, Season-Simulation schreibt fort |
| `PlayerMatchStat` | Match | matchbezogene Aggregate eines Spielers und Teams | Season-Simulation |

Gemeinsame Basisfelder:
- `gamesPlayed` oder `started`
- `gamesStarted` falls vorhanden
- `snapsOffense`
- `snapsDefense`
- `snapsSpecialTeams`

## 7. Strukturierte Spieler-Statistikfamilien

Jede Statistikfamilie existiert in drei Tabellen:
- Career
- Season
- Match

### Passing

- `PlayerCareerPassingStat`
- `PlayerSeasonPassingStat`
- `PlayerMatchPassingStat`

Gemeinsame Felder:
- `attempts`
- `completions`
- `yards`
- `touchdowns`
- `interceptions`
- `sacksTaken`
- `sackYardsLost`
- `longestCompletion`

### Rushing

- `PlayerCareerRushingStat`
- `PlayerSeasonRushingStat`
- `PlayerMatchRushingStat`

Gemeinsame Felder:
- `attempts`
- `yards`
- `touchdowns`
- `fumbles`
- `longestRush`
- `brokenTackles`

### Receiving

- `PlayerCareerReceivingStat`
- `PlayerSeasonReceivingStat`
- `PlayerMatchReceivingStat`

Gemeinsame Felder:
- `targets`
- `receptions`
- `yards`
- `touchdowns`
- `drops`
- `longestReception`
- `yardsAfterCatch`

### Blocking

- `PlayerCareerBlockingStat`
- `PlayerSeasonBlockingStat`
- `PlayerMatchBlockingStat`

Gemeinsame Felder:
- `passBlockSnaps`
- `runBlockSnaps`
- `sacksAllowed`
- `pressuresAllowed`
- `pancakes`

### Defensive

- `PlayerCareerDefensiveStat`
- `PlayerSeasonDefensiveStat`
- `PlayerMatchDefensiveStat`

Gemeinsame Felder:
- `tackles`
- `assistedTackles`
- `tacklesForLoss`
- `sacks`
- `quarterbackHits`
- `passesDefended`
- `interceptions`
- `forcedFumbles`
- `fumbleRecoveries`
- `defensiveTouchdowns`

Hinweis:
- `sacks` ist als `Decimal(5,1)` modelliert.

### Kicking

- `PlayerCareerKickingStat`
- `PlayerSeasonKickingStat`
- `PlayerMatchKickingStat`

Gemeinsame Felder:
- `fieldGoalsMade`
- `fieldGoalsAttempted`
- Distanzsplits fuer `Short`, `Mid`, `Long`
- `extraPointsMade`
- `extraPointsAttempted`
- `longestFieldGoal`
- `kickoffTouchbacks`

### Punting

- `PlayerCareerPuntingStat`
- `PlayerSeasonPuntingStat`
- `PlayerMatchPuntingStat`

Gemeinsame Felder:
- `punts`
- `puntYards`
- `netPuntYards`
- `fairCatchesForced`
- `hangTimeTotalTenths`
- `puntsInside20`
- `touchbacks`
- `longestPunt`

### Return

- `PlayerCareerReturnStat`
- `PlayerSeasonReturnStat`
- `PlayerMatchReturnStat`

Gemeinsame Felder:
- `kickReturns`
- `kickReturnYards`
- `kickReturnTouchdowns`
- `puntReturns`
- `puntReturnYards`
- `puntReturnTouchdowns`

## 8. Aktuell nicht als eigene Modelle vorhanden

Diese Themen sind im aktuellen Prisma-Schema noch nicht als eigene Tabellen vorhanden:

- `MatchEvent`
- `Transfer` als separates Fachmodell
- `TrainingSession`
- eigenstaendiges Dead-Cap-/Ledger-System ueber `TeamFinanceEvent` hinaus
- `TeamCareerStat`

## Weiterfuehrende Dokumente

- [relations.md](./relations.md)
- [player-model.md](./player-model.md)
- [statistics.md](./statistics.md)
- [state-boundaries.md](./state-boundaries.md)
