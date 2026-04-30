# Lokal ausfuehren

## Zweck

Dieses Dokument beschreibt den taeglichen lokalen Entwicklungsablauf nach dem Erstsetup.

## Taeglicher Standardablauf

1. Sicherstellen, dass PostgreSQL laeuft.
2. Falls Abhaengigkeiten oder Branch gewechselt wurden:

```bash
npm install
```

3. Falls Schema oder Referenzdaten geaendert wurden:

```bash
npm run prisma:generate
npm run prisma:seed
```

4. Entwicklungsserver starten:

```bash
npm run dev
```

## Wichtige lokale URLs

| URL | Zweck |
|---|---|
| `http://localhost:3000/` | oeffentliche Startseite |
| `http://localhost:3000/app` | geschuetzter App-Bereich |
| `http://localhost:3000/app/savegames` | Savegame-Hub |
| `http://localhost:3000/online` | Online Hub mit Firebase Anonymous Auth |
| `http://localhost:3000/admin/login` | Admin-Code-Login |
| `http://localhost:3000/app/savegames/{savegameId}/players/{playerId}` | Spieler-Detailansicht |
| `http://localhost:3000/docs/architecture` | kleine In-App-Architekturuebersicht |

Hinweis:
- Wenn `3000` belegt ist, startet Next.js auf einem anderen Port.
- Online Spielen und Admin Login benoetigen keine external provider auth Callback URL.

## Erwartetes Verhalten

- Die App startet.
- Oeffentliche Seiten funktionieren.
- `/app` und `/app/savegames` sind ueber die serverseitige App-User-ID nutzbar.
- `/online` nutzt Firebase Anonymous Auth oder den lokalen Online-Fallback.
- `/admin/login` nutzt ausschliesslich den Admin-Code-Login.
- Savegames koennen ueber UI oder API angelegt werden.

## Hauefige lokale Routinen

### Nach Schemaaenderungen

```bash
npm run prisma:migrate -- --name <beschreibung>
npm run prisma:generate
```

### Nach Referenzdaten-Aenderungen

```bash
npm run prisma:seed
```

### Vor einer groesseren lokalen Uebergabe

```bash
npm run test:run
npm run lint
npx tsc --noEmit
```

## Produktionsnah lokal testen

### Build erzeugen

```bash
npm run build
```

### Produktionsserver starten

```bash
npm run start
```

## Typische lokale Probleme

### `next: command not found`

Ursache:
- `node_modules` ist nicht vorhanden oder unvollstaendig

Loesung:

```bash
npm install
```

### Prisma Client veraltet

Symptom:
- TypeScript- oder Laufzeitfehler bei Prisma-Imports

Loesung:

```bash
npm run prisma:generate
```

### Tabellen fehlen

Loesung:

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

### external provider auth/legacy session system erscheint lokal

Pruefen:
- alter Dev-Server laeuft noch
- alte `.env`/`.env.local` Variablen wie `OLD_SESSION_URL`, `NEXTOLD_SESSION_URL`, `OLD_SESSION_KEY`, `OLD_GH_PROVIDER_ID`, `OLD_GH_PROVIDER_KEY`
- stale `.next` Cache nach Entfernen der legacy session system-Route

### Savegame-Erstellung funktioniert nicht

Moegliche Ursachen:
- Datenbank noch nicht migriert
- Referenzdaten nicht geseedet

## Weiterfuehrende Dokumente

- [operations-setup.md](./operations-setup.md)
- [operations-database.md](./operations-database.md)
