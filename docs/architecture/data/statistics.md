# Statistikstruktur

## Zweck

Dieses Dokument beschreibt die aktuelle Statistikstruktur des Projekts. Es trennt:

- Team-Stats
- Spieleraggregate
- strukturierte Statblock-Familien
- aktuellen Write- und Read-Status

## 1. Team-Statistiken

### TeamSeasonStat

**Modell:** `TeamSeasonStat`

Wichtige Felder:
- `gamesPlayed`
- `wins`
- `losses`
- `ties`
- `pointsFor`
- `pointsAgainst`
- `touchdownsFor`
- `touchdownsAgainst`
- `turnoversForced`
- `turnoversCommitted`
- `passingYards`
- `rushingYards`
- `sacks`
- `explosivePlays`
- `redZoneTrips`
- `redZoneTouchdowns`

Aktueller Writer:
- Savegame-Bootstrap legt pro Team und Startseason einen leeren Datensatz an.

Aktuelle Leser:
- `SeasonOverview`
- `SaveGameDetail` fuer aktuelle Team-Records
- Season-Standings inklusive TD- und Turnover-Differential in der Saisonansicht

### TeamMatchStat

**Modell:** `TeamMatchStat`

Wichtige Felder:
- `firstDowns`
- `totalYards`
- `turnovers`
- `penalties`
- `timeOfPossessionSeconds`
- `passingYards`
- `rushingYards`
- `sacks`
- `explosivePlays`
- `redZoneTrips`
- `redZoneTouchdowns`

Aktueller Writer:
- Season-Simulation

Aktueller Leser:
- Match-Detailansicht

## 2. Spieler-Aggregate

### PlayerCareerStat

Zweck:
- aggregierte Karrierewerte innerhalb eines Savegames

Basisfelder:
- `gamesPlayed`
- `gamesStarted`
- `snapsOffense`
- `snapsDefense`
- `snapsSpecialTeams`

Aktueller Writer:
- Savegame-Bootstrap initialisiert leeren Datensatz, Season-Simulation schreibt fort

Aktuelle Leser:
- `TeamPlayerSummary.seasonLine`
- Player-Detailansicht

### PlayerSeasonStat

Zweck:
- aggregierte Saisonwerte eines Spielers im Kontext von Season und Team

Basisfelder:
- `gamesPlayed`
- `gamesStarted`
- `snapsOffense`
- `snapsDefense`
- `snapsSpecialTeams`

Aktueller Writer:
- Savegame-Bootstrap initialisiert leeren Datensatz, Season-Simulation schreibt fort

Aktuelle Leser:
- Player-Detailansicht

Aktuelle Leser:
- `TeamPlayerSummary.seasonLine`

### PlayerMatchStat

Zweck:
- matchbezogene Spielerwerte

Basisfelder:
- `started`
- `snapsOffense`
- `snapsDefense`
- `snapsSpecialTeams`

Aktueller Writer:
- Season-Simulation

Aktueller Leser:
- Match-Detailansicht

## 3. Strukturierte Statblock-Familien

Jede Familie existiert in drei Tabellen:

- Career
- Season
- Match

## 4. Passing

Modelle:
- `PlayerCareerPassingStat`
- `PlayerSeasonPassingStat`
- `PlayerMatchPassingStat`

Felder:
- `attempts`
- `completions`
- `yards`
- `touchdowns`
- `interceptions`
- `sacksTaken`
- `sackYardsLost`
- `longestCompletion`

## 5. Rushing

Modelle:
- `PlayerCareerRushingStat`
- `PlayerSeasonRushingStat`
- `PlayerMatchRushingStat`

Felder:
- `attempts`
- `yards`
- `touchdowns`
- `fumbles`
- `longestRush`
- `brokenTackles`

## 6. Receiving

Modelle:
- `PlayerCareerReceivingStat`
- `PlayerSeasonReceivingStat`
- `PlayerMatchReceivingStat`

Felder:
- `targets`
- `receptions`
- `yards`
- `touchdowns`
- `drops`
- `longestReception`
- `yardsAfterCatch`

## 7. Blocking

Modelle:
- `PlayerCareerBlockingStat`
- `PlayerSeasonBlockingStat`
- `PlayerMatchBlockingStat`

Felder:
- `passBlockSnaps`
- `runBlockSnaps`
- `sacksAllowed`
- `pressuresAllowed`
- `pancakes`

## 8. Defensive

Modelle:
- `PlayerCareerDefensiveStat`
- `PlayerSeasonDefensiveStat`
- `PlayerMatchDefensiveStat`

Felder:
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
- `coverageSnaps`
- `targetsAllowed`
- `receptionsAllowed`
- `yardsAllowed`

Technische Besonderheit:
- `sacks` ist als `Decimal(5,1)` gespeichert.

## 9. Kicking

Modelle:
- `PlayerCareerKickingStat`
- `PlayerSeasonKickingStat`
- `PlayerMatchKickingStat`

Felder:
- `fieldGoalsMade`
- `fieldGoalsAttempted`
- `fieldGoalsMadeShort`
- `fieldGoalsAttemptedShort`
- `fieldGoalsMadeMid`
- `fieldGoalsAttemptedMid`
- `fieldGoalsMadeLong`
- `fieldGoalsAttemptedLong`
- `extraPointsMade`
- `extraPointsAttempted`
- `longestFieldGoal`
- `kickoffTouchbacks`

## 10. Punting

Modelle:
- `PlayerCareerPuntingStat`
- `PlayerSeasonPuntingStat`
- `PlayerMatchPuntingStat`

Felder:
- `punts`
- `puntYards`
- `netPuntYards`
- `fairCatchesForced`
- `hangTimeTotalTenths`
- `puntsInside20`
- `touchbacks`
- `longestPunt`

## 11. Return

Modelle:
- `PlayerCareerReturnStat`
- `PlayerSeasonReturnStat`
- `PlayerMatchReturnStat`

Felder:
- `kickReturns`
- `kickReturnYards`
- `kickReturnTouchdowns`
- `kickReturnFumbles`
- `puntReturns`
- `puntReturnYards`
- `puntReturnTouchdowns`
- `puntReturnFumbles`

## 12. Was aktuell wirklich geschrieben wird

### Beim Savegame-Bootstrap

- `TeamSeasonStat`
- `PlayerCareerStat`
- `PlayerSeasonStat`
- alle Career-Statblocke
- alle Season-Statblocke

### Aktuell im Laufzeitfluss beschrieben

- `TeamMatchStat`
- `PlayerMatchStat`
- alle Match-Statblocke
- Coverage-Rohdaten fuer Defender
- Coverage-Snaps fuer Defender
- Return-Fumbles fuer KR und PR
- Kicking-Splits nach Distanz
- Punt-Fair-Catches und kumulierte Hang Time

## 13. Was aktuell wirklich gelesen wird

### Saisonansicht

- Standings aus `TeamSeasonStat`
- Matchliste aus `Match`

### Teamansicht

Aus `PlayerSeasonStat` und Unterbloecken wird aktuell nur ein kleiner Saison-Ausschnitt gelesen:
- `gamesPlayed`
- `passing.yards`
- `rushing.yards`
- `receiving.yards`
- `defensive.tackles`
- `defensive.sacks`
- `defensive.targetsAllowed`
- `defensive.receptionsAllowed`
- `defensive.yardsAllowed`
- `kicking.fieldGoalsMade`
- `punting.punts`
- Return-Yards als Summe aus Kick- und Punt-Returns
- Return-Fumbles als Summe aus Kick- und Punt-Return-Fumbles

## 14. Grenzen des aktuellen Stands

- Team-Stats sind weiterhin weniger fein granular als Spieler-Stats.
- Es gibt noch keine Match-Event-Ebene oder Play-by-Play-Statistik.
- Coverage-Rohdaten liegen jetzt pro Spieler vor, aber noch nicht als Team-Coverage-Readmodell.

## 15. Neue fachliche Aussagekraft

- Coverage-Effizienz kann jetzt ueber `coverageSnaps` gegen Targets, Receptions und Yards eingeordnet werden.
- Kicker koennen jetzt ueber Distanzsplits statt nur ueber Gesamt-FGs bewertet werden.
- Punter erhalten mit Fair Catches und kumulierter Hang Time bessere Hidden-Yardage-Sichtbarkeit.

## Weiterfuehrende Dokumente

- [entities.md](./entities.md)
- [player-model.md](./player-model.md)
- [relations.md](./relations.md)
