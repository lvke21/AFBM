# Simulation Adapter Contract

Status: Analyse / Vertrag definiert

## Executive Summary

Die Multiplayer-Schicht darf keine Game-Engine-Domainlogik besitzen. Sie liefert nur einen validierten Simulationsauftrag mit Teams, Roster-Aggregaten und Schedule-Metadaten. Die Game Engine liefert nur deterministische Ergebnisse und Stats zurueck. Persistenz, Week Completion, Ready-State, Membership, Firestore und Admin-Gates bleiben ausserhalb der Engine.

Aktuell ist der produktive Multiplayer-Adapter `src/lib/online/online-game-simulation.ts`. Er ruft nicht die grosse Season-Engine `src/modules/seasons/application/simulation/match-engine.ts` direkt auf, sondern die schlanke Engine-Fassade `src/modules/gameplay/application/minimal-match-simulation.ts`.

## Aktuelle Dateien

| Datei | Rolle | Bewertung |
| --- | --- | --- |
| `src/lib/online/online-game-simulation.ts` | Multiplayer-zu-Engine-Adapter | Richtiger Ort fuer Mapping und Fallback-Warnings. |
| `src/modules/gameplay/application/minimal-match-simulation.ts` | Aktuell genutzte Match-Fassade | Reine Engine-Funktion ohne Multiplayer-Abhaengigkeiten. |
| `src/modules/seasons/application/simulation/match-engine.ts` | Vollere Season/Game-Engine | Reine Engine, aber nicht direkt vom Multiplayer-Adapter genutzt. |
| `src/lib/admin/online-week-simulation.ts` | Admin-Orchestrierung | Sollte nur validieren, sperren, Adapter aufrufen und Resultate persistieren. |
| `src/lib/online/online-league-service.ts` | Legacy/local Week Simulation | Nutzt denselben Online-Adapter fuer lokale Simulation. |
| `src/lib/online/online-league-week-simulation.ts` | Week Read-/Validation-Modelle | Liefert Schedule-/Ready-/Completion-Kontext, aber simuliert nicht selbst. |

## Boundary Rule

Multiplayer besitzt:

- League/Week-Zustand
- Membership/Team-Zuordnung
- Ready-/Lifecycle-Gates
- Schedule-Auswahl
- Roster-/Depth-Chart-Validierung
- Persistenz von `matchResults`, `completedWeeks`, Events und Audit

Game Engine besitzt:

- Score-Berechnung
- Spiel-/Drive-/Stat-Berechnung
- deterministische Randomness aus Seed
- Teamstaerke-Interpretation innerhalb eines Engine-Input-Modells
- Engine-Warnings/Notes, soweit sie reine Simulation betreffen

Verbotene Abhaengigkeiten innerhalb der Engine:

- `OnlineLeague`, `OnlineLeagueUser`, Membership, Mirror, Firestore
- Admin-/Rules-/Auth-Kontext
- React/Next/UI
- Persistenzschreibvorgaenge
- Week Completion oder Ready-State-Mutationen

## Input Vertrag

Der Adapter sollte genau ein kanonisches Input-Objekt an die Engine bauen:

```ts
type MultiplayerSimulationInput = {
  leagueId: string;
  season: number;
  week: number;
  gameId: string;
  seed: string;
  scheduledAt?: string;
  homeTeam: MultiplayerSimulationTeamInput;
  awayTeam: MultiplayerSimulationTeamInput;
};

type MultiplayerSimulationTeamInput = {
  teamId: string;
  displayName: string;
  abbreviation?: string;
  rating: number;
  roster: MultiplayerSimulationPlayerInput[];
  depthChart?: MultiplayerSimulationDepthChartEntry[];
};

type MultiplayerSimulationPlayerInput = {
  playerId: string;
  displayName: string;
  position: string;
  overall: number;
  attributes?: Record<string, number>;
  status: "active" | "injured" | "inactive" | string;
};
```

### Aktueller Ist-Input

`online-game-simulation.ts` nimmt derzeit:

- `OnlineGameSimulationGame`
  - `id`
  - `homeTeamId`
  - `awayTeamId`
  - optionale Teamnamen
  - `season`
  - `week`
- `OnlineLeague`
  - `teams`
  - `users`
  - `currentSeason`
  - Roster aus `user.contractRoster`
- Optionen
  - `simulatedAt`
  - `simulatedByUserId`

Der Adapter reduziert das Team aktuell auf:

```ts
type MinimalMatchTeam = {
  id?: string;
  name?: string;
  overall?: number;
  rating?: number;
};
```

Die aktuelle Rating-Ableitung ist der Durchschnitt aller aktiven `contractRoster`-Spieler mit finitem `overall`. Fehlt ein aktives Roster, nutzt der Adapter Rating `70` und schreibt eine `simulationWarnings`-Meldung.

## Output Vertrag

Die Engine sollte ein reines Ergebnis liefern:

```ts
type MultiplayerSimulationOutput = {
  gameId: string;
  matchId: string;
  season: number;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string;
  loserTeamId: string;
  homeStats: MultiplayerSimulationTeamStats;
  awayStats: MultiplayerSimulationTeamStats;
  playerStats?: MultiplayerSimulationPlayerStats[];
  driveLog?: MultiplayerSimulationDrive[];
  tiebreakerApplied: boolean;
  engineNotes: string[];
};

type MultiplayerSimulationTeamStats = {
  firstDowns: number;
  passingYards: number;
  rushingYards: number;
  totalYards: number;
  turnovers: number;
};
```

### Aktueller Ist-Output

`simulateOnlineGame` liefert `OnlineGameSimulationResult`, also `OnlineMatchResult` plus:

- `gameId`
- `loserTeamId`
- `loserTeamName`

Persistiert werden aktuell:

- `matchId`
- `season`, `week`
- Home/Away Team IDs und Namen
- Home/Away Scores
- `homeStats`, `awayStats`
- Gewinner/Verlierer
- `simulationWarnings`
- `tiebreakerApplied`
- `simulatedAt`, `simulatedByUserId`
- `status: "completed"`
- `createdAt`

## Fehlervertrag

Aktuelle strukturierte Fehler:

| Code | Bedeutung | Verhalten |
| --- | --- | --- |
| `invalid_game` | Fehlende Game-ID, fehlende Team-ID oder Self-Matchup | Simulation wird nicht gestartet. |
| `missing_home_team` | Home-Team nicht aus Liga ableitbar | Admin-/Week-Orchestrierung soll hard-failen. |
| `missing_away_team` | Away-Team nicht aus Liga ableitbar | Admin-/Week-Orchestrierung soll hard-failen. |

Fallbacks sind nur erlaubt, wenn sie im Output sichtbar sind. Der aktuelle Rating-Fallback `70` ist erlaubt, weil `simulationWarnings` gesetzt wird.

## Determinismus

Seed-Regel im aktuellen Adapter:

```text
online-game:{leagueId}:s{season}:w{week}:{gameId}
```

Damit ist dieselbe Liga/Saison/Woche/Game-ID deterministisch. Admin-User und `simulatedAt` duerfen den Spielausgang nicht beeinflussen.

## Offene Luecken

| Luecke | Risiko | Konkreter Schritt |
| --- | --- | --- |
| Der Multiplayer-Adapter nutzt nur Durchschnitts-Overall, keine Positions-/Depth-Chart-Qualitaet. | Mittel | `MultiplayerSimulationTeamInput` explizit einfuehren und Rating/Depth-Chart-Mapping testen. |
| Die grosse `match-engine.ts` hat einen reicheren Input (`SimulationMatchContext`), ist aber nicht mit Multiplayer verbunden. | Mittel | Separaten Adapter `online-to-season-engine-adapter` bauen, falls Multiplayer auf die grosse Engine wechseln soll. |
| Kein versioniertes Adapter-Schema im Code. | Mittel | `SimulationAdapterInputV1` / `SimulationAdapterOutputV1` als eigene Typen einfuehren. |
| Roster-Fallback 70 erlaubt Simulation ohne belastbaren Roster. | Mittel | Entscheiden: MVP-kompatible Warning behalten oder Ready-Gate als Hard-Fail erzwingen. |
| Output enthaelt keine Player-Lines oder Drive-Logs. | Niedrig bis Mittel | Erst erweitern, wenn UI/Stats-Persistenz diese Daten wirklich nutzt. |
| `OnlineMatchResult` ist gleichzeitig Persistenzmodell und Adapter-Output. | Mittel | Engine-Output und Persistenz-DTO trennen, Mapping im Adapter halten. |

## Zielbild

```text
Multiplayer State
  -> validates Ready/Schedule/Roster
  -> builds SimulationAdapterInputV1
  -> calls Engine Facade
  -> maps SimulationAdapterOutputV1 to OnlineMatchResult
  -> persists matchResults/completedWeeks/events

Game Engine
  -> receives only plain input
  -> returns only deterministic score/stats/notes
  -> never reads or writes Multiplayer state
```

## Go/No-Go Regel

Ein neuer Simulationspfad ist nur akzeptabel, wenn:

- der Adapter keine Firestore-/Repository-Schreiblogik enthaelt,
- die Engine keine `OnlineLeague`- oder Membership-Typen importiert,
- der Seed aus League/Season/Week/Game-ID deterministisch ist,
- fehlende Teams hard-failen,
- erlaubte Fallbacks im Output sichtbar dokumentiert sind,
- Resultate erst nach erfolgreicher kompletter Week-Simulation persistiert werden.
