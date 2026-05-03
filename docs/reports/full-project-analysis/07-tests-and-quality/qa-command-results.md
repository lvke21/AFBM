# QA Command Results

## Ziel der Analyse

Dokumentation der in dieser QA-Analyse tatsaechlich ausgefuehrten Commands und ihrer Ergebnisse.

## Umgebung

- Arbeitsverzeichnis: `/Users/lukashanzi/Documents/AFBM`
- Datum: 2026-05-02
- Node laut Testausgabe: v22.22.2
- Next.js Build: 15.5.15
- Keine Production-Secrets verwendet.
- Keine produktiven Daten geaendert.

## Commands

### `npm run lint`

Ergebnis: Gruen.

Output-Kern:

```text
> afbm-manager@0.1.0 lint
> eslint .
```

Exit Code: 0.

### `npx tsc --noEmit`

Ergebnis: Gruen.

Exit Code: 0.

### `npm test -- --run`

Ergebnis: Gruen.

Output-Kern:

```text
Test Files  158 passed (158)
Tests       936 passed (936)
Duration    20.87s
```

Hinweise:

- Wiederholte Warnung: Node `DEP0040` fuer `punycode`.
- Langsame Tests:
  - `gameplay-calibration.test.ts`
  - `fantasy-draft-service.test.ts`
  - `play-selection-engine.test.ts`

### `npm run build`

Ergebnis: Gruen.

Output-Kern:

```text
Compiled successfully
Generating static pages (15/15)
```

Wichtige First-Load-JS-Werte:

| Route | First Load JS |
| --- | ---: |
| `/` | 289 kB |
| `/app/savegames` | 289 kB |
| `/admin` | 264 kB |
| `/admin/league/[leagueId]` | 266 kB |
| `/online` | 264 kB |
| `/online/league/[leagueId]` | 295 kB |
| `/online/league/[leagueId]/draft` | 277 kB |

Bewertung:

- Build ist gruen.
- Online-League bleibt eine der groessten Client-Routen.

### `npm run test -- --run`

Ergebnis: Gruen.

Output-Kern:

```text
Test Files  158 passed (158)
Tests       936 passed (936)
Duration    23.73s
```

Hinweis:

- Script ist funktional derselbe Vitest-Lauf wie `npm test`.
- Ergebnis wurde dennoch separat ausgefuehrt, weil der Auftrag beide Varianten genannt hat.

### `npm run test:firebase:parity`

Erster Versuch:

- Ergebnis: Rot durch Sandbox-Port-Bindings.
- Ursache:
  - Firestore Emulator konnte Ports auf `127.0.0.1` nicht binden.
  - Beispiel: `listen EPERM: operation not permitted 127.0.0.1:8080`.

Zweiter Versuch ausserhalb der Sandbox:

- Ergebnis: Gruen.

Output-Kern:

```text
src/server/repositories/firestoreE2eParity.test.ts (3 tests)
Test Files  1 passed (1)
Tests       3 passed (3)
```

Bewertung:

- Kein fachlicher Fehler.
- Firebase Emulator Tests brauchen lokale Port-Bindings.

### `npm run test:e2e`

Ergebnis: Rot vor Browser-Teststart.

Ursache:

```text
[E2E preflight] Datenbank nicht erreichbar: localhost:5432
Verwendete E2E-Datenbank: postgresql://postgres:***@localhost:5432/afbm_manager?schema=public
```

Script-Vorschlag:

```text
npm run db:up
npm run prisma:migrate -- --name init
npm run test:e2e:seed
```

Bewertung:

- Kein UI-Testfehler.
- Lokale E2E-Infrastruktur war nicht gestartet.
- Es wurden keine DB-/Seed-/Docker-Kommandos ausgefuehrt, weil der Auftrag Analyse und keine Infrastrukturveraenderung verlangte.

## Zusammenfassung

| Command | Ergebnis | Kommentar |
| --- | --- | --- |
| `npm run lint` | Gruen | ESLint sauber. |
| `npx tsc --noEmit` | Gruen | Typecheck sauber. |
| `npm test -- --run` | Gruen | 158 Files, 936 Tests. |
| `npm run test -- --run` | Gruen | Wiederholung des Vitest-Alias. |
| `npm run build` | Gruen | Production Build erfolgreich. |
| `npm run test:firebase:parity` | Gruen nach Eskalation | Sandbox-Portproblem im ersten Versuch. |
| `npm run test:e2e` | Rot | Lokale PostgreSQL-DB nicht erreichbar. |

## Gesamtstatus der Checks

Lokal: Gelb.

Begruendung:
- Lint, Typecheck, Unit/Integration, Build und Firebase Parity sind gruen.
- E2E-Smoke konnte ohne lokale PostgreSQL-Infrastruktur nicht ausgefuehrt werden.
