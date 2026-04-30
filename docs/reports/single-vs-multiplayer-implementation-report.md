# Singleplayer vs Multiplayer Implementation Report

## Analysierte Singleplayer-Features

Geprüft wurden:

- SaveGame-Routen unter `src/app/app/savegames/[savegameId]`
- Dashboard-Komponenten mit Next Action und Week Loop
- Team-/Roster-Komponenten
- Depth-Chart-Modelle
- Week-Flow-Service
- Match Setup, Live Game und Match Report
- Season/Schedule/Standings
- Player, Coaches, Finance, Draft und Reports

## Analysierte Multiplayer-Features

Geprüft wurden:

- `/online`
- `/online/league/:leagueId`
- `/admin`
- `/admin/league/:leagueId`
- `src/lib/online/*`
- `src/lib/multiplayer/*`
- Firestore Repository Backbone
- localStorage Legacy-State

## Gefundene Lücken

Critical/High:

- Online hatte keinen persistenten Depth-Chart-State pro Team.
- Online-Dashboard zeigte Roster und Starter kaum als GM-relevante Entscheidung.
- Week Flow blieb stärker Placeholder als Singleplayer und hatte keine klare Statusbox.
- Match Results und Standings fehlten als persistente Liga-Historie.
- Firestore Rules mussten GM-eigene Depth-Chart-Updates explizit erlauben, ohne Team-Ownership zu öffnen.

Bewusst nicht übernommen:

- Echte Singleplayer-Game-Engine-Integration, weil sie im Multiplayer serverseitig orchestriert werden muss.
- Vollständige Match Reports und Stats, weil dafür echte Online-Simulationsergebnisse benötigt werden.
- Singleplayer-SaveGame-Shortcuts, weil Multiplayer zentralen, rollenbasierten State braucht.
- Lokale Admin-Abkürzungen als produktive Sicherheit, weil Admin Commands langfristig serverseitig laufen müssen.

## Implementierte Nachholungen

### Online Depth Chart

Neue Daten:

- `OnlineDepthChartEntry`
- `depthChart?: OnlineDepthChartEntry[]` pro Online-League-User

Beim Liga-Beitritt wird aus dem Contract-Roster automatisch eine Default-Depth-Chart erzeugt. Alte Online-Daten ohne Depth Chart werden beim Laden normalisiert.

Neue Funktion:

- `updateOnlineLeagueUserDepthChart()`

Validierung:

- Starter muss im aktiven Roster sein
- Backup-Spieler müssen im aktiven Roster sein
- gleiche Starter werden blockiert
- ungültige Updates verändern den State nicht

### Repository / Firestore Backbone

`OnlineLeagueRepository` wurde um `updateDepthChart()` erweitert.

- Local Repository schreibt in den Legacy-State.
- Firebase Repository schreibt transaktional auf das eigene Team-Dokument.
- Firestore Rules erlauben einem GM nur `depthChart` und `updatedAt` am eigenen assigned Team zu ändern.

### Week / Results

Neue Daten:

- `OnlineWeekFlowStatus`
- `weekStatus`
- `lastSimulatedWeekKey`
- `OnlineMatchResult`
- `matchResults`

`simulateOnlineLeagueWeek()` speichert nun bei vorhandenen Team-Paarungen MatchResult-Placeholder. Diese Ergebnisse sind persistent und bilden die Grundlage fuer Standings und Recent Results.

### Dashboard

Der Online-Liga-Screen zeigt jetzt:

- Command-Center-Statusbox: naechste sinnvolle Aktion
- Roster-Zusammenfassung
- Starter-Durchschnitt
- Depth-Chart-Auszug
- Standings
- letzte Online-Ergebnisse

Damit rueckt der Multiplayer naeher an den Singleplayer-Dashboard-Loop, ohne neue Gameplay-Features oder Engine-Logik einzubauen.

## Geänderte Dateien

- `src/lib/online/online-league-service.ts`
- `src/lib/online/online-league-service.test.ts`
- `src/lib/online/types.ts`
- `src/lib/online/repositories/online-league-repository.test.ts`
- `src/lib/online/repositories/local-online-league-repository.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/components/online/online-league-detail-model.ts`
- `src/components/online/online-league-placeholder.tsx`
- `src/lib/firebase/firestore.rules.test.ts`
- `firestore.rules`
- `docs/reports/single-vs-multiplayer-gap-analysis.md`
- `docs/reports/single-vs-multiplayer-implementation-report.md`

## Tests

Ergaenzt:

- Default Depth Chart wird erzeugt.
- GM kann gueltige Depth Chart speichern.
- ungueltige Depth Chart wird blockiert.
- MatchResult-Placeholder wird bei Week Simulation gespeichert.
- simulierender Week-State wird nicht erneut fortgeschrieben.
- Repository kann Depth Chart ueber das Interface aktualisieren.
- Security Rules erlauben eigene GM-Depth-Chart-Updates und blockieren Team-Ownership-Eskalation.

## Bekannte Risiken

- Firestore Admin Commands sind weiterhin MVP und sollten produktiv in Cloud Functions oder serverseitige Route Handler wandern.
- Echte Simulation, Stats und Match Reports sind noch nicht zentral angebunden.
- `test:e2e` ist lokal durch eine nicht erreichbare PostgreSQL-Datenbank blockiert.
- Ein dediziertes `test:e2e:multiplayer` Script existiert noch nicht.

## Nächste empfohlene Arbeitspakete

1. Multiplayer Week Command serverseitig implementieren.
2. Online Schedule/Match Setup als Firestore Read Model einfuehren.
3. Echte Match Results und Stats aus serverseitiger Simulation persistieren.
4. Multiplayer-E2E mit zwei Browser-Kontexten ergaenzen.
5. Admin Commands vollstaendig aus dem Client herausziehen.
