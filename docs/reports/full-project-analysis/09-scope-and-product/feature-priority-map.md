# Feature Priority Map

## Ziel der Analyse

Priorisierung aller sichtbaren und vorbereiteten Produktbereiche in Must-have, Should-have, Later und Remove/Hide fuer ein klares Multiplayer-MVP.

## Priorisierungskriterien

- Traegt direkt zum Core Game Loop bei?
- Ist technisch bereits stabil genug?
- Versteht ein Spieler den Nutzen sofort?
- Erzeugt das Feature neue Datenmodell-, UI- oder Admin-Komplexitaet?
- Wirkt es unfertig, wenn es sichtbar bleibt?

## Must-have

| Feature | Warum zwingend | Aktueller Zustand | Empfehlung |
| --- | --- | --- | --- |
| Auth / eingeloggter User | Ohne User keine Team-Zuordnung. | Funktional, aber UX teils technisch. | Behalten, vereinfachen. |
| Online Hub | Einstieg fuer Join/Rejoin. | Funktional. | Behalten. |
| Liga suchen | Erstkontakt mit Multiplayer. | Funktional, aber Join UX komplex. | Behalten, vereinfachen. |
| Rejoin / Weiterspielen | Returning Player muss zurueck ins Team. | Funktional, aber datenabhaengig. | Muss robust werden. |
| Membership + Team-Zuweisung | Kern der Multiplayer-Identitaet. | Technisch verbessert. | Must-have, stark testen. |
| Dashboard | Zentrale Statusseite. | MVP-funktional. | Behalten, radikal auf naechste Aktion fokussieren. |
| Ready-State | Spieleraktion im Week Loop. | Funktional. | Behalten, prominenter machen. |
| Spielablauf / Week Loop | Fortschritt des Spiels. | Funktional ueber Admin/Service. | Must-have. |
| Schedule / naechste Partie | Spieler muss wissen, worauf er sich vorbereitet. | Vorhanden. | Must-have. |
| Results / Standings | Reward und Fortschritt nach Simulation. | Vorhanden. | Must-have. |
| Roster | Team-Verstaendnis. | Vorhanden. | Must-have. |
| Depth Chart | Minimaler Team-Management-Hebel. | Vorhanden. | Must-have. |
| Draft | Bei Draft-Phase zentral. | Funktional, route-explizit. | Must-have nur bei aktiver Draft-Phase, sonst History/Status. |
| Admin Week Simulation | Fuer MVP noetig, solange keine automatische Liga-Progression existiert. | API/Service vorhanden. | Must-have fuer interne Ligaops. |

## Should-have

| Feature | Nutzen | Aktueller Zustand | Empfehlung |
| --- | --- | --- | --- |
| Savegames als Hauptmenue | Zentraler Einstieg fuer Offline/Online/Admin. | Funktional, aber viele Optionen. | Behalten, visuell vereinfachen. |
| Resume-First | Wichtig fuer Returning Player. | Noch nicht robust genug. | Erst bauen, wenn Online/Offline Resume wirklich einheitlich ist. |
| Team Overview | Identitaet und Kontext. | Fuer Online als Dashboard-Anker vorhanden. | Behalten, aber nicht ueberladen. |
| League Uebersicht | Tabelle, Teams, Results. | Vorhanden. | Behalten. |
| Admin League Detail | Operativer Liga-Status. | Funktional, komplex. | Behalten fuer Admins, nicht Spieler. |
| Debug Tools | Hilft bei Staging. | Vorhanden. | Nur Admin, klar sekundaer. |
| Basic Depth Chart Editing | Spieler gibt Team etwas Agency. | Teilweise vorhanden. | Should-have, aber kein komplexes Gameplan-System. |
| Basic Roster Health/Completeness | Erklaert Sperren. | Teilweise vorhanden. | Behalten. |

## Later

| Feature | Warum spaeter | Empfehlung |
| --- | --- | --- |
| Multiplayer Contracts/Cap | Erfordert Vertragslogik, Cap-Regeln, Free Agency, UI und Balancing. | Coming Soon lassen oder aus Hauptnavigation nehmen. |
| Multiplayer Development | Braucht Trainingsplaene, XP, Progression, Fairness, Week-Integration. | Freeze bis Core Loop stabil ist. |
| Multiplayer Trade Board | Hohe Missbrauchs-, Balance- und Konsistenzrisiken. | Freeze. |
| Multiplayer Inbox | Erhoeht Kommunikations-/Notification-Komplexitaet, nicht fuer Core Loop noetig. | Freeze. |
| Multiplayer Finance | Nicht noetig fuer erstes spielbares Online-Erlebnis. | Freeze. |
| Staff / Coaching Deep Systems | Viele Daten, wenig unmittelbarer MVP-Nutzen. | Later. |
| Media/Owner Expectations im Online MVP | Kann Flair geben, ist aber nicht Core. | Nur read-only/hidden. |
| Advanced Scouting | Nur relevant fuer spaetere Draft-Tiefe. | Later. |
| Full Commissioner Tooling | Noetig fuer Betrieb, aber nicht vor Spielerloop. | Schrittweise, nicht als Spielerfeature. |

## Remove/Hide

| Feature/UI | Grund | Empfehlung |
| --- | --- | --- |
| Gleichrangige Anzeige aller nicht-MVP Sidebar-Punkte | Erzeugt falsches Produktversprechen. | In "Spaeter" gruppieren oder aus Hauptmenue verstecken. |
| Admin als gleichrangiger Start-CTA fuer normale User | Admin ist kein Spielmodus. | Nur fuer Admins zeigen, visuell sekundaer. |
| Redundante Admin Actions `Oeffnen` und `Details verwalten` | Gleiche Semantik. | Einen entfernen oder klar trennen. |
| Admin `Woche abschliessen`, wenn es faktisch Simulation ausloest | Irrefuehrend. | Umbenennen/verstecken bis echte Semantik existiert. |
| Online Local Expert Actions in Firebase-Kontext | Nicht synchronisiert, verwirrt. | Weiter ausblenden. |
| Technische Debug-Copy fuer normale Spieler | Bricht Game-Illusion. | Nur Admin/Details anzeigen. |
| Unfertige Offline-Unterseiten als normale Kernnavigation | Laesst Offline groesser wirken als stabil. | Coming Soon klarer gruppieren. |

## Feature-Komplexitaet nach Produktnutzen

| Feature | Nutzen jetzt | Komplexitaet | Entscheidung |
| --- | --- | --- | --- |
| Ready-State | Hoch | Niedrig-Mittel | Ausbauen/haerten |
| Results/Standings | Hoch | Mittel | Ausbauen/haerten |
| Rejoin | Hoch | Hoch | Priorisieren |
| Admin Simulation | Hoch fuer Betrieb | Mittel-Hoch | Priorisieren, aber Admin-only |
| Roster | Hoch | Mittel | Behalten |
| Depth Chart | Mittel-Hoch | Mittel | Behalten |
| Draft | Phasenabhaengig hoch | Hoch | Behalten, nicht erweitern |
| Contracts/Cap | Niedrig jetzt | Hoch | Freeze |
| Trades | Niedrig jetzt | Sehr hoch | Freeze |
| Finance | Niedrig jetzt | Hoch | Freeze |
| Development | Mittel spaeter | Hoch | Freeze |
| Inbox | Niedrig jetzt | Mittel | Hide/Freeze |

## Top Arbeitsnutzen

1. Online Rejoin und Recovery entlooppen.
2. Dashboard auf eine klare naechste Aktion fokussieren.
3. Admin Week Simulation live/Browser-seitig verifizieren.
4. Nicht-MVP Navigation reduzieren.
5. Results/Standings/Next Game als Reward-Schleife schaerfen.

## Fazit

Der hoechste Produktnutzen liegt nicht in mehr Features, sondern in weniger sichtbarer Flaeche und einem staerkeren Kernloop. Must-have ist der spielbare Wochenkreislauf; alles andere muss sich diesem Loop unterordnen.
