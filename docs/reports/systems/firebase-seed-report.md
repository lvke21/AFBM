# Firebase Seed Report

Datum: 2026-04-26

Scope: Lokale Firestore-Emulator-Testdaten fuer die passive Firebase-Migration. Es wurden keine produktiven Firebase-Zugriffe, keine Migration, keine Repository-Umschaltung und keine Prisma-Entfernung vorgenommen.

## Status

Status: Gruen

Begruendung: Java 21 ist lokal verfuegbar, der Firestore Emulator startet auf `127.0.0.1:8080`, Seed und Reset laufen erfolgreich gegen den echten Emulator, die erwarteten Dokumentzahlen wurden per Script verifiziert, und `npm run test:firebase` ist gruen. Production-Zugriffe bleiben ausgeschlossen.

## Geaenderte Dateien

- `scripts/seeds/firestore-seed.ts`
- `scripts/seeds/firestore-reset.ts`
- `scripts/seeds/firestore-verify.ts`
- `scripts/seeds/firestore-seed.test.ts`
- `package.json`
- `docs/reports/systems/firebase-seed-report.md`
- `docs/reports/systems/firebase-local-emulator-setup.md`

## Package Scripts

- `npm run firebase:emulators`
  - startet den Firestore Emulator fuer Projekt `demo-afbm`.
- `npm run firebase:seed`
  - fuehrt `tsx scripts/seeds/firestore-seed.ts` aus.
- `npm run firebase:reset`
  - fuehrt `tsx scripts/seeds/firestore-reset.ts` aus.
- `npm run firebase:verify`
  - prueft die erwarteten Emulator-Dokumentzahlen; mit `-- --expect=empty` prueft es leere Collections nach Reset.
- `npm run test:firebase`
  - enthaelt jetzt auch die Seed-Strukturtests.

## Production-Schutz

Die Scripts setzen sichere Defaults und pruefen:

- `FIREBASE_PROJECT_ID=demo-afbm`
- `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`

Schutzregeln:

- Seed/Reset setzen ohne vorhandene Konfiguration automatisch den lokalen Emulator-Host `127.0.0.1:8080`.
- Seed/Reset nutzen dadurch auch bei fehlender ENV-Konfiguration keinen Production-Endpunkt.
- Seed/Reset verweigern Projekt-IDs, die nicht mit `demo-` beginnen.
- Es werden keine Service-Account-Credentials benoetigt.
- Der Admin SDK Pfad bleibt emulator-only, solange `FIRESTORE_EMULATOR_HOST` gesetzt ist.
- Emulator-Operationen haben einen Timeout von 10 Sekunden, damit ein fehlender Emulator nicht haengen bleibt.

## Erzeugte Testdaten

Stabile Demo-IDs:

- User: `firebase-e2e-owner`
- Liga: `league-demo-2026`
- Season: `season-demo-2026`
- Weeks: `league-demo-2026_season-demo-2026_w1` bis `w7`

Dokumentanzahl:

- `users`: 1
- `leagues`: 1
- `leagueMembers`: 1
- `teams`: 8
- `players`: 64
- `seasons`: 1
- `weeks`: 7
- `matches`: 28
- `gameEvents`: 0
- `playerStats`: 64
- `teamStats`: 8
- `reports`: 1

Teams:

- Austin Arrows, `AUS`
- Boston Bison, `BOS`
- Chicago Comets, `CHI`
- Denver Dragons, `DEN`
- El Paso Eagles, `ELP`
- Fresno Falcons, `FRE`
- Georgia Guardians, `GEO`
- Houston Hawks, `HOU`

Spieler:

- 8 Spieler pro Team.
- Positionen: `QB`, `RB`, `WR`, `TE`, `OT`, `EDGE`, `LB`, `CB`.
- Jeder Spieler enthaelt `leagueId`, `roster.teamId`, `roster.teamSnapshot`, `evaluation`, `attributes`, `injury`, `condition` und stabile IDs.

Matches:

- 7 Wochen.
- 4 Matches pro Woche.
- Alle Matches haben `leagueId`, `seasonId`, `weekId`, `weekNumber`, `homeTeamSnapshot`, `awayTeamSnapshot`, `scheduledAt` und `status: "SCHEDULED"`.

Stats:

- `playerStats`: eine Season-Stat-Zeile pro Spieler.
- `teamStats`: eine Season-Stat-Zeile pro Team.

## Reset-Verhalten

`scripts/seeds/firestore-reset.ts` loescht nur die definierten Emulator-Collections:

- `users`
- `leagues`
- `leagueMembers`
- `teams`
- `players`
- `seasons`
- `weeks`
- `matches`
- `gameEvents`
- `playerStats`
- `teamStats`
- `reports`

Es werden keine unbekannten Collections geloescht. Der gleiche Production-Schutz wie beim Seed gilt auch beim Reset.

## Lokale Startanleitung

Voraussetzung:

- Java JDK 21 LTS installieren und im `PATH` verfuegbar machen.
- Hintergrund: Die Firebase Emulator Suite dokumentiert JDK 11+ als Mindestanforderung; der Firestore Emulator wird laut Firebase/Google-Doku auf Java 21 umgestellt. Deshalb ist Java 21 LTS die empfohlene lokale Version.

macOS Installationsoptionen:

```bash
brew install --cask temurin@21
```

oder:

```bash
brew install openjdk@21
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

Pruefen:

```bash
java -version
/usr/libexec/java_home -V
```

Terminal 1:

```bash
npm run firebase:emulators
```

Terminal 2:

```bash
npm run firebase:reset
npm run firebase:seed
```

Optionaler Strukturtest ohne Emulator:

```bash
npm run test:firebase
```

## Finaler Emulator-Lauf

Java:

```text
openjdk version "21.0.11" 2026-04-21
OpenJDK Runtime Environment Homebrew (build 21.0.11)
OpenJDK 64-Bit Server VM Homebrew (build 21.0.11, mixed mode, sharing)
```

Hinweis: `/usr/libexec/java_home -V` findet das JDK weiterhin nicht, weil der sudo-pflichtige macOS-Systemlink nicht gesetzt wurde. Das ist fuer den Emulator nicht blockierend, da `java` ueber `/opt/homebrew/bin/java` im PATH verfuegbar ist.

Emulator:

```text
Firestore Emulator was started in standard edition.
View Emulator UI at http://127.0.0.1:4000/
Firestore 127.0.0.1:8080
```

Seed:

```text
Seeded Firestore emulator collections:
- users: 1
- leagues: 1
- leagueMembers: 1
- teams: 8
- players: 64
- seasons: 1
- weeks: 7
- matches: 28
- gameEvents: 0
- playerStats: 64
- teamStats: 8
- reports: 1
```

Verify nach Seed:

```text
- users: 1 / expected 1
- leagues: 1 / expected 1
- leagueMembers: 1 / expected 1
- teams: 8 / expected 8
- players: 64 / expected 64
- seasons: 1 / expected 1
- weeks: 7 / expected 7
- matches: 28 / expected 28
- gameEvents: 0 / expected 0
- playerStats: 64 / expected 64
- teamStats: 8 / expected 8
- reports: 1 / expected 1
```

Reset nach Seed:

```text
- users: deleted 1
- leagues: deleted 1
- leagueMembers: deleted 1
- teams: deleted 8
- players: deleted 64
- seasons: deleted 1
- weeks: deleted 7
- matches: deleted 28
- gameEvents: deleted 0
- playerStats: deleted 64
- teamStats: deleted 8
- reports: deleted 1
```

Verify nach Reset:

```text
- users: 0 / expected 0
- leagues: 0 / expected 0
- leagueMembers: 0 / expected 0
- teams: 0 / expected 0
- players: 0 / expected 0
- seasons: 0 / expected 0
- weeks: 0 / expected 0
- matches: 0 / expected 0
- gameEvents: 0 / expected 0
- playerStats: 0 / expected 0
- teamStats: 0 / expected 0
- reports: 0 / expected 0
```

## Testergebnisse

- `java -version`: Gruen, OpenJDK 21.0.11.
- `/usr/libexec/java_home -V`: Rot, nicht blockierend; Homebrew JDK ist nicht in `/Library/Java/JavaVirtualMachines` verlinkt.
- `npx firebase --version`: liefert `15.15.0`; im Sandbox-Kontext zusaetzlich Configstore-EPERM beim Update-Check.
- `firebase.json`: Gruen, Firestore Emulator auf `127.0.0.1:8080`, UI auf `127.0.0.1:4000`.
- Port `8080`: Gruen, kein Listener gefunden.
- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase`: Gruen, 3 Testdateien / 10 Tests.
- `npm run firebase:emulators`: Gruen.
- `npm run firebase:reset`: Gruen.
- `npm run firebase:seed`: Gruen.
- `npm run firebase:verify`: Gruen.
- `npm run firebase:verify -- --expect=empty`: Gruen nach Reset.

Firebase CLI im Sandbox-Kontext:

```text
firebase-tools update check failed
EPERM: operation not permitted, open '/Users/lukashanzi/.config/configstore/firebase-tools.json...'
```

Das ist ein Sandbox-/Configstore-Nebeneffekt. Der harte Startblocker fuer den Firestore Emulator ist Java.

## E2E-Vorbereitung

Es wurden noch keine E2E-Flows auf Firestore umgestellt. Die Seed-Daten verwenden aber stabile IDs und die finalen Collections, damit spaetere Week-Loop-/Dashboard-Fixtures gezielt auf `league-demo-2026`, `season-demo-2026` und deterministische `weekId`-/`matchId`-Werte zeigen koennen.

## Statuspruefung

- Emulator laeuft? Gruen. Firestore Emulator startet auf `127.0.0.1:8080`.
- Seed funktioniert? Gruen. Erwartete Dokumentzahlen wurden gegen den echten Emulator verifiziert.
- Reset funktioniert? Gruen. Alle Seed-Collections wurden auf 0 Dokumente zurueckgesetzt.
- Struktur korrekt? Gruen. Strukturtests pruefen Collections, Dokumentanzahlen und `leagueId`-Bindung.
- Kein Risiko fuer Production? Gruen. Demo-Projekt, Emulator-Host und Timeout-Guard sind aktiv; keine echten Firebase-Credentials werden benoetigt.
- Tests gruen? Gruen. Typecheck, Lint und `test:firebase` sind gruen.
- Prompt 5 jetzt wirklich Gruen? Gruen.

## Empfehlung

Vor der naechsten Firestore-Migrationsarbeit bei Bedarf erneut seeden:

```bash
npm run firebase:emulators
npm run firebase:reset
npm run firebase:seed
npm run firebase:verify
```

Der letzte verifizierte Zustand nach dieser QA-Runde ist leer, weil der geforderte zweite Reset erfolgreich ausgefuehrt wurde. Fuer lokale E2E-/Repository-Arbeit zuerst `npm run firebase:seed` ausfuehren.

Referenzen:

- Firebase Local Emulator Suite: https://firebase.google.com/docs/emulator-suite/install_and_configure
- Firestore Emulator Verbindung/Java-21-Hinweis: https://firebase.google.com/docs/emulator-suite/connect_firestore
- Google Cloud Firestore Emulator Java-21-Hinweis: https://docs.cloud.google.com/firestore/native/docs/emulator
