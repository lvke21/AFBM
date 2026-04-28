# ADR 002: PostgreSQL und Prisma als Persistenzbasis

## Status

Accepted

## Datum

2026-04-21

## Kontext

Das Projekt benoetigt langfristig einen stark relationalen Zustand:

- Benutzer besitzen mehrere Savegames
- jedes Savegame besitzt eigene Teams, Seasons, Spieler, Vertraege und Matches
- Spieler haben Rollen, Attribute, Bewertungen und mehrstufige Statistiken
- kuenftige Features wie Transfers, Simulationen und Finanzen brauchen konsistente Beziehungen und Transaktionen

## Entscheidung

Als Datenbank wird PostgreSQL verwendet. Prisma dient als ORM, Schemawerkzeug und Typschicht fuer TypeScript.

## Begruendung

- PostgreSQL eignet sich fuer relationale Modellierung mit Foreign Keys, Constraints und Transaktionen.
- Das Savegame-Modell profitiert von sauberer Normalisierung.
- Statistik- und Standings-Daten lassen sich gut relational abbilden.
- Prisma passt gut in den bestehenden Next.js- und TypeScript-Stack.

## Alternativen

### Dokumentenorientierte Datenbank

Verworfen, weil:
- der Datenbestand viele klar relationale Strukturen besitzt
- Savegame-Isolation, Ownership und Statistikaggregate stark relationale Integritaet brauchen

### Reines SQL ohne ORM

Vorlaeufig nicht gewaehlt, weil:
- Prisma Typsicherheit und Entwicklungsproduktivitaet fuer das aktuelle Projekt deutlich erhoeht
- Read- und Write-Pfade schnell ueber Typed Client und Schemaaenderungen gepflegt werden koennen

## Konsequenzen

- `prisma/schema.prisma` ist die fuehrende Quelle fuer persistente Fachdaten.
- Datenstrukturen sollen bevorzugt relational und nicht als grosse unstrukturierte JSON-Bloecke modelliert werden.
- Lokale Entwicklung benoetigt PostgreSQL.
- Schemaaenderungen muessen nachvollziehbar ueber Prisma gepflegt werden.
