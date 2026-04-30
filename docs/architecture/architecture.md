# Systemarchitektur

## Zweck

Dieses Dokument beschreibt den aktuellen technischen Ist-Zustand des Systems. Es beantwortet die Fragen:

- Welche Laufzeitkomponenten existieren?
- Wie sind UI, Application Layer, Domain-Typen und Persistenz getrennt?
- Welche Teile sind heute bereits produktiv genutzt?
- Welche Teile sind nur als Datenstruktur oder Erweiterungspunkt vorhanden?

## Systemkontext

AFBM Manager ist eine einzelne Next.js-Anwendung. Es existiert derzeit kein separates Backend-Projekt und kein separater Worker-Prozess. Serverseitige Logik laeuft innerhalb derselben Anwendung ueber App Router, API-Routen, Server Actions und modulare Application Services.

## Technischer Rahmen

| Bereich | Aktueller Stand | Quelle |
|---|---|---|
| Web-Framework | Next.js 15.2.9 | [package.json](/Users/lukashanzi/Documents/AFBM/package.json:8) |
| UI | React 19, Tailwind CSS 4 | [package.json](/Users/lukashanzi/Documents/AFBM/package.json:23) |
| Sprache | TypeScript | [package.json](/Users/lukashanzi/Documents/AFBM/package.json:32) |
| Auth | legacy session system 5 beta, Prisma Adapter, Datenbank-Sessions | [src/auth.ts](/Users/lukashanzi/Documents/AFBM/src/auth.ts:1) |
| Persistenz | Prisma 6 + PostgreSQL | [prisma/schema.prisma](/Users/lukashanzi/Documents/AFBM/prisma/schema.prisma:1) |
| Tests | Vitest | [package.json](/Users/lukashanzi/Documents/AFBM/package.json:14) |

## Laufzeitkomponenten

### Oeffentliche Seiten

- `/` in `src/app/page.tsx`
- `/docs/architecture` in `src/app/docs/architecture/page.tsx`
- `/auth/setup-required` in `src/app/auth/setup-required/page.tsx`

Diese Seiten sind ohne Session erreichbar.

### Geschuetzter App-Bereich

- `/app`
- `/app/savegames`
- `/app/savegames/[savegameId]`
- `/app/savegames/[savegameId]/teams/[teamId]`
- `/app/savegames/[savegameId]/seasons/[seasonId]`

Der gemeinsame Einstiegspunkt ist `src/app/app/layout.tsx`. Dort wird `requirePageUserId()` aufgerufen. Ohne konfigurierten Provider erfolgt eine Umleitung nach `/auth/setup-required`, ohne Session eine Umleitung nach `/removed-auth-route/signin`.

### API-Routen

- `GET /api/savegames`
- `POST /api/savegames`
- `GET /api/savegames/[savegameId]`
- `GET /api/savegames/[savegameId]/teams/[teamId]`
- `GET /api/savegames/[savegameId]/seasons/[seasonId]`
- legacy session system Handler unter `/removed-auth-route/[...nextauth]`

### Server Actions

- `createSaveGameAction(formData)` in `src/app/app/savegames/actions.ts`
- `simulateSeasonWeekAction(formData)` in `src/app/app/savegames/[savegameId]/seasons/[seasonId]/actions.ts`

## Schichtenmodell

### 1. UI-Schicht

**Pfade:** `src/app`, `src/components`

Verantwortung:
- Routen und Seitenstruktur
- Formulare und Layouts
- Rendering bereits aufbereiteter Readmodelle

Die UI-Schicht enthaelt bewusst keine Spiel- oder Persistenzlogik.

Beispiele:
- `src/app/app/savegames/page.tsx`
- `src/app/app/savegames/[savegameId]/teams/[teamId]/page.tsx`
- `src/components/ui/create-savegame-form.tsx`

### 2. Application Layer

**Pfad:** `src/modules/*/application`

Verantwortung:
- Use Cases orchestrieren
- Persistenzzugriffe koordinieren
- Readmodelle fuer UI und API zusammensetzen
- Savegame-Bootstrap ausfuehren

Beispiele:
- `savegame-command.service.ts`
- `bootstrap-savegame-world.service.ts`
- `savegame-query.service.ts`
- `team-query.service.ts`
- `season-query.service.ts`
- `season-simulation.service.ts`

### 3. Domain-/Typ-Schicht

**Pfad:** `src/modules/*/domain`

Aktueller Stand:
- enthaelt vor allem Read-DTOs
- enthaelt im Gameplay-Modul inzwischen auch reichhaltigere, engine-nahe Fachtypen fuer Regeln, Plays, Selection und Resolution

Wichtige Readmodelle:
- `SaveGameDetail`
- `SaveGameFlowSnapshot`
- `SeasonOverview`
- `TeamDetail`
- `TeamPlayerSummary`

### 4. Persistenz- und Infrastruktur-Schicht

**Pfade:** `src/modules/*/infrastructure`, `src/lib`, `prisma/`

Verantwortung:
- Prisma-Schema und Datenmodell
- Repositories fuer Savegames, Teams und Seasons
- Prisma Client
- Referenzdatenzugriff und Seedlogik
- Auth-Infrastruktur

Wichtige Dateien:
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/db/prisma.ts`
- `src/modules/shared/infrastructure/reference-data.ts`
- `src/auth.ts`

## Zentrale Architekturprinzipien

### UI und Spiellogik sind getrennt

React-Komponenten rendern Daten und stoessen Use Cases an. Die Spiellogik liegt in Services ausserhalb der Komponenten.

### Referenzdaten und Savegame-Zustand sind getrennt

- Referenzdaten werden ueber `prisma/seed.ts` und `reference-data.ts` gepflegt.
- Savegame-Zustand wird zur Laufzeit ueber Application Services erzeugt und gelesen.

### Savegame-Skopierung ist ein Kernprinzip

Viele laufzeitrelevante Modelle tragen `saveGameId`, und mehrere Relationen referenzieren zusammengesetzte Schluessel wie `[id, saveGameId]`. Das reduziert savegame-uebergreifende Verknuepfung.

### Es gibt kein stilles Auth-Fallback

Der geschuetzte App-Bereich ist nur mit konfiguriertem Auth-Provider und gueltiger Session nutzbar.

## Modulgrenzen in Kurzform

| Modul | Rolle im System |
|---|---|
| `savegames` | Savegame-Erzeugung, Bootstrap, Savegame-Reads |
| `gameplay` | in-memory Gameplay-Kern fuer Legality, Playbooks, Selection, Resolution und Calibration |
| `teams` | Team-Detail-Reads inklusive Rosterzuschnitt |
| `seasons` | Saison-Reads, Matchliste und Saisonfortschritt |
| `shared` | Referenzdaten und gemeinsame Datenquellen |
| `lib/auth` | Auth-Konfiguration, Session-Aufloesung, Ownership-Grundlagen |

Details: [modules.md](./modules.md)

## Aktuell vorhandene Schreibpfade

- Referenzdaten-Seed ueber `prisma/seed.ts`
- Savegame-Erstellung ueber:
  - Server Action `createSaveGameAction`
  - API `POST /api/savegames`
- Saisonfortschritt ueber:
  - Server Action `simulateSeasonWeekAction`
  - `season-simulation.service.ts`

Es gibt derzeit noch keine produktiven Schreibpfade fuer:
- Training
- Transfers als Workflow
- Finanzbuchungen

## Aktuell vorhandene Lesepfade

- Savegame-Liste und Savegame-Detail
- Dashboard
- Team-Detail
- Saison-Detail
- JSON-API fuer Savegames, Teams und Seasons

## Aktueller Funktionsstand nach Schicht

| Bereich | Heute produktiv genutzt | Nur im Schema vorbereitet | Noch nicht modelliert oder nicht implementiert |
|---|---|---|---|
| Teams und Spieler | ja | - | - |
| Player-Evaluation und Attribute | ja | - | - |
| TeamSeasonStat | ja | - | - |
| PlayerCareerStat und PlayerSeasonStat | ja, als initiale Shells | - | - |
| PlayerMatchStat und TeamMatchStat | ja | - | - |
| Matchsimulation | ja, als erste vereinfachte Stufe im Seasons-Slice | Gameplay-Kern parallel vorhanden | produktive Play-by-Play-Integration, Verletzungen, Special Teams |
| Training und Finanzen | nein | nein | ja |
| MatchEvent / Play-by-Play | nein | nein | ja |

## Bekannte Grenzen des aktuellen Stands

- Die Domain-Schicht ist ausserhalb des Gameplay-Moduls weiterhin stark DTO-orientiert.
- Der neue Gameplay-Kern ist noch nicht in den produktiven Seasons-Write-Flow eingehangen.
- Es gibt noch keine versionierten Prisma-Migrationen im Repository.
- Die geschuetzte Anwendung ist lokal erst nach konfiguriertem external provider auth-Provider voll nutzbar.
- Die aktuelle produktive Matchsimulation ist bewusst vereinfacht; der neue Gameplay-Kern existiert parallel und ist noch nicht live verdrahtet.

## Weiterfuehrende Dokumente

- [modules.md](./modules.md)
- [data-flow.md](./data-flow.md)
- [gameplay-engine.md](./gameplay-engine.md)
- [./data/state-boundaries.md](./data/state-boundaries.md)
- [./data/enums-and-read-models.md](./data/enums-and-read-models.md)
