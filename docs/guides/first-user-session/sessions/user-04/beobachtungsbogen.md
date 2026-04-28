# Beobachtungsbogen

Kennzeichnung: simulierte UX-Session, persona-basiert. Keine echten Nutzer.

Persona: Impatient User

## Sessiondaten

Teilnehmer-Kuerzel: U4

Datum: 2026-04-27

Geraet / Browser: Laptop / Chrome

Football-Erfahrung: Keine

Manager-Spiel-Erfahrung: Ein bisschen

Sessiondauer: 18 Minuten

Time to First Action: 00:35

Time to First Blocker: 04:20

Anzahl Nachfragen: 7

Anzahl Hilfen: 0

Kompletter Abbruch: Ja

Technische Probleme: keine

## Scoring

| Abschnitt | Score | Beobachtung |
| --- | ---: | --- |
| Dashboard: naechste Aktion erkannt | 2 | Klickt sofort Haupt-CTA. |
| Rolle als GM verstanden | 1 | Nur grob: "Team-Spiel starten". |
| Team/Roster gefunden | 1 | Oeffnet Team kurz, verlaesst es schnell. |
| Depth Chart verstanden | 0 | Ueberspringt komplett. |
| Entscheidungsauswirkung erkannt | 0 | Ignoriert Feedbacktexte. |
| Spielvorbereitung verstanden | 0 | Klickt Start ohne Lesen. |
| Spiel gestartet | 2 | Startet schnell. |
| Spiel abgeschlossen | 2 | Schliesst ab. |
| Post-Game-Report verstanden | 0 | Report wirkt zu lang; Nutzer bricht im Report ab. |
| Naechste Aktion nach Report genannt | 0 | Keine klare naechste Aktion. |
| Zweite Woche gestartet oder gewollt | 0 | Will nicht weitermachen. |

Maximal: 8/22 Punkte.

## Live-Beobachtungen

### Aufgabe 1: Dashboard

Erste Reaktion: "Wo ist Start?"

Gesehene naechste Aktion: Woche vorbereiten / Startpfad.

Suchbewegungen: klickt schnell, liest kaum.

Missverstaendnisse: erwartet direkten Spielstart statt Management-Loop.

Hilfe noetig? Nein  
Welche Hilfe: n/a

### Aufgabe 2: Naechste Aktion

Gewaehlt: Week Loop.

Begruendung des Nutzers: "Das bringt mich hoffentlich zum Spiel."

War die Navigation klar? Teilweise  
Notiz: Nutzer versteht nicht, warum Zwischenschritte existieren.

### Aufgabe 3: Team

Hat Teamstaerke erkannt? Nein  
Notiz: sieht Zahlen, bewertet sie nicht.

Hat Roster- oder Value-Hinweis gefunden? Nein  
Notiz: ueberspringt Paneltexte.

### Aufgabe 4: Depth Chart / Roster

Starter verstanden? Nein  
Backups verstanden? Nein  
Warnungen verstanden? Nein  
Notiz: klickt zurueck, weil Seite "zu viel Liste" wirkt.

### Aufgabe 5: Spielvorbereitung

Readiness verstanden? Nein  
Gameplan-Impact verstanden? Nein  
Notiz: startet sofort.

### Aufgabe 6: Spiel starten / abschliessen

Start ohne Hilfe? Ja  
Abschluss ohne Hilfe? Ja  
Notiz: reine Buttons funktionieren.

### Aufgabe 7: Report

Kann Ergebnis erklaeren? Nein  
Genannte Ursache: "Keine Ahnung, zu viel Text."

Erkennt Decision Impact? Nein  
Notiz: Report wird als Wand aus Karten wahrgenommen.

Erkennt naechste Aktion? Nein  
Notiz: scrollt kurz, dann bricht ab.

### Aufgabe 8: Zweite Woche

Zweite Woche gestartet? Nein  
Will weiter spielen? Nein  
Begruendung: "Ich weiss nicht, was ich anders machen soll."

## Kritische Momente

Moment 1:
- Stelle: Team / Depth Chart
- Verhalten: verlaesst Seite ohne Interpretation.
- Vermutete Ursache: keine sofort erkennbare Handlung fuer schnelle Nutzer.
- Klasse: MAJOR
- Nutzerfrage oder Zitat: "Das ist mir zu viel Liste."
- Hilfe gegeben: Nein
- Ergebnis danach: startet Spiel unvorbereitet.

Moment 2:
- Stelle: Report
- Verhalten: bricht ab, bevor naechste Aktion erkannt wird.
- Vermutete Ursache: Report bietet zu viele Informationen ohne dominante Kurzantwort.
- Klasse: CRITICAL
- Nutzerfrage oder Zitat: "Was soll ich jetzt machen?"
- Hilfe gegeben: Nein
- Ergebnis danach: kompletter Abbruch.

Moment 3:
- Stelle: Decision Feedback
- Verhalten: ignoriert Impact und Value.
- Vermutete Ursache: Feedback ist nicht stark genug als Handlung zusammengefasst.
- Klasse: MAJOR
- Nutzerfrage oder Zitat: "Ich weiss nicht, was ich anders machen soll."
- Hilfe gegeben: Nein
- Ergebnis danach: keine Folgeentscheidung.

## Missverstaendnisse

| Begriff / UI-Stelle | Erwartung des Nutzers | Tatsaechliches Verhalten | Klasse |
| --- | --- | --- | --- |
| Teamseite | schneller Fix oder Start | mehrere Analysebereiche | MAJOR |
| Report | klare Kurzantwort und naechster Klick | mehrere Auswertungspanels | CRITICAL |
| Decision Feedback | konkrete Handlungsanweisung | erklaerende Effekte | MAJOR |

## Positive Momente

Was funktionierte sichtbar gut? Haupt-CTA und Spielstart.

Welche UI-Stelle wurde verstanden? Buttons fuer Start/Abschluss.

Gab es einen Aha-Moment? Nein.

## Abschlussurteil Beobachter

Session erfolgreich? Nein

Kurzbegruendung: Core Loop technisch erreicht, aber Report fuehrt zu Abbruch und keine Entscheidung wird verstanden.

