# AP 5 - Week-/Match-State-Machine fuer Multi-Match-Wochen

Datum: 2026-04-26

Status: Gruen

## Ziel

Week Flow fuer Wochen mit mehreren Matches haerten: Der Wochenzustand darf erst auf `POST_GAME` wechseln, wenn alle aktuellen Wochenmatches abgeschlossen sind.

## Umsetzung

Aktualisiert:

- `src/modules/savegames/application/week-flow.service.ts`
- `src/modules/savegames/application/week-flow.service.test.ts`
- `src/server/repositories/weekMatchStateRepository.firestore.ts`
- `src/server/repositories/firestoreWeekMatchState.test.ts`
- `src/app/api/e2e/dev-login/route.ts`
- `src/lib/auth/session.ts`
- `e2e/week-loop.spec.ts`
- `playwright.config.ts`

## Was umgesetzt wurde

- `finishGame` entscheidet den naechsten Week-State anhand der verbleibenden aktuellen Wochenmatches:
  - weitere `SCHEDULED` Matches: `READY`
  - weitere `IN_PROGRESS` Matches: `GAME_RUNNING`
  - keine offenen Matches: `POST_GAME`
- Prisma- und Firestore-Pfad verwenden dieselbe Zustandsregel.
- Tests decken Multi-Match-Wochen explizit ab.
- Browser-E2E-Login nutzt einen expliziten E2E-Dev-Login-Pfad statt der NextAuth-Default-Credentials-Form, die im Testlauf ohne gueltiges CSRF-Paar mit `MissingCSRF` scheiterte.
- Playwright laedt `.env` vor der WebServer-Konfiguration, damit Seed-User und Test-Server dieselben Dev-Credentials verwenden.
- Fuer den lokalen Browser-E2E gibt es einen nicht-produktiven Auth-Bypass, der nur aktiv wird, wenn `NODE_ENV !== "production"`, `AUTH_DEV_ENABLED=true` und `E2E_AUTH_BYPASS=true` gesetzt sind. Dadurch werden NextAuth-Beta/Next-15-Dev-Runtimefehler im Testpfad vermieden, ohne produktive Auth zu schwaechen.
- `e2e/week-loop.spec.ts` wartet auf echte Server-Action-Redirects (`303`) und prueft danach die persistierten Zustandswechsel per frischem Seitenread.

## Tests

Gruen:

- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.
- `npx vitest run src/modules/savegames/application/week-flow.service.test.ts 'src/app/app/savegames/[savegameId]/week-actions.test.ts' src/components/dashboard/dashboard-model.test.ts`
  - 3 Testdateien / 25 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:week-state"`
  - 1 Testdatei / 8 Tests.
- `npx tsc --noEmit`
- `npm run lint`

## Bewertung

AP5 ist fachlich und technisch gruen. Der Browser-E2E erreicht den Week-Loop stabil, alle geforderten Regressionen sind gruen, und die Auth-Anpassung ist auf den expliziten E2E-Dev-Pfad begrenzt.

## Freigabe

AP6 ist freigegeben, wurde aber nicht gestartet.

Status: Gruen.
