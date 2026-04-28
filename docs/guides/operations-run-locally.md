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
| `http://localhost:3000/app/savegames/{savegameId}/players/{playerId}` | Spieler-Detailansicht |
| `http://localhost:3000/api/auth/signin` | Auth.js Sign-In |
| `http://localhost:3000/auth/setup-required` | Hinweis bei fehlender Auth-Konfiguration |
| `http://localhost:3000/docs/architecture` | kleine In-App-Architekturuebersicht |

Hinweis:
- Wenn `3000` belegt ist, startet Next.js auf einem anderen Port.
- Bei GitHub OAuth muss dann auch die Callback-URL der OAuth App angepasst werden.

## Erwartetes Verhalten

### Ohne konfigurierten Auth-Provider

- Die App startet.
- Oeffentliche Seiten funktionieren.
- Der geschuetzte Bereich `/app` leitet nach `/auth/setup-required` um.

### Mit konfiguriertem GitHub OAuth

- `/api/auth/signin` zeigt den GitHub-Login.
- Nach erfolgreichem Login ist `/app` nutzbar.
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

### GitHub Login funktioniert lokal nicht

Pruefen:
- `AUTH_GITHUB_ID` und `AUTH_GITHUB_SECRET`
- `AUTH_SECRET`
- Callback-URL der GitHub OAuth App
- lokalen Port der laufenden App

### Savegame-Erstellung funktioniert nicht

Moegliche Ursachen:
- keine Anmeldung
- Referenzdaten nicht geseedet
- Datenbank noch nicht migriert

## Weiterfuehrende Dokumente

- [operations-setup.md](./operations-setup.md)
- [operations-database.md](./operations-database.md)
