# GUI Functionality Final Check

Stand: 2026-05-01

## Umgebung

- Repo: `/Users/lukashanzi/Documents/AFBM`
- Prüfart: Code-/Routen-Audit plus Build-, Lint- und Typecheck-Validierung
- Live-Browser/Firestore-Staging wurde in diesem Lauf nicht direkt mutiert.

## Finale Statusmatrix

| UI-Element | Erwartetes Verhalten | Tatsächliches Verhalten | Status | Fix notwendig |
| --- | --- | --- | --- | --- |
| Savegames Screen | Zeigt Auth-Status, Einstieg, Login, vorhandene Franchises und klare Empty/Error States. | `SaveGamesPage`, `SavegamesAuthStateStatus`, `FirebaseEmailAuthPanel`, `SavegamesListSection` decken Loading, Login, Error, Empty und Liste ab. | Grün | Nein |
| Auth Panel | User versteht Loginstatus, Account, Email/UID, Rolle und Admin-Verfügbarkeit. | Dauerhaftes Auth-Panel zeigt Status, Accountdaten, GM/Admin-Rolle und Admin-Verfügbarkeit. | Grün | Nein |
| Offline Spielen | Validiert Firebase Login, Dynasty Name, User-Team; deaktivierte Erstellung wird erklärt. | `CreateSaveGameForm` sperrt ohne Auth, zeigt Disabled-Grund und nutzt Form/API. Offline-Erstellung kann je Environment bewusst pausiert sein. | Grün | Nein |
| Online Spielen Button | Nur aktiv bei gültigem Firebase Auth; sonst klare Meldung/Login-CTA. | `SavegamesOnlineLink` zeigt Loading, Fehler, Login-CTA oder Link nach `/online`. | Grün | Nein |
| Online Hub | Bietet Weiterspielen, Liga suchen und Zurück. | `/online` ist durch `OnlineAuthGate` geschützt; `OnlineContinueButton`, `OnlineLeagueSearch`, Zurück-Link vorhanden. | Grün | Nein |
| Weiterspielen | Lädt `lastLeagueId`, prüft Liga/Membership und räumt ungültige IDs auf. | `OnlineContinueButton` validiert safe league ID, lädt Liga, löscht ungültige/missing lastLeagueId und zeigt Recovery-Text. | Grün | Nein |
| Liga suchen / Join | Sucht verfügbare Ligen, verlangt Team-Identität, unterstützt Rejoin. | `OnlineLeagueSearch` lädt Ligen, zeigt Loading/Error/Empty, verhindert Join ohne Team-Identität und nutzt `already-member` als Rejoin. | Grün | Nein |
| Multiplayer Rejoin | Bestehende Membership darf nicht überschrieben werden; User soll wieder in Liga kommen. | UI erkennt bestehende User-Mitgliedschaft im League-User-Array und ruft Join ohne neue Team-Identity auf. Repository-/Firestore-Konsistenz wurde in früheren Fixes adressiert. | Grün | Nein |
| Adminmodus Button | Nur Admins gelangen nach `/admin`; Nicht-Admins bekommen Erklärung. | `SavegamesAdminLink` aktiviert Link nur bei UID-Allowlist oder Custom Claim, sonst Login/Denied-Hinweis. | Grün | Nein |
| Admin Auth Gate | Nicht eingeloggte/Nicht-Admins blockieren; Admins sehen Admin Hub. | `AdminAuthGate` prüft Firebase Auth, Custom Claim und UID-Allowlist. | Grün | Nein |
| Admin Hub Hauptbuttons | Ligen verwalten, Liga erstellen, Simulation & Woche, Debug Tools, Zurück reagieren sichtbar. | `AdminControlCenter` scrollt/fokussiert Bereiche, zeigt Notices, Debugpanel und nutzt `/` für Zurück. | Grün | Nein |
| Admin Liga erstellen | Validiert Eingaben, ruft Admin API, aktualisiert Firebase-Liste. | `AdminLeagueManager` und Admin API Client sind angebunden; serverseitiger Admin Guard bleibt maßgeblich. | Grün | Nein |
| Firebase Ligen | Ligen laden, Empty/Error/Retry, Liga öffnen. | `AdminLeagueManager` lädt echte Online-Ligen über Admin API/Repository, hat Loading/Error/Empty/Actions. | Grün | Nein |
| Admin League Detail | Lädt Liga, zeigt Status/Week/Teams/Games/Standings, Actions über Admin API. | `/admin/league/[leagueId]` zeigt Detaildaten, Retry/Back, Week-Simulation, Debug, Draft/GM/Finance-Bereiche. | Grün | Nein |
| Woche simulieren | Nur bei erfüllten Voraussetzungen; keine Fake-Erfolge. | Buttons sind abhängig von Status/Ready/Schedule; API-Fehler werden angezeigt; Doppelklick durch Pending-State begrenzt. | Grün | Nein |
| Logout | SignOut, lokalen Online-Kontext löschen, keine Firestore-Daten löschen, zurück in Auth-State. | `signOutOnlineUser` löscht nur `afbm.online.*` Kontextkeys und navigiert in Savegames/Online-Status zurück. | Grün | Nein |
| Sidebar Navigation | Alle Einträge haben Route oder sichtbaren Disabled-Grund; keine toten Online-Routen. | Offline-Hauptrouten existieren; Online Hash-Routen nutzen vorhandene Anker; nicht fertige Online-Bereiche sind gesperrt. | Grün | Nein |
| Bestehende Franchises | Liste laden, Fortsetzen, Details, Löschen nur mit Confirm/Capability. | `SavegamesListSection` lädt via API, zeigt Loading/Error/Empty, Details, Fortsetzen und bestätigt/disabled Löschen. | Grün | Nein |
| Fehlerfall ohne aktive Liga | User bekommt CTA statt kaputter Seite. | Sidebar zeigt Kontext-Hinweis; Savegame NotFound verlinkt Savegames/Online; Online Continue zeigt Recovery. | Grün | Nein |
| Fehlerfall ohne Team | Team-/Roster-Navigation disabled oder mit klarer Meldung. | Navigation Modell setzt `Kein Manager-Team`/Roster-Gründe; Dashboard Quick Actions haben Disabled-Gründe. | Grün | Nein |
| Fehlerfall ohne Membership | User darf Liga nicht stumm laden; Recovery/Join möglich. | Online League Detail modelliert fehlenden Current League User als Warn-/Recovery-Zustand; Online Hub erlaubt Suche/Rejoin. | Gelb | Nein, aber Staging-Smoke empfohlen |

## Blockierende Fehler

Keine blockierenden Code-/Build-Fehler im aktuellen Stand.

Nicht blockierende Umgebungsblocker:

- `npm run test:e2e` konnte nicht starten, weil PostgreSQL auf `localhost:5432` nicht erreichbar war.
- `npm run test:firebase:parity` konnte den Firestore Emulator in der Sandbox nicht starten (`listen EPERM`/Port-Binding auf `127.0.0.1:8080`, Hub `4400`, Logging `4500`).

## Gelbe Punkte / Restrisiko

- Echter Multiplayer Rejoin hängt von Staging-Datenkonsistenz ab: `memberships`, `leagueMembers` Mirror und `team.assignedUserId` müssen weiterhin konsistent bleiben.
- Firestore Rules können Custom Claims erzwingen; die UID-Allowlist gilt in App/Admin-API, aber nicht automatisch für direkte Client-Rules.
- Optionales Playwright/Firebase-E2E benötigt lokale DB, Browser und Emulatoren. In diesem Lauf wird der Status der optionalen Checks separat dokumentiert.

## Empfohlene nächste Schritte

1. Staging Smoke Test mit Admin-UID: Savegames öffnen, Online Hub öffnen, Rejoin vorhandene Liga, Logout/Login, Admin Hub öffnen.
2. Staging Smoke Test mit Nicht-Admin: Online möglich, Adminmodus blockiert.
3. E2E-Suite regelmäßig in CI mit vorbereiteter PostgreSQL-/Firebase-Emulator-Umgebung laufen lassen.
4. Online-Membership-Datencheck als Admin-Debug-Action weiter ausbauen, falls Staging-Rejoin erneut gelb wird.

## Releasefähigkeit

Releasefähig: Ja für Code-/Build-Release, mit empfohlenem Staging-Smoke vor Rollout.

## Validierung

Ausgeführt:

- `npm run lint` - grün
- `npx tsc --noEmit` - grün
- `npm run build` - grün
- `npm run test:run` - grün, 154 Testdateien, 912 Tests

Optional geprüft:

- `npm run test:e2e` - rot durch Umgebung: PostgreSQL `localhost:5432` nicht erreichbar.
- `npm run test:firebase:parity` - rot durch Umgebung/Sandbox: Firestore Emulator konnte Ports nicht binden.

Nicht ausgeführt:

- `npm test`, weil das Script interaktiv `vitest` startet. Der nicht-interaktive Ersatz `npm run test:run` wurde erfolgreich ausgeführt.
