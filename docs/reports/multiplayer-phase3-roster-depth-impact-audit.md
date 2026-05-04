# Multiplayer Phase 3 Roster / Depth Impact Audit

Stand: 2026-05-04

## Executive Summary

Status: Management-Entscheidungen wirken **Ja, aber MVP-begrenzt**.

Vor diesem Audit war Roster-Staerke bereits teilweise wirksam: `simulateOnlineGame(...)`
uebergibt ein aus Online-Rostern abgeleitetes Teamrating an die bestehende
Minimal-Match-Engine. Die Ableitung war aber nur der Durchschnitt aller aktiven
Roster-Spieler. Depth Chart wurde vor Simulation validiert, hatte aber keinen
direkten Einfluss auf Teamstaerke.

Nach dem Minimal-Fix gilt:

- Spielerwerte (`overall`) beeinflussen Score, Stats und Gewinner ueber `MinimalMatchTeam.rating`.
- Depth-Chart-Starter werden fuer das Teamrating staerker gewichtet als Backups.
- Aktive Spieler ohne Depth-Chart-Slot zaehlen nur mit Reservegewicht.
- Fehlender aktiver QB-Starter gibt einen MVP-Penalty auf die Teamstaerke.
- `released` und `free_agent` Spieler werden nicht fuer die Simulation gezaehlt.
- Fehlende aktive Roster erzeugen weiterhin einen dokumentierten Rating-Fallback `70`.
- Verletzungen/Sperren sind im Online-Contract-Player-Modell noch nicht als eigene Statuswerte modelliert; sie koennen daher noch nicht fachlich simuliert werden.

## Gepruefte Kette

| Bereich | Befund | Evidenz |
| --- | --- | --- |
| Roster Datenmodell | Online-Spieler haben `overall`, `position`, `status` und Vertrags-/Entwicklungdaten. | `src/lib/online/online-league-types.ts`, `OnlineContractPlayer` |
| Depth Chart Model | Online-Depth-Chart speichert Starter und Backups je Position. | `src/lib/online/online-league-types.ts`, `OnlineDepthChartEntry` |
| Draft Integration | Abgeschlossener Draft schreibt Pick-Spieler in `contractRoster` und erzeugt eine Depth Chart. | `src/lib/admin/online-admin-firestore-draft-use-cases.ts`, `src/lib/admin/online-admin-draft-use-cases.ts` |
| Simulation Input | Online-Teams werden auf `MinimalMatchTeam` mit `rating` adaptiert. | `src/lib/online/online-game-simulation.ts` |
| Match Engine | `rating` beeinflusst Score, Yardage, Turnovers und Tiebreaker. | `src/modules/gameplay/application/minimal-match-simulation.ts` |
| Admin Simulation Guard | Roster und Depth Chart werden vor Simulation validiert. | `src/lib/admin/online-week-simulation.ts` |

## Was Ist Implementiert?

### Wirksam

- Spieler-`overall` wirkt auf Teamrating.
- Teamrating wirkt in der Match Engine auf:
  - Punkte
  - Total Yards
  - Passing/Rushing-Aufteilung
  - Turnover-Druck
  - Tiebreaker
- Drafted Players wirken, sobald der Draft abgeschlossen ist und Roster/Depth Chart in Teamdocs geschrieben wurden.
- Aktive Rosterlosigkeit wird vor Admin-Simulation blockiert.
- Ungueltige oder fehlende Depth Chart wird vor Admin-Simulation blockiert.
- Nach Minimal-Fix hat die Depth Chart selbst Einfluss: Starter zaehlen staerker als Backups.
- Fehlende MVP-Kernpositionen wirken als Teamstaerke-Penalty. Aktuell ist die bewusst enge MVP-Regel: aktiver QB-Starter erforderlich.

### Fake / Nur Anzeige / Begrenzt

- Es gibt keine positionsspezifische Play-Engine. Ein QB wirkt aktuell nur ueber sein `overall`, nicht ueber Passing-Attribute.
- Depth Chart beeinflusst noch keine Play-Auswahl, Targets, Carries oder Snap Counts.
- Verletzte/gesperrte Spieler sind im Online-Modell nicht als eigene Statuswerte vorhanden. Aktuell werden nur `active` Spieler gezaehlt; `released` und `free_agent` fallen raus.
- Training, Chemistry, X-Factors und Coaching sind nicht in die Online-Match-Ratingformel eingerechnet.
- Der lokale Ready-Flow validiert Teamspielbarkeit, aber die detaillierte Admin-Simulation validiert strenger gegen Firestore-Teamdocs.

## Spielerentscheidungen Mit Wirkung

| Entscheidung | Wirkung aktuell |
| --- | --- |
| Draft Pick hoher `overall` | Ja, erhoeht Teamrating nach Draft-Completion. |
| Draft Pick niedriger `overall` | Ja, senkt Teamrating bzw. verbessert weniger. |
| Spieler aus aktivem Roster entfernen | Ja, wenn Status nicht `active` ist, zaehlt er nicht. |
| Depth-Chart-Starter setzen | Ja, Startergewicht beeinflusst Teamrating. |
| Backup-Reihenfolge | Teilweise, alle Backups zaehlen mit Backupgewicht; keine Snap-Reihenfolge. |
| Positionelle Balance | Teilweise. Fehlender aktiver QB-Starter senkt Teamrating; weitere Positionsgruppen sind noch nicht einzeln gewichtet. |
| Verletzung/Sperre managen | Nein, Online-Modell hat dafuer noch keinen belastbaren Status. |

## Minimal-Fix

Umgesetzt:

- `adaptOnlineTeamToSimulationTeam(...)` berechnet Teamrating jetzt aus aktivem Roster plus Depth Chart.
- Startergewicht: `2.5`
- Backupgewicht: `0.75`
- Reservegewicht fuer aktive Spieler ausserhalb der Depth Chart: `0.35`
- Fehlender aktiver QB-Starter: `-8` Teamrating.
- Ohne Depth Chart bleibt der bisherige aktive Roster-Durchschnitt erhalten.
- Ohne aktives Roster bleibt der bestehende Fallback `70` mit Warnung erhalten.

Tests:

- `src/lib/online/online-game-simulation.test.ts`
  - Roster-Durchschnitt bleibt wirksam.
  - High-Overall-Starter erzeugt hoeheres Rating als Low-Overall-Starter.
  - Fehlender QB-Starter erzeugt den erwarteten Penalty.
  - Ein deutlich staerkeres Depth-Chart-Team gewinnt in einer seeded Serie haeufiger.
  - Seeded Ergebnisse bleiben reproduzierbar.
  - `released` und `free_agent` Spieler werden ignoriert.
  - Fallback-Warnungen bleiben serialisierbar.

## Balancing-Notizen

- Die Ratingableitung ist absichtlich grob: Sie soll Management-Entscheidungen im MVP spuerbar machen, nicht Football vollstaendig modellieren.
- Startergewicht `2.5` sorgt dafuer, dass ein Starter-Tausch deutlich sichtbar ist.
- Backupgewicht `0.75` haelt Kader-Tiefe relevant, ohne Starter zu entwerten.
- Reservegewicht `0.35` verhindert, dass nicht gesetzte aktive Spieler komplett verschwinden.
- QB-Penalty `-8` ist bewusst sichtbar, aber nicht automatisch ein Todesurteil fuer ein einzelnes Spiel.
- Die Minimal-Match-Engine bleibt seeded und deterministisch; dieselben Teams und Match-IDs erzeugen dieselben Ergebnisse.

## MVP-Fixes Nach Prioritaet

1. **UI ehrlich kennzeichnen: Hoch**
   - Zeige im Roster/Depth-Bereich: "Depth Chart beeinflusst Teamrating im MVP, aber noch keine Play-Calls."
   - Verhindert falsche Erwartung, dass einzelne Rollen bereits detaillierte Stat-Verteilung steuern.

2. **Online Injury/Suspension Status einfuehren: Mittel**
   - Erweiterung von `OnlineContractPlayer.status` oder separates Availability-Feld.
   - Danach Ready-Guard und Simulation-Rating auf `availableForGame` statt nur `active` umstellen.

3. **Positionsgewichtung erweitern: Mittel**
   - QB ist MVP-wirksam. OL/Skill/Defense/K koennten als naechste Subratings folgen.
   - Kleine Erweiterung der Ratingformel, keine volle Sim-Neuschreibung.

4. **Training/Chemistry optional ins Rating einrechnen: Mittel**
   - Bestehende Systeme haben Daten, wirken aber nicht auf Online-Matchrating.
   - MVP-tauglich waere ein kleiner Modifier mit klarer Obergrenze.

5. **Stats Attribution spaeter: Niedrig fuer MVP, hoch fuer Immersion**
   - Aktuell gibt es Teamstats, aber keine Spielerstatistiken.
   - Fuer Phase 3 reicht Teamwirkung; fuer echte Franchise-Tiefe fehlt Player-Stat-Output.

## Entscheidung

Management-Entscheidungen wirken: **Ja, begrenzt**.

Depth Chart Einfluss: **Ja, seit diesem Fix ueber gewichtetes Teamrating**.

Spielerwerte Einfluss: **Ja, ueber `overall -> rating -> simulateMatch(...)`**.

Verletzte/gesperrte Spieler beruecksichtigt: **Nein, nicht fachlich modelliert**.

UI-Kennzeichnung empfohlen: **Ja**. Die UI sollte nicht suggerieren, dass Depth Chart bereits detaillierte Snap-/Play-/Stat-Verteilung steuert.
