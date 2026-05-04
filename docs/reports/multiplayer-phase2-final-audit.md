# Multiplayer Phase 2 Final Audit

Datum: 2026-05-04

Rolle: Principal QA Engineer + Product Gatekeeper

## 1. Executive Summary

**Spielbar: Ja.**

Ein echter nicht-admin Spieler kann sich im Browser einloggen, seine Liga wieder betreten, einer offenen Liga beitreten, ein Team erhalten, einen aktiven Draft-Pick ausfuehren, einen completed Draft nutzen, Ready setzen und nach Reload korrekt verbunden bleiben.

Der rote Join-Blocker war kein Fixture- oder Credential-Problem mehr. Root Cause war ein veralteter Staging-Firestore-Rules-Release: der Repo-Stand erlaubte den eng begrenzten atomaren Self-Join bereits lokal, Staging lieferte aber noch einen alten Ruleset aus und blockierte den Join mit Permission-Diagnose. Am 2026-05-04 wurde ausschliesslich `firestore:rules` nach `afbm-staging` deployed.

Deploy-Evidenz:

```text
ruleset=projects/afbm-staging/rulesets/6534bb5f-7266-4d5d-b226-2de3ffc6c784
release=projects/afbm-staging/releases/cloud.firestore
updateTime=2026-05-04T08:26:51.980332Z
```

## 2. Sicherheitsentscheidung

Gewaehlte Option: **Option B - minimaler Firestore-Rules-Join bleibt aktiv.**

Der Join bleibt ein Client-Firestore-Transaction-Flow, aber nur unter engen Regeln:

- Spieler muss angemeldet sein.
- Spieler darf nur seine eigene Membership erstellen.
- Membership muss `role=gm`, `status=active`, `ready=false` und `userId=request.auth.uid` haben.
- Team muss vorher `available` oder `vacant` sein.
- Team wird auf `assignedUserId=request.auth.uid` gesetzt.
- Globaler Mirror darf nur fuer die eigene Membership erstellt werden.
- League Counter darf nur um 1 steigen und nicht ueber `maxTeams`.
- Fremde Memberships, fremde Team-Zuweisungen und Admin-Dokumente bleiben blockiert.

Zusaetzliche Backend-Haertung im lokalen Code:

- `chooseAvailableFirestoreTeamForIdentity(...)` bevorzugt ein freies Team, dessen vorhandene Identitaet zur Join-Auswahl passt.
- Das reduziert Race-Konflikte, bei denen zwei parallele UI-Joins sonst denselben ersten freien Team-Doc beschreiben koennen.

## 3. Detailbewertung Je Bereich

| Bereich | Status | Evidenz | Bewertung |
| --- | --- | --- | --- |
| Login | Gruen | `npm run test:e2e:browser:login-rejoin` | Echter Browser-Login, Reload, Storage-Clear und Logout/Login-Rejoin sind bewiesen. |
| Join | Gruen | `npm run staging:smoke:join` | Neuer nicht-admin Spieler joined offene Liga, Membership und Team-Zuweisung entstehen atomar. |
| Team Assignment | Gruen | `staging:smoke:join` | `membership.teamId` und `team.assignedUserId` stimmen; Reload behält dasselbe Team. |
| Duplicate Join | Gruen | `staging:smoke:join` | Doppelter Join erzeugt keine zweite Membership und wechselt kein Team. |
| Parallel Join | Gruen | `staging:smoke:join` | Zwei Testspieler landen auf unterschiedlichen Teams; ein paralleler UI-Contention-Fall wurde erkannt und sauber retryt. |
| Full League | Gruen | `staging:smoke:join` | Volle Liga zeigt `1/1 Spieler`; Beitrittsbutton ist deaktiviert. |
| Draft active | Gruen | `npm run staging:smoke:draft` | Falscher Spieler blockiert; richtiger Spieler pickt; Pick Doc entsteht; naechstes Team ist am Zug. |
| Draft completed | Gruen | `npm run staging:smoke:player-playability` | Completed Draft wird als spielbarer Dashboard/Ready-Zustand genutzt. |
| Ready Flow | Gruen | `npm run staging:smoke:player-playability` | Eigener Player Ready/Reload ist live gruen. |
| Rejoin | Gruen | `npm run test:e2e:browser:login-rejoin` | Session und Team-Zuordnung bleiben stabil. |

## 4. Live-Testbelege

### Fixture Setup

```bash
CONFIRM_STAGING_PHASE2_FIXTURES=true CONFIRM_STAGING_SEED=true npm run staging:setup:phase2-fixtures -- --reset
```

Ergebnis: **GREEN**

Vorbereitete Ligen:

- `afbm-playability-test`
- `afbm-join-test`
- `afbm-join-test-race`
- `afbm-join-test-full`
- `afbm-draft-test`

Alle Player-Testuser haben **keine Admin Claims**.

### Browser Login/Rejoin

```bash
STAGING_PLAYER_EMAIL=afbm-phase2-browser-player@example.test STAGING_PLAYER_PASSWORD=<redacted> npm run test:e2e:browser:login-rejoin
```

Ergebnis: **GREEN**

```text
1 passed
```

### Join Smoke

```bash
CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_JOIN_SMOKE=true STAGING_JOIN_PLAYER_EMAIL=afbm-phase2-join-player-1@example.test STAGING_JOIN_PLAYER_PASSWORD=<redacted> STAGING_JOIN_PLAYER_2_EMAIL=afbm-phase2-join-player-2@example.test STAGING_JOIN_PLAYER_2_PASSWORD=<redacted> npm run staging:smoke:join
```

Ergebnis: **GREEN**

```text
[join-smoke] primary join membership ok leagueId=afbm-join-test uid=fVMSlXcdhwhP4Ro4YXNGYm84Kpu2 teamId=bos-guardians teamAssigned=true memberCount=1
[join-smoke] primary reload membership ok leagueId=afbm-join-test uid=fVMSlXcdhwhP4Ro4YXNGYm84Kpu2 teamId=bos-guardians teamAssigned=true memberCount=1
[join-smoke] double join guard membership ok leagueId=afbm-join-test uid=fVMSlXcdhwhP4Ro4YXNGYm84Kpu2 teamId=bos-guardians teamAssigned=true memberCount=1
[join-smoke] parallel join contention retry count=1
[join-smoke] parallel join second membership ok leagueId=afbm-join-test-race uid=05iQRaUjEObMp67T2gWOIePRTfz2 teamId=nyt-titans teamAssigned=true memberCount=2
[join-smoke] parallel join primary membership ok leagueId=afbm-join-test-race uid=fVMSlXcdhwhP4Ro4YXNGYm84Kpu2 teamId=bos-guardians teamAssigned=true memberCount=2
[join-smoke] parallel join ok primaryTeam=bos-guardians secondTeam=nyt-titans
[join-smoke] full league blocked ok leagueId=afbm-join-test-full
[join-smoke] status=GREEN
```

### Draft Smoke

```bash
CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_DRAFT_SMOKE=true STAGING_DRAFT_PLAYER_EMAIL=afbm-phase2-draft-player-1@example.test STAGING_DRAFT_PLAYER_PASSWORD=<redacted> STAGING_DRAFT_PLAYER_2_EMAIL=afbm-phase2-draft-player-2@example.test STAGING_DRAFT_PLAYER_2_PASSWORD=<redacted> npm run staging:smoke:draft
```

Ergebnis: **GREEN**

```text
[draft-smoke] wrong-player blocked ok uid=daZRq8xlDbNepQPJxDsNhXcnC0y1
[draft-smoke] after status=active round=1 pick=2 currentTeam=nyt-titans available=3
[draft-smoke] pick playerId=draft-smoke-qb-alpha teamId=bos-guardians pickedBy=ai6SpOiqEfb32RhZ87L9y3sjLJH2 pickNumber=1
[draft-smoke] status=GREEN
```

### Player Playability Smoke

```bash
CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYER_PLAYABILITY_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging STAGING_PLAYER_EMAIL=afbm-phase2-browser-player@example.test STAGING_PLAYER_PASSWORD=<redacted> npm run staging:smoke:player-playability -- --league-id afbm-playability-test
```

Ergebnis: **GREEN**

```text
[player-smoke] tokenSource=Firebase REST player email/password login uid=W8t4yBN812fDIcZSrEonuXsP6nl2 adminClaim=false email=present
[player-smoke] player state ok week=1 season=1 teamId=basel-rhinos team=Basel Rhinos ready=false schedule=6
[player-smoke] ready click ok teamId=basel-rhinos ready=true
[player-smoke] reload ok week=1 teamId=basel-rhinos ready=true
[player-smoke] status=GREEN
```

## 5. Lokale Checks

| Check | Status |
| --- | --- |
| `npm run test:firebase:rules` | Gruen, 24 Rules-Tests |
| `npx vitest run src/lib/online/repositories/online-league-repository.test.ts` | Gruen, 45 Tests |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `git diff --check` | Gruen |

## 6. Offene Risiken

1. **App-Code-Haertung fuer Identity-Teamwahl ist lokal vorhanden, aber App Hosting liefert weiterhin Commit `5ef05a89887b...`.**
   - Der kritische Staging-Join ist durch Rules-Deploy gruen.
   - Fuer dauerhaft weniger Race-Contention sollte die Code-Haertung im naechsten App-Hosting-Rollout deployed werden.

2. **Parallel Join zeigt weiterhin einen Contention-Retry im Smoke.**
   - Ergebnis ist korrekt: beide User bekommen verschiedene Teams.
   - Der Retry ist sichtbar und nicht still.

## 7. Finale Entscheidung

**Multiplayer echter Spielerflow spielbar: Ja.**

**Phase 2 bestanden: Ja.**

**Phase 3 freigegeben: Ja, mit Auflage.**

Auflage: Die lokale Backend-Haertung fuer identitaetsbasierte Teamwahl muss mit dem naechsten Staging-App-Commit deployed werden, damit parallele UI-Joins weniger haeufig in den sichtbaren Retry-Pfad laufen.
