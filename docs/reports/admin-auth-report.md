# Admin Auth Report

## Ergebnis

Der separate Admin-Passwort-Flow wurde entfernt. Admin-Zugriff basiert jetzt auf
Firebase Auth Custom Claims (`admin: true`) und wird bei Admin-Aktionen serverseitig
gegen das Firebase ID Token geprüft.

## Geänderte Dateien

- `scripts/set-admin.js`
- `package.json`
- `firestore.rules`
- `src/lib/firebase/admin.ts`
- `src/lib/admin/admin-claims.ts`
- `src/lib/admin/admin-action-guard.ts`
- `src/lib/admin/admin-api-client.ts`
- `src/components/admin/admin-auth-gate.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/league/[leagueId]/page.tsx`
- `src/app/api/admin/online/actions/route.ts`
- `src/app/api/admin/online/actions/route.test.ts`
- `src/lib/env/runtime-env.ts`
- `src/lib/env/runtime-env.test.ts`
- Entfernt: alte Admin-Login-Seite
- Entfernt: alte Admin-Login-API-Route
- Entfernt: alte Admin-Login-Tests
- Entfernt: alte Cookie-Session-Logik

## Admin-Claim Setzen

Direkt:

```bash
node scripts/set-admin.js --project afbm-staging KFy5PrqAzzP7vRbfP4wIDamzbh43
```

Oder per npm Script:

```bash
GOOGLE_CLOUD_PROJECT=afbm-staging npm run firebase:set-admin -- --project afbm-staging KFy5PrqAzzP7vRbfP4wIDamzbh43
```

Das Script nutzt Firebase Admin SDK mit Application Default Credentials und setzt
`admin: true`, ohne bestehende Custom Claims zu entfernen. Nach dem Schreiben liest es
den User erneut und bestätigt `customClaims.admin === true`.

Falls lokale ADC am Quota-Projekt oder an Identity Toolkit scheitern:

```bash
gcloud config set project afbm-staging
gcloud auth application-default revoke
gcloud auth application-default login
gcloud auth application-default set-quota-project afbm-staging
gcloud services enable identitytoolkit.googleapis.com --project afbm-staging
```

Service-Account-Alternative:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/pfad/zum/service-account.json node scripts/set-admin.js --project afbm-staging KFy5PrqAzzP7vRbfP4wIDamzbh43
```

## Token Refresh

Nach dem Setzen eines Custom Claims sieht ein bereits eingeloggter Browser den Claim
erst nach einem ID-Token-Refresh. Der neue Admin-Gate ruft beim Öffnen der Adminseite
`getIdTokenResult(true)` auf. Ein Logout/Login funktioniert ebenfalls.

## Schutzmodell

- Kanonische Admin-Wahrheit: Firebase Auth Custom Claim `admin: true`.
- UI: `/admin` und `/admin/league/[leagueId]` rendern Admin-Inhalte nur, wenn
  `getAdminAuthDecision(...)` den aktuellen Firebase-User über den Custom Claim als
  Admin bewertet. Eine UID-Allowlist erzeugt nur einen Bootstrap-Hinweis und keinen
  Adminzugang.
- API: Admin-Aktionen akzeptieren nur `Authorization: Bearer <Firebase ID Token>` und
  verifizieren den Token serverseitig mit Firebase Admin SDK. Ohne `admin: true` wird
  der Request mit `ADMIN_FORBIDDEN` blockiert, auch wenn die UID in der Bootstrap-
  Allowlist steht.
- Firestore Rules: `request.auth.token.admin == true` gilt als globaler Admin und darf
  Admin-Pfade sowie Online-Admin-Rechte nutzen. UID-Allowlists werden in Rules nicht
  akzeptiert.
- Entfernt: altes Formular, alte Login-Route und altes Cookie-Modell.

## Behobene Abweichung

Vor dieser Haertung waren UI/API und Rules nicht gleich: UI/API akzeptierten Custom
Claim oder UID-Allowlist, globale Firestore-Admin-Dokumente aber nur den Custom Claim.
Das konnte einem allowlisted User Adminzugang suggerieren, obwohl direkte Rules-Pfade
blockieren. Jetzt blockieren UI, API und Rules konsistent ohne `admin: true`; die
UID-Allowlist bleibt nur ein Signal, dass fuer diesen User ein Claim gesetzt werden
sollte.

## Aktuelle Wahrheit

- Kanonischer Admin-Nachweis: Firebase Auth Custom Claim `admin: true`.
- Bootstrap-Hinweis: `src/lib/admin/admin-uid-allowlist.ts` markiert UIDs nur als
  Kandidaten zum Setzen eines Claims und gewährt selbst keinen Zugriff.
- Einheitlicher UI/API-Entscheider: `src/lib/admin/admin-auth-model.ts`.
- Server-Audit: jede Admin API Action schreibt ein Security-Audit-Event mit Outcome
  `success`, `denied` oder `failed`.
- Firestore Client Writes: Online-Admin-Mutationen bleiben serverseitig. `adminLogs`,
  `adminActionLocks`, League-Create/Reset/Simulation und globale `admin/*` Pfade sind
  für normale Client-User gesperrt; `admin/*` ist nur mit Custom Claim direkt erlaubt.

## Admin-Parity-Matrix

| Rolle | UI-Gate | Server/Admin Guard | Firestore `admin/*` | Cross-user Ready Write | Hinweis |
|---|---|---|---|---|---|
| Custom Claim `admin=true` | Erlaubt | Erlaubt | Erlaubt | Blockiert | Admin-User duerfen Admin-Dokumente lesen/schreiben; direkte fremde Ready-Writes bleiben clientseitig verboten. |
| UID-Allowlist ohne Claim | Blockiert | Blockiert | Blockiert | Blockiert | Gewollte Bootstrap-Ausnahme: UI darf einen Hinweis zeigen, aber keinen Adminzugang gewaehrleisten. |
| Normaler User | Blockiert | Blockiert | Blockiert | Blockiert | Kein Adminsignal. |
| Unauthenticated | Blockiert | `ADMIN_UNAUTHORIZED` / missing token | Blockiert | Blockiert | Login erforderlich. |

## QA-Checkliste

1. Admin-Claim setzen:
   `GOOGLE_CLOUD_PROJECT=afbm-staging npm run firebase:set-admin -- --project afbm-staging KFy5PrqAzzP7vRbfP4wIDamzbh43`
2. Mit `KFy5PrqAzzP7vRbfP4wIDamzbh43` normal per Firebase anmelden.
3. `/admin` öffnen.
4. Prüfen, dass kein Admin-Passwort abgefragt wird.
5. Prüfen, dass Admin Hub und Liga-Adminseiten sichtbar sind.
6. Eine harmlose Admin-Aktion ausführen und prüfen, dass sie nicht mit
   `ADMIN_UNAUTHORIZED` blockiert.
7. Mit derselben UID ohne Custom Claim einloggen und `/admin` öffnen.
8. Prüfen, dass ein Bootstrap-Hinweis erscheint, aber kein Admininhalt gerendert wird.
9. Mit einem Nicht-Admin einloggen und `/admin` öffnen.
10. Prüfen, dass der Zugriff verweigert wird.
11. Per DevTools einen Admin-API-Request ohne Bearer Token senden und `401` erwarten.

## Risiken / Offene Punkte

- Firestore Rules müssen nach Staging/Production deployed werden, damit der globale
  Admin-Claim auch in direkten Firestore-Zugriffen greift.
- Bereits eingeloggte Sessions brauchen Token-Refresh oder erneuten Login.
- Das Set-Admin-Script benötigt lokal gültige Application Default Credentials.
- Die UID-Allowlist ist nur noch ein Bootstrap-Hinweis. Sie sollte entfernt werden,
  sobald alle Admin-Accounts zuverlässig Custom Claims erhalten.
