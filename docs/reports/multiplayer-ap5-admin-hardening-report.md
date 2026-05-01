# Multiplayer AP5 Admin Hardening Report

Stand: 2026-04-30

## Ziel

AP5 stabilisiert den Multiplayer-Adminbereich ohne Balancing-Aenderungen und ohne Umbau der Simulationslogik. Der Fokus lag auf:

- Liga erstellen,
- Liga verwalten,
- Week Simulation starten,
- mehrfaches Klicken,
- Reload waehrend Adminaktionen,
- Adminrechte / Zugriffsschutz,
- ungueltige Liga-Zustaende.

## Geaenderte Bereiche

### Admin UI

`AdminLeagueManager` und `AdminLeagueDetail` nutzen jetzt zusaetzlich zum React-State eine synchrone `useRef`-Sperre fuer laufende Adminaktionen.

Gehaertet:

- schnelle Doppel-Klicks koennen keine zweite Aktion im selben Render-Fenster starten,
- Debug-Buttons sind waehrend laufender Aktionen deaktiviert,
- Week Simulation ist in der UI nur fuer aktive Ligen ausloesbar,
- Simulationsrequests senden die erwartete `season` und `week` mit.

### Server Action Guards

Neue Helper in `src/lib/admin/admin-action-hardening.ts`:

- sichere Admin-Entity-IDs,
- robuste Integer-Normalisierung fuer `maxUsers` und `startWeek`,
- deterministische Lock-ID fuer Week Simulation,
- Validierung des erwarteten Simulationsziels.

Damit koennen manipulierte oder stale Requests frueh als Admin-Action-Fehler abgewiesen werden.

### Firebase Adminaktionen

Gehaertet:

- `deleteLeague`: bereits archivierte Ligen werden als No-op behandelt.
- `setAllReady`: schreibt nur Memberships, die noch nicht ready sind.
- `startLeague`: bereits aktive Ligen werden als No-op behandelt.
- `simulateWeek`: verlangt erwartete Season/Week und schreibt einen deterministischen `adminActionLocks`-Marker pro Liga/Woche.
- `removePlayer`: bereits entfernte Spieler loesen keinen erneuten Counter-Decrement aus.
- `markVacant`: bereits entfernte/vakante Teams werden als No-op behandelt.

Die wichtigste Aenderung ist `simulateWeek`: ein alter oder doppelter Request fuer Week N kann nach erfolgreichem Fortschritt nicht Week N+1 direkt mit ausloesen.

### Lokaler Adminmodus

Der lokale Modus prueft bei `simulateWeek` ebenfalls die erwartete Season/Week. Ein wiederholter Request fuer dieselbe alte Woche bleibt dadurch idempotent und laesst `currentWeek` unveraendert.

## Nicht Geaendert

- Keine Balancing-Aenderung.
- Keine neue Simulationsberechnung.
- Kein neues Auth-System.
- Kein OAuth/Auth.js.
- Keine Client-Secrets.
- Keine Datenmodellmigration fuer bestehende Liga-Daten.

## Tests

Neu:

- `src/lib/admin/admin-action-hardening.test.ts`
- `src/lib/admin/online-admin-actions.test.ts`

Relevanter Testlauf:

```text
npm test -- --run src/lib/admin/admin-action-hardening.test.ts src/lib/admin/online-admin-actions.test.ts src/app/api/admin/online/actions/route.test.ts src/lib/online/online-league-service.test.ts
```

Ergebnis:

```text
Test Files  4 passed (4)
Tests       45 passed (45)
```

Finale Validierung:

```text
npx tsc --noEmit
Status: passed

npm run lint
Status: passed
```

## Bewertung

Der Adminbereich ist jetzt gegen die wichtigsten unkontrollierten Wiederholungen abgesichert:

- UI blockt Mehrfachklicks synchron.
- Server blockt stale Simulationen ueber erwartete Season/Week.
- Wiederholte Adminaktionen erzeugen weniger doppelte Writes und keine unbeabsichtigten Counter-Fortschritte.
- Fehler bleiben sichtbar, weil Adminaktionen weiterhin ueber den bestehenden Response-/Feedback-Pfad laufen.

Restrisiko:

- Die Platzhalter-Simulation selbst bleibt bewusst unveraendert.
- Vollstaendige Langlaeufer-Queues fuer echte Simulation-Jobs wurden nicht eingefuehrt; AP5 stabilisiert den aktuellen synchronen Adminpfad.
