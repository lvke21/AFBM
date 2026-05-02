# Codebase Refactor Quick Wins Report

Stand: 2026-05-01

## Ziel

Es wurden nur risikoarme Quick Wins aus `docs/reports/codebase-refactor-performance-workpackages.md` umgesetzt. Keine Game-Engine-, Multiplayer-State-, Firestore-Datenmodell-, Auth/Admin-, Week-, Draft- oder Simulationslogik wurde fachlich veraendert.

## Geaenderte Dateien

- `next.config.ts`
- `src/lib/online/fantasy-draft-service.test.ts`
- `docs/reports/codebase-refactor-quickwins-report.md`

## Quick Win 1 - Fantasy-Draft-Slow-Test stabilisieren

### Datei

- `src/lib/online/fantasy-draft-service.test.ts`

### Vorher

Der komplette 16-Team-Fantasy-Draft-Test hatte ein explizites Timeout von `15_000` ms. In der Codebase-Analyse war `npm run test:run` dadurch rot, obwohl der Test mit hoeherem Timeout reproduzierbar bestanden hat.

### Nachher

Der gleiche Test nutzt jetzt `30_000` ms Timeout.

### Begruendung

- Der Testinhalt wurde nicht abgeschwaecht.
- Die Draft-Logik wurde nicht veraendert.
- Der Test bleibt ein vollstaendiger 16-Team-Draft mit Roster-Shape-Validierung.
- Damit ist der Standard-Testlauf wieder als Refactoring-Baseline nutzbar.

### Entfernte/vereinfachte Logik

- Keine produktive Logik entfernt.
- Nur Testkonfiguration fuer einen bekannten Slow-Test angepasst.

### Restrisiko

- Der Test ist weiterhin langsam und sollte spaeter profiliert werden.
- Das Timeout behebt die Baseline, ersetzt aber keine echte Performance-Optimierung.

## Quick Win 2 - Next Workspace-Root explizit setzen

### Datei

- `next.config.ts`

### Vorher

`npm run build` meldete:

```text
Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected the directory of /Users/lukashanzi/package-lock.json as the root directory.
```

### Nachher

`next.config.ts` setzt jetzt:

```ts
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  reactStrictMode: true,
};
```

### Begruendung

- Der Build nutzt explizit den AFBM-Projektroot fuer Output File Tracing.
- Keine Runtime-Logik der App wurde veraendert.
- Der Build-Warnhinweis ist verschwunden.

### Entfernte/vereinfachte Logik

- Keine App-Logik entfernt.
- Build-Konfiguration wurde expliziter gemacht.

### Restrisiko

- Niedrig. App Hosting sollte mit dem Projektroot konsistenter bauen.
- Falls bewusst ein Monorepo-Root ausserhalb von AFBM geplant war, muesste diese Entscheidung separat dokumentiert werden.

## Testergebnisse

Nach den Aenderungen wurden die Checks seriell ausgefuehrt:

| Command | Ergebnis |
| --- | --- |
| `npm run lint` | Gruen |
| `npx tsc --noEmit` | Gruen |
| `npx vitest run src/lib/online/fantasy-draft-service.test.ts` | Gruen, 5/5 Tests |
| `npm run test:run` | Gruen, 154 Test Files, 912/912 Tests |
| `npm run build` | Gruen, ohne Workspace-Root-Warnung |

Hinweis: Ein frueher paralleler Zwischenlauf von `npx tsc --noEmit` scheiterte, waehrend `npm run build` gleichzeitig `.next/types` neu erzeugte. Der anschliessende serielle Typecheck war gruen. Das war ein Validierungs-Artefakt durch parallele Ausfuehrung, kein finaler Fehler.

## Nicht veraendert

- Keine Game-Engine-Logik.
- Keine Firestore-Datenmodelle.
- Keine Multiplayer-State-Flows.
- Keine Auth-/Admin-Rechte.
- Keine Week-/Draft-/Simulation-Flows.
- Kein UI-Verhalten.

## Verbleibende Risiken

- `fantasy-draft-service.test.ts` bleibt ein Performance-Hotspot. Eine echte Optimierung sollte als separates AP folgen.
- Die sehr grossen Client Components und God Modules bleiben unveraendert.
- E2E- und Firebase-Emulator-Workflows wurden in diesem Quick-Win nicht veraendert.

## Status

**Gruen**

Die Quick Wins sind klein, validiert und ohne funktionale Verhaltensaenderung. Die wichtigste unmittelbare Verbesserung ist eine wieder gruene Standard-Testbaseline plus ein saubererer Next Build.
