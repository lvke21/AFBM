# Contracts & Salary Cap Balancing Report

## Ziel

Das lokale Online-GM-System nutzt jetzt ein balancierteres Contract- und Salary-Cap-Modell. Verträge sind nicht mehr nur Jahresgehalt plus Restlaufzeit, sondern erzeugen Cap-Hit, Dead-Cap-Risiko und langfristige Kosten.

## Datenmodell

`PlayerContract` wurde erweitert um:

- `signingBonus`
- `contractType`: `rookie | regular | star`
- `capHitPerYear`
- `deadCapPerYear`

Bestehende lokale Contracts bleiben kompatibel. Fehlende Felder werden beim Laden normalisiert.

`SalaryCap` wurde erweitert um:

- `activeSalary`
- `availableCap`
- `softBufferLimit`
- `capRiskLevel`: `healthy | tight | over`

Der MVP-Cap liegt jetzt bei `200 Mio.` pro Team.

## Cap-Regeln

- Active Salary nutzt `capHitPerYear`, nicht nur `salaryPerYear`.
- Current Usage = Active Salary + Dead Cap.
- Available Cap = Cap Limit - Current Usage.
- Signings, Extensions, Trades und Draft-Picks werden blockiert, wenn der Cap überschritten würde.
- Soft Buffer wird berechnet und sichtbar im Modell gehalten, aber Signings dürfen den echten Cap nicht überschreiten.

## Contract-Balancing

- Star-Verträge liegen im MVP bei ca. 15-25% des Cap.
- Gute Starter liegen grob im 5-10%-Bereich.
- Depth/Rookie-Spieler bleiben günstig.
- Signing Bonus erhöht den Cap-Hit.
- Hohe Guarantees erzeugen Dead-Cap-Risiko.

## Dead Cap

Bei Release bleibt der Spieler als `released` im Roster-State, bis seine Dead-Cap-Verpflichtung ausgelaufen ist.

- Dead Cap wird über `deadCapPerYear` berechnet.
- Beim Jahreswechsel wird die Restlaufzeit reduziert.
- Dead Cap bleibt über mehrere Jahre bestehen, sofern Restjahre vorhanden sind.
- Abgelaufene Released-Verträge werden entfernt.

## UI

Die Online-Liga-Vertragsansicht zeigt jetzt:

- Active Salary
- Dead Cap
- Available Cap
- Cap Usage
- Cap-Risiko-Warnung
- Contract Type
- Cap Hit
- Signing Bonus
- Dead Cap per Year

## Tests

Abgedeckt:

- Cap wird aus Active Cap Hits plus Dead Cap berechnet.
- Release erzeugt `deadCapPerYear`.
- Dead Cap bleibt nach Jahreswechsel bestehen.
- Free-Agent-Signing blockiert bei Cap-Überschreitung.
- Signings funktionieren bei ausreichendem Cap.
- Star Contracts bleiben im vorgesehenen Cap-Anteil.
- Expiring Contracts gehen nach Jahreswechsel in Free Agency.

## Offene Punkte

- Noch keine Verhandlungs-KI für Vertragsforderungen.
- Noch keine Eskalation von Guarantees durch Markt-/Agentendruck.
- Noch keine echten Restructures oder Void Years.
