# Firebase Passive Setup Report

Datum: 2026-04-26

Ziel: Firebase technisch passiv vorbereiten, ohne bestehende App-Funktionalitaet auf Firebase umzustellen.

## Ergebnis

Status: Gruen mit dokumentierter Emulator-Einschraenkung

Firebase ist passiv vorbereitet. Prisma bleibt der einzige aktive Backend-Pfad. Es wurden keine Firestore-Repositories gebaut, keine Prisma-Dateien geloescht, keine Auth-Umstellung vorgenommen und keine produktiven Datenpfade auf Firebase umgestellt. `DATA_BACKEND=firestore` bleibt weiterhin nicht aktivierbar und wird durch den Repository-Provider-Test abgesichert.

## Geaenderte Dateien

Neu:
- `src/lib/firebase/client.ts`
- `src/lib/firebase/admin.ts`
- `src/lib/firebase/admin.test.ts`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `docs/reports/systems/firebase-passive-setup-report.md`

Aktualisiert:
- `package.json`
- `package-lock.json`
- `.env.example`
- `.gitignore`

## Installierte Pakete

Dependencies:
- `firebase@12.12.1`
- `firebase-admin@13.8.0`

Dev Dependencies:
- `firebase-tools@15.15.0`

Hinweise aus der Installation:
- `npm install` meldete Audit-Hinweise: 20 Vulnerabilities nach Installation.
- `firebase-tools` meldete unter Node `v25.9.0` einen Engine-Warnhinweis fuer `superstatic`, das Node 20/22/24 erwartet. Das Projekt selbst verlangt Node `>=20.19.0`.

## Neue ENV Variablen

Client SDK:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Admin SDK:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Emulator:
- `FIRESTORE_EMULATOR_HOST`
- `FIREBASE_EMULATOR_HOST`

Wichtig:
- `FIRESTORE_EMULATOR_HOST` ist die relevante Variable fuer das Firestore Admin SDK.
- `FIREBASE_PRIVATE_KEY` darf escaped Newlines enthalten; `src/lib/firebase/admin.ts` normalisiert `\\n` zu echten Zeilenumbruechen.
- Ausserhalb des Emulators verlangt das Admin-Modul `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` und `FIREBASE_PRIVATE_KEY`.

## Firebase Initialisierung

Client:
- `src/lib/firebase/client.ts`
- initialisiert die Firebase Web App nur bei explizitem Import.
- prueft die `NEXT_PUBLIC_FIREBASE_*` Variablen.
- wird aktuell von keinem produktiven UI-Datenpfad importiert.

Admin:
- `src/lib/firebase/admin.ts`
- initialisiert Firebase Admin nur einmal ueber `getApps()`.
- akzeptiert im Emulator-Modus eine reine Projekt-ID ohne Production Credentials.
- wirft klare Fehler bei fehlender Konfiguration.
- ist serverseitig zu verwenden und wird aktuell nur im Smoke-Test genutzt.

## Emulator-Startbefehle

Package Scripts:
- `npm run firebase:emulators`
  - startet den Firestore Emulator fuer Projekt `demo-afbm`.
- `npm run firebase:emulators:export`
  - exportiert Emulator-Daten nach `./firebase-emulator-data`.
- `npm run firebase:rules:test`
  - fuehrt `npm run test:firebase` innerhalb des Firestore Emulators aus.
- `npm run test:firebase`
  - fuehrt passive Firebase/Admin- und Repository-Provider-Smoke-Tests aus.

Manuelle Nutzung:

```bash
npm run firebase:emulators
```

In einem zweiten Terminal:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:firebase
```

Hinweis:
- Der Firestore Emulator benoetigt eine lokal installierte Java Runtime.

## Security Rules Grundlogik

`firestore.rules` ist konservativ:
- `reference/{document=**}`: read nur fuer angemeldete Nutzer, write verboten.
- `users/{userId}/{document=**}`: read nur fuer den eigenen User, write verboten.
- alle anderen Pfade: read/write verboten.

Damit sind kritische Client-Writes blockiert:
- Game State
- Match State
- Simulationsergebnisse
- Stats
- Season Progress
- Finance
- Player Development
- Draft true values

Die Rules sind bewusst noch kein finales Produktmodell. Sie sind deny-by-default und enthalten nur den minimalen passiven Rahmen fuer spaetere Emulator-/Rules-Tests.

## Bewusst Noch Nicht Aktiv

Nicht aktiv:
- keine Firestore-Repositories
- keine produktiven Firestore Reads/Writes
- kein Firebase Auth
- keine Auth-Umstellung
- keine Firestore Seeds
- keine Firestore Reset-Skripte
- keine Firestore Migration
- kein `DATA_BACKEND=firestore`

Weiterhin aktiv:
- Prisma
- bestehende Auth.js/Prisma-Auth-Struktur
- bestehende Server Actions, Services, Game Engine Persistenz und Seeds

## Testergebnisse

Erfolgreich:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:firebase`
  - 2 Test Files, 5 Tests bestanden.
- `npx vitest run src/lib/firebase/admin.test.ts src/server/repositories/index.test.ts src/modules/seasons/application/match-query.service.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 4 Test Files, 14 Tests bestanden.
- `npx vitest run src/modules/seasons/application/match-query.service.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 2 Test Files, 9 Tests bestanden.

Admin Smoke Test:
- fehlende Admin-Konfiguration liefert klare Fehlermeldung.
- escaped Private Keys werden normalisiert.
- Emulator-only Initialisierung mit `FIRESTORE_EMULATOR_HOST` initialisiert genau eine Admin App ohne Production Credentials.

Emulator-Konfiguration:
- `firebase.json`, `firestore.rules` und `firestore.indexes.json` sind vorhanden.
- `npx firebase --version` gibt `15.15.0` aus, beendet aber in dieser Umgebung mit Code 2 wegen fehlender Schreibrechte fuer den globalen Firebase CLI Update-Check unter `~/.config`.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase"` konnte den Emulator nicht starten, weil lokal keine Java Runtime gefunden wurde.
- Zusaetzlich war der Remote Config/MOTD Fetch wegen Netzwerk/DNS nicht erreichbar; laut CLI ist das nicht fatal, Java fehlt aber fatal.

Nicht erneut ausgefuehrt:
- Vollstaendige Unit-Suite und E2E-Suite. Die vorherige Repository-Abstraktionsrunde dokumentierte bereits bestehende gameplay-lastige Unit-Test-Timeouts und eine fehlende lokale PostgreSQL-Verbindung fuer E2E. Dieser Slice hat keine produktiven Prisma- oder Game-Engine-Pfade veraendert.

## Statuspruefung

App laeuft weiterhin mit Prisma?

Status: Gruen. Der Repository-Provider bleibt bei `prisma`; `DATA_BACKEND=firestore` wird weiterhin abgelehnt.

Kein produktiver Firebase-Datenpfad aktiv?

Status: Gruen. Firebase-Module werden von keinem produktiven Datenpfad importiert. Es gibt keine Firestore-Repositories und keine Datenpfad-Umschaltung.

Firebase passiv vorbereitet?

Status: Gruen. Client/Admin-Initialisierung, ENV-Dokumentation, Rules, Indexes und Scripts sind vorhanden.

Emulator-Konfiguration vorhanden?

Status: Gruen mit lokaler Einschraenkung. Konfiguration und Scripts sind vorhanden; Start ist in dieser Umgebung wegen fehlender Java Runtime blockiert.

Tests gruen oder Einschraenkungen klar dokumentiert?

Status: Gruen. Typecheck, Lint, `test:firebase` und relevante bestehende Tests sind gruen. Emulator-Start-Einschraenkungen sind dokumentiert.

## Naechste Empfehlung

Naechster sicherer Schritt:
- Java Runtime lokal bereitstellen und `npm run firebase:rules:test` erneut ausfuehren.
- Danach Rules-Tests fuer deny-by-default, eigene User-Reads und verbotene kritische Writes ergaenzen.
- Erst danach kleine Firestore-Seed-Anforderungen oder Inbox-Repository-Slice angehen.
