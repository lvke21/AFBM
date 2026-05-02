# UX Flow Current State

Stand: 2026-05-01

Ziel dieses Audits ist der tatsaechliche GUI-Ablauf im aktuellen Codezustand. Es beschreibt nicht die Zielvision, sondern was ein Spieler heute beim Klicken erlebt.

## Kritische UX-Probleme

Keine eindeutig kritischen Sackgassen, die einen eingeloggten Spieler dauerhaft ohne Rueckweg blockieren.

Kritisch nahe Risiken:

- Online-Liga ohne Membership zeigt Recovery, aber der primaere Retry laedt dieselbe Liga erneut. Der Rueckweg zum Online Hub ist vorhanden, der direkte Schritt "Liga neu suchen/joinen" ist aber nicht der primaere Fortschrittsweg.
- Auth ist an zwei Stellen sichtbar: globaler Auth Status plus Firebase Login Panel. Das ist informativ, kann aber wie zwei unterschiedliche Login-Systeme wirken.
- Der Savegames-Screen behauptet "Offline sofort spielbar", verlangt aber Firebase Login, bevor ein Offline-Savegame erstellt werden kann.

## Flow: Einstiegspunkt Savegames Screen

### Schritt-fuer-Schritt Ablauf

1. Startpunkt: `/` oder `/app/savegames`.
2. System rendert `SaveGamesPage` im `AppShell`.
3. Oben erscheint `SavegamesAuthStateStatus`.
4. Rechts erscheinen Einstiegskarten:
   - Offline Spielen
   - Online Zugang
   - Online Spielen
   - Adminmodus
5. Unten erscheint `SavegamesListSection` fuer vorhandene Franchises.

### Systemreaktion

- Auth loading: Statuspanel zeigt "Authentifizierung wird geprüft...".
- Nicht eingeloggt: Savegames-Liste zeigt "Melde dich an, um deine Franchises zu laden."; Online/Admin/Offline verweisen auf Login.
- Eingeloggt: Savegames werden per `/api/savegames` geladen.

### State Changes

- Firebase Auth Provider setzt `loading`, `authenticated` oder `not-authenticated`.
- Savegames-Liste wechselt von `idle` nach `loading`, `ready` oder `error`.

### Zielzustand

- User sieht entweder Login-CTA oder seine Franchises plus Online/Admin-Verfuegbarkeit.

### Probleme

- Der heroartige Text ist sehr dominant und verschiebt die funktionalen Einstiege nach unten/rechts. Fuer wiederkehrende Spieler kann das schwerfaellig wirken.
- "Offline sofort spielbar" widerspricht dem realen Login-Gate.
- Zwei Auth-Komponenten nebeneinander koennen unklar machen, welches Panel der eigentliche Login ist.

### Schweregrad

Mittel.

## Flow: Offline Spielen

### Schritt-fuer-Schritt Ablauf

1. Startpunkt: Savegames Screen.
2. User fuellt `Dynasty-Name`.
3. User waehlt `User-Team`.
4. User klickt `Offline Spielen`.

### Systemreaktion

- Ohne Firebase Login: Button sieht deaktiviert aus, ist aber klickbar und scrollt/fokussiert das Login-Panel.
- Bei deaktivierter Offline-Erstellung: Formularfelder sind disabled, Begruendung wird angezeigt.
- Bei aktivem Formular: Client validiert Name 3-60 Zeichen und gueltiges Team.
- Danach laeuft `createSaveGameAction`.

### State Changes

- Client Error wird gesetzt, wenn Validierung fehlschlaegt.
- Bei Erfolg entsteht ein Savegame und die App navigiert serverseitig/aktionsseitig in den Savegame-Kontext.

### Zielzustand

- Neues Savegame ist erstellt und der User landet im Franchise-Kontext.

### Probleme

- Button nutzt bei Auth-Lock `aria-disabled="true"` und Cursor "not-allowed", fuehrt aber trotzdem eine Aktion aus. Das ist funktional, aber semantisch widerspruechlich.
- "Offline" ist aktuell nicht ohne Firebase Login spielbar. Das ist vermutlich technisch beabsichtigt, aber UX-seitig missverstaendlich.

### Schweregrad

Mittel.

## Flow: Bestehende Franchises

### Schritt-fuer-Schritt Ablauf

1. Startpunkt: Savegames Screen.
2. Nach Login laedt `SavegamesListSection`.
3. Pro Franchise stehen Aktionen bereit:
   - Fortsetzen
   - Details anzeigen/ausblenden
   - Loeschen

### Systemreaktion

- Fortsetzen speichert `afbm.savegames.activeSaveGameId` und navigiert zu `/app/savegames/[savegameId]`.
- Details laden `/api/savegames/[savegameId]` und zeigen Loading/Error/Detaildaten.
- Loeschen ist nur aktiv, wenn API-Capability es erlaubt; sonst erscheint eine Begruendung.
- Loeschen nutzt `window.confirm`.

### State Changes

- `openDetailId`, `detailsById`, `deletingId`, `feedbackMessage`.
- LocalStorage wird nur fuer aktives Savegame gesetzt/entfernt.

### Zielzustand

- User ist im Dashboard des gewaehlten Savegames oder hat Details/Feedback im Savegames Screen.

### Probleme

- Fehler-Reload bei Savegame-Liste nutzt `window.location.reload()`, wodurch UI-Kontext grob zurueckgesetzt wird.
- Delete-Capability ist klar, aber die Loeschaktion wirkt visuell gleichrangig mit normalen Aktionen.

### Schweregrad

Gering.

## Flow: Online Spielen

### Schritt-fuer-Schritt Ablauf

1. Startpunkt: Savegames Screen.
2. User klickt `Online Spielen`.
3. Bei fehlendem Login wird das Login-Panel fokussiert.
4. Bei Login navigiert der Link nach `/online`.
5. `/online` rendert `OnlineAuthGate`.
6. Im Hub sieht der User:
   - Weiterspielen
   - Liga suchen
   - Zurueck zum Hauptmenue
   - OnlineUserStatus

### Systemreaktion

- AuthGate zeigt Loading, Login-Panel oder Hub.
- Weiterspielen liest `lastLeagueId`, validiert sie und laedt die Liga.
- Liga suchen laedt verfuegbare Ligen, zeigt Team-Identity-Auswahl und Join/Rejoin.

### State Changes

- `OnlineContinueButton`: `isLoading`, `feedback`.
- `OnlineLeagueSearch`: `searchState`, `leagues`, `joinFeedback`, `joiningLeagueId`, Team-Identity-Auswahl.
- Repository setzt/loescht `afbm.online.lastLeagueId`.

### Zielzustand

- User landet in `/online/league/[leagueId]` oder bekommt eine erklaerte Recovery.

### Probleme

- `Liga suchen` startet mit kuenstlicher 1000ms Verzoegerung. Das gibt Feedback, kann aber wie Traegheit wirken.
- Join verlangt Stadt/Kategorie/Teamnamen, auch wenn der User gedanklich nur "vorhandene Testliga suchen" erwartet.
- Bei fehlenden Ligen erscheint nur Empty State, kein direkter Admin-/Seed-Hinweis.

### Schweregrad

Mittel.

## Flow: Multiplayer Rejoin / Online League Load

### Schritt-fuer-Schritt Ablauf

1. Startpunkt: `/online/league/[leagueId]` oder Weiterspielen.
2. `OnlineLeagueAppShell` setzt Online-Kontext fuer Sidebar.
3. `OnlineAuthGate` prueft Login.
4. `OnlineLeaguePlaceholder` laedt Liga und Current User.
5. Current User wird gegen `league.users` gematcht.

### Systemreaktion

- Liga missing: Recovery mit "Liga neu suchen".
- User nicht in Liga: Recovery mit Retry "Liga erneut laden" plus Link zurueck zum Online Hub.
- User ohne Team/vacant Team: Recovery mit Retry "Team erneut laden" plus Link zurueck zum Online Hub.
- Gueltiger User: Dashboard/League-Sections werden gezeigt.

### State Changes

- League Load State wechselt loading/error/missing/ready.
- Current user und league user bestimmen, ob Detailbereiche sichtbar werden.

### Zielzustand

- Eingeloggter Member sieht Multiplayer Dashboard mit seinem Team.

### Probleme

- Bei fehlender Membership ist der primaere Button Retry, obwohl Retry ohne Datenreparatur vermutlich keinen Fortschritt bringt. Der eigentliche Fortschritt ist Online Hub -> Liga suchen/Rejoin.
- Meldung "Benutzer ist nicht verbunden" wurde abgemildert, aber der Flow fuehlt sich weiterhin wie ein Fehlerraum an, nicht wie ein gefuehrter Rejoin.

### Schweregrad

Mittel.

## Flow: Adminmodus

### Schritt-fuer-Schritt Ablauf

1. Startpunkt: Savegames Screen.
2. User klickt `Adminmodus`.
3. Ohne Login: Login-Panel wird fokussiert.
4. Eingeloggt ohne Adminrechte: Button ist disabled mit Begruendung.
5. Admin: Link nach `/admin`.
6. `AdminAuthGate` prueft erneut server-/tokennahe Adminrechte.
7. Admin Control Center zeigt Hauptbuttons:
   - Ligen verwalten
   - Liga erstellen
   - Simulation & Woche
   - Debug Tools
   - Zurueck zum Hauptmenue

### Systemreaktion

- Ligen verwalten scrollt/fokussiert `Firebase Ligen`.
- Liga erstellen scrollt/fokussiert Formular und `Liga Name`.
- Simulation & Woche verlangt ausgewaehlte Liga oder navigiert zur Ligadetailseite.
- Debug Tools oeffnet Debug Panel.
- Zurueck zum Hauptmenue navigiert nach `/`, das aktuell Savegames rendert.

### State Changes

- `highlightTarget`, `notice`, `selectedLeague`, `debugVisible`, `pendingHubAction`.
- Admin actions laufen ueber API mit Bearer Token.

### Zielzustand

- Admin sieht Ligen, kann Details oeffnen und sichere Aktionen starten.

### Probleme

- `Zurueck zum Hauptmenue` nutzt `/`, waehrend andere Rueckwege `/app/savegames` nutzen. Aktuell ist `/` ein Re-Export der Savegames-Seite, aber semantisch ist die Navigation inkonsistent.
- AdminAuthGate nennt weiterhin Custom Claim Token-Refresh, obwohl UID-Allowlist ebenfalls admin sein kann. Das ist fachlich nicht falsch, aber fuer allowlisted Admins irritierend.
- Adminbereich ist sehr funktionsdicht; Debug-, Draft-, Simulation- und GM-Aktionen liegen nahe beieinander.

### Schweregrad

Gering bis mittel.

## Flow: Sidebar Navigation

### Schritt-fuer-Schritt Ablauf

1. Startpunkt: AppShell mit oder ohne Savegame/Online-Kontext.
2. Sidebar baut Items aus `buildNavigationItems`.
3. User klickt aktive Links oder sieht Disabled-Grund.

### Systemreaktion

- Ohne Kontext: Notice "Kein aktiver Spielstand oder Online-Liga geladen" plus Savegames/Online Hub CTAs.
- Offline: Hauptlinks navigieren zu `/app/savegames/[savegameId]/...`.
- Online: Team/Roster/Depth/League/Week nutzen Hash-Anker; Online-Features ohne Datenmodell sind disabled.
- Active State beruecksichtigt Hash.

### State Changes

- Pathname/Hash bestimmen Active State.
- Kein fachlicher State wird durch Sidebar selbst mutiert.

### Zielzustand

- User erreicht vorhandene Seiten oder versteht, warum ein Eintrag gesperrt ist.

### Probleme

- Disabled Eintraege sind `span` mit `aria-disabled`, nicht fokussierbare Buttons/Links. Visuell klar, aber Tastatur-UX fuer Erklaerung ist begrenzt.
- Online Hash-Navigation wechselt innerhalb derselben Seite; ohne Scroll-Erfolg/Focus-Management kann sich der Wechsel weniger eindeutig anfuehlen als eine echte Route.
- Online `Draft` ist eine echte Route, andere Online-Hauptbereiche sind Anker oder disabled. Das ist funktional, aber mental uneinheitlich.

### Schweregrad

Gering.

## Flow: Auth Login/Logout

### Schritt-fuer-Schritt Ablauf

1. Startpunkt: Savegames oder Online AuthGate.
2. User gibt Email/Passwort ein oder wechselt zu Registrierung.
3. Submit ruft Firebase Auth Login/Register.
4. Bei Erfolg wird User angezeigt.
5. Logout ruft `signOutOnlineUser`.

### Systemreaktion

- Loading: "Firebase Login wird geprüft..."
- Erfolg: Account, Email, Rolle GM/Admin, Online/Admin-Verfuegbarkeit.
- Fehler: user-facing Firebase Auth Message plus Debug Panel mit code/message.
- Logout entfernt lokale Online-Keys und navigiert zu `/app/savegames`.

### State Changes

- Auth state: `loading` -> `authenticated` oder `anonymous`.
- Lokale Online-Keys werden bei Logout entfernt:
  - `afbm.online.lastLeagueId`
  - `afbm.online.leagues`
  - `afbm.online.userId`
  - `afbm.online.username`

### Zielzustand

- User ist eingeloggt und kann je Rolle Offline/Online/Admin nutzen oder ist ausgeloggt und sieht Login-CTA.

### Probleme

- Begriff `anonymous` im Komponentenstate bedeutet "nicht authentifiziert" und ist nicht sichtbar, aber intern semantisch verwirrend.
- Debug Panel zeigt technische Firebase-Daten direkt im Loginbereich; fuer normale User kann das zu technisch wirken.
- Nach Logout wird Online-Kontext geloescht. Das ist korrekt fuer Sicherheit, fuehrt aber dazu, dass "Weiterspielen" nach erneutem Login erst wieder ueber Liga suchen/Rejoin aufgebaut werden muss.

### Schweregrad

Mittel.

## Flow: Fehlerzustand ohne aktive Liga

### Schritt-fuer-Schritt Ablauf

1. User ist in AppShell ohne Savegame/Online-Kontext oder hat ungueltige Online lastLeagueId.
2. Sidebar oder OnlineContinueButton erkennt fehlenden Kontext.
3. UI zeigt CTA zu Savegames/Online Hub bzw. Recovery-Text.

### Systemreaktion

- Sidebar zeigt Kontextnotice.
- Weiterspielen loescht ungueltige/missing lastLeagueId.
- Savegame NotFound fuehrt zu Savegames/Online Hub.

### Zielzustand

- User kann neu auswaehlen statt in einer kaputten Seite zu bleiben.

### Probleme

- In Online Continue ist "Liga suchen" nicht direkt im Feedback eingebettet, sondern der User muss den darunterliegenden Button nutzen.

### Schweregrad

Gering.

## Flow: Fehlerzustand ohne Team

### Schritt-fuer-Schritt Ablauf

1. User laedt Savegame/Online Liga ohne Manager-Team oder mit unvollstaendigem Roster.
2. Navigation/Online Detail prueft Teamstatus.
3. Teamseiten werden disabled oder Recovery wird angezeigt.

### Systemreaktion

- Offline Sidebar: `Kein Manager-Team`.
- Online Sidebar: `Draft läuft`, `Roster nicht vollständig` oder `Kein Manager-Team`.
- Online Detail: Missing Team Recovery mit Retry und Link zum Online Hub.

### Zielzustand

- User versteht, dass Team/Roster-Kontext fehlt.

### Probleme

- Recovery bietet keinen expliziten "Team neu zuweisen" oder "Membership reparieren" Schritt fuer normale User.
- Admin-Debug kann solche Datenprobleme erkennen, ist aber nicht direkt aus dem User-Recovery-Panel verlinkt.

### Schweregrad

Mittel.

## Flow: Fehlerzustand ohne Membership

### Schritt-fuer-Schritt Ablauf

1. Eingeloggter User oeffnet eine Online-Liga direkt.
2. Liga wird gefunden, User aber nicht in `league.users`.
3. ErrorState/Recovery erscheint.

### Systemreaktion

- Primaerer Button: Liga erneut laden.
- Sekundaerer Link: Online Hub.

### Zielzustand

- User soll ueber Online Hub Liga suchen und joinen/rejoinen.

### Probleme

- Der primaere Retry ist in diesem Zustand oft ein Looping Flow: gleicher Reload, gleicher fehlender Membership-State.
- Der zielfuehrende Pfad ist sekundaer und verlangt, dass der User versteht, warum Liga suchen jetzt Rejoin/Join ausloest.

### Schweregrad

Mittel.

## Dead Ends

- Keine harte Sackgasse ohne Rueckweg gefunden.
- Admin denied fuehrt zurueck zum Hauptmenue.
- Online missing/membership/team states fuehren zurueck zum Online Hub.
- Ungueltiges Savegame fuehrt zu Savegames/Online Hub.

## Looping Flows

- Online League ohne Membership: "Liga erneut laden" kann wieder denselben Fehler anzeigen.
- Online League ohne Team: "Team erneut laden" kann wieder denselben Fehler anzeigen, solange Daten nicht repariert werden.
- Weiterspielen ohne gueltige lastLeagueId zeigt Feedback; Fortschritt entsteht erst ueber separaten Liga-suchen-Button.

## Inkonsistente Navigation

- Rueckwege mischen `/`, `/app/savegames` und `/online`.
- Online Sidebar mischt Hash-Anker, echte Unterroute fuer Draft und disabled Features.
- Savegames Auth Gate und Online Auth Gate zeigen Login aehnlich, aber nicht identisch.

## Unklare Zustaende

- Offline vs Firebase Login: "Offline" klingt lokal, ist aber loginpflichtig.
- Adminstatus: Custom Claim Hinweis kann bei UID-Allowlist-Admins verwirren.
- Online Join verlangt Team-Identitaet, obwohl ein Testliga-Use-Case eher "suchen und beitreten" suggeriert.

## Fehlende Uebergaenge

- Missing Membership Recovery sollte direkt "Liga neu suchen / Rejoin ausfuehren" anbieten.
- Missing Team Recovery sollte einen klaren "Online Hub / Teamzuordnung reparieren" Pfad nennen.
- Online Empty State sollte optional Admin/Seed-Hinweis fuer Testumgebungen zeigen.
- Logout koennte nach erneutem Login den letzten League-Kontext serverseitig ueber Memberships rekonstruieren statt nur localStorage zu verwenden.
