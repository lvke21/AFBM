# Trade Board Implementation Report

## Status
Grün

## Route / Screen
- Route: `/app/savegames/[savegameId]/team/trades`
- Einstieg: Team Navigation, Team Overview, Roster Actions, Roster Table, Player Profile
- Rückwege: Roster, Contracts, Player Profile Links aus der Auswahl

## Ziel
Der Trade Board Screen bereitet Kaderentscheidungen visuell vor, ohne eine echte Trade Engine oder Persistenz zu verwenden. Nutzer sehen eigene Spieler, potenzielle Targets, Kosten, Rolle, Value und eine grobe Balance-Einschätzung.

## Umgesetzte Bereiche

### Eigene Spieler
- Eigene Spieler werden aus `getTradeMarketForUser` geladen.
- Spieler-Karten enthalten:
  - Name, Team, Position, Roster Status
  - Depth Chart Slot, falls vorhanden
  - OVR / POT
  - Cap Hit
  - Team Need
  - Value Badge
  - Decision Summary
- Auswahl funktioniert lokal per Hinzufügen/Entfernen.

### Potenzielle Trade Targets
- CPU-Spieler werden als Targets angezeigt.
- Targets können nach Partnerteam gefiltert werden.
- Die Auswahl bleibt lokal im Client-State.
- Leere Target-Filter zeigen einen stabilen Empty State.

### Auswahlstruktur
- Der Trade Sketch zeigt:
  - Spieler, die abgegeben werden
  - Spieler, die angefragt werden
  - Entfernen-Aktion je ausgewähltem Spieler
  - Profil-Link je ausgewähltem Spieler
  - Partnerteam-Kontext
  - Cap Delta
- Es gibt keinen Submit-Button und keine Trade-Ausführung.

### Decision Summary
- `buildTradeBoardState` leitet pro Spieler eine kompakte Entscheidungshilfe ab:
  - `Need Fit`
  - `Upside Target`
  - `Kostenrisiko`
  - `Fit-Frage`
  - vorhandene Value-Labels wie `Great Value`, `Fair Value`
- Grundlage sind vorhandene Felder:
  - OVR / POT
  - Alter
  - Cap Hit
  - Depth Slot
  - Roster Status
  - Scheme Fit
  - Team Need

### Trade Balance Hinweis
- `estimateTradeBoardBalance` bewertet nur heuristisch:
  - `Auswahl unvollstaendig`
  - `Fairer Trade (grob)`
  - `Ungleiches Angebot`
  - `Cap-Risiko`
- Die Bewertung nutzt Value Scores und Cap Delta.
- Die UI kennzeichnet klar, dass dies keine echte Akzeptanzprüfung ist.

## Technische Abgrenzung
- Keine Game Engine Änderung.
- Keine neue Datenmodell- oder Persistenzlogik.
- Keine neue Dependency.
- Keine echte Trade-Ausführung auf dem Board.
- Bestehende Trade-Action und `reviewTradeOffer` bleiben unverändert.

## Verwendete Datenquellen
- `getTradeMarketForUser`
- `TradeMarket.teams`
- `TradeMarket.players`
- vorhandene Player-/Team-Felder:
  - `teamId`
  - `teamAbbreviation`
  - `positionCode`
  - `positionOverall`
  - `potentialRating`
  - `age`
  - `rosterStatus`
  - `depthChartSlot`
  - `schemeFitScore`
  - `capHit`
  - `needs`
  - `salaryCapSpace`

## Geänderte Dateien
- `src/app/app/savegames/[savegameId]/players/[playerId]/page.tsx`
- `src/components/trades/trade-board.tsx`
- `src/components/trades/trade-board-model.ts`
- `src/components/trades/trade-board-model.test.ts`
- `docs/gui/trade-board-implementation-report.md`

## Tests
- `npx vitest run src/components/trades/trade-board-model.test.ts src/components/trades/trade-model.test.ts`
  - Ergebnis: Grün, 2 Testdateien, 10 Tests
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün

## Abgedeckte Szenarien
- Eigene Spieler und CPU-Targets werden getrennt.
- Partnerteams werden stabil sortiert.
- Targets können nach Partnerteam gefiltert werden.
- Defaults für eigene Spieler und Targets sind stabil.
- Fehlende Targets erzeugen einen Empty State.
- Decision Summaries werden pro Spieler abgeleitet.
- Fairer Trade, ungleiches Angebot, unvollständige Auswahl und Cap-Risiko werden modellseitig geprüft.
- Bestehende Trade-Review-Tests bleiben grün.

## Offene Punkte
- Keine echte Trade-Erstellung.
- Keine Offer-Speicherung.
- Keine CPU-Akzeptanz im sichtbaren Board.
- Keine Multi-Asset-Logik mit Picks.
- Keine Trade-Historie.

## Statusprüfung
- Eigene Spielerliste sichtbar: Ja
- Potenzielle Targets sichtbar: Ja
- Spieler hinzufügen/entfernen: Ja
- Player Cards mit OVR / POT, Contract, Rolle, Decision Summary: Ja
- Trade Balance Hinweis vorhanden: Ja
- Einstieg aus Roster und Player Profile: Ja
- Rückwege klar: Ja
- Keine echte Trade Engine: Ja
- Tests grün: Ja

Status: Grün
