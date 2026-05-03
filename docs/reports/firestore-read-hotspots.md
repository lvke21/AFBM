# Firestore Read Hotspots

Datum: 2026-05-03

Grundlage:

- `docs/reports/firestore-read-budget.md`
- `scripts/firestore-usage-measure.ts`
- `src/lib/online/repositories/firebase-online-league-queries.ts`
- `src/lib/online/repositories/firebase-online-league-subscriptions.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/types.ts`

Regel: Analyse-only. Keine Codeaenderungen.

## Executive Summary

Update nach Low-risk-Fix: Die groessten Hotspots wurden reduziert, ohne Firestore-Pfade oder Datenmodell zu aendern.

Neue Messwerte:

| Flow | Vorher | Nachher | Status |
| --- | ---: | ---: | --- |
| Dashboard | 9 | 9 | unveraendert OK |
| League Load | 516 | 12 | reduziert |
| Draft Load | 505 | 121 | reduziert |

Die urspruenglich roten Budgets kamen fast vollstaendig aus einem Pfad: `leagues/{leagueId}/draft/main/availablePlayers`.

Vor-Fix-Messwerte, die diesen Report ausgelöst haben:

| Flow | Reads | Hauptursache |
| --- | ---: | --- |
| Dashboard | 9 | 1 Lobby + 8 Team Docs |
| League Load | 516 | Full League Snapshot laedt 504 Available-Player Docs mit |
| Draft Load | 505 | Draft Route laedt 504 Available-Player Docs + Draft Doc |

Der Kernfehler war nicht Firestore selbst, sondern der Snapshot-Schnitt: Der allgemeine League Load behandelte Draft-Player-Verfuegbarkeit als Teil des Standard-League-Snapshots. Dadurch bezahlte auch eine normale League-Seite den kompletten Draft-Pool.

Nach dem Fix laedt der normale League Load keinen Available-Player-Pool mehr. `subscribeToLeague` bleibt trotzdem ein Beobachtungspunkt: Core-/Draft-Listener rufen weiterhin `mapFirebaseOnlineLeague(...)` auf, nun aber mit route-spezifischen Read-Options.

## Codebefund

| Bereich | Datei | Befund |
| --- | --- | --- |
| Full League Snapshot | `src/lib/online/repositories/firebase-online-league-queries.ts:95` | `getFirebaseOnlineLeagueSnapshot` liest League, Memberships, Teams, Events, Draft Doc und Picks; Available Players sind optional. |
| Hotspot Query | `src/lib/online/repositories/firebase-online-league-queries.ts:115` | `getDocs(draftAvailablePlayersQuery(...))` laedt Available Players nur bei `includeDraftPlayerPool`, optional begrenzt. |
| Member Scoped Load | `src/lib/online/repositories/firebase-online-league-queries.ts:142` | Vor dem Full Snapshot werden League, Membership, Mirror und Teams zusaetzlich gelesen. |
| Public Lobby Mapping | `src/lib/online/repositories/firebase-online-league-queries.ts:255` | Jede Lobby liest ihre komplette Team-Collection. |
| Discovery Validation | `src/lib/online/repositories/firebase-online-league-queries.ts:285` | Jeder Mirror-Kandidat wird per Membership-Doc kanonisch validiert. |
| League Subscription | `src/lib/online/repositories/firebase-online-league-subscriptions.ts:63` | Core Listener lesen League/Memberships/Teams. |
| Draft Subscription | `src/lib/online/repositories/firebase-online-league-subscriptions.ts:80` | Draft Listener abonnieren Draft Doc und Picks; Available Players nur route-spezifisch/optional. |
| Subscription Re-Map | `src/lib/online/repositories/firebase-online-league-subscriptions.ts:134` | Jeder Core-/Draft-Emit ruft `mapFirebaseOnlineLeague`; Read-Options verhindern den Full Available-Players-Reload auf normalen Routen. |
| Event Subscription | `src/lib/online/repositories/firebase-online-league-subscriptions.ts:150` | Events sind auf 20 begrenzt und koennen lokal gemappt werden. |
| Mapper Contract | `src/lib/online/types.ts:404` | `mapFirestoreSnapshotToOnlineLeague` baut `fantasyDraftPlayerPool` aus Picks + Available Players; dadurch haengt der OnlineLeague-Typ am kompletten Pool. |

## Top 10 Read-Hotspots Aus Dem Vor-Fix-Befund

| Rang | Quelle | Geschaetzte Reads | Ursache | Low-risk Optimierung moeglich? |
| ---: | --- | ---: | --- | --- |
| 1 | League Load: `draft/main/availablePlayers` | 504 | Standard-League-Snapshot laedt kompletten Draft-Pool, obwohl normale League-Ansichten meist nur Draft-Status/Picks brauchen. | Ja, wenn League-Core-Snapshot ohne Player-Pool eingefuehrt wird. |
| 2 | Draft Load: `draft/main/availablePlayers` | 504 | Draft-Seite laedt alle verfuegbaren Spieler auf einmal. | Teilweise: Positions-/Suchfilter oder Pagination sind moeglich, aber UI/Logik muss damit umgehen. |
| 3 | `subscribeToLeague` initial: Available-Players Listener | ca. 504+ | Draft-Subscription abonniert komplette Available-Players-Collection. | Ja fuer Nicht-Draft-Seiten: Draft-Pool aus allgemeiner League-Subscription entfernen. |
| 4 | `subscribeToLeague` Re-Map bei Core-/Draft-Aenderung | ca. 516 pro Emit | Listener-Snapshot wird nicht direkt komponiert; stattdessen wird `mapFirebaseOnlineLeague` neu geladen. | Mittel: Snapshot-Daten lokal cachen/komponieren statt Full Re-Read. |
| 5 | Member Scoped League Load Vorpruefung | ca. 11 extra + Full Snapshot | `getFirebaseMemberScopedLeagueSnapshot` liest League, Membership, Mirror und Teams, danach nochmal Full Snapshot. | Ja: Vorpruefungsergebnis in den finalen Snapshot uebernehmen und Team-Doppelread vermeiden. |
| 6 | Dashboard Public Lobby Teams | 8 pro Lobby | Dashboard liest fuer jede Lobby die komplette Team-Collection, aktuell nur eine Lobby. | Ja, wenn League/Lobby-Summary freie Plaetze/Team-Counter enthaelt. |
| 7 | League Load Teams | 8 | Full Snapshot liest alle Teams. Aktuell klein, skaliert mit Teamanzahl. | Niedriges Risiko nur fuer Summary-Views; Core League braucht Teams oft wirklich. |
| 8 | Events | 2 aktuell, max. 20 | Events sind limitiert, aber Teil des Full Snapshot und separater Subscription. | Schon groesstenteils optimiert; weiter nur bei Event-heavy Ligen. |
| 9 | Membership Discovery Validation | 0 aktuell, O(Mirror-Ligen) | Mirror-Index wird pro Kandidat gegen kanonisches Membership-Doc validiert. | Ja, aber vorsichtig: Membership bleibt Wahrheit; nur Batch/Cache/Summary waere sicher. |
| 10 | Draft Picks | 0 aktuell, waechst mit Picks | Alle Pick Docs werden gelesen. Im Seed leer, spaeter bis Draft-Laenge. | Spaeter: Limit/inkrementelle Pick-Subscription; aktuell nicht Haupttreiber. |

## Flow-Analyse

### League Load

Messung: `516 Reads`.

Detail:

| Collection | Reads | Bewertung |
| --- | ---: | --- |
| `leagues` | 1 | normal |
| `leagues/{leagueId}/memberships` | 0 | Seed leer; skaliert mit aktiven Memberships |
| `leagues/{leagueId}/teams` | 8 | akzeptabel fuer Core League |
| `leagues/{leagueId}/events` | 2 | limitiert auf 20, akzeptabel |
| `leagues/{leagueId}/draft` | 1 | akzeptabel |
| `leagues/{leagueId}/draft/main/picks` | 0 | Seed leer; skaliert mit Draft-Fortschritt |
| `leagues/{leagueId}/draft/main/availablePlayers` | 504 | kritisch |

Ursache: `getFirebaseOnlineLeagueSnapshot` ist ein Full Snapshot und hat keine Variante fuer "League Core ohne Draft-Player-Pool".

Konkreter Risikopunkt: `getFirebaseLeagueById` nutzt `mapFirebaseMemberScopedLeague`, das vor dem Full Snapshot zusaetzliche Guard-Reads macht. Der dokumentierte Wert 516 ist daher eher die Untergrenze fuer echte member-scoped Seitenloads.

### Draft Load

Messung: `505 Reads`.

Detail:

| Collection | Reads | Bewertung |
| --- | ---: | --- |
| `leagues/{leagueId}/draft` | 1 | normal |
| `leagues/{leagueId}/draft/main/picks` | 0 | aktuell leer, spaeter wachsend |
| `leagues/{leagueId}/draft/main/availablePlayers` | 504 | kritisch |

Ursache: Draft braucht zwar Player-Auswahl, aber die aktuelle Route liest den kompletten Pool sofort. Das ist bei 504 Spielern gerade noch sichtbar, skaliert aber direkt mit jeder Pool-Erweiterung.

Low-risk Grenze: Eine reine League-Core-Optimierung loest den Draft-Load nicht. Fuer Draft selbst braucht es eine bewusstere Ladestrategie: Position Tabs, Suche mit Limits, Cursor/Pagination oder kleine voraggregierte Draft-Board-Slices.

### Dashboard

Messung: `9 Reads`.

Detail:

| Quelle | Reads | Bewertung |
| --- | ---: | --- |
| Lobby Query | 1 | gut |
| User Mirror Index | 0 | gut im Seed, skaliert mit User-Ligen |
| Canonical Membership Checks | 0 | richtig, aber O(Mirror-Ligen) |
| Public Lobby Teams | 8 | aktuell ok, skaliert mit LobbyCount * TeamsPerLobby |

Ursache: Dashboard ist nicht rot, aber die Team-Fanout-Strategie wird bei mehreren Lobby-Ligen teurer. `mapFirebasePublicLobbyLeague` liest Teams fuer jede Lobby, um belegte Plaetze abzuleiten.

### Events

Messung im League Load: `2 Reads`, technisch limitiert auf 20.

Events sind nicht der Budget-Blocker. Positiv: Event-Subscription kann Events lokal in `latestLeague` mappen, ohne jeden Event-Snapshot als Full League Reload zu behandeln. Rest-Risiko: Core-/Draft-Listener triggern weiterhin Full Re-Maps.

### Teams

Messung:

- Dashboard: `8 Reads` fuer eine Lobby.
- League Load: `8 Reads`.
- Member-scoped Vorpruefung: zusaetzlich `8 Reads`, bevor der Full Snapshot nochmals Teams liest.

Teams sind aktuell kein rotes Budget, aber ein vermeidbarer Multiplikator:

- Dashboard braucht wahrscheinlich nur freie Plaetze und Teamnamen, nicht jedes Team-Doc.
- Member-scoped Load liest Teams fuer Projektion/Konfliktpruefung und danach im Full Snapshot nochmal.

### Players

Es gibt in den Online-Firestore-Pfaden keine separate `players`-Collection fuer diese Budgetmessung. Die Player-Kosten stecken in `draft/main/availablePlayers`.

Das ist der zentrale Hotspot:

- Jeder Available-Player-Doc ist ein kompletter Spieler-Snapshot.
- `mapFirestoreDraftPlayerPoolFromSubcollections` baut daraus `fantasyDraftPlayerPool`.
- Allgemeine League-Views bekommen diesen Pool mit, selbst wenn sie ihn nicht anzeigen.

## Empfohlene Fix-Reihenfolge

1. **League Core Snapshot vom Draft-Player-Pool trennen**

   Ziel: `/online/league/[leagueId]` und allgemeine `subscribeToLeague`-Flows laden League, Memberships, Teams, Events, Draft-Meta und ggf. Picks, aber nicht `availablePlayers`.

   Erwarteter Effekt: League Load von ca. 516 auf ca. 12-20 Reads, je nach Memberships/Picks.

   Risiko: mittel, weil `OnlineLeague.fantasyDraftPlayerPool` heute global am League-Objekt haengt. Low-risk machbar, wenn Nicht-Draft-Views explizit ohne Pool auskommen und Tests Draft-Views separat absichern.

2. **Dedicated Draft Load fuer Available Players einfuehren**

   Ziel: Draft Route laedt Available Players nur dort, wo sie gebraucht werden.

   Erwarteter Effekt: League Load stark reduziert; Draft Load bleibt zunaechst 505, ist aber isoliert.

   Risiko: niedrig bis mittel, wenn Public API stabil bleibt und Draft-Seite weiter komplett funktioniert.

3. **Draft Available Players begrenzen**

   Optionen: Position-Filter, Suche mit `limit`, Cursor/Pagination, oder voraggregierte Draft-Board-Slices.

   Erwarteter Effekt: Draft Load von 505 auf ein budgetierbares Fenster, z. B. 50-100 Reads initial.

   Risiko: mittel, weil Draft-UI, Auto-Pick und Integritaetschecks auf vollstaendigen Pool angewiesen sein koennen.

4. **`subscribeToLeague` nicht mehr per Full Re-Read emittieren**

   Ziel: Listener-Snapshots lokal cachen und daraus ein League Read-Model bauen, statt bei jeder Aenderung `mapFirebaseOnlineLeague` neu aufzurufen.

   Erwarteter Effekt: verhindert 500+ Reads pro Core-/Draft-Aenderung.

   Risiko: mittel, weil Konsistenz-/Conflict-Checks erhalten bleiben muessen.

5. **Member-scoped Doppelreads entfernen**

   Ziel: League/Membership/Mirror/Teams aus der Guard-Vorpruefung in den finalen Snapshot uebernehmen.

   Erwarteter Effekt: spart ca. 9-11 Reads pro member-scoped Load.

   Risiko: niedrig bis mittel; keine Datenmodell-Aenderung noetig.

6. **Dashboard Lobby Summary einfuehren**

   Ziel: Dashboard liest freie Plaetze/Teamanzahl aus einem Summary-Feld oder Summary-Doc statt Team-Collection pro Lobby.

   Erwarteter Effekt: Dashboard bleibt auch bei vielen Lobby-Ligen stabil.

   Risiko: mittel, weil Summary-Projektion aktuell nicht vorhanden ist und Writes gepflegt werden muessen.

7. **Firestore Usage Messung erweitern**

   Ziel: getrennte Messungen fuer `getLeagueById`, `subscribeToLeague` initial, `subscribeToLeague` core update, `subscribeToLeague` draft update.

   Erwarteter Effekt: macht die Subscription-Kosten explizit blockierbar.

   Risiko: niedrig, nur Mess-/Script-Arbeit.

## No-Go-Kriterien

Firestore Read Budget bleibt fuer Production ein No-Go, solange:

- League Load bei ca. 516 Reads bleibt.
- Draft Load bei ca. 505 Reads initial bleibt.
- `release:check` Read Budget nur skippt/reportet und nicht blockiert.
- Subscription-Read-Kosten nicht separat gemessen sind.
