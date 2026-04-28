# GUI Implementation Plan

## Leitplanken
- Die Dall-E Bilder sind visuelle Inspiration, keine 1:1 Umsetzung.
- Keine direkten Image-Imports in die App.
- Keine neuen Dependencies.
- Keine Game Engine Änderungen.
- Bestehende Modelle, Actions und Engine Outputs werden genutzt und UI-seitig klarer präsentiert.
- Umsetzung erfolgt in Vertical Slices, damit jede Phase nutzbar und testbar bleibt.

## Reihenfolge der Umsetzung
### Slice 1 - Dashboard als Manager Command Center
Ziel:
- Nutzer erkennt Teamzustand, Week Status und nächste sinnvolle Aktion innerhalb weniger Sekunden.

Umsetzung:
- Bestehende Dashboard-Komponenten konsolidieren.
- Dominanten Next Action Bereich einführen oder schärfen.
- Team Overview, Week Loop, Next Match, Goals und Inbox in einem klaren 12-Column Layout anordnen.
- Decision/Value Feedback sichtbar in den Dashboard-Kontext integrieren.

Betroffene Bereiche:
- `src/components/dashboard/*`
- `src/components/layout/*`
- `src/app/app/savegames/[savegameId]/page.tsx`

Validierung:
- Dashboard lädt mit fehlenden optionalen Daten stabil.
- Nutzer kann ohne Erklärung die nächste Aktion starten.
- Mobile Reihenfolge zeigt zuerst Next Action, dann Teamkontext.

### Slice 2 - Game Flow: Preview -> Match Control -> Simulation -> Report
Ziel:
- Der Spielablauf ist als zusammenhängender Loop verständlich.

Umsetzung:
- Gemeinsamen Flow Stepper und Readiness Checklist verwenden.
- Game Preview fokussiert auf Gegner, Readiness, Risiken und Startentscheidung.
- Match Control zeigt klare Start/Finish/Advance Aktionen.
- Live Simulation nutzt Scoreboard, Drive/Play-by-Play und Key Player Panels.
- Match Report beantwortet: Warum Ergebnis? Was war entscheidend? Was jetzt?

Betroffene Bereiche:
- `src/components/match/*`
- `src/app/app/savegames/[savegameId]/game/*`
- Game Engine Outputs nur lesen, nicht ändern.

Validierung:
- Statusbegriffe bleiben einheitlich.
- Report hat klare Next Step CTA.
- Keine Simulation-Logik wird im UI neu erfunden.

### Slice 3 - Roster und Depth/Player Decision Systems
Ziel:
- Kaderentscheidungen werden schneller verständlich und weniger fehleranfällig.

Umsetzung:
- Roster Table mit Detailpanel standardisieren.
- Player Cards, Status Badges und Value Feedback einheitlich einsetzen.
- Depth Chart als Lineup-/Role-Entscheidung erklären.
- Trade/Signing/Roster-Change Feedback konsistent anzeigen.

Betroffene Bereiche:
- `src/components/team/*`
- `src/components/player/*`
- `src/components/free-agency/*`
- `src/components/trades/*`
- `src/lib/actions/decision-effects.ts`

Validierung:
- Jede relevante Aktion erzeugt verständliches Feedback.
- Fehlende Werte führen zu neutralem Fallback statt leerem UI.
- Roster- und Player-Screens verwenden gleiche Status-/Rating-Sprache.

### Slice 4 - Player Development und Team Chemistry
Ziel:
- Langfristige Entwicklung und Synergien als planbare Systeme sichtbar machen.

Umsetzung:
- Progress Bars, Trend-Charts und Fatigue/Risk Panels harmonisieren.
- Team Chemistry als erklärendes Netzwerk oder tabellarisch stabile Alternative darstellen.
- Training Focus mit erwarteter Wirkung und Risiko koppeln.

Betroffene Bereiche:
- `src/components/player/*`
- neue oder bestehende Development-/Chemistry-Komponenten
- vorhandene Team-/Player-Modelle

Validierung:
- Entwicklungstrends sind ohne Zahlenraten interpretierbar.
- Fatigue/Risk wird nicht nur angezeigt, sondern in Entscheidungskontext gesetzt.

### Slice 5 - X-Factor und Advanced Analysis
Ziel:
- Spezialfähigkeiten und Matchup-Vorteile als moderne Sports-Game-Akzente einführen.

Umsetzung:
- X-Factor Liste, Detail, Triggerbedingungen und Impact Breakdown definieren.
- Matchup Advantage Panels aus Game Preview/Play Selection wiederverwenden.
- Gold Accent sparsam nutzen.

Betroffene Bereiche:
- Player Detail
- Match Preview
- Match Report
- eventuelle neue X-Factor UI-Modelle, falls Daten vorhanden sind

Validierung:
- X-Factor erklärt konkrete Auswirkung, nicht nur ein Badge.
- Ohne X-Factor Daten erscheint ein sauberer Empty State.

## Risiken
| Risiko | Auswirkung | Gegenmaßnahme |
| --- | --- | --- |
| Daten fehlen oder sind uneinheitlich | leere Panels, falsche Gewichtung | Empty States und neutrale Fallbacks definieren |
| Overengineering | zu viele neue Komponenten ohne Nutzen | erst vorhandene Komponenten erweitern |
| Inkonsistenz zwischen Screens | Nutzer lernt Patterns mehrfach | zentrale Komponenten für Stats, Badges, Tables, Feedback |
| Referenzbilder werden zu wörtlich genommen | UI passt nicht zur echten App | Design Tokens und Komponenten statt Pixelkopie |
| Game Engine Outputs werden vermischt | Logikdrift zwischen Engine und UI | Engine Outputs nur konsumieren und erklären |
| Mobile Layout wird nachträglich behandelt | wichtige Aktionen rutschen zu weit nach unten | pro Slice mobile Priorität prüfen |

## Abgrenzung
Nicht Teil dieses Plans:
- Game Engine Änderungen
- Simulationsbalancing
- neue Datenmodelle ohne UI-Notwendigkeit
- externe Chart-, Animation- oder UI-Libraries
- direkte Nutzung der Dall-E Bilder in der App

## Empfohlener erster Implementierungsslice
Start mit Slice 1: Dashboard als Manager Command Center.

Warum:
- Das Dashboard ist der erste Kontaktpunkt nach Savegame-Auswahl.
- First-User-Sessions zeigten Probleme bei Next Action und konkurrierenden Signalen.
- Bestehende Komponenten sind bereits vorhanden und können mit geringem Risiko harmonisiert werden.
- Verbesserungen zahlen direkt auf Game Flow, Roster und Decision Feedback ein.

Erster kleiner Arbeitsschritt:
- Dashboard-Audit gegen `design-system.md` und `component-inventory.md`.
- Danach nur einen dominanten Next Action Bereich und klare Card-Hierarchie umsetzen.
