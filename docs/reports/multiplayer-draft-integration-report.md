# Multiplayer Draft Integration Report

Datum: 2026-05-01

## Datenmodell

- Liga: `leagues/afbm-multiplayer-test-league`
- Teams: `leagues/{leagueId}/teams/{teamId}`
- Draft-State: `leagues/{leagueId}/draft/main`
- Verfuegbare Spieler: `leagues/{leagueId}/draft/main/availablePlayers/{playerId}`
- Picks: `leagues/{leagueId}/draft/main/picks/{pickNumber}`

Der vorbereitete Draft-State enthaelt:

- `status`: `active`
- `round`: aktuelle Runde
- `pickNumber`: aktueller Overall-Pick
- `currentTeamId`: Team am Zug
- `draftOrder`: stabile 8-Team-Reihenfolge
- `startedAt` / `completedAt`
- `draftRunId`: `foundation-player-pool-v1`

## Draft-Order

Die Reihenfolge ist reproduzierbar aus den Foundation-Teams:

1. `zurich-guardians`
2. `basel-rhinos`
3. `geneva-falcons`
4. `bern-wolves`
5. `lausanne-lions`
6. `winterthur-titans`
7. `st-gallen-bears`
8. `lucerne-hawks`

Snake-Logik:

- Runde 1: Team 1 bis 8
- Runde 2: Team 8 bis 1
- Runde 3: Team 1 bis 8
- usw.

## Pick-Logik

Neu vorbereitet:

- `createSnakeDraftSequence(teamIds, rounds)`
- `getSnakeDraftTeamId(teamIds, pickIndex)`
- `createPreparedMultiplayerDraftState(...)`
- `getNextPreparedMultiplayerDraftState(...)`
- `validatePreparedMultiplayerDraftPick(...)`
- `prepareMultiplayerDraft(...)`
- `draftMultiplayerPlayer(leagueId, teamId, playerId)`

`draftMultiplayerPlayer` prueft serverseitig:

- Liga existiert
- Draft existiert und ist aktiv
- Team gehoert zur Liga
- Team ist am Zug
- Spieler existiert im verfuegbaren Pool
- Spieler wurde nicht bereits gepickt
- Roster-Limit ist nicht erreicht

Nach einem erfolgreichen Pick:

- Pick wird unter `draft/main/picks` gespeichert
- Spieler wird aus `availablePlayers` entfernt
- Spieler wird dem Team-Roster hinzugefuegt
- Draft-State springt zum naechsten Pick
- League-Version und Eventlog werden aktualisiert

## Tests

- `npx vitest run src/lib/online/multiplayer-draft-logic.test.ts scripts/seeds/multiplayer-player-pool-firestore-seed.test.ts scripts/seeds/multiplayer-test-league-firestore-seed.test.ts`: gruen, 16 Tests bestanden.
- `npx tsc --noEmit`: gruen.
- `npx eslint src/lib/online/multiplayer-draft-logic.ts src/lib/online/multiplayer-draft-logic.test.ts scripts/seeds/multiplayer-draft-prep-firestore-seed.ts scripts/seeds/multiplayer-player-pool-firestore-seed.ts`: gruen.
- `npm run seed:multiplayer:draft`: rot in dieser Umgebung, weil kein Firestore-Emulator unter `127.0.0.1:8080` erreichbar war (`UNAVAILABLE: No connection established`).

## Offene Risiken

- Der echte Firestore-Schreibpfad muss mit laufendem Emulator erneut validiert werden.
- `draftMultiplayerPlayer` ist serverseitig/admin-orientiert und noch nicht an ein finales GM-UI gebunden.
- Positionslimits werden nicht separat erzwungen; das bestehende Online-Draft-Modell nutzt nur das Gesamt-Roster-Limit.
- Alte, nicht mehr vorgesehene Pick- oder Player-Dokumente werden nicht geloescht, weil Seed-/Prep-Scripts keine produktiven Daten entfernen sollen.
