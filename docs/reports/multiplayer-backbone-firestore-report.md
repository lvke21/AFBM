# Multiplayer Backbone Firestore Report

## Ausgangslage

Der Online-Modus war bisher ein lokaler Multiplayer-Prototyp. Die relevanten Daten lagen in `localStorage`:

- `afbm.online.userId`
- `afbm.online.username`
- `afbm.online.leagues`
- `afbm.online.lastLeagueId`

Damit konnten lokale Liga-Flows getestet werden, aber mehrere Browser oder Nutzer sahen keinen gemeinsamen State. Es gab keine zentrale Auth-Quelle, keine transaktionale Teamvergabe, keine echten Rollen und keinen Realtime-Sync.

## Neue Architektur

Es gibt jetzt eine Repository-Schicht:

- `OnlineLeagueRepository` als gemeinsames Interface
- `LocalOnlineLeagueRepository` als Legacy/Fallback
- `FirebaseOnlineLeagueRepository` als Firestore-Backbone
- `online-league-repository-provider.ts` zur Backend-Auswahl
- `online-auth.ts` fuer Firebase Anonymous Auth im Firebase-Modus
- `security/roles.ts` fuer zentrale Rollen-Guards

Backend-Auswahl:

- `AFBM_ONLINE_BACKEND=local | firebase`
- `NEXT_PUBLIC_AFBM_ONLINE_BACKEND=local | firebase`

Default bleibt `local`, damit bestehende lokale MVP-Flows und Tests nicht brechen.

## Datenmodell

Der Firestore-Backbone nutzt die neue Online-Struktur:

- `leagues/{leagueId}`
- `leagues/{leagueId}/memberships/{userId}`
- `leagues/{leagueId}/teams/{teamId}`
- `leagues/{leagueId}/weeks/{seasonWeekId}`
- `leagues/{leagueId}/events/{eventId}`
- `leagues/{leagueId}/adminLogs/{logId}`
- `users/{userId}` bleibt fuer Auth/Profile anschlussfaehig

Die Mapper in `src/lib/online/types.ts` wandeln Firestore-Dokumente in das bestehende `OnlineLeague` UI-Modell. Dadurch koennen Online Hub und Liga-Dashboard weitgehend unveraendert weiterarbeiten.

## Auth-Strategie

Im Firebase-Modus ist die Auth-UID die Quelle der Wahrheit:

- `getCurrentAuthenticatedOnlineUser("firebase")`
- nutzt Firebase Auth
- falls kein User existiert: anonymous sign-in
- `displayName` kann lokal abgeleitet werden
- `localStorage.userId` ist im Firebase-Modus nicht autoritativ

Im Local-Modus bleibt `ensureCurrentOnlineUser()` der Legacy-Fallback.

## Rollenmodell

Minimalrollen:

- `admin`
- `gm`

Guards:

- `assertLeagueAdmin`
- `assertLeagueMember`
- `assertTeamOwner`
- `assertActiveMembership`

Der League-Ersteller erhaelt eine Admin-Membership. Beitretende Nutzer erhalten eine GM-Membership, ausser ein Admin joined selbst als GM.

## Transaktionslogik Join

`FirebaseOnlineLeagueRepository.joinLeague()` nutzt eine Firestore Transaction:

1. Auth User laden
2. Liga lesen
3. Status `lobby` pruefen
4. vorhandene Membership pruefen
5. MaxTeams pruefen
6. freie Teams laden/initialisieren
7. Team Identity auf Doppelvergabe pruefen
8. Team atomar auf `assigned` setzen
9. Membership schreiben
10. League `memberCount`, `version`, `updatedAt` aktualisieren
11. Event `user_joined_league` schreiben

Zwei parallele Joins koennen nicht dasselbe bereits gelesene Team sauber abschliessen, weil die Transaktion den Team-Status erneut prueft. Bei sehr hoher Parallelitaet bleibt fuer produktive Härtung eine serverseitige Cloud Function empfohlen.

## Realtime Listener

Implementiert:

- `subscribeToLeague`
- `subscribeToMemberships`
- `subscribeToTeams`
- `subscribeToCurrentUserMembership`
- `subscribeToLeagueEvents`
- `subscribeToAvailableLeagues`

Online Hub und Liga-Dashboard nutzen im Firebase-Modus Firestore Listener. Im Local-Modus liefern die Listener einmalig den lokalen State und unsubscriben sauber.

## Admin Commands

Im Repository vorbereitet:

- `createLeague`
- `archiveLeague`
- `resetLeague`
- `removeMember`
- `markTeamVacant`
- `setAllReady`
- `startLeague`
- `simulateWeekPlaceholder`

Jede Firebase-Admin-Aktion schreibt Admin Log und Event. Week Simulation bleibt Placeholder:

- kein Game-Engine-Trigger
- `currentWeek` steigt
- Ready-States werden zurueckgesetzt
- Event `week_simulated_placeholder`

## Security Rules

`firestore.rules` wurde fuer die neue Subcollection-Struktur erweitert:

- Auth required fuer Online-Writes
- Lobby-Ligen koennen gelesen werden
- aktive Mitglieder koennen Liga-Subcollections lesen
- GM darf eigene `ready`/`lastSeenAt` Felder aktualisieren
- GM darf Rolle, Team oder Status nicht selbst eskalieren
- Teams koennen beim Join von `available`/`vacant` auf `assigned` wechseln
- AdminLogs sind nur fuer Admins schreibbar
- bestehende Top-Level-Spiel-/Engine-Collections bleiben write-locked

Wichtig: Voll sichere Admin Commands gehoeren langfristig in Cloud Functions oder serverseitige Route Handlers mit Admin SDK. Die Client-Repository-Commands sind MVP-Backbone und werden durch Rules begrenzt, ersetzen aber keine produktive serverseitige Autorisierung.

## Legacy/localStorage Umgang

localStorage bleibt aktiv fuer:

- Legacy-Fallback
- Dev Mode
- lokale Tests
- `lastLeagueId` als Convenience

Im Firebase-Modus:

- `afbm.online.userId` ist keine Autoritaet
- `afbm.online.leagues` ist keine Ligaquelle
- `lastLeagueId` darf lokal als Navigationshilfe bleiben, die echte Liga wird aus Firestore geladen

## Tests

Ergaenzt:

- Local Repository bleibt funktionsfaehig
- doppelte Membership wird verhindert
- zwei lokale Nutzer erhalten unterschiedliche Teams
- Firestore-Dokumente werden ins bestehende UI-Modell gemappt
- Rollen-Guards blockieren GM-Admin-Eskalation
- Security-Rules-Test fuer Online-Lobby-Read, eigenes Ready-Update, Role Escalation und AdminLog-Block

## Was ist echter Multiplayer?

Echt zentral im Firebase-Modus:

- Liga-Dokumente
- Memberships
- Team-Zuweisung
- Ready-State
- Events/AdminLogs
- Realtime Listener

Noch MVP/Placeholder:

- Admin Commands laufen clientseitig gegen Firestore, nicht ueber Cloud Functions
- Week Simulation erhoeht nur Woche und resetet Ready
- bestehende GM-Feature-Systeme bleiben lokal/legacy und wurden nicht migriert
- E2E-Zwei-Browser-Multiplayer ist vorbereitet, aber noch nicht als eigener `test:e2e:multiplayer` Script vorhanden

## Naechste Schritte

1. Cloud Functions oder Next Route Handlers fuer `joinLeague`, Admin Commands und Week Commands einfuehren.
2. Firestore Emulator E2E fuer zwei Browser-Kontexte ergaenzen.
3. Online-Dashboard weiter von lokalen GM-Feature-Aktionen entkoppeln.
4. Firestore Rules fuer Join-Invarianten weiter haerten.
5. Auth-Profil mit frei waehlbarem DisplayName sauber speichern.
