# AP 3 - Firestore Query- und Readmodel-Optimierung

Datum: 2026-04-26

Status: Gruen

## Ziel

Firestore-Read-Pfade fuer Team-, Player- und Readmodel-Abfragen minimal-invasiv optimieren: weniger N+1-Nachladepfade, klarere League-Scopes und keine produktive Migration.

## Umsetzung

Aktualisiert:

- `src/server/repositories/teamRepository.firestore.ts`
- `src/server/repositories/playerRepository.firestore.ts`
- `src/server/repositories/firestoreTeamsPlayers.test.ts`

## Was umgesetzt wurde

- `teamRepositoryFirestore.listByLeague` laedt Teams, Spieler und Season-TeamStats jetzt gesammelt:
  - Teams bleiben per `leagueId` gescoped.
  - Spieler werden einmal fuer die League geladen und nach Team gruppiert.
  - TeamStats werden einmal fuer `leagueId` und `scope=SEASON` geladen und nach Team gruppiert.
  - Der fruehere per-Team-Detail-Reload ueber `findBySaveGame` entfaellt.
- `playerRepositoryFirestore.findByTeam` laedt Team-Roster-Details jetzt ohne per-Player-Nachladen:
  - Spieler-Query ist direkt mit `leagueId` und `roster.teamId` gescoped.
  - League, Team, aktuelle Season und Season-PlayerStats werden gebuendelt geladen.
  - PlayerStats werden nach `playerId` gruppiert und beim Mapping wiederverwendet.
- Tests sichern ab:
  - `findByTeam` liefert weiterhin 8 Spieler inklusive SeasonStats.
  - `listByLeague` liefert 8 Teams in stabiler Sortierung mit je 8 Roster-Profilen.

## Bewusste Grenzen

- Keine Aenderungen an Game Engine, Week Flow oder Firestore-Parity-Logik.
- Keine neue produktive Firestore-Migration.
- Keine globalen Repository-Refactorings.
- Match-Week-Detailpfade bleiben unveraendert; sie sind ein moeglicher spaeterer Optimierungspunkt.

## Tests

Gruen:

- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:repositories"`
  - 1 Testdatei / 10 Tests
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:readmodels"`
  - 1 Testdatei / 3 Tests
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:season-week-match"`
  - 1 Testdatei / 8 Tests
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase"`
  - 3 Testdateien / 13 Tests
- `npx tsc --noEmit`
- `npm run lint`

## Nachpruefung 2026-04-26

Erneut ausgefuehrt und gruen:

- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:repositories"`
  - 1 Testdatei / 10 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:season-week-match"`
  - 1 Testdatei / 8 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:readmodels"`
  - 1 Testdatei / 3 Tests.
- `npx tsc --noEmit`
- `npm run lint`

Hinweis: Ein parallel gestarteter Readmodel-/Season-Match-Testlauf wurde wegen belegtem Firestore-Emulator-Port `8080` abgebrochen. Der Test wurde danach seriell wiederholt und ist gruen.

## Akzeptanzkriterien

- Teamlisten vermeiden den bekannten per-Team-Nachladepfad: Gruen.
- Roster-Reads sind mit `leagueId` und `teamId` gescoped: Gruen.
- Readmodel-, Team/Player- und Season/Match-Tests sind gruen: Gruen.
- Keine fachlichen Regressionen in den bestehenden Firestore-Testpfaden: Gruen.

Status: Gruen.
