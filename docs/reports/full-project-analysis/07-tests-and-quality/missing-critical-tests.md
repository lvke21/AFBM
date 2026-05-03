# Missing Critical Tests

## Ziel der Analyse

Identifikation der wichtigsten fehlenden oder noch zu schwachen Tests, die echte Release- und Multiplayer-Regressionen verhindern wuerden.

## Wichtigste fehlende Tests

### 1. Authentifizierter Staging-Smoke als Standard-Release-Gate

Aktueller Zustand:
- `scripts/staging-admin-week-smoke.ts` existiert.
- Ausfuehrung braucht `STAGING_FIREBASE_TEST_EMAIL`/`STAGING_FIREBASE_TEST_PASSWORD` oder `E2E_FIREBASE_ADMIN_ID_TOKEN`.
- Dieser Test ist nicht automatisch in normalen lokalen Gates enthalten.

Risiko:
- Produktion kann formal lokal gruen wirken, obwohl Login, Admin-Token, Team-Zuweisung oder Week-Simulation auf Staging nicht live verifiziert wurden.

Empfehlung:
- Als verpflichtendes Release-Gate definieren.
- In CI mit Secret Store laufen lassen, nicht lokal aus `.env`.

### 2. Vollstaendiger Multiplayer-GM-Rejoin im Browser

Aktueller Zustand:
- Unit-/Service-Tests fuer Membership, Route-State und Multiplayer-Modelle sind vorhanden.
- E2E-Smoke fuer Multiplayer existiert.

Fehlt:
- Browser-Test mit Firebase Auth Emulator:
  1. User loggt ein.
  2. Liga suchen.
  3. Join/Rejoin.
  4. Team-Zuweisung pruefen.
  5. Reload auf Dashboard.
  6. Reload auf Draft/League/Roster.

Risiko:
- User-Team-Linking kann serverseitig korrekt sein, aber UI/LocalStorage/Route-State trotzdem brechen.

### 3. Admin Week Simulation End-to-End mit Ergebnis-Reload

Aktueller Zustand:
- Admin API und Week Simulation haben Unit-/Service-Tests.
- Staging-Smoke-Script existiert.

Fehlt:
- Browser- oder API-E2E, der Admin-Token, API-Call, Ergebnisse, Standings und Reload gemeinsam prueft.

Risiko:
- Firestore-Payloads, undefined-Werte, Standings oder Reload-Reads brechen erst live.

### 4. Concurrent Multiplayer Actions

Aktueller Zustand:
- Es gibt Tests fuer doppelte lokale Simulation und Sync Guards.

Fehlt:
- Echte Parallelitaets-/Race-Tests fuer:
  - zwei User joinen gleichzeitig.
  - zwei Ready-Klicks parallel.
  - zwei Admin-Week-Simulation-Requests parallel.
  - Draft Pick Doppelklick / falsches Team.

Risiko:
- Doppelte Team-Zuweisungen, doppelte Simulation oder inkonsistente Ready-State-Anzeigen.

### 5. Firestore Rules fuer Admin UID-Allowlist vs Custom Claims

Aktueller Zustand:
- Admin API Guard akzeptiert Claim oder UID-Allowlist.
- Firestore Rules koennen weiterhin custom-claim-lastig sein.

Fehlt:
- Klarer Test, der beweist:
  - Admin API akzeptiert UID-Allowlist.
  - Direkte Firestore Writes bleiben korrekt blockiert.
  - Rules und API-Guard widersprechen sich nicht.

Risiko:
- Admin UI funktioniert ueber API, aber einzelne Client-Firestore-Pfade oder Rules-Verhalten fuehlen sich inkonsistent an.

### 6. Sidebar-/Coming-Soon-Routing als kompletter Browser-Test

Aktueller Zustand:
- Navigation-Model-Tests existieren.
- E2E Navigation existiert, aber ist lokal aktuell DB-abhaengig.

Fehlt:
- Stabile Browser-Abdeckung fuer alle Multiplayer-Sidebar-Punkte:
  - MVP-Seiten laden.
  - Nicht-MVP-Seiten zeigen Coming Soon.
  - Reload auf jeder Unterseite funktioniert.
  - Active State bleibt korrekt.

Risiko:
- Tote Buttons oder 404s kommen zurueck, obwohl Model-Tests gruen sind.

### 7. Seed/Reset Integration gegen Emulator

Aktueller Zustand:
- Viele Seed-Unit-Tests.
- Staging/Emulator Guards vorhanden.

Fehlt:
- Ein kompletter Emulator-Test:
  1. Reset.
  2. League Seed.
  3. Player Seed.
  4. Draft Prep.
  5. Validate.
  6. Erneut ausfuehren, keine Duplikate.

Risiko:
- Einzelne Skript-Tests sind gruen, aber kombinierter Dev-Workflow driftet.

### 8. Savegames Offline Flow mit echter Datenbank

Aktueller Zustand:
- Savegame-Service-Tests und E2E-Seeds existieren.
- E2E-Smoke wurde durch fehlende lokale DB blockiert.

Fehlt:
- Regelmaessiger Test fuer:
  - Savegames anzeigen.
  - Fortsetzen.
  - Details.
  - Delete Confirm.
  - Offline disabled/allowed State.

Risiko:
- Einstiegspunkt kann regressieren, obwohl Kernmodule funktionieren.

### 9. UI Error States fuer fehlende/kaputte Membership

Aktueller Zustand:
- Route-State-Model-Tests pruefen einige Validierungsfaelle.

Fehlt:
- Browser-Test fuer kaputte Live-Daten:
  - `lastLeagueId` ungueltig.
  - Membership fehlt.
  - Team fehlt.
  - Mirror fehlt.

Risiko:
- User landet wieder in harter Permission-Fehlerseite statt Recovery Flow.

### 10. Accessibility und Responsive-Smoke

Aktueller Zustand:
- Keine sichtbare dedizierte a11y-/mobile Regression-Suite.

Fehlt:
- Mobile viewport smoke fuer Savegames, Online Hub, Dashboard, Admin Detail.
- Tastaturzugang fuer Haupt-CTAs.

Risiko:
- UI wirkt funktional auf Desktop, bricht aber auf kleinen Viewports oder per Keyboard.

## Prioritaet

1. Authentifizierter Staging-Smoke.
2. Multiplayer Rejoin Browser-E2E.
3. Admin Week Simulation mit Reload.
4. Full Sidebar Routing E2E.
5. Emulator Seed/Reset Integration.
6. Parallelitaets-/Race-Tests.
7. Savegames DB-E2E.
8. Auth/Rules-Konflikt-Test.
9. Kaputte Membership Browser-Recovery.
10. Mobile/a11y smoke.
