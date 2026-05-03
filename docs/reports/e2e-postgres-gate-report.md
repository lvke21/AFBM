# E2E PostgreSQL Gate Report

## Ziel

N101 schliessen: lokale Prisma-/Playwright-E2E-Tests duerfen nicht mehr an einer
unklar fehlenden PostgreSQL-Infrastruktur scheitern.

## Aenderungen

- `npm run db:up` wartet bei Docker Compose auf einen bereiten PostgreSQL-Container.
- `db:up` kann bei nicht nutzbarem Docker auf Homebrew PostgreSQL 16 fallen.
- `scripts/tools/e2e-preflight.mjs` unterstuetzt `--db-only`.
- Neue npm Scripts:
  - `npm run test:e2e:db-preflight`
  - `npm run test:e2e:preflight`
- `npm run test:e2e:seed` fuehrt vor dem Seed einen DB-Preflight aus.
- Runbook: `docs/dev/e2e-postgres-setup.md`.

## Reproduzierbarer Ablauf

```bash
npm run db:up
npm run prisma:migrate
npm run test:e2e:seed
npm run test:e2e
```

## Recovery

```bash
npm run db:reset
npm run prisma:migrate
npm run test:e2e:seed
```

## Restrisiken

- Docker/Homebrew PostgreSQL muessen lokal installiert sein.
- Frische Umgebungen benoetigen weiterhin eine gueltige `DATABASE_URL`.
- E2E kann weiterhin an echten Produkt-/Browserfehlern scheitern; der Infra-Fehler ist jetzt aber klar vorab erkennbar.

## Verifikation

Aktueller Nachweis: `2026-05-02 20:16 CEST`.

| Command | Ergebnis |
| --- | --- |
| `npm run db:up` | Gruen ausserhalb der Sandbox: PostgreSQL auf `127.0.0.1:5432`, DB `afbm_manager` vorhanden. Innerhalb der Sandbox blockte der lokale Socket mit `Operation not permitted`; der gleiche Command lief mit lokaler Infra-Freigabe gruen. |
| `npm run prisma:migrate` | Gruen ausserhalb der Sandbox: Schema bereits synchron, Prisma Client generiert. |
| `npm run test:e2e:seed` | Gruen ausserhalb der Sandbox: DB-Preflight gruen, Seed in `888ms`, 52 Spieler, 24 Prospects. |
| `npm run test:e2e` | Gruen ausserhalb der Sandbox: `e2e/smoke.spec.ts`, 1 passed. Innerhalb der Sandbox meldete der Preflight korrekt die nicht erreichbare DB statt eines rohen Prisma-Errors. |
| `npx tsc --noEmit` | Gruen. |
| `npm run lint` | Gruen. |

Hinweis: Innerhalb der Sandbox kann der DB-Socket mit `Operation not permitted`
blockiert sein. Der Preflight gibt dafuer jetzt den reproduzierbaren lokalen
Setup-Ablauf aus, statt erst im Seed oder Playwright roh zu scheitern.

## Aktueller Status

Der PostgreSQL-/Prisma-Unterbau ist fuer `npm run test:e2e` reproduzierbar.
Der einzige rote lokale Lauf in dieser Runde war ein Sandbox-Socket-Blocker
gegen `localhost:5432`; der Preflight isoliert diesen Fall vor Seed/Playwright
mit konkreten Recovery-Kommandos.
