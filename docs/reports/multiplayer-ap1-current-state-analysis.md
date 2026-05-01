# Multiplayer AP1 Current State Analysis

Stand: 2026-04-30

## Executive Summary

Die Multiplayer-Umgebung besteht aktuell aus zwei nebeneinander existierenden Schichten:

1. **Online-Hub / Online-Liga-MVP** unter `/online` mit Firebase Anonymous Auth, optionalem Email/Passwort-Linking, Firestore-Realtime-Reads und einem begrenzten Firestore-Write-Pfad fuer Join, Ready-State und Depth-Chart.
2. **Legacy-/Offline-Savegame-Week-Flow** unter `/app/savegames/...` mit eigener Repository-Auswahl (`DATA_BACKEND`) und einem separaten Firestore-Modell fuer Savegames, Seasons, Weeks und Matches.

Der Online-Hub nutzt im Staging `NEXT_PUBLIC_AFBM_ONLINE_BACKEND=firebase` und schreibt Online-Liga-Daten nach `leagues/{leagueId}` mit Subcollections `memberships`, `teams`, `events`, `weeks` und `adminLogs`. Admin-Aktionen laufen serverseitig ueber `/admin/api/online/actions` bzw. `/api/admin/online/actions` und verwenden im Firebase-Modus den Admin SDK. Die meisten tiefen Liga-Dashboard-Aktionen wie Training, Contracts, Trades, Draft, Coaches, Franchise-Strategie und Pricing rufen im Client jedoch noch Legacy-LocalStorage-Service-Funktionen auf und sind damit im Firebase-Modus nicht echt synchronisiert.

## Analysierter Bereich

- Online Hub: `src/app/online/page.tsx`
- Liga laden: `src/components/online/online-continue-button.tsx`, `src/components/online/online-continue-model.ts`
- Liga suchen und Join Flow: `src/components/online/online-league-search.tsx`
- Liga Dashboard: `src/app/online/league/[leagueId]/page.tsx`, `src/components/online/online-league-placeholder.tsx`, `src/components/online/online-league-detail-model.ts`
- Repository-Abstraktion: `src/lib/online/online-league-repository-provider.ts`, `src/lib/online/repositories/*`
- Online-Domain/Local-State: `src/lib/online/online-league-service.ts`, `src/lib/online/online-user-service.ts`
- Firebase Auth: `src/lib/online/auth/online-auth.ts`, `src/lib/online/auth/account-linking.ts`
- Adminbereich: `src/app/admin/*`, `src/components/admin/*`, `src/lib/admin/online-admin-actions.ts`
- Week Simulation: `src/lib/admin/online-admin-actions.ts`, `src/modules/savegames/application/week-flow.service.ts`, `src/server/repositories/weekMatchStateRepository.firestore.ts`
- Firestore Sync/Security: `src/lib/firebase/*`, `firestore.rules`, `firestore.indexes.json`
- E2E-Abdeckung: `e2e/multiplayer-smoke.spec.ts`, `e2e/multiplayer-firebase.spec.ts`

## Technische Bestandsaufnahme

### Online Hub

`/online` ist eine Client-orientierte Multiplayer-Oberflaeche. Sie rendert:

- `OnlineUserStatus`: aktueller Online-User, Firebase Anonymous Auth Status, Account sichern.
- `OnlineContinueButton`: letzte Liga aus lokaler Persistenz laden.
- `OnlineLeagueSearch`: Ligen suchen, Team-Identitaet waehlen, beitreten.
- `OnlineModeStatus`: Anzeige `local` vs. `firebase`.

Der aktive Backend-Modus wird in `getOnlineBackendMode()` aus `NEXT_PUBLIC_AFBM_ONLINE_BACKEND`, dem beim Bundle-Build eingefrorenen public env-Wert oder `AFBM_ONLINE_BACKEND` gelesen. Nur der Wert `firebase` aktiviert das Firestore-Repository; alles andere faellt auf `local` zurueck.

### Liga Laden

`OnlineContinueButton` liest `repository.getLastLeagueId()`. Im Firebase-Repository ist das weiterhin Browser-LocalStorage (`afbm.online.lastLeagueId`), nicht Firestore. Danach wird `repository.getLeagueById(lastLeagueId)` ausgefuehrt:

- Firebase: `FirebaseOnlineLeagueRepository.mapLeague()`, bestehend aus `leagues/{leagueId}`, `memberships`, `teams`, `events`.
- Local: `getOnlineLeagueById()` aus `afbm.online.leagues`.

Wenn die Liga fehlt, wird die lokale `lastLeagueId` bereinigt. Ein serverseitiger Redirect oder OAuth-Gate existiert in diesem Pfad nicht.

### Liga Suchen

`OnlineLeagueSearch` startet explizit per Button. Im Firebase-Modus:

- Initialer Query: `collection("leagues")` mit `status == "lobby"` und `settings.onlineBackbone == true`.
- Realtime-Subscription: gleicher Query via `onSnapshot`.
- Fuer jede Lobby-Liga werden Teams gelesen und in eine reduzierte Public-Lobby-Ansicht gemappt.

Firestore Rules erlauben Public-Lobby-Reads nur fuer signierte Firebase-User (`request.auth != null`) und nur bei `settings.onlineBackbone == true` plus `status == "lobby"`. Anonymous Auth muss also funktionieren, aber es ist kein OAuth/Login-Screen erforderlich.

### Join Flow

Firebase Join laeuft ueber `FirebaseOnlineLeagueRepository.joinLeague()`:

1. `getCurrentAuthenticatedOnlineUser("firebase")` stellt `auth.currentUser` sicher oder ruft `signInAnonymously()`.
2. Firestore Transaction liest Liga, eigene Membership und Team.
3. Falls noch keine Teams existieren, werden MVP-Teams aus `ONLINE_MVP_TEAM_POOL` erstellt.
4. Team-Identitaet wird validiert.
5. Ein freies Team wird mit `assignedUserId = auth.uid` markiert.
6. `memberships/{uid}` wird als aktive GM-Membership geschrieben.
7. `memberCount`, `updatedAt`, `version` werden auf der Liga aktualisiert.
8. Event `user_joined_league` wird geschrieben.
9. `afbm.online.lastLeagueId` wird im Browser gespeichert.

Der Join Flow nutzt Firestore Transactions und Rules mit `existsAfter/getAfter`, um Membership-, Team- und Counter-Update logisch zusammen zu autorisieren. Bekannte Grenze: Die Client-Transaktion preloaded Teams vor der Transaction und prueft Identitaetskollision gegen diese Liste; echte Konflikte werden teilweise erst durch Rules/Transaction-Reads abgefangen.

### Liga Dashboard

`/online/league/[leagueId]` rendert `OnlineLeaguePlaceholder`.

Im Firebase-Modus:

- `repository.getCurrentUser()` liest Firebase User.
- `repository.subscribeToLeague()` haengt vier Listener an:
  - `leagues/{leagueId}`
  - `leagues/{leagueId}/memberships`
  - `leagues/{leagueId}/teams`
  - `leagues/{leagueId}/events` mit `orderBy(createdAt desc), limit(20)`
- Jede Snapshot-Aenderung ruft erneut `mapLeague()` auf und liest die gesamte Liga-Sicht.

Tatsaechlich Firestore-synchronisierte User-Aktionen im Dashboard:

- Ready setzen: `repository.setUserReady()`
- Depth-Chart speichern: Repository-Port existiert und Firestore-Implementierung schreibt `teams/{teamId}.depthChart`, aber in der aktuellen UI ist keine erkennbare produktive Eingabeaktion fuer das Speichern einer veraenderten Depth Chart verdrahtet.

Nicht voll Firebase-synchronisierte Dashboard-Aktionen:

- Training Plan
- Franchise-Strategie
- Stadium Pricing
- Contracts: extend/release/sign
- Trades: create/accept/decline
- Draft: scout/draft
- Coaches: hire/fire
- Media Expectations
- Claim Vacant Team

Diese Aktionen rufen in `OnlineLeaguePlaceholder` direkt Funktionen aus `online-league-service.ts` auf. Diese Funktionen schreiben in `afbm.online.leagues` im Browser-LocalStorage. Im Firebase-Modus veraendern sie dadurch nicht die Firestore-Liga und sind nach Realtime-Refresh/Reload nicht belastbar.

### Adminbereich

Adminzugriff ist vom Online-GM getrennt und verwendet Firebase Auth Custom Claims. `/admin` und `/admin/league/[leagueId]` nutzen das Claim-Gate.

Admin UI:

- `AdminLeagueManager`: Liga erstellen, listen, loeschen/archivieren, resetten, Debug Tools.
- `AdminLeagueDetail`: Ready setzen, Liga starten, Week simulieren, GM entfernen, Vacant markieren, lokale Legacy-Actions fuer Finance/Training/Inaktivitaet.

Admin Actions laufen ueber:

- `/admin/api/online/actions`
- Re-export auf `/api/admin/online/actions`
- `requireAdminActionSession()`
- `executeOnlineAdminAction()`

Im Firebase-Modus sind serverseitig implementiert:

- `createLeague`
- `deleteLeague` bzw. Archivieren
- `resetLeague`
- `setAllReady`
- `startLeague`
- `simulateWeek`
- `removePlayer`
- `markVacant`

Im Firebase-Modus nicht serverseitig implementiert und daher aktuell mit Fehler belegt:

- `applyRevenueSharing`
- `resetTrainingPlan`
- `recordMissedWeek`
- `warnGm`
- `authorizeRemoval`
- `adminRemoveGm`

### Week Simulation

Es gibt zwei getrennte Simulationsebenen:

1. **Online-Admin-Week-Simulation** in `executeFirebaseAction("simulateWeek")`:
   - Erlaubt nur `league.status == "active"`.
   - Setzt alle aktiven Memberships `ready=false`.
   - Inkrementiert `currentWeek` bis 18, danach neue Season.
   - Schreibt Event `week_simulated_placeholder`.
   - Es werden keine echten Matches, Stats, Standings oder Team-/Player-Folgeeffekte simuliert.

2. **Offline-/Savegame-Week-Flow** in `week-flow.service.ts`:
   - Wird durch `/app/savegames/[saveGameId]/week-actions.ts` angesprochen.
   - Nutzt `DATA_BACKEND` zur Umschaltung.
   - Prisma-Modus: echte Transactionen, Matchstatus, Minimal-Drive-Simulation, TeamStats, SeasonStats, Player Development.
   - Firestore-Modus: `weekMatchStateRepositoryFirestore`, Top-Level-Collections `leagues`, `seasons`, `weeks`, `matches`; Systemresultate werden deterministisch erzeugt.

Diese beiden Pfade teilen sich nicht denselben Online-Domainzustand. Online-Admin `simulateWeek` ist aktuell ein Multiplayer-Lobby-/Admin-Placeholder, nicht die tiefe Football-Simulation.

## Alle State-Quellen

### Browser / Client

- `firebaseLocalStorageDb` IndexedDB: Firebase Auth Session, Anonymous UID, Tokens.
- `afbm.online.userId`: Legacy/local Online User ID.
- `afbm.online.username`: Online Display Name / lokaler Username; wird auch als Fallback fuer Firebase `displayName` genutzt.
- `afbm.online.leagues`: LocalOnlineLeagueRepository und Legacy-Online-Domainzustand.
- `afbm.online.lastLeagueId`: Continue-Ziel fuer `/online`.
- `afbm-online-league-expert-mode`: UI-Schalter im Liga-Dashboard.
- Legacy Multiplayer Keys:
  - `afbm.multiplayer.userId`
  - `afbm.multiplayer.username`
  - `afbm.multiplayer.leagues.global`
  - `afbm.multiplayer.lastLeagueId`
- React-Komponentenstate fuer Search, Join, Feedback, Pricing, Training, Pending Actions.

### Firestore Client-SDK

Online-Multiplayer-Pfad:

- `leagues/{leagueId}`
- `leagues/{leagueId}/memberships/{uid}`
- `leagues/{leagueId}/teams/{teamId}`
- `leagues/{leagueId}/events/{eventId}`
- `leagues/{leagueId}/weeks/{seasonWeekId}`
- `leagues/{leagueId}/adminLogs/{logId}` server-only

### Firestore Admin-/Server-SDK

- Online Admin Actions schreiben die Online-Multiplayer-Subcollections.
- Savegame-Firestore-Backend nutzt separate Top-Level-Collections:
  - `leagues`
  - `leagueMembers`
  - `teams`
  - `players`
  - `seasons`
  - `weeks`
  - `matches`
  - `gameEvents`
  - `playerStats`
  - `teamStats`
  - `reports`

### Server Sessions / Cookies

- `afbm.admin.session`: Adminbereich, serverseitig geprueft.
- Offline-App-Session/User-ID: `requirePageUserId()` in `/app/savegames`-Server-Actions.

### Environment / Config

- `NEXT_PUBLIC_AFBM_ONLINE_BACKEND`: Client-Auswahl `local` vs. `firebase`.
- `AFBM_ONLINE_BACKEND`: serverseitige Online-Modus-Quelle/Fallback.
- `DATA_BACKEND`: Savegame-Repository-Auswahl, nicht identisch mit Online-Repository-Auswahl.
- `NEXT_PUBLIC_FIREBASE_*`: Firebase Web App Config.
- `FIREBASE_PROJECT_ID`: Firebase Admin/Firestore Projekt.
- `AFBM_DEPLOY_ENV`, `NEXT_PUBLIC_AFBM_DEPLOY_ENV`: Staging Guard fuer Firestore.
- Firebase Custom Claim `admin: true`: Adminzugriff.

## Alle Sync-Pfade

### Online Hub -> Firebase Auth

`getCurrentAuthenticatedOnlineUser()`:

- liest `auth.currentUser`;
- wartet auf `onAuthStateChanged`;
- erzeugt notfalls per `signInAnonymously()` einen anonymen User;
- setzt bei Bedarf `displayName` via `updateProfile`.

Optional:

- `secureCurrentOnlineAccount()` linkt Anonymous User per `EmailAuthProvider.credential()` und `linkWithCredential()`.
- Bei Erfolg bleibt die UID erhalten; Memberships bleiben an dieselbe UID gekoppelt.

### Liga-Suche -> Firestore

- Query auf `leagues` mit `status == "lobby"` und `settings.onlineBackbone == true`.
- `subscribeToAvailableLeagues()` nutzt `onSnapshot`.
- Fuer Public Cards werden Teams geladen und belegte Plaetze aus Team-Zuweisungen abgeleitet.

### Join -> Firestore

- Transaction schreibt Team-Claim, Membership, League Counter und Event.
- Firestore Rules pruefen sign-in, Lobby-Status, Self-Membership, Team-Assignment und Counter-Update.
- Nach Erfolg wird `afbm.online.lastLeagueId` lokal gespeichert.

### Liga Dashboard -> Firestore

- Realtime Reads ueber `subscribeToLeague()`.
- Ready-State schreibt `memberships/{uid}.ready`.
- Depth-Chart-Port schreibt `teams/{teamId}.depthChart`, UI-Speicheraktion ist derzeit nicht sichtbar produktiv verdrahtet.

### Liga Dashboard -> LocalStorage

Viele Dashboard-Aktionen schreiben direkt in `afbm.online.leagues`. Im Firebase-Modus ist das ein Sync-Bruch, weil der Realtime-Listener weiter Firestore als Quelle nutzt.

### Admin UI -> Server -> Firestore

- Client POST an `/admin/api/online/actions`.
- Server prueft Firebase ID Token.
- Firebase-Modus verwendet Admin SDK und schreibt direkt nach Firestore.
- Audit erfolgt ueber `auditAdminAction()` und zusaetzlich `adminLogs` in der Liga.

### Online Admin Week Simulation -> Firestore

- Placeholder-Pfad: reset ready, advance week, event.
- Keine echte Matchsimulation.

### Offline Savegame Week Flow -> Server Repositories

- Server Actions in `/app/savegames/[saveGameId]/week-actions.ts`.
- Bei `DATA_BACKEND=firestore` Nutzung von `weekMatchStateRepositoryFirestore`.
- Nicht Teil des Online-Hub-Firestore-Lobby-Modells.

## Bekannte Fehlerfaelle

1. **Firebase Auth / Account sichern**
   - Zuletzt beobachteter Staging-REST-Fehler: `CONFIGURATION_NOT_FOUND`.
   - Code zeigt mittlerweile konkrete Meldungen, aber Live-Erfolg haengt von Firebase-Projekt/Auth-Konfiguration ab.

2. **Dashboard-Aktionen im Firebase-Modus syncen nicht vollstaendig**
   - Training, Contracts, Trades, Draft, Coaches, Pricing, Franchise-Strategie und Media Expectations schreiben aktuell lokal.
   - Nutzer koennen Feedback sehen, aber Firestore bleibt unveraendert.

3. **Online Week Simulation ist Placeholder**
   - Admin `simulateWeek` simuliert keine Spiele und erzeugt keine echten Stats.
   - Erwartung "Week Simulation" kann fachlich groesser sein als implementiert.

4. **Doppelte Domainmodelle**
   - Online-Multiplayer-Ligen und Savegame-Firestore-Ligen nutzen denselben Namen `leagues`, aber unterschiedliche Datenformen und Pfade.
   - Das erhoeht Risiko fuer falsche Annahmen in Rules, Admin Tools und Reports.

5. **Legacy Multiplayer-Keys existieren weiter**
   - `src/lib/multiplayer/*` wird nur von Tests und Root-Initializer indirekt ueber Online-User-Init beruehrt.
   - Alte Keys koennen Browser-State verwirren, sind aber nicht der aktive `/online`-Repository-Pfad.

6. **Realtime-Subscription kann teuer/laut werden**
   - Jede Aenderung an League, Memberships, Teams oder Events ruft `mapLeague()` auf, das alle vier Bereiche erneut liest.
   - Bei groesseren Ligen kann das unnoetige Reads erzeugen.

7. **Rules und Query-Index-Abdeckung**
   - Online Lobby Query nutzt `status` + `settings.onlineBackbone`; Firestore kann fuer verschachtelte Map-Felder je nach Projektzustand Indexanforderungen ausloesen.
   - `firestore.indexes.json` enthaelt viele Savegame-Indizes, aber keinen expliziten Online-Lobby-Composite-Index.

8. **Admin lokale Debug-Tools**
   - Im Firebase-Modus sind Debug-Buttons deaktiviert, aber der Route-Handler kennt Local-State-Actions weiterhin.
   - Falscher `backendMode` im Request koennte lokale Simulation gegen mitgesendeten Local-State ausfuehren, nicht Firestore.

9. **LocalStorage als Continue-Quelle**
   - `afbm.online.lastLeagueId` ist geraete-/browserlokal.
   - Nach Browserwechsel oder geloeschtem Storage existiert keine serverseitige "meine letzte Liga"-Suche.

10. **Public Lobby Mapping anonymisiert belegte Plaetze**
    - Belegte Teams werden als "Belegter Platz" abgebildet.
    - Gut fuer Privatsphaere, aber UI kann dadurch nicht alle realen Membership-Details anzeigen.

## Risikoliste

| Risiko | Schwere | Bereich | Beschreibung | Empfehlung |
| --- | --- | --- | --- | --- |
| Firebase-Dashboard-Aktionen schreiben lokal statt Firestore | Hoch | Liga Dashboard | Nutzeraktionen scheinen erfolgreich, sind aber nicht persistent/synchron. | Pro Aktion entscheiden: ausblenden, serverseitig implementieren oder Repository-Port verwenden. |
| Online-Week-Simulation ist nur Placeholder | Hoch | Admin/Simulation | Woche wird weitergezaehlt, aber keine echte Spiel-/Stat-Logik. | UI klar labeln oder echten Online-Simulations-Write-Pfad bauen. |
| Zwei Firestore-Liga-Modelle | Hoch | Architektur | Online `leagues/{id}/...` und Savegame Top-Level `leagues`, `matches`, `weeks` koexistieren. | Naming/Docs/Adapter klar trennen; langfristig Konsolidierung planen. |
| Account-Linking haengt an Firebase-Projektkonfiguration | Mittel/Hoch | Auth | Code kann Fehler sauber anzeigen, aber Provider-Konfig muss in Firebase stimmen. | Staging Auth Provider/API-Key-Konfiguration pruefen und als Release-Check aufnehmen. |
| Realtime Listener lesen zu viel | Mittel | Sync/Kosten | Vier Listener triggern Voll-Remap der Liga. | Snapshot-Payload inkrementell mappen oder zusammengefuehrte Query-/State-Schicht bauen. |
| LocalStorage Continue ist nicht accountgebunden | Mittel | UX/Persistenz | Nach Device-Wechsel fehlt "Weiterspielen". | Firestore Query "my active memberships" ergaenzen. |
| Admin Actions teilweise Firebase-unimplemented | Mittel | Adminbereich | Einige Buttons koennen im Firebase-Modus 500/400 liefern. | UI je Backend auf verfuegbare Aktionen begrenzen. |
| Rules-Komplexitaet fuer Join | Mittel | Firestore Security | Transaction + Rules mit existsAfter/getAfter ist korrekt, aber schwer wartbar. | Tests fuer Race Conditions und Rules-Parity erweitern. |
| Legacy `src/lib/multiplayer` | Niedrig/Mittel | Codebase Hygiene | Alte LocalStorage-Keys und Tests bleiben, aktive App nutzt `src/lib/online`. | Als Legacy markieren oder entfernen, sobald keine Rueckwaertskompatibilitaet noetig ist. |

## Bewertung Pro Fokusbereich

### Online Hub

Stabil fuer Modus-Anzeige, Anonymous Auth Bootstrap, Liga-Suche und Continue. Hauptabhaengigkeit ist korrekte Firebase Web-App-Konfiguration. Kein OAuth/Auth.js-Fluss erkennbar.

### Liga Laden

Funktional, aber `lastLeagueId` ist lokal. Es gibt keinen Firestore-basierten "meine Ligen"-Index fuer ein neues Geraet.

### Liga Suchen

Firestore-Realtime-Query ist vorhanden. Public-Lobby-Sicht ist bewusst reduziert. Risiko liegt bei Index/Rules und Auth-Konfiguration.

### Join Flow

Technisch am weitesten ausgebaut: Firestore Transaction, Rules-Abdeckung, E2E mit zwei Browser-Kontexten und Cross-User-Write-Block. UID-basierte Membership ist korrekt fuer Anonymous Auth und Account-Linking.

### Liga Dashboard

Anzeige und Ready-Flow sind Firebase-faehig. Viele interaktive Manager-Systeme bleiben Legacy-local. Das ist aktuell der groesste Produkt-/Sync-Bruch im Multiplayer.

### Adminbereich

Adminzugriff ist an Firebase Auth gekoppelt. Firebase-Admin-Grundfunktionen existieren. Erweiterte Admin-/GM-Governance-Aktionen sind im Firebase-Modus noch nicht vollstaendig implementiert.

### Week Simulation

Online: Placeholder. Offline/Savegame: eigener tiefer Flow. Es gibt noch keine klare Bruecke vom Online-Liga-Modell zur echten Football-Simulation.

### Lokale Persistenz

LocalStorage ist breit genutzt und fuer lokalen Testmodus sinnvoll. Im Firebase-Modus bleibt LocalStorage fuer `lastLeagueId`, Username-Fallback und Expert-Mode relevant, darf aber nicht als Quelle fuer echte Liga-Domainwrites missverstanden werden.

### Firebase/Firestore Sync

Join, Ready, Read/Subscribe und Admin-Basisaktionen sind vorhanden. Vollstaendige Domain-Synchronisation fehlt fuer die tieferen GM-Features.

## AP1-Fazit

Der Multiplayer ist als Firebase-basierter Lobby-/Membership-/Ready-MVP tragfaehig, aber noch kein vollstaendig synchroner Online-Franchise-Modus. Die kritische AP1-Erkenntnis ist die Schichtentrennung:

- **Gruen/relativ belastbar:** Anonymous Auth Bootstrap, Liga suchen, Join, Membership/Team-Claim, Ready-State, Admin Create/Start/Reset/Archive/SetReady/Remove/Vacant, Realtime-Anzeige.
- **Gelb/teilweise:** Account sichern, Continue ueber LocalStorage, Dashboard-Anzeige aus Firestore-Mapping.
- **Rot/nicht voll produktionsreif:** tiefe Dashboard-Aktionen im Firebase-Modus, echte Online-Week-Simulation, Firestore-Konsolidierung zwischen Online-Liga und Savegame-Liga.

Empfohlener naechster Schnitt waere kein Feature-Ausbau, sondern ein expliziter **Firebase Multiplayer Capability Matrix**: pro Button im Online- und Admin-Dashboard festlegen, ob er Firestore-produktiv, Local-only, server-only oder bewusst deaktiviert ist.
