# GUI Workstream Audit Report

Stand: 27. April 2026

Audit-Status: Rot

Grund: Die GUI-Arbeitspakete sind ueberwiegend korrekt umgesetzt und die Kernvalidierung ist gruen. Das Gesamt-Gate bleibt Rot, weil der aktuelle E2E-Smoke fuer den kompletten Game Loop nicht stabil laeuft: der Test scheitert vor den eigentlichen Flow-Assertions am 15s-Navigationslimit des Dev-Login/Cold-Start-Pfads. Der Roster-Smoke ist gruen.

## Executive Summary

- Gepruefte Arbeitspakete: 13
- Gruen: 8
- Gelb: 5
- Rot: 0 auf Arbeitspaket-Ebene
- Gesamtstatus: Rot wegen instabiler E2E-Absicherung
- Alle erwarteten GUI-Reports unter `docs/gui/` sind vorhanden.
- Der GUI-Stand ist als zusammenhaengende Manager-Experience nutzbar: Dashboard, Game Preview, Live Screen, Match Report und Roster sind angebunden.
- Die groessten Luecken liegen in Teststabilitaet, mobiler Navigation, technischer Fixture-Sprache und Daten-Tiefe fuer Live/Report.

## Gepruefte Arbeitspakete

| Arbeitspaket | Status | Bewertung |
|---|---:|---|
| GUI Referenzstruktur (Dall-E) | Gruen | 16 Referenzbilder sind konsistent benannt, README ist vorhanden, Zweck und No-Import-Regel sind klar. |
| Design System | Gruen | Farbwelt, Typografie, Spacing, Layout und UI-Prinzipien sind dokumentiert und im Code erkennbar umgesetzt. |
| Component Inventory | Gelb | Inhaltlich gut als Zielbild, aber einige Komponenten sind noch konzeptionell und nicht als zentrale Shared-Komponenten umgesetzt. |
| Screen Map | Gelb | Vollstaendig als Zielarchitektur, aber einige beschriebene Interaktionen sind noch Zukunftsbild, z. B. tiefere Play Selection und Live-Control-Varianten. |
| GUI Implementation Plan | Gruen | Reihenfolge und Abgrenzung wurden eingehalten: Dashboard, Game Flow, Roster/Team. Keine Engine-Aenderungen. |
| Dashboard / Manager Command Center | Gruen | Route `/app/savegames/[savegameId]`, echte Savegame-/Team-/Season-Daten, klare Next Action und Week Loop Integration. |
| Dashboard UI Stabilisierung | Gruen | Browser-/Screenshot-Review ist dokumentiert; Desktop und Mobile wurden behandelt. Mobile Shell bleibt als systemisches Risiko. |
| Game Preview / Match Control | Gruen | Route `/game/setup`, Teamvergleich, Readiness/Risk und Start-Aktion sind vorhanden und an bestehende Actions angebunden. |
| Game Flow Stabilisierung | Gruen | Stepper, Locked States und Primaeraktion sind klarer geworden. Kein toter Game-Center-Link vor Start sichtbar. |
| Live Simulation / Play-by-Play | Gelb | Screen ist lesbar und stabil, aber Play-by-Play ist aktuell Drive-Level und nicht echtes Snap-/Play-Level. |
| Match Report / Post Game | Gelb | Score, Stats, Key Moments, Player of Game, Impact und Next Step sind vorhanden; Detaildaten fallen oft auf Fallback zurueck. |
| kompletter Game Loop | Gelb | Produktflow ist implementiert, aber aktueller E2E-Smoke ist wegen Test-Harness/Cold-Start-Timeout nicht stabil gruen. |
| Roster / Team Management | Gruen | Route `/team/roster`, Filter, Sortierung, Quick Info, Salary/Cap und Roster Actions sind vorhanden; HTTP-Smoke ist gruen. |

## Dokumentation vs. Realitaet

Gepruefte Dokumente:

- `docs/gui/design-system.md`
- `docs/gui/component-inventory.md`
- `docs/gui/screen-map.md`
- `docs/gui/gui-implementation-plan.md`
- `docs/gui/dashboard-implementation-report.md`
- `docs/gui/game-flow-preview-implementation-report.md`
- `docs/gui/live-simulation-implementation-report.md`
- `docs/gui/match-report-implementation-report.md`
- `docs/gui/game-loop-flow-review.md`
- `docs/gui/roster-implementation-report.md`
- `docs/gui/references/dall-e/README.md`

Bewertung:

- Reports und Code stimmen in den Hauptpunkten ueberein: Routen, zentrale Komponenten, verwendete Actions und bekannte Luecken sind dokumentiert.
- Offene Punkte werden nicht verdeckt. Mehrere Reports nennen Mobile Shell, Onboarding Overlay und fehlende Detaildaten ausdruecklich.
- `screen-map.md` und `component-inventory.md` sind groesser als der aktuelle Implementierungsstand. Das ist als Zielbild okay, sollte aber explizit als Zielbild gelesen werden.
- Fruehe Reports sind durch spaetere GUI-Slices leicht veraltet. Beispiel: Dashboard/Roster wurden spaeter durch Decision Feedback und Contract/Cap erweitert.
- In `docs/gui/` und `docs/gui/references/` liegen `.DS_Store`-Dateien. Kein Produktfehler, aber Repo-Hygiene.

## Architektur & Komponenten

Staerken:

- Wiederverwendete Basis: `AppShell`, `SidebarNavigation`, `TopBar`, `Breadcrumbs`, `RoutePageHeader`, `SectionPanel`, `StatCard`, `StatusBadge`.
- Dashboard, Match Flow und Roster trennen UI-Komponenten und Modellfunktionen ausreichend fuer gezielte Tests.
- Game Flow nutzt bestehende Server Actions: `prepareWeekAction`, `startGameAction`, `finishGameAction`, `advanceWeekAction`.
- Roster-Filter, Sortierung, Quick Info und Contract Risk sind in `roster-model.ts` testbar gekapselt.

Risiken:

- Einige Komponenten sind noch screen-nah statt systemweit. Das ist fuer die ersten Slices akzeptabel, wird bei weiteren Screens aber teuer.
- Fortschritts- und Balken-Pattern sind in spaeteren Screens mehrfach lokal umgesetzt. Das bestaetigt den Gelb-Status des Component Inventory.
- Design Tokens sind dokumentiert und per Tailwind-Konventionen genutzt, aber nicht strikt als technische Token-Schicht erzwungen.
- Die Team-Subnavigation ist inzwischen sehr breit. Auf Mobile kann sie schwer scannbar werden.

## Navigation & Flow

Gepruefter Flow:

- Dashboard: `/app/savegames/[savegameId]`
- Game Preview: `/app/savegames/[savegameId]/game/setup?matchId=...`
- Live Simulation: `/app/savegames/[savegameId]/game/live?matchId=...`
- Match Report: `/app/savegames/[savegameId]/game/report?matchId=...`
- Rueckkehr Dashboard / Week Advance: vorhanden
- Roster: `/app/savegames/[savegameId]/team/roster`

Bewertung:

- Keine offensichtliche Sackgasse im Game Loop.
- Zukuenftige Game-Flow-Schritte sind gesperrt statt als tote Links klickbar.
- Match Report hat eine Next-Step-Area.
- Roster hat Rueckwege ueber Breadcrumbs, App Shell und Team Section Navigation.
- Quick Actions liefern disabled reasons statt leerer Aktionen.
- Systemisches Risiko: Dev-Login/Cold-Start macht den E2E-Flow instabil, obwohl die Produktseiten selbst rendern.

## Daten & Fixtures

| Screen | Echte Daten | Fallback-/Fixture-Risiko |
|---|---|---|
| Dashboard | Savegame Flow, Team Detail, Season Overview, Week State, Team Needs, Decision Events | Decision Feedback kann ohne Historie auf Derived/UI-Fixture fallen. |
| Game Preview | Match Detail, Teams, Season Records, Readiness, Week State | Staerken/Risiken nutzen Derived/UI-Fixture, wenn klare Daten fehlen. |
| Live Simulation | Match Detail, Score, Drives falls persistiert | Clock, Down/Distance und Field Position sind haeufig Fallback; Timeline ist Drive-Level. |
| Match Report | Final Score, Teamstats, Drives, Leaders falls vorhanden | Quarter Breakdown fehlt; Stats/Leaders/Key Moments koennen Fallback sein. |
| Roster | Team Detail, Spieler, Contracts, Contract Outlook | Filter/Quick Info sind lokaler UI-State; keine URL-Persistenz. |

Bewertung:

- Fallbacks sind meist sichtbar markiert.
- Es gibt wenig Risiko, dass komplett erfundene Daten wie echte Daten wirken.
- Die Labels `Fallback`, `Data` und `UI-Fixture` sind fuer QA transparent, aber fuer echte Nutzer zu technisch.
- Live/Report brauchen mehr verlaessliche Read-Model-Daten, sonst bleibt die UX strukturiert, aber datenarm.

## Funktionalitaet

- Quick Actions: modellseitig getestet, mit klaren disabled reasons.
- Week Flow: Actions sind angebunden; aktueller E2E scheitert aber am Test-Harness vor vollstaendiger Flow-Pruefung.
- Match Start / Simulation / Report: bestehende Actions und Routen sind vorhanden.
- Roster Filter: Position, Rating, Rolle und Status werden modellseitig getestet.
- Roster Sortierung: Position, OVR, Status und Cap Hit sind modellseitig getestet.
- Roster Quick Info: stabiler Default bei sichtbaren Spielern, leerer Zustand bei leeren Filtern.
- Roster Actions: Profil, Depth Chart, Contracts und Trade Board sind sichtbar. Release ist eine echte bestehende Action und damit kein Fake-Button, bleibt aber ein QA-Risikopunkt.

## UI / UX Qualitaet

Staerken:

- Dark Pro Analyst Sports UI ist konsistent abstrahiert, ohne direkte Bildimporte aus Dall-E.
- Desktop-Layouts sind klar gegliedert: Header, KPIs, Hauptbereich, Nebenbereich.
- Zahlen, Ratings, Badges und Tabellen sind ueberwiegend gut lesbar.
- Roster nutzt Desktop-Tabelle und mobile Cards.
- Empty-/Locked-States sind vorhanden und meist verstaendlich.

Risiken:

- Mobile App Shell zeigt zuerst viel Navigation vor dem eigentlichen Content.
- Onboarding Coach kann Screens ueberlagern und braucht gezielte mobile Smoke-Pruefung.
- Team-Subnavigation mit 9 Items ist dicht.
- Technische Badges koennen wie Debug-UI wirken.
- Live/Report sehen gut aus, erklaeren aber bei fehlenden Daten zu wenig echte Konsequenz.

## Testresultate

Aktueller Audit-Lauf:

- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen
- Relevante Vitest-Suites
  - Befehl: `npx vitest run ...`
  - Ergebnis: Gruen, 13 Testdateien, 106 Tests
  - Abdeckung: Dashboard Model, Navigation Model, Game Preview, Game Preparation, Game Flow, Live Simulation, Game Center, Post Game Report, Match Report, Post Game Continuation, Week Actions, Roster Model, Team Overview Model
- Game-Loop-E2E
  - Befehl: `env E2E_PORT=3108 npm run test:e2e:week-loop`
  - Ergebnis: Rot, Playwright global timeout 90s waehrend Cold-Start/Compile
  - Nachlauf: `env E2E_PORT=3109 E2E_GLOBAL_TIMEOUT_MS=180000 npm run test:e2e:week-loop`
  - Ergebnis: Rot, `page.goto` Timeout 15s beim Dev-Login, Dashboard selbst liefert danach HTTP 200
- Roster HTTP-Smoke
  - Server: frischer Dev-Server auf Port 3110
  - Ergebnis: Gruen, HTTP 200
  - Sichtbar: `Team Roster`, `Roster Command`, Filter, `Player Quick Info`, `Roster Actions`, `Cap Space`, `Average OVR`

Bekannte E2E-Risiken aus dem Audit-Kontext:

- `test:e2e:navigation` nutzt den alten `/api/auth/signin`-Pfad und kann mit `MissingCSRF` scheitern, bevor Navigation geprueft wird.
- `test:e2e:dashboard` ist cold-start-empfindlich und kann am 15s `page.goto`-Timeout scheitern, obwohl die Route danach rendert.
- Reuse alter Dev-Server ist riskant, wenn `AUTH_URL`/`NEXTAUTH_URL` nicht zum Port passen.

## Konkrete Probleme

1. E2E-Gate ist instabil
   - Schweregrad: Major
   - E2E faellt vor UI-Assertions durch Login-/Cold-Start-Zeitlimits.

2. Live/Report sind datenarm, sobald Detaildaten fehlen
   - Schweregrad: Major
   - UI ist stabil, aber viele Fallbacks reduzieren Aussagekraft.

3. Mobile Shell priorisiert Navigation vor Inhalt
   - Schweregrad: Major
   - Kann First-Use auf kleinen Screens bremsen.

4. Component Inventory und Code driften leicht auseinander
   - Schweregrad: Minor
   - Einige wiederkehrende UI-Pattern sind noch nicht zentralisiert.

5. Technische Fixture-Sprache im UI
   - Schweregrad: Minor
   - `Fallback`, `Data`, `UI-Fixture` sind nicht nutzerzentriert.

6. Dokumentationsdrift
   - Schweregrad: Minor
   - Fruehe Reports bilden spaetere Erweiterungen nicht vollstaendig ab.

## Technische Risiken

- E2E ist aktuell kein verlaessliches Release-Gate.
- Dev-Server-Reuse kann falsche Auth-Redirects oder stale Next-Dev-Fehler erzeugen.
- UI-Patterns koennen ohne Komponenten-Konsolidierung auseinanderlaufen.
- Mehr Fallback-UI ohne bessere Datenbasis kann technische Schulden verdecken.

## UX-Risiken

- Nutzer verstehen im Game Loop nicht immer, was die konkrete Konsequenz eines Spiels ist, wenn Report-Daten fehlen.
- Mobile Nutzer muessen sich durch zu viel Navigation bewegen.
- Debug-nahe Badges schwaechen die Produktwirkung.
- Roster ist umfangreich; Action-Dichte und Team-Subnavigation koennen neue Nutzer ueberfordern.

## Daten-/Fixture-Risiken

- Live Simulation zeigt Drive-Level als Play-by-Play.
- Match Report hat nicht immer echte Stats, Leaders oder Key Moments.
- Game Preview leitet Staerken/Risiken teilweise ab statt sie aus belastbaren Scouting-/Readiness-Daten zu beziehen.
- Dashboard Decision Feedback hat stabile Fallbacks, aber alte Reports dokumentieren noch UI-Fixtures.

## Konkrete Bugfix-Tasks

### BF-GUI-01 - E2E Dev-Login Timeout stabilisieren

- Problem: Game-Loop-E2E scheitert vor Flow-Assertions an `page.goto`/Cold-Start.
- Scope: E2E-Test-Harness, nicht Produktlogik.
- Umsetzung: Login helper robuster machen, Navigation nicht an 15s Cold-Start koppeln, ggf. `expect(...).toPass` nach Dev-Login verwenden.
- Gruen wenn: `test:e2e:week-loop` isoliert ohne manuellen Warmup gruen laeuft.

### BF-GUI-02 - Alte E2E Auth-Pfade vereinheitlichen

- Problem: Navigation-E2E nutzt noch `/api/auth/signin` und kann an CSRF scheitern.
- Scope: E2E specs/helpers.
- Umsetzung: Einheitlichen `/api/e2e/dev-login` helper fuer Dashboard, Navigation und Week Loop verwenden.
- Gruen wenn: Navigation-E2E prueft wirklich Navigation statt am Login zu scheitern.

### BF-GUI-03 - Dev-Server-Reuse gegen falsche Auth-Ports absichern

- Problem: Reuse alter Server kann Redirects auf falsche Ports erzeugen.
- Scope: E2E Preflight/Dokumentation.
- Umsetzung: Bei `E2E_REUSE_SERVER=true` pruefen, ob Dev-Login auf die erwartete Base URL redirectet.
- Gruen wenn: falsche Port-/Auth-Konfiguration vor Teststart klar fehlschlaegt.

### BF-GUI-04 - Repo-Hygiene fuer GUI Docs

- Problem: `.DS_Store` liegt unter `docs/gui/`.
- Scope: Dokumentationsverzeichnis.
- Umsetzung: Dateien entfernen und Ignore-Regel pruefen.
- Gruen wenn: `find docs/gui -name .DS_Store` leer ist.

## Konkrete Stabilisierungs-Tasks

### ST-GUI-01 - Mobile App Shell stabilisieren

- Ziel: Hauptcontent auf Mobile schneller sichtbar machen.
- Scope: App Shell / Sidebar / TopBar Layout, keine neuen Screens.
- Gruen wenn: Dashboard, Game Preview, Live, Report und Roster zeigen auf Mobile zuerst Kontext und Primary Action.

### ST-GUI-02 - Fixture- und Datenlabels nutzerfreundlich machen

- Ziel: Technische Labels durch Nutzerlabels ersetzen.
- Scope: UI-Labels fuer `Fallback`, `Data`, `UI-Fixture`; keine Datenlogik.
- Gruen wenn: Nutzer sieht `Gespeichert`, `Abgeleitet`, `Noch keine Detaildaten` oder gleichwertige Begriffe.

### ST-GUI-03 - Live/Report Fallback-Kommunikation schaerfen

- Ziel: Bei fehlenden Detaildaten klarer erklaeren, was fehlt und was trotzdem belastbar ist.
- Scope: Empty-/Fallback-Text in Live und Report.
- Gruen wenn: Kein Reportbereich wirkt wie echte Analyse, wenn die Datenbasis fehlt.

### ST-GUI-04 - Roster Action-Dichte pruefen

- Ziel: Roster bleibt schnell scannbar.
- Scope: Sichtbarkeit, Prioritaet und Labels bestehender Actions.
- Gruen wenn: Primaerpfad Roster -> Quick Info -> relevante naechste Aktion ohne Suchaufwand erkennbar ist.

## Konkrete Naechste Implementationen

### IMPL-GUI-01 - Shared Metric/Progress Components konsolidieren

- Ziel: Wiederkehrende Balken, Metriken und Vergleichszeilen zentralisieren.
- Scope: Kleine Shared-Komponenten, keine grossen Refactors.
- Gruen wenn: Neue Screens koennen Progress/Comparison ohne lokale Kopie nutzen.

### IMPL-GUI-02 - Roster E2E-Smoke ergaenzen

- Ziel: Roster-Route nicht nur per HTTP, sondern per Playwright absichern.
- Scope: Test fuer Route, Filter, Sortierung und Quick Info.
- Gruen wenn: Roster-Smoke laeuft isoliert gruen.

### IMPL-GUI-03 - GUI Report Index / Changelog einfuehren

- Ziel: Dokumentationsdrift reduzieren.
- Scope: `docs/gui/index.md` oder Report-Registry; keine Codeaenderung.
- Gruen wenn: Erkennbar ist, welcher Report zu welchem aktuellen Screenstand gehoert.

### IMPL-GUI-04 - Read-Model-Datenbedarf fuer Live/Report spezifizieren

- Ziel: UI-Fallbacks gezielt reduzieren.
- Scope: Spezifikation/Mapping vorhandener Outputs, keine Engine- oder Datenmodell-Aenderung in diesem Task.
- Gruen wenn: Klar ist, welche vorhandenen Felder echte Drives, Stats, Leaders und Quarter Breakdown liefern koennen.

### IMPL-GUI-05 - Mobile Screenshot-Smoke fuer Kernrouten ergaenzen

- Ziel: Mobile Layout-Risiken reproduzierbar machen.
- Scope: Playwright-Smoke fuer Dashboard, Game Preview, Live, Report, Roster.
- Gruen wenn: Mobile Screenshots ohne Overlay-/Navigation-Blocker erzeugt werden.

## Naechste 5 Tasks In Reihenfolge

### 1. E2E Gate Stabilisieren

- Ziel: `week-loop`, `dashboard` und `navigation` sollen reproduzierbar den Produktflow pruefen.
- Warum jetzt: Ohne stabiles Gate ist jede weitere GUI-Bewertung unscharf.
- Scope: E2E helpers, Timeouts, Dev-Login, Preflight. Keine Produktlogik.

### 2. Mobile App Shell Polieren

- Ziel: Mobile Nutzer sehen sofort Screen-Kontext und Primary Action.
- Warum jetzt: Das Risiko taucht in mehreren Reports auf und betrifft alle Kernrouten.
- Scope: App Shell, Sidebar, TopBar, Team-Subnavigation. Keine neuen Screens.

### 3. Fixture-Sprache Nutzerfreundlich Machen

- Ziel: Aus QA-/Debug-Begriffen werden klare Nutzerlabels.
- Warum jetzt: Live/Report/Dashboard sind bereits sichtbar; Sprache bestimmt jetzt Produktvertrauen.
- Scope: Labels und Empty-State-Texte. Keine Datenlogik.

### 4. Live/Report Datenbedarf Konkretisieren

- Ziel: Reduzieren, wo UI-Fallbacks durch vorhandene echte Daten ersetzt werden koennen.
- Warum jetzt: Live und Report sind strukturell fertig, aber die Aussagekraft haengt an Daten-Tiefe.
- Scope: Mapping und kleine Read-Layer-Anpassungen nur, wenn bestehende Daten vorhanden sind. Keine Engine- oder Datenmodell-Aenderung.

### 5. Shared UI Components Konsolidieren

- Ziel: Wiederkehrende Metric-, Progress- und Comparison-Pattern zentral nutzbar machen.
- Warum jetzt: Weitere Screens wuerden sonst mehr lokale Varianten erzeugen.
- Scope: Kleine Komponentenextraktion aus vorhandenen Patterns. Keine grossen Refactors, keine neuen Dependencies.

## Statuspruefung

- Alle 13 genannten Arbeitspakete bewertet: Ja
- Dokumentation gegen Code geprueft: Ja
- Architektur, Navigation, Daten, Funktionalitaet, UI/UX und Tests bewertet: Ja
- Konkrete Bugfix-Tasks abgeleitet: Ja
- Konkrete Stabilisierungs-Tasks abgeleitet: Ja
- Konkrete naechste Implementationen abgeleitet: Ja
- Naechste 5 Tasks mit Ziel, Warum jetzt und Scope definiert: Ja
- Neue Features implementiert: Nein
- Game Engine geaendert: Nein
- Datenmodell geaendert: Nein
- Neue Dependencies hinzugefuegt: Nein

Status: Rot
