# AP1 Report - Online-League-Datenquelle pro Route konsolidieren

Stand: 2026-05-01

## Status

**Gruen**

AP1 wurde eng umgesetzt: Die Online-League-Route besitzt jetzt eine zentrale State-Quelle fuer User, League Snapshot, Loading/Error-State und Retry. Dashboard- und Draft-Komponenten starten keine eigene `getCurrentUser()`-/`getLeagueById()`-/`subscribeToLeague()`-Kette mehr.

## Änderungen

- Neuer routeweiter State-Hook/Provider:
  - `src/components/online/online-league-route-state.tsx`
- `OnlineLeagueAppShell` nutzt diesen State und stellt ihn per Context bereit.
- `OnlineLeaguePlaceholder` liest `league`, `currentUser`, `loaded`, `loadError`, `retryLoad` und `setLeague` aus dem Route-State.
- `OnlineLeagueDraftPage` liest denselben Route-State und behält nur noch Draft-spezifische UI-States wie Feedback und pending Pick.
- Die bisherige Profil-Synchronisierung fuer Stadium Pricing und Franchise Strategy bleibt im Dashboard erhalten, reagiert jetzt aber auf den zentralen League-State.

## Betroffene Dateien

- `src/components/online/online-league-route-state.tsx`
- `src/components/online/online-league-app-shell.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-draft-page.tsx`

## Vorher/Nachher

### Vorher

- `OnlineLeagueAppShell` lud User und League und oeffnete `subscribeToLeague()`.
- `OnlineLeaguePlaceholder` lud User und League erneut und oeffnete erneut `subscribeToLeague()`.
- `OnlineLeagueDraftPage` lud User und League ebenfalls erneut und oeffnete erneut `subscribeToLeague()`.
- Pro Route konnten dadurch doppelte oder mehrfache Firestore-Live-Subscriptions entstehen.

### Nachher

- Nur `online-league-route-state.tsx` ruft noch:
  - `repository.getCurrentUser()`
  - `repository.getLeagueById(leagueId)`
  - `repository.subscribeToLeague(leagueId, ...)`
- `OnlineLeagueAppShell`, `OnlineLeaguePlaceholder` und `OnlineLeagueDraftPage` teilen sich denselben Snapshot.
- Statische Prüfung:
  - `getCurrentUser(`, `getLeagueById(` und `subscribeToLeague(` kommen in den AP1-Komponenten nur noch in `online-league-route-state.tsx` vor.

## Testergebnisse

Ausgefuehrt:

```bash
npm run lint
npx tsc --noEmit
npx vitest run src/lib/online/repositories/online-league-repository.test.ts src/components/online/online-league-dashboard-panels.test.tsx src/components/online/online-continue-model.test.ts src/components/layout/navigation-model.test.ts
npm run build
```

Ergebnisse:

- `npm run lint`: gruen
- `npx tsc --noEmit`: gruen
- relevante Vitest-Tests: gruen, 4 Test Files / 30 Tests passed
- `npm run build`: gruen

Build-Beobachtung:

- `/online/league/[leagueId]`: ca. 17.6 kB Route Size, ca. 292 kB First Load JS
- `/online/league/[leagueId]/draft`: ca. 1.14 kB Route Size, ca. 276 kB First Load JS

## Risiken

- Der Firebase-Multiplayer-E2E war bereits vor AP1 rot durch einen Permission-/Rules-Join-Fehler. AP1 behebt diesen Fehler nicht, weil AP1 keine Firestore Rules, Auth Logic oder Join-Logik aendern durfte.
- `subscribeToLeague()` selbst ist weiterhin breit und abonniert mehrere Subcollections. AP1 reduziert doppelte Aufrufer, splittet aber bewusst noch keine Repository-Subscription.
- Kein Browser-E2E wurde als gruen bestaetigt, weil der bekannte Join-Permission-Blocker ausserhalb des AP1-Scopes liegt.

## Nicht geändert

- Keine Game Engine.
- Kein Firestore Schema.
- Keine Auth Logic.
- Kein Week Flow.
- Kein Draft Flow.
- Keine Repository-API.
- Keine UI-Neugestaltung.

## Empfehlung

AP2 sollte als naechstes umgesetzt werden, weil der bekannte Firebase Join-/Membership-Rules-Fehler weiterhin der kritische Release-Blocker ist.
