# AP2 Report - Firestore Join-/Membership-Rules E2E-nah absichern

## Status

Gruen.

## Umgesetzte Aenderungen

- `isGlobalAdmin()` in `firestore.rules` null-safe gemacht, damit fehlende `admin` Custom Claims nicht zu Rules-Evaluierungsfehlern fuehren.
- Globale `leagueMembers/{leagueMemberId}`-Regel in `get` und `list` getrennt:
  - `get` erlaubt existierende eigene Mirrors, Admin-/Owner-Reads ueber gueltige `leagueId`, und den fehlenden eigenen Mirror als leeres Ergebnis fuer den ersten Join-Transaction-Read.
  - `list` erlaubt nur user-gescoped Queries mit `resource.data.userId == request.auth.uid` und `status == "ACTIVE"`.
- Kleine Helper in `firestore.rules` ergaenzt:
  - `leagueMemberMirrorPath(leagueMemberId)`
  - `isOwnLeagueMemberMirrorId(leagueMemberId)`
- `src/lib/firebase/firestore.rules.test.ts` erweitert:
  - Query vor Join liefert fuer den neuen User sauber 0 Mirrors.
  - Atomic Join schreibt Membership, Team-Assignment, Event und globalen Mirror.
  - Query nach Join liefert genau 1 eigenen Mirror.
  - Eigener fehlender Mirror darf gelesen werden, fremder fehlender Mirror bleibt verboten.
  - Eigener valider Mirror darf gelesen werden, fremder valider Mirror bleibt verboten.
  - Malformed Mirror ohne `userId`/`leagueId` bleibt verboten.
- `joinLeague()` in `src/lib/online/repositories/firebase-online-league-repository.ts` geprueft: Membership, globaler Mirror und Team-Assignment werden bereits in derselben Firestore-Transaction geschrieben. Keine Codeaenderung dort noetig.

## Betroffene Dateien

- `firestore.rules`
- `src/lib/firebase/firestore.rules.test.ts`
- `docs/reports/ap2-report.md`

## Vorher / Nachher

Vorher:
- Der Browser-Flow konnte beim Suchen/Joinen in `Du hast fuer diese Online-Liga oder Aktion keine Berechtigung` laufen.
- Der globale `leagueMembers`-Read-Pfad war nicht ausreichend robust fuer fehlende oder unvollstaendige Mirror-Dokumente.
- Die user-gescopte Mirror-Query aus dem Online-Hub war nicht explizit als `list`-Regel abgesichert.

Nachher:
- Die eigene Mirror-Query ist query-sicher erlaubt.
- Der erste Transaction-Read auf den noch fehlenden eigenen Mirror blockiert den Join nicht mehr.
- Fremde Mirrors und unvollstaendige Mirrors bleiben gesperrt.
- Der Firebase Multiplayer E2E erreicht nach Join die Liga und bleibt bei Cross-User-Writes restriktiv.

## Testergebnisse

- `npm run lint` - bestanden.
- `npx tsc --noEmit` - bestanden. Hinweis: ein parallel zu `npm run build` gestarteter erster Lauf scheiterte an einer `.next/types`-Race; der Einzel-Re-Run nach Build war gruen.
- `npm run build` - bestanden.
- `npm run test:firebase:rules` - bestanden, 19 Tests.
- `npm run test:firebase:parity` - bestanden, 3 Tests.
- `npm run test:e2e:multiplayer:firebase` - bestanden, 1 Playwright-Test.
- `npm run test:run` - bestanden, 154 Testdateien / 912 Tests.

## Potenzielle Risiken

- Der fehlende eigene Mirror-Get ist bewusst erlaubt, damit Firestore-Transactions den Join vorbereitend lesen koennen. Das gibt keine Dokumentdaten frei, erlaubt aber einem angemeldeten User, die Nicht-Existenz eines eigenen Mirror-IDs zu pruefen.
- `isOwnLeagueMemberMirrorId()` nutzt das bestehende Mirror-ID-Muster `<leagueId>_<uid>`. Falls das ID-Format spaeter geaendert wird, muss diese Rule mitgezogen werden.
- Emulator-Logs enthalten weiterhin erwartete `PERMISSION_DENIED`-Eintraege aus negativen Tests und Cross-User-Write-Pruefungen; die Tests selbst sind gruen.
