# Firestore Read/Write Performance

## Ziel der Analyse

Bewertung der Firestore-Kosten- und Konsistenzrisiken durch Listener, Reads, Writes, Transaktionen und Datenmodell-Payloads.

## Untersuchte Dateien/Bereiche

- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/online-league-service.ts`
- `src/lib/online/types.ts`
- `src/lib/online/online-league-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/components/online/online-league-route-state.tsx`
- `src/app/api/admin/online/actions/route.ts`
- Seed-/Smoke-Scripts, soweit sie Firestore-Zugriffsmuster zeigen

## Aktuelles Firestore-Lesemodell

Der wichtigste Live-Pfad ist `subscribeToLeague()` in `src/lib/online/repositories/firebase-online-league-repository.ts`.

Aktuell abonnierte Datenbereiche:

1. League-Dokument: `leagues/{leagueId}`
2. Memberships: `leagues/{leagueId}/memberships`
3. Teams: `leagues/{leagueId}/teams`
4. Events: `leagues/{leagueId}/events` mit `limit(20)`
5. Draft State: `leagues/{leagueId}/draft/main`
6. Draft Picks: `leagues/{leagueId}/draft/main/picks`
7. Draft Available Players: `leagues/{leagueId}/draft/main/availablePlayers`

Bei Aenderung ruft der Emitter `mapLeague(leagueId)` auf. Dieser geht ueber `getSnapshot(leagueId)` und liest erneut:

- `getDoc(leagueRef)`
- `getDocs(memberships)`
- `getDocs(teams)`
- `getDocs(events limit 20)`
- `getDoc(draft main)`
- `getDocs(draft picks)`
- `getDocs(draft availablePlayers)`

## Hauptproblem

Die Listener erkennen granular Aenderungen, aber die nachfolgende Aktualisierung liest wieder den gesamten Snapshot. Dadurch kann ein einzelnes Draft-Pick-Event oder ein Membership-Update mehrere Collections neu lesen.

Das ist funktional robust, aber teuer.

## Read-Risiken

| Risiko | Ursache | Auswirkung | Bewertung |
| --- | --- | --- | --- |
| Read-Fanout pro League-Update | Ein Listener-Event fuehrt zu vollem Snapshot. | Mehr Firestore Reads und UI-Latenz. | Hoch |
| Draft-Daten immer im Hauptabo | Draft Picks und Available Players werden auch fuer Dashboard-Kontext geladen. | Unnoetige Reads nach Draft-Ende oder ausserhalb Draft-Route. | Hoch |
| Search/Lobby liest pro Liga Teams | `mapPublicLobbyLeague()` liest Teams fuer Lobby-Darstellung. | N+1-artige Kosten bei vielen Ligen. | Mittel |
| Events werden immer mitgeladen | Events limit 20 sind klein, aber jedes Snapshot-Refresh liest sie erneut. | Unnoetige Wiederholung. | Mittel |
| Member-Scoped Load faellt auf Vollsnapshot zurueck | Erst Membership/Mirror, dann teils kompletter Snapshot. | Korrekt, aber doppelte Reads in Fehler-/Normalpfaden moeglich. | Mittel |

## Write-Risiken

| Bereich | Risiko | Datei |
| --- | --- | --- |
| Week Simulation | Viele Results/Standings/League-State-Felder muessen konsistent geschrieben werden. | `src/lib/admin/online-admin-actions.ts`, `online-league-week-simulation.ts` |
| Draft Picks | Pick, Player-Team-Zuweisung, Draft-State und Available Players muessen synchron bleiben. | `firebase-online-league-repository.ts`, `online-league-service.ts` |
| Ready-State | Membership und moegliche Mirror-Daten koennen auseinanderlaufen. | `firebase-online-league-repository.ts` |
| Team Assignment | Teams, Memberships und globaler Mirror muessen dieselbe User-Team-Verbindung tragen. | `firebase-online-league-repository.ts`, Admin Backfill Scripts |

## Datenmodell-Payload-Risiken

Das League-Dokument und seine gemappten Online-League-Objekte enthalten bzw. transportieren mehrere groessere Datenfelder:

- `schedule`
- `matchResults`
- `standings`
- `completedWeeks`
- `settings.fantasyDraft`
- `settings.fantasyDraftPlayerPool` bzw. Draft-Subcollections

Risiko:
- Je mehr Wochen simuliert werden, desto groesser werden Results und Standings.
- Wenn Results auf dem League-Dokument wachsen, wird jedes League-Meta-Update schwerer.
- Hot-Document-Writes auf das League-Dokument koennen bei Admin- und Simulation-Flows zum Engpass werden.

## Aktuelle positive Punkte

- Online Route State wurde zentralisiert. Dadurch gibt es nicht mehr offensichtlich mehrere parallele Subscriptions fuer dieselbe League-Route.
- `createOrderedAsyncEmitter` verhindert chaotische Out-of-Order-Updates.
- Admin Week Simulation nutzt serverseitige Guards und blockiert doppelte Simulationen besser als fruehere reine Client-Flows.
- Events sind auf `limit(20)` begrenzt.

## Konkrete Optimierungen

### Quick Wins

1. In Development Read-Diagnostik einbauen:
   - Anzahl Listener-Events pro Collection.
   - Anzahl `getSnapshot()`-Aufrufe.
   - Groesse der gemappten Arrays.
2. `subscribeToLeague()` optional profilieren:
   - `core`: League, Memberships, Teams, Events.
   - `draft`: Draft State/Picks/Available Players.
   - `week`: Schedule, Results, Standings.
3. Draft-Subcollections nicht immer abonnieren, wenn:
   - Draft completed ist.
   - aktive Route nicht Draft ist.
4. Lobby-Karten mit denormalisierten leichten Feldern versehen:
   - teamCount
   - occupiedTeamCount
   - currentWeek
   - status
   Dadurch muss die Liste nicht fuer jede Liga Teams lesen.

### Groessere Arbeit

1. Results und Standings aus dem League-Hauptdokument in Wochen-/Subcollections verschieben oder zumindest read-optimiert spiegeln.
2. `subscribeToLeague()` in explizite Subscription-Profile schneiden.
3. Draft Available Players als paginierte oder route-spezifische Query laden.
4. Simulationsergebnisse in einem Batch/Transaction-orientierten Write-Model halten und danach nur kompakte Summary ins League-Dokument schreiben.

## Messbarkeit

Empfohlene Metriken:

- Reads pro Dashboard-Load.
- Reads pro Draft-Room-Load.
- Reads pro Ready-State-Klick.
- Writes pro Week-Simulation.
- Groesse des gemappten `OnlineLeague`-Objekts.
- Anzahl Subscriptions pro Route.
- Anzahl Snapshot-Emits pro Minute bei aktivem Draft.

## Fazit

Firestore ist aktuell funktional stabil, aber nicht kostenoptimal. Das groesste Risiko ist nicht ein einzelner Write, sondern der breite Snapshot-Fanout: mehrere Listener fuehren immer wieder zu einem vollstaendigen League-Snapshot. Fuer Staging und kleine Ligen ist das tragbar, fuer mehrere parallele Multiplayer-Ligen wird es teuer und traege.
