# Firebase Multiplayer Rules Audit

Datum: 2026-04-30

Scope: Firestore Security Rules fuer Multiplayer-, Admin- und Userdaten. Die Pruefung fokussiert Least Privilege, serverseitige Admin-Pfade und sichere Spieleraktionen im Online-Liga-Modus.

## Status

Status: Gruen

Begruendung: Admin-Aktionen sind in den Client Rules geschlossen, Multiplayer-Spieleraktionen sind auf den authentifizierten User begrenzt, globale Kontrollpfade sind explizit gesperrt, und die Emulator-Tests decken positive und negative Multiplayer-Zugriffe ab.

## Regelentscheidungen

- `users/{userId}`: Nur der eigene User darf lesen. Client-Writes bleiben gesperrt.
- Legacy `leagueMembers/{leagueId_userId}`: Eigene Membership ist lesbar; Owner/Admin-Rollen duerfen Memberships derselben Liga lesen. Client-Writes bleiben gesperrt.
- Legacy Liga-Readmodels wie `teams`, `players`, `weeks`, `matches`, `gameEvents`, `playerStats`, `teamStats`, `reports`: Nur aktive Mitglieder oder League Owner duerfen lesen. Client-Writes bleiben gesperrt.
- Online `leagues/{leagueId}`: Lobby-Ligen duerfen fuer Discovery gelesen werden; Mitglieder/Creator duerfen ihre Liga lesen. Client-Create, Client-Delete und Admin-Updates sind gesperrt.
- Online Join-Counter: Ein Client darf `memberCount` nur exakt um `+1` erhoehen, wenn derselbe atomare Commit die eigene aktive Membership und das eigene zugewiesene Team erzeugt.
- Online `memberships/{userId}`: Spieler duerfen ihre eigene Membership erstellen oder fuer Ready/Team-Claim aktualisieren. Fremde Membership-Writes und Client-Admin-Updates sind gesperrt.
- Online Membership Reads: Aktive Mitglieder duerfen Memberships der Liga lesen, damit Ready-Status und Liga-Anwesenheit im Multiplayer-UI funktionieren. Annahme: Diese Dokumente enthalten keine geheimen Admin-Daten.
- Online `teams/{teamId}`: Spieler duerfen nur ein freies/vakantes Team im eigenen Join-Commit claimen oder die eigene `depthChart` aktualisieren. Team-Create/Delete und fremde Team-Writes sind gesperrt.
- Online `weeks/{seasonWeekId}`: Mitglieder duerfen Week-State lesen; alle Client-Writes sind gesperrt. Simulation bleibt server-/adminseitig.
- Online `events/{eventId}`: Spieler duerfen nur eng erlaubte eigene User-Events schreiben: Join, Ready an/aus, Depth-Chart aktualisiert. Admin-/Simulation-Events laufen ueber Admin SDK.
- Online `adminLogs/{logId}`: Vollstaendig fuer Client Read/Write gesperrt. Admin-Audit-Logs sind server-only.
- `admin/{document=**}` und `control/{document=**}`: Explizit gesperrt, damit keine spaeteren Kontroll- oder Debug-Dokumente versehentlich oeffentlich werden.
- Catch-all: Bleibt deny-by-default.

## Getestete Sicherheitsfaelle

- User liest eigene Membership.
- Outsider und anonymer User koennen Memberships nicht lesen.
- User kann fremde Membership nicht manipulieren.
- User kann eigenes Team nur fuer erlaubte Depth-Chart-Felder aktualisieren.
- User kann fremde Teams nicht manipulieren.
- Client-Admin kann keine Liga erstellen, starten, loeschen, Week simulieren oder Admin-Logs lesen/schreiben.
- Atomarer Join ist erlaubt, isolierte Counter-/Membership-Spoofs werden abgelehnt.
- Admin-/Control-Dokumente sind fuer normale und anonyme Clients gesperrt.

## Restrisiken

- Online Membership Reads bleiben fuer aktive Ligamitglieder erlaubt, weil das aktuelle Multiplayer-UI Ready- und Mitgliederstatus aus der Membership-Collection liest. Falls dort spaeter vertrauliche Admin-Notizen landen, muss ein separates server-only Dokument oder ein reduziertes Public-Readmodel eingefuehrt werden.
- Die Rules pruefen beim Join die atomare Konsistenz von Membership, Team und Counter, aber nicht die fachliche Qualitaet der gewaehlten Teamnamen. Diese Validierung bleibt Aufgabe der App-/Serverlogik.

## Testergebnisse

- `npm run test:firebase:rules`: Gruen, 15 Tests.
- `npm run test:firebase:parity`: Gruen, 3 Tests.
- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.

Hinweis: Emulator-Befehle muessen ausserhalb der Codex-Sandbox laufen, weil der Firestore Emulator lokale Ports bindet.
