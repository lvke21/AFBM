# Multiplayer Phase 2 Player Flow Recovery Report

Datum: 2026-05-04

Rolle: Senior QA Lead

Ziel: Ehrliche Bewertung, ob der echte Multiplayer-Spielerflow nach Phase 2 spielbar ist.

## Executive Summary

Der neue Player-Smoke ist ein wichtiger Fortschritt: Ein nicht-admin Firebase-Player kann auf Staging seine Liga laden, Membership und Team validieren, `draft.status=completed` erkennen, die Dashboard-Route erreichen, die eigene Membership auf Ready setzen und nach Reload denselben Team-/Ready-State sehen.

Trotzdem ist der vollstaendige echte Spieler-Lifecycle noch nicht hart bewiesen. Besonders First-Time-Join, echter Browser-Login mit Session-Persistenz und aktiver Draft Ende-zu-Ende auf Staging bleiben nur lokal, ueber Emulator oder ueber Modell-/Service-Tests belegt.

Finale Entscheidung:

- Multiplayer echter Spielerflow spielbar: **Nein, nicht vollstaendig bewiesen.**
- Minimaler seeded Player-Ready/Reload-Golden-Path auf Staging: **Ja.**
- Phase 3 freigegeben: **Nein.**

## Aktueller Staging-Beleg

Live ausgefuehrter Command:

```bash
CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYER_PLAYABILITY_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:player-playability -- --league-id afbm-playability-test
```

Ergebnis: **GREEN**

Wesentliche Ausgabe:

- Commit expected: `5ef05a89887b`
- Commit deployed: `5ef05a89887b3c47688cb2c7879ee3453b01df7c`
- Revision: `afbm-staging-backend-build-2026-05-04-001`
- Player UID: `basel-rhinos-gm`
- Admin Claim: `false`
- Liga: `afbm-playability-test`
- Team: `basel-rhinos`
- Week: `2`
- Draft: `completed`
- Dashboard route: HTTP `200`
- Ready nach Klick: `true`
- Reload: Team stabil, `ready=true`

Wichtig: Dieser Smoke nutzt Firebase Auth Custom Token fuer einen nicht-admin Testspieler und Firestore REST fuer Membership/Ready. Er ist kein voller Browser-Klicktest und kein Email/Passwort-Login-Test.

## Bereichsbewertung

| Bereich | Status | Evidenz | Testcommand | Offene Risiken | Naechste Empfehlung |
| --- | --- | --- | --- | --- | --- |
| Echter Login | Gelb | Player-Smoke authentifiziert als Firebase User ohne `admin=true`; Token stammt im Live-Lauf aus IAM signed custom token fuer `basel-rhinos-gm`. | `npm run staging:smoke:player-playability -- --league-id afbm-playability-test` | Kein Browser-Login; keine Email/Passwort-Session; keine Persistenz ueber Browser-Reload/Logout/Login bewiesen. | Browser-Smoke mit `STAGING_PLAYER_EMAIL`/`STAGING_PLAYER_PASSWORD` und Session-Reload ergaenzen. |
| Join Flow | Gelb | Local/Repository-Tests pruefen Join ohne Team-Identity, volle Liga, doppelte Membership und parallele Join-Vergabe. | `npx vitest run src/lib/online/online-league-service.test.ts src/lib/online/repositories/online-league-repository.test.ts` | Kein live Staging-Join eines neuen Spielers; kein Browser-Einladungs-/Join-Flow bewiesen. | Staging-only Join-Smoke mit frischer Liga und dediziertem Player-Testuser bauen. |
| Team Assignment | Gruen | Player-Smoke validiert Membership `basel-rhinos-gm -> basel-rhinos` und Team-Projektion; Tests decken Membership/Mirror/Team-Konflikte ab. | `npm run staging:smoke:player-playability -- --league-id afbm-playability-test`; `npx vitest run src/lib/online/repositories/online-league-repository.test.ts src/components/online/online-league-route-state-model.test.ts` | Live-Beleg gilt fuer seeded Liga; keine manuelle UI-Inspektion. | Team-Assignment im Browser-Rejoin-Smoke mit sichtbarem Teamnamen pruefen. |
| Rejoin | Gelb | Player-Smoke laedt nach Ready erneut und bestaetigt Team + Ready; Route-State-Tests pruefen Membership/Team nach Reload und stale Projektionen. | `npm run staging:smoke:player-playability -- --league-id afbm-playability-test`; `npx vitest run src/components/online/online-league-route-state-model.test.ts` | Kein echter Browser-Reload mit Firebase Auth Persistence; kein Logout/Login-Rejoin; kein stale `lastLeagueId` live getestet. | Browser-E2E: Login, Liga oeffnen, Reload, localStorage leeren, Continue/Rejoin pruefen. |
| Aktiver Draft | Gelb | Unit-/Service-Tests decken gueltige Picks, falsches Team, unavailable Player, Race/Concurrency und Completed-Finalisierung ab. | `npx vitest run src/lib/online/fantasy-draft-service.test.ts src/lib/online/multiplayer-draft-logic.test.ts src/lib/online/repositories/online-league-repository.test.ts`; optional `npm run test:e2e:multiplayer:firebase:draft` | Neuer Player-Smoke prueft nur `draft.status=completed`; kein aktiver Staging-Draft mit echtem Player-Pick live bewiesen. | Separaten Staging-Draft-Smoke fuer active Draft mit non-admin Player-Pick erstellen. |
| Draft Completed Unlock | Gelb | Model-/Navigation-Tests pruefen Unlock nach completed Draft; Player-Smoke erkennt completed Draft und Dashboard HTTP 200. | `npx vitest run src/components/online/online-league-detail-model.test.ts src/components/layout/navigation-model.test.ts src/components/online/online-league-route-fallback-model.test.ts`; `npm run staging:smoke:player-playability -- --league-id afbm-playability-test` | Kein Staging-Browsercheck fuer sichtbare Links `Spielablauf`, `Roster`, `Depth Chart`; HTTP 200 beweist nicht, dass UI nicht visuell blockiert ist. | Browser-Smoke mit sichtbarer Navigation und Direct URLs zu Roster/Depth/Week Flow. |
| Player Ready Flow | Gruen | Player-Smoke setzt nicht-admin eigene Membership `ready=false -> true`; Unit/Repository-Tests blocken anderer User, No-Team, leere Woche, Simulation, completed Week und Reload-Persistenz. | `npm run staging:smoke:player-playability -- --league-id afbm-playability-test`; `npx vitest run src/lib/online/online-league-week-service.test.ts src/lib/online/repositories/online-league-repository.test.ts` | Smoke schreibt direkt ueber Firestore REST, nicht via UI-Button im Browser. | Naechster Schritt: Browser klickt Ready-Button und prueft sichtbares Feedback. |
| Player Playability Smoke | Gruen | Neues Script `scripts/staging-player-playability-smoke.ts`; npm command vorhanden; Live-Run gegen Staging war GREEN. | `npm run staging:smoke:player-playability -- --league-id afbm-playability-test` | Deckt nur completed-draft seeded Golden Path ab; Admin-Simulation ist bewusst skipped. | Als Required Staging Gate fuer Player Ready/Rejoin aufnehmen, aber nicht als Ersatz fuer Join/Draft-Browser-Smokes verwenden. |

## Detaillierte Bewertung

### Echter Login: Gelb

Belegt ist ein echter Firebase Auth Identity-Token fuer einen nicht-admin User. Der Smoke verweigert `admin=true` und nutzt keine Admin-Action fuer Ready.

Nicht belegt ist ein normaler Browser-Login mit Email/Passwort, Session-Persistenz und UI-Gate. Der Live-Run nutzte IAM sign-jwt custom token, was fuer QA-Automation akzeptabel ist, aber nicht dem echten Spieler-Login im Browser entspricht.

### Join Flow: Gelb

Der Codezustand ist deutlich besser als zuvor. Tests zeigen:

- User ohne Membership kann lokal joinen und bekommt ein freies Team.
- Doppelte Membership wird nicht erzeugt.
- Parallele Joins bekommen nicht dasselbe Team.
- Volle Liga gibt klare Fehlermeldung.
- Team-only Projektionen werden nicht still repariert.

Aber: Es fehlt ein Staging- oder Browser-Beweis, dass ein neuer realer Firebase Player in einer frischen Liga ueber die UI oder den echten Repository-Firestore-Pfad joined.

### Team Assignment: Gruen

Team Assignment ist fuer den seeded Player live bewiesen. `basel-rhinos-gm` hat eine aktive Membership, `teamId=basel-rhinos`, und die Team-Projektion passt. Repository- und Route-State-Tests decken Konflikte zwischen Membership, Mirror und `team.assignedUserId` ab.

Restrisiko: Der Beleg gilt fuer Seed-Daten und nicht fuer einen frisch ueber UI gejointen Spieler.

### Rejoin: Gelb

Reload ist API-seitig/live bewiesen: Nach Ready bleibt der Spieler im selben Team und `ready=true` bleibt sichtbar. Route-State-Tests pruefen ausserdem Reload und stale Projection Cases.

Nicht bewiesen: Browser-Reload mit Firebase Auth Persistence, Continue Button nach leerem LocalStorage, und Logout/Login-Rejoin.

### Aktiver Draft: Gelb

Die Draft-Domain ist breit getestet: Pick Docs, Available-Player Docs, falsches Team, unavailable Player, Duplicate Picks, Race Conditions und Completed-Finalisierung. Es gibt auch Firebase-Emulator-E2E fuer Draft.

Nicht bewiesen ist ein Staging-Live-Flow, bei dem ein echter nicht-admin Player im aktiven Draft pickt. Der neue Player-Smoke bricht absichtlich ab, wenn `draft.status !== completed`.

### Draft Completed Unlock: Gelb

Das Unlock-Verhalten ist lokal gut abgesichert:

- Active Draft sperrt Core-Links.
- Completed Draft schaltet `Spielablauf`, `Roster`, `Depth Chart` frei.
- Reload nach Draft completed ergibt `readyOpen`.
- Direct URLs fallen auf Dashboard-Anker statt tote Seiten.

Live wurde nur Dashboard HTTP 200 plus completed Draft geprueft. Es fehlt ein Browser-Beweis, dass die Navigation sichtbar und klickbar ist und nicht visuell blockiert bleibt.

### Player Ready Flow: Gruen

Dies ist der staerkste Phase-2-Beleg:

- Nicht-admin Player Token.
- Eigene Membership wird auf `ready=false`, dann `ready=true` gesetzt.
- Fremde Memberships werden vom Script nicht beruehrt.
- Reload zeigt `ready=true`.
- Unit-/Repository-Tests decken Owner-Guard, No-Team, leere Woche, Simulation, completed Week und Reload ab.

Restrisiko: Der Live-Smoke klickt nicht den UI-Button, sondern schreibt ueber Firestore REST mit denselben Rules-Berechtigungen fuer die eigene Membership.

### Player Playability Smoke: Gruen

Der neue Smoke ist vorhanden und live gruen:

- `scripts/staging-player-playability-smoke.ts`
- `npm run staging:smoke:player-playability`

Er ist als Staging-Gate fuer Player Ready/Rejoin sinnvoll, aber nicht als vollstaendiger Multiplayer-Browser-Golden-Path.

## Ausgefuehrte/aktuelle Checks

| Check | Status | Notiz |
| --- | --- | --- |
| `npm run staging:smoke:player-playability -- --help` | Gruen | Script-Dokumentation laeuft. |
| `CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYER_PLAYABILITY_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:player-playability -- --league-id afbm-playability-test` | Gruen | Live Staging Player Ready/Reload. |
| `npx tsc --noEmit` | Gruen | Nach Player-Smoke-Script-Erstellung gelaufen. |
| `npm run lint` | Gruen | Nach Player-Smoke-Script-Erstellung gelaufen. |
| `git diff --check` | Gruen | Keine Whitespace-Fehler. |
| `npx vitest run src/lib/online src/components/online` | Gruen | 376 Tests, vor Report-Erstellung nach Ready-Fix gelaufen. |

## Offene Blocker

### P0

Keine offenen P0-Blocker fuer den seeded completed-draft Ready/Reload-Golden-Path.

### P1

1. **Echter Browser-Login/Rejoin nicht live bewiesen**
   - Warum: Custom Token beweist Firebase Auth, aber nicht Email/Passwort UI, Browser Persistence oder Continue/Rejoin UX.
   - Risiko: Ein echter Spieler kann trotz gruenem API-Smoke in der UI als "nicht verbunden" landen.

2. **First-Time Join auf Staging nicht live bewiesen**
   - Warum: Join ist lokal/Repository getestet, aber nicht gegen Staging mit neuem Player und freiem Team.
   - Risiko: Neue Spieler koennen einer Liga nicht verlaesslich beitreten.

3. **Aktiver Draft mit echtem Player-Pick nicht live bewiesen**
   - Warum: Player-Smoke verlangt Draft completed. Aktiver Draft ist lokal/Emulator getestet, nicht live als Staging Player.
   - Risiko: Draft kann in Staging fuer echte Spieler blockieren, obwohl completed-draft Flow gruen ist.

4. **Completed Draft Unlock nicht browserseitig live bewiesen**
   - Warum: HTTP 200 fuer Dashboard ist kein Nachweis fuer sichtbare/klickbare Core-Menues.
   - Risiko: Spieler sieht weiterhin ausgegraute oder blockierte Navigation.

## Naechste Empfehlungen

1. **Browser Player Login/Rejoin Smoke bauen**
   - Login per `STAGING_PLAYER_EMAIL`/`STAGING_PLAYER_PASSWORD`.
   - Liga oeffnen.
   - Teamname sichtbar pruefen.
   - Reload.
   - Session/Team stabil pruefen.

2. **Staging Join-Smoke mit frischer Testliga bauen**
   - Neue staging-only Liga oder resetbarer Join-Testzustand.
   - Player ohne Membership joined.
   - Freies Team wird atomar zugewiesen.
   - Zweiter paralleler Join bekommt anderes Team oder klare Full-Meldung.

3. **Staging Active-Draft-Smoke bauen**
   - Draft active Seed.
   - Nicht-admin Player ist am Zug.
   - Gueltiger Pick.
   - Falscher User/Pick wird blockiert.
   - Draft completed nach letztem Pick oder klare Fortsetzung.

4. **Browser Unlock-Smoke fuer completed Draft bauen**
   - Nach completed Draft:
     - Dashboard sichtbar.
     - `Spielablauf`, `Roster`, `Depth Chart` klickbar.
     - Direct URLs landen nicht in Coming Soon oder Dead-End.

5. **Player-Smoke als Report-Gate aufnehmen, aber nicht als alleiniges Phase-3-Gate**
   - Required fuer Ready/Reload.
   - Join/Draft/Login brauchen eigene Gates.

## Finale Entscheidung

Multiplayer echter Spielerflow spielbar: **Nein**

Begruendung: Der seeded completed-draft Player-Ready/Reload-Flow ist live gruen, aber der vollstaendige echte Spielerflow umfasst Login, Join, aktiven Draft, Unlock, Ready und Rejoin. Davon sind Login, Join, aktiver Draft und Browser-Unlock noch nicht live genug bewiesen.

Phase 3 freigegeben: **Nein**

Begruendung: Phase 3 sollte erst starten, wenn mindestens diese drei Beweise gruen sind:

1. Browser Player Login/Rejoin Smoke
2. Staging Join-Smoke fuer neuen Player
3. Staging Active-Draft-Smoke fuer echten Player-Pick

Bis dahin ist der Status: **Phase 2 verbessert, aber nicht vollstaendig abgeschlossen.**
