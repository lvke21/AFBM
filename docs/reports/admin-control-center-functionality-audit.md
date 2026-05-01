# Admin Control Center Functionality Audit

Datum: 2026-05-01

## Kurzfazit

Das Admin Control Center ist kein reines Mockup. Der Zugriff, die Firebase-Admin-API
und mehrere Kernaktionen funktionieren bereits. Gleichzeitig wirkt die Hub-Navigation
teilweise wie ein Menue, obwohl einige Eintraege nur Anchor-Links sind. Im Firebase-Modus
sind Debug- und GM-Governance-Eingriffe bewusst ausgeblendet oder nur teilweise
serverseitig umgesetzt.

## Geprüfte Dateien

- `src/app/admin/page.tsx`
- `src/app/admin/league/[leagueId]/page.tsx`
- `src/components/admin/admin-auth-gate.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-feedback-banner.tsx`
- `src/components/admin/use-admin-pending-action.ts`
- `src/app/api/admin/online/actions/route.ts`
- `src/app/admin/api/online/actions/route.ts`
- `src/lib/admin/admin-action-guard.ts`
- `src/lib/admin/admin-claims.ts`
- `src/lib/admin/admin-api-client.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`

## Sichtbare Elemente auf `/admin`

| UI-Element | Status | Aktuelles Verhalten | Zielverhalten | Dateien |
|---|---|---|---|---|
| AdminAuthGate | funktioniert | Prüft Firebase Login, `admin` Claim oder UID-Allowlist. Nicht-Admins sehen Access-Gate. | Beibehalten; mittelfristig Allowlist durch Custom Claim/Rollenmodell ersetzen. | `admin-auth-gate.tsx`, `admin-uid-allowlist.ts` |
| Header "Admin Control Center" | funktioniert | Reiner Seitentitel. | Beibehalten. | `src/app/admin/page.tsx` |
| "Ligen verwalten" | funktioniert/teilweise | Anchor-Link zu `#ligen-verwalten`. | Als Navigation okay, aber sollte visuell als Sprungmarke erkennbar sein. | `src/app/admin/page.tsx` |
| "Liga erstellen" | funktioniert/teilweise | Anchor-Link zu `#liga-erstellen`. | Wie oben. | `src/app/admin/page.tsx` |
| "Simulation & Woche" | Dummy/Placeholder | Linkt ebenfalls auf `#ligen-verwalten`, nicht auf einen Simulationsbereich. | Auf passende Detailseite oder klaren Disabled/Coming-soon-Zustand umstellen. | `src/app/admin/page.tsx` |
| "Debug Tools" | teilweise | Linkt zu `#debug-tools`; dieser Bereich existiert nur im lokalen Backend-Modus. In Firebase-Modus läuft der Link ins Leere. | Im Firebase-Modus ausblenden oder zu einem sichtbaren Hinweis springen. | `src/app/admin/page.tsx`, `admin-league-manager.tsx` |
| "Zurück zum Hauptmenü" | funktioniert | Link zu `/app/savegames`. | Beibehalten. | `src/app/admin/page.tsx` |

## Formular "Neue Online-Liga"

| UI-Element | Status | Aktuelles Verhalten | Zielverhalten | Dateien |
|---|---|---|---|---|
| Liga Name | funktioniert | Required, 3 bis 60 Zeichen, wird an `createLeague` gesendet. | Beibehalten, ggf. Duplicate-ID-Konflikte sichtbar machen. | `admin-league-manager.tsx`, `online-admin-actions.ts` |
| Max Spieler | funktioniert | 1 bis 16, serverseitig ebenfalls bounded. In Firebase wird daraus `maxTeams`. | Label in Firebase-Modus auf "Max Teams/Spieler" vereinheitlichen. | `admin-league-manager.tsx`, `admin-action-hardening.ts` |
| Start Woche | funktioniert lokal, ausgeblendet in Firebase | Nur im lokalen Modus sichtbar. Firebase nutzt intern trotzdem `startWeek`, aus der UI aber nicht editierbar. | Entscheiden: entweder in Firebase anzeigen oder bewusst entfernen und dokumentieren. | `admin-league-manager.tsx` |
| Button "Liga erstellen" | funktioniert | Ruft `/admin/api/online/actions` mit Bearer Token auf. Firebase erstellt League, Teams, Draft-State und Player-Pool. | Beibehalten; Erfolg sollte Link zur neuen Liga anbieten. | `admin-league-manager.tsx`, `online-admin-actions.ts` |
| Pending State "Liga wird erstellt..." | funktioniert | Button disabled während Aktion. | Beibehalten. | `use-admin-pending-action.ts`, `admin-league-manager.tsx` |
| Feedback Banner | funktioniert | Zeigt Erfolg oder generische Warnung. | Fehlerdetails differenzierter anzeigen. | `admin-feedback-banner.tsx` |

## Bereich "Firebase Ligen"

| UI-Element | Status | Aktuelles Verhalten | Zielverhalten | Dateien |
|---|---|---|---|---|
| Realtime-Liste | funktioniert | Firebase-Modus subscribed auf verfügbare Ligen. | Beibehalten. | `admin-league-manager.tsx`, Firebase Repository |
| Liga-Karte | funktioniert | Zeigt Name, ID, Status, Spielerzahl, Week. | Beibehalten; ggf. Draft/roster-ready Status ergänzen. | `admin-league-manager.tsx` |
| Link "Öffnen" | funktioniert | Führt nach `/admin/league/{league.id}`. | Beibehalten. | `admin-league-manager.tsx` |
| "Löschen" | funktioniert nur lokal | In Firebase ausgeblendet; Firebase-API kann `deleteLeague` als Archivierung. | Entscheiden, ob Firebase-Archivieren sichtbar sein soll. | `admin-league-manager.tsx`, `online-admin-actions.ts` |
| "Zurücksetzen" | funktioniert nur lokal | In Firebase ausgeblendet; Firebase-API kann Reset. | Wegen Datenrisiko weiter ausblenden oder mit Staging-only Guard sichtbar machen. | `admin-league-manager.tsx`, `online-admin-actions.ts` |
| Empty State | teilweise | Text lautet immer "Keine lokalen Ligen vorhanden.", auch in Firebase-Modus. | Text auf Backend-Modus anpassen: "Keine Firebase-Ligen vorhanden." | `admin-league-manager.tsx` |
| Loading State | teilweise | Es gibt keinen expliziten Loading-State für die League-Liste, nur leere Liste bis Snapshot kommt. | Loading/Initial-Snapshot-State ergänzen. | `admin-league-manager.tsx` |

## Debug Tools auf `/admin`

| UI-Element | Status | Aktuelles Verhalten | Zielverhalten | Dateien |
|---|---|---|---|---|
| Debug Tools Bereich | funktioniert lokal, ausgeblendet in Firebase | Nur bei lokalem Repository sichtbar. | In Firebase-Hub-Navigation nicht darauf verlinken. | `admin-league-manager.tsx` |
| Alle Ligen löschen | funktioniert lokal | Ruft `debugDeleteAllLeagues` und ändert LocalStorage. | Beibehalten lokal. | `admin-league-manager.tsx`, `online-admin-actions.ts` |
| Fake User hinzufügen | funktioniert lokal | Ruft `debugAddFakeUser`. | Beibehalten lokal. | `admin-league-manager.tsx`, `online-admin-actions.ts` |
| Liga mit 16 Spielern füllen | funktioniert lokal | Ruft `debugFillLeague`. | Beibehalten lokal. | `admin-league-manager.tsx`, `online-admin-actions.ts` |
| Alle Spieler ready setzen | funktioniert lokal | Ruft `debugSetAllReady` fuer lokale Ligen. | Beibehalten lokal. | `admin-league-manager.tsx`, `online-admin-actions.ts` |
| LocalStorage reset | funktioniert lokal | Ruft `debugResetOnlineState`. | Beibehalten lokal. | `admin-league-manager.tsx`, `online-admin-actions.ts` |

## Sichtbare Elemente auf `/admin/league/[leagueId]`

| UI-Element | Status | Aktuelles Verhalten | Zielverhalten | Dateien |
|---|---|---|---|---|
| Zurück zum Admin Hub | funktioniert | Link zu `/admin`. | Beibehalten. | `admin-league-detail.tsx` |
| Loading State "Liga wird geladen..." | funktioniert | Sichtbar bis Repository geladen hat. | Beibehalten. | `admin-league-detail.tsx` |
| Not-found State | funktioniert | Zeigt Warnpanel und Ruecklink. | Beibehalten. | `admin-league-detail.tsx` |
| Status/Woche/Spieler/Teams Kacheln | funktioniert | Read-only Aggregation aus League-State. | Um Draft/Foundation-Status erweitern. | `admin-league-detail.tsx`, Types Mapping |
| Alle Spieler auf Ready setzen | funktioniert | Firebase: setzt aktive Memberships ready. | Beibehalten; ggf. Count im Erfolg anzeigen. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Liga starten | teilweise | Firebase startet entweder Draft oder aktive Liga, je nach Draftstatus. Label ist missverständlich. | In zwei klare Aktionen trennen: "Draft starten" und "Liga aktivieren". | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Simulation starten | funktioniert/teilweise | Firebase prüft active League, completed Draft und Ready-State; erzeugt Placeholder-Ergebnisse. | Langfristig echte Simulation Engine anbinden oder Text als Placeholder kennzeichnen. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Spieleransicht öffnen | funktioniert | Link zu `/online/league/{id}`. | Beibehalten. | `admin-league-detail.tsx` |
| Revenue Sharing anwenden | funktioniert nur lokal | In Firebase ausgeblendet. | Optional Firebase-Implementierung ergänzen oder bewusst lokal lassen. | `admin-league-detail.tsx`, `online-admin-actions.ts` |

## Simulationssteuerung

| UI-Element | Status | Aktuelles Verhalten | Zielverhalten | Dateien |
|---|---|---|---|---|
| Ready/Fehlt noch Kacheln | funktioniert | Nutzt `getOnlineLeagueWeekReadyState`. | Beibehalten. | `admin-league-detail.tsx`, `online-league-service` |
| Simulation-Hinweis | funktioniert | Erklärt Sperrgrund. | Beibehalten. | `admin-league-detail.tsx` |
| Woche abgeschlossen | funktioniert | Zeigt letzte CompletedWeek und Ergebnisse. | Beibehalten; Ergebnisquelle validieren. | `admin-league-detail.tsx`, Firebase Mapping |

## Fantasy Draft Control

| UI-Element | Status | Aktuelles Verhalten | Zielverhalten | Dateien |
|---|---|---|---|---|
| Initialisieren | funktioniert | Firebase setzt Draft-State und Pool neu, League zurück auf lobby. | Nur in Dev/Staging sichtbar machen oder mit Warnung versehen. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Starten | teilweise | Ruft intern `startLeague`; startet Draft, wenn Lobby und mindestens zwei Teams. | Umbenennen/entkoppeln von "Liga starten". | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Auto-Pick nächstes Team | funktioniert/teilweise | Firebase wählt positionslogisch aus verfügbarem Pool. | Für Testligen okay; Produktstatus klar als Auto-Testdraft markieren. | `online-admin-actions.ts` |
| Auto-Draft bis Ende | funktioniert/teilweise | Wiederholt Auto-Picks bis Draft Ende. | Warnung ergänzen, dass es Rosters setzt und Draft finalisiert. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Abschluss prüfen | teilweise | Button ist nur aktiv, wenn Draft bereits `completed`; dann prüft/übernimmt Rosters. | Logik prüfen: sollte ggf. bei vollständigem active Draft aktiv sein. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Reset Dev/Test | funktioniert nur lokal | In Firebase ausgeblendet; Firebase-API hat Runtime-Guard. | Beibehalten, nicht in Production anzeigen. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Draft Status/Runde/Am Zug/Picks | funktioniert | Read-only aus FantasyDraft-State. | Beibehalten. | `admin-league-detail.tsx` |
| Pick-Historie | funktioniert | Zeigt letzte 12 Picks. | Beibehalten. | `admin-league-detail.tsx` |

## Finanz-, Training- und GM-Bereiche

| UI-Element | Status | Aktuelles Verhalten | Zielverhalten | Dateien |
|---|---|---|---|---|
| Finanz- und Franchise-Übersicht | funktioniert als Anzeige | Sortierbuttons funktionieren clientseitig. Werte fehlen oft und fallen auf 0/Defaults. | Datenvollständigkeit verbessern oder Empty-State je Feld. | `admin-league-detail.tsx` |
| Sortierbuttons Revenue/Attendance/FanMood/FanPressure/Cash | funktioniert | Sortieren clientseitig. | Beibehalten. | `admin-league-detail.tsx` |
| Liga-Regeln | funktioniert als Anzeige | Zeigt Settings oder Standardtext. | Beibehalten. | `admin-league-detail.tsx` |
| Training Status | funktioniert als Anzeige | Firebase: Aktionen ausgeblendet, "Nur Anzeige im Firebase-MVP". | Beibehalten oder Firebase ResetTrainingPlan implementieren. | `admin-league-detail.tsx` |
| Plan zurücksetzen | funktioniert nur lokal | In Firebase ausgeblendet. | Optional Firebase-Implementierung. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| GM Filter | funktioniert | Clientseitiges Filtern nach Aktivitäts-/Jobstatus. | Beibehalten. | `admin-league-detail.tsx` |
| GM-Eingriffe | funktioniert nur lokal | Firebase zeigt Hinweis "Admin-Eingriffe im Firebase-MVP ausgeblendet." | Firebase-Governance gezielt nachziehen. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Legacy entfernen | funktioniert nur lokal | In Firebase ausgeblendet. Firebase-API hat `removePlayer`, `markVacant`; andere Governance-Aktionen fehlen. | UI/Server-Funktionalität harmonisieren. | `admin-league-detail.tsx`, `online-admin-actions.ts` |
| Logs | funktioniert/teilweise | Zeigt `league.logs`; Firebase Admin-Actions schreiben `adminLogs`, Mapping muss vollständig bleiben. | Sicherstellen, dass Firebase Repository `adminLogs` zuverlässig mapped. | `admin-league-detail.tsx`, Firebase Repository |

## Admin API und Guards

| Bereich | Status | Befund | Dateien |
|---|---|---|---|
| `/admin/api/online/actions` | funktioniert | Re-export auf `/api/admin/online/actions`. | `src/app/admin/api/online/actions/route.ts` |
| `/api/admin/online/actions` | funktioniert | Prüft Bearer Token via Admin SDK, dann dispatch auf OnlineAdminAction. | `src/app/api/admin/online/actions/route.ts` |
| Admin Guard | funktioniert | 401 ohne/ungueltiges Token, 403 fuer Nicht-Admin, erlaubt Claim/UID-Allowlist. | `admin-action-guard.ts`, `admin-claims.ts` |
| Local Admin Actions | funktioniert | Vollständiger lokaler Debug-/Governance-Pfad. | `online-admin-actions.ts` |
| Firebase Admin Actions | teilweise | Kernaktionen existieren: create, archive, reset, setReady, start/draft, simulate, draft controls, remove/markVacant. Nicht implementiert: revenue sharing, training reset, missed week, warn, authorize removal, admin remove. | `online-admin-actions.ts` |
| Fehlerbehandlung | teilweise | API gibt strukturierte Fehler, UI zeigt oft generische Warnung. | `route.ts`, `admin-league-manager.tsx`, `admin-league-detail.tsx` |

## Konkrete Umsetzungsempfehlungen

1. Hub-Navigation korrigieren:
   - "Simulation & Woche" nicht mehr auf `#ligen-verwalten` linken.
   - "Debug Tools" im Firebase-Modus ausblenden oder deaktiviert mit Hinweis anzeigen.

2. Firebase Empty/Loading States nachziehen:
   - "Keine lokalen Ligen vorhanden." zu backend-spezifischem Text machen.
   - Initialen Loading-State fuer Firebase-Ligen einfuehren.

3. League-Detail Primäractions entwirren:
   - "Liga starten" und "Draft starten" klar trennen.
   - Draft-Abschlussbutton aktivieren, wenn Draft vollständig, aber noch nicht finalisiert ist.

4. Firebase-Governance bewusst entscheiden:
   - Entweder GM-Eingriffe sichtbar machen und serverseitig implementieren.
   - Oder alle serverseitig vorhandenen, aber versteckten Aktionen dokumentieren/entfernen.

5. Simulation klar kennzeichnen:
   - Aktuell erzeugt Firebase Week-Simulation Placeholder-/Admin-Ergebnisse.
   - UI sollte "Testsimulation" anzeigen oder echte Engine anbinden.

6. Admin-Logs verifizieren:
   - Mapping von `adminLogs` in Firebase Repository testen.
   - Audit-/Adminlogs in der UI getrennt benennen.

## Empfohlene Arbeitspakete

1. **AP1: Admin Hub UX Cleanup**
   - Anchor-Links korrigieren.
   - Firebase Debug-Link entfernen.
   - Empty/Loading States backend-spezifisch machen.

2. **AP2: Action Status Matrix im Code**
   - Zentrale Definition, welche Aktionen in `local` und `firebase` sichtbar sind.
   - UI Buttons aus dieser Definition rendern.

3. **AP3: Draft Workflow Admin UX**
   - Labels und Button-Enablement mit Draft-State harmonisieren.
   - Finalize/Completed-Zustand klar anzeigen.

4. **AP4: Firebase Governance Actions**
   - `warnGm`, `authorizeRemoval`, `adminRemoveGm`, `recordMissedWeek`, `resetTrainingPlan`, `applyRevenueSharing` serverseitig implementieren oder bewusst aus Typ/UX entfernen.

5. **AP5: Admin Logs QA**
   - Repository-Mapping testen.
   - UI-Empty-State und Logtypen verbessern.

6. **AP6: Simulation Integration**
   - Placeholder-Simulation von echter Simulation trennen.
   - Vorbedingungen und Ergebnisquellen in UI anzeigen.

## Gesamtstatus

Der Adminbereich ist **teilweise produktiv nutzbar** fuer:

- Firebase-Login/Admin-Gate
- Liga erstellen
- Firebase-Ligen listen und öffnen
- Ready setzen
- Draft-Teststeuerung
- Week-Testsimulation unter Bedingungen

Er ist **noch nicht vollständig produktreif** fuer:

- konsistente Hub-Navigation
- Firebase-Governance-Eingriffe
- echte Simulation statt Test-/Placeholder-Ergebnissen
- vollständige Admin-Log-/Audit-Transparenz
