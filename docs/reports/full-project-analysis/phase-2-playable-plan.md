# Phase 2 Playable Plan

Quellen:
- `docs/reports/full-project-analysis/work-packages.md`
- `docs/reports/full-project-analysis/phase-2-core-loop-blockers.md`
- `docs/reports/full-project-analysis/phase-2-top-problems.md`

Ziel: Minimaler Weg zu einer spielbaren Version.

Definition spielbar:
Ein Spieler kann ein Team haben, den Draft durchlaufen, Ready klicken, Simulation sehen und Ergebnisse sehen.

## Minimale Reihenfolge der Work Packages

### 1. WP-01 - User-Team-Linking und Join/Rejoin stabilisieren
- Muss erledigt werden: Join/Rejoin muss immer eine gueltige Membership, Mirror-Verbindung und Team-Zuordnung liefern.
- Warum minimal notwendig: Ohne Team und League-Kontext startet der Core Loop nicht.
- Erwartetes Ergebnis: Spieler kommt verlaesslich aus der Lobby in seine Liga und sieht sein Team.

### 2. WP-04 - Draft State und Pick-Transaktionen haerten
- Muss erledigt werden: Draft darf keine doppelten Picks, falschen Teams oder inkonsistenten Available-Player-State erzeugen.
- Warum minimal notwendig: Der Draft erzeugt die spielbaren Roster.
- Erwartetes Ergebnis: Spieler kann den Draft durchlaufen oder einen abgeschlossenen Draft korrekt laden.

### 3. WP-05 - Ready-State konsistent machen
- Muss erledigt werden: Ready setzen, anzeigen und fuer Simulation auswerten muss eindeutig funktionieren.
- Warum minimal notwendig: Ready ist der direkte Uebergang von Teamvorbereitung zu Simulation.
- Erwartetes Ergebnis: Spieler kann Ready klicken und sieht danach den richtigen Ready-Status.

### 4. WP-03 - Week Simulation atomar und idempotent absichern
- Muss erledigt werden: Schedule, Teams, Simulation Lock, Results, Standings und currentWeek muessen konsistent verarbeitet werden.
- Warum minimal notwendig: Ohne stabile Simulation gibt es keinen Fortschritt und keine Ergebnisse.
- Erwartetes Ergebnis: Admin/Server kann eine Woche genau einmal simulieren; Ergebnisse und Standings bleiben nach Reload sichtbar.

### 5. WP-06 - Team-/Roster-Fallbacks und League Load Guards stabilisieren
- Muss erledigt werden: Reload, Direktaufruf und fehlende Daten duerfen nicht in kaputten Seiten enden.
- Warum minimal notwendig: Spielbarkeit bedeutet auch, dass der Spieler nach Reload weiterkommt.
- Erwartetes Ergebnis: Dashboard, Roster, Depth Chart, Draft, Results und Standings laden stabil oder zeigen klare Fallbacks.

### 6. WP-08 - Kritische E2E-/Smoke-Release-Gates ergaenzen
- Muss erledigt werden: Minimaltests fuer Join/Rejoin, Draft, Ready, Week Simulation und Results Reload.
- Warum minimal notwendig: Ohne diese Tests ist die spielbare Version nicht verifizierbar.
- Erwartetes Ergebnis: Ein reproduzierbarer Smoke bestaetigt den gesamten Core Loop.

## Was MUSS erledigt werden

- Ein User hat nach Join/Rejoin genau ein gueltiges Team.
- Membership, Mirror und Team-Zuordnung stimmen ueberein.
- Draft kann ohne doppelte Picks oder kaputte Roster abgeschlossen werden.
- Ready-State ist eindeutig und persistiert.
- Simulation laeuft nur mit gueltigem Schedule und gueltigen Teams.
- Simulation kann nicht doppelt fuer dieselbe Woche gespeichert werden.
- Results, Standings und currentWeek sind nach Simulation und Reload konsistent.
- Reload auf Core-Loop-Seiten funktioniert.
- Minimaler E2E-/Smoke-Test deckt den kompletten Pfad ab.

## Was bewusst ignoriert wird

- Contracts/Cap
- Development
- Trade Board
- Inbox
- Finance
- Offline-Nebenfeatures
- grosse Engine-Refactors
- allgemeine Bundle-Optimierung
- Admin-UI-Polish ausserhalb der Simulation
- vollstaendige Production-Deployment-Vorbereitung
- umfassende Mobile-/A11y-Optimierung
- allgemeiner Code-Cleanup

## Erwartetes Ergebnis

Nach diesen 6 Schritten ist die Multiplayer-Version minimal spielbar:

1. Spieler tritt Liga bei oder joint erneut.
2. Spieler sieht sein Team und den Roster-Kontext.
3. Draft ist aktiv nutzbar oder abgeschlossen korrekt geladen.
4. Spieler setzt Ready.
5. Woche wird serverseitig simuliert.
6. Ergebnisse, Standings und naechste Woche bleiben nach Reload sichtbar.

Alles ausserhalb dieses Pfads bleibt eingefroren, deaktiviert oder nachrangig.
