# Erfolgskriterien

## Zielstatus der ersten echten Nutzer-Session

Die Session ist erfolgreich, wenn 3 bis 5 Nutzer den ersten Spielzyklus ohne Erklaerung groesstenteils schaffen.

Core Loop:
Dashboard -> naechste Aktion -> Team/Depth Chart verstehen -> Spiel vorbereiten -> Spiel starten -> Report lesen -> naechste Woche oder naechste Aktion erkennen.

## Gruen

Die Testreihe gilt als Gruen, wenn alle Bedingungen erfuellt sind:

- Mindestens 80 Prozent der Nutzer erkennen die naechste Dashboard-Aktion ohne direkte Hilfe.
- Mindestens 80 Prozent starten ein Spiel ohne direkte Hilfe.
- Mindestens 80 Prozent erreichen den Post-Game-Report.
- Mindestens 60 Prozent koennen in eigenen Worten sagen, warum das Spiel so ausgegangen ist.
- Mindestens 80 Prozent nennen nach dem Report eine sinnvolle naechste Aktion.
- Mindestens 60 Prozent sagen, dass sie eine weitere Woche spielen wuerden.
- Durchschnittlicher Beobachtungsscore liegt bei mindestens 16 von 22 Punkten.
- Kein P0-Problem tritt bei mehr als einem Nutzer auf.
- Median Time to First Action liegt bei maximal 2 Minuten.
- Kein CRITICAL- oder MAJOR-Blocker tritt in den ersten 5 Minuten bei mehr als einem Nutzer auf.
- Durchschnittliche Anzahl Nachfragen liegt bei maximal 3 pro Nutzer.
- Es gibt 0 komplette Abbrueche.

Bei 3 Nutzern bedeutet das:
- Dashboard-Aktion: 3/3
- Spiel starten: 3/3
- Report erreichen: 3/3
- Ergebnis erklaeren: 2/3
- Naechste Aktion: 3/3
- Weitere Woche: 2/3
- Time to First Action: Median maximal 2 Minuten
- Nachfragen: durchschnittlich maximal 3
- Abbrueche: 0

Bei 5 Nutzern bedeutet das:
- Dashboard-Aktion: 4/5
- Spiel starten: 4/5
- Report erreichen: 4/5
- Ergebnis erklaeren: 3/5
- Naechste Aktion: 4/5
- Weitere Woche: 3/5
- Time to First Action: Median maximal 2 Minuten
- Nachfragen: durchschnittlich maximal 3
- Abbrueche: 0

## Gelb

Die Testreihe gilt als Gelb, wenn:

- Nutzer schaffen den Core Loop, brauchen aber wiederholt kleine Hinweise.
- Dashboard oder Report sind teilweise unklar, aber nicht blockierend.
- Es gibt mehrere P1-Probleme, aber kein dominantes P0-Problem.
- Durchschnittlicher Beobachtungsscore liegt zwischen 12 und 15 Punkten.
- Median Time to First Action liegt zwischen 2 und 4 Minuten.
- Durchschnittliche Anzahl Nachfragen liegt zwischen 4 und 6 pro Nutzer.
- Es gibt maximal 1 kompletten Abbruch, sofern er technisch oder datenbedingt erklaerbar ist.

Gelb bedeutet: Weitere Tests sind moeglich, aber die wichtigsten P1-Probleme sollten vorher reduziert werden.

## Rot

Die Testreihe gilt als Rot, wenn eine Bedingung zutrifft:

- Weniger als 3 Nutzer schaffen den Core Loop.
- Mehr als ein Nutzer findet die naechste Dashboard-Aktion nicht.
- Mehr als ein Nutzer kann das Spiel nicht starten oder abschliessen.
- Mehr als zwei Nutzer verstehen den Report nicht.
- Durchschnittlicher Beobachtungsscore liegt unter 12 Punkten.
- Median Time to First Action liegt ueber 4 Minuten.
- Der erste CRITICAL- oder MAJOR-Blocker tritt bei mindestens 2 Nutzern in den ersten 5 Minuten auf.
- Durchschnittliche Anzahl Nachfragen liegt ueber 6 pro Nutzer.
- Es gibt mindestens 2 komplette Abbrueche.
- Ein technischer Fehler blockiert den Kernpfad.
- Ein P0-Problem tritt bei mindestens zwei Nutzern auf.

Rot bedeutet: Keine weitere offene Nutzer-Session, bevor die Blocker behoben sind.

## P0-Beispiele

- Nutzer weiss nicht, was als naechstes zu tun ist und bleibt auf dem Dashboard stecken.
- Nutzer findet den Spielstart nicht.
- Nutzer versteht nach dem Spiel nicht, dass das Spiel abgeschlossen ist.
- Nutzer kann keine naechste Aktion nennen.
- UI-Fehler verhindert Start, Abschluss oder Wochenwechsel.

## P1-Beispiele

- Roster und Depth Chart werden verwechselt, Nutzer kommt aber weiter.
- Value-Feedback wird gesehen, aber nicht verstanden.
- Report wird gelesen, aber die wichtigste Ursache bleibt unklar.
- Nutzer braucht einen kleinen Hinweis zur Navigation.

## P2-Beispiele

- Einzelne Begriffe sind unschoen.
- Nutzer wuenscht mehr Details, obwohl der Flow funktioniert.
- Layout oder Reihenfolge fuehlt sich nicht optimal an.
