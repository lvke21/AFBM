# Auth UI Functionality Report

Stand: 2026-05-01

## Auth Flow

Der Savegames-Hub zeigt jetzt dauerhaft einen Auth-Status:

- Loading: Firebase Auth wird geprueft.
- Eingeloggt: Anzeigename/Email oder UID, Firebase-Status, Rolle und Admin-Verfuegbarkeit.
- Nicht eingeloggt/Error: klare Meldung mit Fehlertext, falls Firebase Auth nicht initialisiert werden konnte.

Der Logout laeuft ueber `signOutOnlineUser()`. Dabei wird nur lokaler Browser-Kontext entfernt:

- `afbm.online.lastLeagueId`
- `afbm.online.leagues`
- `afbm.online.userId`
- `afbm.online.username`

Firestore-Daten, Memberships, Teams, Savegames und Auth-User werden nicht geloescht.

## Rollenlogik

- Firebase Login vorhanden: User gilt im GUI als GM und darf Online spielen.
- Admin ist verfuegbar, wenn `admin: true` im Firebase ID Token vorhanden ist oder die UID in der serverseitig genutzten Allowlist steht.
- Nicht-Admins sehen im Savegames-Hub keinen aktiven Link in den Adminmodus, sondern eine erklaerende Meldung.
- Admin-API-Schutz bleibt serverseitig in den bestehenden Guards. Die GUI-Freischaltung ist nur UX und kein Sicherheitsmodell.

## Geaenderte Dateien

- `src/lib/online/auth/online-auth.ts`
- `src/lib/online/auth/online-auth.test.ts`
- `src/components/auth/use-firebase-admin-access.ts`
- `src/components/auth/savegames-auth-state-status.tsx`
- `src/components/auth/firebase-email-auth-panel.tsx`
- `src/components/online/online-user-status.tsx`
- `src/components/savegames/savegames-online-link.tsx`
- `src/components/savegames/savegames-admin-link.tsx`
- `src/app/app/savegames/page.tsx`

## Testfaelle

- Nicht eingeloggter User sieht Login erforderlich fuer Online und Admin.
- Klick auf Online/Admin im nicht eingeloggten Zustand springt zum Login-Panel statt in eine gesperrte Route.
- Eingeloggter GM sieht Email/UID und kann Online Hub oeffnen.
- Eingeloggter Nicht-Admin sieht Adminmodus als gesperrt mit Begruendung.
- Admin per UID-Allowlist oder Custom Claim sieht Adminmodus als verfuegbar.
- Logout meldet ab, entfernt lokale Online-Kontext-Keys und navigiert zurueck zum Savegames/Auth-State.
- Lokale Savegame-Auswahl wird beim Logout nicht entfernt.

## Bekannte Einschraenkungen

- Firestore Rules koennen weiterhin Custom Claims voraussetzen; die UID-Allowlist gilt fuer App/Admin-API-Guards, nicht automatisch fuer jede direkte Client-Regel.
- Die Adminrolle im Auth-Panel wird clientseitig angezeigt, serverseitige Mutationen muessen weiterhin ueber die Admin API laufen.

## Validierung

Ausgefuehrt:

- `npx vitest run src/lib/online/auth/online-auth.test.ts src/lib/auth/firebase-auth-state.test.ts` - gruen, 15 Tests
- `npm run lint` - gruen
- `npm run build` - gruen
- `npx tsc --noEmit` - gruen nach frischem Next-Build

Hinweis: Ein parallel vor dem Build gestarteter Typecheck traf erneut auf veraltete `.next/types` Eintraege. Nach dem erfolgreichen Build wurden die Next-Typen neu erzeugt und `npx tsc --noEmit` lief erfolgreich.
