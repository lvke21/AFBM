# AFBM Manager

AFBM Manager ist ein technisches Fundament fuer ein American-Football-Manager-Spiel als Web-Anwendung. Das Projekt setzt auf Next.js, TypeScript, Prisma und PostgreSQL und trennt UI, Anwendungslogik, Readmodelle und Persistenz bewusst voneinander.

Der aktuelle Stand ist ein solides Grundsystem fuer persistente Savegames:
- Benutzergebundene Savegames koennen erstellt werden.
- Ein Savegame erzeugt beim Bootstrap Teams, Spieler, Vertrage, Ratings, Attributwerte, Season-Stats und einen Spielplan.
- Savegame-, Team- und Saisonansichten lesen den Zustand ueber Query-Services und Repositories.
- Team- und Spieleransichten zeigen jetzt positionsspezifische Detailratings, neue Coverage-/Special-Teams-Attribute und tiefere Season-/Career-Statauswertung.
- Team-Schemes, Scheme-Fit-Scoring, Development-Focus und Injured-Reserve-Steuerung machen das usergesteuerte Roster deutlich aktiver.
- Match-Details zeigen jetzt Boxscore-nahe Teamwerte, Top-Performer und eine kurze Spielzusammenfassung pro Match.
- Vertragsausblick, Finance-Log und saisonale Gehaltsbuchungen machen Cash und Kaderplanung sichtbarer.
- Authentifizierung und Ownership-Pruefungen gelten fuer geschuetzte Seiten, API-Routen und Server Actions.
- Die aktuelle Saison kann wochenweise simuliert werden; Match-, Team- und Spielerstatistiken werden dabei fortgeschrieben, inklusive verbesserter Recovery-, Coverage- und Special-Teams-Logik.
- Nach einer Offseason kann jetzt direkt eine neue Saison mit frischen Team-/Player-Season-Shells, Schedule und Vertragsfortschreibung gestartet werden.

## Aktueller Implementierungsstand

### Bereits implementiert

- Projektstruktur und modulare Schichtung
- Auth.js mit Prisma Adapter und Datenbank-Sessions
- Referenzdaten fuer Liga, Franchises, Positionen, Archetypen, Scheme Fits und Attribute
- Savegame-Erstellung inklusive World-Bootstrap
- Persistenz fuer Teams, Spieler, Roster-Profile, Player-Evaluation, Attribute, Vertraege, Seasons und Matches
- Strukturierte Spielerstatistik auf Career-, Season- und Match-Ebene im Schema
- Team-, Saison- und Savegame-Ansichten
- Player-Detail-Flow mit Detailratings, Attributgruppen sowie Season- und Career-Stats
- Erste drive-basierte Matchsimulation mit Saisonfortschritt, Positionsverfeinerung und aktiverer Special-Teams-/Coverage-Logik
- Weekly-Development-Prozess mit Re-Evaluation der Spielerattribute und Player-History-Eintraegen
- Bearbeitbares Team-Management fuer Team-Schemes, Depth Chart, Return-Rollen, Captain-Flags, Development Focus, Injured Reserve, Releases und Free-Agent-Signings
- Playoff-Uebergang nach der Regular Season inklusive Playoff Picture in der Saisonansicht
- Multi-Season-Fortschreibung mit Offseason-Rollover, Alterung, Vertragsablauf und neuer Saisoninitialisierung
- Match-Detailseiten mit Teamstats, Recap und Top-Performern

### Im Datenmodell vorhanden, aber noch nicht voll ausgebaut

- `PlayerCareerStat` und `PlayerSeasonStat` als initialisierte Statistikaggregate
- Roster-Rollen, Depth-Chart-Slots, Scheme Fits und Archetypen als Grundlage fuer spaetere Kaderlogik
- Matchsimulation ist als erste vertikale Saisonfortschreibung vorhanden, aber noch bewusst vereinfacht

### Noch nicht voll ausgebaut

- Trades und echte Transfer-Verhandlungen
- Vollstaendige Finanzbuchungen inklusive Dead-Cap-/Cap-Rollover-Logik
- Match-Events, Play-by-Play und Boxscore-artige Matchberichte
- Mehrjahreslogik fuer Draft, Offseason-Talentzufluss und langfristige Franchise-Progression
- Tiefere Trainings-/Coaching-Systeme jenseits des aktuellen Development-Focus- und Weekly-Development-Slices

## Tech-Stack

| Bereich | Technologie | Rolle im Projekt |
|---|---|---|
| Web-App | Next.js 15, React 19 | UI, Routing, Server Components, API-Routen, Server Actions |
| Sprache | TypeScript | Typsicherheit in UI, Services und Persistenz |
| Styling | Tailwind CSS 4 | Styling der Web-Oberflaeche |
| Persistenz | Prisma 6, PostgreSQL | Relationales Schema und Datenzugriff |
| Auth | Auth.js 5 beta, Prisma Adapter | Benutzerkonten, Sign-In, Session-Management |
| Validierung | Zod | Eingabevalidierung fuer Savegame-Erstellung |
| Tests | Vitest | Aktuelle Modultests fuer Bootstrap-Bausteine |

## Kernbegriffe

- **Referenzdaten**: Statische Stammdaten wie Liga, Franchises, Positionen oder Attribute. Sie werden ueber den Seed-Prozess gepflegt.
- **Savegame-Zustand**: Dynamische, benutzergebundene Daten wie Teams, Spieler, Seasons, Matches und Vertraege.
- **Bootstrap**: Der Initialaufbau eines neuen Savegames.
- **Readmodell**: Ein auf UI oder API zugeschnittener Datenausschnitt, der aus Prisma-Daten zusammengesetzt wird.
- **Application Service**: Ein orchestrierender Use Case ausserhalb von React-Komponenten.

## Schnellstart

1. Voraussetzungen sicherstellen:
   - Node.js `>= 20.19.0`
   - npm
   - PostgreSQL
2. Abhaengigkeiten installieren:

```bash
npm install
```

3. Umgebungsvariablen anlegen:

```bash
cp .env.example .env
```

4. Lokale Datenbank initialisieren:

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

5. Entwicklungsserver starten:

```bash
npm run dev
```

6. Optional fuer den geschuetzten App-Bereich GitHub OAuth lokal konfigurieren:
   - Details: [docs/guides/operations-setup.md](./docs/guides/operations-setup.md)

## Wichtige Commands

| Command | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver starten |
| `npm run build` | Produktionsbuild erzeugen |
| `npm run start` | Produktionsserver lokal im Produktionsmodus starten |
| `npm run lint` | ESLint ausfuehren |
| `npm run test` | Vitest im Watch-Modus |
| `npm run test:run` | Vitest einmalig ausfuehren |
| `npm run prisma:generate` | Prisma Client generieren |
| `npm run prisma:migrate -- --name <name>` | Migration erzeugen und lokal anwenden |
| `npm run prisma:seed` | Referenzdaten einspielen |
| `npx prisma migrate reset` | Lokale Entwicklungsdatenbank zuruecksetzen |
| `npx prisma studio` | Prisma Studio oeffnen |

## Dokumentation

Der empfohlene Einstieg in die Dokumentation ist [docs/README.md](./docs/README.md).

### System

- [docs/architecture/architecture.md](./docs/architecture/architecture.md)
- [docs/architecture/modules.md](./docs/architecture/modules.md)
- [docs/architecture/data-flow.md](./docs/architecture/data-flow.md)

### Betrieb

- [docs/guides/operations-setup.md](./docs/guides/operations-setup.md)
- [docs/guides/operations-run-locally.md](./docs/guides/operations-run-locally.md)
- [docs/guides/operations-database.md](./docs/guides/operations-database.md)

### Daten

- [docs/architecture/data/entities.md](./docs/architecture/data/entities.md)
- [docs/architecture/data/relations.md](./docs/architecture/data/relations.md)
- [docs/architecture/data/player-model.md](./docs/architecture/data/player-model.md)
- [docs/architecture/data/statistics.md](./docs/architecture/data/statistics.md)
- [docs/architecture/data/state-boundaries.md](./docs/architecture/data/state-boundaries.md)
- [docs/architecture/data/enums-and-read-models.md](./docs/architecture/data/enums-and-read-models.md)

### Entscheidungen

- [docs/architecture/decisions/001-project-architecture.md](./docs/architecture/decisions/001-project-architecture.md)
- [docs/architecture/decisions/002-database-choice.md](./docs/architecture/decisions/002-database-choice.md)
- [docs/architecture/decisions/003-authentication-strategy.md](./docs/architecture/decisions/003-authentication-strategy.md)
- [docs/architecture/decisions/004-savegame-data-isolation.md](./docs/architecture/decisions/004-savegame-data-isolation.md)
- [docs/architecture/decisions/005-reference-data-management.md](./docs/architecture/decisions/005-reference-data-management.md)
- [docs/architecture/decisions/006-first-match-simulation-slice.md](./docs/architecture/decisions/006-first-match-simulation-slice.md)

### Historie

- [CHANGELOG.md](./CHANGELOG.md)

## Bekannte Grenzen des aktuellen Stands

- Im Repository ist derzeit kein `prisma/migrations`-Verzeichnis eingecheckt. Eine frische lokale Umgebung muss die erste Migration lokal erzeugen.
- Der geschuetzte App-Bereich unter `/app` ist nur mit konfiguriertem Auth-Provider nutzbar.
- Die aktuelle Matchsimulation ist bewusst ein erster vertikaler Slice und noch keine vollstaendige Play-by-Play-Engine.
# AFBM
