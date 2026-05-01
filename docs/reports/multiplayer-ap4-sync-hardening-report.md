# Multiplayer AP4 Sync Hardening Report

Stand: 2026-04-30

## Ziel

AP4 sichert die Multiplayer-Sync-Logik ab, ohne Game-Engine, Balancing, Admin-Login oder Datenmodell zu erweitern. Der Fokus lag auf:

- Firestore Reads/Writes,
- lokaler Persistenz,
- Race Conditions,
- doppelten Writes,
- veralteten Daten,
- fehlender User-ID,
- Anonymous Auth,
- Offline-/Reload-Szenarien.

## Geaenderte Sync-Grenzen

### Firestore Join-Transaktion

Vorher wurden Team-Dokumente fuer `joinLeague()` vor der Firestore-Transaktion gelesen. Bei parallelen Joins konnte dadurch ein stale Team-Snapshot innerhalb der Transaktion weiterverwendet werden.

Nachher:

- Liga, Membership und Team-Dokumente werden innerhalb derselben Firestore-Transaktion gelesen.
- Fehlende Team-Dokumente werden erst nach den transaktionalen Reads erzeugt.
- Bestehende Membership wird vor Join-Guards erkannt und bleibt idempotent.
- `lastLeagueId` wird nur nach `joined` oder `already-member` lokal gespeichert.
- Ungueltige Liga-IDs werden vor Firestore-Refs blockiert.

Damit kann ein paralleler Join nicht mehr auf Basis eines vorab gelesenen, veralteten Team-Zustands schreiben.

### Idempotente Writes

Gehaertet:

- `setUserReady()` schreibt nicht erneut, wenn der gespeicherte Ready-State bereits identisch ist.
- `updateDepthChart()` schreibt nicht erneut, wenn die Nutzdaten identisch sind und sich nur `updatedAt` unterscheiden wuerde.
- Doppelte Join-Versuche fuer denselben aktiven User liefern `already-member`, ohne neues Join-Event zu schreiben.

Das reduziert doppelte Events und vermeidet unnoetige Firestore-Writes bei Reloads oder wiederholten UI-Aktionen.

### Stale Subscription Emits

Realtime-Listener fuer Liga-Details und verfuegbare Ligen mappen Firestore-Snapshots asynchron. Mehrere Listener konnten dadurch in kurzer Folge `mapLeague()` ausloesen.

Nachher:

- Async-Emits laufen ueber einen sequenzierten Emitter.
- Nur das neueste Emit darf UI-State setzen.
- Emits nach Unsubscribe werden verworfen.
- Fehler werden normalisiert und sichtbar an den bestehenden Error-Pfad uebergeben.

Damit ueberschreibt ein langsamer, aelterer Read keinen neueren Sync-Stand mehr.

### Lokale Persistenz

Gehaertet:

- Zugriff auf `localStorage` ist try/catch-geschuetzt.
- `getLastLeagueId()` gibt nur sichere IDs zurueck.
- `setLastLeagueId()` ignoriert ungueltige IDs.

Dadurch blockieren private Browser-Modi oder korrupte Storage-Werte nicht den Firebase-Sync.

### Anonymous Auth / User Guards

Vor produktiven Firestore-Writes wird geprueft:

- User-ID ist vorhanden und Firestore-dokument-sicher.
- Username ist nicht leer.

Falls Firebase Anonymous Auth noch nicht bereit ist, wird der Write mit klarer Fehlermeldung abgebrochen, statt mit einer leeren oder ungueltigen ID zu schreiben.

## Neue Tests

Neu:

- `src/lib/online/sync-guards.test.ts`

Abgedeckt:

- sichere Online-Sync-IDs,
- stale-aware async Emits,
- keine Emits nach Unsubscribe,
- normalisierte Fehler,
- Depth-Chart-Vergleich ohne `updatedAt`-Churn.

Gezielter Testlauf:

```text
npm test -- --run src/lib/online/sync-guards.test.ts src/components/online/online-continue-model.test.ts src/components/online/online-league-search-model.test.ts src/lib/online/online-league-service.test.ts src/lib/online/repositories/online-league-repository.test.ts
```

Ergebnis:

```text
Test Files  5 passed (5)
Tests       55 passed (55)
```

Finale Validierung:

```text
npx tsc --noEmit
Status: passed

npm run lint
Status: passed

npm run test:firebase:rules
Status: passed
Test Files  1 passed (1)
Tests       15 passed (15)

npm run test:firebase:parity
Status: passed
Test Files  1 passed (1)
Tests       3 passed (3)
```

Hinweis: Die Firebase-Emulator-Tests benoetigen lokale Ports und wurden nach einem Sandbox-Portfehler ausserhalb der Sandbox erneut ausgefuehrt.

## Nicht Geaendert

- Kein neues Auth-System.
- Kein OAuth/Auth.js.
- Keine Admin-Flow-Aenderung.
- Keine Game-Engine-Aenderung.
- Keine Firestore-Datenmodellmigration.
- Keine lokalen Ersatzwrites im Firebase-Modus.

## Bewertung

Die wichtigsten Race- und Sync-Risiken im Multiplayer-Einstieg und Dashboard sind reduziert:

- Firestore-Join basiert auf transaktional gelesenen Team-Daten.
- Repeated Writes sind fuer Ready-State und Depth Chart idempotenter.
- Realtime-Reads koennen keine neueren UI-Daten mehr durch stale async Emits ueberschreiben.
- Lokale Persistenz darf keinen kaputten Liga-Zeiger mehr in Firestore-Operationen einschleusen.

Restrisiko:

- Firestore-Regeln und Server-Admin-Flows muessen weiterhin die finale Schreibautoritaet bleiben.
- Offline-Queuing ist nicht als neues Feature umgesetzt; erwartbare Fehler werden sichtbar gemacht, aber nicht gepuffert.
