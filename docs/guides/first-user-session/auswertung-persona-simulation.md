# Auswertung - Simulierte UX-Sessions

Kennzeichnung: simulierte UX-Sessions, persona-basiert. Keine echten Nutzer.

## Sessionuebersicht

Datum der Testreihe: 2026-04-27

Anzahl Nutzer: 5 simulierte Personas

Getestete Version / Commit / Build: aktueller lokaler Stand

Test-Savegame: First-User-Session-Dashboard-Start

Moderator: simuliert, nur Kontext, keine Hilfe

Beobachter: simuliert, persona-basiert

## Teilnehmermatrix

| Kuerzel | Persona | Football-Erfahrung | Manager-Erfahrung | Dauer | First Action | First Blocker | Nachfragen | Abbruch | Erfolgreich? | Score |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | ---: |
| U1 | Casual Player | Ein bisschen | Keine | 24 min | 01:05 | 06:40 | 5 | Nein | Teilweise | 15 |
| U2 | Strategy Player | Ein bisschen | Sehr viel | 35 min | 03:20 | 09:30 | 6 | Nein | Teilweise | 17 |
| U3 | Football Fan | Sehr viel | Ein bisschen | 31 min | 02:10 | 07:15 | 4 | Nein | Ja | 19 |
| U4 | Impatient User | Keine | Ein bisschen | 18 min | 00:35 | 04:20 | 7 | Ja | Nein | 8 |
| U5 | Perfectionist | Regelmaessig | Regelmaessig | 38 min | 04:05 | 08:50 | 8 | Nein | Teilweise | 15 |

## Quantitative Auswertung

| Kriterium | Zielwert | Ergebnis | Status |
| --- | ---: | ---: | --- |
| Dashboard Next Action ohne Hilfe erkannt | mindestens 4/5 | 2/5 klar, 3/5 mit Zoegern/Umweg | Rot |
| Spiel ohne harte Hilfe gestartet | mindestens 4/5 | 5/5 | Gruen |
| Spiel abgeschlossen | mindestens 4/5 | 5/5 | Gruen |
| Report in eigenen Worten erklaert | mindestens 3/5 | 3/5 | Gruen |
| Naechste Aktion nach Report genannt | mindestens 4/5 | 2/5 klar, 3/5 unsicher/keine | Rot |
| Weitere Woche gewollt | mindestens 3/5 | 4/5 | Gruen |
| Durchschnittlicher Beobachtungsscore | mindestens 16/22 | 14.8/22 | Gelb |
| Median Time to First Action | maximal 2 Minuten | 02:10 | Gelb |
| Median Time to First Blocker | kein CRITICAL/MAJOR in ersten 5 Minuten | U4 bei 04:20 CRITICAL | Gelb |
| Durchschnittliche Nachfragen pro Nutzer | maximal 3 | 6.0 | Rot |
| Komplette Abbrueche | 0 | 1 | Rot |

## Top 3 Blocker

| Rang | Blocker | Klasse | Nutzer betroffen | Evidenz | Konsequenz |
| ---: | --- | --- | ---: | --- | --- |
| 1 | Report liefert keine dominante Kurzantwort und naechste Aktion | CRITICAL / MAJOR | 4/5 | U1, U2, U4, U5 | Post-Game wird nicht zu funktionierender Entscheidung. |
| 2 | Depth Chart / Roster-Funktion ist fuer Erstnutzer nicht ausreichend selbsterklaerend | MAJOR | 4/5 | U1, U2, U4, U5; U3 als MINOR | Nutzer pruefen Aufstellung nicht oder zoegern. |
| 3 | System priorisiert konkurrierende Probleme nicht klar genug | MAJOR | 3/5 | U2, U4, U5 | Nutzer wissen nicht, was zuerst gefixt werden soll. |

## Top 3 Missverstaendnisse

| Rang | Missverstaendnis | Nutzer betroffen | Stelle | Evidenz |
| ---: | --- | ---: | --- | --- |
| 1 | Score/Report-Summary reicht als Auswertung | 2/5 | Post-Game Report | U1, U4 ueberspringen Ursachenpanels. |
| 2 | Depth Chart wirkt wie Statistikliste statt Aufstellung | 2/5 | Depth Chart | U1 und U4 verstehen Funktion nicht. |
| 3 | Warnungen/Needs sind nicht nach Dringlichkeit sortiert | 3/5 | Dashboard, Team, Report | U2, U4, U5 suchen Top-Prioritaet. |

## Top 3 positive Erkenntnisse

| Rang | Positive Erkenntnis | Nutzer betroffen | Stelle | Evidenz |
| ---: | --- | ---: | --- | --- |
| 1 | Spielstart und Spielabschluss funktionieren als klarer Button-Flow | 5/5 | Game Setup / Live | Alle Personas starten und beenden ohne Hilfe. |
| 2 | Football-affine Nutzer verstehen Depth Chart und Gameplan schnell | 1/5 stark, 2/5 teilweise | Team / Game Setup | U3 klar, U2/U5 mit Analyse. |
| 3 | Decision Impact ist fuer analytische Nutzer verwertbar | 3/5 | Report / Feedback Summary | U2, U3, U5 lesen und nutzen Impact. |

## Problemcluster

| Problem | Nutzeranzahl | Schweregrad | Kategorie |
| --- | ---: | --- | --- |
| Report hat keine dominante "Warum / Was jetzt?"-Zusammenfassung | 4/5 | CRITICAL / MAJOR | Report / Second Loop |
| Depth Chart wird nicht durchgehend als Aufstellung verstanden | 4/5 | MAJOR | Depth Chart / Roster |
| Naechste Aktion wird ueber Dashboard, Team und Report nicht ausreichend priorisiert | 4/5 | MAJOR | Dashboard / Navigation / Report |
| Value- und Decision-Feedback ist sichtbar, aber nicht handlungsorientiert genug | 4/5 | MAJOR / MINOR | Decision Feedback / Value |
| Game Setup gibt keine klare "bereit genug"-Freigabe vor Spielstart | 4/5 | MAJOR / MINOR | Game Setup / Readiness |

## Cross-Session Vergleich

Regel:
- Wiederkehrende Probleme werden markiert, wenn mindestens 2 Personas betroffen sind.
- Einmalige Probleme werden nur aufgenommen, wenn sie CRITICAL sind oder einen technischen Defekt zeigen.
- Da diese Auswertung persona-basiert simuliert ist, sind Probleme als Hypothesen fuer echte Sessions zu behandeln.

| Muster | Nutzer | Wiederkehrend? | In AP aufnehmen? | Begruendung |
| --- | --- | --- | --- | --- |
| Report braucht Top Summary + Next Action | U1, U2, U4, U5 | Ja | Ja | Blockiert oder verlangsamt Second Loop. |
| Depth Chart braucht Erstnutzer-Erklaerung und Rollenanker | U1, U2, U4, U5 | Ja | Ja | Fuehrt zu falschem oder fehlendem Lineup-Verstaendnis. |
| Priorisierung fehlt | U2, U4, U5, teils U1 | Ja | Ja | Nutzer koennen nicht sicher entscheiden. |
| Mehr Football-Detail fuer Experten | U3 | Nein | Nein | Positiver Ausbau, aber kein wiederkehrender Blocker. |

## Entscheidung

Gesamtstatus:
- Rot fuer "ohne externe Erklaerung robust testbar".

Begruendung:
- Core Loop ist technisch erreichbar, aber Report, Depth Chart und Priorisierung erzeugen wiederkehrende MAJOR/CRITICAL-Probleme.
- Ein kompletter Abbruch tritt beim Impatient User im Report auf.
- Durchschnittliche Nachfragen liegen mit 6.0 deutlich ueber Zielwert.

Naechster Schritt:
- AP-UX-01 bis AP-UX-05 aus den Problemclustern ableiten und sequenziell umsetzen.

