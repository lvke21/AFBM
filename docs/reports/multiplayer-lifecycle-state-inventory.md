# Multiplayer Lifecycle State Inventory

Stand: 2026-05-03

Scope: N088 und N089. Grundlage ist der aktuelle Codezustand in `src/lib/online`, `src/lib/admin`, `src/components/online`, `src/components/admin` und `firestore.rules`. Dieser Report ist bewusst ein Inventar; es wurden keine Refactors oder Feature-Aenderungen vorgenommen.

## Kurzfazit

Der Multiplayer-Lifecycle hat bereits mehrere harte Teilregeln:

- User-Team-Zuordnung wird im Read-Model meistens aus aktiver Membership abgeleitet.
- Week Completion nutzt `completedWeeks` als kanonisches Ledger und erkennt Konflikte gegen alte Signale.
- Draft Picks und Available Players werden aus Subcollection-Docs gelesen; der Legacy Draft Blob ist nur noch ein expliziter Kompatibilitaetspfad.
- Die UI nutzt fuer den Hauptfluss zunehmend `normalizeOnlineLeagueLifecycle`, `getOnlineLeagueWeekReadyState` und `getOnlineLeagueWeekProgressState`.

Trotzdem fehlt weiterhin eine zentrale, persistierte oder formal definierte Online State Machine. Aktuell entstehen Lifecycle-Entscheidungen aus mehreren parallel gespeicherten Feldern: `league.status`, `weekStatus`, `completedWeeks`, `draft/main.status`, `membership.ready`, `adminActionLocks/*`, Team-Projektionen, Results und Standings.

## Kanonische Regeln

| Bereich | Kanonische Quelle | Projektionen / abgeleitete Quellen |
| --- | --- | --- |
| Liga-Hauptphase | `FirestoreOnlineLeagueDoc.status` fuer `lobby`, `active`, `completed`, `archived` | `OnlineLeague.status` (`waiting`/`active`) als lokales UI-Modell |
| User-Team-Zuordnung | `leagues/{leagueId}/memberships/{uid}.teamId` bei `status=active` | `teams/{teamId}.assignedUserId`, `teams/{teamId}.status`, `leagueMembers/*` Mirror |
| Team-Simulationsdaten | `teams/{teamId}.contractRoster` und `teams/{teamId}.depthChart` | `OnlineLeagueUser.contractRoster`, `OnlineLeagueUser.depthChart` im Read-Model |
| Draft-Metadaten | `leagues/{leagueId}/draft/main` | `OnlineFantasyDraftState` als Read-Model |
| Draft Picks | `draft/main/picks/*` | `OnlineFantasyDraftState.picks` |
| Draft-Verfuegbarkeit | `draft/main/availablePlayers/*` | `OnlineFantasyDraftState.availablePlayerIds`, `fantasyDraftPlayerPool` |
| Ready-Intent | `memberships/{uid}.ready` | `OnlineLeagueUser.readyForWeek`, Ready-UI-Labels |
| Simulation-Readiness | `getOnlineLeagueWeekReadyState` + `normalizeOnlineLeagueWeekSimulationState` | rohe `ready`-Flags alleine sind nicht ausreichend |
| Week Completion | `league.completedWeeks[]` | `weekStatus=completed`, `lastSimulatedWeekKey`, `matchResults`, `weeks/*` nur Konflikt-/Legacy-Signale |
| Simulation Lock | `adminActionLocks/{lockId}.status` serverseitig | `league.weekStatus === "simulating"` als zusaetzliche Projektion/Guard |
| Results | `league.matchResults[]` als Ergebnisdaten | Week-Abschluss wird nicht daraus abgeleitet |
| Standings | aus `matchResults` berechenbar; gespeicherte `standings[]` ist Cache/Read-Model | UI darf anzeigen, aber keine Transition daraus ableiten |

## Statusfeld-Inventar

| Feld | Datei | Bedeutung | Kanonisch oder Projektion | Darf UI direkt lesen? |
| --- | --- | --- | --- | --- |
| `FirestoreOnlineLeagueDoc.status` | `src/lib/online/types.ts` | Persistierte League-Phase: `lobby`, `active`, `completed`, `archived`. | Kanonisch fuer League-Hauptphase. | Ja fuer Labels/Admin; fuer Flow besser ueber Lifecycle-Read-Model. |
| `OnlineLeague.status` | `src/lib/online/online-league-types.ts`, `src/lib/online/types.ts` | Lokale Reduktion auf `waiting` oder `active`. | Projektion von Firestore-Status bzw. Local-Repo. | Ja fuer Anzeige/Suche; nicht fuer feine Lifecycle-Entscheidungen. |
| `memberCount` | `src/lib/online/types.ts`, `firestore.rules` | Join-Zaehler in League Doc. | Projektion/Counter; Membership-Docs bleiben Wahrheit. | Nur Anzeige. |
| `version` | `src/lib/online/types.ts`, `firestore.rules` | Optimistic/transactional Touch-Feld. | Technischer Guard, kein Lifecycle-Zustand. | Nein. |
| `currentSeason` | `src/lib/online/types.ts`, `src/lib/online/online-league-types.ts` | Aktueller Saison-Cursor. | Kanonischer Cursor nach Simulation. | Ja fuer Labels; Transitionen ueber Simulation/Week-Services. |
| `currentWeek` | `src/lib/online/types.ts`, `src/lib/online/online-league-types.ts` | Aktueller Wochen-Cursor. | Kanonischer Cursor nach Simulation. | Ja fuer Labels; Transitionen ueber Simulation/Week-Services. |
| `weekStatus` | `src/lib/online/types.ts`, `src/lib/online/online-league-types.ts`, `src/lib/online/online-league-week-simulation.ts` | `pre_week`, `ready`, `simulating`, `completed`; lokal auch `post_game`. | Projektion/Guard. `completedWeeks` ist Completion-Wahrheit. | Nur ueber `weekProgress` oder Admin-Debug direkt. |
| `settings.onlineBackbone` | `firestore.rules` | Markiert neue Online-League-Struktur. | Technischer Modus-Guard. | Nein. |
| `FirestoreOnlineMembershipDoc.status` | `src/lib/online/types.ts`, `firestore.rules` | Membership-Teilnahme: `active`, `inactive`, `removed`. | Kanonisch fuer aktive Teilnahme. | Nur ueber Read-Model/Lifecycle. |
| `FirestoreOnlineMembershipDoc.role` | `src/lib/online/types.ts`, `firestore.rules` | League-Rolle: `admin` oder `gm`. | Kanonisch fuer League-spezifische Rolle. | UI darf anzeigen; Admin-Rechte muessen Guard/Rules folgen. |
| `FirestoreOnlineMembershipDoc.teamId` | `src/lib/online/types.ts`, `src/lib/online/repositories/firebase-online-league-mappers.ts` | User-Team-Zuordnung. | Kanonisch fuer User-Team-Wahrheit. | Ja ueber `OnlineLeagueUser`; keine Entscheidung aus Team-Projektion dagegen. |
| `FirestoreOnlineMembershipDoc.ready` | `src/lib/online/types.ts`, `src/lib/online/online-league-week-service.ts` | Persistierter Ready-Intent des Managers. | Kanonisch fuer Intent, nicht fuer Simulation-Readiness. | Nur ueber `readyState`/Lifecycle. |
| `FirestoreOnlineMembershipDoc.lastSeenAt` | `src/lib/online/types.ts` | Aktivitaets-/Audit-Zeitpunkt. | Projektion/Audit. | Ja fuer Admin/Debug, nicht Lifecycle. |
| `FirestoreLeagueMemberMirrorDoc.status` | `src/lib/online/types.ts`, `src/lib/online/repositories/firebase-online-league-mappers.ts`, `firestore.rules` | Globaler Membership-Mirror: `ACTIVE`, `INACTIVE`, `REMOVED`. | Projektion aus Membership. | Nein, ausser Admin/Repair-Diagnose. |
| `FirestoreLeagueMemberMirrorDoc.role` | `src/lib/online/types.ts`, `src/lib/online/repositories/firebase-online-league-mappers.ts` | Globaler Mirror-Rollenwert: `GM`, `ADMIN`, `OWNER`. | Projektion. | Nein, ausser Admin/Debug. |
| `FirestoreLeagueMemberMirrorDoc.teamId` | `src/lib/online/types.ts`, `src/lib/online/repositories/firebase-online-league-mappers.ts` | Globaler Mirror der Team-Zuordnung. | Projektion aus Membership. | Nein, ausser Konfliktanzeige/Repair. |
| `FirestoreOnlineTeamDoc.status` | `src/lib/online/types.ts`, `firestore.rules` | Team-Belegungsprojektion: `available`, `assigned`, `vacant`, `ai`. | Projektion fuer Assignment; Team-Doc ist aber kanonisch fuer Roster/Depth. | Anzeige ok; fachliche User-Team-Entscheidung nur mit Membership-Abgleich. |
| `FirestoreOnlineTeamDoc.assignedUserId` | `src/lib/online/types.ts`, `src/lib/online/security/roles.ts`, `firestore.rules` | Team-Zuordnungsprojektion. | Projektion; Konflikt-Guard gegen Membership. | Nicht als alleinige Wahrheit; Admin-Inventory/Debug ok. |
| `OnlineLeagueTeam.assignmentStatus` | `src/lib/online/online-league-types.ts`, `src/lib/online/types.ts` | UI-Projektion von Team-Assignment. | Projektion. | Nur Anzeige/Route-Konfliktmeldung. |
| `OnlineLeagueTeam.assignedUserId` | `src/lib/online/online-league-types.ts`, `src/components/online/online-league-route-state-model.ts` | UI-Projektion der Team-Zuordnung. | Projektion. | Nur mit Membership-Abgleich; kein direkter fachlicher Owner-Entscheid. |
| `OnlineLeagueUser.teamStatus` | `src/lib/online/online-league-types.ts`, `src/lib/online/types.ts` | Aus Team-Doc abgeleiteter Status `occupied`/`vacant`. | Projektion. | Ja fuer Anzeige/Blocker; harte User-Team-Wahrheit bleibt Membership. |
| `contractRoster[].status` | `src/lib/online/online-league-types.ts`, `src/lib/online/online-league-week-service.ts` | Spielerstatus: `active`, `released`, `free_agent`; Ready/Simulation brauchen aktive spielbare Spieler. | Kanonisch innerhalb Team-Roster. | UI darf anzeigen; Readiness ueber Helper. |
| `depthChart[]` | `src/lib/online/types.ts`, `src/lib/online/online-league-week-service.ts` | Starter/Backup-Struktur je Position. | Kanonisch fuer Team-Aufstellung. | UI darf bearbeiten/anzeigen; Ready-Blocker ueber Helper. |
| `FirestoreOnlineDraftStateDoc.status` | `src/lib/online/types.ts`, `firestore.rules` | Draft-Metaphase: `not_started`, `active`, `completed`. | Kanonisch fuer Draft-Meta. | Ja ueber Draft-/Lifecycle-Read-Model. |
| `FirestoreOnlineDraftStateDoc.round` | `src/lib/online/types.ts`, `firestore.rules` | Aktuelle Draft-Runde. | Kanonischer Draft-Cursor. | Ja im Draft-UI; nicht ohne Pick-Docs validieren. |
| `FirestoreOnlineDraftStateDoc.pickNumber` | `src/lib/online/types.ts`, `firestore.rules` | Aktueller Overall Pick. | Kanonischer Draft-Cursor, gegen Pick-Docs zu pruefen. | Ja im Draft-UI; nicht allein als Pick-Wahrheit. |
| `FirestoreOnlineDraftStateDoc.currentTeamId` | `src/lib/online/types.ts`, `firestore.rules` | Team am Zug. | Kanonischer Draft-Cursor. | Ja im Draft-UI; Team-Ownership per Membership pruefen. |
| `FirestoreOnlineDraftStateDoc.draftOrder` | `src/lib/online/types.ts`, `src/lib/online/multiplayer-draft-logic.ts` | Team-Reihenfolge des Snake Drafts. | Kanonisch fuer Draft-Reihenfolge. | Ja im Draft-UI. |
| `FirestoreOnlineDraftStateDoc.startedAt` | `src/lib/online/types.ts` | Draft-Startzeit. | Kanonisches Audit-Metadatum. | Anzeige ok. |
| `FirestoreOnlineDraftStateDoc.completedAt` | `src/lib/online/types.ts`, `firestore.rules` | Draft-Abschlusszeit. | Kanonisches Audit-Metadatum; Abschlussphase kommt aus Draft-Status. | Anzeige ok. |
| `FirestoreOnlineDraftStateDoc.draftRunId` | `src/lib/online/types.ts`, `src/lib/online/multiplayer-draft-logic.ts` | Identitaet eines Draft-Laufs; filtert Picks/Availability. | Kanonischer Run-Guard. | Nein, ausser Debug/Admin. |
| `FirestoreOnlineDraftPickDoc.pickNumber` | `src/lib/online/types.ts`, `firestore.rules` | Pick-Dokument-ID/-Nummer. | Kanonisch fuer Picks. | Ja via Draft-Read-Model. |
| `FirestoreOnlineDraftPickDoc.round` | `src/lib/online/types.ts`, `firestore.rules` | Runde des Picks. | Kanonisch fuer Picks, gegen Draft-Cursor validiert. | Ja via Draft-Read-Model. |
| `FirestoreOnlineDraftPickDoc.teamId` | `src/lib/online/types.ts`, `firestore.rules` | Team, das den Pick gemacht hat. | Kanonisch fuer Pick. | Ja via Draft-Read-Model. |
| `FirestoreOnlineDraftPickDoc.playerId` | `src/lib/online/types.ts`, `firestore.rules` | Gepickter Spieler. | Kanonisch fuer Pick. | Ja via Draft-Read-Model. |
| `FirestoreOnlineDraftPickDoc.pickedByUserId` | `src/lib/online/types.ts`, `firestore.rules` | User, der den Pick geschrieben hat. | Kanonisches Audit-Feld. | Anzeige/Admin ok. |
| `FirestoreOnlineDraftAvailablePlayerDoc` existence | `src/lib/online/types.ts`, `firestore.rules` | Existenz bedeutet Spieler ist verfuegbar. | Kanonisch fuer Verfuegbarkeit. | Ja via Draft-Read-Model. |
| `OnlineFantasyDraftState.status` | `src/lib/online/online-league-types.ts`, `src/lib/online/types.ts` | UI-/Service-Read-Model fuer Draft-Status. | Projektion aus Draft Doc plus Subcollections. | Ja, bevorzugt ueber Lifecycle fuer Gesamtfluss. |
| `OnlineFantasyDraftState.picks` | `src/lib/online/online-league-types.ts`, `src/lib/online/types.ts` | Read-Model der Pick Docs. | Projektion aus kanonischen Pick Docs. | Ja fuer Anzeige, nicht persistierte Wahrheit. |
| `OnlineFantasyDraftState.availablePlayerIds` | `src/lib/online/online-league-types.ts`, `src/lib/online/types.ts` | Read-Model der Available-Player-Docs. | Projektion. | Ja fuer Anzeige. |
| `settings.fantasyDraft` | `src/lib/online/types.ts`, `src/lib/online/repositories/firebase-online-league-mappers.ts` | Legacy Draft Blob. | Legacy-Kompatibilitaet, nicht kanonisch. | Nein, ausser Migration/Admin-Warnung. |
| `settings.fantasyDraftPlayerPool` | `src/lib/online/types.ts`, `src/lib/online/repositories/firebase-online-league-mappers.ts` | Legacy Draft Player Pool. | Legacy-Kompatibilitaet, nicht kanonisch. | Nein, ausser Migration/Admin-Warnung. |
| `Prospect.status` | `src/lib/online/online-league-types.ts` | Legacy/Scouting-Draft Status `available`/`drafted`. | Nicht Teil des Fantasy-Draft-Lifecycle. | Nur Feature-spezifisch, nicht Multiplayer-Lifecycle. |
| `DraftOrderPick.status` | `src/lib/online/online-league-types.ts` | Legacy Draft-Order Pick: `available`/`made`. | Nicht kanonisch fuer Fantasy Draft. | Nein fuer Multiplayer-Draft. |
| `OnlineLeagueWeekReadyState.allReady` | `src/lib/online/online-league-week-service.ts` | Alle aktiven Teilnehmer sind bereit und spielbar. | Abgeleitetes kanonisches Readiness-Read-Model. | Ja, bevorzugt statt roher Ready-Felder. |
| `OnlineLeagueWeekReadyState.canSimulate` | `src/lib/online/online-league-week-service.ts` | Local/UI Simulation moeglich: League aktiv, Draft completed, alle ready, nicht simulating. | Abgeleitetes Read-Model; serverseitig nochmal validieren. | Ja fuer UI-Enablement mit Server-Guard. |
| `OnlineLeagueWeekReadyState.readyParticipants` | `src/lib/online/online-league-week-service.ts` | Aktive und spielbare ready Teilnehmer. | Projektion aus Membership/Team/Roster/Depth. | Ja fuer UI. |
| `OnlineLeagueWeekReadyState.missingParticipants` | `src/lib/online/online-league-week-service.ts` | Aktive Teilnehmer mit fehlendem Ready oder Blocker. | Projektion. | Ja fuer UI-Blocker. |
| `OnlineLeagueReadyChangeResult.allowed` | `src/lib/online/online-league-week-service.ts` | Ob aktueller User Ready toggeln darf. | Abgeleiteter Guard. | Ja fuer Button-State; Schreibpfad prueft erneut. |
| `OnlineLeagueWeekProgressState.phase` | `src/lib/online/online-league-week-simulation.ts` | Week-Phase: `pending`, `ready`, `simulating`, `completed`, `advanced`. | Abgeleitetes kanonisches Week-Read-Model. | Ja, bevorzugt statt `weekStatus`. |
| `OnlineLeagueWeekProgressState.hasConflicts` | `src/lib/online/online-league-week-simulation.ts` | Erkennt widerspruechliche Week-Signale. | Abgeleiteter Hard-Fail-Indikator. | Ja fuer Admin/Blocker; nicht ignorieren. |
| `OnlineLeagueWeekProgressState.canonicalCompletedWeekKeys` | `src/lib/online/online-league-week-simulation.ts` | Gueltige `completedWeeks`-Keys. | Projektion aus kanonischem Ledger. | Anzeige/Admin ok. |
| `OnlineLeagueWeekProgressState.legacyCompletionWeekKeys` | `src/lib/online/online-league-week-simulation.ts` | Legacy-Signale ohne `completedWeeks`. | Konflikt-/Migration-Signal. | Admin/Debug ja; nicht als Fortschritt nutzen. |
| `OnlineCompletedWeek.status` | `src/lib/online/online-league-types.ts` | Completed-Week-Ledger-Eintrag, derzeit immer `completed`. | Kanonisch fuer Week Completion. | UI via `weekProgress`, nicht direkt fuer alle Logik. |
| `OnlineCompletedWeek.resultMatchIds` | `src/lib/online/online-league-types.ts`, `src/lib/online/online-league-week-simulation.ts` | Verknuepfung Abschluss zu Result-Dokumenten im League Doc. | Kanonische Completion-zu-Result Beziehung. | Anzeige/Admin ok; Konflikte ueber Helper. |
| `lastSimulatedWeekKey` | `src/lib/online/types.ts`, `src/lib/online/online-league-week-simulation.ts` | Legacy-Marker fuer zuletzt simulierte Woche. | Projektion/Legacy-Konfliktsignal. | Nein, ausser Debug/Admin. |
| `matchResults[].status` | `src/lib/online/online-league-types.ts`, `src/lib/online/online-game-simulation.ts` | Einzelnes Match ist abgeschlossen. | Kanonisch fuer Ergebnisdaten, nicht fuer Week Completion. | Ja fuer Results-UI. |
| `matchResults[].season/week` | `src/lib/online/online-league-types.ts`, `src/lib/online/online-league-week-simulation.ts` | Zuordnung von Results zur Woche. | Ergebnisdaten; Legacy-Completion-Signal nur fuer Konflikterkennung. | Ja fuer Results; nicht als Completion-Wahrheit. |
| `standings[]` | `src/lib/online/types.ts`, `src/lib/online/online-league-types.ts`, `src/components/online/online-league-detail-model.ts` | Gespeicherte Tabelle. | Cache/Read-Model aus Results. | Ja fuer Anzeige; darf keine Transition blockieren/erlauben. |
| `FirestoreOnlineWeekDoc.status` | `src/lib/online/types.ts`, `src/lib/online/online-league-week-simulation.ts` | Wochen-Subcollection-Status. | Projektion/Legacy-Konfliktsignal; Writes clientseitig gesperrt. | Nein, ausser Admin/Debug. |
| `OnlineLeagueWeekSimulationGame.status` | `src/lib/online/online-league-week-simulation.ts` | Abgeleiteter Spielstatus: `scheduled`, `in_progress`, `completed`, `failed`. | Anzeige-/Simulations-Read-Model. | Ja fuer Admin/Week UI. |
| `OnlineLeagueSimulationLockDoc.status` | `src/lib/admin/online-week-simulation.ts`, `src/lib/online/repositories/firebase-online-league-mappers.ts` | Server-Lock: `idle`, `simulating`, `simulated`, `failed`, alias `completed`. | Kanonisch fuer serverseitige Simulations-Exklusivitaet. | UI darf lesen fuer Status; Writes nur Server/Admin SDK. |
| `OnlineLeagueSimulationLockDoc.simulationAttemptId` | `src/lib/admin/online-week-simulation.ts` | Idempotency/Ownership des laufenden Simulation-Attempts. | Kanonischer Server-Guard. | Nein. |
| `OnlineLeagueWeekSimulationState.canSimulate` | `src/lib/online/online-league-week-simulation.ts` | Vollstaendige lokale Simulationsbereitschaft mit Schedule/Ready/Draft/Roster/Conflicts. | Abgeleitetes Guard-Read-Model. | Ja fuer Admin UI, Server validiert erneut. |
| `OnlineLeagueLifecycleState.membershipPhase` | `src/lib/online/online-league-lifecycle.ts` | UI-Phase fuer Login/Membership/Team-Aktivitaet. | Abgeleitete UI-State-Machine. | Ja, bevorzugt. |
| `OnlineLeagueLifecycleState.draftPhase` | `src/lib/online/online-league-lifecycle.ts` | UI-Phase fuer Draft. | Abgeleitet aus Draft-Status. | Ja, bevorzugt. |
| `OnlineLeagueLifecycleState.phase` | `src/lib/online/online-league-lifecycle.ts` | Aggregierte UI-Phase: Draft, Ready, Week, Membership. | Abgeleitete UI-State-Machine; nicht persistiert. | Ja, bevorzugt fuer Online UI. |
| `OnlineLeagueLifecycleState.readyActionDisabledReason` | `src/lib/online/online-league-lifecycle.ts` | Konkreter Ready-Blockertext. | Abgeleitet. | Ja. |
| `OnlineLeagueDetailState.status` | `src/components/online/online-league-detail-model.ts` | Route-/View-Status `found`/`missing`. | UI-Routing-Zustand, kein Domain-Lifecycle. | Ja nur fuer Route. |
| `OnlineLeagueRouteValidationIssue` | `src/components/online/online-league-route-state-model.ts` | Route-Blocker bei fehlender/inkonsistenter Membership-Team-Projektion. | Abgeleiteter UI-Guard. | Ja; sollte Membership-kanonisch bleiben. |
| `Admin simulationInProgress` | `src/components/admin/admin-league-detail.tsx`, `src/components/admin/admin-league-detail-model.ts` | UI berechnet pending action oder `weekStatus=simulating`. | UI-Projektion; serverseitiger Lock ist kanonisch. | Ja fuer Button-State, nicht als alleinige Wahrheit. |
| `events[].type` | `src/lib/online/types.ts`, `firestore.rules` | Audit-/Timeline-Events wie `gm_ready_set`, `draft_pick_made`. | Audit-Projektion, keine Zustandswahrheit. | Anzeige ok; keine Transition daraus ableiten. |
| `OnlineGmInactiveStatus` | `src/lib/online/online-league-types.ts` | GM-Aktivitaetsstatus: `active`, `warning`, `inactive`, `removal_eligible`, `removed`. | Neben-Lifecycle fuer Governance, nicht Core Week/Draft State. | Ja fuer Warnungen; nicht fuer Week-Completion. |
| `OnlineTeamStatus` | `src/lib/online/online-league-types.ts` | `occupied`/`vacant` fuer Team-Besetzung. | Projektion. | Anzeige/Ready-Blocker ok. |
| `GmJobSecurityStatus` | `src/lib/online/online-league-types.ts` | GM-Jobstatus bis `fired`. | Neben-Domain; beeinflusst aktive Week-Teilnehmer. | Ja fuer UX; aktive Teilnahme ueber Helper. |
| `OnlineGmAdminRemovalStatus` | `src/lib/online/online-league-types.ts` | Admin-Removal Nebenstatus. | Neben-Domain; beeinflusst aktive Week-Teilnehmer. | Ja fuer Admin/UX; aktive Teilnahme ueber Helper. |
| `TradeProposal.status` | `src/lib/online/online-league-types.ts` | Trade-Feature Status `pending`, `accepted`, `declined`. | Feature-spezifisch, nicht Lifecycle-Wahrheit. | Nur Trade-UI; aktuell Nicht-MVP-relevant. |
| `TrainingPlanSource` | `src/lib/online/online-league-types.ts` | Trainingsplanquelle `gm_submitted`/`auto_default`. | Feature-spezifische Projektion. | Nur Training-UI. |

## Riskante doppelte Statusquellen

1. `completedWeeks` gegen `weekStatus`, `lastSimulatedWeekKey`, `matchResults` und `weeks/*`
   - Status: teilweise gehaertet.
   - Befund: `getOnlineLeagueWeekProgressState` behandelt `completedWeeks` als kanonisch und meldet Konflikte fuer Legacy-Signale ohne Ledger-Eintrag.
   - Risiko: UI/Admin-Code liest an einzelnen Stellen weiterhin rohe Werte fuer Debug, Labels und Button-State. Das ist akzeptabel fuer Anzeige, aber jede neue Transition muss ueber `weekProgress` laufen.

2. `membership.teamId` gegen `team.assignedUserId/status` und `leagueMembers/*`
   - Status: teilweise gehaertet.
   - Befund: Mapper baut aktive User aus Membership, aber `assertTeamOwner`, Firestore Rules und Route-State pruefen weiterhin Team-Projektionen als Konflikt-/Write-Guard.
   - Risiko: korrekt als Hard-Fail, solange es nicht als alternative Wahrheit interpretiert wird. Neue Read-Pfade duerfen `assignedUserId` nicht als Owner-Wahrheit verwenden.

3. `draft/main` gegen `picks/*`, `availablePlayers/*` und `settings.fantasyDraft`
   - Status: teilweise gehaertet.
   - Befund: Pick Docs und Available-Player-Docs sind praktische Wahrheit fuer Picks/Verfuegbarkeit; Draft Doc bleibt Cursor/Meta. Legacy Blob wird als Konfliktquelle erkannt.
   - Risiko: Admin-/Migration-Pfade mit explizitem Legacy-Fallback muessen sichtbar warnen oder hard-failen.

4. `membership.ready` gegen echte Simulation-Readiness
   - Status: teilweise gehaertet.
   - Befund: `ready` ist nur Intent. `getOnlineLeagueWeekReadyState` prueft aktive Teilnehmer, Team, Roster, Depth Chart, Draft und Week-Status.
   - Risiko: UI oder Smoke darf rohe `ready`-Flags nicht als "simulation-ready" bewerten.

5. `adminActionLocks/*` gegen `league.weekStatus === "simulating"`
   - Status: parallel.
   - Befund: Server-Simulation nutzt Lock-Dokumente fuer Exklusivitaet; Ready-Update prueft zusaetzlich Lock und `weekStatus`.
   - Risiko: `weekStatus` kann stale sein. Fuer Server-Aktionen muss Lock weiterhin Vorrang haben.

6. `standings[]` gegen aus `matchResults[]` berechnete Tabelle
   - Status: bewusst redundant.
   - Befund: UI nutzt gespeicherte Standings bevorzugt und berechnet Fallbacks aus Results.
   - Risiko: Standings duerfen keine Gate-/Transition-Wahrheit werden.

7. `memberCount` gegen Membership-Liste
   - Status: Counter.
   - Befund: Rules erlauben Join-Counter-Update, aber aktive Membership-Docs sind Teilnahme-Wahrheit.
   - Risiko: Lobby-Kapazitaet darf Counter nutzen, fachliche Teilnehmerlisten muessen Memberships lesen.

8. Lokale `OnlineLeague.status` (`waiting`/`active`) gegen Firestore-Status (`lobby`/`active`/`completed`/`archived`)
   - Status: Projektion.
   - Befund: `mapFirestoreStatusToLocalStatus` reduziert alle nicht-aktiven Firestore-Zustaende auf `waiting`.
   - Risiko: UI kann `completed`/`archived` verlieren, solange keine zentrale State Machine diese Phasen explizit fuehrt.

## Empfohlene State-Machine-Phasen

Eine zentrale Online State Machine sollte nicht jedes Feld ersetzen, sondern die erlaubten Phasen und Quellen formal festlegen. Empfohlenes Modell:

| Phase | Eintrittsbedingung | Kanonische Inputs | Erlaubte naechste Phasen |
| --- | --- | --- | --- |
| `anonymous` | Kein authentifizierter Online User. | Auth State | `not_member`, `lobby_open` |
| `not_member` | User ist eingeloggt, aber keine aktive Membership in League. | Membership Doc | `lobby_open`, `blocked` |
| `lobby_open` | `league.status=lobby`, Team-Auswahl offen. | League Status, Membership, Team-Projektion als Join-Guard | `membership_connected`, `lobby_full`, `blocked` |
| `membership_connected` | Aktive Membership mit Team. | Membership als Wahrheit, Team/Mirror als Projektion. | `projection_conflict`, `draft_pending`, `draft_active`, `ready_blocked` |
| `projection_conflict` | Membership widerspricht Team/Mirror. | Membership + Team/Mirror Vergleich. | `repair_required`, `blocked` |
| `draft_pending` | Draft Doc fehlt oder `not_started`; Liga noch nicht aktiv spielbar. | Draft Doc | `draft_active`, `blocked` |
| `draft_active` | `draft/main.status=active`. | Draft Doc Cursor, Pick Docs, Available-Player-Docs | `draft_conflict`, `draft_completed` |
| `draft_conflict` | Draft Doc, Pick Docs, Available Player Docs oder Legacy Blob widersprechen sich. | Draft Source Consistency Helpers | `repair_required`, `blocked` |
| `draft_completed` | `draft/main.status=completed` und Quellen konsistent. | Draft Doc + Pick/Availability Integrity | `week_pending` |
| `week_pending` | League aktiv, Draft completed, aktuelle Woche nicht completed, nicht alle ready. | `currentSeason/currentWeek`, `completedWeeks`, Ready State | `ready_open`, `ready_blocked`, `simulation_locked` |
| `ready_blocked` | User kann Ready nicht setzen. | Ready Change Guard, Roster, Depth, Draft, Week, Simulation Lock | `ready_open`, `blocked` |
| `ready_open` | User darf Ready setzen; nicht alle Teilnehmer ready. | Ready Change Guard | `ready_set`, `week_ready` |
| `ready_set` | Aktueller User ist ready, aber ggf. nicht alle. | Membership Ready + Ready State | `ready_open`, `week_ready`, `simulation_locked` |
| `week_ready` | Alle aktiven Teilnehmer sind simulation-ready. | `getOnlineLeagueWeekReadyState`, Schedule/Roster Checks | `simulation_locked`, `week_pending` |
| `simulation_locked` | Server-Lock `adminActionLocks/*` ist `simulating`. | Admin Action Lock | `simulation_failed`, `week_completed` |
| `simulation_failed` | Lock oder serverseitige Simulation meldet Fehler. | Lock Status, Admin Action Error | `week_ready`, `repair_required` |
| `week_completed` | `completedWeeks` enthaelt aktuelle Woche. | `completedWeeks` | `week_advanced` |
| `week_advanced` | Cursor zeigt auf naechste Woche nach neuestem Completion-Eintrag. | `completedWeeks.nextSeason/nextWeek`, `currentSeason/currentWeek` | `week_pending`, `season_completed` |
| `season_completed` | Saisonende erreicht oder League abgeschlossen. | League Status, Week Cursor, Schedule | `archived`, `offseason` |
| `archived` | League ist `archived` oder dauerhaft abgeschlossen. | Firestore League Status | Keine normalen Spieltransitionen |
| `repair_required` | Eine harte Inkonsistenz blockiert den Flow. | Conflict Helpers | Nur explizite Admin-Repair-Action |
| `blocked` | Auth, Permission, fehlende Daten oder ungueltige Route. | Guards/Rules/Route State | Abhaengig vom konkreten Blocker |

## Konkrete Leitplanken fuer weitere Arbeit

- UI sollte fuer den Core Loop primaer `normalizeOnlineLeagueLifecycle`, `getOnlineLeagueWeekReadyState` und `getOnlineLeagueWeekProgressState` lesen.
- Server-/Repository-Writes muessen weiterhin dieselben Bedingungen selbst pruefen; UI-Phasen sind kein Write-Guard.
- Neue Transitions duerfen nicht direkt aus `weekStatus=completed`, `lastSimulatedWeekKey`, `matchResults`, `standings`, `team.assignedUserId` oder `leagueMembers/*` entstehen.
- `league.status` braucht eine verlustfreie UI-Projektion, wenn `completed` und `archived` im Online-Frontend relevant werden.
- Eine zukuenftige `online-state-machine.ts` sollte als Pure Function die Phase plus Blocker aus den kanonischen Inputs berechnen und von UI, Admin und Smoke-Scripts gemeinsam genutzt werden.
