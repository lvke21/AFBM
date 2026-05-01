# Setup

## Zweck

Diese Anleitung beschreibt das einmalige lokale Setup fuer eine neue Entwicklungsumgebung.

## Voraussetzungen

| Voraussetzung | Aktueller Stand |
|---|---|
| Node.js | `>= 20.19.0` |
| npm | passend zu Node 20+ |
| PostgreSQL | lokal laufend oder als erreichbare Entwicklungsinstanz |
| GitHub-Account | nicht notwendig |

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
| `AFBM_APP_USER_ID` | lokale serverseitige Savegame-Owner-ID |
| `E2E_FIREBASE_ADMIN_ID_TOKEN` | optionales E2E-Token fuer Admin-Smokes |
| `NEXT_PUBLIC_AFBM_ONLINE_BACKEND` | `local` oder `firebase` fuer Online-Multiplayer |
| `NEXT_PUBLIC_FIREBASE_*` | nicht geheime Firebase-Web-App-Konfiguration |

Beispiel:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afbm_manager?schema=public"
AFBM_APP_USER_ID="local-gm"
```

removed session and provider login wird nicht mehr verwendet. Setze keine `OLD_SESSION_URL`, `NEXTOLD_SESSION_URL`, `OLD_SESSION_KEY`, `OLD_GH_PROVIDER_ID`, `OLD_GH_PROVIDER_KEY`, `OLD_GH_APP_ID`, `OLD_GH_APP_KEY` oder `OLD_PUBLIC_LOGIN_FLAG` Variablen.

## 4. Datenbank initialisieren

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Wichtige Hinweise:
- Im Repository gibt es aktuell kein versioniertes `prisma/migrations`-Verzeichnis.
- Die erste Migration wird daher lokal erzeugt.
- `npm run prisma:seed` schreibt nur Referenzdaten, keine Savegames.

## 5. Entwicklungsserver starten

```bash
npm run dev
```

Standardmaessig laeuft die Anwendung danach unter `http://localhost:3000`. Wenn Port `3000` belegt ist, waehlt Next.js einen anderen freien Port.

## 6. Erstvalidierung

- `/` sollte erreichbar sein.
- `/app/savegames` sollte ohne external provider auth-Redirect erreichbar sein.
- `/online` sollte keinen external provider auth-Flow oeffnen.
- `/admin` sollte das Firebase Claim-Gate oder den Adminbereich anzeigen.

## 7. Empfohlene Zusatzpruefungen

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

### `/app` oder `/online` oeffnet einen external provider auth-Flow

Moegliche Ursachen:
- alter Dev-Server laeuft noch
- stale `.next/types` oder `.next` Cache
- alte removed session and provider login-Variablen sind noch in lokalen Env-Dateien gesetzt

## Weiterfuehrende Dokumente

- [operations-run-locally.md](./operations-run-locally.md)
- [operations-database.md](./operations-database.md)
