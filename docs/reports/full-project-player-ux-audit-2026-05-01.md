# Full Project Player and UX Audit

Datum: 2026-05-01

## Kurzurteil

Status: Gelb bis Rot.

Der erste Einstieg in den Online Hub ist visuell klar und technisch stabiler als zuvor. Der Fantasy Draft ist als MVP spielbar: Spieler sehen Runde, Pick, Team am Zug, verfuegbare Spieler, Filter, eigene Kaderstaende und Pick-Historie. Trotzdem ist das Spielerlebnis noch kein rundes Multiplayer-Spiel. Der Flow hat einen starken Start, verliert aber nach dem Draft seine Belohnung, weil die Week-Simulation noch nicht als echter Spieltag mit aussagekraeftigen Ergebnissen, Ursachen und Fortschritt rueberkommt.

## Erste Session eines neuen Spielers

### Was funktioniert

- `/online` oeffnet ohne OAuth-Gate.
- Firebase Anonymous Auth ist fuer den Spieler weitgehend unsichtbar.
- Der Hub zeigt Synchronisationsmodus und User-Status.
- Weiterspielen, Liga suchen und Zurueck zum Hauptmenue sind klar.
- Join hat Guards gegen doppelte Aktionen.
- Team-Identitaet kann gewaehlt oder vorgeschlagen werden.

### Was stoert

- Der Hub erklaert nicht klar, ob der Spieler gerade in einer echten Online-Liga, einer Testliga oder lokalem Modus ist. Es gibt Badges, aber keine handlungsleitende Entscheidung.
- Liga suchen hat kuenstliche Wartezeit und ist fuer einen neuen Spieler weniger direkt als "Offene Ligen anzeigen".
- Team-Identitaet vor Join ist motivierend, aber viel Formulararbeit bevor klar ist, was danach passiert.
- "Account sichern" sitzt sehr frueh und kann vom eigentlichen Spielflow ablenken.

## Fantasy Draft

### Was funktioniert

- Draft Room zeigt die wichtigsten MVP-Informationen:
  - Status
  - Runde
  - Picknummer
  - Team am Zug
  - eigenes Team
  - verfuegbare Spieler
  - Positionsfilter
  - Overall-Sortierung
  - bereits gepickte Spieler
  - eigener Kaderstand
- Pick-Button ist deaktiviert, wenn der Spieler nicht am Zug ist.
- Reload waehrend Draft ist im E2E stabil.
- Vollstaendiger 16-Team-Draft ist lokal automatisiert gruen getestet.

### Was fehlt fuer gutes Spielgefuehl

- Spielerbewertung ist zu duenn. Nur Position, OVR und Alter reichen fuer einen Fantasy Draft nicht aus, um Spannung oder echte Entscheidungen zu erzeugen.
- Kein Vergleich zum Team Need ausser Kaderzaehler.
- Keine klare "Warum dieser Pick?"-Rueckmeldung.
- Kein Draft Board mit Tiering, Favoriten, Queue oder Empfehlungen.
- Der Draft wirkt administrativ korrekt, aber noch nicht emotional.

## Complete Week-1 Experience

Gedanklicher Flow:

1. Spieler tritt Liga bei.
2. Admin startet Fantasy Draft.
3. Spieler pickt oder wartet.
4. Draft endet.
5. Spieler sieht Dashboard und setzt Ready.
6. Admin simuliert Woche.
7. Spieler erwartet Ergebnisse, Story, Fortschritt, Konsequenzen.

Bruchpunkt: Schritt 6/7.

Die Week-Simulation ist aus Spielersicht der wichtigste Payoff. Aktuell ist sie im Multiplayer-Firebase-Pfad noch ein Week-Schalter mit Placeholder-Event. Das reicht fuer technische State-Maschine, aber nicht fuer Spielbarkeit. Es fehlt die emotionale und spielerische Auszahlung: Match Result, Stats, Standings, Verletzungen/Development, Finanz-/Fan-Reaktionen, Inbox/Report und klare naechste Aufgabe.

## Navigation

### Positiv

- Online Hub ist einfach.
- Liga-Dashboard ist erreichbar und Reload-stabil.
- Recovery-Panels verhindern leere Screens.
- Adminbereich ist getrennt und nutzt eigenen Login.

### Negativ

- Dashboard ist sehr breit: Training, Franchise, Finance, Contracts, Trades, Coaches, Draft/Scouting und Ready koennen zusammen auftauchen.
- Expert Mode reduziert etwas Komplexitaet, aber die Seite bleibt fuer neue Spieler schwer zu scannen.
- Es ist nicht immer offensichtlich, welche Aktionen in Firebase wirklich synchronisiert sind.

## Ladezustand und Fehler

### Positiv

- Hub und Dashboard haben sichtbare Lade- und Retry-Zustaende.
- Fehlende Liga, fehlender Spieler und fehlendes Team zeigen Recovery statt blank screen.
- Draft Pick Feedback ist sichtbar.

### Negativ

- Mehrere Fehlermeldungen sind technisch korrekt, aber nicht priorisiert.
- "Diese Aktion ist im Firebase-Multiplayer noch nicht synchronisiert" ist ehrlich, aber fuer Spieler ein harter Immersionsbruch.
- Admin-Fehler und Player-Fehler sind noch nicht als konsistentes Fehlerkonzept mit Codes, naechstem Schritt und Support-Kontext gestaltet.

## Mobile/Responsive

Nicht per Screenshot-Matrix verifiziert. Aus Code-Sicht sind viele Layouts responsive (`grid`, `sm`, `lg`, `xl`), aber:

- Draft-Tabelle hat `min-w-[620px]` und horizontalen Scrollbereich.
- Online-Dashboard ist sehr lang und feature-reich.
- Adminseiten sind fuer Desktop-Administration gebaut.

Bewertung: wahrscheinlich nutzbar auf Tablet/Desktop, aber kein belastbar getesteter Mobile-Flow.

## Spielerische Frustpunkte

1. Nach dem Draft fehlt ein echtes Ergebnis-Erlebnis.
2. Einige Firebase-Multiplayer-Aktionen sind sichtbar, aber nicht synchronisiert.
3. Draft-Entscheidungen haben zu wenig Kontext.
4. Neue Spieler muessen Team-Identitaet waehlen, bevor sie Liga-Kontext verstanden haben.
5. Admin ist fuer Liga-Fortschritt zentral; ohne Admin-Aktion passiert nach Ready nichts.
6. Kein klares "Was passiert als Naechstes?" nach jedem grossen Schritt.

## Ist der Flow logisch?

Teilweise.

Der Makro-Flow ist logisch: Online Hub -> Join -> Draft -> Dashboard -> Ready -> Week Simulation. Die technische Reihenfolge ist gut. Das Problem ist die Produktqualitaet der letzten beiden Schritte. Ein Spieler fuehlt nach dem Draft noch keinen echten Saisonstart, weil Simulation und Ergebnisdarstellung nicht tief genug integriert sind.

## Ist das Spielgefuehl belohnend?

Noch nicht ausreichend.

Der Draft kann kurzfristig belohnen, weil der Spieler Kader aufbaut. Danach fehlt die groesste Belohnung: die Antwort des Spiels auf seine Entscheidungen. Ohne echte Week-Ergebnisse, Reports, Tabellen, Konsequenzen und naechste Ziele bleibt der Multiplayer eher ein Admin-/State-Test als ein Management-Spiel.

## UX-Fazit

Der Online-Einstieg ist MVP-faehig, der Draft ist MVP-spielbar, aber die komplette erste Woche ist noch nicht als Spielerlebnis geschlossen. Fuer eine spielbare Version muss der Post-Draft-Loop radikal fokussiert werden: Ready, Simulation, Ergebnis, Konsequenz, naechste Aufgabe. Alles andere ist nachrangig.
