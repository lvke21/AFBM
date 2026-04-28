# AP 1 - Gemeinsame Prisma-/Firestore-Parity-Fixtures

Datum: 2026-04-26

Status: Gruen

## Ziel

Eine gemeinsame fachliche Fixture-Basis fuer Prisma-E2E-Seed und Firestore-Emulator-Seed schaffen, ohne produktive Migration, Auth-Umstellung oder Prisma-Entfernung.

## Implementierung

Neu:

- `scripts/seeds/parity-fixture.ts`

Aktualisiert:

- `scripts/seeds/firestore-seed.ts`
- `scripts/seeds/firestore-verify.ts`
- `scripts/seeds/firestore-seed.test.ts`
- `e2e/fixtures/minimal-e2e-context.ts`

## Was umgesetzt wurde

- Gemeinsame Fixture-Konstanten fuer Prisma-E2E und Firestore-Emulator eingefuehrt.
- Firestore-Seed nutzt jetzt zentrale IDs, Team-Templates, Position-Templates und erwartete Counts aus `scripts/seeds/parity-fixture.ts`.
- Prisma-E2E-Kontext nutzt jetzt zentrale Prisma-Parity-IDs aus derselben Fixture-Datei.
- Ein explizites Mapping zwischen Prisma-Minimal-Fixture und Firestore-8-Team-Fixture wurde definiert.
- Firestore-Verify prueft jetzt neben Collection Counts auch wichtige Fixture-Dokument-IDs:
  - User
  - League
  - Season
  - Teams
  - Weeks
  - Matches
  - QB-Spieler pro Team
- Seed-Unit-Tests pruefen nun Counts, League Scope, erlaubte Collections und stabile Parity-ID-Schluessel.

## Bewusste minimal-invasive Entscheidung

Die Firestore-Fixture bleibt eine vollstaendige 8-Team-Emulator-Fixture. Die Prisma-E2E-Fixture bleibt eine kleine Browser-/E2E-Fixture mit 2 Teams. Eine 1:1-Umbenennung aller IDs wurde bewusst nicht gemacht, weil sie viele bestehende Firestore-Tests und E2E-Flows ohne fachlichen Zusatznutzen brechen wuerde.

Stattdessen gibt es jetzt ein dokumentiertes Mapping:

- Prisma Manager Team `e2e-team-bos` entspricht Firestore `team-demo-arrows`.
- Prisma Opponent Team `e2e-team-nyt` entspricht Firestore `team-demo-bison`.
- Prisma Upcoming Match `e2e-match-week-1` entspricht Firestore `league-demo-2026_season-demo-2026_w1_m1`.
- Prisma Next Week Match `e2e-match-week-2` entspricht Firestore `league-demo-2026_season-demo-2026_w2_m1`.

## Tests

Gruen:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:firebase`
  - 3 Testdateien / 13 Tests
- `npm run firebase:reset`
  - gegen laufenden Firestore Emulator
- `npm run firebase:seed`
  - erzeugt 1 User, 1 League, 8 Teams, 64 Spieler, 1 Season, 7 Weeks, 28 Matches, 64 PlayerStats, 8 TeamStats, 1 Report
- `npm run firebase:verify`
  - Counts korrekt
  - Firestore parity fixture IDs: OK
- `npm run test:firebase:parity`
  - 1 Testdatei / 3 Tests

Blockiert durch lokale Infrastruktur:

- `npm run test:e2e:seed`
  - ausserhalb der Sandbox ausgefuehrt
  - Ergebnis: PostgreSQL nicht erreichbar unter `localhost:5432`
  - Codepfad startet korrekt, bricht aber vor DB-Schreibzugriff mit vorhandener Preflight-Meldung ab

Sandbox-Hinweis:

- `tsx`-basierte Scripts scheitern innerhalb der Sandbox am IPC-Socket.
- Die betroffenen Checks wurden ausserhalb der Sandbox erneut ausgefuehrt.

## Risiken

- Die Prisma- und Firestore-Fixtures sind weiterhin nicht identisch gross: Prisma bleibt minimal, Firestore bleibt vollstaendig.
- Echte Backend-gegen-Backend-Parity braucht AP 2 mit lauffaehigem PostgreSQL und finaler Parity-Matrix.
- Das Mapping ist ausreichend fuer den naechsten Schritt, aber noch kein vollstaendiger Browser-E2E-Firestore-Einstieg.

## Akzeptanzkriterien

- Gemeinsame Fixture-Basis vorhanden: Gruen.
- Firestore-Seed nutzt stabile zentrale IDs: Gruen.
- Prisma-E2E-Kontext nutzt zentrale IDs: Gruen.
- Prisma-vs-Firestore-Mapping dokumentiert: Gruen.
- Verify prueft Counts und IDs: Gruen.
- Keine produktiven Firebase-Zugriffe: Gruen.
- Prisma-E2E-Seed laeuft lokal vollstaendig: Rot wegen fehlender PostgreSQL-Instanz, als Infrastrukturblocker dokumentiert.

## Empfehlung fuer AP 2

AP 2 sollte den PostgreSQL-/E2E-Preflight verbessern und die Parity-Matrix auf Basis von `scripts/seeds/parity-fixture.ts` explizit machen. Erst danach kann der Gesamt-Parity-Status belastbar auf Gruen gehen.

Status: Gruen.
