# Firebase Rules and Indexes Production Readiness Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Rolle: Firebase Security Engineer und QA Engineer  
Status: **Gruen**

## Executive Summary

Firestore Rules und Indexes sind fuer ein spaeteres Production-Deployment vorbereitet. Es wurde kein Firebase Deployment ausgefuehrt, kein App-Go-Live auf Firestore gestartet, keine Migration vorgenommen und Prisma nicht entfernt.

Die Rules bleiben restriktiv: default deny, keine Client-Writes fuer Game-State, Simulation, Stats oder Reports, und League-Daten sind ueber Mitgliedschaft bzw. Owner-Zugriff geschuetzt. Die Indexdatei wurde um den fehlenden Match-Index fuer `seasonId` + `weekId` + `status` erweitert.

## Geaenderte Dateien

- `firestore.indexes.json`
  - Neuer Match-Index fuer `seasonId`, `weekId`, `status`, `scheduledAt`.

- `src/lib/firebase/firestore.rules.test.ts`
  - Rules-Testprojekt auf `demo-afbm` angeglichen.
  - Zusaetzliche Tests fuer Owner-only Reads, Admin-Membership-Reads, fremde Liga, unscoped Queries und default deny.

## Rules Review

| Bereich | Befund | Status |
| --- | --- | --- |
| Default deny | Catch-all `match /{document=**}` blockiert read/write | Gruen |
| User-Zugriff | User koennen nur eigenes Profil lesen; User-Listen sind verboten | Gruen |
| League-Zugriff | Aktive League-Mitglieder oder Owner koennen League-Dokumente lesen | Gruen |
| Fremde Liga | Nicht-Mitglieder werden blockiert | Gruen |
| Writes | Alle Client-Writes sind verboten | Gruen |
| Game Engine Writes | `leagues`, `matches`, `gameEvents`, `playerStats`, `teamStats`, `reports` sind clientseitig write-deny | Gruen |
| Admin/serverseitige Pfade | Admin SDK / Server-Pfade bleiben ausserhalb der Client-Rules; Tests nutzen privilegierte Fixture-Writes nur mit deaktivierten Rules | Gruen |

Wichtige Rules-Eigenschaften:

- `firestore.rules` nutzt `isActiveLeagueMember`, `hasLeagueRole`, `isLeagueOwner` und `canReadLeagueDoc`.
- Client-Writes sind fuer alle produktiven Collections auf `false`.
- Unbekannte Collections sind durch default deny geschlossen.

## Index Review

| Anforderung | Umsetzung | Status |
| --- | --- | --- |
| Teams nach `leagueId` | `teams`: `leagueId`, `abbreviation` | Gruen |
| Players nach `teamId` | `players`: `roster.teamId`, `roster.rosterStatus` | Gruen |
| Matches nach `weekId` | `matches`: `weekId`, `scheduledAt` | Gruen |
| Matches nach `seasonId/weekId/status` | Neu: `matches`: `seasonId`, `weekId`, `status`, `scheduledAt` | Gruen |
| Matches nach Season/Woche | `matches`: `leagueId`, `seasonId`, `weekNumber` | Gruen |
| Stats nach `playerId/seasonId` | `playerStats`: `leagueId`, `seasonId`, `playerId`, `scope` | Gruen |
| Stats nach `teamId/seasonId` | `teamStats`: `leagueId`, `seasonId`, `teamId`, `scope` | Gruen |
| Stats nach Match | `playerStats` und `teamStats`: `leagueId`, `matchId`, `scope`, `createdAt` | Gruen |
| Reports nach `leagueId/createdAt` | `reports`: `leagueId`, `createdAt desc` | Gruen |

`firestore.indexes.json` wurde per JSON-Parse validiert.

## Emulator Rules Tests

Ausgefuehrt:

```bash
npm run firebase:rules:test
```

Ergebnis:

- 1 Test File bestanden.
- 10 Tests bestanden.
- Emulator wurde mit Projekt `demo-afbm` gestartet und danach beendet.

Abgedeckte Faelle:

- Erlaubte Reads: eigenes User-Profil, League-Dokumente fuer aktive Mitglieder, Owner Reads ohne Membership Row.
- Verbotene Reads: fremdes User-Profil, fremde Liga, anonyme League Reads, unscoped League Queries, unbekannte Collections.
- Erlaubte Writes: privilegierte Fixture-/Server-Writes mit deaktivierten Rules im Emulator-Test.
- Verbotene Writes: User-Profil-Write, League-State, Match-State, Game Events, Player Stats, Team Stats, Reports.
- Fremde Liga blockiert: Alice kann `league-beta` und `team-beta` nicht lesen.

## Weitere Validierung

| Kommando | Ergebnis | Status |
| --- | --- | --- |
| `npm run firebase:rules:test` | 10 Rules Tests bestanden | Gruen |
| `npx tsc --noEmit` | Kein TypeScript-Fehler | Gruen |
| `npm run lint` | ESLint ohne Fehler | Gruen |
| `node -e "JSON.parse(...firestore.indexes.json...)"` | Index-JSON gueltig | Gruen |

## Deploy-Kommandos

Diese Kommandos sind fuer ein spaeteres explizites Deployment vorbereitet:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only firestore
```

Wichtig:

- Keines dieser Deploy-Kommandos wurde ausgefuehrt.
- Ein Deployment darf erst nach expliziter Freigabe erfolgen.
- Auch nach einem Rules-/Indexes-Deployment bleibt das App-Backend standardmaessig Prisma, solange `DATA_BACKEND` nicht kontrolliert freigegeben wird.

## Kein Go-Live

Nicht ausgefuehrt:

- Kein `firebase deploy`.
- Keine Firestore-Datenmigration.
- Keine Prisma-Entfernung.
- Keine Auth-Umstellung.
- Keine Aktivierung von `DATA_BACKEND=firestore` fuer Production.

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| Rules sicher? | Ja |
| Indexes vollstaendig? | Ja |
| Emulator-Rules-Tests gruen? | Ja |
| Deploy-Kommandos dokumentiert? | Ja |
| Kein Go-Live ausgeloest? | Ja |

## Final Decision

**Status: Gruen**

Firestore Rules und Indexes sind production-ready vorbereitet und deployfaehig dokumentiert. Es wurde kein Go-Live ausgeloest; Prisma bleibt der aktive Default-Datenpfad.
