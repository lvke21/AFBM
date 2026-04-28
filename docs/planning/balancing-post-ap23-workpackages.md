# Post-AP23 Balancing Workpackages

## Status

Status: Gruen. Die AP23-Ergebnisse wurden analysiert und in maximal fuenf konkrete, testbare Balancing-Arbeitspakete ueberfuehrt. Es wurde nichts implementiert.

## Ausgangslage

AP23 ist technisch gruen und liefert reproduzierbare Langzeitdaten ueber 2.016 Spiele. Die Daten zeigen aber mehrere starke Balance-Signale:

| Metrik | AP23-Wert | Einordnung |
| --- | ---: | --- |
| Avg Margin | 45.76 | Kritisch hoch |
| Blowout Rate | 93.3% | Kritisch hoch |
| Close Game Rate | 1.7% | Kritisch niedrig |
| Fatigue Median | 70 | Hoch |
| Fatigue P90 | 99 | Sehr hoch |
| Injury Rate | 0.835 / Spiel | Sichtbar, aber nach AP20 nicht mehr Hauptproblem |
| Severe Injury Rate | 0.104 / Spiel | Kontrolliert |

## Ursachenanalyse

### 1. Nicht nur Rating-Spread

Rating-Spread allein erklaert die Daten nicht. `equal-vs-equal` hat bei formal gleich starken Teams eine Blowout Rate von 97.2% und eine Avg Margin von 48.74. Das ist fuer Equal-Profile unplausibel.

Zusaetzlich zeigen die Teamdaten extreme Identitaetseffekte:

- `EQL1`: 502-1, Winrate 99.8%
- `EQL2`: 1-503, Winrate 0.2%
- `MED2`: 488-9, Winrate 98.2%
- `MED1`: 1-501, Winrate 0.2%

Das deutet auf Roster-Seed-, Depth-Chart- oder positionsspezifische Zusammensetzungsunterschiede hin, die im Team-Overall nicht ausreichend sichtbar sind.

### 2. Score-Verteilung kippt zu Winner-Take-All

Die Avg Scores pro Teamseite liegen oft um 21-26 Punkte, waehrend die Avg Margins fast genauso hoch sind wie der Total Score. Das bedeutet: viele Spiele enden faktisch als einseitige Shutouts oder Near-Shutouts. Die Scoring-Engine scheint Matchup-Vorteile zu stark in Drive-Erfolg oder Drive-Stop-Ketten zu uebersetzen.

### 3. Fatigue ist langfristig zu hoch

Fatigue Median 70 und P90 99 zeigen, dass die Long-Term-Fortschreibung Teams stark in hohe Ermuedung treibt. AP19 hat Performance-Zerstoerung entschärft, aber der Saisonverlauf produziert weiterhin sehr hohe Belastungswerte. Das kann Roster- und Depth-Chart-Unterschiede weiter verstaerken.

### 4. AI/Gameplan wirkt, ist aber nicht Primaerursache

AI-Archetypes zeigen erkennbare Unterschiede:

- `FAVORITE_CONTROL`: 56.2% Winrate
- `UNDERDOG_VARIANCE`: 43.3% Winrate
- `BALANCED_MATCHUP`: 49.9% Winrate

Das ist plausibel genug, um nicht als Hauptursache zu gelten. Trotzdem koennte Underdog-Variance zu wenig Comeback- oder Volatilitaetswirkung haben.

### 5. Suite-Profile brauchen Sanity Gates

Die Suite ist reproduzierbar, aber ihre Profilteams sind nicht automatisch echte Gleichgewichte. Wenn `EQL1` und `EQL2` trotz gleichem Prestige extrem auseinanderlaufen, braucht die Suite eigene Roster-/Depth-/Effective-Rating-Diagnostik, bevor sie Balance-Parameter endgueltig bewertet.

---

## Priorisierte Arbeitspakete

## AP24 - Roster Profile Sanity & Effective Rating Calibration

### Problem

Equal- und Medium-Profile liefern extreme Team-Winrates trotz aehnlichem oder gleichem Prestige. Dadurch ist unklar, ob Blowouts aus Engine-Balance oder aus versteckten Roster-/Depth-Chart-Unterschieden entstehen.

### Vermutete Ursache

Team-Overall/Prestige spiegelt wichtige Simulationsfaktoren nicht ausreichend wider: Positionsgruppen, Starterqualitaet, QB/OL/DL/CB-Gewichte, Depth-Chart-Verfuegbarkeit, Hidden Attributes oder Seed-Roster-Komposition.

### Ziel

Vor jeder grossen Balance-Bewertung soll klar sein, ob die Testteams wirklich vergleichbar sind. Equal-Profile muessen eine plausible Effective-Rating-Nahe haben.

### Konkrete Aenderungen

- Extended Suite um Effective-Team-Rating je Profil erweitern.
- Positionsgruppen-Summaries erfassen: QB, OL, Skill, DL, LB, Secondary, ST.
- Depth-Chart-Sanity pruefen: Starter pro Kernposition, fehlende Rollen, extreme OVR-Luecken.
- Testprofile fuer Equal/Medium gegebenenfalls aus identischen Basisteams mit kontrollierten leichten Variationen erzeugen.
- Keine Match-Engine-Parameter aendern.

### Betroffene Systeme

- `extended-season-balance-suite.ts`
- Production-QA-Team-Builder
- Initial-Roster-/Depth-Chart-Auswertung
- Balance-Reports

### Tests

- Equal-Profile haben Effective-Rating-Differenz <= definierter Schwelle.
- Keine Kernposition fehlt in Testprofilen.
- Reproduzierbarer Fingerprint bleibt stabil.
- Suite-Output enthaelt Positionsgruppen-Summary.

### Akzeptanzkriterien

- Equal-vs-Equal ist als Testprofil plausibel kalibriert.
- Team-Winrates in Equal-Profilen liegen in einem Beobachtungsfenster, z. B. 35-65%, bevor Engine-Balancing bewertet wird.
- Bericht trennt Roster-Profileffekt von Engine-Effekt.

### Erwarteter Impact

Hoch. Dieses AP verhindert, dass Folge-Balancing auf verzerrten Testteams basiert.

---

## AP25 - Score Margin Compression & Drive Outcome Volatility Tuning

### Problem

Avg Margin 45.76 und Blowout Rate 93.3% sind selbst bei gemischten Profilen viel zu hoch. Equal-vs-Equal ist ebenfalls betroffen.

### Vermutete Ursache

Die Match-Engine uebersetzt kleine oder versteckte Vorteile zu stark in Drive-Ketten: Gewinner erzielen stabil Punkte, Verlierer bleiben zu oft fast punktlos. Moegliche Treiber sind Drive-Erfolgsschwellen, Red-Zone-Finish, Stop-/Punt-Haeufigkeit, Big-Play-Amplitude oder fehlende Varianzbegrenzung.

### Ziel

Margins sollen deutlich sinken, ohne Ratings bedeutungslos zu machen. Favoriten duerfen besser bleiben, aber Underdogs und gleich starke Teams brauchen realistische Scoring-Chancen.

### Konkrete Aenderungen

- Score-/Drive-Verteilung in AP23-Suite nach Drive-Ergebnis aufschluesseln.
- Winner/Loser Points per Drive messen.
- Big-Play- und Red-Zone-Finish-Ausreisser identifizieren.
- Nur kleine Parameteranpassungen an Drive Outcome, Finish-Rate oder defensive Stop-Kurven vornehmen.
- Keine neue Gameplay-Mechanik.

### Betroffene Systeme

- `match-engine.ts`
- `game-balance.json`
- `engine-rules.ts`
- `simulation-balancing.test.ts`
- Extended Balance Suite

### Tests

- 1.000+ Spiele Batch.
- Equal-vs-Equal Avg Margin sinkt deutlich.
- Close Game Rate steigt messbar.
- Strong-vs-Weak Favorit bleibt besser als Underdog.
- Production-QA-Fingerprints bewusst aktualisieren, falls Parameter veraendert werden.
- Week Loop Regression.

### Akzeptanzkriterien

- Blowout Rate deutlich unter AP23-Wert, Zielbereich zunaechst < 50%.
- Close Game Rate deutlich ueber AP23-Wert, Zielbereich zunaechst > 15%.
- Avg Score bleibt plausibel, z. B. nicht durch reine Score-Absenkung geloest.

### Erwarteter Impact

Sehr hoch. Dieses AP adressiert den sichtbarsten Gameplay-Schaden: Spiele sind zu selten kompetitiv.

---

## AP26 - Long-Term Fatigue Accumulation Rebalance

### Problem

Fatigue Median 70 und P90 99 zeigen, dass viele Spieler langfristig in stark ermuetete Bereiche laufen.

### Vermutete Ursache

Match-Belastung und Wochenfortschreibung bauen Fatigue schneller auf, als Recovery sie abbaut. AP19 entschärfte Performance-Penalties, aber nicht zwingend die langfristige Fatigue-Verteilung.

### Ziel

Fatigue soll strategisch relevant bleiben, aber eine Saison soll nicht dauerhaft in P90=99 kippen. Recovery muss langfristig sichtbar wirken.

### Konkrete Aenderungen

- Fatigue-Aufbau nach Snap Load und Starterstatus erneut messen.
- Recovery-Abbau ueber mehrere Wochen kontrolliert testen.
- Optional minimale Anpassung an Match-Fatigue-Delta oder Weekly-Recovery.
- Keine Injury-Logik neu bauen; nur Folgewirkung messen.

### Betroffene Systeme

- `fatigue-recovery.ts`
- `player-condition.ts`
- `weekly-preparation.ts`
- Extended Balance Suite
- Injury Tests als Regression

### Tests

- Mehrwochen-Simulation mit Balanced/Recovery/Intense.
- Fatigue P50/P90 ueber Saisonverlauf.
- Injury Rate nach Fatigue-Anpassung.
- Match-Performance-Regression.
- Week Loop Regression.

### Akzeptanzkriterien

- Fatigue P90 sinkt deutlich unter 99, ohne Recovery zur dominanten No-Brainer-Option zu machen.
- Injury Rate bleibt relevant, aber nicht dominant.
- High-Fatigue bleibt spuerbar schlechter als frische Spieler.

### Erwarteter Impact

Hoch. Reduziert langfristige Extremzustaende und stabilisiert Depth-/Roster-Management.

---

## AP27 - Underdog & Comeback Resilience Tuning

### Problem

`UNDERDOG_VARIANCE` verliert zwar nicht mehr 0%, liegt aber bei 43.3% und durchschnittlich nur 19.42 Punkten. Gleichzeitig bleiben Blowouts extrem hoch.

### Vermutete Ursache

Underdog-Gameplan erzeugt nicht genug kontrollierte Varianz oder Comeback-Faehigkeit. Aggressive/Hurry-Up/Pass-First kann zu stark in ineffiziente Drives kippen, statt Upside und Risiko ausgewogen zu erhoehen.

### Ziel

Underdogs sollen keine Favoriten werden, aber plausibler Punkte erzielen und mehr Spiele im mittleren Margin-Bereich halten.

### Konkrete Aenderungen

- Archetype-Erfolg nach Score-Margin und Drive-Typ auswerten.
- `UNDERDOG_VARIANCE` auf Turnover-, Big-Play- und Punt-Raten analysieren.
- Kleine Anpassung an AI-Plan-Auswahl oder X-Factor-Wirkung fuer Underdog-Situationen.
- Keine neue AI-Engine.

### Betroffene Systeme

- `ai-team-strategy.ts`
- X-Factor-/Gameplan-Effekte in Simulation
- `match-engine.ts` nur falls AP25-Daten echten Folgefehler zeigen
- Match Report Summary bleibt unveraendert

### Tests

- Underdog-vs-Favorite Batch.
- AI-Archetype-Fingerprint.
- Upset Rate, Close-Loss Rate, Blowout-Loss Rate.
- Production-QA und Week Loop.

### Akzeptanzkriterien

- Underdog-Score steigt moderat.
- Blowout-Loss Rate sinkt.
- Favorite-Winrate bleibt > 50% in echten Mismatch-Szenarien.

### Erwarteter Impact

Mittel bis hoch. Verbessert Spielgefuehl und strategische Glaubwuerdigkeit, sollte aber nach AP24/AP25 priorisiert werden.

---

## AP28 - Extended Suite Diagnostics & Margin Attribution

### Problem

AP23 liefert Topline-Metriken, aber noch nicht genug Ursachenzerlegung fuer Margins: Turnovers, Big Plays, Red-Zone, punts, drives per game, fatigue delta, injuries und gameplan koennen noch nicht sauber pro Blowout gewichtet werden.

### Vermutete Ursache

Die Suite wurde als erster stabiler Langzeitlauf gebaut, nicht als vollstaendige Attribution-Engine. Dadurch sind Folgeentscheidungen moeglich, aber noch nicht maximal praezise.

### Ziel

Jeder Blowout soll in der Suite grob erklaerbar werden: Score-Treiber, Drive-Treiber, Roster-/Fatigue-/Gameplan-Treiber.

### Konkrete Aenderungen

- Suite-Output um Margin Buckets erweitern: close, competitive, controlled, blowout.
- Winner/Loser-Vergleich erfassen:
  - Turnovers
  - Explosive Plays
  - Red-Zone TD Rate
  - Points per Drive
  - Punt Rate
  - Fatigue-Differenz
  - Injury-Differenz
  - AI-Archetype
- HTML-Report mit Top-5 Margin Drivers.
- Keine Gameplay-Parameter aendern.

### Betroffene Systeme

- `extended-season-balance-suite.ts`
- `scripts/simulations/qa-extended-season-balance-suite.ts`
- `extended-season-balance-results.html/json`

### Tests

- Output-Schema stabil.
- Deterministischer Fingerprint.
- Attribution-Felder vollstaendig.
- 1.000+ Spiele Runtime akzeptabel.

### Akzeptanzkriterien

- Fuer Blowouts ist sichtbar, ob Turnovers, Explosives, Red Zone, Fatigue oder Teamprofil der Haupttreiber war.
- Folge-APs koennen auf konkreten Metriken statt Vermutungen priorisiert werden.

### Erwarteter Impact

Mittel. Dieses AP verbessert Diagnosequalitaet und reduziert Risiko falscher Balance-Parameteraenderungen.

---

## Empfohlene Reihenfolge

1. **AP24 - Roster Profile Sanity & Effective Rating Calibration**
2. **AP28 - Extended Suite Diagnostics & Margin Attribution**
3. **AP25 - Score Margin Compression & Drive Outcome Volatility Tuning**
4. **AP26 - Long-Term Fatigue Accumulation Rebalance**
5. **AP27 - Underdog & Comeback Resilience Tuning**

## Begruendung

Zuerst muss geklaert werden, ob die Testprofile selbst valide sind. Danach sollte die Suite bessere Ursachenzerlegung liefern, damit Score-Margin-Tuning nicht blind geschieht. Erst dann sollten Match-Engine-Margins, langfristige Fatigue und Underdog-Verhalten gezielt angepasst werden.

Status: Gruen.
