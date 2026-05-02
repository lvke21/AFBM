# Admin Hub Functionality Report

## Implementierte Admin-Funktionen

- `Adminmodus` auf dem Savegames-Screen navigiert nach `/admin`.
- `/admin` bleibt ueber `AdminAuthGate` geschuetzt:
  - Firebase Login erforderlich.
  - Zugriff nur mit `admin: true` Custom Claim oder UID-Allowlist.
  - Nicht-Admins sehen eine klare Fehlermeldung.
- Der Admin Hub zeigt jetzt eine zentrale Uebersicht fuer die ausgewaehlte Liga:
  - Liga-ID
  - Status
  - Teams
  - Memberships
  - Season/Week und Week-State
  - Draft-State
  - Ready-State
  - Games der aktuellen Woche
- Zentrale Admin-Aktionen im Hub:
  - `Liga oeffnen`
  - `Debug-Status anzeigen`
  - `Woche simulieren`
  - `Woche abschliessen`
  - `Draft-Status pruefen`
- `Woche simulieren` und `Woche abschliessen` laufen ueber die bestehende serverseitige Admin API Action `simulateWeek`.
- Firestore-Teamdaten behalten im UI-Modell nun `assignedUserId` und Assignment-Status, damit Debug-Pruefungen im Hub echte Team-/Membership-Konsistenz erkennen koennen.

## Sicherheitschecks

- Mutierende Week-Aktionen laufen ausschliesslich ueber `/admin/api/online/actions` mit Firebase Bearer Token.
- Admin API prueft serverseitig Adminrechte.
- Week-Aktionen im Hub sind gesperrt, wenn:
  - keine Liga ausgewaehlt ist,
  - Liga nicht aktiv ist,
  - Fantasy Draft nicht abgeschlossen ist,
  - fuer die aktuelle Woche keine Games vorhanden sind,
  - nicht alle aktiven Teams ready sind,
  - bereits eine Hub-Aktion laeuft.
- Vor `Woche simulieren` und `Woche abschliessen` erscheint ein Confirm Dialog.
- Doppelte Simulation bleibt durch bestehende serverseitige Locks/Expected-Week-Checks geschuetzt.
- Destruktive lokale Debug-Aktionen bleiben wie bisher auf lokale Ligen begrenzt und mit Confirm Dialog versehen.

## Debug Panel

Das Debug Panel zeigt:

- aktuelle User UID
- Adminstatus via Claim oder UID-Allowlist
- Backend-Modus
- Firebase Projekt
- Build-/Deploy-Env
- User-Team-Verbindung fuer den aktuellen User
- orphaned Memberships
- Teams ohne `assignedUserId`
- Teams mit `assignedUserId`, aber ohne Membership

## Geaenderte Dateien

- `src/components/admin/admin-control-center.tsx`
- `src/lib/online/online-league-types.ts`
- `src/lib/online/types.ts`
- `src/lib/online/repositories/online-league-repository.test.ts`
- `docs/reports/admin-hub-functionality-report.md`

## Manuelle Testanleitung

1. Mit Firebase User mit Adminrecht anmelden.
2. Savegames-Screen oeffnen und `Adminmodus` klicken.
3. Erwartung: `/admin` oeffnet den Admin Hub.
4. Ohne Adminrecht pruefen: `/admin` zeigt Zugriff verweigert.
5. In `Firebase Ligen` eine Liga auswaehlen.
6. Hub-Uebersicht pruefen:
   - Teams/Memberships
   - Week-State
   - Draft-State
   - Ready-State
7. `Draft-Status pruefen` klicken und Notice pruefen.
8. `Debug-Status anzeigen` klicken und Debug-Listen pruefen.
9. Falls Voraussetzungen fehlen, muss `Woche simulieren`/`Woche abschliessen` deaktiviert bleiben und ein Grund sichtbar sein.
10. Bei aktiver Liga mit Ready-State und Games:
    - `Woche simulieren` klicken.
    - Confirm bestaetigen.
    - Ergebnis/Notice pruefen.
    - Reload und gespeicherten Fortschritt pruefen.

## Bekannte Grenzen

- `Woche abschliessen` nutzt in der aktuellen Architektur dieselbe serverseitige Action wie `Woche simulieren`, weil die Simulation die Woche bereits atomar abschliesst.
- Teams ohne `assignedUserId` werden fuer lokale Ligen nur eingeschraenkt erkannt, weil lokale Ligen keine Firestore-Assignment-Felder speichern.
- Build meldet weiterhin die bestehende Next.js-Warnung zu mehreren Lockfiles; der Build ist erfolgreich.

## Validierung

- `npm run lint` - erfolgreich
- `npx tsc --noEmit` - erfolgreich
- `npx vitest run src/lib/online/repositories/online-league-repository.test.ts src/app/api/admin/online/actions/route.test.ts src/lib/admin/online-admin-actions.test.ts` - erfolgreich, 32 Tests
- `npm run build` - erfolgreich
