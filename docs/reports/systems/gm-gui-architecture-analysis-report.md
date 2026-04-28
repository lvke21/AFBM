# GM GUI Architecture and UX Analysis

Erstellt: 2026-04-25

## 1. Gesamtuebersicht der GUI

Die implementierte GUI ist eine serverseitig gerenderte Next.js-App fuer eine American-Football-GM-Simulation. Der fachliche Mittelpunkt ist ein Savegame. Sobald ein Savegame geoeffnet ist, stellt das Layout den aktuellen Kontext aus Savegame, Saison und Manager-Team bereit. Darauf aufbauend fuehren die Screens den Spieler durch den GM-Loop: Status pruefen, Aufgaben bearbeiten, Team verwalten, Saison simulieren, Spiele ansehen und Ergebnisse analysieren.

### Grundstruktur

| Ebene | Aufgabe | Zentrale Dateien |
|---|---|---|
| App Shell | Rahmen, Sidebar, TopBar, Breadcrumbs, PageHeader | `src/components/layout/*`, `src/app/app/savegames/[savegameId]/layout.tsx` |
| Savegame Dashboard | Startpunkt im aktiven Spielstand | `src/app/app/savegames/[savegameId]/page.tsx` |
| Team-Management | Teamzustand, Roster, Depth Chart, Schemes, Finanzen | `src/app/app/savegames/[savegameId]/teams/[teamId]/page.tsx` |
| Markt und Verträge | Free Agency, Angebotslogik, Cap-Pruefung | `src/app/app/savegames/[savegameId]/free-agents/page.tsx` |
| Saison / Liga | Standings, Schedule, Wochensimulation | `src/app/app/savegames/[savegameId]/seasons/[seasonId]/page.tsx` |
| Spiel | Game Center, Spielvorbereitung, Spielbericht | `src/app/app/savegames/[savegameId]/matches/[matchId]/*` |
| Aufgaben | Priorisierte Inbox aus realen Savegame-Daten | `src/app/app/savegames/[savegameId]/inbox/page.tsx` |

### Hauptbereiche

Die Navigation wird ueber `buildNavigationItems` in `src/components/layout/navigation-model.ts` erzeugt. Die Hauptpunkte sind:

- Dashboard
- Inbox
- Team
- Game
- League
- Roster Building
- Contracts & Finance
- Development
- Savegames

Die App verwendet keine Marketing-Startseite innerhalb des GM-Flows. Die ersten sichtbaren Screens sind funktionale Arbeitsflaechen mit Statuskarten, Panels, Tabellen und direkten Aktionen.

### Designprinzipien

- Echte Daten statt Mock-Daten: Screens laden ueber Application Services und Prisma-Repositories.
- GM-orientierte Priorisierung: Dashboard, Inbox und Team Needs zeigen direkt, was als naechstes wichtig ist.
- Wiederverwendbare Struktur: `AppShell`, `SectionPanel`, `StatCard`, Tabellen, Karten und View-Models trennen Darstellung und Logik.
- Responsive Dichte: Grids wechseln zwischen einspaltig, `md` und `xl`; Tabellen bekommen `overflow-x-auto`, Roster nutzt mobil Karten und desktop eine Tabelle.
- Aktionen bleiben kontextsensitiv: Mutierende Aktionen sind nur fuer das Manager-Team verfuegbar oder werden serverseitig validiert.

## 2. Navigationsstruktur

### Hauptnavigation

| Menuepunkt | Ziel | Bemerkung |
|---|---|---|
| Dashboard | `/app/savegames/[savegameId]` | GM-Startseite des Savegames |
| Inbox | `/app/savegames/[savegameId]/inbox` | Aufgaben und Ereignisse |
| Team | `/teams/[teamId]` | Teamzustand, Roster, Depth Chart, Finanzen |
| Game | aktuell Saisonseite | Aktiver Pattern fuer Match-Routen; Ziel koennte spaeter direkt Game Center sein |
| League | `/seasons/[seasonId]` | Standings, Schedule, Simulation |
| Roster Building | `/free-agents` | Free Agency |
| Contracts & Finance | aktuell Teamseite | Kein eigener Screen; Finanzbereich liegt im Team-Screen |
| Development | aktuell Teamseite | Kein eigener Screen; Development-Fokus liegt im Depth Chart / Spielerprofil |
| Savegames | `/app/savegames` | Savegame-Hub |

### Untermenues / indirekte Navigation

Untermenues sind aktuell nicht als verschachtelte Sidebar implementiert. Stattdessen entstehen Unterbereiche innerhalb der Screens:

- Team Overview: `TeamCard`, `TeamNeedsPanel`, `SchemeSelector`, `CapOverview`, `FinanceEventList`, `ContractTable`, `DepthChartView`, `RosterTable`
- Season: Playoff Picture, Simulation Progress, Standings, Schedule
- Match: Game Preparation, Scoreboard, BoxScore, TopPerformers, DriveLog
- Player: Header, Contract, Decision Context, Ratings, Attributes, Production, Timeline

### Typische User-Flows

#### Vom Dashboard zum Spiel

1. Dashboard laedt Savegame-Flow, Manager-Team und aktuelle Saison.
2. `selectNextDashboardMatch` bestimmt das naechste geplante Match.
3. `MatchCard` verlinkt zum Game Center: `/matches/[matchId]/center`.
4. Game Center zeigt Status und DriveLog.
5. Der Nutzer kann zum Spielbericht wechseln.

#### Vom Roster zum Spielerprofil

1. Team Screen zeigt `RosterTable`.
2. `RosterActionMenu` bietet Profilzugriff.
3. Spielerprofil laedt `getPlayerDetailForUser`.
4. Der Nutzer sieht Ratings, Vertrag, Produktion, Attribute und Historie.

#### Von der Saison zum Spielbericht

1. Season Screen zeigt `ScheduleList`.
2. `MatchCard` fuehrt zuerst zum Game Center.
3. Game Center verlinkt zum Spielbericht.
4. Spielbericht zeigt Scoreboard, BoxScore, TopPerformers und DriveLog.

## 3. Screen-Analyse

### Dashboard

| Aspekt | Beschreibung |
|---|---|
| Zweck | Zentrale GM-Startseite mit naechstem Schritt |
| Inhalte | Team, Saison/Woche, Record, Cap Space, ActionRequiredBanner, GM Status, Team Needs, naechstes Match, direkte Navigation |
| Aktionen | Team oeffnen, Saison oeffnen, Free Agency, Game Center, Spielerprofil |
| Datenquellen | `getSaveGameFlowSnapshot`, `getTeamDetailForUser`, `getSeasonOverviewForUser` |
| Abhaengigkeiten | Dashboard-Model, TeamNeedsPanel, MatchCard, ActionRequiredBanner |
| Bewertung | Sehr guter Einstieg; naechste Aktion ist sichtbar. Risiko: viele Statusbloecke koennen bei mehr Features schnell wachsen. |

### Team Overview

| Aspekt | Beschreibung |
|---|---|
| Zweck | Gesamtzustand des Manager-Teams verstehen |
| Inhalte | TeamCard, Record, OVR, Cap, Team Needs, Scheme, CapOverview, Finance Events, Contracts, Depth Chart, Roster |
| Aktionen | Scheme aendern, Depth Chart zuweisen, Spieler releasen, Profil oeffnen |
| Datenquellen | `getTeamDetailForUser` |
| Abhaengigkeiten | Team Query, Team Management Server Actions |
| Bewertung | Funktional stark, aber Screen ist sehr umfangreich. Finanzen, Roster und Depth Chart sind langfristig Kandidaten fuer eigene Unterseiten oder Tabs. |

### Roster View

| Aspekt | Beschreibung |
|---|---|
| Zweck | Kader effizient durchsuchen und verwalten |
| Inhalte | Filter Position/Status, Sortierung, Karten mobil, Tabelle desktop |
| Aktionen | Profil oeffnen, Release fuer Manager-Team |
| Datenquellen | `TeamDetail.players` aus `getTeamDetailForUser` |
| Abhaengigkeiten | `RosterTable`, `RosterModel`, `PlayerCard`, `RosterActionMenu` |
| Bewertung | Gute Basis. Release sollte langfristig eine Bestaetigung oder Undo-Mechanik erhalten. |

### Player Profile

| Aspekt | Beschreibung |
|---|---|
| Zweck | Einzelspieler vollstaendig bewerten |
| Inhalte | Position, OVR/POT, Team, Status, Header, Vertrag, Entscheidungskontext, Ratings, Attribute, Produktion, Timeline |
| Aktionen | Navigation zur Teamseite |
| Datenquellen | `getPlayerDetailForUser` |
| Abhaengigkeiten | Player Repository, Rating- und Scheme-Fit-Domainlogik |
| Bewertung | Sehr informativ fuer GM-Entscheidungen. Es fehlen direkte Vertrags- oder Trainingsaktionen. |

### Depth Chart

| Aspekt | Beschreibung |
|---|---|
| Zweck | Starter und Rollen verwalten |
| Inhalte | ActionRequiredBanner, Konflikte, Positionsgruppen, Slots, Spielerformulare |
| Aktionen | Slot, Status, KR/PR, Captain, Development Focus speichern |
| Datenquellen | `TeamDetail.players` |
| Abhaengigkeiten | `DepthChartView`, `depth-chart-model`, `updateRosterAssignmentAction` |
| Bewertung | Funktional vollstaendig fuer MVP. Groesster UX-Risiko ist Laenge und Formular-Dichte auf grossen Rostern. |

### Free Agency

| Aspekt | Beschreibung |
|---|---|
| Zweck | Spieler verpflichten |
| Inhalte | Team Needs, Cap/Cash, sortierbares Free Agent Board, OfferBuilder |
| Aktionen | Angebot erstellen und Signing ausloesen |
| Datenquellen | `getFreeAgentMarketForUser` |
| Abhaengigkeiten | `signFreeAgentAction`, Contract Calculation, Team Management |
| Bewertung | Klarer Roster-Building-Flow. Noch keine Angebotskonkurrenz, Verhandlungen oder Bestaetigung. |

### Finanzen

| Aspekt | Beschreibung |
|---|---|
| Zweck | Cap und Finanzereignisse nachvollziehen |
| Inhalte | CapOverview, ContractTable, FinanceEventList |
| Aktionen | Spielerprofil aus ContractTable oeffnen |
| Datenquellen | `TeamDetail.contractOutlook`, `TeamDetail.recentFinanceEvents`, Contracts |
| Abhaengigkeiten | Team Query, Finance Event Recording |
| Bewertung | Nachvollziehbar, aber kein eigenstaendiger Finance-Screen trotz Navigationseintrag. |

### Saison / Liga

| Aspekt | Beschreibung |
|---|---|
| Zweck | Ligastand, Schedule und Simulation kontrollieren |
| Inhalte | Season Stats, Champion, Playoff Picture, SimulationProgressPanel, Standings, Schedule |
| Aktionen | Woche simulieren, neue Saison starten, Match oeffnen |
| Datenquellen | `getSeasonOverviewForUser` |
| Abhaengigkeiten | Season Query, Season Simulation Service |
| Bewertung | Guter Ligakontext. Schedule-Beschreibung sagt noch "Matchbericht", technisch fuehrt die Karte zuerst ins Game Center. |

### Game Setup

| Aspekt | Beschreibung |
|---|---|
| Zweck | Gegner, eigene Staerke und Gameplan anzeigen/setzen |
| Inhalte | Gegnerkarte, eigene Staerke, Matchup-Differenz, Offense/Defense/Special-Teams-Auswahl |
| Aktionen | Gameplan speichern |
| Datenquellen | `getMatchDetailForUser`, `updateMatchPreparationForUser` |
| Abhaengigkeiten | Match Preparation Service, Team Scheme Service |
| Bewertung | Im MVP brauchbar. Wichtig: Der Gameplan wird aktuell ueber Team-Schemes gespeichert und ist nicht sauber match-spezifisch. |

### Game Center

| Aspekt | Beschreibung |
|---|---|
| Zweck | Spieluebersicht vor, waehrend und nach Simulation |
| Inhalte | Status, Score, Drive-Anzahl, letzter Drive, DriveLog |
| Aktionen | Spielbericht oeffnen, zurueck zum Savegame |
| Datenquellen | `getMatchDetailForUser` |
| Abhaengigkeiten | Game Center Model, DriveLog |
| Bewertung | Klarer Einstieg ins Spiel. Noch kein Live-Polling oder echte Fortschrittsanzeige. |

### Game Report

| Aspekt | Beschreibung |
|---|---|
| Zweck | Spiel nachverfolgbar erklaeren |
| Inhalte | GamePreparationPanel, Scoreboard, BoxScore, TopPerformers, DriveLog |
| Aktionen | Gameplan vor Kickoff, zurueck zum Savegame |
| Datenquellen | `getMatchDetailForUser` |
| Abhaengigkeiten | Match Report Model, Match Query Service |
| Bewertung | Gut modularisiert. Der Bericht ist auch fuer leere Spiele robust, wirkt aber bei geplanten Spielen naturgemaess datenarm. |

### Inbox

| Aspekt | Beschreibung |
|---|---|
| Zweck | Wichtige Ereignisse und naechste Aufgaben priorisieren |
| Inhalte | Aufgabenanzahl, kritische/hohe Prioritaeten, ausgeblendete Items, priorisierte Liste |
| Aktionen | Direkte Links zu Game Center, Team, Free Agency, Spielerprofil, Saison |
| Datenquellen | Savegame Flow, TeamDetail, SeasonOverview |
| Abhaengigkeiten | Inbox Model, DepthChart Model, Team Needs, Season Matches |
| Bewertung | Sehr guter "Was soll ich tun?"-Screen. Noch nicht persistent als echtes Message-System mit gelesen/ungelesen. |

## 4. Komponenten-Architektur

### Layout-Komponenten

| Komponente | Zweck | Verwendung | Props / Daten |
|---|---|---|---|
| `AppShell` | Gesamtgeruest mit Sidebar, TopBar, Breadcrumbs | alle App-Screens | `children`, `context` |
| `SidebarNavigation` | Hauptnavigation | `AppShell` | `AppShellContext` |
| `TopBar` | Savegame/Saison/Team-Kontext | `AppShell` | `AppShellContext` |
| `RoutePageHeader` | Seitentitel aus Route | `AppShell` | `AppShellContext` |
| `SectionPanel` | Standard-Panel fuer App-Sektionen | fast alle GM-Screens | `title`, `description`, `actions`, `tone`, `children` |
| `SectionCard` | aeltere Panel-Variante | Hub/Report-nahe Bereiche | `title`, `description`, `action`, `children` |
| `StatCard` | Kennzahlen | Dashboard, Team, Season, Match, Inbox | `label`, `value`, `tone` |

### Dashboard / Inbox

| Komponente | Zweck | Verwendung | Daten |
|---|---|---|---|
| `ActionRequiredBanner` | wichtigste Handlung prominent anzeigen | Dashboard, Depth Chart | `DashboardAction` |
| `dashboard-model` | naechstes Match und Dashboard-Aktion ableiten | Dashboard | Team, Season, Match |
| `InboxList` | Aufgabenliste anzeigen | Inbox | `InboxState` |
| `inbox-model` | Aufgaben priorisieren und begrenzen | Inbox | SavegameId, TeamDetail, SeasonOverview |

### Team / Roster

| Komponente | Zweck | Verwendung | Daten |
|---|---|---|---|
| `TeamCard` | Teamidentitaet und Summary | Team Screen | `TeamDetail` |
| `TeamNeedsPanel` | Bedarf priorisiert anzeigen | Dashboard, Team | `TeamNeedSummary[]`, Links |
| `SchemeSelector` | Offense/Defense/ST Schemes setzen | Team, indirekt Game Setup | `TeamDetail`, Server Action |
| `RosterTable` | Kaderfilter, Sortierung, Aktionen | Team | `TeamPlayerSummary[]` |
| `PlayerCard` | mobile Spielerkarte | Roster mobil | `TeamPlayerSummary` |
| `RosterActionMenu` | Profil/Release | Roster | Player, SaveGameId, TeamId |
| `DepthChartView` | Slots und Rollen verwalten | Team | Players, Server Action |
| `CapOverview` | Cap-Verbrauch visualisieren | Team | `TeamDetail` |
| `ContractTable` | aktive Verträge | Team | `TeamDetail.players` |
| `FinanceEventList` | Finanzhistorie | Team | `recentFinanceEvents` |

### Player

| Komponente | Zweck | Verwendung | Daten |
|---|---|---|---|
| `PlayerHeader` | Identitaet, Teamlink, Basisinfos | Player Profile | `PlayerDetail` |
| `RatingGroup` | Ratinglisten | Player Profile | Rating Items |
| `AttributeTable` | Attributgruppen | Player Profile | `PlayerAttributeGroup[]` |
| `ContractSummary` | aktueller Vertrag | Player Profile | `PlayerDetail` |
| `ProductionSummary` | Karriere und aktuelle Saison | Player Profile | Career/Season |
| `ProgressionTimeline` | Spielerhistorie | Player Profile | History Events |

### Season / Match

| Komponente | Zweck | Verwendung | Daten |
|---|---|---|---|
| `SimulationProgressPanel` | Wochensimulation, Fortschritt, Gates | Season | `SeasonOverview`, Actions |
| `StandingsTable` | Liga-Tabelle | Season | `SeasonStandingRow[]` |
| `ScheduleList` / `MatchCard` | Schedule und Match-Einstieg | Season | `SeasonMatchSummary[]` |
| `GameCenterPanel` | Status, Score, letzter Drive | Game Center | `MatchReport`, Report-Link |
| `GamePreparationPanel` | Gegner, Staerke, Gameplan | Game Report | Match, Action |
| `Scoreboard` | Score und Summary | Game Report | MatchReport |
| `BoxScore` | Team-Stats | Game Report | MatchReport |
| `TopPerformers` | Leader je Kategorie | Game Report | Leaders |
| `DriveLog` | Drive-Verlauf | Game Center, Game Report | Drives |

### Kritische Komponenten

Kritisch sind `AppShell`, `navigation-model`, `TeamNeedsPanel`, `DepthChartView`, `RosterTable`, `SimulationProgressPanel`, `GameCenterPanel`, `DriveLog`, `InboxList` und die jeweiligen Model-Dateien. Sie tragen entweder Navigation, zentrale Entscheidungen oder die Hauptinteraktionen.

## 5. Datenfluss und Logik

### Grundprinzip

Die meisten Seiten sind Server Components. Sie rufen `requirePageUserId()` auf, laden Daten ueber Application Services und geben die aufbereiteten Daten an UI-Komponenten weiter. Mutationen laufen ueber Server Actions, die wiederum Application Services verwenden.

### Wichtigste Query-Services

| Service | Liefert | Verwendet in |
|---|---|---|
| `getSaveGameFlowSnapshot` | Savegame, Manager-Team-ID, CurrentSeason-ID | Layout, Dashboard, Inbox |
| `listSaveGames` | Savegame-Uebersicht | `/app`, `/app/savegames` |
| `getTeamDetailForUser` | Team, Spieler, Needs, Contracts, Finance | Dashboard, Team, Inbox |
| `getPlayerDetailForUser` | Spielerprofil, Ratings, Stats, Historie | Player Profile |
| `getSeasonOverviewForUser` | Standings, Schedule, Playoff Picture | Dashboard, Season, Inbox |
| `getMatchDetailForUser` | Match, Teams, Stats, Drives, Leaders | Game Center, Game Report |
| `getFreeAgentMarketForUser` | Free Agents, Team Needs, Cap | Free Agency |

### Mutationen

| Aktion | Server Action | Service |
|---|---|---|
| Savegame erstellen | `createSaveGameAction` | `createSaveGame` |
| Roster Assignment | `updateRosterAssignmentAction` | `updateRosterAssignmentForUser` |
| Scheme/Gameplan setzen | `updateTeamSchemesAction`, `updateGamePreparationAction` | `updateTeamSchemesForUser`, `updateMatchPreparationForUser` |
| Spieler releasen | `releasePlayerAction` | `releasePlayerForUser` |
| Free Agent verpflichten | `signFreeAgentAction` | `signFreeAgentForUser` |
| Woche simulieren | `simulateSeasonWeekAction` | `simulateSeasonWeekForUser` |
| Naechste Saison | `advanceToNextSeasonAction` | `advanceToNextSeasonForUser` |

### Entscheidungen in View-Models

| Model | Entscheidung |
|---|---|
| `dashboard-model` | naechste Dashboard-Aktion, naechstes Match |
| `inbox-model` | Prioritaet, Begrenzung, direkte Aufgabe |
| `depth-chart-model` | Konflikte, leere Starter, Slot-Verfuegbarkeit |
| `roster-model` | Filter, Sortierung, Release-Zustand |
| `team-overview-model` | Needs-Sortierung, Cap Summary, Finance State |
| `season-view-model` | Schedule-Gruppierung, Current-Week Summary |
| `game-center-model` | Statuslabel, Scoreline, Report-Ready |
| `match-report-model` | BoxScore, Scoreboard, DriveLog-Empty-State |

### Potenzielle Engpaesse

- Mehrfaches Laden: Savegame-Layout, Dashboard und Inbox laden teilweise aehnliche Daten erneut.
- Teamseite ist gross: `getTeamDetailForUser` laedt sehr viele Relationen fuer mehrere Teilbereiche.
- Gameplan ist nicht match-spezifisch: Die UI wirkt wie Game Setup, speichert aber Team-Schemes.
- Inbox ist abgeleitet, nicht persistent: Kein gelesen/ungelesen, kein Dismiss, keine echte Message-Historie.
- Keine Live-Daten: Simulationen werden nach Action abgeschlossen; Game Center pollt nicht.
- Server-Action-Fehler erscheinen ohne eigenes UI-Feedback-System.

## 6. GM-User Experience

### Versteht der Spieler den Teamzustand?

Ja. Dashboard, TeamCard, StatCards, TeamNeedsPanel, CapOverview und Inbox machen Teamzustand und Probleme sichtbar. Besonders hilfreich sind Team Needs, Cap Space, Record und Depth-Chart-Warnungen.

### Versteht der Spieler Probleme?

Ja, fuer MVP ausreichend. Probleme werden auf drei Ebenen sichtbar:

- Dashboard: eine Top-Aktion
- Inbox: priorisierte Liste
- Team/Depth Chart: konkrete Konflikte und leere Starter

### Versteht der Spieler naechste Schritte?

Ja. Die GUI bietet direkte Links zu Free Agency, Team, Saison, Game Center und Spielerprofilen. Die Inbox ist hier der staerkste UX-Baustein.

### Werden Entscheidungen klar unterstuetzt?

Teilweise sehr gut:

- Roster: Filter, Sortierung, Profilzugriff
- Depth Chart: direkte Slot- und Rollenformulare
- Free Agency: Need/Fit/OVR-Sortierung plus Angebotsvorschau
- Player Profile: Ratings, Vertrag, Produktion, Scheme Fit

Noch offen:

- Vertragsentscheidungen sind sichtbar, aber nicht voll interaktiv.
- Training/Development existiert eher als Flag, nicht als eigener Workflow.
- Gameplan ist eher Scheme-Verwaltung als echte Spielvorbereitung.

### Unnoetige Komplexitaet

Die groesste Komplexitaet liegt im Team Screen. Er kombiniert Team Overview, Roster, Depth Chart, Finanzen, Contracts und Schemes. Das ist fuer MVP praktisch, wird aber fuer echte Nutzung schnell lang.

## 7. Staerken und Schwaechen

### Staerken

- Klare Savegame-zentrierte Architektur.
- Server Components reduzieren Client-Komplexitaet.
- Reale Datenquellen statt Demo-Daten.
- Gute Wiederverwendung von `SectionPanel`, `StatCard`, `TeamNeedsPanel`, `DriveLog`.
- View-Models machen Logik testbar.
- Inbox uebersetzt Daten in konkrete GM-Aufgaben.
- Game Center und Game Report sind sinnvoll getrennt.
- Roster bietet mobile Karten und Desktop-Tabelle.
- Depth Chart validiert Konflikte und leere Starter sichtbar.
- Produktionsbuild und Tests sind stabil.

### Schwaechen

- Team Screen ist ueberladen.
- Navigationseintraege `Contracts & Finance` und `Development` fuehren noch zur Teamseite statt zu spezialisierten Screens.
- Game-Menue fuehrt aktuell zur Saisonseite, nicht direkt zum naechsten Game Center.
- Game Setup ist nicht match-spezifisch persistiert.
- Keine Bestaetigungsdialoge fuer irreversible Aktionen wie Release.
- Kein globales Feedbacksystem fuer erfolgreiche/fehlgeschlagene Server Actions.
- Keine Persistenz fuer Inbox-Zustand.
- Keine Live-Aktualisierung im Game Center.
- Spielerprofil zeigt viele Informationen, aber wenige direkte Entscheidungen.
- Einige UI-Texte sind noch technisch oder intern gefaerbt, z. B. raw Statuswerte.

## 8. Verbesserungspotenzial

| Prioritaet | Verbesserung | Impact |
|---|---|---|
| 1 | Team Screen in klare Unterbereiche oder Tabs aufteilen: Overview, Roster, Depth Chart, Finance | Hoch |
| 2 | Match-spezifisches Gameplan-Modell einfuehren, statt Team-Schemes als Gameplan zu verwenden | Hoch |
| 3 | Server-Action-Feedback mit Erfolg/Fehler/Undo und Release-Bestaetigung einfuehren | Hoch |
| 4 | Game-Menue auf aktuelles/naechstes Game Center ausrichten | Hoch |
| 5 | Persistente Inbox mit gelesen, erledigt, ausblenden und Historie bauen | Mittel-Hoch |
| 6 | Eigene Finance- und Contracts-Seite aus Teamdaten ableiten | Mittel-Hoch |
| 7 | Eigene Development-/Training-Seite fuer Dev Focus, Progression und Rollenplanung | Mittel-Hoch |
| 8 | Live-/Polling-Status im Game Center fuer laufende Simulationen | Mittel |
| 9 | Entity-Breadcrumbs erweitern: Spielername, Teamname, Matchname statt generischer Labels | Mittel |
| 10 | Playwright-basierte Responsive- und Smoke-Flows fuer echte View-Pruefung ergaenzen | Mittel |

## 9. Technische Bewertung

### Wiederverwendbarkeit

Gut. Die wichtigsten Views verwenden gemeinsame Panels, Cards, Models und Domain-Services. Besonders positiv ist, dass viele UI-Entscheidungen nicht in JSX versteckt sind, sondern in Model-Dateien liegen.

### Struktur der Views

Die Struktur ist fuer ein MVP tragfaehig:

- Pages laden Daten.
- Components rendern.
- Models entscheiden.
- Server Actions mutieren.
- Services kapseln Anwendunglogik.

Die Teamseite ist die groesste Ausnahme: Sie ist fachlich breit und koennte mit mehr Features schwer wartbar werden.

### Wartbarkeit

Gut bis sehr gut. TypeScript-Typen und Tests decken viele kritische Pfade ab. Die Modullinien nach `savegames`, `teams`, `players`, `seasons`, `gameplay` sind klar. Potenzielle Wartungsrisiken liegen in mehrfacher Mapping-Logik und sehr grossen Query-Services.

### Skalierbarkeit

Funktional skalierbar, UI-seitig mittel. Mehr Teams, Spieler und Wochen koennen dargestellt werden, aber lange Tabellen und sehr grosse Teamseiten brauchen mittelfristig Pagination, Tabs oder virtuelle Listen.

## 10. Gesamtfazit

Die GUI ist bereit fuer eine echte MVP-Nutzung. Ein GM kann ein Savegame oeffnen, Aufgaben erkennen, Team und Roster analysieren, Depth Chart bearbeiten, Free Agents verpflichten, die Saison simulieren und Spiele ueber Game Center und Spielbericht nachvollziehen.

Die groessten Risiken sind:

1. Team Screen wird bei mehr Features zu lang.
2. Game Setup ist fachlich noch nicht sauber match-spezifisch.
3. Feedback fuer Mutationen ist noch zu roh.
4. Finance/Development sind Navigationsbereiche, aber noch keine vollwertigen Screens.
5. Inbox ist abgeleitet und nicht persistent.

Der naechste logische Schritt ist kein neuer grosser Screen, sondern eine UX-Stabilisierung: Team-Unterstruktur, Action-Feedback, match-spezifischer Gameplan und dedizierte Finance/Development-Flows.

## Statuspruefung

| Punkt | Status |
|---|---|
| GUI vollstaendig verstanden? | Gruen |
| Struktur korrekt dokumentiert? | Gruen |
| Schwaechen klar identifiziert? | Gruen |
| Verbesserungen sinnvoll? | Gruen |
