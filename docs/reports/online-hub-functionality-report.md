# Online Hub Functionality Report

## Flow-Beschreibung

1. `Online Spielen` auf dem Savegames-Screen fuehrt fuer eingeloggte Firebase-User nach `/online`.
2. `/online` wird durch `OnlineAuthGate` geschuetzt. Ohne Firebase Login erscheint der Login-State.
3. Der Hub bietet:
   - `Weiterspielen`: liest `afbm.online.lastLeagueId`, validiert die ID, prueft die Membership ueber das Online-League-Repository und navigiert zur Liga.
   - `Liga suchen`: laedt Lobby-Ligen und bereits verbundene Ligen des aktuellen Users.
   - `Zurueck zum Hauptmenue`: navigiert nach `/app/savegames`.
4. `Liga suchen` zeigt Liga-Infos und unterscheidet:
   - neuer Join in Lobby-Liga: Team-Identitaet erforderlich, erstes freies Team wird zugewiesen.
   - Rejoin in bestehende Membership: keine neue Team-Identitaet erforderlich, bestehende Teamzuordnung bleibt erhalten.
5. `Join/Rejoin` schreibt nur bei echtem neuen Lobby-Join. Bestehende Memberships, Mirrors und `assignedUserId` werden nicht ueberschrieben.

## Implementierte Aenderungen

- Firebase-Repository bewertet beim Laden einer Liga jetzt beide Membership-Pfade:
  - `leagues/{leagueId}/memberships/{uid}`
  - `leagueMembers/{leagueId_uid}`
- Wenn die lokale Membership fehlt, aber der globale Mirror aktiv ist und das Team dieselbe `assignedUserId` hat, wird fuer den Client ein gueltiger Membership-Snapshot rekonstruiert. Das repariert den Lade-/Rejoin-Fall ohne Daten zu ueberschreiben.
- Team-Status `ai` blockiert den Load nicht mehr, wenn `assignedUserId` und Membership korrekt auf denselben User zeigen.
- `getAvailableLeagues()` und die Live-Suche enthalten jetzt neben Lobby-Ligen auch aktive Ligen, in denen der aktuelle User bereits Mitglied ist.
- Die Such-UI erlaubt fuer bestehende Memberships `Wieder beitreten`, ohne eine neue Team-Identitaet zu verlangen.

## Schutz bestehender Teams

- Bestehende Teamzuordnungen werden vor Join ausgewertet.
- Wenn ein User bereits ein valides Team hat, endet `joinLeague()` mit `already-member`.
- Es wird kein neues Team zugewiesen und kein vorhandenes `assignedUserId` ersetzt.
- Speziell fuer Faelle wie `solothurn-guardians` gilt: Wenn `assignedUserId`, Mirror und Membership konsistent auf denselben User zeigen, wird die Verbindung als gueltig geladen.

## Geaenderte Dateien

- `src/components/online/online-league-search.tsx`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/repositories/online-league-repository.test.ts`
- `docs/reports/online-hub-functionality-report.md`

## Testfaelle

- Neuer eingeloggter User kann eine Lobby-Liga suchen.
- Neuer eingeloggter User muss vor Join Stadt/Kategorie/Teamnamen waehlen.
- Bestehender User sieht eine bereits verbundene aktive Liga in der Suche.
- Bestehender User kann `Wieder beitreten`, ohne dass Teamname oder Teamzuordnung neu geschrieben werden.
- Fehlende Subcollection-Membership kann clientseitig aus aktivem Mirror plus `team.assignedUserId` gelesen werden.
- Falsche `assignedUserId` wird nicht akzeptiert.
- `Weiterspielen` bereinigt weiterhin ungueltige `lastLeagueId`.

## Bekannte Risiken

- Falls ein Staging-Datensatz weder gueltige Subcollection-Membership noch gueltigen globalen Mirror hat, kann der Client die Verbindung nicht rekonstruieren.
- Firestore Rules erlauben echte Join-Writes nur fuer Lobby-Ligen. Rejoin in aktive Ligen funktioniert lesend ueber vorhandene Membership-/Teamdaten.
- Die Suche nach bestehenden Ligen nutzt den globalen Mirror mit `userId` und `status=ACTIVE`; alte Mirror-Dokumente ohne `userId` brauchen weiterhin ein Daten-Backfill.

## Validierung

- `npm run lint` - erfolgreich
- `npx tsc --noEmit` - erfolgreich
- `npx vitest run src/lib/online/repositories/online-league-repository.test.ts src/components/online/online-league-search-model.test.ts src/components/online/online-continue-model.test.ts` - erfolgreich, 22 Tests
- `npm run build` - erfolgreich

Hinweis: Der Build meldet weiterhin die bestehende Next.js-Warnung zu mehreren Lockfiles und automatisch erkanntem Workspace-Root. Der Build selbst ist gruen.
