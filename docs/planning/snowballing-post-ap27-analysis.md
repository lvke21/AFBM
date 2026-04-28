# Post-AP27 Snowballing Analysis

Status: Gruen  
Datum: 2026-04-26

## Ziel

Nach AP24 bis AP28 wurde die Extended Balance Suite erneut ausgewertet. Ziel war nicht, weitere Score-Parameter blind zu veraendern, sondern die verbleibenden Full-Suite-Blowouts einzugrenzen und daraus konkrete, testbare Folge-Arbeitspakete abzuleiten.

## Ausgangsdaten

Aktuelle Full Extended Suite:

| Metrik | Wert |
| --- | ---: |
| Spiele | 2.016 |
| Avg Margin | 36.42 |
| Blowout Rate | 75.0% |
| Close Game Rate | 11.0% |
| Fatigue Median | 63 |
| Fatigue P90 | 94 |
| Injury Rate | 0.875 |
| Severe Injury Rate | 0.112 |
| Avg Progression XP | 52.63 |

Score-Spikes:

| Muster | Rate | Spiele | Avg Margin |
| --- | ---: | ---: | ---: |
| Winner Score >= 42 | 56.3% | 1.135 | 48.97 |
| Loser Score <= 7 | 77.5% | 1.563 | 42.20 |
| Winner >= 42 und Loser <= 7 | 50.9% | 1.026 | 50.37 |

## Kernerkenntnisse

### Medium-vs-Medium ist nicht wirklich neutral

`medium-vs-medium` bleibt der auffaelligste nicht-offensichtliche Treiber:

| Szenario | Avg Margin | Blowout Rate | Close Rate | Favorite Winrate | Loser Score |
| --- | ---: | ---: | ---: | ---: | ---: |
| equal-vs-equal | 6.93 | 2.0% | 63.9% | n/a | 12.66 |
| medium-vs-medium | 42.56 | 94.8% | 1.2% | 99.6% | 2.65 |
| strong-vs-weak | 45.71 | 96.8% | 0.0% | 100.0% | 2.40 |

Die beiden Medium-Teams sind nominell nur 76 vs 75 Overall. Trotzdem gewinnt der Favorit nahezu jedes Medium-vs-Medium-Spiel. Das ist der staerkste Hinweis auf eine Near-Peer-Rating- oder Schedule-Kopplung, nicht auf ein allgemeines Equal-Rating-Problem.

### Der Verlauf ist kein reiner Late-Season-Snowball

Die Wochen 1 bis 14 bleiben relativ flach:

| Woche | Avg Margin | Blowout Rate | Close Rate | Loser Score |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 36.65 | 72.9% | 8.3% | 6.47 |
| 7 | 36.84 | 75.7% | 13.2% | 5.49 |
| 14 | 35.68 | 76.4% | 11.8% | 5.38 |

Blowouts sind also ab Woche 1 vorhanden. Saisonfortschreibung verstaerkt einzelne Teams, ist aber nicht die primaere Ursache.

### Teamprofile zeigen strukturelle Gewinner und Verlierer

| Team | Profil | Winrate | Wins | Losses | Avg Fatigue | New Injuries | Severe |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| STR1 | STRONG | 98.0% | 485 | 10 | 54.94 | 194 | 22 |
| STR2 | STRONG | 100.0% | 503 | 0 | 53.61 | 217 | 29 |
| MED1 | MEDIUM | 52.8% | 261 | 233 | 54.85 | 225 | 34 |
| MED2 | MEDIUM | 0.0% | 0 | 503 | 52.36 | 221 | 40 |
| EQL1 | EQUAL | 82.7% | 383 | 80 | 52.99 | 214 | 30 |
| EQL2 | EQUAL | 71.7% | 332 | 131 | 54.52 | 230 | 23 |
| WEK1 | WEAK | 0.0% | 0 | 504 | 53.68 | 235 | 26 |
| WEK2 | WEAK | 0.0% | 0 | 503 | 54.36 | 227 | 22 |

Die kritischste Schieflage ist `MED2`: ein nominell mittleres Team beendet die Suite ohne Sieg. Der Spielplan paart MED2 jede Woche mit STR2 und MED1; STR2 verliert nie, MED1 hat zusaetzlich den kleinen 76-vs-75-Vorteil. Dadurch wird aus einem mittleren Profil ein dauerhafter Opferpfad.

### Fatigue und Injuries sind Verstaerker, nicht Hauptursache

Fatigue-Bands zeigen kaum Trennung:

| Fatigue Band | Spiele | Avg Margin | Blowout Rate |
| --- | ---: | ---: | ---: |
| 0-29 | 403 | 35.79 | 74.4% |
| 30-49 | 1.613 | 36.58 | 75.1% |

Injury-Bands verstaerken Margins, aber erklaeren sie nicht allein:

| Active Injuries | Spiele | Avg Margin | Blowout Rate |
| --- | ---: | ---: | ---: |
| 0 | 13 | 31.62 | 61.5% |
| 4-7 | 40 | 30.05 | 65.0% |
| 12+ | 1.902 | 36.69 | 75.3% |

Die Korrelationen bestaetigen das: Winner Score korreliert mit Margin bei 0.935, Loser Score bei -0.617. Fatigue-, Injury- und Zeitverlaufskorrelationen liegen nahe 0.

### Progression/XP ist in dieser Suite kein erklaerter Snowball-Treiber

Die Suite misst Weekly XP, mutiert aber keine dauerhaften Attribute. Progression-XP liegt im Mittel bei 52.63 und unterscheidet sich in den Szenarien nur moderat. Damit ist Progression in dieser Suite Beobachtungsmetrik, nicht die Ursache der 75% Blowout Rate.

### AI/Gameplan folgt der Schieflage

| AI-Paar | Spiele | Avg Margin | Blowout Rate | Close Rate |
| --- | ---: | ---: | ---: | ---: |
| BALANCED_MATCHUP-vs-BALANCED_MATCHUP | 873 | 33.99 | 69.2% | 18.9% |
| FAVORITE_CONTROL-vs-UNDERDOG_VARIANCE | 725 | 39.19 | 82.9% | 4.1% |
| UNDERDOG_VARIANCE-vs-FAVORITE_CONTROL | 418 | 36.68 | 73.2% | 6.2% |

AI/Gameplan verstaerkt Mismatch-Spiele, ist aber nicht der alleinige Ausloeser: selbst Balanced-vs-Balanced bleibt bei 69.2% Blowouts.

## Hauptursache

Die Full Suite kombiniert drei Faktoren:

1. **Near-Peer-Rating-Delta ist zu hart**: 76 vs 75 Overall fuehrt in Medium-vs-Medium zu 99.6% Favorite Winrate.
2. **Synthetischer Spielplan erzeugt dauerhafte Strength-of-Schedule-Pfade**: MED2 trifft jede Woche STR2 und MED1; STR2 bleibt undefeated, MED1 ist im direkten Duell struktureller Favorit.
3. **Loser-Offense bleibt zu oft unter 7 Punkten**: AP25/AP27 haben geholfen, aber der Verlierer-Score-Floor ist in nicht-equal Matchups noch zu niedrig.

Fatigue, Injuries und AI sind nach aktuellem Stand Verstaerker. Progression ist in der Suite kein primaerer Treiber.

## Neue Arbeitspakete

### AP29 - Extended Suite Schedule Neutrality & Strength-of-Schedule Diagnostics

Problem: Die Extended Suite vermischt Balance-Befunde mit einem starren synthetischen Schedule. MED2 spielt jede Woche gegen STR2 und MED1 und endet trotz Medium-Profil bei 0-503.

Vermutete Ursache: Der aktuelle WEEK_PAIRINGS-Plan erzeugt feste Opferpfade und laesst einzelne Teams dauerhaft gegen staerkere oder minimal bevorzugte Gegner laufen.

Ziel: Die Suite soll Snowballing messen, ohne es durch eine einseitige Schedule-Struktur selbst zu erzeugen.

Konkrete Änderung:

- Schedule-Rotation oder Round-Robin-Variante in der Extended Suite ergaenzen.
- Strength-of-Schedule pro Team ausgeben.
- Team-vs-Team-Matrix mit Wins, Avg Margin, Loser Score und Blowout Rate ausgeben.
- Bestehende Default-Suite reproduzierbar halten oder versioniert als `legacyPairings` markieren.

Tests:

- Extended-Suite-Schema-Test erweitern.
- Reproduzierbarer Run mit fixer Seed-/Schedule-Variante.
- Vergleich: Legacy Pairings vs Neutral Pairings.

Akzeptanzkriterien:

- Kein Medium-Team hat im neutralen Schedule 0% Winrate nur durch Pairing.
- Strength-of-Schedule wird pro Team sichtbar.
- Equal-vs-Equal bleibt gesund.
- Keine Gameplay-Parameter werden veraendert.

### AP30 - Near-Peer Rating Delta Compression

Problem: Medium-vs-Medium kippt trotz nur 1 Overall Unterschied fast deterministisch zum Favoriten.

Vermutete Ursache: Kleine Rating-Deltas werden in Drive-/Match-Erfolg zu stark in stabile Vorteile uebersetzt, besonders sobald der Favorit wiederholt fuehrt.

Ziel: Teams mit 0-2 Overall Unterschied sollen kompetitiv bleiben, ohne echte Strong-vs-Weak-Mismatches zu verwaessern.

Konkrete Änderung:

- Rating-Delta-Kompression nur fuer Near-Peer-Matchups einfuehren.
- Favoritenvorteil bei 1-2 Overall Punkten begrenzen.
- Keine globale Score-Engine-Neuschreibung.
- Strong-vs-Weak- und klare 6+ Rating-Deltas unveraendert oder nur minimal beeinflussen.

Tests:

- 74 vs 74, 76 vs 75, 76 vs 74, 84 vs 68 Batch-Tests.
- Medium-vs-Medium 200+ Spiele.
- Regression Equal-vs-Equal und Strong-vs-Weak.

Akzeptanzkriterien:

- 76-vs-75 Favorite Winrate nicht mehr nahe 100%, Zielbereich ca. 55-65%.
- Medium-vs-Medium Blowout Rate sinkt deutlich.
- Strong-vs-Weak bleibt dominant und wird nicht zum Coinflip.

### AP31 - Loser Offensive Floor by Matchup Band

Problem: Der Verlierer bleibt in 77.5% aller Spiele bei maximal 7 Punkten; in Medium-vs-Medium liegt der Loser Score bei nur 2.65.

Vermutete Ursache: AP25/AP27 stabilisieren Underdogs, aber nicht ausreichend nach Matchup-Band. Besonders Near-Peer- und Medium-Spiele brauchen einen plausibleren Drive-Floor, ohne Weak-vs-Strong kuenstlich eng zu machen.

Ziel: Loser-Offense soll in Near-Peer- und moderaten Mismatch-Spielen realistischer punkten.

Konkrete Änderung:

- Situativen Offensive-Floor nur fuer Near-Peer/moderate Matchups pruefen.
- Field-Goal-/Sustained-Drive-Wahrscheinlichkeit bei niedrigen Loser Scores leicht erhoehen.
- Keine weitere Gewinner-Score-Inflation.
- Keine Veraenderung an Roster, Fatigue oder Injury.

Tests:

- Score-Verteilung nach Matchup-Band.
- Loser Score <= 7 Rate fuer Equal, Medium und Strong/Weak getrennt.
- Winner Score >= 42 Kontrolle.
- Week Loop Regression.

Akzeptanzkriterien:

- Medium-vs-Medium Loser Score steigt messbar.
- Loser Score <= 7 sinkt deutlich in Near-Peer-Spielen.
- Strong-vs-Weak bleibt klar.
- Avg Total Score steigt nicht unrealistisch.

### AP32 - Availability/Depth-Chart Decay Diagnostics & Guardrails

Problem: 1.902 von 2.016 Spielen liegen im Injury-Band `12+`. Obwohl Injuries nicht die Hauptursache sind, koennen Starter-/Depth-Chart-Verfall und wiederholte schwere Ausfaelle einzelne Teams ueber die Saison weiter abwerten.

Vermutete Ursache: Die Suite misst Injuries aggregiert, aber nicht, ob Key-Position-Starter dauerhaft fehlen oder ob Ersatzspieler bestimmte Offense-Pfade kollabieren lassen.

Ziel: Verstehen und begrenzen, wann Availability die Balance unsichtbar unter die Teamprofile zieht.

Konkrete Änderung:

- Diagnose erweitern um Starter-Ausfaelle, Key-Position-Ausfaelle und effektives Available-Rating pro Team/Woche.
- Guardrails nur falls Diagnose zeigt, dass Depth-Chart-Verfall Near-Peer-Spiele entscheidet.
- Keine Injury-Rate-Kalibrierung als erster Schritt.

Tests:

- Suite-Diagnose-Schema fuer Available-Rating.
- Medium-vs-Medium mit und ohne Key-Position-Ausfaelle vergleichen.
- Regression Injury-System und Week Loop.

Akzeptanzkriterien:

- Verfuegbarkeitsverlust pro Team/Woche ist sichtbar.
- Falls Guardrails noetig sind: keine 0-Win-Medium-Teams durch reine Availability-Kaskade.
- Injury-System bleibt spielrelevant.

## Priorisierung

1. AP29 - zuerst Messinstrument/Schedule neutralisieren, damit Folgewerte vertrauenswuerdig sind.
2. AP30 - Near-Peer-Rating-Delta beheben, weil 76 vs 75 aktuell fast deterministisch ist.
3. AP31 - Loser-Offense gezielt nach Matchup-Band stabilisieren, nicht global.
4. AP32 - Availability/Depth-Chart als sekundären Verstaerker sichtbar machen und nur bei Bedarf begrenzen.

## Statuspruefung

- Hauptursache plausibel eingegrenzt: Ja.
- Arbeitspakete konkret und testbar: Ja.
- Keine blinden Score-Fixes: Ja. AP29 ist zuerst Diagnose/Suite-Neutralitaet, AP30 adressiert Near-Peer-Deltas, AP31 ist matchup-band-spezifisch statt global, AP32 klaert Availability als Verstaerker.

Status: Gruen
