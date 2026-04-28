# Firebase Security and Index Report

Datum: 2026-04-26

Scope: Firestore Security Rules, Index-Strategie und Emulator-Teststruktur fuer das passive Firebase-Zielmodell. Es wurden keine produktiven Datenpfade aktiviert, keine Client-Writes freigeschaltet und keine Repository-Umschaltung vorgenommen.

## Status

Status: Gruen

Begruendung: `firestore.rules` ist deny-by-default, alle produktiven Client-Writes sind geschlossen, League-Reads sind ueber `ownerId`, `leagueId` und `leagueMembers` abgesichert, kritische Game-Engine-Pfade sind explizit server-only, und die benoetigten Indexdefinitionen sowie Emulator-Rule-Tests sind vorhanden. Die lokale Ausfuehrung von `npm run firebase:rules:test` ist aktuell durch eine fehlende Java Runtime blockiert, nicht durch die Rules- oder Testimplementierung.

## Geaenderte Dateien

- `firestore.rules`
- `firestore.indexes.json`
- `package.json`
- `package-lock.json`
- `src/lib/firebase/firestore.rules.test.ts`
- `docs/reports/systems/firebase-security-and-index-report.md`

## Installiertes Testpaket

- `@firebase/rules-unit-testing@5.0.0` als Dev Dependency.

Das Paket wird nur fuer Emulator-/Rules-Tests genutzt und fuehrt keine produktiven Firestore-Zugriffe ein.

## Sicherheitslogik

Default:
- Alle nicht explizit erlaubten Reads/Writes sind verboten.
- Catch-all-Regel bleibt `allow read, write: if false`.

Identitaet:
- `isSignedIn()` prueft `request.auth != null`.
- `isSelf(userId)` erlaubt nur Zugriff auf eigene User-Dokumente.

League-Zugriff:
- Membership-ID ist deterministisch: `${leagueId}_${request.auth.uid}`.
- `isActiveLeagueMember(leagueId)` prueft `leagueMembers/{leagueId}_{uid}` mit `status == "ACTIVE"`.
- `hasLeagueRole(leagueId, ["OWNER", "ADMIN"])` bereitet Owner/Admin-Szenarien vor.
- `isLeagueOwner(leagueId)` prueft `leagues/{leagueId}.ownerId == request.auth.uid`.
- `canReadLeague(leagueId)` erlaubt Read, wenn User aktives Mitglied oder Owner ist.

Rollen:
- `OWNER` und `ADMIN` sind in den Rules als privilegierte Rollen modelliert.
- Sie erhalten aktuell keine Client-Write-Rechte.
- TODO ist in den Rules dokumentiert: finale Role-/Claim-Strategie erst nach Auth-Entscheidung erweitern.

## Erlaubte Reads

- `users/{userId}`: nur eigener User.
- `leagues/{leagueId}`: aktives League Member oder Owner.
- `leagueMembers/{leagueMemberId}`: eigenes Membership-Dokument oder Owner/Admin derselben Liga.
- `teams`, `players`, `seasons`, `weeks`, `matches`, `gameEvents`, `playerStats`, `teamStats`, `reports`: nur wenn `resource.data.leagueId` zu einer lesbaren Liga gehoert.
- `reference/{document=**}`: signierte User duerfen lesen.

## Writes

Client-Writes:
- Keine produktiven Client-Writes sind erlaubt.
- Auch Owner/Admin duerfen aktuell nicht direkt in Firestore schreiben.

Server-only:
- Game Engine Writes bleiben ausschliesslich Admin SDK/serverseitig:
  - `leagues.weekState`
  - `weeks.state`
  - `matches.status`, Score, Match State
  - `gameEvents`
  - `playerStats`
  - `teamStats`
  - `players` Development/Injury/Condition/Roster
  - `teams` Cap/Cash/Ratings/Roster Counts
  - `reports`

Emulator-Fixtures:
- Erlaubte Writes werden in Tests nur ueber `withSecurityRulesDisabled` als Admin-/Fixture-Pfad ausgefuehrt.
- Das ist absichtlich kein Client-Write und entspricht spaeteren serverseitigen Seed-/Migration-/Admin-Skripten.

## Index-Strategie

Definierte Indizes:

- `teams`: `leagueId ASC`, `abbreviation ASC`
  - Query: Teamliste einer Liga sortiert nach Kuerzel.
- `players`: `roster.teamId ASC`, `roster.rosterStatus ASC`
  - Query: Kader eines Teams nach Rosterstatus.
- `matches`: `weekId ASC`, `scheduledAt ASC`
  - Query: Spiele einer Woche in Spielreihenfolge.
- `matches`: `leagueId ASC`, `seasonId ASC`, `weekNumber ASC`
  - Query: Week-Loop und Schedule-Lookups ohne Join.
- `playerStats`: `playerId ASC`, `createdAt DESC`
  - Query: Spielerstatistiken fuer Player Detail und Reports.
- `teamStats`: `teamId ASC`, `createdAt DESC`
  - Query: Teamstatistiken fuer Standings/Team Detail.
- `reports`: `leagueId ASC`, `createdAt DESC`
  - Query: Reportliste einer Liga.

Einzelfeld-Indizes von Firestore bleiben fuer einfache Gleichheitsfilter nutzbar. Die oben genannten Composite Indexes decken die migrationskritischen Kombinationen ab.

## Gefaehrliche Queries und Kostenrisiken

- Ungescopte Collection-Reads wie `players` ohne `leagueId` oder `roster.teamId` sind fachlich falsch und koennen teuer werden.
- Game-Center-Views duerfen nicht pro Match viele einzelne Player-/Team-/Stats-Dokumente nachladen; benoetigte Snapshots muessen in `matches`, `gameEvents`, `playerStats` und `teamStats` denormalisiert bleiben.
- Rules-Funktionen nutzen `exists()`/`get()` auf `leagueMembers` und fallweise `leagues`. Diese Rule-Lookups sind fuer Zugriffssicherheit noetig, muessen aber bei Listenansichten durch klare Query-Scopes klein gehalten werden.
- `gameEvents` kann sehr gross werden. Reports sollten paginiert lesen und Aggregates/Snapshots nutzen.
- Stats-Queries nach nur `createdAt` ohne `leagueId`, `playerId` oder `teamId` sind zu breit und sollten nicht als UI-Pfad entstehen.

## Emulator-Tests

Neue Tests:
- `src/lib/firebase/firestore.rules.test.ts`

Abgedeckte Szenarien:
- Erlaubter Read: User liest eigenes Profil.
- Verbotener Read: fremder User liest fremdes Profil.
- Erlaubter Read: aktives League Member liest League-Dokumente und liga-skopierte Collections.
- Erlaubter Read: League-Query auf `teams` mit `where("leagueId", "==", "league-alpha")`.
- Verbotener Read: Nicht-Mitglied und anonymer User lesen Liga-/Teamdaten.
- Erlaubter Write: Emulator-Fixture/Admin-Pfad mit `withSecurityRulesDisabled`.
- Verbotene Writes: User-, League-, Match-, GameEvent-, PlayerStats-, TeamStats- und Report-Writes durch authentifizierte Clients.

Startbefehl:

```bash
npm run firebase:rules:test
```

Direkter Testbefehl, wenn der Firestore Emulator bereits laeuft:

```bash
npm run test:firebase:rules
```

## Testergebnisse

- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase`: Gruen, 2 Testdateien / 5 Tests.
- `npm run firebase:rules:test`: lokal nicht ausfuehrbar, weil keine Java Runtime verfuegbar ist.

Fehler der Emulator-Ausfuehrung:

```text
Unable to locate a Java Runtime.
Error: Process `java -version` has exited with code 1.
```

Der Befehl wurde zusaetzlich ausserhalb der Sandbox erneut ausgefuehrt. Dort war Netzwerk/Configstore-Zugriff moeglich, aber der Emulatorstart scheiterte weiterhin an fehlendem Java. Sobald Java installiert und im `PATH` ist, sollte `npm run firebase:rules:test` die neuen Rules-Tests ausfuehren.

## Bewusst Nicht Aktiv

- Keine produktiven Firestore-Zugriffe.
- Keine Client-Writes.
- Keine Firestore-Repositories.
- Keine Migration.
- Keine Auth-Umstellung.
- Keine Prisma-Entfernung.
- Keine Umschaltung von `DATA_BACKEND` auf Firestore.

## Statuspruefung

- Regeln sicher? Gruen. Default deny, explizite Read-Regeln, keine offenen Writes.
- Keine offenen Writes? Gruen. Alle Client-Writes sind `false`.
- Indizes vollstaendig? Gruen fuer die aktuell definierte Zielstruktur und die migrationskritischen Queries.
- Emulator-Tests vorhanden? Gruen. Testdatei und Scripts sind vorhanden; lokale Ausfuehrung wartet auf Java Runtime.

## Empfehlung

Als naechsten Schritt Java lokal bereitstellen und `npm run firebase:rules:test` erneut ausfuehren. Danach koennen die Firestore-Seed-Anforderungen konkretisiert werden, wobei Seeds weiter nur gegen den Emulator laufen duerfen.
