# Firebase Backfill and Compare Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Rolle: Senior Data Migration Engineer und QA Engineer  
Status: **Gruen**

## Executive Summary

Der lokale Backfill- und Vergleichsprozess zwischen Prisma/PostgreSQL und Firestore Emulator ist implementiert und validiert.

Es wurde keine produktive Aktivierung vorgenommen, keine Prisma-Entfernung durchgefuehrt und keine Auth-Aenderung umgesetzt. Firestore bleibt durch die bestehenden Emulator-/`demo-*` Guards geschuetzt.

## Implementierte Dateien

- `scripts/firestore-backfill.ts`
  - Liest Prisma-SaveGames inklusive User, League Definition, Settings, Teams, Players, Seasons, Matches, Drives und Stats.
  - Schreibt die Daten in die Firestore-Collections:
    - `users`
    - `leagues`
    - `leagueMembers`
    - `teams`
    - `players`
    - `seasons`
    - `weeks`
    - `matches`
    - `gameEvents`
    - `playerStats`
    - `teamStats`
    - `reports`
  - Nutzt `ensureFirestoreEmulatorEnvironment()`.
  - Default-Verhalten: leert die Zielcollections im Emulator vor dem Backfill.
  - Optional: `--append` schreibt ohne vorheriges Leeren.

- `scripts/firestore-compare.ts`
  - Baut die erwarteten Firestore-Dokumente erneut aus Prisma.
  - Vergleicht Firestore Emulator gegen diese Erwartung.
  - Prueft Counts, IDs und kritische Felder.
  - Meldet Differenzen sichtbar und beendet bei kritischen Abweichungen mit Exit-Code `1`.

## Lokaler Validierungslauf

Vorbereitung:

```bash
npm run db:up
npm run prisma:migrate -- --name init
npm run test:e2e:seed
npm run firebase:emulators
```

Backfill:

```bash
npx tsx scripts/firestore-backfill.ts
```

Ergebnis:

| Collection | Dokumente |
| --- | ---: |
| `users` | 1 |
| `leagues` | 1 |
| `leagueMembers` | 1 |
| `teams` | 2 |
| `players` | 52 |
| `seasons` | 1 |
| `weeks` | 3 |
| `matches` | 3 |
| `gameEvents` | 0 |
| `playerStats` | 0 |
| `teamStats` | 2 |
| `reports` | 0 |

Compare:

```bash
npx tsx scripts/firestore-compare.ts
```

Ergebnis:

- Critical differences: `0`
- Warnings: `0`
- Alle Counts entsprechen der aus Prisma neu berechneten Erwartung.

## Fehlerfall-Test

Zur Validierung, dass keine stillen Fehler entstehen, wurde im lokalen Emulator absichtlich ein Score-Wert veraendert:

```text
matches/e2e-match-week-1.homeScore = 999
```

Der Compare erkannte den Fehler sichtbar:

```text
Critical differences: 1
[critical] matches/e2e-match-week-1: homeScore mismatch: expected null, actual 999
```

Der Compare beendete den Lauf mit Exit-Code `1`. Danach wurde der saubere Zustand per Backfill wiederhergestellt und der Compare erneut erfolgreich mit `0` kritischen Abweichungen ausgefuehrt.

## Erklaerbare Unterschiede

Die aktuelle Prisma-E2E-Fixture enthaelt:

- 2 Teams
- 52 Spieler
- 3 Wochen/Matches
- 2 Team-Season-Stats
- keine PlayerStats
- keine Reports
- keine Simulation Drives/GameEvents

Daher sind `playerStats`, `reports` und `gameEvents` im validierten Backfill-Lauf `0`. Das ist fuer diese Fixture erklaerbar und wird im Compare nicht als Fehler gewertet, weil die erwarteten Prisma-Quellen ebenfalls leer sind.

## Sicherheitsgrenzen

- Kein Production-Firestore-Zugriff.
- Kein `DATA_BACKEND=firestore` in Production.
- Kein Firebase Deployment.
- Keine Prisma-Entfernung.
- Keine Auth-Aenderung.
- Backfill und Compare laufen nur mit Firestore Emulator / `demo-*` Guard.

## Weitere Checks

| Check | Ergebnis | Status |
| --- | --- | --- |
| `npx tsc --noEmit` | Kein TypeScript-Fehler | Gruen |
| `npm run lint` | ESLint ohne Fehler | Gruen |
| Backfill normal | Vollstaendig durchgelaufen | Gruen |
| Compare normal | 0 kritische Abweichungen | Gruen |
| Fehlerfall sichtbar | Score-Abweichung erkannt, Exit-Code `1` | Gruen |
| Emulator nach Check beendet | Port `127.0.0.1:8080` antwortet nicht mehr | Gruen |

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| Backfill vollstaendig? | Ja, fuer die aktuelle Prisma-E2E-Fixture und die definierten Firestore-Collections |
| Daten identisch oder erklaerbar unterschiedlich? | Ja, Compare meldet 0 kritische Abweichungen; leere PlayerStats/Reports/GameEvents sind fixture-bedingt |
| Keine stillen Fehler? | Ja, absichtliche Score-Abweichung wurde kritisch gemeldet |
| Report klar? | Ja |

## Final Decision

**Status: Gruen**

Der Backfill-/Compare-Blocker ist fuer lokale und Preview/Staging-nahe Vorbereitung adressiert. Das ist weiterhin **kein Go-Live** fuer Firestore in Production; es ist ein belastbarer Migrations-Gate-Baustein fuer den naechsten Preview/Staging-Rollout.
