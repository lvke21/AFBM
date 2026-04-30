# Firebase Browser E2E Report

Datum: 2026-04-28  
Status: Gruen

## Executive Summary

Der Firestore-Browser-E2E-Blocker ist fuer den lokalen Emulator-Flow geloest. Der Browser startet mit `DATA_BACKEND=firestore`, nutzt den Firestore Emulator auf `127.0.0.1:8080`, oeffnet das Demo-SaveGame und spielt den Week Loop von `PRE_WEEK` bis zur Rueckkehr in Woche 2.

Production bleibt unveraendert No-Go: keine produktive Aktivierung, keine Prisma-Entfernung, keine Auth-Umstellung.

## Getestete Browser-Flows

- Lokaler Test-Auth-Einstieg ueber `/api/e2e/dev-login` mit `E2E_DIRECT_LOGIN=true`
- SaveGame-Einstieg ueber `/app` mit Redirect auf `/app/savegames/league-demo-2026`
- Team Overview: `/app/savegames/league-demo-2026/team`
- Roster: `/app/savegames/league-demo-2026/team/roster`
- Player Detail: `/app/savegames/league-demo-2026/players/team-demo-arrows-qb`
- Season Overview: `/app/savegames/league-demo-2026/seasons/season-demo-2026`
- Match Detail Redirect: `/matches/league-demo-2026_season-demo-2026_w1_m1` -> Game Report
- Week vorbereiten: `PRE_WEEK` -> `READY`
- Match starten: `READY` -> `GAME_RUNNING`
- Live Simulation oeffnen und Match abschliessen
- Match Report pruefen
- Week abschliessen / advance: `POST_GAME` -> Woche 2 `PRE_WEEK`

## Geaenderte Dateien

- `src/server/repositories/saveGameRepository.firestore.ts`
- `src/server/repositories/index.ts`
- `src/server/repositories/types.ts`
- `src/server/repositories/matchRepository.firestore.ts`
- `scripts/seeds/firestore-browser-e2e-fixture.ts`
- `e2e/firebase-browser-flow.spec.ts`
- `package.json`
- `docs/reports/firebase-browser-e2e-report.md`

## E2E-Kommandos

```bash
java -version
npx firebase --version
npm run firebase:reset
npm run firebase:seed
npm run firebase:verify
npm run firebase:e2e:browser-fixture
DATA_BACKEND=firestore FIREBASE_PROJECT_ID=demo-afbm NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-afbm FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 E2E_DEV_LOGIN_ENABLED=true E2E_DIRECT_LOGIN=true E2E_USER_ID=firebase-e2e-owner E2E_USER_EMAIL=firebase-owner@example.test E2E_USER_PASSWORD=e2e-password E2E_PORT=3101 npx playwright test e2e/firebase-browser-flow.spec.ts
npx tsc --noEmit
npm run lint
```

## Testergebnisse

- `java -version`: Gruen, OpenJDK `21.0.11`
- `npx firebase --version`: Version `15.15.0` ermittelt; CLI beendet wegen lokalem configstore-Update-Check mit Exit 2. Kein Firebase-Produktionszugriff.
- Firestore Emulator: Gruen, `demo-afbm`, `127.0.0.1:8080`
- `npm run firebase:reset`: Gruen
- `npm run firebase:seed`: Gruen, erwartete Counts geschrieben
- `npm run firebase:verify`: Gruen, Counts und Fixture-IDs OK
- `npm run firebase:e2e:browser-fixture`: Gruen, Woche 1 browser-testbar vorbereitet
- Firestore Browser-E2E: Gruen, `1 passed`
- Bestehender Prisma-E2E: nicht veraendert, in diesem Lauf nicht separat ausgefuehrt
- `npx tsc --noEmit`: Gruen
- `npm run lint`: Gruen

## Gefundene Fehler

- Browser-Einstieg war nicht Firestore-faehig, weil `saveGames` im Repository-Switch trotz `DATA_BACKEND=firestore` auf Prisma blieb. Behoben durch `saveGameRepositoryFirestore`.
- Match Preview konnte Firestore-Matches nur mit Snapshot-Minimaldaten darstellen; Manager-Team, Ratings, Morale und Schemes fehlten im Match-Detail. Behoben durch Team-Dokument-Read im Firestore-Match-Repository.
- Der Standard-Firestore-Seed hat mehrere offene Matches in Woche 1. Fuer einen echten Browser-Week-Loop wurde eine reine Emulator-Fixture ergaenzt, die Nebenmatches vorab abschliesst und ein spielbares Manager-Match in `PRE_WEEK` bereitstellt.

## Bewusst Nicht Getestet

- Echter legacy session system Login ohne E2E-Bypass
- Production-Firebase-Credentials oder produktiver Firestore
- Clientseitige Firestore Rules im Browser
- Gameplan-/MatchPreparation-Update-Formular
- Team-Management-Mutationen wie Depth-Chart speichern, Release, Contracts oder Trades
- Mehrbenutzer-/fremde-Liga-Browserflows
- Kosten-, Monitoring- und Rollback-Verhalten in Preview/Production

## Risiken

- `matchPreparation` und `teamManagement` sind fuer nicht getestete Mutationspfade weiterhin Prisma-basiert.
- Der Browser-E2E nutzt einen lokalen Test-Auth-Bypass. Das klaert den SaveGame-Einstieg fuer Emulator-E2E, ersetzt aber keine spaetere Auth-Entscheidung.
- Die Browser-Fixture ist absichtlich test-spezifisch und darf nicht als produktives Scheduling-Modell missverstanden werden.

## Empfehlung

Naechster Schritt: Firestore-Browser-E2E auf Preview/Staging vorbereiten, aber ohne Go-Live. Vor Production-Freigabe muessen Auth-/SaveGame-Strategie, nicht getestete Mutationspfade und Monitoring/Kosten-Gates separat entschieden werden.

## Statuspruefung

- Browser-Flow laeuft mit Firestore Emulator: Ja
- Auth/SaveGame-Einstieg geklaert: Ja, lokal ueber E2E-Bypass plus Firestore-SaveGame-Repository
- Week Loop im Browser getestet: Ja
- Kein Production-Zugriff: Ja, nur `demo-afbm` und Emulator
- Kein ungewollter Prisma-Fallback: Ja fuer getestete Browser-Reads und Week-Loop-Actions; nicht getestete Mutationspfade bleiben als Risiko markiert
- Tests gruen: Ja

Status: Gruen
