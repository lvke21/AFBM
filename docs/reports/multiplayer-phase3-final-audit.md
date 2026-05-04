# Multiplayer Phase 3 Final Audit

Stand: 2026-05-04

Rolle: Principal QA Engineer + Product Gatekeeper

## Executive Summary

**Phase 3 bestanden: Nein.**

Der echte Staging-Golden-Path fuer Spieler ist aktuell stark genug fuer einen
kontrollierten Staging-Spieltest: Browser-Login/Rejoin, Join, Team Assignment,
aktiver Draft, Player Ready, Admin-Simulation, Results, Standings und Reload
sind live gegen Staging gruen.

Phase 3 ist aber nicht vollstaendig abgenommen, weil relevante Phase-3-Haertungen
lokal im dirty Worktree liegen und damit nicht eindeutig im deployten App-Hosting-
Artefakt bewiesen sind. Ausserdem wurde keine komplette Mini-Season bis zum
Season-End live mit echten Spielern durchgespielt.

**Staging-Spieltest mit echten Spielern freigegeben: Ja, kontrolliert.**

Freigabe gilt nur fuer eine kleine, begleitete Staging-Gruppe auf den Testligen.
Der Spieltest muss explizit Season-End, Reload nach mehreren Wochen und Management-
Impact pruefen. Er ist kein Production-Go.

**Production-Go empfohlen: Nein.**

Production bleibt No-Go, bis eine echte kleine Spielergruppe erfolgreich eine
komplette Mini-Season gespielt hat und der danach relevante Code sauber committed,
deployed und erneut verifiziert wurde.

## Gepruefter Staging-Stand

| Feld | Wert |
| --- | --- |
| Staging URL | `https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app` |
| Deployed Commit | `1dab315e567d1a0627b37689407d7fd22e870cf6` |
| Erwarteter Commit | `1dab315e567d` |
| Revision | `afbm-staging-backend-build-2026-05-04-003` |
| Environment | `staging` |
| Worktree | Dirty; mehrere Phase-3-Codepfade sind lokal veraendert und daher nicht als deployed bewiesen. |

## Ausgefuehrte Checks

| Check | Ergebnis | Evidenz |
| --- | --- | --- |
| `npm run lint` | GREEN | Lokal erfolgreich. |
| `npx tsc --noEmit` | GREEN | Lokal erfolgreich. |
| `npm run test:firebase:rules` | GREEN | Nach Sandbox-EPERM ausserhalb der Sandbox erfolgreich, 24 Rules-Tests. |
| `npx vitest run src/lib/online src/lib/admin src/components/online src/components/layout/top-bar.test.tsx` | GREEN | 47 Testdateien, 449 Tests bestanden. |
| `npm run test:e2e:browser:login-rejoin` | GREEN | Echter Browser Login/Rejoin mit Staging-Testuser. |
| `npm run staging:smoke:join` | GREEN | Neuer nicht-admin Spieler joined, paralleler Join verteilt verschiedene Teams, volle Liga blockiert. |
| `npm run staging:smoke:draft` | GREEN | Falscher Spieler blockiert, richtiger Spieler pickt, naechster Pick korrekt. |
| `npm run staging:smoke:playability -- --league-id afbm-playability-test` | GREEN | Admin-Simulation gegen Staging: 2 Spiele simuliert, Woche 1 -> 2, Results/Standings persistieren. |
| `npm run staging:smoke:player-playability -- --league-id afbm-playability-test` | GREEN | Echter Player per Email/Passwort, eigenes Team, Ready, Reload stabil. |
| UX/Results/Season-End Smoke | Nicht als eigener Live-Smoke vorhanden | Results/Standings ueber Playability-Smoke live bewiesen; Season-End nur ueber lokale Unit-/Component-Tests und Codeaudit, nicht live bis Saisonende. |

Hinweis: Die erste Ausfuehrung einiger `tsx`-basierter Scripts scheiterte in der
lokalen Sandbox mit `EPERM` auf der IPC-Pipe. Die relevanten Staging-Smokes wurden
danach ausserhalb der Sandbox ausgefuehrt.

## Live-Testbelege

### Build-Info

```text
commit ok expected=1dab315e567d
deployed=1dab315e567d1a0627b37689407d7fd22e870cf6
revision=afbm-staging-backend-build-2026-05-04-003
env=staging
```

### Join

```text
primary join membership ok teamId=bos-guardians
double join guard membership ok teamId=bos-guardians
parallel join ok primaryTeam=bos-guardians secondTeam=nyt-titans
full league blocked ok
status=GREEN
```

### Draft

```text
wrong-player blocked ok
pick playerId=draft-smoke-qb-alpha teamId=bos-guardians
after status=active round=1 pick=2 currentTeam=nyt-titans available=3
status=GREEN
```

### Admin Playability

```text
preflight state currentWeek=1 lastScheduledWeek=3 currentWeekGames=2 readyCount=0/4 resultsCount=0 standingsCount=0 activeLocks=none
setAllReady ok ready=4/4
simulateWeek ok games=2 simulatedWeek=1 nextWeek=2
reload ok week=2 teamId=basel-rhinos results=2 standings=4 gamesPlayed=4
status=GREEN
```

### Player Playability

```text
tokenSource=Firebase REST player email/password login adminClaim=false email=present
player state ok week=2 season=1 teamId=basel-rhinos team=Basel Rhinos ready=false schedule=6
dashboard route ok status=200
ready click ok teamId=basel-rhinos ready=true
reload ok week=2 teamId=basel-rhinos ready=true
status=GREEN
```

### Finaler Read-only State

```json
{
  "activeLocks": [],
  "currentSeason": 1,
  "currentWeek": 2,
  "currentWeekGames": 2,
  "exists": true,
  "lastScheduledWeek": 3,
  "leagueId": "afbm-playability-test",
  "readyCount": 1,
  "resultsCount": 2,
  "standingsCount": 4,
  "totalUsers": 4
}
```

## Detailbewertung

| Bereich | Status | Bewertung |
| --- | --- | --- |
| 1. Login/Rejoin | GREEN | Browser-E2E beweist Email/Passwort-Login, Reload, gleiche Liga und gleiche Team-Zuordnung. |
| 2. Join | GREEN | Staging-Smoke beweist neuen nicht-admin Join, doppelte Joins, Parallel-Join und volle Liga. |
| 3. Draft | GREEN | Aktiver Draft ist live spielbar; falscher Spieler und unavailable/ungueltiger Zugriff werden blockiert. |
| 4. Dashboard UX | GELB | Dashboard-Route und Hauptflow sind live erreichbar. UX-Audit hatte P1-Probleme; lokale UI-Fixes sind im dirty Worktree nicht als deployed bewiesen. |
| 5. Results View | GREEN | Admin-Playability erzeugt Results; Reload sieht 2 Ergebnisse. |
| 6. Standings | GREEN | Nach Simulation sind 4 Standings-Datensaetze vorhanden und Reload-stabil. |
| 7. Season-End | GELB | Lokale Tests/Code decken Season-End/Week-Overflow ab, aber keine live durchgespielte Mini-Season bis `season_complete`. |
| 8. Roster/Depth Impact | GELB | Lokale Tests belegen Depth-/Roster-Rating-Impact; nicht als deployed und nicht live im Staging-Spiel bewiesen. |
| 9. Ready/Reload | GREEN | Echter Player setzt eigenes Team ready; Reload bleibt stabil. |
| 10. Keine aktiven Locks | GREEN | Finaler read-only State zeigt `activeLocks=[]`. |
| 11. Keine Woche ohne Spiele | GREEN | `currentWeek=2`, `lastScheduledWeek=3`, `currentWeekGames=2`; kein leerer spielbarer Week-State. |

## Blocker und Risiken

### P0

Keine aktuell reproduzierte P0-Blockade im Staging-Golden-Path.

### P1

1. **Phase-3-Code ist nicht sauber deploybar bewiesen**
   - Risiko: lokale Season-End-, UX- oder Roster/Depth-Fixes koennen in Staging fehlen.
   - Fehlender Schritt: dirty Worktree bereinigen, Commit erstellen, nach Staging deployen, Build-Info pruefen, Smokes erneut laufen lassen.

2. **Season-End nicht live durchgespielt**
   - Risiko: Week-Overflow ist historisch ein Core-Loop-Killer; lokale Tests reichen nicht fuer Production-Nahe.
   - Fehlender Schritt: kleine Mini-Season auf Staging bis zur letzten geplanten Woche durchspielen und `season_complete`, blocked Ready, blocked Simulation, Results/Standings und Reload pruefen.

3. **Roster/Depth Impact nicht live validiert**
   - Risiko: Management-Entscheidungen wirken lokal in Unit-Tests, aber Spieler erleben den Impact noch nicht bewiesen im Staging-Spieltest.
   - Fehlender Schritt: kontrollierter Staging-Test mit zwei unterschiedlich starken Depth Charts und dokumentiertem Ergebnis-/Rating-Nachweis.

### P2

1. **UX nur eingeschraenkt fuer unbegleitete Spieler**
   - Der Phase-3-UX-Audit erlaubt einen Staging-Spieltest, aber nicht einen breiten externen Test ohne Briefing.

2. **Kein dedizierter UX/Results/Season-End Browser-Smoke vorhanden**
   - Results sind ueber Playability belegt, aber nicht als eigener Browser-UX-Smoke.

## Finale Entscheidung

| Entscheidung | Ergebnis | Begruendung |
| --- | --- | --- |
| Phase 3 bestanden | Nein | Live-Golden-Path ist gruen, aber Phase-3-Haertungen sind nicht vollstaendig als deployed bewiesen und Season-End wurde nicht live bis Abschluss gespielt. |
| Staging-Spieltest mit echten Spielern freigegeben | Ja, kontrolliert | Login, Join, Draft, Ready, Simulation, Results, Standings, Reload und Lock-State sind live gruen. Test muss begleitet und auf Staging-Testligen beschraenkt sein. |
| Production-Go empfohlen | Nein | Keine echte kleine Spielergruppe hat eine komplette Mini-Season erfolgreich gespielt; Production-Go bleibt per Regel blockiert. |

## Naechste Pflichtschritte

1. Dirty Worktree in saubere Commits ueberfuehren oder bewusst verwerfen; nichts stillschweigend offen lassen.
2. Aktuellen Phase-3-Code nach Staging deployen und `/api/build-info` erneut gegen den Commit pruefen.
3. Alle hier gelisteten Staging-Smokes erneut gegen den neuen Commit ausfuehren.
4. Eine komplette Mini-Season mit echten Testspielern auf Staging durchspielen.
5. Danach diesen Audit aktualisieren und Production weiterhin erst nach erfolgreichem Mini-Season-Nachweis neu bewerten.
