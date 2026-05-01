# Firebase Anonymous Auth MVP Report

## Aktive Auth-Variante

Der Online-Multiplayer nutzt jetzt Firebase Anonymous Auth als Standard-Identität.

- Beim ersten Online-Start wird per Firebase Client SDK automatisch ein anonymer Firebase-User erstellt.
- Die Firebase UID ist die authoritative Multiplayer-User-ID.
- Der lokale Anzeigename wird separat gespeichert und kann im Online Hub geändert werden.
- Bestehende lokale Usernames aus `afbm.online.username` werden weiterverwendet.
- Die alte lokale `afbm.online.userId` bleibt nur Legacy/Fallback für den Local-Repository-Modus und ist im Firebase-Modus nicht sicherheitsrelevant.

## Geänderte Datenquellen

### Online-Spieler

- User-ID: Firebase Auth `uid`
- Anzeigename: Firebase Auth `displayName` plus lokaler Mirror `afbm.online.username`
- Fallback-Name: `Coach_1234`-Format, falls noch kein Name gesetzt ist

### Local Legacy Mode

Wenn `NEXT_PUBLIC_AFBM_ONLINE_BACKEND=local` aktiv ist, bleibt der alte lokale Identity-Service funktionsfähig. Dieser Modus ist nur Fallback/Development und nicht die Sicherheitsbasis für echten Multiplayer.

## Admin-Zugriff

Der Adminbereich ist vom anonymen Online-GM-Login getrennt.

- `/admin` und `/admin/league/:leagueId` werden inzwischen ueber Firebase Auth Custom Claims geschuetzt.
- Admin-Aktionen pruefen serverseitig das Firebase ID Token mit `admin: true`.

## external provider auth-Isolation

GitHub/external provider auth wird für den MVP nicht mehr als Provider registriert. Damit entfallen external provider auth-Callback-URL-Probleme für den Multiplayer-Flow.

legacy session system bleibt nur noch für bestehende klassische App-Session- und lokale E2E-Testpfade vorhanden. Der Multiplayer-Online-Flow hängt nicht von `OLD_SESSION_URL`, external provider auth-Redirects oder externen external provider auth-Providern ab.

## Firestore / UID-Ausrichtung

Firestore-Zugriffe im Online-Backbone verwenden `request.auth.uid`.

- Membership-Dokumente liegen unter `leagues/{leagueId}/memberships/{userId}`.
- Team-Assignment nutzt `assignedUserId`.
- Ready-State und Team-bezogene GM-Aktionen prüfen die Firebase UID gegen Membership/Team.

## Sicherheitsannahmen

- Firebase Anonymous Auth ist für den MVP ausreichend, aber kein Identitätsnachweis einer echten Person.
- Anonymous Auth schützt gegen frei manipulierbare localStorage-UserIDs, weil die UID von Firebase Auth kommt.
- Adminzugriff ist serverseitig per Code-Gate geschützt, aber produktive Admin-Commands sollten langfristig über serverseitige Route Handler oder Cloud Functions mit Admin SDK laufen.
- Der Firebase Client darf keine Secrets enthalten.
- `AFBM_ADMIN_ACCESS_CODE` und `AFBM_ADMIN_SESSION_SECRET` müssen ausschließlich serverseitig gesetzt werden.

## Spätere Email/Passwort-Auth

Email/Passwort kann später ergänzt werden, ohne das Repository-Modell zu ändern:

1. Firebase Email/Password Provider aktivieren.
2. Anonymous-User per Firebase Account Linking auf Email/Passwort upgraden.
3. UID beibehalten, damit Memberships und Teams stabil bleiben.
4. User-Profil um verifizierte Email und optional Display Name erweitern.
5. Admin-Rollen nicht über UI vergeben, sondern über serverseitige Claims oder Admin-Backend.

## Tests

Ergänzt wurden Tests für:

- lokalen Username-Wechsel ohne Änderung der Legacy-ID
- serverseitige Firebase-Claim-Pruefung

Ausgeführt am 2026-04-30:

- `npm run lint` - bestanden
- `npx tsc --noEmit` - bestanden
- `npm test -- --run src/app/api/admin/online/actions/route.test.ts src/lib/online/online-user-service.test.ts src/lib/online/repositories/online-league-repository.test.ts src/lib/online/online-league-service.test.ts`
- `npm run test:firebase:rules` - 11 Tests bestanden; Emulator musste außerhalb der Sandbox laufen, weil localhost-Port-Binding in der Sandbox blockiert war
- `npm run test:firebase:parity` - 3 Tests bestanden; Emulator musste außerhalb der Sandbox laufen, weil localhost-Port-Binding in der Sandbox blockiert war
- `npm test -- --run` - 126 Testdateien / 726 Tests bestanden

## Offene Punkte

- Echte produktive Admin-Commands sollten serverseitig aus dem Client herausgelöst werden.
- Anonymous Auth sollte später per Account Linking auf permanente Accounts upgradebar sein.
- Dedizierte Multiplayer-E2E-Tests mit zwei Browser-Kontexten fehlen weiterhin.
