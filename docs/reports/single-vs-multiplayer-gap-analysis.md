# Singleplayer vs Multiplayer Gap Analysis

| Feature | Singleplayer Status | Multiplayer Status | Multiplayer benötigt? | Priorität | Begründung | empfohlene Umsetzung |
|---|---|---|---|---|---|---|
| SaveGame / Einstieg | Voller SaveGame-Hub mit persistenter Spielwelt | Online Hub mit Local/Firebase Repository | Ja | Critical | Multiplayer braucht zentralen Liga-State statt Browser-Save | Repository-Backbone behalten, localStorage nur Legacy |
| Auth / Identität | Singleplayer an SaveGame/User-Kontext gekoppelt | Firebase Anonymous Auth im Firebase-Modus, Legacy local user im Local-Modus | Ja | Critical | Online-Aktionen brauchen nicht manipulierbare User-ID | Firebase UID als Autorität, lokale ID nur Fallback |
| Rollen | Singleplayer braucht keine Liga-Rollen | `admin`/`gm` Guards vorhanden | Ja | Critical | Admin/GM-Aktionen müssen getrennt sein | Guards + Rules weiter ausbauen, Admin Commands serverseitig härten |
| Teamdaten | Teamseiten, Teamübersicht und Teamkontext vorhanden | Team-Identity und Teamzuweisung vorhanden | Ja | Critical | GM muss wissen, welches Team er kontrolliert | Teamdaten im Dashboard sichtbar halten, Firestore Teams als zentrale Quelle |
| Roster | Team-Roster, Roster-Tabelle, Verträge, Spielerstatus vorhanden | Contract-Roster lokal vorhanden, Dashboard bisher wenig sichtbar | Ja | Critical | Ohne Kader fühlt sich Online leer an | Roster-Zusammenfassung ins Online-Dashboard übernehmen |
| Positionsgruppen | Singleplayer zeigt positions-/rollenbasierte Kaderdaten | Online hatte Contract-Roster ohne klare Positionssicht | Ja | High | Aufstellung und Entscheidungen brauchen Positionskontext | Depth-Chart-Einträge aus aktiven Spielern generieren |
| Depth Chart | Eigene Depth-Chart-Seiten und Simulation-Depth-Chart | Online fehlte persistente, GM-bezogene Aufstellung | Ja | Critical | Week Flow und faire Simulation brauchen festgelegte Starter | Online-Depth-Chart pro Team speichern; GM darf nur eigenes Team ändern |
| Verletzungen / Fatigue | Player Condition, Fatigue Recovery und Injury-Daten vorhanden | Training-Outcomes haben Fatigue/InjuryRisk, keine echte Injury-Sync | Ja, später | Medium | Für echten Online-Loop relevant, aber nicht Backbone-kritisch | Erst als Read-Modell anzeigen, echte Injury-Integration später |
| Coaches | Staff-/Coach-System vorhanden | Online Coaching-System vorhanden | Ja | Medium | Training und Entwicklung profitieren davon | Beibehalten, später Firestore-subcollectionfähig machen |
| Week Flow Status | PRE_WEEK, READY, GAME_RUNNING, POST_GAME, Advance Week | Ready-State und Placeholder-Woche, aber wenig Statusmodell | Ja | Critical | GMs brauchen klare nächste Aktion | `weekStatus` und Dashboard-Next-Action ergänzen |
| Default Actions | Singleplayer kann Wochenaktionen vorbereiten/defaulten | Online Training defaultet lokal, Firebase-Backbone nur Placeholder | Ja | High | Inaktive GMs dürfen Liga nicht blockieren | Default Actions im Week Command serverseitig finalisieren |
| Match Setup | Game Setup, Preview, Preparation und Start Game | Online nur nächste Partie Placeholder | Ja | High | Vollwertiger GM-Modus braucht Gegner/Setup | Schedule/Match Setup als Online-Read-Model nachziehen |
| Simulation | Echte Engine und Orchestrator vorhanden | Online Simulation bewusst Placeholder | Ja, aber blockiert | Critical | Echte Ergebnisse sind zentral für Liga | Nicht clientseitig kopieren; serverseitiger Week Command/Cloud Function nötig |
| Results | Match Report, Box Score, Post Game, Reports | Online hatte keine persistenten Ergebnisse | Ja | Critical | Online-Liga braucht gemeinsame Historie | MatchResult-Placeholder persistieren und Dashboard anzeigen |
| Stats | Umfangreiche Stats/Reports im Singleplayer | Online noch keine Stats-Persistenz | Ja, später | High | Liga-Vergleich und GM-Bewertung brauchen Stats | Nach echter Simulation als Firestore Result/Stats Collections |
| Standings | League/Schedule/Standings vorhanden | Online bisher keine Tabelle | Ja | High | Multiplayer braucht Konkurrenzgefühl | Aus Online-Ergebnissen einfache Standings berechnen |
| Dashboard Status | Next Action, Week Loop, Team Snapshot vorhanden | Online hatte Ready/League Dashboard, aber wenig Handlungsführung | Ja | High | Nutzer muss wissen, was jetzt zu tun ist | Command-Center-Statusbox übernehmen |
| Admin / Commissioner | Singleplayer nicht relevant | Admin Hub, Logs, Aktionen vorhanden | Ja | Critical | Online braucht Commissioner-Kontrolle | Admin Logs behalten; kritische Commands serverseitig verlagern |
| Persistence | SaveGame-Welt mit Normalisierung | Local MVP + Firebase Backbone, noch gemischt | Ja | Critical | Online muss zentral und kompatibel sein | Normalisierung erweitern, Legacy klar trennen |
| Migration / Defaults | Bootstrap/Seeds existieren | Online Defaults für Teams/Roster/League vorhanden | Ja | High | Alte lokale Online-Daten dürfen nicht brechen | Backward-compatible Normalizer beibehalten |
| Realtime | Singleplayer nicht nötig | Firestore Listener im Backbone | Ja | Critical | Mehrere User müssen denselben State sehen | Listener für League/Memberships/Teams/Events nutzen |
| E2E | Singleplayer E2E vorhanden | Kein dediziertes Multiplayer-E2E-Script | Ja | High | Zwei-Browser-Flows müssen abgesichert werden | `test:e2e:multiplayer` ergänzen, sobald DB/Emulator-Setup stabil ist |

## Critical / High Umsetzung in diesem Paket

- Persistente Online-Depth-Chart pro Team.
- Rollenfähige Repository-Methode für Depth-Chart-Updates.
- Firestore Rules erlauben GM nur eigene Depth-Chart-Felder.
- Online-Week-Status als lokales/kompatibles Modell.
- Online-MatchResult-Placeholder mit persistierten Ergebnissen.
- Standings und Recent Results im Online-Dashboard.
- Command-Center-Statusbox mit nächster Aktion.

## Blocker

- Echte Simulation darf nicht clientseitig aus Singleplayer kopiert werden. Sie braucht einen serverseitigen Multiplayer-Week-Command.
- Vollständig sichere Admin Commands brauchen Cloud Functions oder Next Route Handlers mit Admin SDK.
- Dedizierte Multiplayer-E2E-Skripte fehlen noch.
