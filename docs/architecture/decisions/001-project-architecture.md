# ADR 001: Modulare Projektarchitektur

## Status

Accepted

## Datum

2026-04-21

## Kontext

Das Projekt soll eine langfristig wartbare Web-Anwendung fuer ein American-Football-Manager-Spiel werden. Die fachliche Logik wird schrittweise wachsen und kuenftig Savegames, Matchsimulation, Training, Spielerentwicklung, Transfers, Verletzungen und Finanzen umfassen.

Next.js liefert zwar Routing, Rendering, API-Routen und Server Actions, aber keine eigene Facharchitektur. Ohne klare Struktur wuerden DB-Zugriffe und Spiellogik schnell in Komponenten, Pages oder lose Utility-Dateien abwandern.

## Entscheidung

Das Projekt wird modular und geschichtet aufgebaut:

- UI und Routing in `src/app` und `src/components`
- Application Services in `src/modules/*/application`
- modulnahe Read-DTOs in `src/modules/*/domain`
- Datenzugriff in `src/modules/*/infrastructure`
- persistente Modellierung in `prisma/schema.prisma`

## Begruendung

- UI und Fachlogik bleiben getrennt.
- Use Cases wie Savegame-Bootstrap oder Query-Mapping erhalten einen klaren Ort.
- Prisma-Zugriffe werden ueber Repositories gekapselt.
- Die Struktur ist klein genug fuer ein einzelnes Projekt und trotzdem belastbar fuer spaetere Erweiterung.

## Alternativen

### Alles direkt in Pages, API-Routen und Komponenten

Verworfen, weil:
- Fachlogik und Datenzugriff schnell unstrukturiert werden
- Ownership- und Persistenzregeln schwer konsistent zu halten sind

### Vollstaendige DDD-/Hexagonal-Architektur mit reichen Aggregaten

Vorlaeufig nicht gewaehlt, weil:
- das Projekt aktuell noch im Scaffold-Stadium ist
- die aktuelle Groesse eine leichtere Struktur erlaubt
- die Domain-Schicht derzeit primar Read-DTOs benoetigt

## Konsequenzen

- Fachlogik gehoert nicht in React-Komponenten.
- Neue Features sollten als Modul oder Modulerweiterung eingeordnet werden.
- Die aktuelle Domain-Schicht ist bewusst DTO-orientiert und nicht aggregate-orientiert.
- Query-Services und Repositories sind zentrale Erweiterungspunkte.
