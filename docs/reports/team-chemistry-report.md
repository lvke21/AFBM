# Team Chemistry System Report

## Ziel

Der lokale Online-GM-Modus erhält ein persistentes Team-Chemistry-System. Chemistry beeinflusst nicht direkt große Simulationsergebnisse, sondern liefert einen kleinen, balancierbaren Gameplay-Modifier und wirkt zusätzlich auf FanMood.

## Neue Datenmodelle

- `TeamChemistryProfile`
  - `score`: Chemistry-Wert von 0 bis 100
  - `playerSatisfaction`: Spielerzufriedenheit von 0 bis 100
  - `gameplayModifier`: kleiner Modifier zwischen `-0.08` und `+0.08`
  - `recentTrend`: aktueller Trend
  - `lastUpdatedSeason`, `lastUpdatedWeek`, `updatedAt`

- `TeamChemistryHistoryEntry`
  - Verlaufseintrag mit Quelle, altem Wert, neuem Wert, Delta und Begründung

- `TeamChemistryTier`
  - `fractured`
  - `unstable`
  - `neutral`
  - `connected`
  - `elite`

## Einflussfaktoren

### Siege und Niederlagen

Matchday-Ergebnisse verändern Chemistry:

- Sieg erhöht Chemistry.
- Niederlage senkt Chemistry.
- Siegesserien und Niederlagenserien verstärken den Effekt.
- Rivalry- und Playoff-Spiele haben zusätzliche Wirkung.

### Training

Training-Outcomes werden jetzt in das persistente Chemistry-Profil übertragen:

- `team_chemistry` Fokus erhöht Chemistry stärker.
- Extreme Intensität kann Chemistry belasten.
- Hohe Fatigue kann Spielerzufriedenheit senken.
- Gute Entwicklung kann Zufriedenheit leicht erhöhen.

### Spielerzufriedenheit

`playerSatisfaction` ist im MVP ein kompakter Wert, der aus Training und Ergebnislage mitläuft. Er puffert oder verstärkt Chemistry-Veränderungen leicht.

## Effekte

### Gameplay Modifier

`calculateTeamChemistryGameplayModifier(score)` gibt einen bewusst kleinen Wert zurück:

- Score 100 → `+0.08`
- Score 50 → `0`
- Score 0 → `-0.08`

Damit ist der Effekt sichtbar, aber nicht spielentscheidend oder engine-brechend.

### FanMood

FanMood berücksichtigt Team Chemistry zusätzlich zum Match-Ergebnis:

- Hohe Chemistry gibt kleinen FanMood-Bonus.
- Sehr niedrige Chemistry belastet FanMood.
- Fans reagieren damit nicht nur auf Siege, sondern auch auf sichtbare Teamstabilität.

## UI

Im Online-Liga-Dashboard wird im Franchise-Bereich angezeigt:

- Team Chemistry
- Chemistry Tier
- Gameplay Modifier

## Persistenz und Rückwärtskompatibilität

- Bestehende Online-Ligen ohne Chemistry-Daten erhalten automatisch Defaults.
- Chemistry-Historie ist optional und wird bei neuen Änderungen aufgebaut.
- Keine Game-Engine-Core-Änderungen wurden vorgenommen.

## Tests

Abgedeckt:

- Team-Chemistry-Training erhöht Chemistry logisch.
- Sieg erhöht Chemistry, Niederlage senkt Chemistry.
- Extreme Werte erzeugen kleine, begrenzte Gameplay Modifier.
- Extreme Chemistry-Werte beeinflussen FanMood nachvollziehbar.

## Offene Punkte

- Noch keine tiefere Spieler-individuelle Zufriedenheitslogik.
- Noch keine direkte Übergabe des Online-Chemistry-Modifiers an echte Online-Simulation, weil diese Simulation noch Placeholder ist.
- Kein Chemistry-Zerfall über lange Offseason/Inaktivität.
