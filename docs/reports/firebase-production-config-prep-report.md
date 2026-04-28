# Firebase Production Config Prep Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Rolle: Firebase Production Setup Engineer und Security Engineer  
Status: **Gruen**

## Executive Summary

Die Production-Firebase-Konfiguration wurde vorbereitet, ohne produktive Datenpfade zu aktivieren.

Prisma bleibt der Default-Datenpfad. `DATA_BACKEND=firestore` ist weiterhin nur fuer den lokalen Emulator mit `demo-*` Projekt-ID erlaubt. Seed-, Reset- und Verify-Scripts bleiben durch Demo-/Emulator-Guards gegen versehentliche Production-Zugriffe abgesichert.

Es wurde keine Migration gestartet, keine Auth-Umstellung vorgenommen und Prisma wurde nicht entfernt.

## Gepruefte Konfiguration

| Datei | Befund | Status |
| --- | --- | --- |
| `firebase.json` | Firestore Emulator ist auf `127.0.0.1:8080` konfiguriert; Rules und Indexes sind referenziert | Gruen |
| `firestore.rules` | Deny-by-default; Client-Writes sind fuer Spiel-/State-Daten verboten | Gruen |
| `firestore.indexes.json` | Indexdefinitionen vorhanden; keine Aktivierung eines Datenpfads | Gruen |
| `src/lib/firebase/client.ts` | Liest `NEXT_PUBLIC_FIREBASE_*`; initialisiert nur die Client-App | Gruen |
| `src/lib/firebase/admin.ts` | Nutzt Emulator ohne Credentials; verlangt ausserhalb des Emulators Admin Credentials | Gruen |
| `src/server/repositories/firestoreGuard.ts` | `DATA_BACKEND=firestore` verlangt Emulator-Host und `demo-*` Projekt-ID | Gruen |

## Geaenderte Dateien

- `.env.example`
  - `DATA_BACKEND="prisma"` als production-sicherer Default dokumentiert.
  - `NEXT_PUBLIC_FIREBASE_*` dokumentiert.
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` dokumentiert.
  - Emulator-Variablen als lokal-only markiert.

- `docs/guides/firebase-production-setup.md`
  - Manuelle Firebase Console Schritte dokumentiert.
  - Production ENV dokumentiert.
  - Nicht zu setzende Production-Werte dokumentiert.
  - Aktivierungs-Gate fuer spaetere Firestore-Production-Nutzung dokumentiert.

## Production ENV

Dokumentierte Production-Werte:

- `DATA_BACKEND="prisma"`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Explizit nicht fuer Production:

- `FIRESTORE_EMULATOR_HOST`
- `FIREBASE_EMULATOR_HOST`
- `DATA_BACKEND="firestore"`

## Emulator/Production Trennung

Die Trennung ist sauber:

- Lokale Emulator-Scripts nutzen `demo-afbm`.
- `firebase.json` bindet den Emulator lokal an `127.0.0.1`.
- Seed/Reset/Verify setzen bzw. verlangen Emulator-Konfiguration.
- Nicht-Demo-Projekt-IDs werden durch die Seed-Guard verweigert.
- Repository-Firestore-Pfade werden nur aktiviert, wenn der Emulator-Guard besteht.

## Production-Schutz

Seed/Reset gegen Production ist nach aktuellem Stand blockiert:

- `scripts/seeds/firestore-seed.ts` setzt `FIREBASE_PROJECT_ID` default auf `demo-afbm`.
- Derselbe Guard verweigert Projekt-IDs ohne `demo-` Prefix.
- `scripts/seeds/firestore-reset.ts` importiert die Seed-Konfiguration und nutzt dieselbe Emulator-Absicherung.
- `scripts/seeds/firestore-verify.ts` nutzt ebenfalls die Seed-/Emulator-Konfiguration.

`DATA_BACKEND=firestore` bleibt in Production blockiert:

- Ohne Emulator-Host wirft `firestoreGuard`.
- Mit Production-Projekt-ID ohne `demo-` Prefix wirft `firestoreGuard`.
- Damit kann ein echtes Production-Projekt nicht versehentlich ueber `DATA_BACKEND=firestore` zum aktiven Datenpfad werden.

## Manuelle Firebase Console Schritte

Dokumentiert in `docs/guides/firebase-production-setup.md`:

1. Firebase Projekt erstellen.
2. Firestore im Native Mode aktivieren.
3. Region bewusst waehlen.
4. Web-App registrieren.
5. Service Account erzeugen.
6. ENV in der Hosting-/Runtime-Umgebung setzen.

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| Production ENV dokumentiert? | Ja |
| Emulator/Production sauber getrennt? | Ja |
| Seed/Reset gegen Production unmoeglich? | Ja, ueber Emulator- und `demo-*` Guards |
| Firestore Production noch nicht aktiv? | Ja |
| Prisma bleibt Default? | Ja, `DATA_BACKEND="prisma"` dokumentiert und Code defaultet auf Prisma |

## Final Decision

**Status: Gruen**

Firebase Production ist konfigurationsseitig vorbereitet. Es wurden keine produktiven Firestore-Datenpfade aktiviert; Prisma bleibt Default und die bestehenden Emulator-/Demo-Guards schuetzen Seed, Reset und `DATA_BACKEND=firestore`.
