# Player-Modell

## Zweck

Dieses Dokument beschreibt die aktuelle Spielerstruktur des Projekts. Ein Spieler ist bewusst nicht als einzelnes Grossmodell mit allen Werten umgesetzt, sondern in mehrere fachliche Bereiche aufgeteilt.

## Ueberblick

```text
Player
  -> PlayerRosterProfile
  -> PlayerEvaluation
  -> PlayerAttributeRating -> AttributeDefinition
  -> Contract
  -> PlayerHistoryEvent
  -> PlayerCareerStat -> Career-Statblocke
  -> PlayerSeasonStat -> Season-Statblocke
  -> PlayerMatchStat -> Match-Statblocke
  -> RosterTransaction
```

## 1. Player: Identitaet und allgemeiner Zustand

**Modell:** `Player`

Dieses Modell enthaelt die Spieleridentitaet und den allgemeinen Gesundheits- und Verfuegbarkeitszustand.

### Wichtige Felder

| Feld | Typ | Bedeutung |
|---|---|---|
| `firstName` | `String` | Vorname |
| `lastName` | `String` | Nachname |
| `age` | `Int` | aktuelles Alter |
| `birthDate?` | `DateTime` | Geburtsdatum |
| `heightCm` | `Int` | Groesse in cm |
| `weightKg` | `Int` | Gewicht in kg |
| `yearsPro` | `Int` | Erfahrung in Profijahren |
| `college?` | `String` | College |
| `nationality?` | `String` | Nationalitaet |
| `dominantHand?` | `DominantHand` | dominante Hand |
| `status` | `PlayerStatus` | globaler Spielerstatus |
| `injuryStatus` | `InjuryStatus` | Verfuegbarkeitsgrad bei Verletzungen |
| `injuryName?` | `String` | optionale Verletzungsbezeichnung |
| `injuryEndsOn?` | `DateTime` | erwartetes Ende der Verletzung |
| `fatigue` | `Int` | Ermuedung |
| `morale` | `Int` | Moral |
| `developmentTrait` | `DevelopmentTrait` | Entwicklungstyp |

## 2. Statusachsen im Player-Bereich

Die aktuelle Struktur nutzt mehrere Statusachsen:

| Feld | Ebene | Zweck |
|---|---|---|
| `Player.status` | Player | globaler Lebenszyklus wie aktiv, verletzt, Free Agent, retired |
| `Player.injuryStatus` | Player | Verfuegbarkeitsgrad fuer Verletzungen |
| `PlayerRosterProfile.rosterStatus` | Roster | Rolle im Teamkontext wie Starter oder Practice Squad |

## 3. PlayerRosterProfile: Team, Position und Rolle

**Modell:** `PlayerRosterProfile`

Dieses Modell trennt Teamzuordnung, Positionsrolle und Roster-Status von der Spieleridentitaet.

### Wichtige Felder

| Feld | Typ | Bedeutung |
|---|---|---|
| `teamId?` | `String` | aktuelles Team innerhalb des Savegames |
| `primaryPositionDefinitionId` | `String` | Primarposition |
| `secondaryPositionDefinitionId?` | `String` | Sekundaerposition |
| `positionGroupDefinitionId` | `String` | Top-Level-Gruppe |
| `archetypeDefinitionId?` | `String` | Archetyp |
| `schemeFitDefinitionId?` | `String` | Scheme Fit |
| `rosterStatus` | `RosterStatus` | Starter, Rotation, Backup usw. |
| `depthChartSlot?` | `Int` | Slot im Depth Chart |
| `captainFlag` | `Boolean` | Captain-Markierung |
| `developmentFocus` | `Boolean` | markiert den Spieler fuer priorisierte Weekly-Entwicklung |
| `injuryRisk` | `Int` | abstrakter Verletzungsrisikowert |
| `practiceSquadEligible?` | `Boolean` | Eligibility fuer Practice Squad |

### Wichtige Praezisierung

- Die Teamzuordnung liegt nicht direkt auf `Player`.
- `PositionGroupDefinition` modelliert aktuell nur `OFFENSE`, `DEFENSE` und `SPECIAL_TEAMS`.
- Feinere Gruppen wie Running Backs oder Secondary werden heute ueber `PositionDefinition.code`, Archetypen und Attribute ausgedrueckt.
- `depthChartSlot`, `rosterStatus` und Sekundaerpositionen wirken inzwischen direkt auf die Matchsimulation.
- Fuer das managergesteuerte Team koennen `depthChartSlot`, `rosterStatus`, Captain-Flag, Development Focus sowie KR/PR-Rollen direkt in der Teamansicht bearbeitet werden.
- `RosterStatus.INJURED_RESERVE` wird jetzt aktiv fuer verletzte Spieler genutzt und entlastet die aktive Kadergroesse.
- Team-Schemes leben auf `Team` und machen `schemeFitDefinitionId` erstmals aktiv fuer Need-Bewertung und Free Agency.

## 4. Unterstuetzte Positionscodes

Aktuell im Seed vorhanden:

- `QB`
- `RB`
- `FB`
- `WR`
- `TE`
- `LT`
- `LG`
- `C`
- `RG`
- `RT`
- `LE`
- `RE`
- `DT`
- `LOLB`
- `MLB`
- `ROLB`
- `CB`
- `FS`
- `SS`
- `K`
- `P`
- `KR`
- `PR`
- `LS`

## 5. PlayerEvaluation: Overalls und Potential

**Modell:** `PlayerEvaluation`

Dieses Modell speichert die kompakten Bewertungszahlen eines Spielers.

### Felder

- `potentialRating`
- `positionOverall`
- `offensiveOverall?`
- `defensiveOverall?`
- `specialTeamsOverall?`
- `physicalOverall?`
- `mentalOverall?`

### Bedeutung

- `positionOverall` ist der wichtigste Gesamtwert fuer die jeweilige Rolle.
- `physicalOverall` und `mentalOverall` trennen Koerperprofil und Processing von der eigentlichen Positionsbewertung.
- Die Teil-Overalls sind optional und werden nur gesetzt, wenn sie fuer den Spieler sinnvoll sind.
- Positionsspezifische Detailratings wie Passing, Coverage, Return oder Snapping werden derzeit nicht persistiert, sondern aus den Rohattributen fuer Readmodelle abgeleitet.
- Dieselbe Bewertungslogik wird jetzt beim Savegame-Bootstrap, bei der Weekly-Entwicklung und nach Kaderbewegungen wiederverwendet, damit Player-Evaluation und Team-Overall konsistent bleiben.

## 5.1 PlayerHistoryEvent: Timeline pro Spieler

**Modell:** `PlayerHistoryEvent`

Dieses Modell protokolliert fachlich relevante Spielerereignisse, damit Entwicklung, Verletzungen und Kaderentscheidungen nachvollziehbar bleiben.

### Aktuell genutzte Eventtypen

- `DEVELOPMENT`
- `INJURY`
- `RECOVERY`
- `DEPTH_CHART`
- `SIGNING`
- `RELEASE`

### Aktuelle Nutzung im System

- Wochenweise Entwicklung erzeugt Historieneintraege mit Attribut- und OVR-Aenderungen.
- Verletzungen und medizinische Freigaben werden in der Historie abgelegt.
- Depth-Chart-Aenderungen, Signings und Releases erscheinen direkt in der Player-Detailansicht.
- Vertragsablauf ueber den Saisonwechsel wird ueber Roster- und Historienereignisse sichtbar gemacht.

## 6. PlayerAttributeRating: Einzelattribute

**Modelle:** `PlayerAttributeRating`, `AttributeDefinition`

Einzelattribute werden relational gespeichert. Der gespeicherte Code stammt aus `AttributeDefinition.code`, der konkrete Spielerwert aus `PlayerAttributeRating.value`.

### Allgemeine Attribute

| Code | Anzeigename |
|---|---|
| `SPEED` | Speed |
| `ACCELERATION` | Acceleration |
| `AGILITY` | Agility |
| `STRENGTH` | Strength |
| `AWARENESS` | Awareness |
| `TOUGHNESS` | Toughness |
| `DURABILITY` | Durability |
| `DISCIPLINE` | Discipline |
| `INTELLIGENCE` | Intelligence |
| `LEADERSHIP` | Leadership |

### Quarterback-Attribute

| Code | Anzeigename |
|---|---|
| `THROW_POWER` | Throw Power |
| `THROW_ACCURACY_SHORT` | Throw Accuracy Short |
| `THROW_ACCURACY_MEDIUM` | Throw Accuracy Medium |
| `THROW_ACCURACY_DEEP` | Throw Accuracy Deep |
| `POCKET_PRESENCE` | Pocket Presence |
| `DECISION_MAKING` | Decision Making |
| `PLAY_ACTION` | Play Action |
| `SCRAMBLING` | Scrambling |
| `MOBILITY` | Mobility |

### Ball-Carrier-Attribute

| Code | Anzeigename |
|---|---|
| `VISION` | Vision |
| `BALL_SECURITY` | Ball Security |
| `ELUSIVENESS` | Elusiveness |
| `BREAK_TACKLE` | Break Tackle |
| `PASS_PROTECTION` | Pass Protection |
| `SHORT_YARDAGE_POWER` | Short Yardage Power |

### Receiving-Attribute

| Code | Anzeigename |
|---|---|
| `CATCHING` | Catching |
| `HANDS` | Hands |
| `ROUTE_RUNNING` | Route Running |
| `RELEASE` | Release |
| `SEPARATION` | Separation |
| `CONTESTED_CATCH` | Contested Catch |
| `JUMPING` | Jumping |
| `RUN_AFTER_CATCH` | Run After Catch |
| `BLOCKING` | Blocking |

Wichtige Praezisierung:
- `ROUTE_RUNNING` ist technisch in `AttributeCategory.RECEIVING` definiert, wird im Bootstrap aber auch fuer Running Backs und Fullbacks verwendet.

### Offensive-Line-Attribute

| Code | Anzeigename |
|---|---|
| `PASS_BLOCK` | Pass Block |
| `RUN_BLOCK` | Run Block |
| `HAND_TECHNIQUE` | Hand Technique |
| `FOOTWORK` | Footwork |
| `ANCHOR` | Anchor |

### Front-Seven-Attribute

| Code | Anzeigename |
|---|---|
| `TACKLING` | Tackling |
| `PURSUIT` | Pursuit |
| `BLOCK_SHEDDING` | Block Shedding |
| `PASS_RUSH` | Pass Rush |
| `POWER_MOVES` | Power Moves |
| `FINESSE_MOVES` | Finesse Moves |
| `PLAY_RECOGNITION` | Play Recognition |
| `HIT_POWER` | Hit Power |

### Coverage-Attribute

| Code | Anzeigename |
|---|---|
| `MAN_COVERAGE` | Man Coverage |
| `ZONE_COVERAGE` | Zone Coverage |
| `PRESS` | Press |
| `BALL_SKILLS` | Ball Skills |
| `LB_MAN_COVERAGE` | Linebacker Man Coverage |
| `LB_ZONE_COVERAGE` | Linebacker Zone Coverage |
| `COVERAGE_RANGE` | Coverage Range |
| `LB_COVERAGE` | Linebacker Coverage |

### Kicking- und Punting-Attribute

| Code | Anzeigename |
|---|---|
| `KICK_POWER` | Kick Power |
| `KICK_ACCURACY` | Kick Accuracy |
| `PUNT_POWER` | Punt Power |
| `PUNT_ACCURACY` | Punt Accuracy |
| `KICKOFF_POWER` | Kickoff Power |
| `KICK_CONSISTENCY` | Kick Consistency |
| `PUNT_HANG_TIME` | Punt Hang Time |
| `RETURN_VISION` | Return Vision |
| `SNAP_ACCURACY` | Snap Accuracy |
| `SNAP_VELOCITY` | Snap Velocity |

## 7. Vertrag

**Modell:** `Contract`

Ein Vertrag wird getrennt vom Spielerstammsatz gespeichert.

### Wichtige Felder

- `playerId`
- `teamId`
- `startSeasonId?`
- `status`
- `years`
- `yearlySalary`
- `signingBonus`
- `capHit`
- `signedAt`
- `endedAt?`

## 8. Statistikbereich des Spielers

### Aggregatebenen

- `PlayerCareerStat`
- `PlayerSeasonStat`
- `PlayerMatchStat`

### Aktueller Write-Status

- Career- und Season-Shells werden beim Savegame-Bootstrap angelegt.
- Match-, Season- und Career-Werte werden waehrend der Saisonfortschritt-Simulation aktiv fortgeschrieben.
- Matchwerte entstehen pro simuliertem Spiel neu und werden danach nicht wiederverwendet.

- `PlayerCareerStat`
- `PlayerSeasonStat`
- `PlayerMatchStat`

### Basisfelder

- Einsaetze und Starts
- Snaps fuer Offense
- Snaps fuer Defense
- Snaps fuer Special Teams

### Strukturierte Unterbloecke

- Passing
- Rushing
- Receiving
- Blocking
- Defensive
- Kicking
- Punting
- Return

Details: [statistics.md](./statistics.md)

### Aktueller Laufzeitstatus

- `PlayerCareerStat` und `PlayerSeasonStat` werden beim Savegame-Bootstrap als leere Shells angelegt.
- `PlayerMatchStat` wird waehrend der Saisonfortschritt-Simulation pro Match neu angelegt und beschrieben.

## 9. Wie Spieler heute erzeugt werden

Aktuell entstehen Spieler nur ueber den Savegame-Bootstrap:

- `src/modules/savegames/application/bootstrap/initial-roster.ts`
- `src/modules/savegames/application/bootstrap/bootstrap-savegame-world.service.ts`

### Was dabei passiert

- pro Team werden 53 Spieler erzeugt
- Positionen, Archetypen und Scheme Fits werden zugeordnet
- Attributwerte und Overalls werden berechnet
- Vertraege werden angelegt
- leere Career- und Season-Statistiken werden erzeugt

## 10. Aktuelle Readmodelle fuer Spieler

Spielerdaten werden derzeit nicht ueber ein eigenes vollstaendiges Player-Detail-Readmodell ausgeliefert.

Stattdessen wird vor allem `TeamPlayerSummary` verwendet. Es enthaelt:

- Basisdaten
- Rollen- und Positionsdaten
- `positionOverall` und `potentialRating`
- einen kleinen Satz `keyAttributes`
- einen Vertragsausschnitt
- einen reduzierten `seasonLine`-Block

## Weiterfuehrende Dokumente

- [entities.md](./entities.md)
- [statistics.md](./statistics.md)
- [enums-and-read-models.md](./enums-and-read-models.md)
