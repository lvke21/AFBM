# Phase Plan - Roster Control, Player Value, Team Management

## Status

Gruen

## Leitplanken

- Keine Simulation- oder Balance-Neukalibrierung als Voraussetzung.
- Bestehende Roster-, Depth-Chart-, Free-Agency-, Team-Needs- und Scheme-Fit-Logik wiederverwenden.
- Jede Funktion muss dem Spieler eine direkte Entscheidung geben: Wer spielt, wer passt ins System, wer ist den Preis wert?
- V1 bleibt bewusst klein: keine komplexe Trade-KI, keine langwierigen Verhandlungen, keine versteckten Buffs.

---

## AP38 - Depth Chart Command Center

### Problem

Depth-Chart-Daten existieren bereits und die Simulation nutzt `rosterStatus` und `depthChartSlot`, aber die Spielersteuerung ist noch zu passiv. Der GM sieht Konflikte und Slots, braucht aber eine klare Bearbeitungsoberflaeche fuer Starter, Rotation und Backups.

### Ziel

Der Spieler kann vor einem Spiel schnell festlegen, wer startet und wer als Backup bereitsteht. Lineup-Probleme sollen sichtbar und direkt behebbar sein.

### Konkrete Umsetzung

- Bestehende Depth-Chart-Seite zu einem echten Command Center ausbauen.
- Pro Position Slots 1-N anzeigen, mit klaren Aktionen:
  - Spieler Slot zuweisen.
  - Spieler auf Starter/Rotation/Backup/Inaktiv setzen.
  - Slot freimachen.
- Konflikte aus `detectDepthChartConflicts` als prominente Fix-Liste anzeigen.
- Leere Slot-1-Positionen als Game-Day-Warnung anzeigen.
- Vor dem Spiel im Game Setup eine kompakte Lineup-Readiness-Zeile anzeigen.
- Keine neue Simulationslogik: nur bestehende `rosterStatus` und `depthChartSlot` sauber setzen.

### Betroffene Systeme

- `src/components/team/depth-chart-view.tsx`
- `src/components/team/depth-chart-model.ts`
- `src/modules/teams/application/team-roster.service.ts`
- `src/modules/teams/infrastructure/team-management.repository.ts`
- Team-Roster-/Team-Route-Actions
- Game Setup Readiness UI

### Tests

- Slot-Konflikte werden erkannt und nach Assignment geloest.
- Ineligible Spieler koennen keinen aktiven Depth-Slot bekommen.
- IR bleibt nur fuer verletzte Spieler waehlbar.
- Slot-1-Luecken erzeugen Warnung.
- Simulation-Context laedt nach Depth-Chart-Aenderung die erwarteten Starter.
- UI-/Modeltests fuer Depth-Chart-Gruppen, Konflikte und stabile Rendering-Fallbacks.

---

## AP39 - Player Role & Archetype Clarity

### Problem

Spieler haben Archetypen, Scheme Fit und Ratings, aber der Nutzen ist noch verstreut. Der GM sieht Werte, versteht aber nicht sofort, warum ein Spieler in dieser Offense/Defense wertvoll ist.

### Ziel

Jeder Spieler bekommt eine klare Rolle im Teamkontext: z. B. `Pocket Starter`, `Slot Separator`, `Power Rotation`, `Coverage LB`, `Development Backup`. Diese Rollen sollen Entscheidungen im Depth Chart und in Free Agency leichter machen.

### Konkrete Umsetzung

- Leichte Role-Labels aus vorhandenen Daten ableiten:
  - Position
  - Archetype
  - Scheme Fit
  - OVR/Potential
  - Roster Status
  - Alter
- Keine neue DB-Pflicht in V1; Role kann als View-Model abgeleitet werden.
- Rollen sichtbar machen auf:
  - Roster Table
  - Player Detail Header
  - Depth Chart Cards
  - Free Agent Board
- Kleine Erklaerung pro Rolle:
  - `Starter Fit`: hoher OVR und guter Scheme Fit.
  - `Development Upside`: jung, hohes Potenzial, noch kein Starter.
  - `Specialist`: klarer Skill oder Special-Teams-/Situationswert.
- Optional: Rollenfilter im Roster (`Starter Fit`, `Development`, `Depth`, `Specialist`).

### Betroffene Systeme

- `src/modules/teams/domain/team.types.ts`
- `src/components/team/roster-model.ts`
- `src/components/team/depth-chart-model.ts`
- `src/components/player/player-detail-model.ts`
- `src/components/free-agency/free-agency-model.ts`
- Player rating / scheme fit helpers

### Tests

- Role-Labels werden fuer Starter, junge Upside-Spieler, Backups und Specialists korrekt abgeleitet.
- Fehlende Archetype-/Scheme-Fit-Daten erzeugen neutrale Fallbacks.
- Roster-Filter sortiert/filtern stabil.
- Player Detail rendert Rollen ohne Layout-Bruch.
- Free Agent Board zeigt Role/Fit konsistent mit Team Needs.

---

## AP40 - Player Value Score V1

### Problem

Free Agency und Roster Management zeigen Cap, OVR, Potential und Need, aber der Spieler muss den Wert mental selbst zusammensetzen. Dadurch sind Signings, Releases und spaetere Trades schwer vergleichbar.

### Ziel

Ein einfacher, transparenter Player Value Score macht sichtbar, ob ein Spieler fuer das aktuelle Team ein guter Deal, neutraler Kaderfueller oder ueberteuert ist.

### Konkrete Umsetzung

- `Player Value Score` als View-Model berechnen:
  - Current OVR
  - Potential/Upside
  - Age curve
  - Scheme Fit
  - Team Need
  - Contract/Cap Hit
- Ausgabe bewusst simpel:
  - `Great Value`
  - `Fair Value`
  - `Expensive`
  - `Low Fit`
- Score nicht in Simulation verwenden.
- In Free Agency:
  - Board nach Value sortierbar machen.
  - Contract Summary zeigt `Value vs Cap`.
- Im Roster:
  - teure Backups und gute Value-Spieler markieren.
- In Team Needs:
  - Need nicht nur nach Loch, sondern auch nach Value Opportunity zeigen.

### Betroffene Systeme

- `src/components/free-agency/free-agency-model.ts`
- `src/modules/teams/application/free-agent-market.service.ts`
- `src/components/team/roster-model.ts`
- `src/components/finance/finance-model.ts`
- Contract calculation helpers

### Tests

- Value Score belohnt guten Fit bei moderatem Cap.
- Teurer Spieler mit niedrigem Fit wird als `Expensive` oder `Low Fit` markiert.
- Junge Spieler mit Potenzial werden nicht faelschlich als schlechte Werte markiert.
- Missing contract data bleibt stabil.
- Free Agency Sortierung nach Value ist deterministisch.

---

## AP41 - Simple Transfer / Trade Offers V1

### Problem

Es gibt Free Agency, aber keine einfache Moeglichkeit, Spieler zwischen Teams zu bewegen. Ohne Trades fehlt ein zentraler Football-Manager-Hebel fuer Roster Control und Team Building.

### Ziel

Der Spieler kann einfache, sichere Trade-Angebote erstellen: Spieler gegen Spieler oder Spieler gegen Draft-/Value-Platzhalter. V1 soll bewusst begrenzt und nachvollziehbar bleiben.

### Konkrete Umsetzung

- Neue `Trades`-Seite im Team-/Finance-Bereich.
- V1-Trade-Typen:
  - 1 Spieler abgeben fuer 1 Spieler.
  - 1 Spieler abgeben fuer einfachen Future Value Platzhalter.
  - 1 Spieler holen gegen einfachen Future Value Platzhalter.
- Kein komplexes Multi-Asset-Negotiation-System.
- Trade Acceptance als transparente Heuristik:
  - Player Value Score
  - Team Need des CPU-Teams
  - Cap-Pruefung beider Teams
  - Roster-Limit-Pruefung
- Ergebnis:
  - `Accepted`
  - `Close`
  - `Rejected`
  - mit 2-3 Gruenden.
- Bei Accepted:
  - RosterProfile teamId wechseln.
  - Contracts/Cap validieren.
  - Depth-Slots fuer bewegte Spieler leeren.
  - Finance/Roster Transaction loggen.

### Betroffene Systeme

- Neues Trade-View-Model und UI unter Savegame.
- `team-management.repository.ts`
- `team-roster.service.ts` oder neuer kleiner `team-trade.service.ts`
- Contract/cap helpers
- Roster transaction logs
- Navigation: Finance/Team Management

### Tests

- Trade wird akzeptiert, wenn Value, Need und Cap passen.
- Trade wird abgelehnt, wenn Cap Space fehlt.
- Trade wird abgelehnt, wenn aktiver Roster gegen Limits laeuft.
- Spielerwechsel aktualisiert Team, RosterStatus und DepthChartSlot korrekt.
- CPU-Team-Need beeinflusst Acceptance nachvollziehbar.
- Keine Simulation-/Balance-Werte aendern sich direkt durch Trade ausser ueber reales Roster.

---

## AP42 - Roster Decision Inbox

### Problem

Mit Depth Chart, Roles, Value und Trades entstehen mehr Entscheidungen. Ohne Priorisierung kann Team Management unruhig werden.

### Ziel

Der GM bekommt wenige, konkrete Roster-Hinweise: `Starter fehlt`, `teurer Backup`, `Trade-Chance`, `junger Spieler braucht Rolle`. Das fuehrt den Spieler zu sinnvollen Aktionen, ohne das Spiel zu ueberladen.

### Konkrete Umsetzung

- Bestehende Inbox-/Dashboard-Pattern nutzen.
- Maximal 3-5 aktive Roster-Hinweise anzeigen.
- Hinweise aus vorhandenen Modellen ableiten:
  - Depth-Chart-Konflikt.
  - Starter-Slot leer.
  - High-Value Free Agent auf Need-Position.
  - teurer Backup mit niedrigem Fit.
  - Development-Spieler ohne sinnvolle Rolle.
- Jeder Hinweis hat:
  - kurze Ursache.
  - erwarteter Spieler-Impact.
  - direkter Link zur passenden Seite.
- Keine automatische Aktion, nur Entscheidungshilfe.

### Betroffene Systeme

- `src/components/inbox/inbox-model.ts`
- Dashboard Action / ActionRequiredBanner
- Depth Chart Model
- Free Agency Model
- Roster/Player Value View-Models

### Tests

- Maximalanzahl der Hinweise bleibt begrenzt.
- Kritische Depth-Chart-Probleme priorisieren vor Value-Hinweisen.
- Hinweise verschwinden nach behobener Ursache.
- Links fuehren zu Team Roster, Depth Chart, Free Agency oder Trades.
- Sparse Data erzeugt keine falschen Warnungen.

---

## Empfohlene Reihenfolge

1. AP38 - Depth Chart Command Center
2. AP39 - Player Role & Archetype Clarity
3. AP40 - Player Value Score V1
4. AP41 - Simple Transfer / Trade Offers V1
5. AP42 - Roster Decision Inbox

Diese Reihenfolge ist absichtlich konservativ: Erst Kontrolle ueber das Lineup, dann bessere Spielerverstaendlichkeit, danach Value, dann Trades, zuletzt Priorisierung. So entsteht spuerbarer Spieler-Impact ohne ein grosses neues Management-System auf einmal.

## Phase Outcome

Nach dieser Phase soll der Spieler drei Fragen direkt beantworten koennen:

- Wer soll spielen?
- Wer ist fuer mein Team wirklich wertvoll?
- Welche einfache Roster-Entscheidung verbessert mein Team als Naechstes?
