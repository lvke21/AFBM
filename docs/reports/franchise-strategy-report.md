# Franchise Strategy Report

## Ziel

Der lokale Multiplayer-GM-Modus hat jetzt eine strategische Franchise-Ausrichtung. Der GM kann zwischen `Rebuild`, `Win Now` und `Balanced` wählen. Die Strategie wirkt auf Owner-Druck, Fan-Druck, Finanzen und Training.

## Datenmodell

Neu am `OnlineLeagueUser`:

- `franchiseStrategy`

`FranchiseStrategyProfile` enthält:

- `strategy`
- `ownerPressureModifier`
- `fanPressureModifier`
- `financeRiskModifier`
- `trainingDevelopmentModifier`
- `trainingPreparationModifier`
- `narrative`
- `setAt`
- `updatedAt`

Bestehende lokale Ligen bleiben kompatibel. Fehlt eine Strategie, wird `Balanced` normalisiert.

## Strategien

### Rebuild

- Owner toleriert Rückschläge stärker.
- Fan-Druck sinkt kurzfristig.
- Matchday Operations werden konservativer.
- Auto-Training priorisiert Player Development und junge Spieler.
- Preparation-Bonus ist leicht niedriger.

### Win Now

- Owner und Fans erwarten sofortige Resultate.
- Fan-Druck steigt bei Misserfolg.
- Matchday Operations werden aggressiver und teurer.
- Auto-Training wird härter.
- Preparation-Bonus steigt, Development-Fokus sinkt leicht.

### Balanced

- Keine starken Modifier.
- Standardpfad zwischen Ergebnisdruck, Entwicklung und finanzieller Stabilität.

## Umsetzung

Neue Service-Funktion:

- `setOnlineFranchiseStrategy(leagueId, userId, strategy, storage?)`

Die Funktion speichert die Strategie lokal, aktualisiert die GM-Aktivität und schreibt ein Audit-Event:

- `franchise_strategy_set`

## Systemeinflüsse

### Owner

`recordOnlineGmSeasonResult` berücksichtigt die Strategie im Owner Confidence Delta.

### Fans

`calculateFanPressure` berücksichtigt den Strategy Fan Modifier.

### Finanzen

`recordOnlineMatchdayAttendance` nutzt `financeRiskModifier` für Game-Day-Operations-Kosten.

### Training

Auto-Training wird nach Strategie angepasst. Zusätzlich beeinflusst die Strategie Development- und Preparation-Werte im Training Outcome.

## UI

Im Online-Liga-Dashboard gibt es im Franchise-Bereich eine Strategie-Auswahl mit:

- Rebuild
- Win Now
- Balanced

Die aktuelle Strategie und ihre Narrative werden angezeigt.

## Tests

Abgedeckt:

- Strategie wird gespeichert und auditierbar.
- Rebuild vs. Win Now verändert Fan- und Owner-Druck.
- Strategie beeinflusst Matchday-Finanzrisiko.
- Strategie beeinflusst Auto-Training und Training Outcome.

## Offene Punkte

- Noch keine saisonale Strategie-Historie.
- Noch keine Owner-Reaktion auf häufige Strategie-Wechsel.
- Noch keine Admin-Regeln für Strategy Locks.
