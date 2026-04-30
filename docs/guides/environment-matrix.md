# Environment Matrix

Status: verbindliche Runtime-Matrix nach Entfernung von removed session and provider login.

## Grundregeln

- Online-Multiplayer nutzt Firebase Anonymous Auth im Browser.
- Admin nutzt ausschliesslich serverseitigen Code-Login mit HttpOnly-Session-Cookie.
- legacy session system/legacy session library ist kein Runtime-Bestandteil mehr.
- `OLD_SESSION_URL`, `NEXTOLD_SESSION_URL`, `OLD_SESSION_KEY`, `OLD_GH_PROVIDER_ID`, `OLD_GH_PROVIDER_KEY`, `OLD_GH_APP_ID`, `OLD_GH_APP_KEY` und `OLD_PUBLIC_LOGIN_FLAG` sind Legacy-Variablen und duerfen in Staging/Production nicht gesetzt werden.
- `NEXT_PUBLIC_*` darf keine Secrets enthalten. Diese Werte sind im Browser sichtbar und nur fuer Firebase-Web-App-IDs, Backend-Modus und nicht geheime Client-Konfiguration gedacht.
- Server-Secrets bleiben serverseitig: `AFBM_ADMIN_ACCESS_CODE`, `AFBM_ADMIN_SESSION_SECRET`. `DATABASE_URL` ist nur fuer den Prisma-Legacy-Pfad noetig, nicht fuer `DATA_BACKEND=firestore`. Explizite Firebase-Admin-Credentials (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) sind nur fuer manuelle Non-App-Hosting-Runtimes/Tools noetig und muessen paarweise gesetzt werden.
- `ADMIN_ACCESS_CODE` ist nur ein Legacy-Alias und ausserhalb lokaler Entwicklung verboten. Verwende `AFBM_ADMIN_ACCESS_CODE`.
- Emulator-, Preview- und Seed-Flags sind ausserhalb lokaler Entwicklung verboten.
- Production startet nicht, wenn kritische Secrets fehlen oder Demo-/Emulator-Konfiguration aktiv ist.

## Matrix

| Variable | Local | Staging | Production |
| --- | --- | --- | --- |
| `AFBM_DEPLOY_ENV` | `local` | `staging` | `production` |
| `NEXT_PUBLIC_AFBM_DEPLOY_ENV` | `local` | `staging` | `production` |
| `DATABASE_URL` | lokales Postgres fuer Prisma | nicht gesetzt bei `DATA_BACKEND=firestore` | Secret Store nur bei `DATA_BACKEND=prisma` |
| `AFBM_APP_USER_ID` | lokale Savegame-Owner-ID, z. B. `local-gm` | optional feste Staging-App-ID | optional feste Production-App-ID |
| `AFBM_ADMIN_ACCESS_CODE` | optional | Secret Store | Secret Store |
| `AFBM_ADMIN_SESSION_SECRET` | optional, darf lokal fehlen | Secret Store, getrennt vom Access Code | Secret Store, getrennt vom Access Code |
| `ADMIN_ACCESS_CODE` | Legacy lokal moeglich | verboten | verboten |
| `DATA_BACKEND` | `prisma` oder Emulator-`firestore` | `firestore` nur mit Staging-Projekt/Secrets | `prisma`; `firestore` nur mit explizitem `AFBM_ENABLE_PRODUCTION_FIRESTORE=true` |
| `AFBM_ONLINE_BACKEND` | `local` oder `firebase` | `firebase` | `firebase` |
| `NEXT_PUBLIC_AFBM_ONLINE_BACKEND` | `local` oder `firebase` | `firebase` | `firebase` |
| `NEXT_PUBLIC_FIREBASE_*` | Demo-/Emulator-Werte erlaubt | Staging Web App Config | Production Web App Config |
| `FIREBASE_PROJECT_ID` | `demo-*` fuer Emulator | Staging Projekt | Production Projekt, nicht `demo-*` |
| `FIREBASE_CLIENT_EMAIL` | leer bei Emulator | leer in App Hosting; optional fuer manuelle Admin-Credentials | leer in App Hosting; optional fuer manuelle Admin-Credentials |
| `FIREBASE_PRIVATE_KEY` | leer bei Emulator | leer in App Hosting; optional fuer manuelle Admin-Credentials | leer in App Hosting; optional fuer manuelle Admin-Credentials |
| `FIRESTORE_EMULATOR_HOST` / `FIREBASE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` | erlaubt | verboten | verboten |
| `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` / `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | erlaubt | verboten | verboten |
| `FIRESTORE_PREVIEW_*` | erlaubt fuer lokale Preview-Tools | nicht in App Runtime | verboten |
| `FIRESTORE_CLOUD_SEED_*` | nur manuelle Tools | nicht in App Runtime | verboten |
| `OLD_SESSION_URL` / `NEXTOLD_SESSION_URL` / `OLD_SESSION_KEY` | nicht verwenden | verboten | verboten |
| `OLD_GH_PROVIDER_ID` / `OLD_GH_PROVIDER_KEY` | nicht verwenden | verboten | verboten |
| `OLD_GH_APP_ID` / `OLD_GH_APP_KEY` | nicht verwenden | verboten | verboten |
| `OLD_PUBLIC_LOGIN_FLAG` | nicht verwenden | verboten | verboten |

## Startup Validation

`next.config.ts` ruft `assertRuntimeEnvironment()` beim Next-Startup auf.

Staging-/Production-Fehler stoppen Build/Start unter anderem bei:

- fehlendem `AFBM_ADMIN_ACCESS_CODE` oder `AFBM_ADMIN_SESSION_SECRET`
- fehlendem `DATABASE_URL`, wenn `DATA_BACKEND` nicht `firestore` ist
- `AFBM_ADMIN_SESSION_SECRET === AFBM_ADMIN_ACCESS_CODE`
- gesetztem `ADMIN_ACCESS_CODE`
- gesetzten removed session and provider login-Legacy-Variablen
- gesetzten Emulator-Hosts
- aktivierten Preview-/Seed-Flags
- `NEXT_PUBLIC_AFBM_ONLINE_BACKEND=local`
- fehlender Firebase-Web-App-Konfiguration in Production
- `demo-*` Firebase-Projekt-IDs in Production
- `DATA_BACKEND=firestore` ohne explizites Production-Freigabeflag

## Firebase App Hosting

Staging nutzt `apphosting.yaml` mit Secret-Referenzen fuer Server-Secrets. Production soll eine eigene App-Hosting-Konfiguration oder einen eigenen Backend-Branch mit denselben Regeln nutzen:

- `AFBM_DEPLOY_ENV=production`
- keine `LEGACY_LOGIN_*`, `NEXTLEGACY_LOGIN_*`, `GITHUB_*` oder `OLD_PUBLIC_LOGIN_FLAG` Variablen
- keine Emulator- oder Preview-Variablen
- Secret Manager fuer alle serverseitigen Secrets
- Production-Web-App-Konfiguration nur ueber `NEXT_PUBLIC_FIREBASE_*`
- kein Seed/Reset/Debug-Command als Runtime- oder Build-Step

## Sicherheitscheck

Nach Konfigurationsaenderungen ausfuehren:

```bash
npx tsc --noEmit
npm run lint
npm test -- --run src/lib/env/runtime-env.test.ts src/lib/admin/admin-session.test.ts
```

Quellscan fuer alte removed session and provider login-Konfiguration:

```bash
rg -n "OLD_SESSION_URL|NEXTOLD_SESSION_URL|OLD_SESSION_KEY|OLD_GH_PROVIDER_ID|OLD_GH_PROVIDER_KEY|OLD_GH_APP_ID|OLD_GH_APP_KEY|OLD_PUBLIC_LOGIN_FLAG|legacy session library|Auth\\.js|external provider auth|GitHub external provider" .env* apphosting.yaml firebase.json next.config.ts playwright.config.ts src docs/guides
```

Treffer duerfen nur noch historische Erklaerungen oder diese Matrix betreffen, nicht produktive Runtime-Konfiguration.
