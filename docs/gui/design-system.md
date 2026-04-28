# GUI Design System

## Grundlage
Die Dall-E Referenzen unter `docs/gui/references/dall-e/` definieren die visuelle Richtung, aber keine 1:1 Vorlage. Das UI-System wird als komponentenbasiertes Sports-Management-Interface umgesetzt und nutzt bestehende App-Strukturen wie `AppShell`, `SectionPanel`, Dashboard-, Match-, Team- und Player-Komponenten.

## Farbpalette
| Rolle | Zweck | Empfehlung |
| --- | --- | --- |
| Primary | Hauptaktionen, aktive Navigation, Spiel-Flow | Electric Blue `#2f8cff` bis `#0f6bff` |
| Background | App-Hintergrund | Deep Navy `#07111d`, Navy Accent `#10253f` |
| Surface | Panels, Cards, Tabellenflächen | Charcoal/Navy `rgba(7, 17, 29, 0.72)`, `rgba(255,255,255,0.05)` |
| Surface Border | Panel- und Tabellenabgrenzung | Slate Border `rgba(148, 163, 184, 0.18)` |
| Text Primary | Überschriften, wichtige Werte | Near White `#f6f8fb` |
| Text Secondary | Labels, Hilfstexte, Meta | Slate `#aab9c9` |
| Accent | besondere Spielmechaniken, X-Factor, Fokus | Gold `#f4c95d` |
| Success | gute Zustände, ready, positive Trends | Emerald `#3ddc97`, `#29b67a` |
| Warning | Risiken, fragliche Verletzungen, mittlere Needs | Amber `#f5b942` |
| Danger | negative Effekte, Ausfälle, schlechte Risiken | Red `#ff7a7a` |

## Typografie
| Typ | Verwendung | Stil |
| --- | --- | --- |
| Header | Screen-Titel, Team/Match-Kontext | Display-Font, 28-36px, 700, uppercase optional |
| Section | Panel-Titel, Tabellenbereiche | Display oder Body, 18-22px, 650-700 |
| Body | Beschreibungen, Listen, normale Inhalte | Body-Font, 14-16px, 400-500 |
| Stat | Score, OVR, Cap Space, Ranking | Display-Font, 28-56px, 700-800, tabular numbers |
| Label | Tabellenkopf, Meta, Badges | 11-13px, 600-700, uppercase, leichte Laufweite |
| Micro | Zeit, Week, Record, secondary meta | 11-12px, 500, Slate |

Prinzip: Zahlen dürfen groß sein, Erklärtexte bleiben kompakt. Keine langen Marketing-Headlines in Arbeitsflächen.

## Spacing-System
| Token | Wert | Verwendung |
| --- | --- | --- |
| `space-1` | 4px | Icon-/Badge-Abstände |
| `space-2` | 8px | kompakte Control-Gaps |
| `space-3` | 12px | Zeilenabstände, kleine Card-Gaps |
| `space-4` | 16px | Standard-Gap innerhalb Panels |
| `space-5` | 20px | Card-/Panel-Padding kompakt |
| `space-6` | 24px | Standard-Sektionsabstand |
| `space-8` | 32px | Screen-Abschnitt, Dashboard-Gaps |

Border Radius bleibt kontrolliert: 8px für Cards/Panels, 999px nur für Pills/Badges/Progress-Caps.

## Grid und Layout
### App Shell
- Linke Sidebar für Primärnavigation.
- Top Bar für Savegame-/Team-Kontext, Search, Notifications, Settings.
- Main Content mit `max-w-7xl` als Standard; datenreiche Game-Screens dürfen breiter gedacht werden, wenn die bestehende Shell es zulässt.

### Dashboard
- Desktop: 12-Column Grid.
- Obere Zeile: Team Summary, Record, Next Game/Needs.
- Mittlere Zeile: Standings, Leaders, Team Stats.
- Untere Zeile: Week Loop, Inbox, Development, Finance/Cap.
- Mobile: Einspaltig, wichtigste Entscheidung zuerst.

### Game Flow
- Horizontaler Status-Stepper: Preview/Pre-Week -> Ready -> Simulation -> Post-Game.
- Hauptbereich links: Match- oder Simulationsdaten.
- Kontextspalte rechts: Readiness, Tactical Decisions, Key Players, Next Actions.

### Roster und Player Systems
- Zwei-Zonen-Layout: Tabelle/Liste links, Detailpanel rechts.
- Tabellen bleiben scannbar, mit fixen Stat-Spalten und klaren Statusbadges.
- Detailpanel zeigt Identität, OVR, Rolle, Status, relevante Aktionen.

## UI-Prinzipien
- Lesbarkeit vor Ornament: jede Card beantwortet eine konkrete Manager-Frage.
- Datenfokus: große Werte nur für entscheidende Signale, nicht für jede Zahl.
- Hierarchie: pro Screen ein dominanter Next Action Bereich.
- Vergleichbarkeit: gleiche Stat-Typen nutzen gleiche Komponenten, Farben und Labels.
- Statusklarheit: Ready, Warning, Blocked, Completed und In Progress müssen visuell eindeutig sein.
- Komponentensystem statt Bildkopie: Referenzen liefern Patterns, keine Pixelvorgaben.
- Decision Feedback sichtbar: Entscheidungen müssen Auswirkung, Value und nächsten sinnvollen Schritt zeigen.
- Empty States stabil: fehlende Daten zeigen Fallback-Texte und blockieren nicht das Layout.

## Bestehende Anbindung
- Layout: `src/components/layout/app-shell.tsx`, `section-panel.tsx`, `top-bar.tsx`, `sidebar-navigation.tsx`
- Dashboard: `src/components/dashboard/*`
- Match/Game Flow: `src/components/match/*`
- Team/Roster: `src/components/team/*`
- Player Detail: `src/components/player/*`

## Nicht-Ziele
- Keine direkten Image-Imports aus den Referenzen.
- Keine neue Game Engine Logik.
- Keine neuen Dependencies für Styling oder Charts ohne separate technische Entscheidung.
