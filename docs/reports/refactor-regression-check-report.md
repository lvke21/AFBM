# Refactor Regression Check Report

Stand: 2026-05-01

## Gesamtbewertung

Status: **Rot**

Empfehlung: **Merge nein**, solange der Firebase-Multiplayer-Join-E2E rot bleibt. Lint, Typecheck, Build, Unit-/Vitest-Suite, Firestore Rules und Firestore-Parity sind gruen. Die Browser-E2E-Flows zeigen aber relevante Regressionen bzw. Testvertragsbrueche in Online Hub, Join/Load und Smoke-Navigation.

## Ausgefuehrte Checks

| Check | Ergebnis | Bewertung |
| --- | --- | --- |
| `npm run lint` | erfolgreich | Gruen |
| `npx tsc --noEmit` | erfolgreich | Gruen |
| `npm run build` | erfolgreich | Gruen |
| `npm run test:run` | 154 Test Files, 912 Tests passed | Gruen |
| `npm run test:firebase:parity` | 3 Tests passed | Gruen |
| `npm run test:firebase:rules` | 18 Tests passed | Gruen |
| `npm run test:e2e:seed` | fehlgeschlagen: Prisma `P2002`, Unique Constraint `SaveGame.id` | Rot |
| `npm run test:e2e` | fehlgeschlagen: Smoke-Test Locator `AFBM Manager` ist nicht eindeutig | Gelb/Rot |
| `npm run test:e2e:multiplayer` | fehlgeschlagen: Online Hub zeigt wegen fehlender Firebase Env nicht erwartete Ansicht | Gelb/Rot |
| `npm run test:e2e:multiplayer:firebase` | fehlgeschlagen: Join endet mit Permission-Fehler | Rot |

Hinweis zur Umgebung: Firebase-Emulator-Checks mussten ausserhalb der Sandbox laufen, weil lokale Emulator-Ports in der Sandbox mit `EPERM` blockiert wurden. Ausserhalb der Sandbox liefen Firestore Rules und Parity gruen.

## Getestete Bereiche

| Bereich | Abdeckung durch Checks | Ergebnis |
| --- | --- | --- |
| Singleplayer Flow | Vitest: Savegames, Week Flow, Match Engine, Simulation, Navigation Models; Build | keine Regression in automatischen Tests gefunden |
| Multiplayer Join/Load | Vitest teilweise gruen; Firebase Browser-E2E rot | Regression gefunden |
| Team-Zuweisung | Vitest Online/Fantasy Draft/Repository gruen; Firebase E2E blockiert vor erfolgreichem Join | nicht vollstaendig bestaetigt |
| Draft Flow | Vitest Fantasy Draft und Draft-Service gruen | keine Regression in Unit-/Service-Tests gefunden |
| Week Flow | Vitest Online Week Simulation, Admin Week Simulation, Singleplayer Week Flow gruen | keine Regression in Unit-/Service-Tests gefunden |
| Admin Simulation | Admin API Route Tests, Online Admin Actions, Online Week Simulation gruen; Build gruen | keine Regression in automatischen Service-/API-Tests gefunden |
| Ergebnisanzeige | Build und relevante Model-Tests gruen | keine Regression in automatischen Tests gefunden |
| Firebase/Auth/Firestore Sync | Rules und Parity gruen; Firebase Multiplayer E2E rot | kritische Luecke im Browser-Join/Security-Rules-Pfad |
| Lokale Saves | Savegame-Tests gruen; E2E Seed nicht idempotent | Risiko offen |
| GUI Navigation | Navigation Model Tests gruen; Playwright Smoke rot | Browser-Verhalten/Testvertrag nicht gruen |

## Bestandene Checks

### Lint

`npm run lint` lief erfolgreich ohne gemeldete Fehler.

### Typecheck

`npx tsc --noEmit` lief erfolgreich.

### Production Build

`npm run build` lief erfolgreich. Relevante Build-Routen wurden erzeugt, u. a.:

- `/app/savegames`
- `/online`
- `/online/league/[leagueId]`
- `/online/league/[leagueId]/draft`
- `/admin`
- `/admin/league/[leagueId]`

### Vitest Full Suite

`npm run test:run` lief erfolgreich:

- 154 Test Files passed
- 912 Tests passed

Abgedeckte wichtige Flaechen:

- Singleplayer Simulation und Week Flow
- Savegame Command/Snapshot/Week Actions
- Online League Service
- Fantasy Draft und Draft Service
- Admin Online Actions
- Admin API Route
- Online Week Simulation
- Firebase/Admin Guard Tests
- Navigation Model Tests

### Firebase Parity

`npm run test:firebase:parity` lief nach Sandbox-Eskalation erfolgreich:

- 1 Test File passed
- 3 Tests passed

### Firestore Rules

`npm run test:firebase:rules` lief nach Sandbox-Eskalation erfolgreich:

- 1 Test File passed
- 18 Tests passed

Wichtig: Dieser gruen laufende Rules-Test deckt den im Firebase-Multiplayer-E2E gefundenen Join-Fehler offenbar nicht ausreichend ab.

## Gefundene Regressionen

### R1: Firebase Multiplayer Join endet mit Permission-Fehler

Schweregrad: **kritisch**

Command:

```bash
npm run test:e2e:multiplayer:firebase
```

Fehler:

- Test: `Firebase Multiplayer E2E > two independent users join, sync ready state, persist reloads and block cross-user writes`
- Erwartet: Nach `Beitreten` wird die Liga geladen und die Heading `Was jetzt tun?` sichtbar.
- Tatsächlich: Die Seite bleibt im Online Hub / Liga suchen Bereich.
- Sichtbare Meldung: `Du hast fuer diese Online-Liga oder Aktion keine Berechtigung. Gehe zurueck zum Online Hub und lade die Liga erneut.`

Zusatzsignal aus Firestore Emulator:

- `PERMISSION_DENIED`
- Rules-Auswertung bei `firestore.rules` Zeile 445-448 / Fallback Zeile 508
- `Null value error` bei `resource.data.userId == request.auth.uid` im `leagueMembers/{leagueMemberId}` Read-Pfad

Betroffene Flaechen:

- Multiplayer Join/Load
- Team-Zuweisung
- leagueMembers Mirror
- Firestore Security Rules
- Firebase/Auth/Firestore Sync
- Reload/Rejoin kann nicht verlaesslich bestaetigt werden

Einordnung:

Das ist kein reiner Copy-Testbruch. Die UI zeigt einen echten Permission-Fehler, bevor der Spieler in die Liga kommt. Damit ist der wichtigste Multiplayer-Browserpfad nach Refactorings nicht releasefaehig.

Empfohlene naechste Pruefung:

- Join-Write gegen `leagues/{leagueId}/memberships/{uid}` und `leagueMembers/{leagueId_uid}` im Browser-E2E nachstellen.
- Rules-Funktion fuer `leagueMembers` null-safe machen bzw. Testdaten/Mirror-Create-Flow korrigieren.
- Einen Rules-Test ergaenzen, der exakt den E2E-Join mit neuem User und leerem Mirror prueft.

### R2: Prisma E2E Seed ist nicht idempotent

Schweregrad: **hoch**

Command:

```bash
npm run test:e2e:seed
```

Fehler:

- `PrismaClientKnownRequestError`
- Code: `P2002`
- `Unique constraint failed on the fields: (id)`
- Ort: `scripts/seeds/e2e-seed.ts`, `prisma.saveGame.create()`

Einordnung:

Der Seed erreicht die lokale DB, scheitert aber bei wiederholter Ausfuehrung an bereits vorhandenen Fixtures. Das blockiert reproduzierbare E2E-Laeufe ohne vorherigen Reset. Es ist nicht zwingend eine Produktfunktion-Regression, aber ein QA-/Delivery-Risiko.

Empfohlene naechste Pruefung:

- E2E Seed idempotent machen oder dokumentierten Reset erzwingen.
- Vor `create` gezielt Fixture-IDs bereinigen oder `upsert` verwenden, sofern fachlich sicher.

### R3: Smoke-E2E bricht wegen uneindeutigem Startseiten-Text

Schweregrad: **mittel**

Command:

```bash
npm run test:e2e
```

Fehler:

- Test erwartet `page.getByText("AFBM Manager")`.
- Locator ist nicht eindeutig, weil zwei Elemente matchen:
  - Link `AFBM Manager`
  - Text `AFBM Manager Hub`

Einordnung:

Das sieht eher nach veraltetem/zu breitem Test-Selektor als nach kaputter Produktfunktion aus. Trotzdem blockiert der Smoke-E2E aktuell und verhindert einen sauberen Release-Nachweis.

Empfohlene naechste Pruefung:

- Test auf eindeutigen Role-basierten Locator umstellen, z. B. Link oder Heading.
- Falls der neue Hub-Text unbeabsichtigt konkurriert, UX-Copy pruefen.

### R4: Local Multiplayer Smoke startet in Firebase-Env-Fehler

Schweregrad: **mittel bis hoch**

Command:

```bash
npm run test:e2e:multiplayer
```

Fehler:

- Erwartet: Heading `Online Liga`.
- Tatsächlich: Seite zeigt `Lokaler Testmodus`, `Firebase Login ist lokal deaktiviert.` und `Missing required Firebase client environment variable: NEXT_PUBLIC_FIREBASE_API_KEY`.

Einordnung:

Der lokale Multiplayer-Smoke ist nicht mehr mit der aktuellen Env-Konfiguration kompatibel. Das kann ein reiner Test-Setup-Bruch sein, aber fuer Entwickler wirkt der Online-Hub ohne Firebase-Env aktuell nicht wie der erwartete lokale Multiplayer-Testmodus.

Empfohlene naechste Pruefung:

- Klaeren, ob `test:e2e:multiplayer` bewusst Firebase Env benoetigen soll.
- Entweder Playwright Env setzen oder Test auf den neuen lokalen Auth-/Firebase-Gate-State anpassen.
- Keine Produktlogik abschwaechen, nur Test-/Env-Vertrag sauber definieren.

## Offene Risiken

1. **Multiplayer Join/Load ist browserseitig rot.** Unit-Tests sind gruen, aber der echte Firebase-E2E-Join zeigt Permission-Fehler.
2. **Firestore Rules Coverage hat eine Luecke.** Rules-Tests laufen gruen, obwohl der Join-Pfad im Browser eine Rules-Null-Auswertung triggert.
3. **E2E Seed ist nicht reproduzierbar.** Wiederholte Seed-Ausfuehrung scheitert an vorhandener SaveGame-ID.
4. **Playwright Smoke ist instabil gegen Copy-/UI-Aenderungen.** Der Startseiten-Test nutzt einen zu breiten Text-Locator.
5. **Lokaler Online-Hub-Testvertrag ist unklar.** Ohne Firebase Client Env erscheint ein anderer Zustand als vom Test erwartet.
6. **Staging nicht direkt geprueft.** Die Checks liefen lokal gegen Build, Prisma-DB und Emulatoren, nicht gegen Firebase App Hosting Staging.
7. **Visuelle Detailflows nicht vollstaendig durchlaufen.** Wegen frueher E2E-Abbrueche wurden nachgelagerte Browserpfade wie Reload, Ready-State-Sync, Cross-User-Write-Block und Draft UI nicht erreicht.

## Bereichsbewertung

| Bereich | Status | Begründung |
| --- | --- | --- |
| Singleplayer Flow | Gruen | Unit-/Service-Tests und Build gruen |
| Multiplayer Join/Load | Rot | Firebase Browser-E2E zeigt Permission-Fehler nach Join |
| Team-Zuweisung | Gelb/Rot | Service-Tests gruen, Browser-Join erreicht Zielzustand nicht |
| Draft Flow | Gruen/Gelb | Service-Tests gruen, Browser-Draft-E2E nicht erneut ausgefuehrt wegen Join-Blocker |
| Week Flow | Gruen | Unit-/Service-/Admin-Tests gruen |
| Admin Simulation | Gruen | Admin Actions/API/Week Simulation Tests gruen |
| Ergebnisanzeige | Gruen/Gelb | Model-/Build-Checks gruen, keine vollstaendige Browser-QA in diesem Lauf |
| Firebase/Auth/Firestore Sync | Rot | Firestore Rules/Parity gruen, aber Browser-Join erzeugt Permission-Fehler |
| Lokale Saves | Gelb | Tests gruen, E2E Seed nicht idempotent |
| GUI Navigation | Gelb/Rot | Navigation Model gruen, Playwright Smoke rot |

## Merge-Empfehlung

**Merge: Nein.**

Begründung:

- Der wichtigste Multiplayer-Firebase-Join-Pfad ist im Browser rot.
- Der Fehler ist user-visible und entspricht dem bekannten kritischen Symptom `keine Berechtigung`.
- Die gruenen Unit-/Rules-Tests reichen nicht aus, um diesen Pfad abzusichern.
- E2E-Seed und Smoke-Tests sind zusaetzlich nicht releasefaehig sauber.

## Empfohlene Reihenfolge

1. **Firebase Join Permission fixen**: `leagueMembers`/Membership-Create und Rules null-safe pruefen.
2. **Rules-Test fuer neuen User Join ergaenzen**: exakt den E2E-Fehlerfall abdecken.
3. **Firebase Multiplayer E2E erneut ausfuehren**: Join, Sync, Reload, Cross-User-Write.
4. **E2E Seed idempotent machen oder Reset-Pfad erzwingen**.
5. **Smoke- und Multiplayer-Smoke-Tests an aktuelle UX/Env anpassen**.
6. **Danach kompletten Release-Check wiederholen**: Lint, Typecheck, Build, Vitest, Firebase Rules, Firebase Parity, Playwright Smoke, Firebase Multiplayer E2E.

## Schlussstatus

Status: **Rot**

Das Projekt baut und die automatisierten Unit-/Service-Tests sind stark gruen. Fuer einen Merge nach Refactorings ist das aber noch nicht ausreichend, weil der browsernahe Firebase-Multiplayer-Join aktuell sichtbar blockiert.
