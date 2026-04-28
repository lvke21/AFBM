# Component Inventory

## App Shell
Zweck: Gemeinsamer Rahmen aus Sidebar, Top Bar, Savegame-/Team-Kontext und Main Content.

Props:
- `context`: Savegame, Season, Manager Team
- `children`: Screen-Inhalt
- `activeRoute`: aus Navigation ableitbar

Varianten:
- Standard Manager Shell
- Game Flow Shell mit stärkerem Match-Kontext
- Auth/Setup Shell ohne Savegame-Kontext

Verwendung:
- Alle App-Screens unter `src/app/app/*`

## Page Header
Zweck: Screen-Titel, Kontextzeile, primäre Aktionen.

Props:
- `title`
- `subtitle`
- `metadata`
- `actions`
- `status`

Varianten:
- Dashboard Header
- Match Header mit Week/Opponent/Score
- Player Header mit Position/Team/OVR

Verwendung:
- Dashboard, Game Preview, Match Report, Roster, Player Profile

## Section Panel
Zweck: Wiederverwendbarer Inhaltscontainer für funktionale Bereiche.

Props:
- `title`
- `description`
- `actions`
- `tone`: `default | subtle | warning`
- `children`

Varianten:
- Standard Panel
- Warning Panel
- Compact Panel

Verwendung:
- Dashboard Cards, Match Panels, Team/Roster Bereiche

## Stat Card
Zweck: Einzelne Kennzahl mit Label und optionalem Trend.

Props:
- `label`
- `value`
- `unit`
- `rank`
- `trend`
- `tone`: `default | positive | warning | danger`
- `description`

Varianten:
- Compact
- Hero Stat
- Ranked Stat
- Comparison Stat

Verwendung:
- Dashboard, Match Report, Player Profile, Team Overview

## Comparison Bar
Zweck: Zwei Werte direkt vergleichbar machen.

Props:
- `leftLabel`
- `rightLabel`
- `leftValue`
- `rightValue`
- `advantage`: `left | right | even`
- `format`

Varianten:
- Team vs Opponent
- Player vs League
- Unit vs Unit

Verwendung:
- Game Preview, Match Report, Player Development, X-Factor

## Status Badge
Zweck: Zustand schnell scannbar anzeigen.

Props:
- `label`
- `tone`: `success | warning | danger | neutral | active`
- `icon`
- `tooltip`

Varianten:
- Ready
- In Progress
- Completed
- Warning
- Injured
- X-Factor Active

Verwendung:
- Weekly Flow, Readiness, Roster, Player Profile, Injuries

## Progress Bar
Zweck: Fortschritt, Readiness, Chemistry, Fatigue oder Cap-Auslastung anzeigen.

Props:
- `value`
- `max`
- `label`
- `tone`
- `thresholds`
- `showValue`

Varianten:
- Linear
- Segmented
- Compact
- Threshold-based

Verwendung:
- Dashboard, Player Development, Team Chemistry, Readiness, Finance

## Circular Rating
Zweck: OVR, Chemistry, Readiness oder Confidence als dominanten Wert darstellen.

Props:
- `value`
- `label`
- `max`
- `tone`
- `caption`

Varianten:
- OVR
- Chemistry
- Fatigue/Risk
- Readiness

Verwendung:
- Dashboard, Player Card, Player Profile, Team Chemistry

## Table
Zweck: große Datenmengen scannbar machen.

Props:
- `columns`
- `rows`
- `sort`
- `filters`
- `selectedRowId`
- `emptyState`
- `rowActions`

Varianten:
- Roster Table
- Standings Table
- Schedule Table
- Box Score Table
- Contract Table

Verwendung:
- Roster, Dashboard Standings, Schedule, Match Report

## Player Card
Zweck: Spieleridentität, Position, OVR und kurze Leistungsdaten verbinden.

Props:
- `player`
- `rating`
- `position`
- `role`
- `stats`
- `status`
- `portraitUrl`
- `isSelected`
- `actions`

Varianten:
- Compact Top Player
- Detail Summary
- X-Factor Player
- Roster Selection

Verwendung:
- Dashboard, Player Profile, X-Factor, Play Selection, Match Report

## Player Detail Panel
Zweck: ausgewählten Spieler in Tabellen- oder Roster-Flows erklären.

Props:
- `player`
- `attributes`
- `contract`
- `morale`
- `chemistry`
- `injuryStatus`
- `valueFeedback`
- `actions`

Varianten:
- Roster Detail
- Player Profile Hero
- Development Detail
- X-Factor Detail

Verwendung:
- Roster, Player Profile, Player Development, X-Factor

## Timeline / Play-by-Play Item
Zweck: Spielereignisse chronologisch und nach Wichtigkeit scannbar machen.

Props:
- `quarter`
- `time`
- `downAndDistance`
- `team`
- `playType`
- `description`
- `yards`
- `scoreAfter`
- `isKeyMoment`

Varianten:
- Normal Play
- Scoring Play
- Turnover
- Penalty
- Drive Summary

Verwendung:
- Live Simulation, Play-by-Play, Match Report

## Scoreboard
Zweck: aktueller oder finaler Match-Kontext.

Props:
- `homeTeam`
- `awayTeam`
- `score`
- `quarter`
- `clock`
- `downAndDistance`
- `possession`
- `status`

Varianten:
- Pre-game Matchup
- Live
- Final
- Compact Sidebar

Verwendung:
- Game Preview, Match Control, Live Simulation, Match Report

## Flow Stepper
Zweck: Week-/Game-Status verständlich machen.

Props:
- `steps`
- `currentStep`
- `completedSteps`
- `blockedSteps`
- `onStepClick`

Varianten:
- Weekly Flow
- Game Flow
- Setup Checklist

Verwendung:
- Dashboard Week Loop, Weekly Flow, Match Control

## Readiness Checklist
Zweck: Startfähigkeit erklären und Blocker sichtbar machen.

Props:
- `items`
- `summaryStatus`
- `blockingReason`
- `primaryAction`

Varianten:
- Game Preview
- Match Control
- Weekly Flow Tasks

Verwendung:
- Game Preview, Match Control, Dashboard Next Action

## Tabs / Segmented Control
Zweck: Screen-interne Navigation ohne Seitenwechsel.

Props:
- `items`
- `activeItem`
- `onChange`
- `variant`: `tabs | segmented`

Varianten:
- Top Tabs
- Card Tabs
- Mode Segments

Verwendung:
- Match Report, Roster, Player Profile, Team Chemistry, Play Selection

## Action Button
Zweck: klare Manager-Aktion auslösen.

Props:
- `label`
- `icon`
- `variant`: `primary | secondary | danger | ghost`
- `disabled`
- `loading`
- `feedbackContext`

Varianten:
- Primary CTA
- Toolbar Button
- Destructive Button
- Icon Button

Verwendung:
- Start Game, Advance Week, Trade, Sign, Optimize, Select Play

## Decision Feedback Panel
Zweck: Auswirkung und Value einer Aktion nach einem Manager-Entscheid erklären.

Props:
- `impact`: `positive | neutral | negative`
- `reason`
- `context`
- `affectedPlayers`
- `nextAction`

Varianten:
- Global Toast/Feedback
- Inline Decision Result
- Report Recommendation

Verwendung:
- Trades, Signings, Roster Changes, Dashboard Next Action

## Matchup Advantage Panel
Zweck: sportliche Stärken/Schwächen vor oder während eines Spiels erklären.

Props:
- `units`
- `advantages`
- `risk`
- `recommendation`

Varianten:
- Team Comparison
- Play Selection Matchup
- X-Factor Impact

Verwendung:
- Game Preview, Play Selection, Match Report, X-Factor

## Empty State
Zweck: fehlende Daten oder leere Zustände stabil auffangen.

Props:
- `title`
- `message`
- `reason`
- `action`
- `severity`

Varianten:
- No Savegame
- No Match Data
- No Player Selected
- No Recommendations

Verwendung:
- Alle datengetriebenen Screens
