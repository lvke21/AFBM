# Post-Balancing Gameplay Phase Workpackages

Status: Gruen  
Datum: 2026-04-26

## Ausgangspunkt

Die Balancing-Runde AP24 bis AP32 hat die Simulation technisch und spielerisch stabilisiert:

- Equal- und Near-Peer-Matchups sind gesund.
- Medium-vs-Medium ist nicht mehr strukturell kaputt.
- Die verbleibenden Blowouts kommen vor allem aus echten Mismatch-Bands.
- Zusaetzliche globale Score-Fixes sind nicht sinnvoll.
- Schwache Teams bleiben sportlich schwach, was plausibel ist, aber fuer Spieler schnell frustrierend werden kann.

Damit verschiebt sich der Fokus: Nicht weiter pauschal die Simulation glätten, sondern das Spielerlebnis mit schwachen Teams besser machen.

## Spielerzentrierte Analyse

### Wo entsteht Frust?

- Schwache Teams verlieren gegen starke Teams weiterhin sehr deutlich.
- Eine Niederlage kann sich wie ein reines Zahlenurteil anfuehlen, wenn der Spieler nicht versteht, welche Einheit oder Entscheidung das Spiel gekippt hat.
- Verlustserien sind moeglich, ohne dass das Spiel klare Zwischenziele anbietet.
- Ein schwaches Team kann Fortschritt machen, aber der Fortschritt ist nicht immer als Erfolgsmoment sichtbar.

### Wo fehlen Erfolgsmomente?

- Moralische Siege werden kaum herausgestellt: knapperes Ergebnis als erwartet, besseres zweites Viertel, weniger Turnovers, guter Rookie, verbesserte Fatigue.
- Upsets sind bei echten Mismatches selten; das ist okay, aber der Spieler braucht Teilziele unterhalb von "gewinnen".
- Progression und Development Focus existieren, werden aber noch nicht konsequent als Rebuild-Fortschritt gerahmt.

### Wo fehlen Rueckmeldungen?

- Der Spieler sieht nicht immer, ob eine Niederlage durch Rating-Luecke, Depth, Fatigue, Injury, Gameplan oder Matchup-Schwachstelle entstand.
- UI/Report erklaeren harte Mismatches noch zu wenig als Erwartung vs Ergebnis.
- Entscheidungen wie Recovery, Development Focus und Gameplan brauchen staerkeres Vorher/Nachher-Feedback.

## Neue Arbeitspakete

### AP33 - Weak-Team Season Goals & Moral Victories

Problem: Schwache Teams koennen realistisch verlieren, aber der Spieler bekommt zu wenig alternative Erfolgsmomente. Eine 17:34-Niederlage kann spielerisch gut sein, wenn das Team als klarer Underdog weniger Turnovers hatte, lange konkurrenzfaehig blieb oder ein junger Spieler Fortschritt zeigte.

Ziel: Schwache Teams sollen motivierende Wochen- und Saisonziele erhalten, die auch ohne Sieg Fortschritt sichtbar machen.

Konkrete Umsetzung:

- Einfache Team-Goal-Auswertung pro Woche einfuehren:
  - Niederlage unter erwarteter Margin halten
  - Turnovers begrenzen
  - mindestens X Punkte erzielen
  - Fatigue stabil halten
  - Development-Focus-Spieler erreicht XP-Ziel
- Ziele aus Teamstaerke und Gegnerstaerke ableiten.
- Post-Game-Report um "Moral Victory" / "Rebuild Progress" Abschnitt erweitern.
- Keine Simulationsergebnisse veraendern; nur Bewertung und Feedback.

Betroffene Systeme:

- Match/Post-Game Report Model
- Dashboard/Week Feedback
- Team-/Matchup-Rating-Auswertung
- Progression-Anzeige

Tests:

- Goal-Auswertung fuer klaren Underdog, Near-Peer und Favorit.
- Report zeigt erfuellte und verfehlte Ziele.
- Fehlende Daten crashen nicht.
- Week Loop Regression.

Erwarteter Impact:

- Verlustserien fuehlen sich weniger leer an.
- Spieler erkennt Fortschritt auch vor dem ersten Upset.
- Schwache Teams werden als Rebuild-Challenge statt als reine Niederlagenmaschine lesbar.

### AP34 - Matchup Expectation & Post-Game Explanation UX

Problem: Spieler verstehen harte Ergebnisse noch zu wenig. Nach AP30/AP32 sind viele Blowouts echte Mismatches, aber UI/Report erklaeren nicht klar genug, warum ein Spiel schwierig war.

Ziel: Vor und nach dem Spiel soll sichtbar sein, welche Erwartungen realistisch waren und wodurch das Ergebnis entstand.

Konkrete Umsetzung:

- Pre-Game Matchup Summary:
  - Rating-Band: equal, near-peer, moderate underdog, heavy underdog
  - wichtigste Staerke-/Schwaeche-Zonen
  - Erwartung: "Upset schwer", "eng erwartet", "Favorit"
- Post-Game Explanation:
  - Ergebnis gegen Erwartung
  - groesste Treiber: Turnovers, Loser Score, Winner Explosives, Fatigue, Injury, Effective Depth
  - kompakte Sprache ohne Statistik-Wand
- Bestehende AP18-Feedback-Komponenten erweitern, keine neue grosse UI bauen.

Betroffene Systeme:

- Week Panel
- Game Setup/Pre-Game Summary
- Post-Game Report
- Existing feedback/read-model helpers

Tests:

- Report rendert alle Matchup-Bands.
- Weak-vs-Strong zeigt klare Erwartung.
- Equal-vs-Equal bleibt neutral formuliert.
- Missing diagnostics werden fallback-sicher angezeigt.
- Component-/Dashboard-Tests und Week Loop.

Erwarteter Impact:

- Niederlagen wirken nachvollziehbarer.
- Spieler sieht, ob Plan/Entscheidung oder reine Kaderluecke entscheidend war.
- Reduziert Frust durch "das Spiel ist unfair"-Gefuehl.

### AP35 - Rebuild Progression Milestones

Problem: Progression existiert, aber Rebuild-Fortschritt wird nicht als laengerer Bogen kommuniziert. Gerade mit schwachen Teams dauert es, bis Siege entstehen.

Ziel: Spieler sollen sehen, dass Development Focus, Spielzeit und Wochenplan den Kader langfristig verbessern.

Konkrete Umsetzung:

- Rebuild-Milestones fuer junge/high-potential Spieler:
  - XP-Streak
  - Attribut kurz vor Upgrade
  - Rookie/Young Core verbessert sich
  - Positionsgruppe gewinnt an Tiefe
- Kompakte Team-Progression-Zusammenfassung pro Woche.
- Development-Focus-Trade-offs erklaeren: XP-Gewinn, Fatigue/Morale-Kontext, Wiederholungsdiminishing.
- Keine neue Karriere-Simulation, keine Vertrags-/Scouting-Architektur.

Betroffene Systeme:

- Player Progression Domain
- Weekly Plan Feedback
- Dashboard Player/Team Panels
- Post-Week Summary

Tests:

- Milestones bei XP-Gain, No-Gain und Cap-Edge.
- Junge/high-potential Spieler werden korrekt erkannt.
- Keine Focus-Spieler erzeugen sauberen Fallback.
- Progression-Unit-Tests und Week Loop.

Erwarteter Impact:

- Schwache Teams bekommen einen motivierenden Langzeitpfad.
- Training und Development Focus fuehlen sich sichtbarer und bedeutsamer an.
- Spieler kann Niederlagen gegen sichtbaren Aufbaufortschritt aufwiegen.

### AP36 - Underdog Gameplan Objectives

Problem: Gameplans existieren, aber schwache Teams brauchen spezifische, erreichbare Underdog-Ziele. "Gewinnen" ist gegen starke Teams oft unrealistisch; "Ball sichern, Clock kontrollieren, explosive Plays begrenzen" ist spielbar.

Ziel: Gameplan-Entscheidungen sollen fuer Underdogs klare Teilziele und Feedback erzeugen.

Konkrete Umsetzung:

- Underdog-spezifische Gameplan Objectives:
  - Conservative: Turnovers senken, Time of Possession stabilisieren
  - Aggressive: explosive Chancen suchen, aber Turnover-Risiko zeigen
  - Balanced: Fatigue und Score kontrollieren
- Ziele vor dem Spiel anzeigen.
- Nach dem Spiel auswerten: Plan erfolgreich, teilweise erfolgreich, verfehlt.
- Keine neue AI-Engine und keine globale Simulation-Aenderung.

Betroffene Systeme:

- X-Factor/Gameplan UI
- AI/Gameplan summary
- Match report diagnostics
- Week plan feedback

Tests:

- Objectives je Gameplan werden korrekt erzeugt.
- Aggressive Plan zeigt Risiko und Chance.
- Conservative Plan bewertet Turnovers/Clock.
- Report bleibt stabil bei fehlenden Daten.
- Week Loop Regression.

Erwarteter Impact:

- Entscheidungen wirken weniger dekorativ.
- Spieler erkennt, wie er mit schwachem Team sinnvoll anders spielt.
- Verlustserien bekommen taktische Lernmomente.

### AP37 - Weak-Team Schedule & Streak Context

Problem: Verlustserien fuehlen sich besonders hart an, wenn der Spieler nicht sieht, dass der Schedule schwer war oder bald leichtere Gegner kommen. Nach AP29 wissen wir, dass Schedule-Kontext massiv beeinflusst, wie Ergebnisse gelesen werden.

Ziel: Der Spieler soll Niederlagen im Kontext der Gegnerstaerke verstehen und kommende Chancen erkennen.

Konkrete Umsetzung:

- Schedule Difficulty Anzeige:
  - letzter 3-Spiele-Schnitt Gegnerstaerke
  - naechste 3 Spiele: schwer/mittel/leicht
  - Streak-Kontext: Niederlagenserie gegen starke Gegner anders rahmen als gegen gleich starke Gegner
- Dashboard-Hinweis fuer "Rebound Opportunity" gegen schwächeren/gleich starken Gegner.
- Keine Schedule-Generierung neu bauen; nur vorhandene Matchups auswerten.

Betroffene Systeme:

- Season Schedule Query/Read Model
- Dashboard
- Week Panel
- Team rating helpers

Tests:

- Difficulty-Bands fuer vergangene und kommende Spiele.
- Streak-Context bei 0, 1 und mehreren Niederlagen.
- Keine kommenden Spiele erzeugen fallback-sichere UI.
- Dashboard Tests und Week Loop.

Erwarteter Impact:

- Spieler versteht Verlustserien besser.
- Schwache Teams bekommen planbare "Chancenfenster".
- Motivation steigt, weil das Spiel nicht nur rueckblickend bestraft, sondern vorausschauend Ziele setzt.

## Priorisierung

1. AP33 - Weak-Team Season Goals & Moral Victories
2. AP34 - Matchup Expectation & Post-Game Explanation UX
3. AP35 - Rebuild Progression Milestones
4. AP36 - Underdog Gameplan Objectives
5. AP37 - Weak-Team Schedule & Streak Context

## Statuspruefung

- Klarer Fokus auf Spieler: Ja.
- Keine technischen Overkills: Ja, alle APs erweitern bestehende Feedback-, Report- und Progression-Pfade.
- Maximal 5 APs: Ja.
- Keine globale Balancing-Runde: Ja.

Status: Gruen
