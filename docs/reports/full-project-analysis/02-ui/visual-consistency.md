# Visual Consistency

Stand: 2026-05-02

## Ziel der Analyse

Bewertung der visuellen Konsistenz, Responsiveness, Zustandsdarstellung und UI-Sprache ueber Savegames, Online, Admin, Offline Franchise, Roster/Depth Chart und Match Flow.

## Gesamtbild

Die UI verwendet konsistent ein dunkles, panelbasiertes Design mit:

- `rounded-lg` Karten und Panels
- `border-white/10`, `bg-white/5`, dunklen Hintergruenden
- farbigen Status-Tones: Emerald fuer OK/Success, Amber fuer Warnung/Pending, Rose fuer Gefahr/Error, Sky/Violet fuer Info/Debug
- mobile-first Grids mit `sm`, `md`, `lg`, `xl`, `2xl`
- kleine uppercase Eyebrow Labels

Das Erscheinungsbild ist ueber weite Strecken konsistent, aber sehr informationsdicht. Besonders Admin, Online Dashboard, Roster und Depth Chart wirken eher wie interne Tools als wie reduzierte Spielerfuehrung.

## Komponenten-Konsistenz

| Pattern | Dateien | Konsistenz | Bemerkung |
|---|---|---|---|
| Status Badges | `status-badge.tsx`, viele Panels | Gut | Tonal konsistent |
| Cards/Panels | `section-panel.tsx`, `section-card.tsx`, direkte Klassen | Mittel | Viele direkte Tailwind-Klassen statt zentraler Varianten |
| Buttons | Viele Dateien | Mittel | Aehnliche Styles, aber keine zentrale Button-Komponente ausser `FormSubmitButton` |
| Forms | Savegame, Admin, Auth, Team, Match | Mittel | Labels/Inputs konsistent, aber Submit-Feedback unterschiedlich |
| Tables | Roster, Standings, Contracts | Gut | Roster hat mobile Card-Fallback |
| Empty States | Savegames, Roster, Admin, Online | Gut | Meist mit Erklaerung/CTA |
| Error States | Online/Admin/Savegames | Gut | Retry meist vorhanden |
| Dialoge | Draft/Free Agency custom, Admin native | Schwach | Native Admin Dialoge brechen Konsistenz |

## Responsive Verhalten

Positiv:

- Roster nutzt Karten auf kleineren Screens und Tabelle erst ab `xl`.
- Savegames CTA Grid bricht sauber auf `md:grid-cols-3`.
- Online Search Team-Identitaet nutzt mobile-first einspaltige Forms.
- Admin League Cards und Hub-Metriken nutzen responsive Grids.
- Depth Chart Lineup Board nutzt `sm:grid-cols-2` und `xl:grid-cols-4`.

Risiken:

- Admin Overview Action Grid hat `lg:min-w-[420px]`; auf schmalen Desktopbreiten kann es eng werden.
- Roster/Depth Chart enthalten viele Informationen pro Card/Zeile.
- Online Dashboard ist sehr lang; Hash-Navigation hilft, aber visuelle Orientierung kann verloren gehen.
- Native `window.prompt`/`confirm` sind nicht kontrollierbar und optisch inkonsistent.

## Zustandsfarben

| Farbe/Ton | Verwendung | Bewertung |
|---|---|---|
| Emerald | Erfolg, Ready, Verfuegbar, OK | Konsistent |
| Amber | Warnung, Pending, Admin Ops, Pausiert | Konsistent |
| Rose | Fehler, Loeschen, Gefahr | Konsistent |
| Sky | Online Suche, Info, Debug | Meist konsistent |
| Violet | Debug/Training/Secondary | Teilweise breit genutzt |

Risiko: Die Palette ist stark dunkel mit vielen farbigen Statuscards. Funktional klar, aber visuell manchmal laut.

## Navigationskonsistenz

| Navigation | Zustand | Bemerkung |
|---|---|---|
| Savegames Hauptentscheidungen | Gut | Drei klare CTAs |
| Sidebar Offline | Gut | Echte Routen |
| Sidebar Online | Mittel | Mischung aus Route, Hash und Coming-Soon Routes |
| Online Hub | Gut | Drei Hauptaktionen |
| Admin Hub | Mittel | Viele Aktionen, aber gruppiert |
| Admin Detail | Mittel | Sehr viele Aktionen auf einer Seite |

## UI-Sprache

Staerken:

- Deutsche Labels sind groesstenteils klar.
- Disabled/Coming Soon Texte erklaeren den Grund.
- Ready-State und MVP-Hinweise sind im Multiplayer explizit.

Schwaechen:

- Fachbegriffe wie `Ready-State`, `GM`, `Firebase-MVP`, `Week-State` sind fuer technische Nutzer klarer als fuer neue Spieler.
- Admintexte sind teilweise lang und technisch.
- Unterschiedliche Schreibweisen: "Week", "Woche", "Ready", "Bereit" nebeneinander.

Empfehlung: Terminologie spaeter vereinheitlichen:

- Spieler-UI: "Woche", "Bereit", "Liga", "Team"
- Admin-UI: technische Begriffe erlaubt, aber gruppiert
- Firebase-/MVP-Begriffe nicht in normale Spielerfuehrung ziehen

## Top 10 visuelle Risiken

1. Native Admin Dialoge wirken ausserhalb des Designs und sind fuer kritische Actions zu knapp.
2. Online Dashboard ist sehr lang und mischt MVP-Hinweise, Status, Roster, Team, Local Expert Mode.
3. Admin League Detail ist fuer sichere Bedienung sehr dicht.
4. Sidebar im Online-Kontext kombiniert echte Dashboard-Anker und Coming-Soon-Routen.
5. Nicht-MVP Features sind sichtbar und koennen trotz guter Erklaerung Erwartungen wecken.
6. Offline und Online verwenden unterschiedliche Navigationsmodelle fuer aehnliche Begriffe.
7. Auth Debug UI kann fuer normale Nutzer wie ein Fehlerzustand des Produkts wirken.
8. Manche Buttons sind redundant oder sehr nah beieinander (`Oeffnen`/`Details verwalten`, `Woche simulieren`/`Woche abschliessen`).
9. Viele direkte Tailwind-Buttonvarianten erschweren konsistente spaetere Aenderungen.
10. Tabellen/Listen sind funktional, aber bei grossen Datenmengen weiter performance-/scan-riskant.

## Empfehlungen

1. Eine kleine Button-/Action-Pattern-Doku fuer Admin, Player und Danger Actions erstellen.
2. Admin Confirm/Prompt durch konsistente Confirm Panels/Modals ersetzen.
3. Online Sidebar fuer MVP ggf. reduzieren oder Nicht-MVP sichtbarer gruppieren.
4. Terminologie "Week/Woche" und "Ready/Bereit" vereinheitlichen.
5. Grosse Dashboards schrittweise in klare Sektionen mit sticky/local nav oder echten Unterseiten ueberfuehren.

## Status

Visuell konsistent genug fuer Staging/MVP, aber noch nicht "polished release". Groesstes Thema ist nicht Styling, sondern Informationsdichte und kritische Admin-UX.
