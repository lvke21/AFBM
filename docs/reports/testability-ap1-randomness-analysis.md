# Testability AP1: Randomness Analysis

Status: Gelb

## Executive Summary

Die produktive Match-Simulation verwendet keinen direkten `Math.random`-Aufruf. Der zentrale Match-Flow laeuft ueber eigene Seed-RNGs auf Basis von `simulationSeed` und ist damit grundsaetzlich reproduzierbar. Es gibt aber mehrere Stellen, die fuer QA und Regressionstests relevant bleiben:

- Kritisch: Match-Ergebnisse, Injuries, Game-Day-Availability, Overtime-Tiebreaker, Play-Auswahl und Play-Resolution haengen von Seed-RNGs ab.
- Kritisch: Einige Default-Seeds sind zu grob, falls Call-Sites keinen expliziten Seed uebergeben.
- Kritisch/Gelb: Sortierungen in Depth Chart, Match-Reihenfolge und Rankings haben teilweise keine vollstaendigen Tie-Breaker.
- Unkritisch bis mittel: `Math.random` wird fuer Online-/Admin-IDs und Fallback-Namen genutzt, nicht fuer Core-Match-Ergebnisse.
- Mittel: Zeitquellen beeinflussen Locks, Timestamps und teilweise neue Savegame-Welten.

Der aktuelle Zustand ist nicht Rot, weil der Kern deterministische Seed-RNGs besitzt. Er ist aber Gelb, weil reproduzierbare End-to-End-Fingerprints noch von impliziten Seeds, Datenbankreihenfolgen und Zeit-/Persistenznebenwirkungen abhaengen koennen.

## Methodik

Gesucht wurde nach:

- `Math.random`
- `random()`, `random?:`, `random: () => number`
- `createSeededRandom`, `create*Random`, `seed`, `simulationSeed`
- `Date.now`, `new Date`
- `sort(`
- Draft-, Player-Generation-, Injury-, Progression-, Play- und Match-Simulation-Dateien

Nicht als produktive Risikoquelle gewertet:

- reine Test-Fixtures
- QA-Report-Skripte unter `scripts/simulations`, sofern sie nur Analyse- oder Reportdaten erzeugen
- E2E-Zeitmessungen und Report-Generierungszeiten

## Seed- und RNG-Infrastruktur

| Fundstelle | Quelle | Klassifizierung | Bewertung |
| --- | --- | --- | --- |
| `src/modules/seasons/application/simulation/simulation-random.ts:1` | FNV-artiger Hash + `mulberry32` | Kritisch, kontrolliert | Zentraler RNG fuer Match-Simulation, Availability und Injuries. Deterministisch fuer gleichen Seed. |
| `src/modules/seasons/application/simulation/simulation-random.ts:24` | `deriveSimulationSeed(seed, scope)` | Kritisch, kontrolliert | Saubere Scope-Ableitung, verhindert viele Kollisionen zwischen Subsystemen. |
| `src/modules/seasons/infrastructure/simulation/match-context.ts:240` | `match.simulationSeed ?? deriveSimulationSeed(...)` | Kritisch | Wenn `simulationSeed` nicht persistiert ist, wird aus Savegame/Season/Match/Week und `scheduledAt` abgeleitet. Reproduzierbar, solange diese Felder stabil bleiben. |

## Match-Simulation

| Fundstelle | Zufallsquelle | Beeinflusst Ergebnis? | Risiko |
| --- | --- | --- | --- |
| `src/modules/seasons/application/simulation/match-engine.ts:326` | `randomInt(...)` | Ja | Basisfunktion fuer Drive-Varianz, Field Position, Tiebreaker, Distanzen. Seed-kontrolliert. |
| `src/modules/seasons/application/simulation/match-engine.ts:330` | Coaching Risk Profile Roll | Ja | Beeinflusst 4th-Down-, FG-/Punt- und Aggressivitaetsentscheidungen. |
| `src/modules/seasons/application/simulation/match-engine.ts:399` | Drive Start Field Position | Ja | Beeinflusst Feldposition und Scoring-Wahrscheinlichkeit. |
| `src/modules/seasons/application/simulation/match-engine.ts:1388` | `weightedPick(...)` | Ja | Waehlt Runner, Receiver, Tackler, Ballhawk und weitere Stat-Zuordnungen. |
| `src/modules/seasons/application/simulation/match-engine.ts:2121` | `chooseRunner(...)` | Ja | Beeinflusst Player-Lines und teilweise Resultatverteilung. |
| `src/modules/seasons/application/simulation/match-engine.ts:2140` | `chooseReceiver(...)` | Ja | Beeinflusst Receiving-Stats und Touchdown-Zuordnung. |
| `src/modules/seasons/application/simulation/match-engine.ts:2157` | `chooseTackler(...)` | Ja | Beeinflusst Defense-Stats. |
| `src/modules/seasons/application/simulation/match-engine.ts:2167` | `chooseBallHawk(...)` | Ja | Beeinflusst Interception-/Coverage-Stats. |
| `src/modules/seasons/application/simulation/match-engine.ts:2996` | Overtime-Tiebreaker mit Random-Anteil | Ja | Kann Sieger bei Playoff-/OT-Gleichstand beeinflussen. |
| `src/modules/seasons/application/simulation/match-engine.ts:3049` | `simulateMatch(context, random = createSeededRandom(context.simulationSeed))` | Ja | Positiv: zentral seedbar. Risiko: jeder Call-Site-Wechsel im RNG-Verbrauch aendert Fingerprints. |
| `src/modules/seasons/application/simulation/match-engine.ts:3115` | initiale Possession | Ja | Beeinflusst Drive-Reihenfolge und Spielverlauf. |
| `src/modules/seasons/application/simulation/match-engine.ts:5212` | `generateMatchStats(...)` Default-Seed | Ja | Positiv: reproduzierbar per `context.simulationSeed`. |

Zusammenfassung: Core Match Simulation ist kontrolliert zufaellig, aber sehr sensitiv gegen Aenderungen der Reihenfolge von `random()`-Aufrufen. Das erklaert, warum kleine Refactorings Fingerprints aendern koennen, obwohl kein echter Nicht-Determinismus im Sinn von `Math.random` vorhanden ist.

## Player Availability und Injuries

| Fundstelle | Zufallsquelle | Beeinflusst Ergebnis? | Risiko |
| --- | --- | --- | --- |
| `src/modules/seasons/application/simulation/depth-chart.ts:105` | Game-Day-Availability via `createSeededRandom(availability:teamId:playerId)` | Ja | Kritisch, aber kontrolliert. Entscheidet, ob QUESTIONABLE/DOUBTFUL-Spieler verfuegbar sind. |
| `src/modules/seasons/application/simulation/depth-chart.ts:152` | Positionslisten sortiert mit `compareDepth` | Ja | Risiko bei gleichen `depthChartSlot` + gleichem `positionOverall`, weil kein ID-Tie-Breaker existiert. |
| `src/modules/seasons/application/simulation/depth-chart.ts:211` | Returner-Auswahl sortiert nach Return Ability und Depth | Ja | Risiko bei Gleichstand ohne finalen stabilen Tie-Breaker. |
| `src/modules/seasons/application/simulation/depth-chart.ts:257` | OL/DL/LB/Safety-Pools ueber sortierte Pools | Ja | Gleichstandsreihenfolge kann Starter/Participants veraendern. |
| `src/modules/seasons/application/simulation/player-condition.ts:84` | Injury-RNG per `condition:player.id` | Ja | Kritisch, aber kontrolliert. |
| `src/modules/players/domain/player-injury.ts:132` | Injury Occurrence Roll | Ja | Entscheidet, ob ein Spieler verletzt wird. |
| `src/modules/players/domain/player-injury.ts:136` | Severity Roll | Ja | Entscheidet QUESTIONABLE/DOUBTFUL/OUT/IR und Ausfalldauer. |

Schwer reproduzierbar wird dieser Bereich, wenn die zugrunde liegende Roster-Reihenfolge aus der Datenbank nicht stabil ist oder mehrere Spieler identische Depth-/Overall-Werte haben.

## Gameplay Engine / Play-Level Simulation

Diese Module sind nicht direkt der aktuelle `match-engine.ts`-Week-Simulationspfad, aber sie bilden die detaillierte Game-Engine und sind fuer Play-/Live-/zukuenftige Simulationspfade kritisch.

| Fundstelle | Zufallsquelle | Beeinflusst Ergebnis? | Risiko |
| --- | --- | --- | --- |
| `src/modules/gameplay/application/play-selection-engine.ts:41` | eigener Seed-RNG | Ja | Kontrolliert, aber separater RNG-Code statt zentralem Simulation-RNG. |
| `src/modules/gameplay/application/play-selection-engine.ts:1285` | `sampleCandidate(...)` | Ja | Waehlt Offense-/Defense-Play aus gewichteten Kandidaten. |
| `src/modules/gameplay/application/play-selection-engine.ts:2528` | Sortierung nach `selectionProbability` | Ja | Bei gleichen Wahrscheinlichkeiten kein finaler stabiler Tie-Breaker. |
| `src/modules/gameplay/application/play-selection-engine.ts:2601` | Default `selectionSeed` aus Playbook/Situation | Ja | Risiko: Default-Seed enthaelt keinen Play-Index/Drive-Index; identische Situationen koennen identische Calls erzeugen. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:162` | eigener Resolution-RNG | Ja | Kontrolliert, aber separater RNG-Code. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:1010` | RPO Pass/Run Branch | Ja | Ergebnisrelevant. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:1491` | Explosive Pass, Air Yards, YAC, Fumble | Ja | Ergebnis- und Stat-relevant. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:1578` | Pressure/Hurry/Hit/Sack/Strip-Sack | Ja | Ergebnisrelevant. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:1680` | Interception Roll | Ja | Ergebnisrelevant. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:1723` | Completion Roll | Ja | Ergebnisrelevant. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:1774` | Run Stuffed/Explosive/Fumble | Ja | Ergebnisrelevant. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:2634` | Distribution Default Seed | Mittel | Distribution kann bei RPO per RNG-Pfad deterministisch, aber nicht rein analytisch sein. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:2672` | Resolve Default Seed | Ja | Risiko: Default-Seed enthaelt keine Play-Sequence, falls Call-Site keinen `resolutionSeed` setzt. |
| `src/modules/gameplay/application/receiver-matchup-resolution.ts:317` | Default Matchup Seed `"receiver-matchup"` | Ja | Kritisch fuer direkte Nutzung ohne expliziten Seed: alle Aufrufe koennen gleiche Roll-Sequenz nutzen. |
| `src/modules/gameplay/application/receiver-matchup-resolution.ts:459` | Catch/Drop/Breakup/Interception Roll | Ja | Ergebnisrelevant. |
| `src/modules/gameplay/application/qb-decision-time-resolution.ts:225` | Default Decision Seed `${playId}:qb-decision` | Ja | Risiko: ohne Kontext-/Play-Index kann identische Play-ID immer gleich ausfallen. |

## Minimal Drive Simulation / Offline Week Flow

| Fundstelle | Zufallsquelle | Beeinflusst Ergebnis? | Risiko |
| --- | --- | --- | --- |
| `src/modules/savegames/application/minimal-drive-simulation.ts:69` | eigener Hash-RNG | Ja | Deterministisch, aber weiterer RNG-Dialekt neben `simulation-random.ts`. |
| `src/modules/savegames/application/minimal-drive-simulation.ts:98` | Game Profile Roll | Ja | Beeinflusst Scoring-/Punt-/Turnover-Profile. |
| `src/modules/savegames/application/minimal-drive-simulation.ts:150` | Drive Result Roll | Ja | Entscheidet TD/FG/Punt/Turnover. |
| `src/modules/savegames/application/minimal-drive-simulation.ts:237` | Seed aus `matchId`, `week`, Team-Overall | Ja | Reproduzierbar, aber nicht an globale `simulationSeed`-Strategie gekoppelt. |
| `src/modules/savegames/application/minimal-drive-simulation.ts:246` | Initial Possession | Ja | Ergebnis- und Stat-relevant. |
| `src/modules/savegames/application/minimal-drive-simulation.ts:310` | Gleichstands-Tiebreaker | Ja | Ergebnisrelevant bei gleichem Score. |
| `src/modules/savegames/application/week-flow.service.ts:784` | `new Date()` als Persistenzzeit bei Start | Nein fuer RNG, mittel fuer Repro | Zeit beeinflusst Persistenz-/Readmodel-Daten, nicht den Minimal-Drive-Seed. |
| `src/modules/savegames/application/week-flow.service.ts:832` | `new Date()` bei Finish-Fallback | Nein fuer RNG, mittel fuer Repro | Kann Persistenzzeit unterscheiden. |

## Draft und Player Generation

| Fundstelle | Quelle | Beeinflusst Ergebnis? | Risiko |
| --- | --- | --- | --- |
| `src/modules/savegames/application/bootstrap/initial-roster.ts:1021` | `pickFromSeed(...)` | Ja fuer Weltgenerierung | Deterministische Pseudo-Varianz ueber Modulo-Seed. |
| `src/modules/savegames/application/bootstrap/initial-roster.ts:1167` | Birth Date aus Seed | Ja fuer Spielerprofil | Stabil, solange `seasonYear` stabil ist. |
| `src/modules/savegames/application/bootstrap/initial-roster.ts:1173` | Attribute Variance per Seed-Modulo | Ja fuer Ratings | Stabil, aber kein zentraler RNG. |
| `src/modules/savegames/application/bootstrap/initial-roster.ts:1178` | `buildInitialRoster(teamIndex, prestige, seasonYear)` | Ja fuer Roster | Voll deterministisch fuer gleiche Inputs. |
| `src/modules/savegames/application/savegame-command.service.ts:102` | `new Date().getUTCFullYear()` | Ja fuer neue Savegame-Welt | Kritisch fuer langfristige Reproduzierbarkeit: derselbe Create-Flow erzeugt in einem anderen Kalenderjahr andere SeasonYears/BirthDates/Schedules. |
| `src/modules/draft/application/draft-query.service.ts` | Prisma `orderBy` fuer Prospects | Nein fuer Draft-RNG | Keine Zufallsgenerierung gefunden. Reihenfolge hat mehrere Kriterien, aber keinen finalen ID-Tie-Breaker. |
| `src/modules/draft/application/draft-pick.service.ts` | `draftedCount + 1` | Ja fuer Pick Number | Nicht zufaellig, aber race-condition-anfaellig bei parallelen Picks ohne eindeutigen Draft-Order-Lock. |

Aktueller Befund: Es gibt keine produktive Draft-Prospect-Generation mit `Math.random`. Draftdaten scheinen Fixture-/Seed-getrieben oder bereits persistiert zu sein.

## Progression

| Fundstelle | Quelle | Beeinflusst Ergebnis? | Risiko |
| --- | --- | --- | --- |
| `src/modules/players/domain/player-progression.ts` | XP, Targets und Regression deterministisch | Ja fuer Spielerentwicklung | Keine Zufallsquelle gefunden. Progression ist regelbasiert. |
| `src/modules/seasons/infrastructure/simulation/player-development.ts` | Game-/Weekly-Development Plans | Ja fuer Spielerentwicklung | Deterministisch aus Player, Line und Attributes. |
| `src/modules/savegames/application/weekly-player-development.service.ts` | DB-Reihenfolge der RosterProfiles ohne sichtbares `orderBy` | Mittel | Ergebnis je Spieler bleibt deterministisch, aber History-Event-Reihenfolge und Verarbeitung koennen schwerer vergleichbar sein. |

## Online / Multiplayer / Admin Zufallsquellen

| Fundstelle | Zufallsquelle | Klassifizierung | Bewertung |
| --- | --- | --- | --- |
| `src/lib/online/online-user-service.ts:17` | `crypto.randomUUID()` fuer lokale Online User ID | Unkritisch fuer Simulation | Erwartet zufaellig. Beeinflusst Membership-Identity, nicht Game-Ergebnis. |
| `src/lib/online/online-user-service.ts:23` | `Math.random` UUID-Fallback | Mittel | Nur Fallback, aber nicht seedbar. Fuer Testbarkeit besser kapseln. |
| `src/lib/online/online-user-service.ts:30` | `Math.random` Username-Suffix | Unkritisch/kosmetisch | Nur Anzeige-/Default-Name. |
| `src/lib/admin/online-admin-actions.ts:105` | `Math.random` League-ID-Suffix | Mittel | Beeinflusst Liga-ID und damit Datenpfade; nicht Game-Ergebnis, aber E2E-Repro erschwert. |
| `src/lib/online/online-league-service.ts:3303` | `new Date` + UUID/Math.random fuer Log ID | Unkritisch | Log-/Event-ID, nicht Game-Ergebnis. |
| `src/lib/online/online-league-service.ts:3314` | `new Date` + UUID/Math.random fuer Event ID | Unkritisch | Event-ID. |
| `src/lib/online/online-league-service.ts:5488` | `new Date` + UUID/Math.random fuer Trade ID | Mittel | Beeinflusst Entity-ID, kann Tests erschweren. |
| `src/lib/online/online-league-service.ts:6054` | `createOnlineLocalId(...)` UUID/Math.random | Mittel | Allgemeiner ID-Generator fuer lokale Online-Entities. |

## Zeitabhaengige Logik

| Fundstelle | Quelle | Klassifizierung | Risiko |
| --- | --- | --- | --- |
| `src/modules/seasons/application/season-simulation.service.ts:139` | `Date.now()` fuer stale lock cutoff | Mittel | Kein Ergebnis-RNG, aber kann steuern, ob alte `IN_PROGRESS`-Matches wieder freigegeben werden. |
| `src/modules/seasons/application/season-simulation.service.ts:240` | `new Date()` Simulation Start Time | Unkritisch fuer Ergebnis | Persistenzzeit, nicht Seed. |
| `src/modules/seasons/application/season-simulation.service.ts:281` | Fallback `new Date()` fuer Transition Base Date | Mittel | Nur Fallback, aber Playoff-Datierung kann zeitabhaengig werden, wenn Matchdaten fehlen. |
| `src/modules/seasons/application/season-simulation.service.ts:284` | `new Date()` Transition Time | Mittel | Persistierte Season Transition, nicht Match-RNG. |
| `src/modules/savegames/application/savegame-command.service.ts:102` | aktuelles UTC-Jahr | Kritisch fuer Repro neuer Welten | Veraendert neue Savegame-Saison je Kalenderjahr. |
| `src/lib/online/online-league-service.ts` viele `new Date().toISOString()` | Mittel | Online-Aktionen und Logs bekommen reale Zeitstempel; meistens nicht Ergebnis-relevant, aber Snapshot-/E2E-Vergleiche muessen normalisieren. |

## Sortierungen ohne stabile Endkriterien

| Fundstelle | Risiko | Beeinflusst Ergebnis? | Bewertung |
| --- | --- | --- | --- |
| `src/modules/seasons/application/simulation/depth-chart.ts:48` | `compareDepth` endet bei `positionOverall` und gibt bei Gleichstand `0` zurueck | Ja | Kritisch, weil Starter/Participants und damit Ergebnis/Stats betroffen sein koennen. |
| `src/modules/seasons/infrastructure/simulation/season-simulation.repository.ts:120` | Match-Reihenfolge nur `scheduledAt asc` | Mittel | Ergebnisse pro Match sind seedbasiert; Orchestrator-Reihenfolge und Transition-Basis koennen bei gleichen Zeiten schwanken. |
| `src/modules/seasons/infrastructure/simulation/season-simulation.command-repository.ts:135` | Playoff-Standings ohne Team-ID-Tie-Breaker | Ja | Kritisch fuer Playoff-Seeding bei komplett gleichen Standing-Werten. |
| `src/modules/gameplay/application/play-selection-engine.ts:2528` | Sortierung nur nach Wahrscheinlichkeit | Ja | Bei Gleichstand haengt Auswahl-/Trace-Reihenfolge von Eingabereihenfolge ab. |
| `src/modules/gameplay/application/receiver-matchup-resolution.ts:270` | Target-Auswahl nach Score ohne stabilen Tie-Breaker | Ja | Kann Zielauswahl beeinflussen. |
| `src/modules/gameplay/application/outcome-resolution-engine.ts:1482` | Distribution-Sort nach Wahrscheinlichkeit | Nein bis mittel | Primaer Reporting/Distribution; bei nachgelagerter Auswahl aus sortierter Liste potentiell relevant. |
| `src/modules/teams/application/team-needs.service.ts:84` | Needs nach Score ohne ID-/Position-Tie-Breaker | Unkritisch bis mittel | UI/Empfehlungen, Draft-Need-Relevanz. |
| `src/modules/teams/application/free-agent-market.service.ts:19` | Free-Agent-Ranking mit mehreren Kriterien, ohne finalen ID-Tie-Breaker | Mittel | Empfehlungen/Listen koennen bei Gleichstand schwanken. |
| `src/modules/gameplay/application/game-stats-reporting.ts` | Top Performer nach Punkten/Yards/Value ohne eindeutigen Tie-Breaker | Unkritisch | Reporting/Kosmetik, nicht Spielausgang. |

## Versteckte Side Effects

1. Persistierte `simulationSeed`
   - `match-context.ts` nutzt vorhandenes `match.simulationSeed`, sonst Ableitung aus Matchdaten.
   - `season-simulation.command-repository.ts` persistiert den Seed beim Start.
   - Risiko: Wenn ein fehlgeschlagener/stale Run Seed-Felder loescht und Matchdaten zwischenzeitlich geaendert wurden, kann ein neuer Seed entstehen.

2. Vorbereitungsphase vor Simulation
   - `season-simulation.service.ts` ruft Weekly Preparation, Recovery und Stat Anchors vor der Simulation aus.
   - Diese Schritte koennen den Input-Context aendern. Sie sind regelbasiert, aber DB-Zustand und Zeit-Cutoffs muessen fuer Repro stabil sein.

3. Datenbankreihenfolge
   - RosterProfiles und verschachtelte Relationen werden teils ohne explizites `orderBy` geladen.
   - Viele anschliessende Sortierungen stabilisieren die Listen, aber nicht immer mit finalem Tie-Breaker.

4. RNG-Verbrauchsreihenfolge
   - Die Match-Engine ist deterministisch, aber nicht robust gegen Refactorings, die die Anzahl/Reihenfolge von `random()`-Calls veraendern.
   - Genau das ist typisch fuer Fingerprint-Abweichungen nach scheinbar verhaltensneutralen Aenderungen.

## Priorisierung fuer Seed-Integration

### P0 - Ergebnisrelevante Reproduzierbarkeit

1. Zentrale RNG-Abstraktion fuer alle Simulationspfade vereinheitlichen.
   - `simulation-random.ts`
   - `minimal-drive-simulation.ts`
   - `gameplay/application/*`

2. Explizite Seed-Scopes fuer jede Ergebnisentscheidung dokumentieren und stabilisieren.
   - Match
   - Drive
   - Play
   - Player condition
   - Injury
   - Overtime
   - Target/Runner/Defender selection

3. Default-Seeds in Gameplay Engine verschaerfen.
   - Play-/Drive-/Sequence-ID muss in `selectionSeed`, `resolutionSeed`, `decisionSeed`, `pressSeed`, `matchupSeed`.
   - Keine generischen Defaults wie `"receiver-matchup"` fuer produktive Nutzung.

4. Stable Tie-Breaker ergaenzen.
   - Depth Chart: final `player.id`.
   - Playoff standings: final `team.id`.
   - Match order: `scheduledAt`, dann `id`.

### P1 - Testbarkeit und Replay

1. Simulation Run Manifest persistieren:
   - `simulationSeed`
   - Engine-Version oder Rules-Version
   - RNG-Scopes
   - Input-Fingerprint
   - Output-Fingerprint

2. Replay-Test ergaenzen:
   - gleicher Match-Context + gleicher Seed => byte-stabiler Output.
   - gleicher Week-Context + gleicher DB-Snapshot => gleiche Ergebnisse und gleiche Standings.

3. Zeitquellen injizieren.
   - `now()` fuer Season Simulation, Online Actions, Savegame Creation.
   - Tests koennen feste Clock setzen.

### P2 - Kosmetik und Entity IDs

1. `Math.random`-Fallbacks kapseln oder durch `crypto.randomUUID`-Pflicht/ID-Service ersetzen.
2. Online-/Admin-IDs in Tests injizierbar machen.
3. Reporting-Sortierungen mit finalem Tie-Breaker versehen.

## Vollstaendige Zufallsquellen Nach Kategorie

### Kritisch

- Match Engine Seed-RNG: `match-engine.ts`
- Game-Day Availability: `depth-chart.ts`
- Injury Occurrence/Severity: `player-condition.ts`, `player-injury.ts`
- Minimal Drive Simulation: `minimal-drive-simulation.ts`
- Gameplay Play Selection: `play-selection-engine.ts`
- Gameplay Outcome Resolution: `outcome-resolution-engine.ts`
- Receiver Matchup/QB Decision/Press Coverage: `receiver-matchup-resolution.ts`, `qb-decision-time-resolution.ts`, `press-coverage-resolution.ts`
- Savegame Creation Year: `savegame-command.service.ts`
- Playoff standings without final tie-breaker: `season-simulation.command-repository.ts`

### Mittel

- Online/Admin Entity IDs via random UUID/Math.random fallback.
- Season-simulation timestamps and stale-lock cutoff.
- Match order only by `scheduledAt`.
- Roster/DB order where later sort does not fully tie-break.
- Draft pick numbering under concurrent picks.

### Unkritisch / Kosmetisch

- Default online username suffix.
- Log/Event IDs.
- Report generation timestamps.
- UI ranking/reporting sorts where the data is only displayed and does not feed back into simulation.

## Fazit

Die Simulation ist nicht von unkontrolliertem `Math.random` im Core-Match-Flow abhaengig. Das ist gut. Die groessten Repro-Risiken liegen stattdessen in drei Bereichen:

1. Seed-Verbrauchsreihenfolge innerhalb grosser Engine-Funktionen.
2. Default-Seeds und fehlende Scope-Information in detaillierten Gameplay-Modulen.
3. Sortierungen/DB-Reihenfolgen ohne vollstaendige Tie-Breaker.

Empfohlener naechster Schritt: P0-Seed-Integration und stabile Tie-Breaker, bevor Fingerprints als harte Release-Gates interpretiert oder neu baselined werden.

Status: Gelb
