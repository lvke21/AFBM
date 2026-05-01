# Multiplayer League Teams Seed Report

Datum: 2026-05-01

## Geaenderte Dateien

- `scripts/seeds/multiplayer-test-league-firestore-seed.ts`
- `scripts/seeds/multiplayer-test-league-firestore-seed.test.ts`
- `package.json`
- `docs/reports/multiplayer-league-teams-seed-report.md`

## Erstellte Liga

- Name: AFBM Multiplayer Test League
- Firestore-ID: `afbm-multiplayer-test-league`
- Slug: `afbm-multiplayer-test-league`
- Season: 1
- Week: 1
- Firestore-Status: `lobby`
- Foundation-/Draft-Status: `settings.foundationStatus = "draft_ready"`
- Member Count: 0
- Max Teams: 8
- Spieler: keine
- Draft-Ausfuehrung: keine

Hinweis: Das bestehende Firestore-Online-Modell kennt `lobby`, `active`, `completed`
und `archived`, aber kein eigenes `draft_ready`. Deshalb bleibt der kompatible
League-Status `lobby`; der vorbereitete Draft-Zustand wird explizit in den
Settings abgelegt.

## Erstellte Teams

| ID | City | Name | Kuerzel | Roster | Draft |
| --- | --- | --- | --- | --- | --- |
| `zurich-guardians` | Zurich | Guardians | ZUR | leer | ready |
| `basel-rhinos` | Basel | Rhinos | BAS | leer | ready |
| `geneva-falcons` | Geneva | Falcons | GEN | leer | ready |
| `bern-wolves` | Bern | Wolves | BER | leer | ready |
| `lausanne-lions` | Lausanne | Lions | LAU | leer | ready |
| `winterthur-titans` | Winterthur | Titans | WIN | leer | ready |
| `st-gallen-bears` | St. Gallen | Bears | STG | leer | ready |
| `lucerne-hawks` | Lucerne | Hawks | LUC | leer | ready |

## Verwendete Commands

- `npx vitest run scripts/seeds/multiplayer-test-league-firestore-seed.test.ts`
- `npx tsc --noEmit`
- `npm run seed:multiplayer:league`

## Testergebnisse

- `npx vitest run scripts/seeds/multiplayer-test-league-firestore-seed.test.ts`: gruen, 5 Tests bestanden.
- `npx tsc --noEmit`: gruen.
- `npm run seed:multiplayer:league`: rot in dieser Umgebung, weil kein Firestore-Emulator unter `127.0.0.1:8080` erreichbar war. Das Script brach nach dem konfigurierten 10s-Timeout ab und schrieb nicht gegen Produktion.

## Offene Risiken

- Der Seed schreibt bewusst nur in Demo-/Emulator-Projekte und nutzt keine Cloud-Produktionsfreigabe.
- Das Script loescht keine vorhandenen Daten. Falls jemand manuell weitere Teams unter derselben Foundation-Liga anlegt, werden diese nicht entfernt.
- Der echte Firestore-Schreibpfad muss mit laufendem Emulator erneut ausgefuehrt werden.
