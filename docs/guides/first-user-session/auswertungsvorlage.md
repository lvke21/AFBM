# Auswertungsvorlage

## Sessionuebersicht

Datum der Testreihe:

Anzahl Nutzer:

Getestete Version / Commit / Build:

Test-Savegame:

Moderator:

Beobachter:

## Teilnehmermatrix

| Kuerzel | Football-Erfahrung | Manager-Erfahrung | Dauer | First Action | First Blocker | Nachfragen | Abbruch | Erfolgreich? | Score |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | ---: |
| U1 |  |  |  |  |  |  |  |  |  |
| U2 |  |  |  |  |  |  |  |  |  |
| U3 |  |  |  |  |  |  |  |  |  |
| U4 |  |  |  |  |  |  |  |  |  |
| U5 |  |  |  |  |  |  |  |  |  |

## Quantitative Auswertung

| Kriterium | Zielwert | Ergebnis | Status |
| --- | ---: | ---: | --- |
| Dashboard Next Action ohne Hilfe erkannt | mindestens 4/5 oder 3/3 |  |  |
| Spiel ohne harte Hilfe gestartet | mindestens 4/5 oder 3/3 |  |  |
| Spiel abgeschlossen | mindestens 4/5 oder 3/3 |  |  |
| Report in eigenen Worten erklaert | mindestens 3/5 oder 2/3 |  |  |
| Naechste Aktion nach Report genannt | mindestens 4/5 oder 3/3 |  |  |
| Weitere Woche gewollt | mindestens 3/5 oder 2/3 |  |  |
| Durchschnittlicher Beobachtungsscore | mindestens 16/22 |  |  |
| Median Time to First Action | maximal 2 Minuten |  |  |
| Median Time to First Blocker | kein CRITICAL/MAJOR in den ersten 5 Minuten |  |  |
| Durchschnittliche Nachfragen pro Nutzer | maximal 3 |  |  |
| Komplette Abbrueche | 0 |  |  |

## Wichtigste Erkenntnisse

1.

2.

3.

## Top 3 Blocker

| Rang | Blocker | Klasse | Nutzer betroffen | Evidenz | Konsequenz |
| ---: | --- | --- | ---: | --- | --- |
| 1 |  | CRITICAL / MAJOR / MINOR |  |  |  |
| 2 |  | CRITICAL / MAJOR / MINOR |  |  |  |
| 3 |  | CRITICAL / MAJOR / MINOR |  |  |  |

## Problemcluster

Diese Tabelle ist die Grundlage fuer Arbeitspakete. Nur Probleme mit mindestens 2 betroffenen Nutzern oder einzelne CRITICAL/Tech-Defekte aufnehmen.

| Problem | Nutzeranzahl | Schweregrad | Kategorie |
| --- | ---: | --- | --- |
| (z. B. Nutzer finden Spielstart nicht) | (z. B. 4/5) | CRITICAL / MAJOR / MINOR | Dashboard / Depth Chart / Game Setup / Report / Navigation / Text |
|  |  | CRITICAL / MAJOR / MINOR |  |
|  |  | CRITICAL / MAJOR / MINOR |  |
|  |  | CRITICAL / MAJOR / MINOR |  |
|  |  | CRITICAL / MAJOR / MINOR |  |

## Top 3 Missverstaendnisse

| Rang | Missverstaendnis | Nutzer betroffen | Stelle | Evidenz |
| ---: | --- | ---: | --- | --- |
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |

## Top 3 positive Erkenntnisse

| Rang | Positive Erkenntnis | Nutzer betroffen | Stelle | Evidenz |
| ---: | --- | ---: | --- | --- |
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |

## Wiederkehrende Probleme

| Problem | Nutzer betroffen | Stelle | Schwere | Evidenz |
| --- | ---: | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

Schwere:
- Hoch: blockiert Core Loop oder fuehrt zu falscher Entscheidung.
- Mittel: Nutzer kommt weiter, aber mit Unsicherheit.
- Niedrig: Irritation, Text- oder Layoutproblem.

Standardisierte Schweregrade:
- CRITICAL: Nutzer kann nicht weitermachen.
- MAJOR: Nutzer trifft eine falsche Entscheidung oder versteht eine zentrale Bedeutung falsch.
- MINOR: Nutzer ist unsicher, zoegert oder verliert Zeit, kommt aber weiter.

## Cross-Session Vergleich

Regel:
- Wiederkehrende Probleme markieren, wenn mindestens 2 Nutzer betroffen sind.
- Einmalige Probleme nur aufnehmen, wenn sie CRITICAL sind oder einen technischen Defekt zeigen.
- Einzelmeinungen zu Geschmack, Textstil oder visueller Praeferenz nicht als Arbeitspaket aufnehmen, wenn kein Verhaltenseffekt sichtbar war.

| Muster | Nutzer | Wiederkehrend? | In AP aufnehmen? | Begruendung |
| --- | --- | --- | --- | --- |
|  |  | Ja / Nein | Ja / Nein |  |
|  |  | Ja / Nein | Ja / Nein |  |
|  |  | Ja / Nein | Ja / Nein |  |

## Positive Signale

| Signal | Nutzer betroffen | Stelle | Evidenz |
| --- | ---: | --- | --- |
|  |  |  |  |
|  |  |  |  |

## Priorisierte Fixes

Nur echte Verstaendnis- oder Flow-Probleme aufnehmen.

| Prioritaet | Fix | Grund | Kleinster sinnvoller Scope |
| --- | --- | --- | --- |
| P0 |  |  |  |
| P1 |  |  |  |
| P2 |  |  |  |

Prioritaeten:
- P0: CRITICAL, wiederkehrend oder Core Loop blockiert; vor naechster Testreihe fixen.
- P1: MAJOR, wiederkehrend oder fuehrt zu falschen Entscheidungen; fuer naechsten Sprint planen.
- P2: MINOR oder einmaliges Problem mit erkennbarem Nutzen; sammeln oder mit anderem AP buendeln.

## Entscheidung

Gesamtstatus:
- Gruen: bereit fuer weitere Nutzertests
- Gelb: weiterer Test moeglich, aber mit bekannten P1-Problemen
- Rot: Core Loop nicht ohne Erklaerung testbar

Status:

Begruendung:

Naechster Schritt:
