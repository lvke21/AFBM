# Erste verwertbare UX-Probleme

Kennzeichnung: simulierte UX-Sessions, persona-basiert. Keine echten Nutzer.

## TOP 5 UX-Probleme

### 1. Post-Game Report hat keine dominante Kurzantwort

Beschreibung:
- Nutzer sehen Score und viele Report-Panels, aber nicht sofort "Warum ist es passiert?" und "Was soll ich jetzt tun?".

Betroffener Flow:
- Post-Game Report, Second Loop.

Haeufigkeit:
- 4/5 Personas betroffen.

Schweregrad:
- CRITICAL bei Impatient User, MAJOR bei Casual Player, Strategy Player und Perfectionist.

Evidenz:
- U4 bricht im Report ab.
- U1 liest nur Score/Summary.
- U2 und U5 erkennen mehrere To-dos, aber keine Prioritaet.

### 2. Depth Chart wird nicht stabil als Aufstellung verstanden

Beschreibung:
- Neue Nutzer koennen Depth Chart mit Statistikliste verwechseln oder verstehen nicht, welche Entscheidung dadurch spielrelevant wird.

Betroffener Flow:
- Team, Roster, Depth Chart.

Haeufigkeit:
- 4/5 Personas stark betroffen; Football Fan nur mit Detailwunsch.

Schweregrad:
- MAJOR.

Evidenz:
- U1: "Sind das nicht einfach alle Spieler sortiert?"
- U4 verlaesst Teamseite ohne Interpretation.
- U5 sucht optimale Aufstellung und Freigabe.

### 3. Konkurrierende Signale werden nicht priorisiert

Beschreibung:
- Dashboard, Team Needs, Value, Depth Chart und Report liefern sinnvolle Signale, aber keine eindeutige Reihenfolge.

Betroffener Flow:
- Dashboard, Team, Report.

Haeufigkeit:
- 4/5 Personas betroffen.

Schweregrad:
- MAJOR.

Evidenz:
- U2 fragt, ob Team Need oder Week Loop wichtiger ist.
- U5 fragt nach "gut genug".
- U4 weiss nach Report nicht, was anders zu machen ist.

### 4. Value-/Decision-Feedback ist nicht handlungsorientiert genug

Beschreibung:
- Feedback wird gesehen, aber schnelle oder unsichere Nutzer koennen daraus nicht unmittelbar eine Entscheidung ableiten.

Betroffener Flow:
- Roster, Trades/Signings, Post-Action Feedback, Report.

Haeufigkeit:
- 4/5 Personas betroffen.

Schweregrad:
- MAJOR / MINOR.

Evidenz:
- U1 sieht Value-Farben, versteht Bedeutung nicht sicher.
- U4 ignoriert Impact und fragt, was anders gemacht werden soll.
- U5 versteht Wirkung, aber nicht Gewichtung.

### 5. Game Setup gibt keine klare "bereit genug"-Freigabe

Beschreibung:
- Nutzer koennen das Spiel starten, wissen aber nicht, ob das Team sinnvoll vorbereitet ist.

Betroffener Flow:
- Game Setup, Readiness, Week Loop.

Haeufigkeit:
- 4/5 Personas betroffen.

Schweregrad:
- MAJOR / MINOR.

Evidenz:
- U1 startet ohne Readiness-Verstaendnis.
- U4 ueberspringt Setup.
- U5 zoegert, weil keine Freigabe sichtbar ist.
- U2 versteht Faktoren, aber nicht Prioritaet.

## Abgeleitete AP-Kandidaten

### AP-UX-01 - Post-Game Top Summary und Next Action

Ziel:
- Report muss in 10 Sekunden Ergebnisursache und naechste Aktion liefern.

Moegliche Umsetzung:
- Oben im Report ein kompaktes Panel: Ergebnis, Hauptgrund, Top Fix, Button.

### AP-UX-02 - Depth Chart Erstnutzer-Anker

Ziel:
- Nutzer verstehen sofort: Depth Chart = wer spielt.

Moegliche Umsetzung:
- Kurzer unaufdringlicher Header, Starter/Backup-Erklaerung, "Spielrelevant"-Hinweis.

### AP-UX-03 - Globale Priorisierung der naechsten Aufgabe

Ziel:
- Dashboard/Report nennen eine Top-Prioritaet statt mehrere gleichwertige Signale.

Moegliche Umsetzung:
- Prioritaetsmodell fuer CRITICAL/High/Medium Tasks.

### AP-UX-04 - Value Feedback als konkrete Handlung

Ziel:
- Feedback beantwortet "gut, riskant, warum, was tun?".

Moegliche Umsetzung:
- Value Feedback um Handlungssatz und Kontext ergaenzen.

### AP-UX-05 - Game Setup Readiness Gate

Ziel:
- Nutzer wissen vor Start, ob Vorbereitung ausreichend ist.

Moegliche Umsetzung:
- "Ready / Needs Attention / Blocked"-Status mit maximal 2 Gruenden.

## Simulationsstatus

- Personas klar unterscheidbar: Ja.
- Ergebnisse konsistent: Ja, Probleme wiederholen sich persona-typisch.
- Echte Probleme ableitbar: Ja, als Hypothesen fuer Produktarbeit und echte Nutzertests.

