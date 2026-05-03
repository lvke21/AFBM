# Final Multiplayer Stability Audit

Stand: 2026-05-02

## Executive Summary

**Gesamturteil fuer Multiplayer-MVP: Teil-Go / Gelb.**

Der aktuelle Stand adressiert die frueheren Einstiegskiller im Core Loop deutlich: Join/Rejoin, Membership-Mirror, Team-Zuordnung, stale `lastLeagueId`, Ready-Anzeige, Draft-Pick-Kollisionen und Week-Simulation sind nicht mehr nur lose UI-Flows, sondern haben zentrale Guards, Transaktionen, Locks und Tests.

Der Core Loop ist im lokalen Firebase-Browser-E2E stabil bestaetigt:

```text
Join -> Team -> Ready -> Simulation -> Results -> Reload
```

Trotzdem ist das System noch kein Production-Go. Mehrere Findings sind nur entschaerft, nicht architektonisch beseitigt: Draft, Week und Lifecycle behalten Kompatibilitaets-/Legacy-Felder als zweite Signale. Das ist aktuell testbar und kontrolliert, aber keine harte "single source of truth" im strengen Sinn. Der authentifizierte Staging-Smoke wurde in vorhandenen Reports als gruen dokumentiert, konnte in diesem Audit-Lauf mangels lokaler Smoke-Credentials aber nicht erneut live ausgefuehrt werden.

**Empfehlung:**

- Ready fuer internes MVP: **Ja, mit QA-Hinweis**
- Ready fuer Staging QA: **Ja, wenn der authentifizierte Staging-Smoke fuer den Ziel-Commit erneut gruen laeuft**
- Ready fuer Production: **Nein**

## Bewerteter Scope

Bewertet wurden alle `FIX NOW` Findings aus `docs/reports/full-project-analysis/master-findings-table.md` plus QA-/Smoke-Findings, die direkt die Aussagekraft der Core-Loop-Signale beeinflussen.

Audit-Scope: **31 Findings**

- Gelöst: **18**
- Teilweise: **12**
- Offen: **1**
- Regressionen: **0**

## Finding-Mapping

| Finding | Status | Umsetzung im Code / Nachweis | Begruendung | Risiko |
|---|---|---|---|---|
| N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten | GELÖST | `src/lib/online/repositories/firebase-online-league-repository.ts`, `src/components/online/online-league-route-state.tsx`, `e2e/multiplayer-firebase.spec.ts` | Join/Rejoin laeuft ueber Repository-Transaction, setzt `lastLeagueId` erst nach Erfolg und Browser-E2E bestaetigt Rejoin nach stale `lastLeagueId`. | Niedrig |
| N034 - Fehlende Membership kann Nutzer in Schleifen fuehren | GELÖST | `validateOnlineLeagueRouteState`, `resolveFirestoreMembershipForUser`, Route-State Recovery | Fehlende Membership wird als expliziter Such-/Recovery-State behandelt statt als harte Permission-Sackgasse. | Niedrig |
| N035 - Fehlende Team-Zuordnung blockiert Multiplayer | GELÖST | Firebase Repository Join-Transaction, Route-State Guards, E2E Membership/Team Assertions | Join erzeugt Membership und Team-Zuordnung atomar; Route-State blockt unvollstaendige Zustaende mit klarer Meldung. | Niedrig |
| N036 - User-Team-Link hat mehrere Inkonsistenzstellen | GELÖST | Membership + globaler Mirror Repair im Repository; Team `assignedUserId` Pruefung im E2E | Bestehende Membership/Mirror/Team-Zuordnung wird beim Rejoin kanonisch repariert, ohne Manager umzuziehen. | Mittel, weil Mirror weiterhin existiert |
| N037 - Globaler League Member Mirror ist doppelte Source of Truth | GELÖST | `createLeagueMemberMirrorFromMembership`, `isLeagueMemberMirrorAligned`, Repository Tests | Mirror bleibt als Projektion, wird aber aus Membership repariert und nicht als unabhaengiger Zielzustand behandelt. | Mittel |
| N038 - Team Assignment kann Race Conditions erzeugen | GELÖST | Firestore `runTransaction` in `joinLeague`, Repository Paralleltest | Team Assignment ist transaktional; Paralleltests verhindern doppelte Teamvergabe. | Niedrig |
| N085 - Stale `lastLeagueId` kann Nutzer blockieren | GELÖST | `online-continue-model`, Route-State Cleanup, Firebase E2E Rejoin-Step | Ungueltige lokale Liga wird bereinigt und Nutzer kann neu suchen/rejoinen. | Niedrig |
| N048 - Draft State hat mehrere Race- und Truth-Risiken | TEILWEISE | `multiplayer-draft-logic.ts`, Firebase Repository `makeFantasyDraftPick`, `fantasy-draft-service.test.ts` | Pick-Invarianten, stable Pick-Docs und current-run Guards sind umgesetzt. Vollstaendige Single Source of Truth fehlt, weil Draft Doc, Picks, Available Players und Legacy Fallbacks parallel lesbar bleiben. | Mittel |
| N086 - Draft Pick und Draft State koennen parallel kollidieren | TEILWEISE | Firestore Transaction, Pick-Slot-Dokumente, stale-state Checks, Promise.all Tests | Doppelklick-/Parallel-Picks werden praktisch blockiert. Rest-Risiko bleibt bei Legacy/local Pfaden und komplexer Split-State-Rekonstruktion. | Mittel |
| N068 - Week Simulation braucht gueltigen Schedule | GELÖST | `online-league-week-simulation.ts`, `online-week-simulation.ts`, Admin UI Preconditions | Zentrale Preconditions blocken fehlenden/ungueltigen Schedule mit klaren Fehlercodes und sichtbarer UI-Begruendung. | Niedrig |
| N069 - Week Simulation braucht vorhandene Teams | GELÖST | `assertActiveTeamsExist`, `validateScheduledMatches`, Tests fuer fehlende Teams | Simulation bricht vor Writes ab, wenn Teams fehlen oder Matchups ungueltig sind. | Niedrig |
| N087 - Week Simulation kann doppelt oder parallel laufen | TEILWEISE | Admin Action Lock `adminActionLocks`, `assertCanStart...`, `assertCanComplete...`, E2E Duplicate Simulation | Doppelte Simulation wird im normalen Request- und Browserflow blockiert. Rest-Risiko: ein Prozessabbruch nach Lock-Start kann einen stale `simulating` Lock hinterlassen; TTL/Owner-Recovery ist nicht sichtbar. | Mittel |
| N090 - Week Status hat doppelte Wahrheit | TEILWEISE | `completedWeeks` als kanonisches Completion-Signal, `getOnlineLeagueWeekProgressState` Konflikterkennung | UI/Service bevorzugen `completedWeeks`, erkennen Legacy-Konflikte und projizieren Status. `lastSimulatedWeekKey`, `weekStatus` und `matchResults` bleiben aber weiterhin Completion-Signale. | Mittel |
| N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen | GELÖST | Firestore Transaction in `online-admin-actions.ts`, local service Tests | Results, Standings, `completedWeeks`, Ready-Reset und `currentWeek` werden serverseitig in einer Transaction geschrieben. | Niedrig bis mittel |
| N039 - Ready-State braucht konsistente Persistenz und Anzeige | GELÖST | `online-league-week-service.ts`, `online-league-detail-model.ts`, Repository `setUserReady`, Dashboard Tests | Ready wird aus aktiven Participants abgeleitet, UI und Admin nutzen dieselbe Ableitung, Writes pruefen expected season/week. | Niedrig |
| N093 - Ready waehrend Simulation ist Race-Risiko | GELÖST | Firestore Ready-Transaction prueft Simulation Lock und `weekStatus`, UI disablet Ready | Ready-Aenderungen werden bei simulating/completed/Draft active blockiert; Tests decken lock/completed/draft ab. | Niedrig |
| N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab | TEILWEISE | Admin Week UI, Admin API simulateWeek, Dashboard Status | Abhaengigkeit ist klarer sichtbar und testbar, aber fachlich weiter vorhanden: GM kann die Woche nicht selbst fortschreiben. | Mittel |
| N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | GELÖST | `online-game-simulation.ts`, `online-game-simulation.test.ts`, serverseitige Roster Preconditions | Adapter erzeugt strukturierte Online-Game-Ergebnisse; fehlende Teams/Roster werden kontrolliert blockiert. | Niedrig |
| N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende | TEILWEISE | Route-State Guards, Sidebar `teamNavigationReady`, Dashboard Empty States | No-Team wird sauber behandelt; No-Roster wird angezeigt/Simulation blockiert. Es gibt aber noch keine vollstaendige browserweite Direktaufruf-Matrix fuer alle Unterseiten. | Mittel |
| N088 - Multiplayer hat viele parallele Statusfelder | TEILWEISE | `online-league-lifecycle.ts`, `online-league-week-simulation.ts` | Lifecycle-Normalisierung reduziert UI-Widersprueche. Die persistierten Felder bleiben weiterhin breit und teils redundant. | Mittel |
| N089 - Zentrale Online State Machine fehlt | TEILWEISE | `normalizeOnlineLeagueLifecycle` + Tests | Es gibt eine kleine Normalisierung, aber keine vollstaendige State Machine fuer alle Transitions und Persistenzfelder. | Mittel |
| N045 - Active Draft darf nicht automatisch Fullscreen oeffnen | GELÖST | Navigation-Modell, App-Shell Draft Status, Suche nach Draft-Redirects, Dashboard Tests | Kein `router.push("/draft")`/`redirect("/draft")` gefunden; Draft wird als Status angezeigt und nur per Route/Klick geoeffnet. | Niedrig |
| N099 - Multiplayer Acceptance und UX-Audit widersprechen sich | GELÖST | `docs/reports/qa-release-gates.md`, aktualisierte UX-/Acceptance-Hinweise | QA-Governance trennt technische interne Acceptance von UX/Product-Freigabe. | Niedrig |
| N101 - E2E scheitert lokal an DB-Verbindung | OFFEN | `npm run test:e2e:multiplayer` | Prisma-E2E bleibt lokal rot, weil PostgreSQL auf `localhost:5432` fehlt. Das ist Infra, aber weiterhin ein ungegruenes Gate. | Mittel |
| N102 - Firebase Parity braucht Emulator-Portbindung | TEILWEISE | `npm run test:firebase:parity` | In Sandbox rot wegen `EPERM`; mit erlaubter lokaler Portbindung gruen. Infra-Abhaengigkeit bleibt. | Niedrig bis mittel |
| N103 - Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | TEILWEISE | `scripts/staging-admin-week-smoke.ts`, `docs/reports/staging-auth-smoke-gate-report.md` | Script und dokumentierter Live-Lauf existieren. In diesem Audit-Lauf war Smoke-Env nicht gesetzt, daher keine frische Live-Bestaetigung. | Mittel |
| N104 - Multiplayer GM Rejoin Browser-Test fehlt | GELÖST | `e2e/multiplayer-firebase.spec.ts` | Browser-E2E prueft Auth, Membership, Team-Zuordnung, stale `lastLeagueId`, Reload und Rejoin. | Niedrig |
| N105 - Admin Week E2E Reload-Test fehlt | GELÖST | `e2e/multiplayer-firebase.spec.ts` | Browser-E2E prueft Admin Week Simulation, Results, Standings, Reload und doppelte Simulation. | Niedrig |
| N106 - Tests fuer parallele Multiplayer-Aktionen fehlen | TEILWEISE | Join-/Ready-/Draft-/Week Promise.all Tests, Firebase E2E | Kritische Parallelfaelle sind deutlich besser getestet. Nicht alle Firestore-Race-Cases werden als echte parallele Client-Transactions im Browser abgedeckt. | Mittel |
| N112 - QA-Gruen und E2E-Rot widersprechen sich | GELÖST | `docs/reports/qa-release-gates.md` | Release-Gates definieren, dass E2E-/Staging-Rot nicht durch Unit-Gruen ueberstimmt wird. | Niedrig |
| N118 - Staging Smoke kann an IAM `signJwt` scheitern | TEILWEISE | `scripts/staging-admin-week-smoke.ts`, Staging-Smoke Reports | IAM-Anforderungen und Token-Wege sind dokumentiert. Es bleibt eine externe Berechtigungs-/Credential-Abhaengigkeit. | Mittel |

## Core-Loop-Einschaetzung

**Core Loop: stabil fuer lokale Firebase-QA, noch nicht production-hart.**

Was stabil wirkt:

- Join/Rejoin legt Membership, Mirror und Team-Zuordnung konsistent an.
- Stale `lastLeagueId` wird im Browser-E2E bereinigt.
- Ready-State wird aus aktiven Participants abgeleitet und waehrend Simulation gesperrt.
- Week-Simulation prueft Schedule, Teams, Roster, Draft-Completion und Ready.
- Results, Standings, `completedWeeks` und `currentWeek` werden transaktional gespeichert.
- Reload zeigt Results/Standings im Browser-E2E stabil.
- Doppelte Admin-Simulation wird mit `week_already_simulated` blockiert.

Was noch nicht hart genug ist:

- Draft-State und Week-State bleiben als mehrere persistierte Signale modelliert.
- Simulation-Locks haben keinen sichtbaren stale-lock Recovery-/TTL-Pfad.
- Staging-Smoke war in diesem Audit-Lauf nicht erneut live ausfuehrbar.
- Prisma-E2E bleibt lokal infra-rot.

## Source-of-Truth-Bewertung

| Bereich | Bewertung | Kommentar |
|---|---|---|
| Week State | TEILWEISE | `completedWeeks` ist kanonisch fuer Completion, aber `weekStatus`, `lastSimulatedWeekKey` und `matchResults` bleiben Projektionen/Legacy-Signale. |
| Draft State | TEILWEISE | Transaktionale Pick-Docs und Available-Player-Docs schuetzen Race-Faelle; Draft-Readmodel bleibt auf mehrere Quellen verteilt. |
| Ready State | GELÖST | Membership `ready` plus aktive Participant-Ableitung ist ausreichend klar; Lock-/Week-/Draft-Guards blocken kritische Writes. |

## Race-Condition-Bewertung

| Bereich | Bewertung | Kommentar |
|---|---|---|
| Draft Picks | TEILWEISE | Doppelte Picks und stale Pick Slots werden blockiert; echte Firestore-Parallelitaet ist besser, aber nicht vollstaendig erschlagen. |
| Week Simulation | TEILWEISE | Normale Parallel-/Doppelklick-Faelle sind blockiert; stale Lock nach Prozessabbruch bleibt offenes Risiko. |
| Ready Toggles | GELÖST | Expected Step, Simulation Lock und Week Status verhindern die kritischen Kollisionen. |
| Join/Team Assignment | GELÖST | Firestore Transaction und E2E/Repository-Tests bestaetigen unterschiedliche Teamzuordnung. |

## Testbewertung

Die Tests decken mehr als Happy Paths ab:

- Draft: duplicate picks, stale same-team picks, Promise.all pick races, unavailable player, idempotent finalization.
- Week: missing schedule, invalid week, missing team, empty roster, duplicate week, simulating lock, standings, multiple games.
- Ready: set/unset, parallel local ready toggles, simulating/completed/draft blocked.
- Browser E2E: Firebase Join/Rejoin, stale `lastLeagueId`, membership/team assignment, ready sync, forbidden cross-user writes, Admin Week Simulation, Results/Standings Reload, duplicate simulation blocked.

Testluecken:

- Prisma-E2E konnte nicht laufen, weil lokale DB fehlt.
- Staging-Smoke wurde nicht erneut live ausgefuehrt, weil keine Smoke-Credentials/Token-Env im Prozess vorhanden waren.
- Firestore-Concurrency fuer Draft/Ready ist nicht als eigenstaendiger Mehr-Client-Transaction-Test isoliert.
- Stale Simulation Lock Recovery wird nicht getestet.

## Offene Risiken Max 10

1. **Stale Week-Simulation-Lock**: Prozessabbruch nach Lock-Start kann `simulating` blockierend stehenlassen.
2. **Week-State bleibt redundant**: `completedWeeks`, `lastSimulatedWeekKey`, `weekStatus` und Results koennen weiterhin auseinanderlaufen; Konflikte werden erkannt, nicht migriert.
3. **Draft-Readmodel bleibt verteilt**: Draft Doc, Picks, Available Players und Legacy Fallbacks erfordern weiterhin sehr disziplinierte Writes.
4. **Staging-Smoke nicht frisch bestaetigt**: vorhandene Reports sind gruen, aber dieser Audit-Lauf hatte keine Live-Credentials.
5. **Prisma-E2E infra-rot**: lokale DB fehlt, daher kein vollstaendiges E2E-Gesamtsignal.
6. **No-Roster-/No-Team Matrix nicht komplett browsergetestet**: Guards existieren, aber Direktaufrufe aller Unterseiten sind nicht umfassend live abgedeckt.
7. **Admin-zentrierter Week-Flow**: GM-Fortschritt bleibt vom Admin abhaengig; fuer interne Liga okay, fuer echtes Produkt fragil.
8. **Compatibility-Fallbacks koennen Fehler verdecken**: Legacy-Signale werden weiter toleriert; das schuetzt alte Daten, kann aber echte Datenpflege-Probleme leiser machen.
9. **Firestore Rules Warnungen im E2E sind erwartete Negativtests, aber laut**: PERMISSION_DENIED ist im Test gewollt, kann jedoch Log-Auswertung vernebeln.
10. **Dirty Worktree**: Der Audit bewertet einen stark geaenderten, uncommitteten Stand; Release-Entscheidungen brauchen einen sauberen Commit.

## Entstandene Unnoetige Komplexitaet

- `completedWeeks` ist kanonisch, aber alte Felder bleiben aktiv genug, dass Resolver und Konfliktlogik noetig sind.
- Draft-Schutz verteilt sich ueber `draftRunId`, Pick-Dokument-ID, Available-Player-Subcollection, Draft Doc und Legacy Blob-Fallback.
- Ready-State wird sauberer abgeleitet, muss aber gleichzeitig League-Status, Draft-Status, Week-Status und Lock-Dokument pruefen.
- Admin Week Simulation nutzt eine zweistufige Lock-Transaction plus Simulation-Transaction; das ist robust gegen Doppelklicks, aber erzeugt stale-lock Komplexitaet.
- QA-Governance ist nun klarer, aber mehrere Reports koennen weiterhin stale werden, wenn Gate-Status nicht zentral aktualisiert wird.

## Ausgefuehrte Checks

| Command | Ergebnis | Hinweis |
|---|---|---|
| `npx tsc --noEmit` | Gruen | Keine TypeScript-Fehler. |
| `npm run lint` | Gruen | Keine ESLint-Fehler. |
| `npx vitest run src/lib/online/fantasy-draft-service.test.ts src/lib/online/multiplayer-draft-logic.test.ts src/lib/online/online-league-week-simulation.test.ts src/lib/admin/online-week-simulation.test.ts src/lib/online/online-league-lifecycle.test.ts src/lib/online/online-league-service.test.ts src/components/online/online-league-detail-model.test.ts src/components/online/online-league-dashboard-panels.test.tsx src/lib/online/repositories/online-league-repository.test.ts` | Gruen | 9 Testdateien, 133 Tests. |
| `npm run test:firebase:parity` | Gruen nach Wiederholung ausserhalb Sandbox | Erster Sandbox-Lauf scheiterte an Emulator-Port `EPERM`; Wiederholung mit Portzugriff: 3 Tests gruen. |
| `npm run test:e2e:multiplayer` | Rot / Infra | PostgreSQL auf `localhost:5432` nicht erreichbar. |
| `npm run test:e2e:multiplayer:firebase` | Gruen | 2 Browser-Tests gruen: Join/Rejoin/Ready und Admin Week Simulation/Reload. |
| Staging Smoke | Nicht ausgefuehrt | `CONFIRM_STAGING_SMOKE`, Testlogin/Token waren im Prozess nicht gesetzt. Vorhandene Staging-Reports dokumentieren einen frueheren gruenen Lauf. |

## Finale Entscheidung

| Ziel | Entscheidung | Begruendung |
|---|---|---|
| Internal MVP | **Go** | Der Core Loop ist lokal mit Firebase-Emulator und fokussierten Tests stabil genug fuer interne Nutzung. |
| Staging QA | **Go mit Gate** | Go, sobald der authentifizierte Staging-Smoke fuer den konkreten Ziel-Commit erneut gruen ist. Ohne frischen Smoke nur Teil-Go. |
| Production | **No-Go** | Production braucht frischen Staging-Smoke, sauberen Release-Commit, verifizierte Production-Ziele und Loesung/akzeptierten Umgang mit offenen Teilrisiken. |

