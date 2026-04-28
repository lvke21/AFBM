# ADR 005: Referenzdaten als Seed-verwaltete relationale Stammdaten

## Status

Accepted

## Datum

2026-04-21

## Kontext

Das Projekt benoetigt stabile Stammdaten fuer:

- Liga und Conferences
- Divisions und Franchise-Templates
- Positionen
- Archetypen
- Scheme Fits
- Attributdefinitionen

Diese Daten sollen von Savegame-Zustand getrennt bleiben und konsistent fuer Bootstrap, UI und spaetere Features verfuegbar sein.

## Entscheidung

Referenzdaten werden in `reference-data.ts` definiert, ueber `prisma/seed.ts` in relationale Tabellen geschrieben und zur Laufzeit nur gelesen.

## Begruendung

- Referenzdaten sind als relationale Datensaetze fuer Queries und Relationen nutzbar.
- Der Seed-Prozess schafft einen kontrollierten Einstiegspunkt.
- Savegames muessen keine Kopien aller Stammdaten erzeugen.

## Alternativen

### Referenzdaten nur als TypeScript-Konstanten im Code

Verworfen, weil:
- relationale Verknuepfung im Schema verloren ginge
- Queries und Foreign Keys erschwert wuerden

### Referenzdaten pro Savegame kopieren

Verworfen, weil:
- unnoetige Datenverdopplung entstuende
- Stammdaten und Laufzeitdaten vermischt wuerden

## Konsequenzen

- Das Projekt benoetigt einen Seed-Schritt fuer frische Umgebungen.
- Referenzdaten existieren aktuell sowohl als Code-Konstanten als auch als DB-Zeilen.
- Normale Laufzeitpfade sollten Referenzdaten nur lesen, nicht veraendern.
