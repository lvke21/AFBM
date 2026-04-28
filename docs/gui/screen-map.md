# Screen Map

## Dashboard
Zweck: zentraler Manager-Startpunkt mit Teamzustand, Week Loop und nächster sinnvoller Aktion.

Benötigte Daten:
- Savegame, Current Season, Manager Team
- Team Overview, Record, Standings, Team Needs
- Next Match, Week Status, Inbox/Tasks
- Short-Term Goals, Development, Finance/Cap

Wichtigste Komponenten:
- App Shell, Page Header, Stat Card, Flow Stepper, Readiness Checklist, Player Card, Table, Decision Feedback Panel

Interaktionen:
- zur nächsten empfohlenen Aufgabe springen
- Game Preview öffnen
- Roster/Depth Chart/Inbox öffnen
- Week Status prüfen

Varianten:
- Overview Dashboard
- Dense Analyst Dashboard
- Analytics-heavy Dashboard

## Weekly Flow
Zweck: Woche als Prozess verständlich machen: Pre-Week, Ready, Game Running, Post-Game.

Benötigte Daten:
- Current Week
- Completed Tasks
- Pending Tasks
- Match Schedule
- Current Game Flow Status

Wichtigste Komponenten:
- Flow Stepper, Readiness Checklist, Schedule Table, Status Badge, Action Button

Interaktionen:
- offene Tasks öffnen
- Game Preview starten
- Week wechseln
- Schedule prüfen

## Game Preview
Zweck: Vor dem Spiel Gegner, Readiness, Risiken und taktische Entscheidungen zusammenfassen.

Benötigte Daten:
- Match, Opponent, Venue, Weather
- Team Ratings, Opponent Ratings
- Injuries, Morale, Chemistry
- Tactical Settings, Team Needs, X-Factors

Wichtigste Komponenten:
- Scoreboard, Comparison Bar, Readiness Checklist, Matchup Advantage Panel, Status Badge, Action Button

Interaktionen:
- Game Plan editieren
- Depth Chart prüfen
- Injury Report öffnen
- Spiel starten, wenn Ready

## Match Control
Zweck: Übergang zwischen Vorbereitung, Simulation und Wochenabschluss kontrollieren.

Benötigte Daten:
- Game Flow State
- Match Status
- Readiness Status
- Simulation Options
- Week Summary

Wichtigste Komponenten:
- Flow Stepper, Scoreboard, Readiness Checklist, Action Button, Status Badge

Interaktionen:
- Start Game
- Finish Game
- Advance Week
- Readiness Report öffnen
- Simulation Optionen ändern

## Live Simulation
Zweck: laufendes Spiel mit Score, Drives, Momentum, Key Players und Play-by-Play begleiten.

Benötigte Daten:
- Live/Fake-live Game State aus Engine Output
- Score, Quarter, Clock, Down/Distance
- Drives, Plays, Momentum
- Key Player Stats, X-Factor State

Wichtigste Komponenten:
- Scoreboard, Timeline / Play-by-Play Item, Drive Summary, Player Card, Matchup Advantage Panel, Progress Bar

Interaktionen:
- Simulation pausieren/fortsetzen
- Geschwindigkeit ändern
- Play-by-Play filtern
- Drives oder Player Details öffnen

## Play Selection
Zweck: Spielzugauswahl mit Matchup-, Risiko- und Outcome-Information.

Benötigte Daten:
- Game Context
- Available Plays
- Formations, Personnel
- Opponent Defensive Look
- Expected Outcome, Risk, Recent Plays

Wichtigste Komponenten:
- Play Card, Tabs / Segmented Control, Matchup Advantage Panel, Scoreboard, Action Button, Status Badge

Interaktionen:
- Play-Kategorie wählen
- Formation/Personnel filtern
- Play auswählen
- Play bestätigen
- Favoriten/Gameplan verwalten

## Play-by-Play
Zweck: detaillierte Ereignisliste als Analyse- und Review-Fläche.

Benötigte Daten:
- Plays grouped by quarter/drive
- Play Type, Yards, Down/Distance
- Score Changes
- Key Moments, Penalties, Turnovers

Wichtigste Komponenten:
- Timeline / Play-by-Play Item, Tabs / Segmented Control, Status Badge, Filter Control

Interaktionen:
- Quarter filtern
- Key Plays anzeigen
- Scoring Plays anzeigen
- einzelnes Play fokussieren

## Match Report
Zweck: Endergebnis erklären, wichtigste Gründe zeigen und nächste Handlung ableiten.

Benötigte Daten:
- Final Score, Box Score, Team Stats
- Top Plays, Key Moments
- Player of the Game
- Game Outcome Explanation
- Post-Game Insights, Next Steps

Wichtigste Komponenten:
- Scoreboard, Stat Card, Comparison Bar, Timeline Item, Player Card, Decision Feedback Panel, Action Button

Interaktionen:
- Box Score öffnen
- Player Stats prüfen
- Analyse-Tabs wechseln
- Next Step ausführen
- zurück zum Dashboard oder Advance Week

## Roster
Zweck: Kader scannen, sortieren, vergleichen und Manager-Aktionen auslösen.

Benötigte Daten:
- Team Roster
- Player Ratings, Positions, Age, Salary
- Morale, Chemistry, Injury
- Cap Context, Role/Depth Chart Context

Wichtigste Komponenten:
- Table, Player Detail Panel, Status Badge, Progress Bar, Action Button, Tabs / Segmented Control

Interaktionen:
- sortieren und filtern
- Spieler auswählen
- Compare, Trade, Release, Actions öffnen
- zu Depth Chart wechseln

## Player Profile
Zweck: einen Spieler als sportlichen, finanziellen und entwicklungsbezogenen Entscheidungsraum erklären.

Benötigte Daten:
- Player Identity, Bio, Position, Team
- Ratings/Attributes, Stats, Contract
- Morale, Chemistry, Injury, Role
- Development/Progression, Value Feedback

Wichtigste Komponenten:
- Player Header, Circular Rating, Attribute Table, Stat Card, Progress Bar, Tabs, Decision Feedback Panel

Interaktionen:
- Tabs wechseln
- Contract/Stats/History prüfen
- Compare, Trade, Release oder Development öffnen

## Team Chemistry
Zweck: Team- und Unit-Synergien sichtbar machen.

Benötigte Daten:
- Chemistry Scores
- Player Links
- Unit Groups
- Positive/Negative Links
- Chemistry Impact on Performance

Wichtigste Komponenten:
- Network/Relationship View, Circular Rating, Player Card, Progress Bar, Comparison Bar, Status Badge

Interaktionen:
- Offense/Defense/Full Team umschalten
- nach Position gruppieren
- Spieler fokussieren
- Player Profile öffnen

## Player Development
Zweck: Trainingsfokus, Attribute, Trends, Fatigue und Verletzungsrisiko steuerbar machen.

Benötigte Daten:
- Player Attributes, OVR/Potential
- Training Focus Options
- Trend History
- Fatigue, Injury Risk
- Coach/Training Plan

Wichtigste Komponenten:
- Player Detail Panel, Attribute Table, Progress Bar, Comparison Bar, Action Button, Status Badge

Interaktionen:
- Training Focus wählen
- Intensität ändern
- Auto Optimize ausführen
- History/Medical/Contract Tabs öffnen

## X-Factor
Zweck: besondere Spielerfähigkeiten, Trigger und Impact nachvollziehbar machen.

Benötigte Daten:
- X-Factor Players
- Ability Definitions
- Activation Conditions
- Ability Effects
- Synergies, Simulation Impact

Wichtigste Komponenten:
- Player Card, Status Badge, Matchup Advantage Panel, Comparison Bar, Progress Bar, Tabs / Segmented Control

Interaktionen:
- X-Factor Spieler auswählen
- Impact Breakdown prüfen
- Matchup Analysis öffnen
- Player Profile öffnen
