# Multiplayer Anwender-Report

## Kurzfazit

Ein neuer Spieler versteht wahrscheinlich, wie er den Online-Modus öffnet, eine Liga sucht und einer Liga beitritt. Danach wird der Modus aber sehr schnell zu komplex: Zu viele Systeme, englische Fachbegriffe und Zahlen erscheinen gleichzeitig, ohne dass klar genug erklärt wird, was jetzt wirklich wichtig ist.

Hauptproblem in einem Satz: Der Einstieg ist machbar, aber nach dem Beitritt fühlt sich das Dashboard eher wie ein Experten-Cockpit an als wie ein geführter erster Online-GM-Start.

Go/No-Go: **Go mit Einschränkungen** für einen kleinen Nutzertest mit begleiteten Testpersonen. **No-Go** für einen unbegleiteten Test mit komplett neuen Spielern.

## Testprofil

- Wenig Simulationserfahrung
- Football-Grundwissen begrenzt
- Fokus auf Einstieg, Verständlichkeit, Orientierung und Frustpunkte
- Bewertung aus Spielerperspektive, nicht aus Entwicklersicht

## Bewertungsmatrix

| Bereich | Bewertung | Kurzbegründung |
|---|---|---|
| Einstieg | Grün | Online Hub ist klar benannt, drei Hauptaktionen sind sichtbar. |
| Liga-Beitritt | Gelb | Ablauf funktioniert verständlich, aber "lokale Liga" und Testliga-Kontext wirken erklärungsbedürftig. |
| Team-Erstellung | Gelb | Vorschau hilft, Kategorien bleiben aber ohne Erklärung abstrakt. |
| Dashboard | Rot | Zu viele Systeme gleichzeitig; neuer Spieler weiß nicht, was Pflicht und was optional ist. |
| Training | Gelb | Grundidee ist erkennbar, Begriffe und Konsequenzen brauchen mehr Übersetzung. |
| Franchise/Fans/Finanzen | Rot | Viele Zahlen wirken ohne Kontext zufällig oder wie Debug-Werte. |
| Owner/Job Security | Gelb | Entlassungsdruck ist interessant, aber Ursachen und Gegenmaßnahmen bleiben zu vage. |
| Week Flow | Gelb | Ready-Button und Command Center helfen, aber Simulation bleibt als "noch nicht verfügbar" unbefriedigend. |
| Fehlermeldungen | Grün | Lade-, Fehler- und Erfolgsmeldungen sind grundsätzlich verständlich. |
| Gesamtverständlichkeit | Gelb | Einstieg okay, danach hohe Einstiegshürde. |

## Beobachtungen

### 1. Einstieg

Bereich: Online Hub  
Problem: "Online Liga" klingt nach echtem Multiplayer, aber im Flow tauchen Begriffe wie lokale Liga, Testliga und Global Test League auf.  
Warum schwierig: Neue Nutzer wissen nicht, ob sie wirklich online spielen oder nur einen lokalen Testmodus sehen.  
Schweregrad: High  
Verbesserungsvorschlag: Direkt unter dem Titel klar sagen: "Aktuell MVP/Testmodus" oder "Echte Online-Synchronisation aktiv", abhängig vom Modus.

### 2. Weiterspielen

Bereich: Online Hub  
Problem: "Weiterspielen" ist verständlich, aber ohne vorherigen Join kann der Button wie ein Startbutton wirken.  
Warum schwierig: Ein neuer Spieler klickt wahrscheinlich zuerst darauf und bekommt dann eine Meldung. Das ist okay, fühlt sich aber wie ein kleiner Fehlstart an.  
Schweregrad: Medium  
Verbesserungsvorschlag: Buttontext oder Unterzeile: "Öffnet deine zuletzt gespielte Liga".

### 3. Liga suchen

Bereich: Liga-Beitritt  
Problem: Es ist nicht sofort klar, ob man eine bestehende Liga sucht oder selbst eine erstellen kann.  
Warum schwierig: Neue Spieler erwarten bei Multiplayer oft "Liga erstellen" und "Liga beitreten" nebeneinander.  
Schweregrad: Medium  
Verbesserungsvorschlag: Hinweis: "Als Spieler trittst du einer Liga bei. Neue Ligen erstellt ein Admin."

### 4. Team-Identität

Bereich: Team-Erstellung  
Problem: Stadt, Kategorie und Teamname sind logisch, aber die Kategorien Identity, Aggressive, Modern und Classic erklären sich nicht von selbst.  
Warum schwierig: Ein neuer Nutzer wählt eher nach Bauchgefühl und weiß nicht, ob die Wahl Auswirkungen hat.  
Schweregrad: Medium  
Verbesserungsvorschlag: Kurze Ein-Satz-Erklärung pro Kategorie, z. B. "Classic = traditionelle Sportnamen".

### 5. Optionsmenge

Bereich: Team-Erstellung  
Problem: Es gibt sehr viele Städte und Namen.  
Warum schwierig: Das ist schön für Tiefe, aber beim ersten Join kann es bremsen.  
Schweregrad: Low  
Verbesserungsvorschlag: Empfohlene Schnellwahl oder Zufallsbutton: "Team vorschlagen".

### 6. Join-Feedback

Bereich: Liga-Beitritt  
Problem: Erfolgsmeldung und "Liga öffnen" helfen gut.  
Warum schwierig: Kein großes Problem, eher positiv.  
Schweregrad: Low  
Verbesserungsvorschlag: Nach erfolgreichem Join könnte die primäre Aktion noch stärker sein: "Jetzt Liga öffnen".

### 7. Dashboard-Überladung

Bereich: Dashboard  
Problem: Nach dem Beitritt erscheinen sehr viele Bereiche: Week Flow, eigenes Team, Command Center, Franchise, Training, Coaches, Contracts, Trades, Draft usw.  
Warum schwierig: Ein neuer Spieler weiß nicht, welche drei Dinge jetzt wirklich wichtig sind.  
Schweregrad: Critical  
Verbesserungsvorschlag: Für neue Nutzer zuerst eine kompakte "Heute erledigen"-Checkliste anzeigen und fortgeschrittene Bereiche einklappbar machen.

### 8. Command Center

Bereich: Dashboard  
Problem: "Was jetzt wichtig ist" ist genau die richtige Idee, wird aber von vielen gleichrangigen Panels überlagert.  
Warum schwierig: Die wichtigste Orientierung verliert visuell gegen die Systemfülle.  
Schweregrad: High  
Verbesserungsvorschlag: Command Center ganz oben stärker priorisieren und als klaren Schritt 1/2/3 formulieren.

### 9. Depth Chart

Bereich: Dashboard  
Problem: "Depth Chart" ist nicht erklärt.  
Warum schwierig: Ohne Football-/Manager-Wissen ist unklar, ob das die Aufstellung, Ersatzbank oder etwas anderes ist.  
Schweregrad: High  
Verbesserungsvorschlag: Label übersetzen oder ergänzen: "Aufstellung / Depth Chart".

### 10. Ready-State

Bereich: Week Flow  
Problem: "Bereit für Week X" ist verständlich, aber es bleibt unklar, was vorher erledigt sein sollte.  
Warum schwierig: Der Nutzer fragt sich: "Kann ich einfach Ready klicken oder verpasse ich wichtige Entscheidungen?"  
Schweregrad: High  
Verbesserungsvorschlag: Vor dem Ready-Button kurze Checkliste: Team prüfen, Training setzen, Strategie prüfen.

### 11. Simulation

Bereich: Week Flow  
Problem: Es steht "Simulation noch nicht verfügbar" und "Online-Simulation folgt im nächsten Arbeitspaket".  
Warum schwierig: Für Spieler klingt das unfertig und reißt aus der Spielwelt.  
Schweregrad: High  
Verbesserungsvorschlag: Spielerfreundlicher formulieren: "Die Woche kann aktuell nur vom Admin als Testlauf weitergeschaltet werden."

### 12. Training

Bereich: Training  
Problem: Die Idee ist gut, aber Begriffe wie Intensity, Focus, Risk, Fatigue, Injury Risk, Prep und Chemistry sind gemischt englisch und deutsch.  
Warum schwierig: Neue Nutzer verstehen die Wirkung nur teilweise.  
Schweregrad: Medium  
Verbesserungsvorschlag: Deutschsprachige Labels und Tooltips: "Müdigkeit", "Verletzungsrisiko", "Spielvorbereitung".

### 13. Trainingskonsequenzen

Bereich: Training  
Problem: Es gibt gute Erklärungstexte zu Hard/Extreme/Recovery, aber sie erscheinen eher als Statusbox statt als Entscheidungshilfe direkt am Eingabefeld.  
Warum schwierig: Nutzer müssen lesen, auswählen, wieder prüfen.  
Schweregrad: Medium  
Verbesserungsvorschlag: Beim Ändern der Auswahl direkt "Erwarteter Effekt" neben den Controls aktualisieren.

### 14. Franchise/Fans/Finanzen

Bereich: Franchise  
Problem: FanMood, FanPressure, MerchTrend, Season P/L, Gameplay Modifier und Revenue erscheinen ohne klare Einordnung.  
Warum schwierig: Zahlen wie 60/100 oder 0 USD sagen wenig, wenn man nicht weiß, was gut oder schlecht ist.  
Schweregrad: High  
Verbesserungsvorschlag: Ampeltexte ergänzen: "Gut", "Neutral", "Kritisch" plus eine kurze Ursache.

### 15. Preise

Bereich: Franchise/Fans/Finanzen  
Problem: Ticketpreise und Merch Preise als 1-100 Slider sind leicht bedienbar, aber die Auswirkung ist unklar.  
Warum schwierig: Spieler wissen nicht, ob 70 mutig, normal oder gefährlich ist.  
Schweregrad: Medium  
Verbesserungsvorschlag: Live-Hinweis: "Höhere Preise können Einnahmen steigern, aber Fans verärgern und Auslastung senken."

### 16. Owner/Job Security

Bereich: Owner / Job Security  
Problem: "Job Security 72/100 stable" ist interessant, aber sehr abstrakt.  
Warum schwierig: Neue Nutzer verstehen nicht sofort, was sie tun können, um sicherer zu werden.  
Schweregrad: Medium  
Verbesserungsvorschlag: Konkrete Ursache + Handlung: "Owner erwartet stabile Entwicklung. Siege, Playoff-Ziel und aktive Week Actions helfen."

### 17. Entlassung und Admin

Bereich: Admin-/Liga-Kontext  
Problem: Im Spielerflow ist nicht prominent erklärt, dass Inaktivität Folgen haben kann und ein Admin eingreifen darf.  
Warum schwierig: Das kann später unfair wirken, wenn ein Spieler entfernt wird.  
Schweregrad: Medium  
Verbesserungsvorschlag: Im Dashboard eine Liga-Regelbox: "Bei verpassten Wochen kann der Admin warnen oder dein Team vakant setzen."

### 18. Verträge und Cap

Bereich: Contracts & Cap  
Problem: Salary Cap, Dead Cap, Signing Bonus, Cap Hit sind sehr fortgeschritten.  
Warum schwierig: Ohne Erklärung kann ein Spieler riskante Aktionen wie Entlassen oder Verlängern falsch einschätzen.  
Schweregrad: High  
Verbesserungsvorschlag: Warnung vor Vertragsaktionen: "Entlassen kann Dead Cap erzeugen und Geld blockieren."

### 19. Sprache

Bereich: Allgemeine UX  
Problem: Viele Labels sind englisch: FanMood, FanPressure, Week, Ready, Cap, Prep, Focus, Risk, Owner Confidence.  
Warum schwierig: Einzelne Begriffe sind okay, aber die Mischung erhöht die kognitive Last.  
Schweregrad: Medium  
Verbesserungsvorschlag: Entweder konsequent Deutsch oder konsequent Football-englisch mit Tooltips.

### 20. Mobile/responsive Eindruck

Bereich: Allgemeine UX  
Problem: Layout nutzt responsive Grids und wirkt technisch mobil vorbereitet. Die Menge an Panels dürfte auf Mobile aber lang und schwer scanbar sein.  
Warum schwierig: Neue Nutzer scrollen sehr viel und verlieren Orientierung.  
Schweregrad: Medium  
Verbesserungsvorschlag: Mobile Akkordeons oder Tabs: Übersicht, Woche, Team, Training, Franchise.

## Top 10 Frustpunkte

1. Nach dem Join erscheinen zu viele Systeme auf einmal.
2. Unklar, welche Aktionen vor "Bereit" wirklich nötig sind.
3. Viele Fachbegriffe ohne Erklärung.
4. Mischung aus Deutsch und Englisch wirkt anstrengend.
5. "Simulation noch nicht verfügbar" fühlt sich unfertig an.
6. Franchise-/Finanzzahlen wirken ohne Kontext zufällig.
7. Training hat viele Optionen, aber keine einfache Empfehlung.
8. Salary Cap und Dead Cap sind riskant, aber nicht anfängerfreundlich erklärt.
9. Admin-Regeln/Inaktivitätsfolgen sind aus Spielerperspektive nicht früh genug sichtbar.
10. Teamnamen-Kategorien sind nicht selbsterklärend.

## Top 10 Verbesserungen

1. Erste-Schritte-Checkliste im Dashboard: Team ansehen, Training wählen, Ready setzen.
2. Anfänger-Modus: Nur wichtigste Panels anzeigen, Rest einklappen.
3. Tooltips für GM, Owner, Franchise, Depth Chart, Cap, Dead Cap, FanPressure.
4. "Empfohlene Einstellung" bei Training und Strategie.
5. Bessere Erklärung unter "Bereit": was passiert danach?
6. Team-Erstellung mit "Team vorschlagen"-Button.
7. Finanzwerte mit Ampelbewertung und Kurzursache.
8. Spielerfreundliche Formulierung statt "nächstes Arbeitspaket".
9. Einheitlichere Sprache.
10. Liga-Regelbox: Admin, Inaktivität, Ready-Regeln, Simulation.

## Unklare Begriffe

- GM
- Owner
- Franchise
- Depth Chart
- Starter
- Backup
- Salary Cap
- Cap Hit
- Dead Cap
- Signing Bonus
- Free Agent
- Trade Board
- Draft
- Prospect
- Training Focus
- Intensity
- Risk
- Fatigue
- Prep
- Chemistry
- FanMood
- FanPressure
- Owner Confidence
- Week Simulation
- Ready-State
- Vacant Team

## Empfohlene Onboarding-Hilfen

- Erste-Schritte-Checkliste im Online-Dashboard.
- "Was soll ich jetzt tun?" Box dauerhaft ganz oben.
- Tooltips bei allen Fachbegriffen.
- Kurze leere Zustände mit Spielerziel, nicht nur "keine Daten".
- Warnungen vor riskanten Entscheidungen wie Spieler entlassen oder extreme Training.
- Einsteiger-Empfehlungen: "Für Woche 1 empfehlen wir normal / balanced."
- Fortschrittsanzeige: "1 von 3 Pflichtschritten erledigt".
- Kurzer Hinweis nach Join: "Du bist jetzt GM von X. Als Nächstes prüfst du dein Team."
- Admin-/Liga-Regeln als verständliche Box.
- Einklappbare Expertenbereiche für Contracts, Trades, Draft und Finance.

## Go/No-Go Empfehlung

**Go mit Einschränkungen.**

Der Multiplayer-Modus ist für einen begleiteten Nutzertest geeignet, wenn das Produktteam gezielt beobachten will, wo neue Spieler hängen bleiben. Für einen offenen Test mit echten neuen Nutzern ist der Modus noch zu erklärungsarm und nach dem Beitritt zu überladen.

Empfohlenes Testformat: 3-5 neue Nutzer, moderiert, mit Aufgabe "Tritt einer Liga bei und bereite Woche 1 vor". Dabei besonders messen, ob sie ohne Hilfe verstehen, ob sie Training setzen müssen und wann sie Ready klicken sollen.
