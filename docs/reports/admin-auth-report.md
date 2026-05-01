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
- `src/lib/admin/admin-session.ts`
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
- Entfernt: `src/app/admin/login/page.tsx`
- Entfernt: `src/app/api/admin/login/route.ts`
- Entfernt: `src/app/api/admin/login/route.test.ts`
- Entfernt: `src/lib/admin/admin-session.test.ts`

## Admin-Claim Setzen

Direkt:

```bash
GOOGLE_CLOUD_PROJECT=afbm-staging node scripts/set-admin.js KFy5PrqAzzP7vRbfP4wIDamzbh43
```

Oder per npm Script:

```bash
GOOGLE_CLOUD_PROJECT=afbm-staging npm run firebase:set-admin -- KFy5PrqAzzP7vRbfP4wIDamzbh43
```

Das Script nutzt Firebase Admin SDK mit Application Default Credentials und setzt
`admin: true`, ohne bestehende Custom Claims zu entfernen.

## Token Refresh

Nach dem Setzen eines Custom Claims sieht ein bereits eingeloggter Browser den Claim
erst nach einem ID-Token-Refresh. Der neue Admin-Gate ruft beim Öffnen der Adminseite
`getIdTokenResult(true)` auf. Ein Logout/Login funktioniert ebenfalls.

## Schutzmodell

- UI: `/admin` und `/admin/league/[leagueId]` rendern Admin-Inhalte nur, wenn der
  aktuelle Firebase-User `admin: true` im ID Token hat.
- API: Admin-Aktionen akzeptieren nur `Authorization: Bearer <Firebase ID Token>` und
  verifizieren den Token serverseitig mit Firebase Admin SDK.
- Firestore Rules: `request.auth.token.admin == true` gilt als globaler Admin und darf
  Admin-Pfade sowie Online-Admin-Rechte nutzen.
- Entfernt: Admin-Code-Formular, Admin-Login-Route, Admin-Session-Cookie.

## QA-Checkliste

1. Admin-Claim setzen:
   `GOOGLE_CLOUD_PROJECT=afbm-staging npm run firebase:set-admin -- KFy5PrqAzzP7vRbfP4wIDamzbh43`
2. Mit `KFy5PrqAzzP7vRbfP4wIDamzbh43` normal per Firebase anmelden.
3. `/admin` öffnen.
4. Prüfen, dass kein Admin-Passwort abgefragt wird.
5. Prüfen, dass Admin Hub und Liga-Adminseiten sichtbar sind.
6. Eine harmlose Admin-Aktion ausführen und prüfen, dass sie nicht mit
   `ADMIN_UNAUTHORIZED` blockiert.
7. Mit einem Nicht-Admin einloggen und `/admin` öffnen.
8. Prüfen, dass der Zugriff verweigert wird.
9. Per DevTools einen Admin-API-Request ohne Bearer Token senden und `401` erwarten.

## Risiken / Offene Punkte

- Firestore Rules müssen nach Staging/Production deployed werden, damit der globale
  Admin-Claim auch in direkten Firestore-Zugriffen greift.
- Bereits eingeloggte Sessions brauchen Token-Refresh oder erneuten Login.
- Das Set-Admin-Script benötigt lokal gültige Application Default Credentials.
