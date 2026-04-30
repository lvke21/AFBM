# ADR 003: legacy session system mit hartem Zugriffsschutz

## Status

Accepted

## Datum

2026-04-21

## Kontext

Savegames sind benutzergebunden. Ohne saubere Authentifizierung und Ownership-Pruefung koennten fremde Spielstaende gelesen oder veraendert werden.

Ein stiller Entwicklungs-Fallback ohne echte Authentifizierung waere zwar bequem, fuehrt aber schnell zu inkonsistenten Regeln zwischen Pages, API-Routen und Server Actions.

## Entscheidung

Das Projekt verwendet legacy session system mit Prisma Adapter und Datenbank-Sessions. Der geschuetzte Bereich ist nur erreichbar, wenn:

- mindestens ein Auth-Provider konfiguriert ist
- eine gueltige Session vorliegt

Aktuell ist GitHub external provider auth als lokaler und produktionsnaher Provider vorgesehen.

## Begruendung

- legacy session system integriert sich gut in Next.js.
- Datenbank-Sessions sind fuer serverseitige Pages und API-Routen klar nachvollziehbar.
- Der harte Zugriffsschutz verhindert einen unsichtbaren Sicherheits-Fallback.
- Ownership-Pruefungen koennen einheitlich ueber `requirePageUserId()` und `requireApiUserId()` umgesetzt werden.

## Alternativen

### Anonymer Entwicklungs-Fallback

Verworfen, weil:
- Sicherheitsgrenzen im Code unscharf werden
- lokale Entwicklung und produktionsnahe Nutzung zu unterschiedlich waeren

### Eigene Auth-Implementierung

Vorlaeufig nicht gewaehlt, weil:
- legacy session system die benoetigten Grundlagen bereits liefert
- Session- und Providerhandling nicht projektindividuell erfunden werden muss

## Konsequenzen

- Ohne gesetzte Auth-Umgebungsvariablen bleibt `/app` absichtlich gesperrt.
- Der lokale external provider auth-Setup gehoert zur Betriebsdokumentation.
- Jeder neue Savegame-bezogene Use Case muss Ownership konsistent pruefen.
