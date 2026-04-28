# Zielarchitektur Playbook- und Play-Resolution-System

## Zweck

Dieses Dokument bereitet die naechste Ausbaustufe der Football-Simulation vor. Es beschreibt:

- den fachlichen Ist-Zustand der aktuellen Matchsimulation
- die benoetigte Zielarchitektur fuer ein realistisches Playbook- und Play-Resolution-System
- die Wiederverwendung vorhandener Bausteine
- den geplanten Datei- und Modulzuschnitt
- Risiken und die empfohlene Umsetzungsreihenfolge

Es ist bewusst ein Vorbereitungsdokument. Der aktuelle produktive Simulationspfad bleibt bis zu den Folgepaketen in `src/modules/seasons/application/simulation/*`.

## Leitplanken aus dem Projektbriefing

Die naechste Engine-Stufe folgt diesen Vorgaben:

- Pre-Snap-Legality-Check vor jeder taktischen Logik
- klare Trennung von Formation, Familie und Konzept
- Playbooks als gewichtete Policies statt starre Skripte
- probabilistische Outcome-Modelle statt lineare If-Else-Skripte
- situatives Playcalling nach Down, Distance, Feldposition, Clock und Score
- Validierung ueber Regeltests, Verteilungs- und Kalibrierungstests

## Kurze Ist-Analyse

### Produktiver Stand heute

- Die produktive Simulation ist ein vertikaler Seasons-Slice im Modul `seasons`.
- `season-simulation.service.ts` orchestriert Wochen-Simulation, Locking, Transition und Persistenz.
- `match-context.ts` baut den engine-faehigen Matchkontext aus Prisma-Daten.
- `depth-chart.ts` validiert spielfaehige Kader und waehlt Starter, Rotationen und Specialists.
- `match-engine.ts` erzeugt drive-basierte Matchresultate, Teamwerte, Player-Lines und Drive-Logs.
- `match-result-persistence.ts` schreibt Match-, Team-, Season- und Career-Stats sowie Verletzungs-/Entwicklungsfolgen.

### Starke vorhandene Bausteine

- deterministische Seeds fuer reproduzierbare Simulation
- vorhandenes Team-, Player-, Match- und Stat-Schema
- Team-Scheme-Felder und Player-Scheme-Fits
- Depth-Chart-Slots und Game-Day-Verfuegbarkeit
- Drive-Log-Persistenz fuer Match-Nachvollziehbarkeit
- State-Machine, Locking und vorbereitete Tests fuer Simulations-Write-Flows

### Fachliche Luecken gegen die Zielarchitektur

- kein separates Pre-Snap-Legality-Layer
- keine Playbook-Domain, keine offensive oder defensive Play-Library
- Formation, Personal, Konzept und Outcome sind heute in einer monolithischen Heuristik vermischt
- kein simultanes Offense-vs-Defense-Playcalling
- Outcome-Erzeugung ist drive-basiert, nicht play-basiert
- keine EPA-/WP-nahe Bewertungsstruktur
- keine Kalibrierungs-Suite fuer Outcome-Verteilungen

### Technische Kernabweichung

Die aktuelle `match-engine.ts` ist fuer den bestehenden Slice sinnvoll, widerspricht aber dem Zielbild in drei Punkten:

1. Sie vermischt Play-Selection, Outcome-Modell, Stat-Verteilung und Drive-Erzaehlung in einer Datei.
2. Sie arbeitet ohne explizite, versionierbare Spielzuege oder Defensivcalls.
3. Sie kennt kein regelbasiertes Competition-Profil fuer NFL-vs-College.

Die Folgeschritte sollten deshalb nicht direkt weitere Heuristik in `match-engine.ts` nachlegen, sondern den kuenftigen Engine-Kern in ein separates Modul herausziehen.

## Zielmodulzuschnitt

### Neue Kernmodulgrenze

Der kuenftige Engine-Kern wird als eigenes Modul vorbereitet:

- `src/modules/gameplay`

Rollenverteilung:

- `seasons` bleibt Orchestrierung, Wochenfortschritt, Match-Persistenz und Saison-State-Machine.
- `gameplay` wird der fachliche Engine-Kern fuer Ruleset, Playbook, Play-Library, Play-Selection, Play-Resolution, Metrics und Calibration.

Damit wird die heutige Seasons-Kopplung reduziert, ohne den funktionierenden Write-Flow zu verlieren.

## Zielarchitektur

### 1. Competition Rules Profile

Zentrale Entkopplung fuer NFL-vs-College:

- ein `CompetitionRuleProfile` kapselt Regelvarianten
- jede Engine-Entscheidung liest nur noch aus dem Ruleset-Profil, nie aus hart codierten Annahmen
- Offense und Defense bleiben ruleset-neutral; nur die Legality-, Clock-, Field- und Overtime-Regeln variieren

Der Ruleset-Layer muss mindestens kapseln:

- Pre-Snap-Limits und Aufstellungsregeln
- Hash-/Field-Profile
- Clock-Runoff und Stop-Clock-Regeln
- Touchback-/Kick-Regeln
- Overtime-Format
- Conversion- und Scoring-Optionen

### 2. Rule Engine / Legality Validation

Der Legality-Layer laeuft vor jeder taktischen Logik:

1. Formation und Personnel werden in einen normalisierten Pre-Snap-Snapshot ueberfuehrt.
2. Die Rule Engine prueft den Snapshot gegen das aktive `CompetitionRuleProfile`.
3. Nur legale Play-Kandidaten duerfen in Selection und Resolution weiterlaufen.

Verantwortung:

- Zahl spielbereiter Spieler
- Eligible/Ineligible Receiver
- Line-of-Scrimmage- und Backfield-Verteilung
- Motion-/Shift-Zulaessigkeit
- ruleset-spezifische Sonderfaelle

Ergebnis:

- `LegalityResult` mit `isLegal`
- strukturierte Fehlercodes statt freie Fehltexte
- spaeter nutzbar fuer Regeltests und Debugging

### 3. Playbook Domain Model

Playbooks werden nicht als starre Liste konkreter Spielzuege modelliert, sondern als gewichtete Policies.

Ein Playbook besteht aus:

- Situationsfiltern
- gewichteten Verweisen auf Play-Familien oder konkrete Play-Definitionen
- optionalen Min-/Max-Call- oder Script-Grenzen
- getrennten Offense- und Defense-Policies

Die Situationsachse muss mindestens modellieren:

- Down
- Distance-Bucket
- Field-Zone
- Clock-Bucket
- Score-Bucket
- optional Personnel-/Tempo- oder Red-Zone-Tags

Wichtig:

- Formation ist nicht das Playbook
- Konzept ist nicht die Formation
- das Playbook entscheidet nur, welche Call-Familien in welcher Situation wie stark gewichtet werden

### 4. Offensive und Defensive Play Library

Die Play Library ist der katalogisierte fachliche Bestand. Sie trennt:

- Personnel Package
- Formation Family
- Motion/Shift Family
- Protection Family
- Offensive Concept Family
- Defensive Front Family
- Coverage Family
- Pressure Family

Ein konkreter Play-Call entsteht aus der Komposition dieser Familien.

Warum diese Trennung wichtig ist:

- dieselbe Formation kann mehrere Konzepte tragen
- dasselbe Konzept kann aus mehreren Formationen gespielt werden
- dieselbe Coverage-Familie kann mit mehreren Fronts kombiniert werden
- ruleset-spezifische Varianten bleiben sauber versionierbar

### 5. Play Selection Engine

Die Play Selection Engine waehlt nicht direkt per starrem Script, sondern ueber gewichtete Kandidaten.

Eingaben:

- Spielzustand
- aktives Ruleset
- offensive und defensive Playbooks
- verfuegbares Personnel
- Selbstscout-/Usage-Signale
- Fatigue, Injuries, Morale und Scheme-Kontext

Ausgaben:

- ausgewaehlter Offense-Call
- ausgewaehlter Defense-Call
- nachvollziehbare Weight-Modifikatoren pro Kandidat

Die Engine bleibt probabilistisch, aber erklaerbar:

- Basisgewicht aus dem Playbook
- Modifikatoren aus Situation, Personnel und Tendenz
- abschliessende zufaellige Auswahl ueber Gewichtung

### 6. Outcome Resolution Engine

Die Outcome Resolution wird play-basiert und probabilistisch aufgebaut.

Empfohlene Stufen:

1. Pre-Snap-Legality bestaetigen
2. Offense- und Defense-Call in Matchup-Features uebersetzen
3. Teilkonflikte separat modellieren:
   - Box Count / Run Fit
   - Pass Rush vs Protection
   - Separation vs Coverage
   - Catch Point
   - Tackle / YAC
   - Ball Security
   - Penalty-Risiko
4. daraus eine Outcome-Verteilung erzeugen
5. konkretes Play-Result sampeln
6. State Transition, Clock, Stats und Drive-/Event-Log ableiten

Die Engine soll keine starren Skripts wie "Inside Zone gibt immer X Yards" erzeugen. Konzepte steuern Parameter und Wahrscheinlichkeiten, nicht deterministische Ergebnisse.

### 7. Simulation Metrics / EPA-WP-nahe Bewertungsstruktur

Fuer Erklaerbarkeit, Tuning und spaetere AI- oder Coach-Logik braucht die Engine eine State-Value-Ebene.

Empfohlene Struktur:

- `StateValueModel` fuer Expected Points und Win Probability pro Spielsituation
- `PlayValueAssessment` mit:
  - expected points added
  - win probability added
  - success-value / explosiveness / turnover swing

Die erste Ausbaustufe darf mit internen, ruleset-spezifischen Baseline-Tabellen arbeiten. Wichtig ist die saubere Schnittstelle, nicht sofort perfekte externe Kalibrierung.

### 8. Test- und Calibration Layer

Die Zielvalidierung besteht aus vier Schichten:

- Regeltests:
  - Formation, Motion, Eligible Receiver, rule-profile-spezifische Edge Cases
- deterministische Regressionstests:
  - gleiche Seeds erzeugen gleiche Selection- und Resolution-Ergebnisse
- Verteilungstests:
  - Run Rate, Sack Rate, Turnover Rate, Explosives, Red-Zone-TD-Rate
- Kalibrierungstests:
  - beobachtete Metriken liegen innerhalb definierter Erwartungsbaender

Die Tests duerfen sich nicht nur auf Endscores beschraenken. Die neue Engine braucht pruefbare Zwischenebenen.

## Wiederverwendung vorhandener Bausteine

| Vorhanden | Wiederverwendung | Folgearbeit |
|---|---|---|
| `season-simulation.service.ts` | bleibt Coordinator fuer Wochen-Write-Flow | spaeter statt `generateMatchStats()` den neuen Gameplay-Kern aufrufen |
| `match-context.ts` | gute Basis fuer Team-/Player-Kontext und Seeds | um Formation-, Personnel- und Ruleset-Kontext erweitern |
| `depth-chart.ts` | wiederverwendbar fuer Game-Day-Personnel und Minimalvalidierung | spaeter um formationstaugliche Personnel-Zuweisung erweitern |
| `match-result-persistence.ts` | starke Persistenzbasis | spaeter Play-/Event-Resultate und Metriken mitpersistieren |
| `simulation-random.ts` | direkt wiederverwendbar | bleibt RNG-Grundlage |
| `engine-state-machine.ts` | direkt wiederverwendbar | unveraendert Seasons-Verantwortung |
| `Team`-Scheme-Felder | wiederverwendbar als Team-Identity / Default-Tendenz | spaeter durch echte Playbooks ergaenzen |
| `PlayerRosterProfile`, `PlayerEvaluation`, `PlayerAttributeRating` | wiederverwendbar fuer Personnel, Matchups und Skillmodelle | zusaetzliche Rollen-/Formationstags spaeter moeglich |
| `MatchSimulationDrive` | wiederverwendbar fuer High-Level-Drive-Log | spaeter um Play-/Event-Layer ergaenzen oder daneben erweitern |

## Dateiplan / Modulplan

### In diesem Paket neu angelegt

- `src/modules/gameplay/domain/competition-rules.ts`
- `src/modules/gameplay/domain/game-situation.ts`
- `src/modules/gameplay/domain/pre-snap-legality.ts`
- `src/modules/gameplay/domain/playbook.ts`
- `src/modules/gameplay/domain/play-library.ts`
- `src/modules/gameplay/domain/play-selection.ts`
- `src/modules/gameplay/domain/play-resolution.ts`
- `src/modules/gameplay/domain/simulation-metrics.ts`
- `src/modules/gameplay/domain/calibration.ts`
- `src/modules/gameplay/domain/index.ts`

Diese Dateien sind bewusst nur Domain-Surfaces. Sie ziehen noch keinen produktiven Pfad um.

### Bestehende Dateien, die spaeter erweitert oder refaktoriert werden sollen

- `prisma/schema.prisma`
  - Playbook-, Play-Library-, MatchEvent- und ggf. value-model-nahe Persistenz
- `src/modules/seasons/application/season-simulation.service.ts`
  - Adapter vom Seasons-Write-Flow zum Gameplay-Kern
- `src/modules/seasons/application/simulation/match-context.ts`
  - Aufbau von Personnel-, Formation- und Ruleset-Snapshots
- `src/modules/seasons/application/simulation/depth-chart.ts`
  - Erweiterung von Minimal-Lineups zu formationstauglichem Personnel-Selection-Layer
- `src/modules/seasons/application/simulation/match-engine.ts`
  - spaetere Zerlegung oder Ersatz durch Gameplay-Kern
- `src/modules/seasons/application/simulation/match-result-persistence.ts`
  - Persistenz fuer Play-/Event-Layer und Metriken
- `src/modules/seasons/infrastructure/simulation/season-simulation.repository.ts`
  - zusaetzliche Reads fuer Playbooks, Ruleset und Personnel-Metadaten
- `src/modules/shared/infrastructure/reference-data.ts`
  - Seed-Basis fuer Formations-, Konzept- und ggf. Ruleset-Referenzdaten
- `src/modules/teams/application/team-schemes.service.ts`
  - spaeter Team-Schemes mit Playbook-Policies verknuepfen

### Neue Persistenzbereiche fuer Folgepakete

- Competition / Ruleset-Definitionen
- Playbook-Kopf und Policy-Zeilen
- offensive und defensive Play-Library
- optional MatchEvent / PlayEvent
- optional state-value bzw. calibration reference tables

## Saubere Entkopplung von Offense, Defense und NFL-vs-College

### Offense vs Defense

- offensive und defensive Calls bleiben separate Typen und Libraries
- gemeinsame Engine-Stufen arbeiten nur auf neutralen Ports wie Situation, LegalityResult und MatchupFeatures
- keine defensive Coverage-Logik in offensiven Konzeptdefinitionen und umgekehrt

### NFL vs College

- keinerlei `if (college)`-Verzweigungen tief in Play-Selection oder Outcome-Modellen
- stattdessen immer Zugriff ueber `CompetitionRuleProfile`
- dadurch koennen spaeter weitere Modi wie High School oder Custom League ohne Engine-Umbau folgen

### Seasons vs Gameplay

- `seasons` besitzt weiterhin Savegame-, Match- und Season-Orchestrierung
- `gameplay` bekommt die fachliche Verantwortung fuer den eigentlichen Spielzugkern
- so bleibt der Saisonfluss stabil, waehrend die Engine unabhaengig getestet und kalibriert werden kann

## Risiken

### Technische Risiken

- Refactoring des heutigen monolithischen `match-engine.ts` kann stillschweigende Verhaltensaenderungen erzeugen.
- Zu fruehe Persistenzmodellierung fuer Play-by-Play kann spaetere Engine-Annahmen verhaerten.
- Wenn Playbooks und Rulesets direkt an Prisma-Modelle gekoppelt werden, leidet Testbarkeit.

### Datenmodell-Risiken

- Vermischung von Formation, Konzept und Playbook wuerde das neue Modell sofort wieder unflexibel machen.
- Zu frueh zu konkrete Tabellen fuer einzelne Konzepte koennen Library-Erweiterungen blockieren.
- Fehlende Ruleset-Versionierung erschwert NFL-vs-College sauber.

### Performance-Risiken

- vollstaendige Play-by-Play-Resolution erhoeht CPU-Kosten pro Match deutlich
- mehr Reads fuer Playbooks, Personnel und Event-Persistenz vergroessern DB-Last
- EPA-/WP-Berechnung pro Play braucht schlanke, voraggregierte State-Value-Zugriffe

### Testbarkeits-Risiken

- wenn Selection und Resolution nicht als reine Funktionen abgrenzbar sind, werden Kalibrierungstests teuer und fragil
- fehlende Seed-Kontrolle in Teilmodellen untergraebt Reproduzierbarkeit
- ohne klaren Event-/State-Uebergang wird Ursachenanalyse bei Balancefehlern schwer

## Empfohlene Umsetzungsreihenfolge fuer Folgepakete

1. `CompetitionRuleProfile` produktiv an Matchkontext und Simulation anbinden.
2. Pre-Snap-Legality-Layer als reine Engine-Stufe mit Regeltests einfuehren.
3. offensive und defensive Play-Library als Referenzdatenmodell aufbauen.
4. Playbook-Policies fuer Teams einfuehren und vom bisherigen Scheme-Layer ableiten.
5. Play Selection Engine neben der heutigen Drive-Heuristik aufbauen und seed-deterministisch testen.
6. Outcome Resolution Engine zunaechst fuer Kernfamilien einfuehren:
   - Base Run
   - Dropback Pass
   - Play Action
   - Screen
7. EPA-/WP-nahe Metrics integrieren und gegen Erwartungsbaender kalibrieren.
8. Erst danach den Seasons-Write-Flow schrittweise von `match-engine.ts` auf den neuen Gameplay-Kern umstellen.

## Freigabestatus dieses Vorbereitungspakets

Gruen, wenn:

- die neue Zielarchitektur dokumentiert ist
- die Modulgrenzen fuer `gameplay` vorbereitet sind
- der produktive Seasons-Pfad unberuehrt bleibt
- Build und Tests nach den Strukturdateien erfolgreich sind

