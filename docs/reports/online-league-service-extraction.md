# Online League Service Extraction

Datum: 2026-05-03  
Status: Reine Helper extrahiert, Public API unveraendert.

## Ziel

`src/lib/online/online-league-service.ts` wurde weiter verkleinert, ohne Firestore-Pfade, Persistenzlogik oder exportierte Service-Funktionen zu aendern.

## Vorher/Nachher

| Datei | Vorher | Nachher |
| --- | ---: | ---: |
| `src/lib/online/online-league-service.ts` | 8464 Zeilen | 8028 Zeilen |

Reduktion: 436 Zeilen.

## Neue Modulgrenzen

| Modul | Verantwortung | Regeln |
| --- | --- | --- |
| `src/lib/online/online-league-contract-defaults.ts` | Contract-/Roster-Defaults, Contract-Normalisierungshilfen, Default-X-Factor-Ableitung und Development-Pfad-Ableitung. | Pure Funktionen, keine Storage-/Firestore-Zugriffe, keine Persistenzlogik. |
| `src/lib/online/online-league-default-profiles.ts` | Default-Profile fuer Owner, Job Security, Activity, Admin Removal, Stadium, Fanbase, Finance, Team Chemistry und Coaching Staff. | Pure Factory-Funktionen, deterministische Ableitungen aus Team-/Zeit-Inputs, keine Writes. |
| `src/lib/online/online-league-service.ts` | Weiterhin Public API, Orchestrierung, Storage/Repository-nahe Flows und Feature-Use-Cases. | Public API unveraendert; nutzt die neuen Helper als interne Bausteine. |

## Nicht Geaendert

- Keine Firestore-Pfade.
- Keine Persistenzlogik.
- Keine Storage-Keys.
- Keine exportierten Service-Funktionsnamen oder Signaturen.
- Keine fachlichen Defaults.

## Checks

| Check | Ergebnis |
| --- | --- |
| `npx vitest run src/lib/online` | Gruen |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `wc -l src/lib/online/online-league-service.ts` | 8028 |
