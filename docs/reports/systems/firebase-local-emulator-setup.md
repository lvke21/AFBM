# Firebase Local Emulator Setup

Datum: 2026-04-26

Scope: Lokale Runtime-Pruefung fuer den Firestore Emulator. Keine Migration, keine Firestore-Repositories, keine produktiven Firebase-Zugriffe, keine Prisma- oder Auth-Aenderungen.

## Status

Status: Gruen

Grund: OpenJDK 21 ist ueber Homebrew installiert und im PATH verfuegbar, der Firestore Emulator startet erfolgreich auf `127.0.0.1:8080`, Seed/Reset/Verify laufen gegen den echten Emulator, und die Firebase-Smoke-/Seed-Tests sind gruen.

## Gepruefte Voraussetzungen

Java:

```bash
java -version
```

Ergebnis:

```text
openjdk version "21.0.11" 2026-04-21
OpenJDK Runtime Environment Homebrew (build 21.0.11)
OpenJDK 64-Bit Server VM Homebrew (build 21.0.11, mixed mode, sharing)
```

Java Home:

```bash
/usr/libexec/java_home -V
```

Ergebnis:

```text
Unable to locate a Java Runtime.
```

Bewertung: nicht blockierend. Der sudo-pflichtige Systemlink unter `/Library/Java/JavaVirtualMachines` wurde nicht gesetzt, aber `java` ist ueber `/opt/homebrew/bin/java` verfuegbar und der Firestore Emulator nutzt diese Runtime erfolgreich.

Firebase CLI:

```bash
npx firebase --version
```

Ergebnis:

```text
15.15.0
```

Hinweis: Im Sandbox-Kontext scheitert der Firebase-CLI-Update-Check zusaetzlich am Configstore-Schreibzugriff unter `~/.config`. Das ist nicht der Emulator-Startblocker; der Firestore Emulator stoppt vorher wegen fehlendem Java.

`firebase.json`:

- Firestore Emulator: `127.0.0.1:8080`
- Emulator UI: `127.0.0.1:4000`
- Rules: `firestore.rules`
- Indexes: `firestore.indexes.json`

Port `8080`:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
```

Ergebnis: kein Listener, Port ist frei.

Package Scripts:

- `npm run firebase:emulators`
- `npm run firebase:seed`
- `npm run firebase:reset`
- `npm run firebase:rules:test`
- `npm run test:firebase`

## Emulator-Start

```bash
npm run firebase:emulators
```

Ergebnis:

```text
Parsed Java major version: 21
Firestore Emulator was started in standard edition.
View Emulator UI at http://127.0.0.1:4000/
Firestore 127.0.0.1:8080
```

## Benoetigte Java-Version

Empfohlen: Java JDK 21 LTS.

Begruendung:

- Die Firebase Local Emulator Suite dokumentiert JDK 11 oder hoeher als Mindestanforderung.
- Die Firestore-Emulator-Dokumentation weist darauf hin, dass der Firestore Emulator auf Java 21 umgestellt wird.
- Java 21 LTS verhindert, dass die lokale Runtime kurz nach dem Setup erneut veraltet.

## macOS Installation

Option A, Temurin 21:

```bash
brew install --cask temurin@21
```

Option B, Homebrew OpenJDK 21:

```bash
brew install openjdk@21
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

Danach Terminal neu starten oder Shell aktualisieren und pruefen:

```bash
java -version
/usr/libexec/java_home -V
```

Erwartet:

```text
openjdk version "21..."
```

## Ausgefuehrter Gruen-Check

Ausgefuehrt:

- `npm run firebase:emulators`: Gruen.
- `npm run firebase:reset`: Gruen, initial 0 Dokumente geloescht.
- `npm run firebase:seed`: Gruen.
- `npm run firebase:verify`: Gruen.
- `npm run firebase:reset`: Gruen, Seed-Daten geloescht.
- `npm run firebase:verify -- --expect=empty`: Gruen.
- `npm run test:firebase`: Gruen, 3 Testdateien / 10 Tests.
- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.

Seed-Struktur nach `npm run firebase:seed`:

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

Nach finalem Reset sind alle Seed-Collections wieder bei 0 Dokumenten.

## Lokale Befehle

Terminal 1:

```bash
npm run firebase:emulators
```

Terminal 2:

```bash
npm run firebase:reset
npm run firebase:seed
npm run firebase:verify
npm run test:firebase
```

## Production-Schutz

- Seed/Reset setzen `FIREBASE_PROJECT_ID=demo-afbm`.
- Seed/Reset setzen `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.
- Projekt-IDs ohne `demo-` Prefix werden blockiert.
- Keine Service-Account-Credentials werden fuer Seed/Reset benoetigt.
- Ohne laufenden Emulator brechen Seed/Reset mit Timeout gegen `127.0.0.1:8080` ab.

## Statuspruefung

- Ist Java/Emulator lokal lauffaehig? Gruen. `java` zeigt OpenJDK 21.0.11 und der Firestore Emulator startet.
- Funktionieren Seed und Reset gegen den echten Emulator? Gruen.
- Sind Production-Zugriffe weiterhin ausgeschlossen? Gruen.
- Sind Tests gruen? Gruen.
- Ist Prompt 5 jetzt wirklich Gruen? Ja, Status Gruen.

## Referenzen

- Firebase Local Emulator Suite: https://firebase.google.com/docs/emulator-suite/install_and_configure
- Firestore Emulator Verbindung/Java-21-Hinweis: https://firebase.google.com/docs/emulator-suite/connect_firestore
- Google Cloud Firestore Emulator Java-21-Hinweis: https://docs.cloud.google.com/firestore/native/docs/emulator
