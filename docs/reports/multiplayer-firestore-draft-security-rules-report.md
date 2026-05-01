# Multiplayer Firestore Draft Security Rules Report

Datum: 2026-05-01

## Scope

Geprüft und gehärtet wurden die Security Rules für den ausgelagerten Multiplayer-Fantasy-Draft.

Implementierter Firestore-Pfad:

- `leagues/{leagueId}/draft/main`
- `leagues/{leagueId}/draft/main/picks/{pickId}`
- `leagues/{leagueId}/draft/main/availablePlayers/{playerId}`

Hinweis: Die angefragte Schreibweise `leagues/{leagueId}/draft/state/main` ist kein valider Firestore-Dokumentpfad, weil Firestore Collection- und Document-Segmente strikt alternierend erwartet.

## Rule-Entscheidungen

- Ligateilnehmer und Liga-Admins dürfen Draft-State, Pick-Historie und verfügbare Spieler lesen.
- Nicht-Mitglieder und unauthentifizierte Clients dürfen Draft-Daten nicht lesen.
- Draft-State darf durch normale Clients nur für den aktuellen Zug fortgeschrieben werden.
- Der schreibende User muss das Team kontrollieren, das aktuell am Zug ist.
- Pick-Dokumente dürfen nur für den eigenen User, das eigene Team, die aktuelle Picknummer und einen existierenden verfügbaren Spieler erstellt werden.
- `availablePlayers` darf durch Clients nicht erstellt oder verändert werden.
- `availablePlayers/{playerId}` darf nur im Rahmen eines aktuellen Zuges durch das Team am Zug gelöscht werden.
- `draftRunId` muss zwischen State, Pick und Available Player passen, wenn sie vorhanden ist.
- Admin-Draft-Initialisierung, Draft-Start, Reset und Auto-Draft bleiben serverseitige Admin-SDK-Aktionen. Direkte Client-Admin-Writes bleiben blockiert.

## Tests

Ergänzt in `src/lib/firebase/firestore.rules.test.ts`:

- erlaubtes Lesen von `draft/main`, `picks` und `availablePlayers` als Ligateilnehmer
- erlaubtes Lesen als Online-Admin
- verweigertes Lesen als Nicht-Mitglied und unauthentifizierter Client
- verweigerter direkter Draft-State-Manipulationswrite
- verweigerter gefälschter Pick für fremdes Team/fremden User
- verweigerte direkte Erstellung/Änderung von `availablePlayers`
- verweigerter Available-Player-Delete durch falsches Team
- erlaubter atomarer gültiger Pick-Batch für das Team am Zug
- verweigerte direkte Client-Admin-Erstellung von Draft-State

## Validierung

- `npm run test:firebase:rules` -> grün, 18 Tests bestanden
- `npx tsc --noEmit` -> grün
- `npm run lint` -> grün

## Restrisiko

Die Rules prüfen den gültigen Pick-Batch eng genug für den MVP, aber sie berechnen die Snake-Draft-Reihenfolge nicht vollständig in Rules. Die verbindliche Reihenfolge bleibt in Service/Transaction-Logik. Für höhere Sicherheitsanforderungen sollte der Pick komplett über eine serverseitige Route oder Cloud Function laufen.

## Status

Grün.
