# Lokales Prisma-E2E-Setup

Ziel: lokale Playwright-E2E-Tests sollen reproduzierbar gegen PostgreSQL laufen.

## Voraussetzungen

- Node.js `>=20.19.0`
- npm dependencies installiert
- Docker Desktop oder Homebrew PostgreSQL 16
- `DATABASE_URL`, z. B. aus `.env.example`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afbm_manager?schema=public"
```

## Standardablauf

```bash
npm run db:up
npm run prisma:migrate
npm run test:e2e:seed
npm run test:e2e
```

`npm run db:up` bevorzugt Docker Compose und wartet, bis PostgreSQL wirklich bereit ist.
Wenn Docker nicht nutzbar ist, versucht das Script Homebrew PostgreSQL 16 unter
`/opt/homebrew/opt/postgresql@16`.

## Preflight

```bash
npm run test:e2e:db-preflight
npm run test:e2e:preflight
```

- `test:e2e:db-preflight` prueft nur `DATABASE_URL`, DB-Socket und Migration-Verzeichnis.
- `test:e2e:preflight` prueft zusaetzlich Chromium und E2E-Port-Konflikte.
- `test:e2e:seed` fuehrt den DB-Preflight automatisch vor dem Seed aus.

## Recovery

Wenn die DB nicht erreichbar ist:

```bash
npm run db:up
```

Wenn der Container oder die lokale Testdatenbank kaputt ist:

```bash
npm run db:reset
npm run prisma:migrate
npm run test:e2e:seed
```

Wenn Port `5432` schon belegt ist, entweder den laufenden PostgreSQL-Dienst nutzen
oder `POSTGRES_PORT` und `DATABASE_URL` konsistent setzen.

Wenn Playwright Chromium fehlt:

```bash
npx playwright install chromium
```

Wenn ein Lauf in einer eingeschraenkten Sandbox `Operation not permitted` fuer
`127.0.0.1:5432` meldet, ist das kein Prisma-Schemafehler. Fuehre denselben
Command in einer lokalen Shell mit Zugriff auf den PostgreSQL-Socket aus:

```bash
npm run db:up
npm run prisma:migrate
npm run test:e2e:seed
npm run test:e2e
```
