# Beobachtungsbogen

Kennzeichnung: simulierte UX-Session, persona-basiert. Keine echten Nutzer.

Persona: Casual Player

## Sessiondaten

Teilnehmer-Kuerzel: U1

Datum: 2026-04-27

Geraet / Browser: MacBook / Chrome

Football-Erfahrung: Ein bisschen

Manager-Spiel-Erfahrung: Keine

Sessiondauer: 24 Minuten

Time to First Action: 01:05

Time to First Blocker: 06:40

Anzahl Nachfragen: 5

Anzahl Hilfen: 0

Kompletter Abbruch: Nein

Technische Probleme: keine

## Scoring

Bewertung je Abschnitt:
- 2 = ohne Hilfe geschafft
- 1 = mit Unsicherheit oder kleiner Hilfe geschafft
- 0 = nicht geschafft oder falsch verstanden

| Abschnitt | Score | Beobachtung |
| --- | ---: | --- |
| Dashboard: naechste Aktion erkannt | 2 | Klickt auf die auffaelligste Week-Loop-Aktion. |
| Rolle als GM verstanden | 1 | Versteht "Team managen", aber nicht alle Unterbereiche. |
| Team/Roster gefunden | 2 | Findet Team ueber Navigation. |
| Depth Chart verstanden | 0 | Haelt Depth Chart fuer Statistikliste. |
| Entscheidungsauswirkung erkannt | 1 | Sieht Value-Feedback, liest es aber nur oberflaechlich. |
| Spielvorbereitung verstanden | 1 | Erkennt Spielstart, nicht aber Readiness-Faktoren. |
| Spiel gestartet | 2 | Startet ohne Hilfe. |
| Spiel abgeschlossen | 2 | Erreicht Report. |
| Post-Game-Report verstanden | 1 | Liest Score und Summary, ueberspringt Ursachenpanels. |
| Naechste Aktion nach Report genannt | 1 | Nennt "weiter", findet aber Button erst nach Scrollen. |
| Zweite Woche gestartet oder gewollt | 2 | Will zweite Woche starten. |

Maximal: 15/22 Punkte.

## Live-Beobachtungen

### Aufgabe 1: Dashboard

Erste Reaktion: "Ich schaue einfach, was gruen oder wichtig aussieht."

Gesehene naechste Aktion: Woche vorbereiten.

Suchbewegungen: scannt nur obere Panels und CTA.

Missverstaendnisse: Record und Cap Space werden ignoriert.

Hilfe noetig? Nein  
Welche Hilfe: n/a

### Aufgabe 2: Naechste Aktion

Gewaehlt: Week Loop.

Begruendung des Nutzers: "Das sieht wie der Hauptbutton aus."

War die Navigation klar? Ja  
Notiz: Kontextwechsel wurde akzeptiert, aber nicht bewusst verstanden.

### Aufgabe 3: Team

Hat Teamstaerke erkannt? Teilweise  
Notiz: erkennt Overall, aber keine Teamidentitaet.

Hat Roster- oder Value-Hinweis gefunden? Teilweise  
Notiz: liest "Riskant" als Warnfarbe, nicht als Entscheidungsgrund.

### Aufgabe 4: Depth Chart / Roster

Starter verstanden? Nein  
Backups verstanden? Nein  
Warnungen verstanden? Teilweise  
Notiz: "Sind das nicht einfach alle Spieler sortiert?"

### Aufgabe 5: Spielvorbereitung

Readiness verstanden? Teilweise  
Gameplan-Impact verstanden? Nein  
Notiz: will schnell starten, ohne Einflussfaktoren zu pruefen.

### Aufgabe 6: Spiel starten / abschliessen

Start ohne Hilfe? Ja  
Abschluss ohne Hilfe? Ja  
Notiz: Statuswechsel funktioniert fuer diese Persona ausreichend.

### Aufgabe 7: Report

Kann Ergebnis erklaeren? Teilweise  
Genannte Ursache: "Wir haben weniger Punkte gemacht."

Erkennt Decision Impact? Nein  
Notiz: ueberspringt "Warum ist es passiert?".

Erkennt naechste Aktion? Teilweise  
Notiz: Scrollt, bis "Naechste Woche" auffaellt.

### Aufgabe 8: Zweite Woche

Zweite Woche gestartet? Ja  
Will weiter spielen? Ja  
Begruendung: "Wenn ich einfach weiterklicken kann, schon."

## Kritische Momente

Blocker-Klassifikation:
- CRITICAL: Nutzer kann nicht weitermachen.
- MAJOR: Nutzer trifft eine falsche Entscheidung oder versteht eine zentrale Bedeutung falsch.
- MINOR: Nutzer zoegert, ist unsicher oder braucht Orientierung, kommt aber weiter.

Moment 1:
- Stelle: Depth Chart
- Verhalten: erkennt Starter/Backup-Funktion nicht.
- Vermutete Ursache: Begriff ist nicht selbsterklaerend genug.
- Klasse: MAJOR
- Nutzerfrage oder Zitat: "Sind das nicht einfach alle Spieler sortiert?"
- Hilfe gegeben: Nein
- Ergebnis danach: geht weiter, ohne Aufstellung bewusst zu pruefen.

Moment 2:
- Stelle: Report
- Verhalten: liest Score, ueberspringt Ursachen.
- Vermutete Ursache: Report bietet zu viele gleichgewichtige Panels.
- Klasse: MAJOR
- Nutzerfrage oder Zitat: "Also gewonnen oder verloren ist alles, oder?"
- Hilfe gegeben: Nein
- Ergebnis danach: naechste Aktion nur teilweise begruendet.

Moment 3:
- Stelle: Game Setup
- Verhalten: startet sofort, ohne Readiness/Gameplan zu verstehen.
- Vermutete Ursache: CTA staerker als Kontext.
- Klasse: MINOR
- Nutzerfrage oder Zitat: "Ich druecke mal Start."
- Hilfe gegeben: Nein
- Ergebnis danach: kommt weiter.

## Missverstaendnisse

| Begriff / UI-Stelle | Erwartung des Nutzers | Tatsaechliches Verhalten | Klasse |
| --- | --- | --- | --- |
| Depth Chart | Statistik-/Spielerliste | steuert Aufstellung | MAJOR |
| Report | Score reicht als Auswertung | erklaert Ursachen und naechste Aktionen | MAJOR |
| Game Setup | Startseite vor Spiel | Entscheidung beeinflusst Match | MINOR |

## Positive Momente

Was funktionierte sichtbar gut? Week Loop fuehrt schnell zur ersten Aktion.

Welche UI-Stelle wurde verstanden? Haupt-CTA und Spielstart.

Gab es einen Aha-Moment? Nach Wochenwechsel: "Ah, dann geht das immer so weiter."

## Abschlussurteil Beobachter

Session erfolgreich? Teilweise

Kurzbegruendung: Core Loop geschafft, aber zentrale Entscheidungslogik bei Depth Chart und Report wurde nicht verstanden.

