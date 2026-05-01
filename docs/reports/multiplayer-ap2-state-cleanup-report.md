# Multiplayer AP2 State Cleanup Report

Stand: 2026-04-30

## Ziel

AP2 bereinigt den Multiplayer-State ohne neue Features, ohne Game-Engine-Aenderungen und ohne Datenmodellmigration. Der Fokus lag auf:

- eine eindeutige State-Quelle pro Laufzeitmodus,
- Entfernen alter doppelter LocalStorage-Logik,
- einheitlichere Ladezustaende,
- sichtbare Fehlerzustaende,
- stabileres Reload-Verhalten im Online-Hub und Liga-Dashboard.

## Geaenderte State-Quelle

### Vorher

Mehrere Komponenten riefen `getOnlineLeagueRepository()` separat auf. Dadurch entstanden pro Render-/Komponentenpfad neue Repository-Instanzen. Gleichzeitig wurde im Firebase-Modus an einigen Stellen still auf lokale State-Funktionen ausgewichen:

- globale Root-Initialisierung legte immer `afbm.online.*` LocalStorage-Identity an,
- Firebase-Auth-Fehler im Online-User-Status fielen auf `ensureCurrentOnlineUser()` zurueck,
- Firebase-Liga-Subscription-Fehler im Dashboard fielen auf `getOnlineLeagueById()` aus LocalStorage zurueck,
- alte `src/lib/multiplayer/*`-State-Logik mit `afbm.multiplayer.*` existierte parallel zur aktiven `src/lib/online/*`-Schicht.

### Nachher

Die aktive Multiplayer-State-Quelle ist jetzt klar:

- **Firebase-Modus:** `FirebaseOnlineLeagueRepository` + Firebase Auth + Firestore.
- **Local-Modus:** `LocalOnlineLeagueRepository` + `afbm.online.*` LocalStorage.

`getOnlineLeagueRepository()` cached nun ein Repository pro aktivem Modus. Dadurch verwenden Online-Hub, Suche, Continue, User-Status, Dashboard und Admin-Komponenten dieselbe Repository-Instanz statt lose neu erzeugter Instanzen.

Die alte `src/lib/multiplayer/*`-Schicht wurde entfernt, weil sie produktiv nicht mehr referenziert war und nur noch eigene Tests hatte. Die globale `MultiplayerIdentityInitializer` wurde aus dem Root Layout entfernt, damit außerhalb des Online-Flows kein lokaler Multiplayer-State mehr erzeugt wird.

## Ladezustaende

### Online User Status

`OnlineUserStatus` unterscheidet jetzt explizit:

- `loading`: Online-Identitaet wird geladen.
- `ready`: User ist verfuegbar.
- `error`: Firebase Auth konnte nicht geladen werden.

Im Firebase-Modus wird bei Auth-Fehlern nicht mehr auf lokalen User-State ausgewichen. Im Local-Modus bleibt der lokale Fallback erhalten.

### Liga Dashboard

`OnlineLeaguePlaceholder` fuehrt einen eigenen `loadError` fuer Auth-/Firestore-Fehler. Firebase-Subscription-Fehler werden sichtbar angezeigt und nicht mehr durch LocalStorage-Liga-Daten maskiert. Der vorhandene Missing-State bleibt fuer echte "Liga nicht gefunden/kein Zugriff"-Faelle erhalten.

### Liga Suche

`OnlineLeagueSearch` macht Realtime-Subscription-Fehler nun sichtbar und setzt den Suchzustand auf `error`, statt nur die Liste zu leeren.

## Entfernte Doppellogik

Entfernt:

- `src/components/multiplayer/multiplayer-identity-initializer.tsx`
- `src/lib/multiplayer/current-user.ts`
- `src/lib/multiplayer/current-user.test.ts`
- `src/lib/multiplayer/league-service.ts`
- `src/lib/multiplayer/league-service.test.ts`

Begruendung:

- Keine produktive Referenz auf `src/lib/multiplayer/*`.
- Der aktive Multiplayer-Pfad nutzt `src/lib/online/*`.
- Alte Keys `afbm.multiplayer.*` sollten nicht parallel zu `afbm.online.*` als zweite State-Quelle weiterleben.

## Lokale Persistenz Nach Cleanup

Weiterhin bewusst genutzt:

- `firebaseLocalStorageDb`: Firebase Auth Session.
- `afbm.online.lastLeagueId`: lokaler Continue-Zeiger.
- `afbm.online.username`: DisplayName-Fallback.
- `afbm.online.leagues`: nur im Local-Testmodus.
- `afbm-online-league-expert-mode`: rein lokaler UI-Schalter.

Nicht mehr produktiv angelegt:

- `afbm.multiplayer.userId`
- `afbm.multiplayer.username`
- `afbm.multiplayer.leagues.global`
- `afbm.multiplayer.lastLeagueId`

## Firebase-Modus: Keine Stillen Local Writes

Im Liga-Dashboard wurden lokale Ersatzwrites im Firebase-Modus blockiert. Betroffene Aktionen zeigen nun eine Warnung statt `online-league-service.ts`-LocalStorage zu mutieren:

- Training Plan
- Franchise-Strategie
- Stadium Pricing
- Contracts
- Trades
- Draft
- Coaches
- Media Expectations
- Claim Vacant Team

Damit bleibt Firestore die eindeutige Quelle im Firebase-Modus. Ready-State bleibt weiterhin synchronisiert ueber `repository.setUserReady()`.

## Reload-Verhalten

Verbessert:

- Repository-Instanz bleibt pro Modus stabil.
- Root Layout erzeugt nicht mehr bei jedem App-Load lokalen Online-State.
- Firebase Dashboard maskiert fehlgeschlagene Firestore-Reads nicht mehr durch alte LocalStorage-Daten.
- Continue verwendet weiterhin `afbm.online.lastLeagueId`, aber validiert die Liga ueber das aktive Repository.

Weiteres bekanntes Limit:

- `lastLeagueId` ist weiterhin geraete-/browserlokal. Eine echte "meine Ligen"-Wiederherstellung ueber Firestore-Memberships ist noch nicht implementiert.

## Nicht Geaendert

- Keine Game-Engine-Aenderung.
- Kein Balancing.
- Kein Firestore-Datenmodellwechsel.
- Keine neue Multiplayer-Funktion.
- Keine Auth.js/OAuth-Rueckkehr.
- Keine echte Online-Week-Simulation ergaenzt.

## Validierung

- `npx tsc --noEmit`: gruen
- `npm run lint`: gruen

## Restrisiken

| Risiko | Status | Hinweis |
| --- | --- | --- |
| Tiefe Dashboard-Aktionen sind im Firebase-Modus noch nicht produktiv | Bewusst sichtbar blockiert | AP2 verhindert lokale Schattenwrites, implementiert aber keine neuen Firestore-Actions. |
| Continue ist lokal gespeichert | Bestehend | Geraetewechsel findet Liga weiterhin nicht automatisch. |
| Online-Week-Simulation bleibt Placeholder | Bestehend | Admin `simulateWeek` zaehlt nur Woche weiter und resetet Ready-State. |
| Firebase Auth Provider-Konfiguration | Bestehend | Code zeigt Fehler, Live-Erfolg haengt weiter an Firebase-Projektkonfiguration. |

## Fazit

AP2 entfernt die gefaehrlichste Unklarheit: Im Firebase-Modus wird kein lokaler Ersatz-State mehr als scheinbar erfolgreiche Multiplayer-Aenderung geschrieben oder gelesen. Die aktive Quelle ist jetzt Repository-basiert eindeutig: Firebase/Firestore fuer Live Multiplayer, LocalStorage nur fuer den lokalen Testmodus und kleine UI-/Continue-Hilfswerte.
