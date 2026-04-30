# Trade System Report

## Datenmodelle

Der lokale Online-MVP erweitert die Liga um:

- `TradeProposal`
  - `fromTeamId`
  - `toTeamId`
  - `fromUserId`
  - `toUserId`
  - `playersOffered`
  - `playersRequested`
  - `picksOffered`
  - `picksRequested`
  - `status`
  - `fairnessScore`
  - `fairnessLabel`
- `TradeHistoryEntry`
  - abgeschlossene Trades mit Assets, Ausführungszeitpunkt und Summary.
- `OnlineDraftPick`
  - MVP-Draftpicks pro Franchise für die nächsten Saisons.

Bestehende lokale Ligen erhalten beim Laden leere Trade-Proposals, leere Trade-History und Default-Draftpicks pro Team.

## Aktionen

### Trade erstellen

`createOnlineTradeProposal()` erstellt ein pending Trade-Angebot zwischen zwei GMs. Es prüft:

- beide Teams existieren
- mindestens ein Asset ist enthalten
- angebotene Spieler gehören dem anbietenden Team
- angefragte Spieler gehören dem Zielteam
- angebotene/angefragte Picks gehören dem jeweiligen Team

### Trade annehmen

`acceptOnlineTradeProposal()` führt nur `pending` Trades aus.

Beim Accept:

- Spieler wechseln die Contract-Roster.
- Draft Picks wechseln Besitzer über `currentTeamId`.
- Salary Caps beider Teams werden neu berechnet.
- Wenn ein Team danach über dem Cap wäre, wird der Trade blockiert.
- Der Trade wird auf `accepted` gesetzt.
- Ein Eintrag wird in `tradeHistory` gespeichert.

### Trade ablehnen

`declineOnlineTradeProposal()` setzt pending Trades auf `declined`.

Bereits angenommene oder abgelehnte Trades können nicht erneut ausgeführt werden.

## Basic Fairness Check

Der MVP-Fairness-Check bewertet:

- Spielerwert aus Overall, Alter und Vertragslast
- Pickwert nach Runde und Saison

Aus dem Verhältnis beider Asset-Seiten entsteht:

- `fair`
- `slightly_unbalanced`
- `unbalanced`

Der Check ist absichtlich informativ und blockiert keine Trades. Harte Blocker sind Asset Ownership und Salary Cap.

## Salary Cap Regeln

Nach einem Trade wird für beide Teams berechnet:

```txt
currentCapUsage = aktive Gehälter + bestehender Dead Cap
```

Wenn `currentCapUsage > capLimit`, wird der Trade nicht ausgeführt. Dead Cap bleibt beim ursprünglichen Team und wird nicht mitgetauscht.

## UI

Im Online Liga Dashboard gibt es ein neues `Trade Board`:

- Incoming Trades
- Outgoing Trades
- Status
- Fairness Score
- Offered Assets
- Requested Assets
- Accept/Decline für eingehende pending Trades
- MVP-Button für einen Beispiel-Trade gegen den ersten verfügbaren Trade-Partner

## Events / Logs

Neue Events:

- `trade_proposed`
- `trade_declined`
- `trade_accepted`

## Tests

Neue Tests in `src/lib/online/trade-system.test.ts` validieren:

- Spieler und Draft Picks wechseln korrekt.
- Salary Caps bleiben nach gültigem Trade valide.
- Trades werden bei Cap-Verstoß blockiert.
- Ein Trade kann nicht doppelt ausgeführt werden.

## Offene Punkte

- Kein Trade Countering.
- Kein Multi-Team-Trade.
- Kein AI-Decision-Modell.
- Keine echten Draft-Order- oder Pick-Protection-Regeln.
- Keine Trade Deadline.
- Keine tiefere Bewertung von Team Needs.
- Bei Firebase/Backend-Migration muss Accept transaktional abgesichert werden.
