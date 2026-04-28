# Finaler GUI-Bericht zur GM-Simulation

Stand: 2026-04-25  
Basis: Konsolidierung der bisherigen Analysen zu GUI-Grundstruktur, Navigation, Screens, Komponenten, Datenfluss, UX und technischer Qualitaet. Es wurde keine neue Funktionalitaet bewertet oder implementiert.

## Kurzfazit

Die bestehende GUI ist als MVP-Basis fuer reale Nutzung grundsaetzlich bereit. Sie zeigt dem GM Savegame, Team, Saison, Kader, naechstes Spiel und wichtige Aufgaben bereits nachvollziehbar an. Die wichtigsten Systeme sind erreichbar und nutzen echte Datenquellen statt Mock-Daten.

Die groessten Risiken liegen nicht im technischen Fundament, sondern in der Informationsarchitektur: Die Team-Seite buendelt zu viele Verantwortlichkeiten, einige Navigationspunkte fuehren noch nicht zu eigenen Arbeitsbereichen, und kritische Aktionen benoetigen klareres Feedback. Der naechste logische Entwicklungsschritt ist daher, Team-, Finanz-, Development- und Game-Preparation-Flows sauberer zu trennen und die Aktions-UX zu stabilisieren.

## 1. Gesamtuebersicht der GUI

Die GUI ist eine savegame-zentrierte GM-Anwendung. Nach Auswahl eines Savegames stellt die App den aktuellen Kontext bereit: Savegame, Saison, Woche und Manager-Team. Darauf aufbauend fuehrt sie den Nutzer durch den Kern-Loop einer Football-GM-Simulation:

1. Status pruefen
2. Aufgaben priorisieren
3. Team und Kader verwalten
4. Spiel vorbereiten
5. Woche simulieren
6. Spielberichte und Saisonstand analysieren

| Bereich | Aufgabe |
|---|---|
| App Shell | Grundlayout mit Sidebar, TopBar, Breadcrumbs und PageHeader |
| Dashboard | zentraler Einstieg mit Teamstatus und naechster Aktion |
| Team Overview | Teamzustand, Needs, Schemes, Finanzen, Roster und Depth Chart |
| Roster Building | Free Agency und Signings |
| Saison / Liga | Standings, Schedule, Playoff Picture und Wochensimulation |
| Game Center / Report | Spielstatus, Drives, Scores, Boxscore und Top Performer |
| Inbox | priorisierte Aufgaben und relevante Ereignisse |

Zentrale Designprinzipien:

- Savegame-Kontext bleibt sichtbar.
- GM-Entscheidungen stehen vor reiner Datendarstellung.
- Echte Datenquellen werden bevorzugt.
- Wiederverwendbare Komponenten strukturieren die Oberflaeche.
- Screens sind eher arbeitsorientiert als dekorativ aufgebaut.

## 2. Navigation

Die Hauptnavigation ist funktional nach GM-Arbeitsbereichen gegliedert.

| Menuepunkt | Ziel / Bedeutung | Bewertung |
|---|---|---|
| Dashboard | Startseite des aktiven Savegames | klar und wichtig |
| Inbox | Aufgaben, Blocker, wichtige Hinweise | sehr sinnvoll fuer Orientierung |
| Team | Team Overview mit Kader, Finanzen, Schemes, Depth Chart | funktional stark, aber ueberladen |
| Game | fuehrt aktuell eher in den Saison-/Match-Kontext | Ziel sollte klarer auf naechstes Spiel zeigen |
| League | Saison, Tabelle, Schedule | logisch |
| Roster Building | Free Agency | klarer eigenstaendiger Flow |
| Contracts & Finance | aktuell kein eigener Screen, fuehrt in Team-Kontext | strukturelle Luecke |
| Development | aktuell kein eigener Screen, Development liegt verteilt | strukturelle Luecke |
| Savegames | Savegame-Hub | logisch |

Typische User-Flows:

| Flow | Ablauf | Bewertung |
|---|---|---|
| Dashboard zu Spiel | Dashboard -> MatchCard -> Game Center -> Spielbericht | sinnvoll, Game-Menue koennte direkter sein |
| Roster zu Spielerprofil | Team -> RosterTable -> Spielerprofil | klar und effizient |
| Saison zu Spielbericht | League -> Schedule -> Match/Game Center -> Report | logisch, Status-Unterscheidung sollte sichtbarer sein |
| Inbox zu Aktion | Inbox -> Aufgabe -> passender Screen | guter Orientierungspunkt |

## 3. Screens

| Screen | Zweck | Wichtigste Inhalte | Wichtigste Aktionen | Datenquellen / Services |
|---|---|---|---|---|
| Dashboard | GM-Startseite und naechste Aktion | Team, Saison/Woche, Record, Cap, Team Needs, naechstes Match | Team, Saison, Free Agency, Game Center oeffnen | `getSaveGameFlowSnapshot`, `getTeamDetailForUser`, `getSeasonOverviewForUser` |
| Team Overview | Teamzustand verstehen und verwalten | TeamCard, Needs, Schemes, Cap, Finance Events, Contracts, Depth Chart, Roster | Scheme aendern, Slots zuweisen, Spieler releasen | `getTeamDetailForUser` |
| Roster View | Kader durchsuchen und verwalten | Filter, Sortierung, mobile Karten, Desktop-Tabelle | Profil oeffnen, Release | `TeamDetail.players` |
| Player Profile | Einzelspieler bewerten | Header, Ratings, Attribute, Vertrag, Karriere, Entwicklung | Spieler bewerten, Teamkontext verstehen | `getPlayerDetailForUser` |
| Depth Chart | Starter und Rollen verwalten | Slots, Konflikte, Status, KR/PR, Captain, Development Focus | Assignment speichern | `TeamDetail.players`, `updateRosterAssignmentAction` |
| Free Agency | Spieler verpflichten | Markt, Needs, Cap/Cash, OfferBuilder | Spieler signen | `getFreeAgentMarketForUser`, `signFreeAgentAction` |
| Finanzen | Cap und Vertragslage verstehen | CapOverview, ContractTable, FinanceEventList | Spielerprofile aus Verträgen oeffnen | `TeamDetail.contractOutlook`, `recentFinanceEvents` |
| Saison / Liga | Liga- und Saisonstatus kontrollieren | Standings, Schedule, Playoff Picture, SimulationProgress | Woche simulieren, Match oeffnen | `getSeasonOverviewForUser`, `simulateSeasonWeekAction` |
| Game Setup | Spiel vorbereiten | Gegner, eigene Staerke, Gameplan/Schemes | Gameplan speichern | `getMatchDetailForUser`, `updateGamePreparationAction` |
| Game Center | Spielstatus verfolgen | Status, Score, letzter Drive, DriveLog | Report oeffnen | `getMatchDetailForUser` |
| Game Report | Spiel nachvollziehen | Scoreboard, BoxScore, TopPerformers, DriveLog | Spiel analysieren, vor Kickoff Gameplan setzen | `getMatchDetailForUser` |
| Inbox | Naechste Aufgaben erkennen | priorisierte Items, kritische/hohe Aufgaben, Links | direkt zum relevanten Screen springen | `buildInboxState` plus Savegame/Team/Season |

Bewertung: Die Screen-Abdeckung ist fuer ein MVP breit und brauchbar. Die wichtigsten GM-Bereiche sind vorhanden. Die groesste strukturelle Schwaeche ist, dass einige fachlich eigenstaendige Bereiche noch in der Team-Seite gebuendelt sind.

## 4. Komponenten

| Komponente | Zweck | Verwendung | Daten / Props |
|---|---|---|---|
| `AppShell` | globales Layout | alle Savegame-Screens | `AppShellContext`, `children` |
| `SidebarNavigation` | Hauptnavigation | AppShell | Savegame-, Team-, Season-Kontext |
| `TopBar` | sichtbarer Kontext | AppShell | Savegame, CurrentSeason, ManagerTeam |
| `Breadcrumbs` | Orientierung im Pfad | AppShell | Route und Kontext |
| `SectionPanel` | Standardbereich | fast alle Screens | Titel, Beschreibung, Actions, Inhalt |
| `StatCard` | Kennzahlen | Dashboard, Team, Player, Season, Match, Inbox | Label, Wert, Tone |
| `ActionRequiredBanner` | wichtigste Aktion anzeigen | Dashboard, Depth Chart | DashboardAction |
| `TeamNeedsPanel` | Team-Bedarfe priorisieren | Dashboard, Team, Free Agency Kontext | Needs, Links |
| `RosterTable` | Kader filtern und sortieren | Team | Spieler, Managerrechte, Release Action |
| `PlayerCard` | mobile Spielerdarstellung | RosterTable | Spieler-Summary |
| `RatingBadge` | kompakte Ratinganzeige | Roster, Cards | Label, Wert |
| `DepthChartView` | Lineup und Rollen | Team | Spieler, Team-ID, Assignment Action |
| `FreeAgentBoard` | Marktansicht | Free Agency | Market, Sign Action |
| `OfferBuilder` | Vertragsangebot | FreeAgentBoard | Cap, Cash, Spieler, Sign Action |
| `GamePreparationPanel` | Gameplan setzen | Game Report / Pre-Game Bereich | Match, Update Action |
| `GameCenterPanel` | Spielstatus | Game Center | Match, Report-Link |
| `Scoreboard` | Ergebnisuebersicht | Game Report | Match |
| `BoxScore` | Teamstatistiken | Game Report | Match |
| `DriveLog` | Drive-Verlauf | Game Center, Game Report | Drives |
| `TopPerformers` | Fuehrende Spieler | Game Report | Leaders |
| `InboxList` | Aufgaben anzeigen | Inbox | InboxState |

Die Komponenten sind insgesamt gut wiederverwendbar. Kritisch fuer die weitere Entwicklung sind besonders `RosterTable`, `DepthChartView`, `FreeAgentBoard`, `GamePreparationPanel`, `GameCenterPanel` und `InboxList`, weil sie echte GM-Entscheidungen tragen.

## 5. Datenfluss und Logik

Der Datenfluss ist klar serverorientiert:

1. Page laedt den angemeldeten Nutzer ueber `requirePageUserId`.
2. Page ruft einen `ForUser`-Query-Service auf.
3. Service laedt Daten ueber Repository/Prisma.
4. Service mappt Domain-Daten in frontend-taugliche View-Daten.
5. Komponenten stellen diese Daten dar.
6. Mutationen laufen ueber Server Actions.
7. Server Actions validieren Kontext, schreiben Daten und redirecten zurueck.

| Service / Logik | Aufgabe |
|---|---|
| `getSaveGameFlowSnapshot` | Savegame-, Team- und Saisonkontext bestimmen |
| `getTeamDetailForUser` | Team, Spieler, Needs, Verträge und Finanzen bereitstellen |
| `getPlayerDetailForUser` | Spielerprofil, Ratings, Attribute, Stats und Historie liefern |
| `getFreeAgentMarketForUser` | Free-Agent-Markt mit Need/Fit/Cap berechnen |
| `getSeasonOverviewForUser` | Standings, Schedule und Playoff Picture liefern |
| `getMatchDetailForUser` | Match, Score, Drives, Teamstats und Leaders liefern |
| `buildInboxState` | Aufgaben aus Team-, Saison- und Spielzustand ableiten |

Entscheidungslogik:

- Dashboard waehlt naechstes Match und naechste Aktion.
- Inbox priorisiert Blocker vor Roster, Finance und League Events.
- Depth Chart erkennt Konflikte und offene Starter-Slots.
- Free Agency sortiert nach Need, Scheme Fit und Overall.
- Game Setup erlaubt Aenderungen nur vor Kickoff und fuer das Manager-Team.
- Wochensimulation verhindert doppelte Starts ueber Locking.

## 6. GM-User Experience

Der Spieler versteht den Teamzustand grundsaetzlich schnell. Dashboard, StatCards, Team Needs, Cap Space und Inbox vermitteln die wichtigsten Informationen. Bestehende Probleme werden vor allem ueber Team Needs, Depth-Chart-Konflikte und Inbox sichtbar.

Entscheidungen werden in mehreren Bereichen gut unterstuetzt:

- Roster: filtern, sortieren, Spielerprofil oeffnen, Release.
- Depth Chart: Slots, Status, Spezialrollen, Captain, Development Focus.
- Free Agency: Need/Fit/OVR vergleichen, Cap pruefen, Signing ausloesen.
- Saison: Woche simulieren, Schedule und Standings pruefen.
- Spiel: Game Center und Report verbinden Verlauf und Ergebnis.

Stellen, an denen Nutzer haengen bleiben koennen:

- Die Team-Seite ist zu lang und mischt mehrere Aufgabenarten.
- Game Setup ist im Spielbericht versteckt und nicht als eigener Pre-Game-Flow spuerbar.
- `Contracts & Finance` und `Development` wirken wie vollwertige Menues, sind aber keine eigenen Screens.
- Aktionen geben zu wenig sichtbares Feedback ueber Erfolg, Fehler oder Auswirkungen.
- Laufende Spiele wirken ohne Auto-Refresh statisch.

## 7. Staerken und Schwaechen

### Staerken

| Staerke | Warum es gut geloest ist |
|---|---|
| Savegame-Kontext | Nutzer weiss, in welchem Spielstand, Team und Saisonkontext er arbeitet |
| Dashboard | Status und naechste Aktion sind schnell sichtbar |
| Echte Daten | GUI ist an reale Query-Services angebunden |
| Komponentenstruktur | Wiederverwendbare Panels, Cards und Tabellen reduzieren Duplikation |
| Depth Chart | Konflikte und leere Slots werden sichtbar |
| Inbox | macht aus Daten konkrete Aufgaben |
| Free Agency | sortierbarer Markt mit Cap-/Cash-Bezug |
| Game Report | Score, Stats, Top Performer und Drives sind nachvollziehbar |

### Schwaechen

| Schwaeche | Auswirkung |
|---|---|
| Team-Seite ueberladen | Nutzer muss scrollen und Aufgaben mental trennen |
| Finance/Development ohne eigene Tiefe | Navigation verspricht mehr Struktur als vorhanden |
| Game Setup unscharf | nicht klar genug als eigener Vorbereitungsprozess |
| Wenig Action-Feedback | Nutzer sieht Folgen von Aktionen nicht stark genug |
| Keine persistente Inbox | Aufgaben koennen nicht erledigt, gelesen oder verschoben werden |
| Rohe Statuslabels | technische Begriffe sind fuer Anwender weniger freundlich |
| Generische Breadcrumbs | Kontext wie Spielername oder Match fehlt teilweise |
| Statisches Game Center | laufende Simulationen wirken nicht wirklich live |

## 8. Verbesserungspotenzial

| Prioritaet | Verbesserung | Begruendung |
|---|---|---|
| Hoch | Team-Seite in Tabs oder Unterseiten teilen | Roster, Depth Chart, Finanzen und Contracts brauchen klarere Arbeitsflaechen |
| Hoch | Game-Menue direkt zum naechsten relevanten Spiel fuehren | reduziert Umwege zwischen League, Game Center und Report |
| Hoch | Eigenen Pre-Game-/Game-Setup-Flow schaffen | Vorbereitung sollte vor dem Spiel deutlich getrennt sein |
| Hoch | Action-Feedback einfuehren | Signings, Releases und Scheme-Aenderungen brauchen Erfolg/Fehler/Impact-Rueckmeldung |
| Hoch | Finance als echte Seite ausbauen | Cap, Verträge und Events sind zentral fuer GM-Gameplay |
| Mittel | Development als eigener Bereich strukturieren | Training, Potential und Focus brauchen spaeter einen klaren Ort |
| Mittel | Inbox persistent machen | Gelesen, erledigt, ausgeblendet und spaeter erinnern wuerde Aufgabenmanagement verbessern |
| Mittel | Statuswerte nutzerfreundlich uebersetzen | `SCHEDULED` und `COMPLETED` sollten als Anwendertexte erscheinen |
| Mittel | Breadcrumbs mit Entity-Namen verbessern | Spieler-, Team- und Match-Kontext wird schneller erfassbar |
| Mittel | Game Center mit Polling/Refresh ergaenzen | laufende Spiele wirken nachvollziehbarer |
| Niedrig | Filter/Sortierung in URL speichern | Nutzer verliert Kontext beim Zuruecknavigieren nicht |
| Niedrig | Dashboard weiter personalisieren | naechste Aktion kann je nach Saisonphase noch praeziser werden |

## 9. Technische Bewertung

| Bereich | Bewertung |
|---|---|
| Wiederverwendbarkeit | Gut. Layout-, Panel-, Statistik-, Team-, Match- und Player-Komponenten sind sinnvoll getrennt. |
| View-Struktur | Solide, aber einzelne Pages, besonders Team, tragen zu viele Verantwortlichkeiten. |
| Wartbarkeit | Gut bei Services und Komponenten; mittleres Risiko bei wachsenden Monolith-Screens. |
| Skalierbarkeit | Grundstruktur traegt weitere Screens, benoetigt aber klarere fachliche Routen. |
| Datenfluss | Nachvollziehbar und sicher: Server Page -> Service -> Komponenten -> Server Action. |
| UX-Risiko | Wachsende Komplexitaet kann Navigation und Screen-Dichte ueberfordern. |

Technisch ist die GUI auf einem gesunden Fundament gebaut. Die naechsten Verbesserungen sollten nicht bei neuen Features beginnen, sondern bei klarerer Struktur, Feedback und Trennung der Arbeitsbereiche.

## 10. Gesamtfazit

### Ist die GUI bereit fuer reale Nutzung?

Ja, mit MVP-Einschraenkung. Die GUI ist fuer einen ersten echten GM-Flow nutzbar: Savegame oeffnen, Teamzustand pruefen, Kader ansehen, Depth Chart bearbeiten, Free Agents verpflichten, Saison simulieren und Spiele analysieren. Fuer produktionsnahe Nutzung braucht sie aber noch bessere Fuehrung, Feedback und Aufteilung.

### Groesste Risiken

| Risiko | Beschreibung |
|---|---|
| Informationsdichte | Team Overview wird zum Sammelplatz fuer zu viele Systeme |
| Navigationsversprechen | Finance und Development sind sichtbar, aber nicht als eigene Workflows ausgearbeitet |
| Aktionsunsicherheit | Nutzer sieht bei Mutationen nicht ausreichend, was passiert ist |
| Game-Flow | Vorbereitung, Game Center und Report sind vorhanden, aber noch nicht optimal getrennt |
| Skalierung | Weitere GM-Systeme koennen die bestehende Struktur schnell ueberladen |

### Naechster logischer Entwicklungsschritt

Der naechste Schritt sollte ein Struktur- und UX-Fokus sein:

1. Team-Bereich in klare Unterbereiche oder Tabs aufteilen.
2. Finance und Development als echte Screens definieren.
3. Pre-Game/Game Setup als eigenen Flow staerken.
4. Action-Feedback fuer kritische GM-Aktionen einfuehren.
5. Game Center und Inbox als Orientierungsanker weiter stabilisieren.

## Statuspruefung

| Pruefung | Status |
|---|---|
| Bericht vollstaendig? | Gruen |
| Verstaendlich fuer Anwender? | Gruen |
| Sauber strukturiert? | Gruen |
| Bereit zur Weiterverwendung? | Gruen |

Gesamtstatus: **Gruen**
