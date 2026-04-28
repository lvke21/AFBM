# Setup

## Zweck

Diese Anleitung beschreibt das einmalige lokale Setup fuer eine neue Entwicklungsumgebung.

## Voraussetzungen

| Voraussetzung | Aktueller Stand |
|---|---|
| Node.js | `>= 20.19.0` |
| npm | passend zu Node 20+ |
| PostgreSQL | lokal laufend oder als erreichbare Entwicklungsinstanz |
| GitHub-Account | notwendig, wenn der geschuetzte App-Bereich lokal mit Login getestet werden soll |

## 1. Abhaengigkeiten installieren

```bash
npm install
```

Hinweis:
- `postinstall` fuehrt automatisch `prisma generate` aus.

## 2. Lokale Datenbank vorbereiten

Das Projekt erwartet PostgreSQL und eine `DATABASE_URL` im Format aus `.env.example`.

### Option A: Datenbank per CLI anlegen

Wenn `createdb` lokal verfuegbar ist:

```bash
createdb afbm_manager
```

### Option B: Datenbank ueber ein GUI-Tool anlegen

Lege manuell eine Datenbank namens `afbm_manager` an oder passe spaeter `DATABASE_URL` in `.env` an den tatsaechlichen Namen an.

## 3. Umgebungsvariablen anlegen

```bash
cp .env.example .env
```

Aktuelle Variablen:

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungsstring |
| `AUTH_SECRET` | Secret fuer Auth.js |
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret |

Beispiel:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afbm_manager?schema=public"
AUTH_SECRET="replace-with-a-long-random-string"
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
```

### `AUTH_SECRET` sinnvoll setzen

Ein moeglicher Weg:

```bash
openssl rand -base64 32
```

Den erzeugten Wert anschliessend in `.env` hinter `AUTH_SECRET` eintragen.

## 4. GitHub OAuth fuer lokale Entwicklung einrichten

Ohne konfigurierten Provider startet die App technisch zwar, aber der geschuetzte Bereich `/app` bleibt absichtlich gesperrt.

### GitHub OAuth App anlegen

1. GitHub Developer Settings oeffnen.
2. Eine neue OAuth App erstellen.
3. Als Home Page URL eintragen:

```text
http://localhost:3000
```

4. Als Authorization callback URL eintragen:

```text
http://localhost:3000/api/auth/callback/github
```

5. Die erzeugten Werte in `.env` eintragen:
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`

Wichtig:
- Wenn der lokale Dev-Server auf einem anderen Port laeuft, muessen Home Page URL und Callback URL entsprechend angepasst werden.

## 5. Datenbank initialisieren

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Wichtige Hinweise:
- Im Repository gibt es aktuell kein versioniertes `prisma/migrations`-Verzeichnis.
- Die erste Migration wird daher lokal erzeugt.
- `npm run prisma:seed` schreibt nur Referenzdaten, keine Savegames.

## 6. Entwicklungsserver starten

```bash
npm run dev
```

Standardmaessig laeuft die Anwendung danach unter `http://localhost:3000`. Wenn Port `3000` belegt ist, waehlt Next.js einen anderen freien Port.

## 7. Erstvalidierung

### Ohne Auth-Provider

- `/` sollte erreichbar sein.
- `/app` sollte nach `/auth/setup-required` umleiten.

### Mit GitHub OAuth

- `/api/auth/signin` sollte einen GitHub-Login anzeigen.
- Nach erfolgreichem Login sollte `/app/savegames` erreichbar sein.

## 8. Empfohlene Zusatzpruefungen

```bash
npm run test:run
npm run lint
npx tsc --noEmit
```

## Typische Fehler beim Erstsetup

### `DATABASE_URL` ist falsch

Symptome:
- `prisma migrate dev` scheitert
- Seed laeuft nicht

Pruefen:
- Host
- Port
- Benutzername
- Passwort
- Datenbankname

### Keine Migration vorhanden

Symptom:
- Tabellen fehlen trotz installiertem Projekt

Loesung:

```bash
npm run prisma:migrate -- --name init
```

### `/app` bleibt gesperrt

Moegliche Ursachen:
- `AUTH_GITHUB_ID` oder `AUTH_GITHUB_SECRET` nicht gesetzt
- GitHub Callback URL passt nicht zum lokalen Port
- keine gueltige Session vorhanden

## Weiterfuehrende Dokumente

- [operations-run-locally.md](./operations-run-locally.md)
- [operations-database.md](./operations-database.md)
