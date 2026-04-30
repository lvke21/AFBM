# Stadium Economy Report

## Ziel

Der lokale Online-GM-Modus wurde um steuerbare Stadionpreise erweitert. GMs können Ticketpreise und Merch-Preise setzen. Diese Werte beeinflussen Attendance, Matchday Revenue und FanMood.

## Datenmodell

`StadiumProfile` wurde erweitert:

- `ticketPriceLevel`: bestehender Preishebel für Tickets
- `merchPriceLevel`: neuer Preishebel für Merchandise

Bestehende Saves bleiben kompatibel. Wenn ältere Stadiondaten keinen `merchPriceLevel` besitzen, wird der Wert beim Laden aus `ticketPriceLevel` abgeleitet und normalisiert.

## GM-Aktion

Neue Funktion:

```ts
setOnlineStadiumPricing(leagueId, userId, {
  ticketPriceLevel,
  merchPriceLevel,
})
```

Effekte:

- aktualisiert das `StadiumProfile`
- normalisiert beide Werte auf `1-100`
- schreibt GM-Aktivität
- erzeugt Audit-Event `stadium_pricing_updated`

## Einfluss auf Attendance

Ticketpreise wirken weiter direkt auf die Auslastung:

- faire Preise halten Attendance stabil
- sehr hohe Ticketpreise senken Attendance
- Rivalry/Playoff/Teamform können den Effekt teilweise überlagern, aber nicht komplett entfernen

## Einfluss auf Revenue

Ticket Revenue:

- basiert auf Attendance und `ticketPriceLevel`
- hohe Ticketpreise können mehr Umsatz pro Fan bringen, aber Attendance senken

Merchandise Revenue:

- basiert auf Attendance, FanMood, Marktgröße, Merch-Interesse, Ergebnislage und `merchPriceLevel`
- höhere Merch-Preise steigern Umsatz pro Käufer
- sehr hohe Merch-Preise enthalten eine leichte Nachfragebremse

## Einfluss auf FanMood

Sehr aggressive Ticket- und Merch-Preise belasten FanMood leicht. Damit sind kurzfristige Umsatzoptimierung und langfristige Fan-Stimmung ein Trade-off.

## UI

Im Online-Liga-Dashboard zeigt der Franchise-Bereich jetzt:

- Ticketpreise
- Merch Preise
- vorhandene Attendance-/Revenue-Werte

Der GM kann beide Preislevel über Slider setzen und speichern.

## Tests

Abgedeckt:

- Hohe Ticketpreise senken Attendance.
- GM-Pricing-Aktion schreibt State und Audit-Event.
- Merch-Revenue reagiert auf Merch-Preisänderungen.
- Aggressive Gesamtpreise können FanMood senken.

## Offene Punkte

- Noch keine dynamische Preisempfehlung.
- Noch keine langfristige Season-Ticket-Logik.
- Noch kein separates Nachfrage-Modell nach Produktkategorien.
- Pricing bleibt lokal und ist noch nicht backend-synchronisiert.
