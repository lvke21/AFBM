# ADR 004: Savegame-spezifische Datenisolation

## Status

Accepted

## Datum

2026-04-21

## Kontext

Ein Benutzer kann mehrere Savegames besitzen. Jedes Savegame soll seinen eigenen Spielstand kapseln. Teams, Spieler, Seasons, Matches und Vertraege duerfen nicht versehentlich savegame-uebergreifend verknuepft werden.

Reine Filterlogik auf Anwendungsebene waere fehleranfaellig, sobald das Datenmodell waechst oder neue Use Cases hinzukommen.

## Entscheidung

Laufzeitrelevante Modelle tragen `saveGameId`, und zentrale Relationen verwenden savegame-gebundene zusammengesetzte Schluessel wie `[id, saveGameId]`.

## Begruendung

- Die Datenbank erzwingt einen Teil der Savegame-Grenzen selbst.
- Ownership- und Savegame-Pruefungen werden stabiler.
- Neue Module koennen auf ein bestaetigtes Isolationsmuster aufbauen.

## Alternativen

### Nur globale IDs und Filterlogik in Queries

Verworfen, weil:
- Fehler leichter uebersehen werden
- Cross-Savegame-Verknuepfungen schwerer zu verhindern sind

### Separate Datenbank pro Savegame

Verworfen, weil:
- unnoetig hoher Betriebs- und Verwaltungsaufwand entstuende
- die aktuelle Projektgroesse ein gemeinsames relationales Schema besser traegt

## Konsequenzen

- Das Schema ist an einigen Stellen komplexer, weil zusammengesetzte Foreign Keys verwendet werden.
- Neue laufzeitrelevante Tabellen sollten das Savegame-Isolationsmuster mitdenken.
- Dokumentation und Queries muessen die Savegame-Skopierung explizit machen.
