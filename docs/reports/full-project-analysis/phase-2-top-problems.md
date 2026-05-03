# Phase 2 Top Problems

Quellen:
- `docs/reports/full-project-analysis/master-findings-table.md`
- `docs/reports/full-project-analysis/phase-2-root-cause-clusters.md`
- `docs/reports/full-project-analysis/phase-2-core-loop-blockers.md`

Ziel: Die gesamte Findings-Liste auf die wichtigsten Ursachenprobleme reduzieren.

## Finale Top 10

### 1. Multiplayer-State ist nicht als zentrale State Machine modelliert
- Ursache: Lobby, Draft, Ready, Simulation und Ergebnis werden aus vielen verteilten Statusfeldern, Dokumenten und lokalen Zuständen zusammengesetzt.
- Betroffene Findings: N036, N037, N039, N048, N088, N089, N090, N091, N093
- Warum kritisch: Der Core Loop kann in jedem Schritt in widerspruechliche Zustaende geraten, zum Beispiel Ready angezeigt aber nicht simulierbar, Draft abgeschlossen aber UI gesperrt, Ergebnisse gespeichert aber Week-State nicht synchron.
- Impact auf Spielbarkeit: Sehr hoch. Betrifft Ready, Simulation und Ergebnis direkt.
- Empfehlung: State fixen: Kanonische Multiplayer-State-Machine definieren und daraus UI-Gates, API-Validierung und Firestore-Projektionen ableiten.

### 2. User-Team-Verbindung ist nicht robust genug
- Ursache: User, Membership, globaler Mirror, TeamId, assignedUserId und localStorage werden nicht als atomare, validierte Verbindung behandelt.
- Betroffene Findings: N033, N034, N035, N036, N037, N038, N085
- Warum kritisch: Ein eingeloggter Spieler kann ohne gueltige Membership oder Team-Zuordnung nicht verlaesslich in die Liga gelangen.
- Impact auf Spielbarkeit: Sehr hoch. Blockiert den Core Loop bereits in der Lobby.
- Empfehlung: State fixen: Join/Rejoin als atomaren Use Case mit Transaktion, Mirror-Sync, Team-Validierung und Recovery-Fallback implementieren.

### 3. Week Simulation ist nicht ausreichend gegen inkonsistente oder parallele Writes abgesichert
- Ursache: Simulation, Result Persistierung, currentWeek-Advance und Locks sind als kritische atomare Operationen markiert, aber die Findings zeigen weiterhin Race- und Truth-Risiken.
- Betroffene Findings: N041, N068, N069, N087, N090, N091, N093
- Warum kritisch: Doppelte oder halb gespeicherte Simulationen koennen Ergebnisse, Standings und naechste Woche korrumpieren.
- Impact auf Spielbarkeit: Sehr hoch. Blockiert oder verfaelscht Simulation und Ergebnis.
- Empfehlung: State fixen: Week Simulation pro Liga/Woche strikt transaktional, idempotent und lock-basiert ausfuehren; Readiness vorab validieren.

### 4. Draft-State ist verteilt und race-anfaellig
- Ursache: Draft-Daten liegen in mehreren Subcollections und Meta-Feldern. Picks, verfuegbare Spieler, Finalisierung und Roster-Update brauchen gemeinsame Invarianten.
- Betroffene Findings: N044, N045, N046, N047, N048, N086
- Warum kritisch: Draft ist ein Core-Loop-Schritt. Parallele Picks, falsche Navigation oder inkonsistente Draft-Finalisierung koennen Roster und Teamvorbereitung brechen.
- Impact auf Spielbarkeit: Hoch bis sehr hoch. Der Core Loop kommt nicht stabil von Lobby zu Ready.
- Empfehlung: State fixen: Draft-Pick und Draft-Finalisierung mit Transaktionen, eindeutigen Guards und klarer UI-Statusdarstellung absichern.

### 5. Online-/Multiplayer-Code ist zu monolithisch und stark gekoppelt
- Ursache: Online Service, Online UI, Route-State, Repository, Domain und Persistence sind eng verwoben. Fachliche Use Cases sind nicht klar getrennt.
- Betroffene Findings: N002, N005, N023, N056, N057, N075, N088
- Warum kritisch: Jede Aenderung an Multiplayer-Flow, State oder UI hat hohe Regressiongefahr. Fehlerbehebung wird langsam und riskant.
- Impact auf Spielbarkeit: Hoch. Nicht jeder Monolith blockiert direkt, aber er erschwert jeden Core-Loop-Fix.
- Empfehlung: Refactoring: Kleine Use-Case-Module fuer Join/Rejoin, Draft, Ready, Week und Results schaffen; `subscribeToLeague` nach Datenbedarf aufteilen.

### 6. Admin-/Simulation-Flow ist zu breit und sicherheitskritisch
- Ursache: Admin UI und Admin Actions mischen Uebersicht, Debug, Mutationen, Simulation und Firestore-Zugriffe. Mutierende Aktionen sind kritische Pfade fuer Week Progression.
- Betroffene Findings: N006, N007, N040, N041, N053, N054, N096
- Warum kritisch: Der Multiplayer-Loop haengt fuer Simulation stark am Admin-Flow. Unklare oder zu breite Admin-Aktionen koennen Daten falsch veraendern oder den Flow fuer GMs stoppen.
- Impact auf Spielbarkeit: Hoch. Besonders relevant fuer Simulation und Week Progression.
- Empfehlung: Refactoring: Admin Use Cases von UI trennen; Simulation, Woche abschliessen und Debug getrennt darstellen; mutierende Actions serverseitig mit Confirm und Guard absichern.

### 7. Test- und Release-Gates decken kritische Multiplayer-Flows nicht ausreichend ab
- Ursache: Authenticated Staging Smoke, GM Rejoin, Admin Week Reload, Concurrency, Rules, Seed/Reset und E2E-Infrastruktur sind nicht voll reproduzierbar abgesichert.
- Betroffene Findings: N101, N102, N103, N104, N105, N106, N107, N109, N112
- Warum kritisch: Core-Loop-Regressionen koennen unbemerkt bleiben, obwohl Unit- oder Build-Checks gruen sind.
- Impact auf Spielbarkeit: Hoch. Fehler erscheinen erst live oder in Staging statt vor dem Merge.
- Empfehlung: Refactoring: Release-Gate-Suite definieren: E2E DB Setup stabilisieren, authenticated Staging Smoke, GM Rejoin, Admin Week Reload und Concurrency Tests verpflichtend machen.

### 8. Firestore-Datenmodell und Subscriptions skalieren schlecht
- Ursache: `subscribeToLeague` liest zu viele Datenbereiche, League-Dokumente koennen wachsen, Results/Standings koennen teuer rekonstruiert werden.
- Betroffene Findings: N075, N076, N077, N078, N079, N081, N082, N083
- Warum kritisch: Breite Listener und wachsende Dokumente koennen Performance, Kosten und Datenfrische beeintraechtigen.
- Impact auf Spielbarkeit: Mittel bis hoch. Nicht sofort blockierend, aber relevant fuer Lobby, Draft und Ergebnisanzeige.
- Empfehlung: Refactoring: View-spezifische Firestore Reads, kleinere Subscriptions und persistierte Read Models fuer Standings/Results einfuehren.

### 9. Security-/Admin-Modell ist nicht voll harmonisiert
- Ursache: UI/API koennen Admin-UID-Allowlist und Claims nutzen, Firestore Rules erwarten teilweise Custom Claims. Scripts und Admin-Actions besitzen eigene Guard-Anforderungen.
- Betroffene Findings: N017, N028, N058, N092, N107, N119
- Warum kritisch: Unterschiedliche Berechtigungsmodelle koennen Adminzugriff unerwartet blockieren oder Schreibpfade unsauber absichern.
- Impact auf Spielbarkeit: Mittel bis hoch. Trifft vor allem Admin-Simulation und Datenreparatur.
- Empfehlung: Refactoring: Einheitliches Admin-Autorisierungsmodell fuer UI, API, Rules und Scripts definieren; Rules-Tests ergaenzen.

### 10. Produktumfang und UI zeigen mehr als der MVP stabil traegt
- Ursache: Nicht-MVP-Features sind sichtbar, Coming-Soon-Bereiche konkurrieren mit Core-Loop-Pfaden, und einige UI-Aktionen sind redundant oder technisch formuliert.
- Betroffene Findings: N030, N042, N043, N050, N051, N052, N062, N063, N065, N066, N095, N097, N098, N099
- Warum kritisch: Spieler koennen in unfertige oder unklare Bereiche abbiegen und den Eindruck bekommen, das Spiel sei kaputt, obwohl der Core Loop gemeint ist.
- Impact auf Spielbarkeit: Mittel. Der Flow wird verwirrender, auch wenn nicht jeder Punkt technisch blockiert.
- Empfehlung: UI entfernen/deaktivieren: Nicht-MVP-Pfade nachrangig oder deaktiviert darstellen, Terminologie vereinheitlichen und Dashboard auf naechsten Core-Loop-Schritt fokussieren.
