# User-Team Source-of-Truth Inventory

Datum: 2026-05-02

## Ergebnis

Kanonische Zielregel fuer B1: `leagues/{leagueId}/memberships/{uid}` ist die
fachliche Quelle fuer User-Team-Zuordnung. `leagueMembers/{leagueId_uid}` und
`teams/{teamId}.assignedUserId` sind Projektionen und duerfen nur validieren,
anzeigen, absichern oder repariert werden.

Der aktuelle Code ist besser als der alte Stand, aber noch nicht voll kanonisch:
mehrere zentrale Read-/Guard-Pfade entscheiden weiterhin ueber `team.assignedUserId`
oder den globalen `leagueMembers` Mirror. Besonders riskant sind Mapper, Route-State,
Firestore Rules, Depth-Chart-Guards und globale Savegame-/Read-Guards.

## Suchumfang

Gesucht wurde nach:

- `assignedUserId`
- `leagueMembers`
- `memberships`
- `membership.teamId`
- `mirror`
- `assertTeamControl`

Exakter Treffer fuer `assertTeamControl`: keiner. Naechster fachlich relevanter
Guard ist `assertTeamOwner` in `src/lib/online/security/roles.ts`.

False positives: einzelne Treffer fuer `mirror` in Gameplay-/Schedule-/Reference-
Texten sind keine User-Team-Zuordnung und wurden nicht als Risiko gewertet.

## Inventar

| Datei / Funktion | Bereich | Liest nur Projektion? | Fachliche Entscheidung? | Sollte Membership-kanonisch sein? | Risiko |
|---|---|---:|---:|---:|---|
| `firestore.rules` `isOnlineSelfJoinedAfter` | Rules / Join | Nein, Membership | Ja, Join-Precondition | Ja | Mittel |
| `firestore.rules` `isOnlineSelfJoinedTeamAssignedAfter` | Rules / Join | Nein, Membership + Team | Ja, Join/Mirror/Counter erlaubt nur wenn Team danach `assignedUserId == uid` hat | Ja, Team nur als Projection-Check | Hoch |
| `firestore.rules` `isOnlineMembershipCreate` | Rules / Write | Nein, Membership + Team | Ja, Membership-Create wird an Team-Projektion gekoppelt | Ja, Team nur atomare Gegenpruefung | Hoch |
| `firestore.rules` `isOnlineLeagueMemberMirrorCreate` | Rules / Mirror Write | Nein, Mirror + Membership + Team | Ja, globaler Mirror darf erstellt werden | Ja, Mirror nur Projektion | Hoch |
| `firestore.rules` `isOnlineMembershipTeamClaimUpdate` | Rules / Write | Nein, Membership + Team | Ja, Team-Claim der Membership | Ja | Hoch |
| `firestore.rules` `isOnlineJoinCounterUpdate` | Rules / Write | Nein, Membership + Team | Ja, League memberCount darf steigen | Ja | Hoch |
| `firestore.rules` `isOnlineTeamClaimUpdate` | Rules / Write | Nein, Team + Membership | Ja, Team wird dem User zugewiesen | Ja | Hoch |
| `firestore.rules` `isOnlineOwnDepthChartUpdate` | Rules / Guard | Nein, Membership + Team | Ja, Depth-Chart Write erlaubt nur bei `team.assignedUserId == uid` | Ja, Team nur Konfliktcheck | Hoch |
| `firestore.rules` `leagueMembers/{leagueMemberId}` | Rules / Mirror Read | Mirror | Ja, globaler Mirror steuert Rejoin/List/Read | Ja, Mirror nur Index/Projection | Hoch |
| `src/lib/online/types.ts` `isCanonicalMembershipProjection` | Mapper / Route-State | Nein, Membership + Team | Ja, filtert Memberships aus `league.users` | Ja | Hoch |
| `src/lib/online/types.ts` `mapFirestoreSnapshotToOnlineLeague` | Mapper / Route-State | Nein, Membership + Team | Ja, nur kanonisch wirkende Memberships werden User | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` `getMembershipProjectionProblem` | Repository Mapper | Nein, Membership + Team + Mirror | Ja, Loadbarkeit/Conflict Codes | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` `resolveFirestoreMembershipForUser` | Repository Mapper | Nein, Membership + Team + Mirror | Ja, User bekommt League nur bei Projektion-Gleichlauf | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` `canLoadOnlineLeagueFromMembership` | Repository Mapper | Nein, Membership + Team + Mirror | Ja, Load-Gate | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` `createLeagueMemberMirrorFromMembership` | Projection Builder | Nein, aus Membership | Nein, schreibt erwartete Projektion | Ja | Niedrig |
| `src/lib/online/repositories/firebase-online-league-mappers.ts` `isLeagueMemberMirrorAligned` | Projection Check | Mirror | Ja, Repair-Entscheidung | Ja | Mittel |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `getSnapshot` | Repository Read | Nein, liest Collections | Nein, sammelt Rohdaten | Ja | Niedrig |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `getMemberScopedSnapshot` | Repository Read / Route-State | Nein, Membership + Mirror + Team | Ja, blockiert Load bei Konflikt | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `mapPublicLobbyLeague` | Public Lobby Read | Team-Projektion | Ja, synthetisiert belegte Plaetze aus `assignedUserId` | Nein fuer Anzeige, ja fuer echte User-Zuordnung | Mittel |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `getJoinedLeagueIdsForUser` | Route-State / Rejoin | Mirror | Ja, aktive Ligen des Users kommen aus globalem Mirror | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `subscribeToAvailableLeagues` | Route-State / Rejoin | Mirror | Ja, joinedLeagueIds werden aus Mirror-Query abgeleitet | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `joinLeague` existing member branch | Join / Repair | Nein, Membership + Mirror + Team | Ja, already-member und Mirror-Repair | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `joinLeague` new join branch | Join / Write | Nein, schreibt Team + Membership + Mirror | Ja, erstellt kanonische Verbindung | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `setUserReady` | Ready Guard / Write | Nein, Membership + Team via Mapper | Ja, Ready darf gesetzt werden | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `updateDepthChart` | Team Write Guard | Nein, Membership + Team | Ja, blockiert wenn `team.assignedUserId != uid` | Ja | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `makeFantasyDraftPick` | Draft Guard / Write | Membership | Ja, Pick nur wenn `membership.teamId == teamId` | Ja | Niedrig |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `subscribeToMemberships` | Subscription | Membership | Nein, Projektionsfrei | Ja | Niedrig |
| `src/lib/online/repositories/firebase-online-league-repository.ts` `subscribeToTeams` | Subscription | Team-Projektion | Nein, Anzeige/Debug | Nein | Niedrig |
| `src/lib/online/security/roles.ts` `assertActiveMembership` | Guard | Membership | Ja, aktives Mitglied | Ja | Niedrig |
| `src/lib/online/security/roles.ts` `assertLeagueAdmin` | Guard | Membership | Ja, Admin/Creator | Ja | Niedrig |
| `src/lib/online/security/roles.ts` `assertTeamOwner` | Guard | Team-Projektion | Ja, `assignedUserId` + Status entscheiden Teamkontrolle | Ja | Hoch |
| `src/lib/online/repositories/local-online-league-repository.ts` `toMemberships` | Local Adapter | Membership aus Local User | Nein, Adapter | Ja | Niedrig |
| `src/lib/online/repositories/local-online-league-repository.ts` `toTeams` | Local Adapter | Team-Projektion aus Local User | Nein, Adapter | Nein | Niedrig |
| `src/lib/online/online-league-service.ts` Join-Pfad | Local/Legacy Join | Nein, User + Team-Projektion | Ja, setzt `assignedUserId` in Local League | Ja, aber local only | Mittel |
| `src/lib/admin/online-admin-actions.ts` `mapFirestoreLeague` | Admin Read | Nein, Membership + Team via Mapper | Ja indirekt, Admin UI sieht gefilterte Users | Ja | Mittel |
| `src/lib/admin/online-admin-actions.ts` `resetLeague` | Admin Mutation | Membership + Team | Ja, loescht Memberships und setzt Teams frei | Ja | Hoch |
| `src/lib/admin/online-admin-actions.ts` `setAllReady` | Admin Mutation | Membership, aber Mapper ohne Teams | Ja, Ready-Entscheidung pro Membership | Ja | Hoch |
| `src/lib/admin/online-admin-actions.ts` `startLeague` draftOrder | Admin Mutation | Membership | Ja, Draft-Reihenfolge aus `membership.teamId` | Ja | Niedrig |
| `src/lib/admin/online-admin-actions.ts` `simulateWeek` | Admin Simulation | Nein, Membership + Team via Mapper | Ja, Simulationsteilnehmer | Ja | Hoch |
| `src/lib/admin/online-admin-actions.ts` `removePlayer` | Admin Mutation / Repair | Membership | Ja, Membership entfernt und Team-Projektion frei | Ja | Mittel |
| `src/lib/admin/online-admin-actions.ts` `markVacant` | Admin Mutation / Repair | Membership | Ja, Team wird aus Membership freigegeben | Ja | Mittel |
| `src/lib/admin/online-week-simulation.ts` `prepareOnlineLeagueWeekSimulation` | Simulation Guard | Nein, Membership + Team via Mapper | Ja, aktive Teilnehmer/Ready/Spielbarkeit | Ja | Hoch |
| `src/components/admin/admin-control-center.tsx` `buildAdminHubDebugState` | Admin Anzeige | Team-Projektion | Nein, Debug-Anzeige fuer Inkonsistenzen | Nein | Niedrig |
| `src/components/online/online-league-route-state-model.ts` `validateOnlineLeagueRouteState` | Route-State | Indirekt `league.users` | Ja, User darf Liga sehen/weiter | Ja | Hoch |
| `src/components/online/online-league-detail-model.ts` `toOnlineLeagueDetailState` | UI ViewModel | Indirekt `league.users` | Ja, Current User/Ready UI | Ja | Mittel |
| `src/lib/online/online-league-week-service.ts` Ready Helpers | Ready State | Indirekt `OnlineLeagueUser` | Ja, Ready erlaubt/blockiert | Ja | Mittel |
| `scripts/staging-admin-week-smoke.ts` user-team check | Staging Gate | Nein, Membership + Team | Ja, Smoke hard-failed bei Konflikt | Ja | Hoch, aber gewolltes Gate |
| `scripts/seeds/multiplayer-repair-memberships-staging.ts` repair plan | Repair Script | Nein, Membership + Team + Mirror | Ja, repariert Mirror/Team aus Membership, skippt Konflikte | Ja | Mittel |
| `scripts/seeds/multiplayer-finalize-existing-league-staging.ts` finalize plan | Repair Script | Nein, Membership + Team + Mirror | Ja, hard-fail/repair vor Finalize | Ja | Mittel |
| `scripts/seeds/multiplayer-auto-draft-staging.ts` `collectProtectedManagerAssignments` | Seed/Auto-Draft Guard | Team-Projektion zuerst | Ja, schuetzt Managerteams aus `assignedUserId` | Ja | Hoch |
| `scripts/seeds/multiplayer-auto-draft-staging.ts` `validateAutoDraft` | Seed/Auto-Draft Guard | Nein, preserved Team + Membership + Mirror | Ja, verhindert Assignment-Drift | Ja | Mittel |
| `scripts/seed-online-league.ts` `assertExistingLeagueIsSeedOwned` | Seed Safety | Team-Projektion | Ja, verhindert Ueberschreiben fremder Assignments | Nein fuer Seed-Safety | Niedrig |
| `src/server/repositories/firestoreAccess.ts` `canReadFirestoreLeague` | Server Read Guard | Mirror | Ja, Read erlaubt bei `leagueMembers.status == ACTIVE` | Ja | Hoch |
| `src/server/repositories/teamRepository.firestore.ts` `canReadLeague` | Server Read Guard | Mirror | Ja, Team-Reads erlaubt | Ja | Hoch |
| `src/server/repositories/playerRepository.firestore.ts` `canReadLeague` | Server Read Guard | Mirror | Ja, Player-Reads erlaubt | Ja | Hoch |
| `src/server/repositories/saveGameRepository.firestore.ts` `listByUser` | Server List / Route-State | Mirror | Ja, Savegames aus globalem Mirror | Ja | Hoch |

## Tests, Fixtures und reine Datenformer

Diese Dateien enthalten relevante Felder, treffen aber keine Produktentscheidung oder
sind absichtlich Test-/Seed-Daten:

- `src/lib/firebase/firestore.rules.test.ts`
- `src/lib/online/repositories/online-league-repository.test.ts`
- `src/lib/admin/online-week-simulation.test.ts`
- `src/lib/online/online-league-service.test.ts`
- `src/lib/online/online-league-week-service.test.ts`
- `src/lib/online/online-league-lifecycle.test.ts`
- `src/components/online/online-league-route-state-model.test.ts`
- `e2e/multiplayer-firebase.spec.ts`
- `e2e/multiplayer-firebase-fantasy-draft.spec.ts`
- `scripts/seeds/multiplayer-e2e-firestore-seed.ts`
- `scripts/seeds/multiplayer-test-league-firestore-seed.ts`
- `scripts/seeds/multiplayer-test-league-reset.ts`
- `scripts/seeds/firestore-seed.ts`
- `scripts/seeds/firestore-seed.test.ts`
- `scripts/firestore-backfill.ts`
- `scripts/seeds/parity-fixture.ts`

Diese sollten bei einem Fix mit aktualisiert werden, sind aber nicht selbst die
kanonische Runtime-Quelle.

## Riskante Entscheidungsstellen

### Guards

- `firestore.rules` koppelt Join, Mirror-Create, Team-Claim und Depth-Chart-Write
  an `team.assignedUserId`. Das ist fuer atomare Projection-Checks sinnvoll, aber
  darf nicht als zweite Wahrheit weiterwachsen.
- `src/lib/online/security/roles.ts` `assertTeamOwner` entscheidet rein aus Team-
  Projektion. Der exakte gesuchte Name `assertTeamControl` existiert nicht.
- `src/lib/online/repositories/firebase-online-league-repository.ts` `updateDepthChart`
  nutzt Membership und anschliessend `team.assignedUserId` als fachlichen Guard.
- Server-Repository-Guards (`firestoreAccess`, `teamRepository.firestore`,
  `playerRepository.firestore`) nutzen `leagueMembers` als Read-Wahrheit.

### Writes

- `joinLeague` schreibt Membership, Team-Projektion und Mirror zusammen.
- `resetLeague`, `removePlayer`, `markVacant` schreiben Team-Projektionen aus
  Membership-Entscheidungen.
- Rules erlauben mehrere Client-Writes nur, wenn Membership und Team-Projektion
  im selben After-State konsistent sind.

### Repairs

- `multiplayer-repair-memberships-staging.ts` ist membership-orientiert und repariert
  Mirror/Team, skippt aber bei fremdem `assignedUserId`.
- `multiplayer-finalize-existing-league-staging.ts` hard-failed bei
  `assignedUserId`-/`managerUserId`-Konflikten und repariert danach Projektionen.
- `multiplayer-auto-draft-staging.ts` startet die Schutzlogik bei Teams mit
  `assignedUserId`; fehlt diese Projektion, kann ein kanonisches Membership-Team
  ungeschuetzt bleiben.

### Route-State

- `getJoinedLeagueIdsForUser` und `subscribeToAvailableLeagues` haengen an
  `leagueMembers`. Stale oder fehlende Mirrors koennen Rejoin/Continue beeinflussen.
- `mapFirestoreSnapshotToOnlineLeague` filtert Users anhand von Team-Projektionen.
  Dadurch kann eine gueltige Membership aus dem UI verschwinden, statt als harter
  Konflikt sichtbar zu werden.
- `validateOnlineLeagueRouteState` entscheidet auf dem bereits gefilterten
  `league.users` Modell.

### Admin-Anzeigen

- `AdminControlCenter` zeigt `assignedUserId ohne Membership` und unassigned Teams.
  Das ist nur Debug-Projektion, keine fachliche Wahrheit.
- `mapFirestoreLeague` in Admin Actions nutzt denselben Mapper wie Client und kann
  Admin-Anzeigen durch Projection-Filter beeinflussen.

## Empfohlene Fix-Reihenfolge

1. **Mapper zentralisieren und hart machen**
   - `mapFirestoreSnapshotToOnlineLeague` darf Memberships nicht still herausfiltern.
   - Stattdessen: aktive Memberships als kanonisch laden und Projection-Konflikte
     explizit reporten oder hard-failen.
   - `getMembershipProjectionProblem` als einzige Conflict-Funktion behalten, aber
     nicht als stiller User-Filter verwenden.

2. **Read-/Route-State von Mirror entkoppeln**
   - `getJoinedLeagueIdsForUser`, `subscribeToAvailableLeagues` und serverseitige
     `canReadLeague`-Guards duerfen `leagueMembers` nur als Index/Projection lesen.
   - Nach Mirror-Fund muss die echte `leagues/{leagueId}/memberships/{uid}` validiert
     werden; fehlende Membership = kein Zugriff oder expliziter Repair-Flow.

3. **Team-Control-Guards membership-kanonisch machen**
   - `assertTeamOwner` und `updateDepthChart` sollten erst Membership pruefen und
     Team nur als Konfliktcheck verwenden.
   - Konfliktverhalten definieren: Hard-Fail mit eindeutigem Code statt generischer
     "nicht eigenes Team"-Meldung.

4. **Admin-Actions und Simulation vereinheitlichen**
   - `setAllReady` sollte mit Teams mappen oder direkt ueber eine membership-
     kanonische Ready-Funktion gehen; aktuell ist die Mapper-Nutzung mit `teams: []`
     riskant.
   - `prepareOnlineLeagueWeekSimulation` sollte Konflikte vor der Simulation klar
     melden und nicht nur implizit ueber gefilterte Users arbeiten.

5. **Rules als Projection-Consistency-Gate dokumentieren**
   - Rules duerfen `assignedUserId` weiter pruefen, aber nur als atomare
     After-State-Konsistenz, nicht als kanonische Quelle.
   - Tests sollten den Satz abdecken: Membership ohne passende Team-Projektion
     blockiert als Konflikt; Team-Projektion ohne Membership erzeugt keinen Zugriff.

6. **Repair-/Seed-Scripts absichern**
   - `multiplayer-auto-draft-staging.ts` sollte protected manager assignments aus
     aktiven Memberships ableiten und Team/Mirror nur validieren.
   - Repair-Scripts duerfen weiterhin Projection-Felder schreiben, muessen aber
     Konflikte immer reporten.

## Status

Inventar erstellt. Keine Codeaenderungen ausser diesem Report.
