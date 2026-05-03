# Draft Source-of-Truth Inventory

Datum: 2026-05-02

Scope: Analyse des aktuellen Codezustands. Keine alten Reports als Bewertungsgrundlage.
Keine Codeaenderungen ausser diesem Report.

## Ergebnis

Der Multiplayer-Fantasy-Draft hat inzwischen Split-State in Firestore:

- Draft Doc: `leagues/{leagueId}/draft/main`
- Pick Docs: `leagues/{leagueId}/draft/main/picks/{pickNumber}`
- Available Player Docs: `leagues/{leagueId}/draft/main/availablePlayers/{playerId}`

Diese Quellen werden in den wichtigsten Runtime-Pfaden bevorzugt. Trotzdem bleiben aktive Legacy-Lesepfade bestehen:

- `leagues/{leagueId}.settings.fantasyDraft`
- `leagues/{leagueId}.settings.fantasyDraftPlayerPool`
- lokale `OnlineLeague.fantasyDraft` / `fantasyDraftPlayerPool` Defaults in `online-league-service.ts`
- alter Prospect-Draft mit `prospects`, `draftOrder`, `draftHistory` und `currentPick`

Bewertung: B3 ist weiterhin **teilweise fertig**. Pick-/Available-Player-Konflikte werden validiert, aber Legacy-Blobs koennen weiterhin fachliche Entscheidungen beeinflussen.

## Kanonische Quellen, wie der Code sie heute behandelt

| Bereich | Aktuelle Quelle | Bewertung |
| --- | --- | --- |
| Draft Status/Cursor | bevorzugt `draft/main.status`, `pickNumber`, `round`, `currentTeamId`, `draftOrder` | Soll kanonisch bleiben. |
| Picks | bevorzugt `draft/main/picks/*`, nach `draftRunId` gefiltert | Soll kanonisch bleiben. |
| Available Players | bevorzugt `draft/main/availablePlayers/*`, nach `draftRunId` gefiltert | Soll kanonisch bleiben. |
| Player Pool fuer gepickte Spieler | `playerSnapshot` in Pick Docs plus Available Player Docs | Praktisch noetig, aber als Projektion dokumentieren. |
| Legacy Draft Blob | `settings.fantasyDraft` | Aktiver Fallback, riskant. |
| Legacy Player Pool Blob | `settings.fantasyDraftPlayerPool`, teilweise generierter Default-Pool | Aktiver Fallback, riskant. |
| Classic Prospect Draft | `prospects`, `draftOrder`, `draftHistory` | Separater alter Lesepfad, nicht identisch mit Multiplayer Fantasy Draft. |

## Vollstaendiges Inventar

| Datei | Funktion / Bereich | Quelle | Liest kanonisch? | Legacy/Fallback? | Darf aktiv bleiben? | Risiko |
| --- | --- | --- | --- | --- | --- | --- |
| `src/lib/online/types.ts:53` | `FirestoreOnlineDraftStateDoc` | Draft Doc Schema | Ja | Nein | Ja | Niedrig |
| `src/lib/online/types.ts:69` | `FirestoreOnlineDraftPickDoc` | Pick Docs | Ja | Nein | Ja | Niedrig |
| `src/lib/online/types.ts:80` | `FirestoreOnlineDraftAvailablePlayerDoc` | Available Player Docs | Ja | Nein | Ja | Niedrig |
| `src/lib/online/types.ts:146` | `mapFirestoreDraftStateFromSubcollections` | Draft Doc + Pick Docs + Available Player Docs | Ja | Nein | Ja | Mittel: rekonstruiert `availablePlayerIds` aus Docs und filtert nur per `draftRunId`. |
| `src/lib/online/types.ts:183` | `mapFirestoreDraftPlayerPoolFromSubcollections` | Available Player Docs + Pick `playerSnapshot` | Ja, als Read-Model-Projektion | Nein | Ja, aber als Projektion kennzeichnen | Mittel: Player Pool ist nicht eigenes kanonisches Doc. |
| `src/lib/online/types.ts:396` | `mapFirestoreSnapshotToOnlineLeague` | Split-Docs bevorzugt, danach `settings.fantasyDraft` | Teilweise | Ja | Kurzfristig ja, mittelfristig nein | Hoch: aktiver Legacy-Fallback fuer UI, Ready, Admin und Draft Room. |
| `src/lib/online/repositories/firebase-online-league-mappers.ts:58` | `readFirestoreFantasyDraftState` | `settings.fantasyDraft` | Nein | Ja | Nur Migrations-/Diagnosepfad | Hoch |
| `src/lib/online/repositories/firebase-online-league-mappers.ts:64` | `readFirestoreFantasyDraftPlayerPool` | `settings.fantasyDraftPlayerPool` | Nein | Ja | Nur Migrations-/Diagnosepfad | Hoch |
| `src/lib/online/repositories/firebase-online-league-mappers.ts:70` | `readLegacyFantasyDraftStatus` | `settings.fantasyDraft.status` | Nein | Ja | Nein fuer neue Gates | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts:263` | `draftRef` | `draft/main` | Ja | Nein | Ja | Niedrig |
| `src/lib/online/repositories/firebase-online-league-repository.ts:267` | `draftPicksRef` | `draft/main/picks` | Ja | Nein | Ja | Niedrig |
| `src/lib/online/repositories/firebase-online-league-repository.ts:271` | `draftAvailablePlayersRef` | `draft/main/availablePlayers` | Ja | Nein | Ja | Niedrig |
| `src/lib/online/repositories/firebase-online-league-repository.ts:275` | `getSnapshot` | League + memberships + teams + events + Draft Doc + Picks + Available Players | Ja | Indirekt ueber Mapper | Ja, aber breiter Read | Mittel |
| `src/lib/online/repositories/firebase-online-league-repository.ts:546` | `subscribeToLeagueDraftDocs` | Draft Doc + Picks + Available Players Live-Abo | Ja | Indirekt ueber Mapper | Ja, spaeter route-spezifisch begrenzen | Mittel |
| `src/lib/online/repositories/firebase-online-league-repository.ts:887` | `setUserReady` | Draft Doc Status, sonst Legacy Status | Teilweise | Ja | Nein | Hoch: Ready-Gate kann alten Blob als Draft-Wahrheit nutzen. |
| `src/lib/online/repositories/firebase-online-league-repository.ts:1066` | `makeFantasyDraftPick` | Bei Draft Doc: mapped Split-State; ohne Draft Doc: Legacy State/Pool | Teilweise | Ja | Nein fuer produktive Ligen | Hoch |
| `src/lib/online/repositories/firebase-online-league-repository.ts:1126` | `validateMultiplayerDraftSourceConsistency` Aufruf | Split-State + Legacy-State Vergleich | Ja als Konflikterkennung | Ja | Ja, bis Legacy abgeschaltet ist | Mittel: erkennt Konflikt, aber Legacy bleibt aktiv. |
| `src/lib/online/repositories/firebase-online-league-repository.ts:1161` | Pick-Cursor Checks | Draft Doc gegen rekonstruierten State | Ja | Nein | Ja | Mittel |
| `src/lib/online/repositories/firebase-online-league-repository.ts:1182` | Availability/Pick Guards | `availablePlayers/{playerId}`, `picks/{pickNumber}`, `draftRunId` | Ja | Nein | Ja | Niedrig |
| `src/lib/online/repositories/firebase-online-league-repository.ts:1253` | Draft Completion | Pick Docs + Player Pool Projektion, schreibt Team Roster, loescht Legacy Blobs | Ja | Loescht Legacy | Ja | Mittel |
| `src/lib/admin/online-admin-actions.ts:351` | `mapFirestoreLeague` | Draft Doc + Picks + Available Players | Ja | Indirekt ueber Mapper | Ja | Mittel |
| `src/lib/admin/online-admin-actions.ts:412` | `getFirestoreDraftRef` | `draft/main` | Ja | Nein | Ja | Niedrig |
| `src/lib/admin/online-admin-actions.ts:424` | `toFirestoreDraftStateDoc` | Draft Doc Write-Modell | Ja | Nein | Ja | Niedrig |
| `src/lib/admin/online-admin-actions.ts:452` | `toFirestoreDraftPickDoc` | Pick Doc Write-Modell | Ja | Nein | Ja | Niedrig |
| `src/lib/admin/online-admin-actions.ts:464` | `writeFirestoreDraftPlayerPool` | Available Player Docs | Ja | Nein | Ja | Niedrig |
| `src/lib/admin/online-admin-actions.ts:496` | `getLegacyFirestoreFantasyDraftState` | `settings.fantasyDraft` | Nein | Ja | Nein | Hoch |
| `src/lib/admin/online-admin-actions.ts:500` | `getLegacyFirestoreFantasyDraftPlayerPool` | `settings.fantasyDraftPlayerPool` oder generierter Pool | Nein | Ja | Nein | Hoch |
| `src/lib/admin/online-admin-actions.ts:504` | `applyFirestoreAdminAutoDraftPick` | mapped League Split-State; ohne Draft Doc Legacy State; Pool fallback | Teilweise | Ja | Nein | Hoch: Admin-Auto-Draft kann Legacy als aktive Quelle nutzen. |
| `src/lib/admin/online-admin-actions.ts:700` | Firebase `createLeague` | schreibt Draft Doc + Available Players | Ja | Nein | Ja | Niedrig |
| `src/lib/admin/online-admin-actions.ts:787` | Firebase `resetLeague` | loescht Legacy Blobs, schreibt Draft Doc + Available Players | Ja | Loescht Legacy | Ja | Niedrig |
| `src/lib/admin/online-admin-actions.ts:917` | Firebase `startLeague` | Draft Doc Status, sonst Legacy Status; Player Pool aus Legacy/generiert | Teilweise | Ja | Nein | Hoch |
| `src/lib/admin/online-admin-actions.ts:1089` | Firebase `simulateWeek` Vorbereitung | Draft Doc an Week-Simulation | Ja | Fallback in `online-week-simulation.ts` | Nein | Hoch |
| `src/lib/admin/online-admin-actions.ts:1302` | `completeFantasyDraftIfReady` | mapped League, sonst Legacy State/Pool | Teilweise | Ja | Nein | Hoch |
| `src/lib/admin/online-admin-actions.ts:1368` | `resetFantasyDraft` | schreibt Split-State, loescht Legacy | Ja | Loescht Legacy | Ja, dev/test-only | Niedrig |
| `src/lib/admin/online-admin-actions.ts:1575` | Local Admin branch | lokale `OnlineLeague.fantasyDraft` | Lokal kanonisch | Lokaler Legacy-Speicher | Ja fuer Local Mode | Mittel |
| `src/lib/admin/online-admin-draft-use-cases.ts:17` | `getFirestoreFantasyDraftStatus` | `settings.fantasyDraft.status` | Nein | Ja | Nein | Hoch |
| `src/lib/admin/online-admin-draft-use-cases.ts:33` | `getFirestoreFantasyDraftState` | `settings.fantasyDraft` | Nein | Ja | Nein | Hoch |
| `src/lib/admin/online-admin-draft-use-cases.ts:55` | `getFirestoreFantasyDraftPlayerPool` | `settings.fantasyDraftPlayerPool` oder generierter Pool | Nein | Ja | Nein | Hoch |
| `src/lib/admin/online-admin-draft-use-cases.ts:88` | `getBestAdminAutoDraftPlayer` | `league.fantasyDraft` + `fantasyDraftPlayerPool` Read Model | Abhaengig vom Mapper | Indirekt | Ja, wenn Read Model kanonisch ist | Mittel |
| `src/lib/admin/online-admin-draft-use-cases.ts:111` | `getCurrentDraftUser` | `league.fantasyDraft.currentTeamId` | Abhaengig vom Mapper | Indirekt | Ja, wenn Read Model kanonisch ist | Mittel |
| `src/lib/admin/online-admin-draft-use-cases.ts:171` | `getNextAdminDraftState` | State + Player Pool | Abhaengig vom Input | Nein | Ja | Mittel |
| `src/lib/admin/online-week-simulation.ts:219` | `getLegacyFantasyDraftStatus` | `settings.fantasyDraft.status` | Nein | Ja | Nein | Hoch |
| `src/lib/admin/online-week-simulation.ts:478` | Simulation Draft-Gate | Draft Doc Status, sonst Legacy Status | Teilweise | Ja | Nein | Hoch: Simulation-Gate kann alten Blob als Wahrheit nutzen. |
| `src/lib/online/multiplayer-draft-logic.ts:87` | `belongsToCurrentMultiplayerDraftRun` | `draftRunId` auf Docs | Ja | Nein | Ja | Niedrig |
| `src/lib/online/multiplayer-draft-logic.ts:102` | `isCurrentMultiplayerDraftPickDocumentOccupied` | Pick Doc + `draftRunId` | Ja | Nein | Ja | Niedrig |
| `src/lib/online/multiplayer-draft-logic.ts:237` | `hasLegacyDraftStateConflict` | Split-State vs Legacy-State | Ja als Konflikterkennung | Ja | Ja bis Legacy entfernt | Mittel |
| `src/lib/online/multiplayer-draft-logic.ts:252` | `validateMultiplayerDraftSourceConsistency` | State, Player Pool, optional Legacy-State | Ja als Validator | Ja | Ja | Mittel |
| `src/lib/online/multiplayer-draft-logic.ts:308` | `validateMultiplayerDraftStateIntegrity` | `OnlineFantasyDraftState` | Abhaengig vom Input | Nein | Ja | Niedrig |
| `src/lib/online/multiplayer-draft-logic.ts:434` | `validatePreparedMultiplayerDraftPick` | State + playerPool + existingPicks | Abhaengig vom Input | Nein | Ja | Niedrig |
| `src/lib/online/online-league-types.ts:529` | `OnlineFantasyDraftState` | App-Read-Model | Nein, Aggregatmodell | Nein | Ja als DTO | Mittel |
| `src/lib/online/online-league-types.ts:915` | `OnlineLeague.fantasyDraft` | Aggregierter Read-State | Nein, Projektion | Kann Legacy enthalten | Ja, aber nicht als Persistenz-Wahrheit | Mittel |
| `src/lib/online/online-league-service.ts:3971` | `getFantasyDraftState` | lokale `fantasyDraft`, sonst generierter Initial-State | Lokal ja | Ja | Nur Local Mode | Mittel |
| `src/lib/online/online-league-service.ts:3977` | `getFantasyDraftPlayerPool` | lokale `fantasyDraftPlayerPool`, sonst generierter Pool | Lokal ja | Ja | Nur Local Mode | Mittel |
| `src/lib/online/online-league-service.ts:4048` | `startOnlineFantasyDraft` | lokale Blob-Felder | Lokal ja | Ja | Nur Local Mode | Mittel |
| `src/lib/online/online-league-service.ts:4116` | `makeOnlineFantasyDraftPick` | lokale Blob-Felder | Lokal ja | Ja | Nur Local Mode | Mittel |
| `src/lib/online/online-league-service.ts:4332` | `buildOnlineFantasyDraftRosters` | lokale Blob-Felder | Lokal ja | Ja | Nur Local Mode | Mittel |
| `src/lib/online/online-league-service.ts:8055` | `simulateOnlineLeagueWeek` | blockt nur, wenn lokaler Draft existiert und nicht completed ist | Lokal teilweise | Ja | Nur Local Mode | Mittel |
| `src/lib/online/online-league-week-service.ts:192` | Ready-Change Draft-Gate | `league.fantasyDraft.status` | Abhaengig vom Mapper | Indirekt | Ja, wenn Read Model kanonisch ist | Mittel |
| `src/lib/online/online-league-week-service.ts:279` | Simulation Readiness Draft-Gate | `league.fantasyDraft.status` | Abhaengig vom Mapper | Indirekt | Ja, wenn Read Model kanonisch ist | Mittel |
| `src/lib/online/online-league-lifecycle.ts:183` | Lifecycle Draft Phase | `league.fantasyDraft.status` | Abhaengig vom Mapper | Indirekt | Ja, wenn Read Model kanonisch ist | Mittel |
| `src/components/online/online-league-draft-page.tsx:89` | Draft Route Completion Screen | fehlender `fantasyDraft` oder `completed` | Nein | Indirekt | Ueberarbeiten | Mittel: fehlender Draft wirkt wie abgeschlossen. |
| `src/components/online/online-fantasy-draft-room.tsx:154` | Draft Room | `league.fantasyDraft`, `fantasyDraftPlayerPool` | Abhaengig vom Mapper | Indirekt | Ja als View | Mittel |
| `src/components/online/online-fantasy-draft-room-model.ts:23` | Available Player ViewModel | `availablePlayerIds` + playerPool | Abhaengig vom Mapper | Nein | Ja als View | Niedrig |
| `src/components/online/online-league-dashboard-panels.tsx:439` | `DraftStatusPanel` | `league.fantasyDraft.status` | Abhaengig vom Mapper | Indirekt | Ja als View | Mittel |
| `src/components/admin/admin-control-center.tsx:400` | Admin Draft Status Label | `league.fantasyDraft.status` | Abhaengig vom Mapper | Indirekt | Ja als View | Mittel |
| `src/components/admin/admin-league-detail.tsx:748` | Admin Draft Detail | `league.fantasyDraft`, `fantasyDraftPlayerPool` | Abhaengig vom Mapper | Indirekt | Ja als View | Mittel |
| `src/lib/online/online-league-types.ts:476` | Classic Prospect Draft types | `prospects`, `draftOrder`, `draftHistory` | Nein fuer Multiplayer Fantasy Draft | Separater alter Pfad | Nur wenn bewusst scoped | Mittel |
| `src/lib/online/online-league-service.ts:1604` | `createDraftOrder` | klassischer DraftOrder Default | Nein fuer Multiplayer Fantasy Draft | Ja | Scope klaeren | Mittel |
| `src/lib/online/online-league-service.ts:3558` | `getOnlineLeagueProspectsForDisplay` | `prospects` oder Default Prospects | Nein fuer Multiplayer Fantasy Draft | Ja | Scope klaeren | Mittel |
| `src/lib/online/online-league-service.ts:3562` | `getOnlineLeagueDraftOrderForDisplay` | `draftOrder` oder Default DraftOrder | Nein fuer Multiplayer Fantasy Draft | Ja | Scope klaeren | Mittel |
| `src/components/online/online-league-detail-model.ts:1085` | Classic Draft panel state | `prospects`, `draftOrder`, `draftHistory`, `currentPick` | Nein fuer Multiplayer Fantasy Draft | Ja | Scope reduzieren/kennzeichnen | Mittel |
| `src/lib/online/online-league-service.ts:6028` | Classic prospect pick action | `currentPick`, `prospects`, `draftOrder`, `draftHistory` | Nein fuer Multiplayer Fantasy Draft | Ja | Scope klaeren | Mittel |

## Script- und Seed-Pfade

| Datei | Quelle / Aktion | Bewertung |
| --- | --- | --- |
| `scripts/seed-online-league.ts:398` | schreibt `draft/main` | Ok fuer Seed. |
| `scripts/seeds/multiplayer-player-pool-firestore-seed.ts:408` | schreibt Draft Doc und Available Players | Ok fuer Seed. |
| `scripts/seeds/multiplayer-draft-prep-firestore-seed.ts:197` | liest Draft Doc, Picks, Available Players in Transaction | Ok, aber eigener Draft-Runner neben App/Admin. |
| `scripts/seeds/multiplayer-auto-draft-staging.ts:492` | liest/schreibt Draft Doc, Picks, Available Players fuer Staging-Reparatur | Ok als bestaetigter Staging-Repair, riskant falls haeufiger Runtime-Ersatz. |
| `scripts/seeds/multiplayer-finalize-existing-league-staging.ts:318` | liest Draft Doc und Available Players fuer Finalize-Repair | Ok als kontrollierter Repair. |
| `scripts/seeds/multiplayer-finalize-auto-draft-staging.ts:61` | finalisiert completed Draft-State | Ok als kontrollierter Repair. |
| `scripts/seeds/multiplayer-test-league-reset.ts:67` | loescht Picks und Available Players | Ok fuer Test-Reset. |
| `scripts/seeds/multiplayer-e2e-firestore-seed.ts:218` | schreibt teilweise Legacy `settings.fantasyDraft` fuer Fixture | Nur Test-Fixture; nicht als Produktverhalten interpretieren. |

## Aktive Legacy-Fallbacks

1. `mapFirestoreSnapshotToOnlineLeague` faellt auf `settings.fantasyDraft` und `settings.fantasyDraftPlayerPool` zurueck, wenn Split-Draft-State fehlt.
2. Firebase `setUserReady` nutzt `draftState?.status ?? readLegacyFantasyDraftStatus(league)`.
3. Firebase `makeFantasyDraftPick` nutzt bei fehlendem Draft Doc `settings.fantasyDraft` und `settings.fantasyDraftPlayerPool`.
4. Admin `startLeague` nutzt Legacy-Draft-Status und Legacy/Default-PlayerPool beim Aufbau eines neuen Draft Docs.
5. Admin `applyFirestoreAdminAutoDraftPick` nutzt bei fehlendem Draft Snapshot Legacy-State und Legacy/Default-PlayerPool.
6. Admin `completeFantasyDraftIfReady` nutzt bei fehlendem mapped Split-State Legacy-State und Legacy/Default-PlayerPool.
7. Week-Simulation nutzt `input.draftState?.status ?? settings.fantasyDraft.status`.
8. Local Mode erzeugt fehlenden Draft-State und PlayerPool automatisch; fuer Local ok, darf aber nicht als Firestore-Verhalten gelten.
9. Online Draft Page behandelt fehlenden `fantasyDraft` wie completed.
10. Classic Prospect Draft bleibt als eigener aktiver UI-/Service-Pfad bestehen.

## Riskante Stellen nach Fokus

### `firebase-online-league-repository`

- `setUserReady`: Legacy-Status kann Ready blockieren oder erlauben, obwohl Split-Draft fehlt oder widerspricht.
- `makeFantasyDraftPick`: Legacy-State bleibt echter Pick-Pfad, wenn Draft Doc fehlt.
- `mapLeague/getSnapshot/subscribeToLeagueDraftDocs`: laden Split-State breit und geben an Mapper weiter, der Legacy-Fallbacks einschaltet.

### `online-admin-actions`

- `startLeague`: migriert indirekt aus Legacy/Default-PlayerPool; riskant, wenn Legacy Blob stale ist.
- `applyFirestoreAdminAutoDraftPick`: Admin-Pick nutzt mapped Read Model plus Legacy-Fallback, aber keine gleich starke Source-Consistency-Pruefung wie Repository-Pick.
- `completeFantasyDraftIfReady`: kann Legacy-State finalisieren, wenn Split-State fehlt.
- `simulateWeek`: verlaesst sich fuer Draft-Gate auf Week-Simulation-Fallback.

### `multiplayer-draft-logic`

- Gute Konfliktvalidatoren vorhanden.
- `legacy-draft-state-conflict` wird erkannt, aber die Existenz des Validators zeigt, dass Legacy weiterhin am aktiven Entscheidungsmodell haengt.
- `belongsToCurrentMultiplayerDraftRun` laesst Dokumente ohne `draftRunId` als passend zu, sobald kein Run gesetzt ist. Das ist migrationsfreundlich, aber kein harter moderner Gate.

### Online Types / Mapper

- `OnlineLeague.fantasyDraft` ist ein aggregiertes Read-Model und darf nicht als Persistenz-Wahrheit gelten.
- `mapFirestoreSnapshotToOnlineLeague` ist der groesste aktive Fallback-Knoten.
- Der Player Pool wird aus Available Player Docs und Pick Snapshots rekonstruiert. Das ist ok als Projektion, muss aber bei Konflikten hard-failen statt fehlende Player still zu verstecken.

## Empfohlene Fix-Reihenfolge

1. **Mapper harden:** `mapFirestoreSnapshotToOnlineLeague` soll Legacy-Fallback nur noch explizit markiert ausgeben oder bei Firestore-Backbone ohne Draft Doc `fantasyDraft` leer lassen. Legacy-Blob darf nicht mehr still als gleichwertiger Draft-State erscheinen.
2. **Ready/Simulation Gates auf Draft Doc umstellen:** `setUserReady` und `online-week-simulation` sollen fuer Firebase nur `draft/main` akzeptieren. Fehlender Draft Doc bei Lobby/active League muss klarer Zustand oder Hard-Fail sein, nicht Legacy-Fallback.
3. **Pick-Pfade Legacy entfernen:** `FirebaseOnlineLeagueRepository.makeFantasyDraftPick` soll ohne Draft Doc nicht auf `settings.fantasyDraft` picken. Stattdessen klare Fehlermeldung: Draft nicht initialisiert/migriert.
4. **Admin-Actions trennen:** `startLeague`, `autoDraft`, `completeFantasyDraftIfReady` sollen erst Split-State laden/validieren. Legacy-Import nur als explizite, auditierte Migration/Repair-Action.
5. **Admin Auto-Draft Source Consistency:** dieselben `validateMultiplayerDraftSourceConsistency` Checks wie im Repository-Pick verwenden.
6. **UI Missing-Draft Zustand trennen:** Draft Route darf fehlenden `fantasyDraft` nicht als completed anzeigen. Anzeigen: nicht initialisiert / Migration erforderlich / Draft abgeschlossen.
7. **Classic Prospect Draft scope markieren:** `prospects`/`draftOrder`/`draftHistory` entweder aus Core-Multiplayer-UI entfernen oder klar als Nicht-MVP/Legacy-Feature kapseln.
8. **Scripts klassifizieren:** Staging-Reparaturskripte behalten, aber als Repair-only dokumentieren und nicht als normalen Draft-Abschlussweg verwenden.

## Offene Tests

Vorhanden und relevant:

- `src/lib/online/repositories/online-league-repository.test.ts:426` prueft, dass Split-Draft-Subcollections Legacy-Blob uebersteuern.
- `src/lib/online/repositories/online-league-repository.test.ts:520` prueft bewusst, dass Legacy-Draft-Blobs weiter lesbar bleiben.
- `src/lib/online/multiplayer-draft-logic.test.ts` deckt `draftRunId`, Pick-Dokument-IDs, Pick/Available-Konflikte, `completed-picks-missing` und `legacy-draft-state-conflict` ab.
- `src/lib/online/fantasy-draft-service.test.ts` deckt lokale Pick-/Availability-Konflikte ab.

Fehlend:

- Firebase Repository Test: fehlender Draft Doc + vorhandener Legacy Blob darf keinen produktiven Pick mehr erlauben.
- Firebase Ready Test: Legacy `settings.fantasyDraft.status` darf Draft Doc nicht ersetzen.
- Admin Test: Auto-Draft und Complete-Fantasy-Draft hard-failen bei fehlendem/inkonsistentem Split-State statt Legacy-Fallback.
- UI Test: fehlender `league.fantasyDraft` zeigt nicht "Draft abgeschlossen".
- Mapper Test: Legacy-Fallback nur explizit erlaubter Migrationsmodus oder hard-fail/report.

## Status

Status: **Rot fuer B3 als Source-of-Truth-Ziel**, weil aktive Legacy-Fallbacks noch fachliche Entscheidungen beeinflussen.

Dieser Report ist eine Inventur. Es wurden keine Draft-Features erweitert und keine Datenmigration ausgefuehrt.
