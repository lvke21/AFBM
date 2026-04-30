# Franchise Strategy System Report

## Ziel

Das lokale Online-MVP hat jetzt ein Franchise-Strategy-System, mit dem ein GM die Ausrichtung seiner Franchise festlegt. Die Strategie beeinflusst Owner-Erwartungen, Fan-Druck, Training, Finanzen und Contract-Entscheidungen.

## Datenmodell

`FranchiseStrategyProfile` wurde erweitert:

- `strategyType`: `rebuild`, `win_now`, `balanced`, `youth_focus`
- `selectedAtSeason`
- `expectedWinRate`
- `expectedPlayoff`
- `developmentFocus`
- `financialRiskTolerance`
- `ownerPressureModifier`
- `fanPressureModifier`
- `financeRiskModifier`
- `trainingDevelopmentModifier`
- `trainingPreparationModifier`
- `contractYouthPreference`
- `starSpendingTolerance`
- `narrative`
- `riskExplanation`
- `impactSummary`

Das alte Feld `strategy` bleibt als Alias erhalten, damit bestehende lokale Liga-Daten kompatibel bleiben.

## Strategieeffekte

### Rebuild

- Niedrigere Soforterwartung
- Weniger Fan-Druck
- Mehr Player Development
- Konservativere Finanzlogik
- Blockiert teure Veteran-/Star-Signings ohne Elite-Potenzial

### Win Now

- Playoff-Erwartung
- Hoher Fan- und Owner-Druck
- Mehr Game Preparation
- Hoehere Spending-Toleranz ueber den Soft-Cap-Buffer
- Harte Job-Security-Strafen, wenn Playoffs oder Win-Rate klar verfehlt werden

### Balanced

- Neutrale Erwartungen
- Keine Spezialboni oder starken Restriktionen
- Standard fuer alte Saves

### Youth Focus

- Maximale Entwicklungsausrichtung
- Moderate Geduld
- Auto-Training priorisiert Player Development und junge Spieler
- Strengere Contract-Logik gegen Veteranen- und Star-Kurzzeitloesungen

## Regeln

- Strategien koennen nur in der Offseason gesetzt werden.
- Im MVP gilt Week 1 sowie jede erste Woche nach einer 18-Week-Season als Offseason.
- Versuchte Strategie-Wechsel waehrend der Saison veraendern den State nicht.
- Verfehlte Strategieziele erzeugen zusaetzliche Job-Security-Penalties.

## UI

Im Online-Liga-Dashboard zeigt die Franchise-Section jetzt:

- Strategy Selector mit vier Optionen
- Erwartete Win Rate und Playoff-Erwartung
- Auswirkungen auf Systeme
- Risikoerklaerung
- Offseason-Hinweis, falls ein Wechsel waehrend der Saison versucht wird

## Tests

Abgedeckt:

- Strategy-Persistenz und Audit Event
- Offseason-Lock fuer Strategie-Wechsel
- Einfluss auf Job Security und Fan Pressure
- Einfluss auf Matchday-Finance
- Einfluss auf Auto-Training
- Youth-Focus-Training
- Rebuild blockiert unpassende Star-Signings
- Win Now darf den Soft-Cap-Buffer fuer kurzfristige Signings nutzen

## Offene Punkte

- Offseason-Erkennung ist im lokalen MVP noch an die 18-Week-Heuristik gebunden.
- Draft-, Prospect- und echte Player-Development-Ergebnisse koennen spaeter noch direkter in die Strategie-Bewertung einfliessen.
- Produktiver Multiplayer braucht zentrale Transaktionen, damit Strategy- und Contract-Entscheidungen nicht clientseitig manipulierbar sind.
