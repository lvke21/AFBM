# Multiplayer AP6 Error Recovery Report

Stand: 2026-04-30

## Ziel

AP6 fuehrt ein einheitliches Fehler- und Recovery-Konzept fuer Multiplayer ein. Der Fokus lag auf:

- Ladefehler,
- Auth-Fehler,
- fehlende Liga,
- fehlender Spieler,
- fehlendes Team,
- Sync-Fehler,
- Netzwerkfehler,
- Berechtigungsfehler.

## Implementiertes Konzept

### Recovery-Klassifizierung

Neu:

- `src/lib/online/error-recovery.ts`

Die Multiplayer-Fehler werden in Recovery-Klassen eingeordnet:

- `auth`
- `network`
- `permission`
- `not-found`
- `missing-player`
- `missing-team`
- `sync`
- `unknown`

Die Texte sind bewusst handlungsorientiert: Was ist passiert, was bleibt sicher, und was kann der User tun.

### Recovery UI

Neu:

- `src/components/online/online-recovery-panel.tsx`

Das Panel bietet:

- klare Ueberschrift,
- konkrete Fehlermeldung,
- Recovery-Hinweis,
- Retry-Button,
- sicheren Zurueck-Link zum Online Hub.

Damit entstehen keine leeren Screens mehr bei erwartbaren Multiplayer-Fehlern.

## Geaenderte Flows

### Online User Status

Auth-Fehler im Online Hub zeigen jetzt eine konkrete Meldung mit Retry. Im Firebase-Modus wird weiterhin nicht auf lokale Ersatzdaten gewechselt.

### Weiterspielen

Continue-Fehler nutzen jetzt die Recovery-Klassifizierung. Netzwerk-/Berechtigungs-/Not-Found-Fehler bekommen unterscheidbare Hinweise.

### Liga Suche / Join Flow

Such- und Join-Fehler nutzen Recovery-Copy. Bestehende Retry-Moeglichkeit fuer die Suche bleibt erhalten, die Meldung erklaert jetzt klarer, ob Verbindung, Berechtigung oder Sync betroffen ist.

### Liga Dashboard

Das Dashboard zeigt Recovery-Panels fuer:

- Auth-/Ladefehler,
- fehlende Liga,
- fehlenden Spieler in der Liga,
- fehlende oder vakante Team-Zuordnung.

Retry laedt Auth- und Liga-Subscription neu. Zurueck fuehrt sicher zum Online Hub. Lokale Daten werden bei Firebase-Fehlern nicht als Ersatz geschrieben.

## Manuelle Fehlerfallpruefung

| Fehlerfall | Erwartetes Verhalten | Status |
| --- | --- | --- |
| Firebase Auth nicht verfuegbar | Online Hub zeigt Auth-Fehler mit Retry, kein lokaler Firebase-Fallback | dokumentiert / implementiert |
| Netzwerkfehler beim Liga-Laden | Dashboard zeigt Recovery-Panel mit Retry und Zurueck-Link | dokumentiert / implementiert |
| Fehlende Liga-ID / geloeschte Liga | Dashboard zeigt "Liga nicht gefunden" und bietet Retry + Online Hub | dokumentiert / implementiert |
| User ist nicht Mitglied der Liga | Dashboard zeigt "Spieler in dieser Liga nicht gefunden" statt leerer GM-Ansicht | dokumentiert / implementiert |
| User hat keine aktive Team-Zuordnung | Dashboard zeigt "Team-Zuordnung fehlt" statt deaktivierter/unklarer Aktionen | dokumentiert / implementiert |
| Firestore Permission Denied | Recovery-Copy nennt fehlende Berechtigung und fuehrt zurueck zum Online Hub | dokumentiert / implementiert |
| Sync-Fehler unbekannter Ursache | Fallback-Meldung bleibt sichtbar, mit Retry/Hub-Navigation | dokumentiert / implementiert |
| Join/Search Fehler | Online Hub zeigt konkrete Warnung; Suche kann erneut gestartet werden | dokumentiert / implementiert |

## Tests

Neu:

- `src/lib/online/error-recovery.test.ts`

Gezielter Testlauf:

```text
npm test -- --run src/lib/online/error-recovery.test.ts src/lib/online/sync-guards.test.ts src/components/online/online-continue-model.test.ts src/components/online/online-league-search-model.test.ts
```

Ergebnis:

```text
Test Files  4 passed (4)
Tests       18 passed (18)
```

Finale Validierung:

```text
npx tsc --noEmit
Status: passed

npm run lint
Status: passed
```

## Nicht Geaendert

- Kein neues Auth-System.
- Kein OAuth/Auth.js.
- Kein lokaler Ersatzwrite im Firebase-Modus.
- Keine Firestore-Datenmodellmigration.
- Keine Game-Engine- oder Balancing-Aenderung.

## Bewertung

Die Multiplayer-UI hat jetzt fuer die wichtigsten Fehlerklassen eine sichere Recovery-Richtung:

- Retry fuer temporaere Auth-/Netzwerk-/Sync-Probleme,
- Online Hub als sichere Rueckfallebene,
- klare Zustandsmeldung bei fehlendem Spieler oder Team,
- keine stillen lokalen Datenueberschreibungen bei Firebase-Problemen.

Restrisiko:

- Echte Offline-Queues sind weiterhin nicht implementiert. AP6 macht Fehler sichtbar und wiederholbar, puffert aber keine Writes.
