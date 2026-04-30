# Datenabgrenzung: Referenzdaten, Savegames und Laufzeitzustand

## Zweck

Dieses Dokument beschreibt, welche Datenklassen im Projekt existieren und wie sie voneinander getrennt sind.

## Ueberblick

| Datenklasse | Beschreibung | Hauptquelle | Mutabilitaet |
|---|---|---|---|
| Auth-Daten | Benutzer, Sessions, Providerkonten | legacy session system + Prisma | laufzeitveraenderlich |
| Referenzdaten | Stammdaten fuer Liga, Franchises, Positionen, Attribute | Seed und `reference-data.ts` | kontrolliert ueber Seed |
| Savegame-Zustand | benutzergebundener Spielstand | Application Services | laufzeitveraenderlich |
| Kuftige Gameplay-Daten | Match-Events, Finanzen, Training usw. | teilweise ueber Season-Simulation angeschoben, sonst offen | offen |

## 1. Auth-Daten

Modelle:
- `User`
- `Account`
- `Session`
- `VerificationToken`

Sie gehoeren nicht zu einem Savegame und werden durch legacy session system verwaltet.

## 2. Referenzdaten

Modelle:
- `LeagueDefinition`
- `ConferenceDefinition`
- `DivisionDefinition`
- `FranchiseTemplate`
- `PositionGroupDefinition`
- `PositionDefinition`
- `ArchetypeDefinition`
- `SchemeFitDefinition`
- `AttributeDefinition`

### Eigenschaften

- werden ueber `prisma/seed.ts` eingespielt
- werden zur Laufzeit gelesen
- werden beim normalen Savegame-Spielablauf nicht veraendert

## 3. Savegame-Zustand

Modelle:
- `SaveGame`
- `SaveGameSetting`
- `Season`
- `Team`
- `Player`
- `PlayerRosterProfile`
- `PlayerEvaluation`
- `PlayerAttributeRating`
- `Contract`
- `Match`
- `TeamSeasonStat`
- `PlayerCareerStat`
- `PlayerSeasonStat`
- `PlayerMatchStat`
- `TeamMatchStat`
- `RosterTransaction`

### Eigenschaften

- sind immer benutzer- und savegamegebunden
- werden ueber `saveGameId` isoliert
- werden ueber Application Services erzeugt oder gelesen

## 4. Aktueller Lifecycle der Savegame-Daten

### Beim Savegame-Bootstrap erzeugt

- `SaveGame`
- `SaveGameSetting`
- `Season`
- `Team`
- `TeamSeasonStat`
- `Player`
- `PlayerRosterProfile`
- `PlayerEvaluation`
- `PlayerAttributeRating`
- `Contract`
- `RosterTransaction`
- `PlayerCareerStat` und Career-Statblocke
- `PlayerSeasonStat` und Season-Statblocke
- `Match`

### Im Schema vorhanden, aber aktuell noch ohne produktiven Writer

- `PlayerMatchStat` und Match-Statblocke
- `TeamMatchStat`

## 5. Referenzdaten versus Laufzeitdaten im Code

Die Trennung besteht nicht nur in der Datenbank, sondern auch im Code:

- Referenzdaten sind als TypeScript-Konstanten in `src/modules/shared/infrastructure/reference-data.ts` definiert.
- Dieselben Daten werden ueber den Seed in relationale Tabellen gespiegelt.
- Laufzeitdaten werden nicht aus Konstanten, sondern aus Application Services erzeugt.

## 6. Aktuelle Grenzfaelle

Es gibt derzeit einen bewusst dokumentierten Mischpunkt:

- Das Savegame-Formular verwendet `FRANCHISE_TEMPLATES` direkt aus `reference-data.ts`, statt die Optionen aus der Datenbank zu lesen.

Das ist aktuell funktional korrekt, bedeutet aber, dass Referenzdaten an einer Stelle sowohl als Code-Konstante als auch als DB-Zeilen sichtbar sind.

## 7. Savegame-Isolation

Ein Kernprinzip des Projekts ist die savegame-spezifische Isolation.

Beispiele:
- `Team` ist ueber `[id, saveGameId]` eindeutig
- `PlayerRosterProfile.player` referenziert `[playerId, saveGameId]`
- `Contract.team` referenziert `[teamId, saveGameId]`
- `Match.season` referenziert `[seasonId, saveGameId]`

Details:
- [relations.md](./relations.md)
- [../decisions/004-savegame-data-isolation.md](../decisions/004-savegame-data-isolation.md)

## 8. Was aktuell nicht sauber als eigener Datenbereich existiert

Noch nicht als eigener modellierter Bereich vorhanden:

- Match-Events
- Finanzbuchungen
- Trainingshistorie
- Verletzungshistorie
- Transferaggregate ueber einfache `RosterTransaction` hinaus

## Weiterfuehrende Dokumente

- [entities.md](./entities.md)
- [relations.md](./relations.md)
- [../data-flow.md](../data-flow.md)
