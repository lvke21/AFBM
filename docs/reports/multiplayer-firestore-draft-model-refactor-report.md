# Multiplayer Firestore Draft Model Refactor Report

Datum: 2026-05-01

## Ziel

Der Fantasy-Draft-State wurde aus dem wachsenden `leagues/{leagueId}`-Dokument herausgezogen. Das League-Dokument bleibt damit auf Metadaten, Status und Wochenstand fokussiert; Picks und verfuegbare Spieler wachsen in Subcollections.

## Implementierte Zielstruktur

Firestore benoetigt alternierende Collection-/Document-Segmente. Die angeforderte Struktur `leagues/{leagueId}/draft/state/main` waere deshalb kein valider Document-Pfad. Implementiert wurde die valide, aequivalente Struktur:

- `leagues/{leagueId}`: League-Metadaten, Status, Week-Status, Version
- `leagues/{leagueId}/draft/main`: Draft-Hauptstatus
- `leagues/{leagueId}/draft/main/picks/{pickId}`: Pick-Historie
- `leagues/{leagueId}/draft/main/availablePlayers/{playerId}`: verfuegbare Spieler

## Datenmodell

`draft/main` enthaelt nur den kleinen, haeufig gelesenen Draft-Fortschritt:

- `leagueId`
- `status`
- `round`
- `pickNumber`
- `currentTeamId`
- `draftOrder`
- `startedAt`
- `completedAt`
- `draftRunId`

`picks/{pickId}` enthaelt je Pick:

- `pickNumber`
- `round`
- `teamId`
- `playerId`
- `pickedByUserId`
- `timestamp`
- `draftRunId`
- `playerSnapshot`

`availablePlayers/{playerId}` enthaelt den noch verfuegbaren Spieler mit kompakten Sortier-/Anzeige-Feldern inklusive `displayName`, `position` und `overall`.

## Geaenderte Pfade

- Admin-Firebase-Flow schreibt neue Ligen, Reset, Draft-Initialisierung, Draft-Start, Auto-Draft und Draft-Abschluss in die neuen Draft-Subcollections.
- Client-Firebase-Repository liest `draft/main`, `picks` und `availablePlayers` bei Reload und in Realtime-Subscriptions.
- Client-Picks schreiben atomar:
  - Pick-Dokument erstellen
  - Spieler aus `availablePlayers` loeschen
  - `draft/main` auf den naechsten Pick setzen
  - League-Dokument nur mit `updatedAt`/`version` beruehren
- Firestore Rules erlauben nur eng begrenzte Draft-Clientwrites fuer aktive Mitglieder und lassen Admin-Aktionen weiterhin serverseitig.

## Legacy-Kompatibilitaet

Alte Ligen mit `settings.fantasyDraft` und `settings.fantasyDraftPlayerPool` bleiben lesbar. Der Mapper bevorzugt neue Subcollections, faellt aber auf den alten Blob zurueck, wenn kein neues Draft-Dokument existiert.

Neue oder neu initialisierte Drafts schreiben `draftRunId`. Dadurch werden alte/stale Picks und Available-Player-Dokumente beim Lesen ignoriert, ohne Produktionsdaten zu loeschen.

## Tests

Ausgefuehrt:

- `npx tsc --noEmit` -> gruen
- `npm run lint` -> gruen
- `npm test -- --run src/lib/online/repositories/online-league-repository.test.ts src/lib/online/fantasy-draft.test.ts` -> 17 Tests gruen
- `npm run test:firebase:rules` -> 15 Tests gruen
- `npm run test:e2e:multiplayer:firebase:draft` -> 1 Playwright E2E gruen

Der E2E prueft den kompletten 16-Team-Draft mit Erstellung, Start, Picks, Reload, eindeutigen Spielern, vollstaendigen Rostern und Week-1-Uebergang.

## Bekannte Risiken

- Die Client-Subscription liest aktuell die komplette `availablePlayers`-Collection. Fuer den MVP ist das stabil, bei deutlich groesseren Pools sollte Pagination oder positionsbasierte Querying eingefuehrt werden.
- Alte Draft-Subcollection-Dokumente werden bewusst nicht geloescht. Sie werden per `draftRunId` ausgeblendet, koennen aber Storage-Kosten verursachen, bis eine spaetere, explizite Admin-Migration/Archivierung gebaut wird.
- Client-Picks sind durch Transaction + Available-Player-Delete gegen Doppelpick abgesichert. Firestore Rules validieren zusaetzlich Zug, User und Spielerexistenz, ersetzen aber keine serverseitige Admin-Kontrolle fuer Test-/Admin-Aktionen.

## Status

Gruen.
