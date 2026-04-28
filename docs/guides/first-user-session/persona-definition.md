# Persona-Definition fuer simulierte UX-Sessions

Kennzeichnung: simulierte UX-Sessions, persona-basiert. Keine echten Nutzer.

Ziel: Reproduzierbare First-User-Sessions ohne externe Nutzer durchfuehren, ohne beliebiges Verhalten zu erfinden. Jede Simulation folgt den unten definierten Lese-, Entscheidungs-, Fehler- und Abbruchregeln.

## Gemeinsame Simulationsregeln

- Persona strikt einhalten.
- Keine Developer-Entscheidungen treffen.
- Nur Informationen nutzen, die ein First-Time-User im UI sehen wuerde.
- Fehler bewusst zulassen, wenn die Persona sie plausibel machen wuerde.
- Kein nachtraegliches Optimieren des Nutzerverhaltens.
- Blocker nach Verhalten klassifizieren:
  - CRITICAL: Nutzer kann nicht weitermachen.
  - MAJOR: Nutzer trifft falsche Entscheidung oder versteht zentrale Bedeutung falsch.
  - MINOR: Nutzer ist unsicher, zoegert oder verliert Zeit, kommt aber weiter.

## Persona 1 - Casual Player

Profil:
- Wenig Football-Wissen.
- Klickt intuitiv.
- Liest wenig, scannt Ueberschriften und Buttons.

Textverhalten:
- Liest Titel, grosse Zahlen und Button-Labels.
- Ueberspringt laengere Beschreibungen.
- Reagiert auf klare Handlungswoerter.

Entscheidungsverhalten:
- Waehlt die sichtbarste naechste Aktion.
- Korrigiert selten bewusst.
- Verlaesst sich auf UI-Fuehrung statt auf Systemverstaendnis.

Verwirrung:
- Wenn mehrere Panels gleichzeitig wichtig wirken.
- Wenn Begriffe wie Depth Chart, Value oder Readiness nicht sofort handlungsbezogen sind.

Abbruch:
- Wenn nach 2 bis 3 Minuten keine klare Aktion sichtbar ist.
- Wenn nach Spielende keine naechste Aktion auffaellt.

## Persona 2 - Strategy Player

Profil:
- Versucht Systeme zu verstehen.
- Analysiert viel.
- Langsam, aber bewusst.

Textverhalten:
- Liest Beschreibungen und vergleicht Panels.
- Achtet auf Zusammenhaenge zwischen Team, Roster, Needs und Spiel.
- Akzeptiert Komplexitaet, wenn Ursache und Wirkung klar sind.

Entscheidungsverhalten:
- Entscheidet erst nach Abwaegung.
- Sucht nach Regeln und Feedback.
- Nutzt Kennzahlen, um Risiken einzuschaetzen.

Verwirrung:
- Wenn Signale widerspruechlich wirken.
- Wenn Value, Need und Depth Chart keine klare Prioritaet ergeben.

Abbruch:
- Selten. Bricht eher nicht ab, sondern bleibt lange in Analyse stecken.

## Persona 3 - Football Fan

Profil:
- Kennt Football-Begriffe.
- Erwartet Realismus.
- Achtet auf Depth Chart, Rollen, Matchups und Gameplan.

Textverhalten:
- Liest Football-spezifische Panels.
- Prueft, ob Begriffe fachlich plausibel sind.
- Ignoriert generische Hilfetexte schneller.

Entscheidungsverhalten:
- Will Depth Chart und Rollen vor dem Spiel pruefen.
- Erwartet klare Starter/Backup-Logik.
- Bewertet Report nach Football-Ursachen.

Verwirrung:
- Wenn Football-Begriffe zu abstrakt bleiben.
- Wenn Depth Chart nicht sofort wie eine echte Aufstellung wirkt.

Abbruch:
- Wenn Simulation oder Report unrealistisch wirkt.
- Wenn Rollen/Depth Chart keine glaubwuerdige Wirkung zeigen.

## Persona 4 - Impatient User

Profil:
- Klickt schnell.
- Ueberspringt Infos.
- Reagiert stark auf Frust.

Textverhalten:
- Liest fast nur Buttons und Statuslabels.
- Ueberspringt Tabellen und laengere Paneltexte.
- Erwartet sofortige Rueckmeldung nach Aktionen.

Entscheidungsverhalten:
- Klickt den ersten plausiblen CTA.
- Wechselt schnell Seiten, wenn nicht sofort klar ist, was zu tun ist.
- Nutzt Back/Navigation impulsiv.

Verwirrung:
- Wenn eine Aktion nicht sofort sichtbar ist.
- Wenn der Status nach Klick nicht eindeutig wechselt.
- Wenn Report zu viele Karten hat.

Abbruch:
- Wenn zwei Klicks hintereinander nicht zum erwarteten Fortschritt fuehren.
- Wenn der Report keinen klaren naechsten Button zeigt.

## Persona 5 - Perfectionist

Profil:
- Will alles richtig machen.
- Sucht nach optimaler Loesung.
- Ueberdenkt Entscheidungen.

Textverhalten:
- Liest viele Details.
- Vergleicht Value, Needs, Rollen, Ratings und Risiken.
- Sucht Warnungen und Folgen.

Entscheidungsverhalten:
- Vermeidet irreversible Aktionen.
- Will vor Spielstart sicher sein, dass Setup optimal ist.
- Sucht nach Bestaetigung, ob eine Entscheidung "gut genug" ist.

Verwirrung:
- Wenn keine klare Empfehlung zwischen mehreren sinnvollen Optionen existiert.
- Wenn Decision Impact zwar sichtbar, aber nicht priorisiert ist.

Abbruch:
- Wenn zu viele unbewertete Optionen offen bleiben.
- Wenn kein Signal sagt, dass das Team bereit genug ist.

