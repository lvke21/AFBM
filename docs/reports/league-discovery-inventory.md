# League Discovery Inventory

Stand: 2026-05-03, aktualisiert nach Package-Verifikation

Ziel: Inventar aller Stellen, an denen League-Discovery, Continue/Resume oder Zugriffsermittlung ueber den globalen `leagueMembers`-Mirror oder aehnliche Projektionen laeuft.

Bewertungsregel:
- **Membership** meint die kanonische Online-Membership unter `leagues/{leagueId}/memberships/{uid}`.
- **Mirror** meint den globalen Index `leagueMembers/{leagueId}_{uid}`.
- **Wahrheit** meint: Der Pfad entscheidet selbst fachlich ueber Sichtbarkeit/Zugriff/Resume, ohne anschliessend die kanonische Membership zu validieren.

## Kurzfazit

Online-Core-Reads und Write-Gates sind ueberwiegend membership-kanonisch: `getLeagueById`, Route-State, Ready, Team-Control und Simulation laden oder pruefen `leagues/{leagueId}/memberships/{uid}`. Der globale Mirror wird dort nur zur Konflikterkennung oder Reparatur herangezogen.

Die verbleibende kritische Flaeche liegt bei **Client-Discovery ueber Firestore Web SDK**:
- `getFirebaseJoinedLeagueIdsForUser` und `subscribeToFirebaseAvailableLeagues` starten mit `leagueMembers`, validieren danach aber gegen die kanonische Membership. Das ist ein Index, keine fachliche Wahrheit, aber fehlende Mirror-Dokumente machen eine aktive Liga in der Client-Suche unsichtbar.
- Direct Load/Continue/Rejoin bleiben davon entkoppelt: `getFirebaseLeagueById` laedt die konkrete Liga ueber `leagues/{leagueId}/memberships/{uid}` und ignoriert Mirror-only Truth.
- Serverseitige Savegame-/Firestore-Reads wurden nachgezogen: `saveGameRepositoryFirestore.listByUser()` nutzt zusaetzlich eine Membership-`collectionGroup`, und `canReadFirestoreLeague()` entscheidet bei Online-Backbone-Ligen ueber die kanonische Online-Membership.
- Firestore Rules haben weiter zwei Modelle: Online-Unterkollektionen nutzen `isOnlineActiveMember()` gegen `leagues/{leagueId}/memberships/{uid}`, waehrend generische/legacy League-Dokumente fuer Nicht-Online-Ligen weiter `leagueMembers` nutzen.

## Inventory

| Datei | Funktion / Stelle | Nutzt Membership oder Mirror? | Kritisch fuer UI/Flow? | Bewertung |
|---|---|---|---|---|
| `src/lib/online/repositories/firebase-online-league-queries.ts` | `leagueMemberRef()` | Mirror-Doc-Referenz `leagueMembers/{leagueId}_{userId}` | Ja, Basis fuer Join/Rejoin/Discovery | Projektion; allein nicht fachlich entscheidend. |
| `src/lib/online/repositories/firebase-online-league-queries.ts` | `getFirebaseMemberScopedLeagueSnapshot()` | Laedt League + kanonische Membership + Mirror | Ja, Direct League Load/Continue/Route-State | Membership ist Wahrheit. Mirror wird nur fuer Konfliktdiagnose gegen Membership/Team genutzt. |
| `src/lib/online/repositories/firebase-online-league-queries.ts` | `mapFirebaseMemberScopedLeague()` | Membership plus Mirror-Konfliktcheck | Ja, Direct Route und Continue | Kein Mirror-Truth-Pfad; fehlende/inkonsistente Membership fuehrt zu `null` oder Hard-Fail. |
| `src/lib/online/repositories/firebase-online-league-queries.ts` | `getFirebaseJoinedLeagueIdsForUser()` | Startet mit `leagueMembers` Query, validiert danach via `resolveFirebaseActiveMembershipLeagueIds()` gegen `leagues/{leagueId}/memberships/{uid}` | Ja, Online-Hub Suche/Discovery | Mirror ist Discovery-Index. Nicht Wahrheit, aber fehlender Mirror macht die Liga fuer Client-Discovery unsichtbar. |
| `src/lib/online/repositories/firebase-online-league-queries.ts` | `resolveFirebaseActiveMembershipLeagueIds()` | Liest kanonische Membership pro Mirror-Kandidat | Ja, Schutzschicht fuer Discovery | Membership ist Wahrheit; stale Mirror wird herausgefiltert. |
| `src/lib/online/repositories/firebase-online-league-queries.ts` | `mapFirebaseSearchLeagues()` | Nimmt validierte League-IDs entgegen; mapped Lobby und joined Ligen | Ja, Online-Hub Suchliste | Keine eigene Wahrheit; verlaesst sich auf vorgelagerte Membership-Validierung. |
| `src/lib/online/repositories/firebase-online-league-queries.ts` | `getFirebaseAvailableLeagues()` | Lobby Query + `getFirebaseJoinedLeagueIdsForUser()` | Ja, Online-Hub Suche | Aktive bereits beigetretene Ligen kommen im Client nur ueber Mirror-Kandidaten in die Liste. |
| `src/lib/online/repositories/firebase-online-league-subscriptions.ts` | `subscribeToFirebaseAvailableLeagues()` | Subscribed `leagueMembers` nach `userId/status`, validiert jede Mirror-Liga via `resolveFirebaseActiveMembershipLeagueIds()` | Ja, Live-Suche/Resume-Liste | Mirror als Live-Index, Membership als Wahrheit. Fehlender Mirror bedeutet keine Live-Discovery. |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | `joinLeague()` bei bestehender Membership | Liest Membership + Mirror + Teams; repariert Mirror, wenn Membership korrekt ist | Ja, Rejoin | Membership ist Wahrheit; Mirror-Konflikte werden nur bei Mirror-Problemen repariert, Team-Projektionsprobleme hard-failen. |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | `joinLeague()` bei neuer Membership | Schreibt Team, kanonische Membership und Mirror atomar | Ja, Join | Mirror wird als Projektion aus Membership geschrieben. |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | `getLastLeagueId()` / `setLastLeagueId()` / `clearLastLeagueId()` | LocalStorage `afbm.online.lastLeagueId`, keine Membership/Mirror | Ja, Continue/Resume | Lokaler Pointer, keine Wahrheit. Gueltigkeit wird beim Load gegen Repository/Membership geprueft. |
| `src/components/online/online-continue-button.tsx` | `handleContinue()` | Liest `lastLeagueId`, ruft `repository.getLeagueById()` | Ja, Online-Hub Weiterspielen | Continue ignoriert Mirror direkt. Wahrheit kommt aus `getLeagueById()` und damit aus kanonischer Membership. |
| `src/components/online/online-continue-model.ts` | `buildOnlineContinueState()` | Nur `lastLeagueId` + geladenes League-Objekt | Ja, Continue-Feedback | Keine Membership/Mirror-Entscheidung; validiert nur Existenz/ID. |
| `src/components/online/online-league-search.tsx` | Suche und Subscription | Nutzt `repository.getAvailableLeagues()` und `subscribeToAvailableLeagues()` | Ja, Online-Hub Suche/Join | Erbt Mirror-Index-Risiko aus Repository. |
| `src/components/online/online-league-search-model.ts` | `toLeagueSearchCard()` / `suggestTeamIdentityForLeagues()` | Nutzt gemappte `league.users` aus kanonischen Memberships | Mittel, Anzeige/Teamvorschlag | Keine Mirror-Nutzung; vertraut dem Repository-Read-Model. |
| `src/components/online/online-league-route-state.tsx` | `useOnlineLeagueRouteStateValue()` | Direct Load via `repository.getLeagueById()` + `subscribeToLeague()` | Ja, gesamte Online-Liga-Route | Membership-kanonisch fuer initialen Load; Subscription `mapLeague()` liest komplette League ohne user-scoped Mirror, Route-State validiert danach Current User in `league.users`. |
| `src/components/online/online-league-route-state-model.ts` | `validateOnlineLeagueRouteState()` | Nutzt gemappte `league.users` und Team-Projektion | Ja, Route-Gate | Membership ist indirekt Wahrheit, Team-Projektion wird als Konfliktcheck genutzt. Kein Mirror. |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` | `getMembershipProjectionProblem()` | Vergleicht Membership, Team-Projektion und optional Mirror | Ja, Guard-/Repair-Entscheidungen | Membership ist Basis; Mirror erzeugt nur Konfliktcode. |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` | `createLeagueMemberMirrorFromMembership()` | Erzeugt Mirror aus Membership | Ja, Join/Rejoin/Repair | Projektion, kein eigener Wahrheitswert. |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` | `isLeagueMemberMirrorAligned()` | Vergleicht Mirror gegen Membership | Ja, Rejoin-Repair | Membership ist Wahrheit; Mirror-Abweichung wird erkannt. |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` | `resolveFirestoreMembershipForUser()` | Ignoriert Mirror bewusst, akzeptiert nur aktive Membership | Ja, Direct Load/Rejoin | Explizit membership-kanonisch. |
| `src/lib/online/types.ts` | `mapFirestoreSnapshotToOnlineLeague()` | Baut `league.users` aus Subcollection-Memberships, nicht aus Mirror | Ja, alle Online-Read-Models | Membership ist Wahrheit; Teamfelder bleiben Projektion fuer Anzeige/Status. |
| `firestore.rules` | `isActiveLeagueMember()` / `canReadLeague()` | Nutzt globales `leagueMembers` | Ja, generische/legacy League-Dokumente | **Mirror als Zugriffswahrheit.** Ignoriert Online-Subcollection-Membership. |
| `firestore.rules` | `isOnlineActiveMember()` / `isOnlineAdmin()` | Nutzt `leagues/{leagueId}/memberships/{uid}` | Ja, Online-Unterkollektionen und Online-Actions | Membership-kanonisch; kein Mirror-Truth-Pfad. |
| `firestore.rules` | `match /leagueMembers/{leagueMemberId}` | Regeln fuer Mirror-Read/List/Create | Ja, Discovery-Query und Join-Create | Mirror ist erlaubter Index. List ist nur eigener `userId/status=ACTIVE`; Create muss atomaren Online-Join begleiten. |
| `src/lib/firebase/firestore.rules.test.ts` | `allows only atomic self-join writes...` | Testet Mirror-Query vor/nach Join | Ja, Rules-Parity | Belegt Mirror als Discovery-Index, nicht als alleinige Online-Wahrheit. |
| `src/lib/firebase/firestore.rules.test.ts` | `allows a newly joined user to read only their valid league member mirror` | Testet eigenen Mirror-Read und Outsider-Block | Ja, Rules-Parity | Belegt Mirror-Lesbarkeit fuer Discovery. |
| `src/server/repositories/firestoreAccess.ts` | `canReadFirestoreLeague()` | Liest League, legacy Mirror und Online-Membership | Ja, klassische Firestore Savegame/API-Zugriffe | Online-Backbone-Ligen nutzen kanonische Online-Membership; legacy Nicht-Online-Ligen nutzen weiter Mirror. |
| `src/server/repositories/teamRepository.firestore.ts` | `canReadFirestoreLeague()` | Shared Access Helper | Ja, Team-Detail aus Firestore | Online-Backbone-Ligen membership-kanonisch. |
| `src/server/repositories/playerRepository.firestore.ts` | `canReadFirestoreLeague()` | Shared Access Helper | Ja, Player-Detail aus Firestore | Online-Backbone-Ligen membership-kanonisch. |
| `src/server/repositories/saveGameRepository.firestore.ts` | `listByUser()` | Query ueber `leagueMembers` plus `collectionGroup("memberships")` | Ja, Savegame-/Resume-Liste | Mirror ist legacy Index; Online-Memberships werden zusaetzlich als kanonische Kandidaten gelesen und ueber `canReadFirestoreLeague()` validiert. |
| `src/server/repositories/saveGameRepository.firestore.ts` | `findByIdForUser()` | Nutzt `canReadFirestoreLeague()` | Ja, Savegame Direct Load | Online-Backbone-Ligen membership-kanonisch. |
| `scripts/seeds/firestore-seed.ts` | `buildFirestoreSeedDocuments()` | Seedet `leagueMembers` | Niedrig, Emulator/Seed | Mirror-Testdaten fuer legacy Firestore-Flow. |
| `scripts/seeds/multiplayer-repair-memberships-staging.ts` | Membership repair planner | Liest Memberships, Teams und Mirror; schreibt fehlende/stale Mirror | Hoch, Staging Repair | Membership ist Quelle; Mirror wird repariert. Kein Truth-Problem, aber operativ kritisch. |
| `scripts/seeds/multiplayer-finalize-existing-league-staging.ts` | Membership/Mirror planning | Nutzt Memberships/Teams/Mirrors fuer Plan/Repair | Hoch, Staging Finalize | Membership sollte Quelle sein; Mirror ist Repair-Ziel/Diagnose. |
| `scripts/seeds/multiplayer-e2e-firestore-seed.ts` | E2E Fixture Seeder | Schreibt kanonische Memberships und Mirror | Mittel, Teststabilitaet | Mirror wird als Fixture-Projektion geschrieben, damit Discovery funktioniert. |

## Stellen, an denen Mirror als Wahrheit genutzt wird

| Stelle | Warum kritisch |
|---|---|
| `firestore.rules` `isActiveLeagueMember()` fuer Nicht-Online-Ligen | Legacy Rules verwenden globalen Mirror weiterhin fuer klassische Firestore-Ligen. Online-spezifische Rules nutzen `isOnlineActiveMember()`. |
| Client-Discovery `getFirebaseJoinedLeagueIdsForUser()` / `subscribeToFirebaseAvailableLeagues()` | Mirror ist Suchindex fuer bereits beigetretene Ligen. Stale Mirror wird validiert und entfernt, fehlender Mirror kann die Liga aber aus der Suchliste entfernen. |

## Stellen, an denen Membership ignoriert wird

| Stelle | Ignorierte Membership | Auswirkung |
|---|---|---|
| `firestore.rules` legacy `isActiveLeagueMember()` | `leagues/{leagueId}/memberships/{uid}` fuer Nicht-Online-Ligen | Absichtlich legacy; Online-Ligen werden durch `isOnlineActiveMember()` abgedeckt. |
| Discovery-Start in `getJoinedLeagueIdsForUser()` / `subscribeToAvailableLeagues()` | Vollstaendige Membership-Suche ueber alle Ligen ist nicht moeglich; daher startet der Pfad beim Mirror | Kein stale-Mirror-Truth-Bug, weil Membership validiert wird. Aber fehlende Mirror bedeuten Discovery-Luecke. |

## Empfohlene Reihenfolge fuer Fixes

1. **Client-Discovery-Luecke dokumentiert halten:** `getFirebaseJoinedLeagueIdsForUser()` und `subscribeToFirebaseAvailableLeagues()` koennen im Web-Client nicht verlaesslich alle Membership-Subcollections quer durchsuchen. Deshalb bleibt Mirror ein erforderlicher Suchindex, Direct Load/Rejoin prueft aber Membership.
2. **Repair-/Monitoring-Gate:** Einen kleinen Admin-/Script-Check etablieren, der aktive Memberships ohne Mirror und aktive Mirrors ohne Membership meldet, ohne automatisch fachlich umzudeuten.
3. **Rules-Begriffe trennen:** In `firestore.rules` die legacy Funktionen `isActiveLeagueMember()`/`canReadLeague()` deutlicher als Nicht-Online-/Mirror-basiert benennen, damit neue Rules nicht versehentlich das falsche Modell verwenden.
