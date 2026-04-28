# Module und Verantwortlichkeiten

## Zweck

Dieses Dokument beschreibt, welche Teile des Codes fachlich welche Verantwortung tragen. Es soll vor allem bei folgenden Fragen helfen:

- Wo gehoert eine neue Funktion fachlich hin?
- Welches Modul liest oder schreibt welche Daten?
- Welche Teile sind heute schon write-faehig und welche nur read-seitig vorhanden?

## Modulueberblick

| Bereich | Pfad | Hauptverantwortung | Read | Write |
|---|---|---|---|---|
| Savegames | `src/modules/savegames` | Savegame-Erzeugung, Bootstrap, Savegame-Readmodelle | ja | ja |
| Gameplay | `src/modules/gameplay` | in-memory Gameplay-Kern fuer Rulesets, Legality, Playbooks, Selection, Resolution und Calibration | nein | nein |
| Teams | `src/modules/teams` | Team- und Roster-Readmodelle | ja | nein |
| Seasons | `src/modules/seasons` | Saison-Readmodelle, Standings, Matches und Saisonfortschritt | ja | ja |
| Shared | `src/modules/shared` | Referenzdaten und Seed-nahe Datenquellen | ja | seed-gesteuert |
| Auth | `src/auth.ts`, `src/lib/auth/*` | Provider, Session, Zugriffsschutz | ja | indirekt |
| UI / Routing | `src/app`, `src/components` | Pages, Layouts, API-Routen, Server Actions | ja | delegiert |
| Persistenzbasis | `prisma/` | Datenmodell und Seed-Einstieg | ja | ja |

## Savegames-Modul

### Verantwortung

- neues Savegame anlegen
- Startseason und Savegame-Einstellungen erzeugen
- initiale Spielwelt bootstrappen
- Savegame-Daten fuer UI und API aufbereiten

### Wichtige Dateien

| Datei | Rolle |
|---|---|
| `application/savegame-command.service.ts` | validiert Eingaben, erzeugt Savegame, Settings und Season |
| `application/bootstrap/bootstrap-savegame-world.service.ts` | erzeugt Teams, Spieler, Ratings, Vertrage, Stats und Schedule |
| `application/bootstrap/initial-roster.ts` | definiert Kaderstruktur, Attribute, Archetypen und Overalls |
| `application/bootstrap/player-stat-shells.ts` | legt Career- und Season-Statistik-Shells an |
| `application/bootstrap/double-round-robin-schedule.ts` | erzeugt den aktuellen 14-Wochen-Spielplan |
| `application/savegame-query.service.ts` | mappt Persistenzdaten auf Savegame-Readmodelle |
| `domain/savegame.types.ts` | Read-DTOs fuer Savegame-Liste, Detail und Snapshot |
| `infrastructure/savegame.repository.ts` | Prisma-Reads fuer Savegames |

### Externe Einstiegspunkte

- Server Action: `src/app/app/savegames/actions.ts`
- API: `POST /api/savegames`, `GET /api/savegames`, `GET /api/savegames/[savegameId]`
- Pages: `src/app/app/savegames/page.tsx`, `src/app/app/savegames/[savegameId]/page.tsx`

## Teams-Modul

### Verantwortung

- ein Team im Savegame-Kontext lesen
- Roster, Rollen, Evaluation, Vertragsausschnitt und Season-Werte fuer die UI aufbereiten

### Wichtige Dateien

| Datei | Rolle |
|---|---|
| `application/team-query.service.ts` | erzeugt `TeamDetail` und `TeamPlayerSummary` |
| `domain/team.types.ts` | Read-DTOs fuer Team und Spielerlisten |
| `infrastructure/team.repository.ts` | Prisma-Read fuer Team-Details mit Relationen |

### Externe Einstiegspunkte

- API: `GET /api/savegames/[savegameId]/teams/[teamId]`
- Page: `src/app/app/savegames/[savegameId]/teams/[teamId]/page.tsx`

### Hinweise

- Das Modul ist aktuell read-only.
- Schreiblogik fuer Signings, Releases, Depth Chart oder Trades existiert noch nicht.

## Gameplay-Modul

### Verantwortung

- kapselt den neuen fachlichen Gameplay-Kern fuer:
  - Competition Rules
  - Pre-Snap Legality
  - Playbook-Policies
  - Play-Library
  - Play-Selection
  - Play-Resolution
  - Simulation Metrics und Calibration

### Wichtige Dateien

| Datei | Rolle |
|---|---|
| `domain/competition-rules.ts` | ruleset-neutrale Kapsel fuer NFL-vs-College-Profile |
| `domain/game-situation.ts` | normalisierte Spielsituation fuer Selection und Resolution |
| `domain/pre-snap-structure.ts` | normalisierte Pre-Snap-Struktur fuer Personnel, Formation, Alignment, Motion und Shift |
| `domain/pre-snap-legality.ts` | Ergebnistypen fuer Legality Validation |
| `domain/play-call.ts` | aliasnahe Exportflaeche fuer Play-Call-Konzepte |
| `domain/playbook.ts` | gewichtete Policy-Strukturen fuer Offense und Defense |
| `domain/play-library.ts` | Trennung von Formation, Familie und Konzept |
| `domain/play-selection.ts` | Typen fuer situatives Playcalling |
| `domain/play-resolution.ts` | Typen fuer probabilistische Outcome-Modelle |
| `domain/simulation-metrics.ts` | EPA-/WP-nahe Bewertungsports |
| `domain/calibration.ts` | Strukturen fuer Regel-, Verteilungs- und Kalibrierungstests |
| `application/pre-snap-legality-engine.ts` | produktiver Legality-Validator fuer Selection und Resolution |
| `application/play-library-service.ts` | Catalog-Lookups, Serialisierung und Play-Validierung |
| `application/play-selection-engine.ts` | situative, gewichtete Play Selection mit Trace |
| `application/outcome-resolution-engine.ts` | probabilistische Run-/Pass-Resolution mit Value-Layer |
| `application/gameplay-calibration.ts` | Batch-Simulation, Beobachtungen und Calibration-Szenarien |
| `infrastructure/play-library.ts` | erste referenzielle Offensive- und Defensive-Play-Library |
| `infrastructure/default-playbooks.ts` | Default-Policies fuer Offense und Defense |

### Hinweise

- Das Modul ist fachlich aktiv und voll testbar, aber noch nicht an den produktiven Seasons-Write-Flow angebunden.
- Es arbeitet heute rein in-memory und ohne direkte Persistenz.
- Die produktive Matchsimulation bleibt bis zur spaeteren Integration in `src/modules/seasons/application/simulation/*`.

Details: [gameplay-engine.md](./gameplay-engine.md)

## Seasons-Modul

### Verantwortung

- Saison ueber Savegame und Ownership lesen
- Standings und Matchliste aufbereiten
- offene Wochen eines Savegames simulieren
- Match-, Team- und Spielerstatistiken fortschreiben
- Season-Woche und Season-Phase weiterbewegen

### Wichtige Dateien

| Datei | Rolle |
|---|---|
| `application/season-query.service.ts` | erzeugt `SeasonOverview` |
| `application/season-simulation.service.ts` | orchestriert die Simulation einer Saisonwoche und Persistenz aller Folgeupdates |
| `application/simulation/match-engine.ts` | drive-basierte Matchsimulation und Stat-Generierung |
| `application/simulation/depth-chart.ts` | Starter- und Rollenaufbereitung aus `PlayerRosterProfile` |
| `application/simulation/season-progression.ts` | pure Fortschrittslogik fuer `week` und `phase` |
| `domain/season.types.ts` | Read-DTOs fuer Saisonansicht |
| `infrastructure/season.repository.ts` | Prisma-Read fuer Season, Standings und Matches |
| `infrastructure/simulation/season-simulation.repository.ts` | Prisma-Lesezugriff fuer Simulationskontexte |

### Externe Einstiegspunkte

- API: `GET /api/savegames/[savegameId]/seasons/[seasonId]`
- Page: `src/app/app/savegames/[savegameId]/seasons/[seasonId]/page.tsx`
- Server Action: `src/app/app/savegames/[savegameId]/seasons/[seasonId]/actions.ts`

### Hinweise

- Das Modul besitzt jetzt einen ersten produktiven Write-Flow fuer die Simulation einer Woche.
- Playoffs, Mehrjahresfortschritt, Verletzungsfolgen und Trainingsprozesse sind noch nicht implementiert.

## Shared-Modul

### Verantwortung

- Referenzdaten definieren
- Referenzdaten in die Datenbank seeden
- Referenzdaten fuer Bootstrap und UI-Auswahl bereitstellen

### Wichtige Dateien

| Datei | Rolle |
|---|---|
| `infrastructure/reference-data.ts` | Seeddefinitionen, Upsert-Logik und Read-Helfer fuer Referenzdaten |

### Hinweise

- `reference-data.ts` ist aktuell gleichzeitig Seedquelle und Laufzeitkonstante.
- Das Savegame-Formular verwendet Franchise-Auswahloptionen direkt aus `FRANCHISE_TEMPLATES`.

## Auth- und Infrastruktur-Bereich

### Verantwortung

- Auth.js initialisieren
- GitHub OAuth bei gesetzten Env-Variablen registrieren
- Session in `session.user.id` ueberfuehren
- Zugriffsschutz fuer Pages und APIs bereitstellen

### Wichtige Dateien

| Datei | Rolle |
|---|---|
| `src/auth.ts` | Auth.js-Konfiguration mit Prisma Adapter |
| `src/lib/auth/provider-config.ts` | Provider-Registrierung und Provider-Status |
| `src/lib/auth/session.ts` | `requirePageUserId()` und `requireApiUserId()` |
| `src/types/next-auth.d.ts` | erweitert den Session-Typ um `user.id` |

## UI- und Routing-Bereich

### Verantwortung

- oeffentliche und geschuetzte Seitenstruktur
- Server Actions
- API-Routen
- Darstellungskomponenten

### Page- und Route-Matrix

| Einstiegspunkt | Typ | Verwendete Services |
|---|---|---|
| `/` | oeffentliche Page | keine Fachqueries |
| `/app` | geschuetzte Page | `listSaveGames()` |
| `/app/savegames` | geschuetzte Page | `listSaveGames()` |
| `/app/savegames/[savegameId]` | geschuetzte Page | `getSaveGameFlowSnapshot()` |
| `/app/savegames/[savegameId]/teams/[teamId]` | geschuetzte Page | `getTeamDetailForUser()` |
| `/app/savegames/[savegameId]/seasons/[seasonId]` | geschuetzte Page | `getSeasonOverviewForUser()` |
| `/api/savegames` | API | `listSaveGames()`, `createSaveGame()` |
| `/api/savegames/[savegameId]` | API | `getSaveGameDetail()` |
| `/api/savegames/[savegameId]/teams/[teamId]` | API | `getTeamDetailForUser()` |
| `/api/savegames/[savegameId]/seasons/[seasonId]` | API | `getSeasonOverviewForUser()` |

## Persistenzbasis

### Verantwortung

- Prisma-Schema definieren
- Seed-Einstieg bereitstellen
- DB-Struktur als fuehrende persistente Quelle halten

### Wichtige Dateien

| Datei | Rolle |
|---|---|
| `prisma/schema.prisma` | relationale Modellierung |
| `prisma/seed.ts` | Einstieg in den Referenzdaten-Seed |

## Derzeit fehlende Fachmodule

Diese Bereiche besitzen im aktuellen Projekt noch kein eigenes Modul:

- Training
- Finanzen
- Transfers als Workflow
- Verletzungshistorie

## Weiterfuehrende Dokumente

- [architecture.md](./architecture.md)
- [data-flow.md](./data-flow.md)
- [./data/enums-and-read-models.md](./data/enums-and-read-models.md)
