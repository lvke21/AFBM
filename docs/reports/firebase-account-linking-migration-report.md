# Firebase Account Linking Migration Report

Datum: 2026-04-30

Scope: Vorbereitung des Wechsels von Firebase Anonymous Auth zu Email/Passwort-Accounts per Account Linking im Online-Multiplayer.

## Userflow

1. Spieler startet weiter wie bisher ueber Firebase Anonymous Auth.
2. Die Firebase UID bleibt die Multiplayer-User-ID fuer Memberships, Teams und Ligen.
3. Im Online Hub sieht der Spieler im User-Panel den Bereich `Account sichern`.
4. Spieler gibt Email und Passwort ein.
5. Die App ruft `linkWithCredential(currentAnonymousUser, EmailAuthProvider.credential(...))` auf.
6. Firebase verknuepft Email/Passwort mit demselben User. Die UID bleibt gleich.
7. Nach Reload nutzt Firebase Auth die persistierte Session weiter; vorhandene Liga-Daten zeigen weiterhin auf dieselbe UID.

## Technische Migrationsnotizen

- Kein neues User-Datenmodell notwendig: Memberships liegen bereits unter `leagues/{leagueId}/memberships/{uid}`.
- Teams bleiben stabil, weil `assignedUserId` weiter die gleiche Firebase UID nutzt.
- League Ownership bleibt stabil, weil `createdByUserId` nicht geaendert wird.
- Email/Passwort wird bewusst nur per Account Linking genutzt, nicht per automatischem `signInWithEmailAndPassword` im Sicherungsflow.
- Bei `auth/email-already-in-use` oder `auth/credential-already-in-use` wird nicht auf den fremden Account gewechselt. Der anonyme aktuelle User bleibt aktiv.
- external provider auth bleibt ausserhalb des kritischen Pfads. Der vorbereitete Provider fuer diesen Schritt ist ausschliesslich Firebase Email/Password.

## Fehlerbehandlung

- Email bereits vergeben: klare Meldung, kein Account-Wechsel.
- Schwaches Passwort: klare Passwort-Meldung.
- Ungueltige Email: Eingabehinweis.
- Abgelaufene Credentials: Reload-Hinweis, damit die aktuelle UID erhalten bleibt.
- Netzwerkfehler: Retry-Hinweis.
- Provider deaktiviert: Hinweis, dass Email/Passwort in Firebase noch aktiviert werden muss.

## Testabdeckung

- Anonymer User kann Account sichern.
- UID bleibt nach Linking gleich.
- Membership-Key bleibt durch gleiche UID stabil.
- Bereits verknuepfter Password-Account bleibt nach Reload stabil.
- Doppelte Email wird sauber abgefangen, ohne auf einen anderen Account zu wechseln.
- Local Test Mode bleibt vom Linking ausgeschlossen.

## Offene Betriebsannahmen

- Firebase Email/Password Provider muss in der Firebase Console aktiviert werden, bevor der Flow produktiv nutzbar ist.
- Email-Verifikation ist noch nicht Teil dieses Schritts.
- Ein separater Login-Screen fuer User ohne persistierte Firebase Session kann spaeter ergaenzt werden; dieser Schritt verhindert zunaechst Datenverlust beim Upgrade des bestehenden Anonymous Users.
