# Savegames Functionality Report

## Ziel

Der Savegames-Screen soll vorhandene Franchises laden, anzeigen und sicher bedienen lassen. Neue Offline-Spielstaende werden nur erstellt, wenn die Umgebung den Legacy-Prisma-Speicher technisch erlaubt.

## Implementierte Funktionen

- Vorhandene Franchises werden ueber `GET /api/savegames` geladen und mit Loading-, Error-, Auth- und Empty-State angezeigt.
- Jede Franchise-Karte bietet jetzt eigene Aktionen:
  - `Fortsetzen`: setzt `localStorage["afbm.savegames.activeSaveGameId"]` und navigiert zur Savegame-Dashboard-Route `/app/savegames/[savegameId]`.
  - `Details anzeigen`: laedt Details ueber `GET /api/savegames/[savegameId]` und zeigt Saison, Week-State, Manager-Team, Salary Cap und Teamuebersicht.
  - `Loeschen`: ist nur aktiv, wenn die Umgebung Savegame-Archivierung erlaubt. Vor dem Request wird ein Confirm-Dialog angezeigt.
- Prisma-Savegames werden beim Loeschen nicht hart entfernt, sondern sicher auf `ARCHIVED` gesetzt und aus der Liste ausgeblendet.
- Firestore-Staging-Savegames koennen ueber den Screen nicht geloescht werden. Die UI deaktiviert die Aktion und zeigt den Grund.
- Das Offline-Erstellen validiert clientseitig:
  - Dynasty-Name erforderlich, getrimmt, 3 bis 60 Zeichen.
  - User-Team muss aus dem vorhandenen Franchise-Katalog stammen.
  - Deaktivierte Erstellung zeigt eine sichtbare Begruendung statt still zu scheitern.

## Geaenderte Dateien

- `src/app/api/savegames/route.ts`
- `src/app/api/savegames/[savegameId]/route.ts`
- `src/components/savegames/savegames-list-section.tsx`
- `src/components/ui/create-savegame-form.tsx`
- `src/modules/savegames/application/savegame-command.service.ts`
- `src/modules/savegames/infrastructure/savegame.repository.ts`
- `src/server/repositories/saveGameRepository.firestore.ts`
- `docs/reports/savegames-functionality-report.md`

## Daten- und Sicherheitsentscheidung

Savegame-"Loeschen" verwendet fuer Prisma bewusst Soft-Delete (`status = ARCHIVED`). Damit werden referenzierte Saison-, Team-, Spieler- und Matchdaten nicht destruktiv entfernt. Firestore-Loeschungen bleiben deaktiviert, weil die vorhandene Firestore-Struktur fuer Online-/Staging-Ligen produktionsnah ist und ohne explizite Migrations-/Delete-Freigabe nicht sicher geloescht werden soll.

## Benutzer-Testanleitung

1. App oeffnen und im Savegames-Screen anmelden.
2. Bereich `Vorhandene Franchises` pruefen.
3. Bei vorhandener Franchise `Details anzeigen` klicken und Detaildaten pruefen.
4. `Fortsetzen` klicken und sicherstellen, dass `/app/savegames/[savegameId]` geladen wird.
5. Zurueck zum Savegames-Screen und `Loeschen` testen:
   - In Prisma-Umgebung erscheint ein Confirm-Dialog und die Franchise verschwindet nach Bestaetigung aus der Liste.
   - In Firestore-Staging ist der Button deaktiviert.
6. Offline-Spiel erstellen:
   - Leeren oder zu kurzen Dynasty-Namen testen.
   - Gueltigen Dynasty-Namen und User-Team testen.
   - In Firestore-Staging muss die bekannte Deaktivierungsnachricht sichtbar bleiben.

## Bekannte Einschraenkungen

- Firestore-Savegames werden nicht geloescht oder archiviert.
- `Fortsetzen` fuehrt konservativ zum Savegame-Dashboard, nicht automatisch in einen laufenden Spielablauf.
- Die Detailansicht zeigt eine kompakte Zusammenfassung, keine vollstaendige Verwaltungsansicht.

## Validierung

- `npm run lint` - erfolgreich
- `npx tsc --noEmit` - erfolgreich
- `npm run build` - erfolgreich

Hinweis: Der Build meldet weiterhin die bestehende Next.js-Warnung, dass wegen mehrerer Lockfiles der Workspace-Root automatisch auf `/Users/lukashanzi/package-lock.json` abgeleitet wurde. Der Build selbst ist erfolgreich.
