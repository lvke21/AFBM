# Datenbank und Prisma

## Zweck

Dieses Dokument beschreibt den aktuellen Datenbank-Lifecycle des Projekts: Quelle des Datenmodells, Initialisierung, laufende Aenderungen, Reset und typische Fehlerbilder.

## Quelle des Datenmodells

Die fuehrende Quelle fuer persistente Fachdaten ist:

- `prisma/schema.prisma`

Wichtige Begleitdateien:

- `prisma/seed.ts`
- `src/lib/db/prisma.ts`
- `src/modules/shared/infrastructure/reference-data.ts`

## Datenbankprovider

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Aktueller Migrationsstatus

Aktueller Stand im Repository:

- Es gibt kein eingechecktes `prisma/migrations`-Verzeichnis.
- Die erste Migration muss in einer neuen lokalen Umgebung erzeugt werden.

Konsequenz:
- `npm run prisma:migrate -- --name init` ist fuer frische lokale Setups Pflicht.

## Prisma-Commands im Projekt

| Command | Zweck |
|---|---|
| `npm run prisma:generate` | Prisma Client generieren |
| `npm run prisma:migrate -- --name <name>` | Migration lokal erzeugen und anwenden |
| `npm run prisma:seed` | Referenzdaten einspielen |
| `npx prisma migrate reset` | lokale Datenbank resetten und Migrationen neu anwenden |
| `npx prisma studio` | Datenbank ueber Prisma Studio inspizieren |

## Empfohlener Erstablauf

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

## Empfohlener Ablauf bei Schemaaenderungen

1. `prisma/schema.prisma` anpassen
2. Migration erzeugen und anwenden:

```bash
npm run prisma:migrate -- --name <beschreibung>
```

3. Prisma Client sicherheitshalber neu generieren:

```bash
npm run prisma:generate
```

4. Falls Referenzdaten geaendert wurden, neu seeden:

```bash
npm run prisma:seed
```

## Datenbank-Reset in der lokalen Entwicklung

### Wenn bereits lokale Migrationen existieren

```bash
npx prisma migrate reset
```

Das loescht die lokale Entwicklungsdatenbank, wendet die vorhandenen Migrationen neu an und fuehrt den Seed aus.

### Wenn noch keine lokale Migration erzeugt wurde

Dann ist `prisma migrate reset` fuer dieses Projekt noch nicht sinnvoll. In diesem Fall:

1. lokale Datenbank manuell leeren oder neu anlegen
2. erste Migration erzeugen:

```bash
npm run prisma:migrate -- --name init
```

3. Referenzdaten seeden:

```bash
npm run prisma:seed
```

## Datenklassen in der Datenbank

### Auth-Daten

- `User`
- `Account`
- `Session`
- `VerificationToken`

### Referenzdaten

- `LeagueDefinition`
- `ConferenceDefinition`
- `DivisionDefinition`
- `FranchiseTemplate`
- `PositionGroupDefinition`
- `PositionDefinition`
- `ArchetypeDefinition`
- `SchemeFitDefinition`
- `AttributeDefinition`

### Savegame-Laufzeitdaten

- `SaveGame`
- `SaveGameSetting`
- `Season`
- `Team`
- `Player`
- `PlayerRosterProfile`
- `PlayerEvaluation`
- `PlayerAttributeRating`
- `Contract`
- `Match`
- `TeamSeasonStat`
- `RosterTransaction`

### Statistikdaten

- `PlayerCareerStat` und Career-Statblocke
- `PlayerSeasonStat` und Season-Statblocke
- `PlayerMatchStat` und Match-Statblocke
- `TeamMatchStat`

## Was der Seed schreibt

`npm run prisma:seed` schreibt nur Referenzdaten. Es werden dabei keine Savegames, Teams, Spieler oder Seasons angelegt.

## Was die Anwendung aktuell schreibt

### Savegame-Erstellung schreibt

- `SaveGame`
- `SaveGameSetting`
- `Season`
- `Team`
- `TeamSeasonStat`
- `Player`
- `PlayerRosterProfile`
- `PlayerEvaluation`
- `PlayerAttributeRating`
- `Contract`
- `RosterTransaction`
- `PlayerCareerStat` plus Career-Statblocke
- `PlayerSeasonStat` plus Season-Statblocke
- `Match`

### Saison-Simulation schreibt

- `PlayerMatchStat` plus Match-Statblocke
- `TeamMatchStat`
- Fortschreibungen auf bestehende `TeamSeasonStat`
- Fortschreibungen auf bestehende `PlayerSeasonStat` und `PlayerCareerStat`
- Spielerzustand wie `fatigue`, `morale`, `injuryStatus`, `injuryName` und `injuryEndsOn`

## Typische Probleme

### `prisma migrate dev` kann nicht verbinden

Moegliche Ursachen:
- PostgreSQL laeuft nicht
- `DATABASE_URL` ist falsch
- Zugangsdaten stimmen nicht

### Seed laeuft, aber Savegame-Erstellung scheitert

Moegliche Ursachen:
- Migration wurde vorher nicht ausgefuehrt
- Tabellen fehlen
- Prisma Client ist nicht auf dem aktuellen Stand

Empfohlene Reihenfolge:

1. `npm run prisma:migrate -- --name init`
2. `npm run prisma:generate`
3. `npm run prisma:seed`

### Prisma Client und Schema driften auseinander

Loesung:

```bash
npm run prisma:generate
```

### Lokale Datenbank ist in einem unklaren Zustand

Wenn bereits eine lokale Migration existiert:

```bash
npx prisma migrate reset
```

Wenn noch keine lokale Migration existiert:
- Datenbank neu anlegen
- `npm run prisma:migrate -- --name init`
- `npm run prisma:seed`

## Weiterfuehrende Dokumente

- [../architecture/data/state-boundaries.md](../architecture/data/state-boundaries.md)
- [../architecture/data/entities.md](../architecture/data/entities.md)
- [../architecture/data/statistics.md](../architecture/data/statistics.md)
