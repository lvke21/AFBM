# Relationen

## Zweck

Dieses Dokument beschreibt die relationalen Muster des aktuellen Projekts. Es konzentriert sich auf:

- Kardinalitaeten
- Savegame-Skopierung
- zusammengesetzte Foreign Keys
- indirekte Kopplungen fuer Readmodelle

## Top-Level-Beziehungen

```text
User -> SaveGame -> Season -> Match
User -> SaveGame -> Team -> PlayerRosterProfile -> Player
Player -> PlayerEvaluation
Player -> PlayerAttributeRating -> AttributeDefinition
Player -> Contract -> Team
Player -> PlayerCareerStat / PlayerSeasonStat / PlayerMatchStat
```

## 1. Auth-Beziehungen

| Quelle | Beziehung | Ziel | Bedeutung |
|---|---|---|---|
| `User` | 1:n | `SaveGame` | ein Benutzer kann mehrere Savegames besitzen |
| `User` | 1:n | `Account` | ein Benutzer kann mehrere Providerkonten haben |
| `User` | 1:n | `Session` | ein Benutzer kann mehrere aktive Sessions haben |

## 2. Referenzdaten-Beziehungen

| Quelle | Beziehung | Ziel | Bedeutung |
|---|---|---|---|
| `LeagueDefinition` | 1:n | `ConferenceDefinition` | eine Liga hat mehrere Konferenzen |
| `ConferenceDefinition` | 1:n | `DivisionDefinition` | eine Konferenz hat mehrere Divisionen |
| `LeagueDefinition` | 1:n | `FranchiseTemplate` | eine Liga enthaelt mehrere Franchise-Templates |
| `PositionGroupDefinition` | 1:n | `PositionDefinition` | eine Positionsgruppe enthaelt mehrere Positionen |
| `PositionGroupDefinition` | 1:n | `ArchetypeDefinition` | Archetypen gehoeren zu einer Positionsgruppe |
| `PositionGroupDefinition` | 1:n | `SchemeFitDefinition` | Scheme Fits gehoeren zu einer Positionsgruppe |
| `SchemeFitDefinition` | 1:n | `Team` als Offense-/Defense-/ST-Scheme | Teams haben jetzt je eine Scheme-Identitaet pro Hauptbereich |
| `AttributeDefinition` | 1:n | `PlayerAttributeRating` | definierte Attribute koennen bei vielen Spielern vorkommen |

## 3. Savegame-Kernbeziehungen

| Quelle | Beziehung | Ziel | Bedeutung |
|---|---|---|---|
| `SaveGame` | 1:1 | `SaveGameSetting` | genau ein Regel- und Settings-Datensatz pro Savegame |
| `SaveGame` | 1:n | `Season` | ein Savegame kann mehrere Seasons haben |
| `SaveGame` | 1:n | `Team` | Teams sind savegame-spezifisch |
| `SaveGame` | 1:n | `Player` | Spieler sind savegame-spezifisch |
| `SaveGame` | 1:n | `Match` | Matches sind savegame-spezifisch |
| `SaveGame` | optional 1:1 | `Season` als `currentSeason` | aktueller Saisonzeiger im Savegame |

## 4. Team- und Spielerbeziehungen

| Quelle | Beziehung | Ziel | Bedeutung |
|---|---|---|---|
| `Team` | 1:n | `PlayerRosterProfile` | Teamkader ueber Roster-Profile |
| `Player` | optional 1:1 | `PlayerRosterProfile` | ein Spieler hat aktuell genau ein Roster-Profil |
| `Player` | optional 1:1 | `PlayerEvaluation` | ein Spieler hat genau eine Evaluation |
| `Player` | 1:n | `PlayerAttributeRating` | ein Spieler kann viele Attributwerte besitzen |
| `Player` | 1:n | `Contract` | ein Spieler kann mehrere Vertraege ueber die Zeit haben |
| `Player` | 1:n | `RosterTransaction` | ein Spieler kann mehrere Kaderereignisse haben |
| `Team` | 1:n | `TeamFinanceEvent` | Teams erhalten einen Finanzverlauf ueber Signings, Releases und Saisonfortschritt |

## 5. Saison- und Statistikbeziehungen

| Quelle | Beziehung | Ziel | Bedeutung |
|---|---|---|---|
| `Season` | 1:n | `Match` | Saison enthaelt Spiele |
| `Season` | 1:n | `TeamSeasonStat` | Team-Standings pro Saison |
| `Season` | 1:n | `PlayerSeasonStat` | Spieleraggregate pro Saison |
| `Match` | 1:n | `TeamMatchStat` | Teamaggregate pro Spiel |
| `Match` | 1:n | `PlayerMatchStat` | Spieleraggregate pro Spiel |
| `Player` | optional 1:1 | `PlayerCareerStat` | Karriereaggregat pro Spieler |
| `PlayerCareerStat` | 1:1 je Familie | Career-Statblocke | strukturierte Career-Werte |
| `PlayerSeasonStat` | 1:1 je Familie | Season-Statblocke | strukturierte Season-Werte |
| `PlayerMatchStat` | 1:1 je Familie | Match-Statblocke | strukturierte Match-Werte |

## Savegame-Skopierung

Ein Kernmuster des Schemas ist die savegame-gebundene Modellierung. Laufzeitrelevante Tabellen tragen `saveGameId`, und mehrere Relationen verweisen auf zusammengesetzte Schluessel.

### Beispiele

- `SaveGame.currentSeason` nutzt `[currentSeasonId, id] -> [id, saveGameId]`
- `PlayerRosterProfile.player` nutzt `[playerId, saveGameId] -> [id, saveGameId]`
- `PlayerRosterProfile.team` nutzt `[teamId, saveGameId] -> [id, saveGameId]`
- `Contract.team` nutzt `[teamId, saveGameId] -> [id, saveGameId]`
- `Contract.startSeason` nutzt `[startSeasonId, saveGameId] -> [id, saveGameId]`
- `Match.season` nutzt `[seasonId, saveGameId] -> [id, saveGameId]`
- `PlayerSeasonStat.team` nutzt `[teamId, saveGameId] -> [id, saveGameId]`

### Ziel

Dieses Muster reduziert savegame-uebergreifende Verknuepfungen im laufzeitrelevanten Zustand.

## Join-aehnliche Beziehungen mit Payload

### Player und Attribute

`PlayerAttributeRating` ist fachlich eine Verknuepfung zwischen:
- `Player`
- `AttributeDefinition`

zusaetzlich mit eigener Payload:
- `value`

Damit entsteht eine n:m-aehnliche Beziehung mit Bewertungswert.

## Wichtige indirekte oder lose Kopplungen

Diese Zusammenhaenge sind nicht als berechnete Relation im Schema hinterlegt, spielen aber fachlich eine Rolle:

- `Team.overallRating` ist gespeichert und nicht aus `PlayerEvaluation` abgeleitet.
- `PlayerEvaluation.positionOverall` wird im Bootstrap berechnet und gespeichert.
- `schemeFitDefinitionId` eines Spielers wird jetzt gegen Team-Schemes ausgewertet und beeinflusst Need- und Free-Agency-Reads.
- Die Franchise-Auswahl im Savegame-Formular stammt aktuell direkt aus `FRANCHISE_TEMPLATES` statt aus einem Datenbank-Read.
- `PositionGroupDefinition` modelliert aktuell nur `OFFENSE`, `DEFENSE` und `SPECIAL_TEAMS`; feinere fachliche Unterteilungen wie O-Line oder Secondary entstehen heute ueber Position-Codes, Archetypen und Attributkategorien.

## Relationen in den aktuellen Readmodellen

### SaveGameDetail

Kombiniert:
- `SaveGame`
- `SaveGameSetting`
- `Season`
- `Team`
- `TeamSeasonStat`

### TeamDetail

Kombiniert:
- `Team`
- `ConferenceDefinition`
- `DivisionDefinition`
- `PlayerRosterProfile`
- `Player`
- `PlayerEvaluation`
- `PlayerAttributeRating`
- `Contract`
- `PlayerSeasonStat`

### SeasonOverview

Kombiniert:
- `Season`
- `TeamSeasonStat`
- `Team`
- `Match`

## Weiterfuehrende Dokumente

- [entities.md](./entities.md)
- [player-model.md](./player-model.md)
- [state-boundaries.md](./state-boundaries.md)
