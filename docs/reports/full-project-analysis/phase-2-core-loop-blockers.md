# Phase 2 Core Loop Blockers

Quelle: `docs/reports/full-project-analysis/master-findings-table.md`

Core Loop: Lobby -> Draft -> Ready -> Simulation -> Ergebnis

Anzahl Blocker: 20

Regel: Aufgenommen wurden Findings, die den Core Game Loop direkt blockieren oder konsistent brechen koennen. Findings mit nur indirektem Wartungs-, Scope- oder Performance-Risiko wurden nicht aufgenommen.

## Kritischste 5 Probleme

| Rang | ID | Titel | Betroffener Schritt | Warum kritisch |
|---:|---|---|---|---|
| 1 | N033 | Online Join/Rejoin hat viele versteckte Abhaengigkeiten | Lobby | Wenn Join/Rejoin nicht verlaesslich funktioniert, erreicht der Spieler die Liga nicht. |
| 2 | N036 | User-Team-Link hat mehrere Inkonsistenzstellen | Lobby | Ohne eindeutige User-Team-Verbindung fehlen Teamkontext, Rechte und Ready-Faehigkeit. |
| 3 | N048 | Draft State hat mehrere Race- und Truth-Risiken | Draft | Inkonsistenter Draft-State kann Picks, Roster und Draft-Abschluss brechen. |
| 4 | N087 | Week Simulation kann doppelt oder parallel laufen | Simulation | Doppelte Simulation kann Ergebnisse, Records und Week Progression korrumpieren. |
| 5 | N090 | Week Status hat doppelte Wahrheit | Ergebnis | Wenn Week-Status und Results auseinanderlaufen, ist der Ergebniszustand nicht verlaesslich. |

## Gruppierung nach Flow-Schritt

| Flow-Schritt | Blocker |
|---|---|
| Lobby | N033, N034, N035, N036, N038, N067, N085 |
| Draft | N045, N048, N086 |
| Ready | N039, N093 |
| Simulation | N041, N061, N068, N069, N087, N088, N091 |
| Ergebnis | N090 |

## Lobby Blocker

### N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten
- Beschreibung: Join/Rejoin haengt von lastLeagueId, Membership, Mirror, Team-Zuordnung und assignedUserId ab.
- Warum es den Core Loop blockiert: Der Core Loop startet in der Lobby. Wenn Join oder Rejoin nicht stabil ist, kommt der Nutzer nicht verlaesslich in die Liga und kann Draft, Ready oder Simulation nicht erreichen.
- Betroffene Dateien: Online Hub, Online League Services, Membership Services
- Ursache: Join/Rejoin ist kein einzelner transaktionaler Use Case mit klaren Invarianten.

### N034 - Fehlende Membership kann Nutzer in Schleifen fuehren
- Beschreibung: Fehlende oder kaputte Membership kann Nutzer ohne Fortschritt zurueckfuehren oder blockieren.
- Warum es den Core Loop blockiert: Ohne gueltige Membership darf die Liga nicht geladen werden. Der Nutzer bleibt vor oder in der Lobby haengen.
- Betroffene Dateien: Online Hub, Route State, Membership Recovery
- Ursache: Fehlende Membership ist nicht als expliziter Recovery-State modelliert.

### N035 - Fehlende Team-Zuordnung blockiert Multiplayer
- Beschreibung: Eingeloggte Nutzer ohne Team-Zuordnung landen in einem schwer erklaerbaren Zustand.
- Warum es den Core Loop blockiert: Ohne Team hat der GM keinen Roster-, Ready- oder Draft-Kontext. Der gesamte Spielerpfad nach der Lobby ist blockiert.
- Betroffene Dateien: Online Hub, Team Linking, Team Assignment
- Ursache: Membership und Team Assignment sind nicht atomar abgesichert.

### N036 - User-Team-Link hat mehrere Inkonsistenzstellen
- Beschreibung: User-Team-Verbindung kann zwischen Membership, Mirror und Team-Feldern auseinanderlaufen.
- Warum es den Core Loop blockiert: Der User-Team-Link bestimmt, welches Team der Nutzer steuert. Wenn diese Verbindung inkonsistent ist, koennen Liga laden, Ready setzen und Teamansichten fehlschlagen.
- Betroffene Dateien: League Memberships, leagueMembers, Team Documents
- Ursache: User-Team-Zuordnung ist ueber mehrere Sources of Truth verteilt.

### N038 - Team Assignment kann Race Conditions erzeugen
- Beschreibung: Gleichzeitige Join-Aktionen koennen dasselbe Team beanspruchen.
- Warum es den Core Loop blockiert: Doppelt vergebene Teams zerstoeren den Lobby- und Teamkontext fuer mindestens einen Spieler und koennen spaetere Ready-/Simulation-Zustaende verfälschen.
- Betroffene Dateien: Join/Rejoin Team Assignment
- Ursache: Team-Zuweisung braucht transaktionale Reservierung.

### N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende
- Beschreibung: Teamseiten brauchen Fallbacks bei fehlendem Team oder Roster.
- Warum es den Core Loop blockiert: Ohne Team- oder Roster-Kontext kann der Spieler Draft-Ergebnis, Roster und Ready-Vorbereitung nicht sinnvoll pruefen.
- Betroffene Dateien: Team Overview, Roster, Depth Chart
- Ursache: Teamseiten setzen implizit gueltige Daten voraus.

### N085 - Stale `lastLeagueId` kann Nutzer blockieren
- Beschreibung: Lokaler League-State kann auf ungueltige Liga zeigen.
- Warum es den Core Loop blockiert: Ein veralteter Lobby-Einstieg kann den Nutzer in eine falsche oder nicht ladbare Liga fuehren und Rejoin verhindern.
- Betroffene Dateien: LocalStorage, Online Hub
- Ursache: LocalStorage wird als Einstiegspunkt genutzt, ohne immer zu normalisieren.

## Draft Blocker

### N045 - Active Draft darf nicht automatisch Fullscreen oeffnen
- Beschreibung: Draft darf nur explizit geoeffnet werden.
- Warum es den Core Loop blockiert: Automatische Draft-Navigation kann den Spieler aus dem Dashboard oder dem naechsten notwendigen Flow-Schritt reissen und den Uebergang Lobby -> Draft unkontrolliert machen.
- Betroffene Dateien: Online Draft Route, Dashboard Navigation
- Ursache: Navigation kann an Draft-Status statt Nutzeraktion gekoppelt sein.

### N048 - Draft State hat mehrere Race- und Truth-Risiken
- Beschreibung: Draft-Daten liegen in Subcollections, Picks, Available Players und Meta-Feldern.
- Warum es den Core Loop blockiert: Der Draft ist ein expliziter Core-Loop-Schritt. Wenn Picks, verfuegbare Spieler oder Finalisierung auseinanderlaufen, entstehen kaputte Roster oder ein nicht abschliessbarer Draft.
- Betroffene Dateien: Draft Firestore Model, Draft Pick Logic, Draft Finalization
- Ursache: Draft State ist verteilt und braucht transaktionale Invarianten.

### N086 - Draft Pick und Draft State koennen parallel kollidieren
- Beschreibung: Doppelklicks oder parallele Pick Requests koennen Draft-State korrumpieren.
- Warum es den Core Loop blockiert: Parallele Picks koennen denselben Spieler mehrfach vergeben, falsche Teams weiterziehen oder den Draftfortschritt blockieren.
- Betroffene Dateien: Draft Pick Logic, Draft Services
- Ursache: Pick-Operationen brauchen eindeutige Transaktions- und Lock-Invarianten.

## Ready Blocker

### N039 - Ready-State braucht konsistente Persistenz und Anzeige
- Beschreibung: Ready ist UI- und Simulationsvoraussetzung und muss konsistent gespeichert und angezeigt werden.
- Warum es den Core Loop blockiert: Ready ist der direkte Uebergang von Teamvorbereitung zu Simulation. Wenn Ready nicht stimmt, startet Simulation zu frueh, zu spaet oder gar nicht.
- Betroffene Dateien: Online Dashboard, Ready State, Week Simulation
- Ursache: Ready-State ist ueber UI, Membership/Team State und Week Preconditions verteilt.

### N093 - Ready waehrend Simulation ist Race-Risiko
- Beschreibung: Ready-State kann parallel zu Simulation geaendert werden.
- Warum es den Core Loop blockiert: Wenn Ready waehrend Simulation mutiert, ist unklar, welche Teams fuer die simulierte Woche zaehlen. Das kann Simulation und Ergebniszustand verfälschen.
- Betroffene Dateien: Ready State, Week Simulation
- Ursache: Ready-State und Simulation-Lock sind nicht strikt abgegrenzt.

## Simulation Blocker

### N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab
- Beschreibung: Wochenfortschritt im Multiplayer ist von Admin-Simulation abhaengig.
- Warum es den Core Loop blockiert: Wenn der Admin-Week-Flow unklar oder nicht ausgefuehrt wird, bleibt der GM nach Ready stehen und erreicht keine Ergebnisse.
- Betroffene Dateien: Week Flow, Admin API, Online Dashboard
- Ursache: Multiplayer-Week-Progression ist adminzentriert.

### N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten
- Beschreibung: Zwischen Multiplayer-Teamdaten und Engine-Daten besteht eine semantische Luecke.
- Warum es den Core Loop blockiert: Die Simulation braucht valide Team- und Spieleradapter. Wenn Online-Daten nicht zur Engine passen, kann die Woche nicht korrekt simuliert werden.
- Betroffene Dateien: Game Engine, Online Simulation Adapter, Online Services
- Ursache: Stabiler Adaptervertrag zwischen Online-Daten und Engine-Modell fehlt.

### N068 - Week Simulation braucht gueltigen Schedule
- Beschreibung: Ohne gueltigen Schedule kann keine Woche simuliert werden.
- Warum es den Core Loop blockiert: Schedule ist die Eingangsdatenquelle fuer Simulation. Ohne Games der aktuellen Woche gibt es keine Simulation und keine Ergebnisse.
- Betroffene Dateien: Week Simulation, League Schedule
- Ursache: Schedule ist notwendige Datenvoraussetzung, aber kein zentral sichtbarer Readiness-State.

### N069 - Week Simulation braucht vorhandene Teams
- Beschreibung: Fehlende Teams blockieren Week Simulation.
- Warum es den Core Loop blockiert: Simulationsspiele koennen nicht ausgefuehrt werden, wenn referenzierte Teams fehlen oder unvollstaendig sind.
- Betroffene Dateien: Week Simulation, Teams
- Ursache: Teamdaten sind notwendige Simulationsvoraussetzung.

### N087 - Week Simulation kann doppelt oder parallel laufen
- Beschreibung: Zwei Admins oder parallele Requests koennen dieselbe Woche simulieren.
- Warum es den Core Loop blockiert: Parallele Simulation kann doppelte Ergebnisse, doppelte Records oder falschen Week Advance erzeugen.
- Betroffene Dateien: Week Simulation, Admin API, Week Simulation Lock
- Ursache: Atomarer Lock und Idempotenz pro Liga/Woche fehlen oder sind kritisch.

### N088 - Multiplayer hat viele parallele Statusfelder
- Beschreibung: Viele Statusfelder erzeugen mehrere potenzielle Sources of Truth.
- Warum es den Core Loop blockiert: Draft, Ready und Simulation haengen an Statusfeldern. Wenn diese widerspruechlich sind, kann der Flow in falschen Gates haengen bleiben.
- Betroffene Dateien: League, Membership, Team, Draft, Week State
- Ursache: Multiplayer Lifecycle ist nicht als zentraler Statusautomat modelliert.

### N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen
- Beschreibung: Week Advance muss erst nach erfolgreicher Persistierung erfolgen.
- Warum es den Core Loop blockiert: Wenn die Woche weiterzaehlt, bevor Ergebnisse gespeichert sind, verliert der Flow den Bezug zwischen Simulation und Ergebnis.
- Betroffene Dateien: Week Simulation Service
- Ursache: Week Advance und Result Persistierung muessen atomar gekoppelt sein.

## Ergebnis Blocker

### N090 - Week Status hat doppelte Wahrheit
- Beschreibung: Week Status, completedWeeks, lastSimulatedWeek und Results koennen auseinanderlaufen.
- Warum es den Core Loop blockiert: Der Ergebnis-Schritt muss eindeutig wissen, welche Woche simuliert wurde. Doppelte Wahrheit kann Ergebnisse, Standings und naechste Woche widerspruechlich machen.
- Betroffene Dateien: League Week Fields, Results, Standings
- Ursache: Week-Completion wird in mehreren Feldern abgebildet.
