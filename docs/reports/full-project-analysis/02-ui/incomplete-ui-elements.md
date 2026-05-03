# Incomplete UI Elements

Stand: 2026-05-02

## Ziel der Analyse

Alle UI-Elemente identifizieren, die unfertig, bewusst deaktiviert, MVP-begrenzt oder riskant wirken. Keine Codeaenderungen.

## Bewusst deaktivierte oder Coming-Soon Bereiche

| Bereich | Datei | Status | Begründung im UI | Bewertung |
|---|---|---|---|---|
| Multiplayer Contracts/Cap | `online-league-coming-soon-model.ts`, `online-league-coming-soon-page.tsx` | Coming Soon | Nicht Teil des aktuellen Multiplayer MVP | OK |
| Multiplayer Development | `online-league-coming-soon-model.ts` | Coming Soon | Week-Simulation nutzt sichere Standardwerte | OK |
| Multiplayer Trade Board | `online-league-coming-soon-model.ts` | Coming Soon | Roster/Memberships bleiben stabil | OK |
| Multiplayer Inbox | `online-league-coming-soon-model.ts` | Coming Soon | Statusinformationen im Dashboard | OK |
| Multiplayer Finance | `online-league-coming-soon-model.ts` | Coming Soon | Sportliche Woche/Roster/Draft priorisiert | OK |
| Offline Finance Trades | `src/app/app/savegames/[saveGameId]/finance/trades/page.tsx` | Coming Soon | Trade-Angebote/-Historie/Cap-Auswirkungen noch nicht nutzbar | OK |
| Offline Development Training | `development/training/page.tsx` | Coming Soon | Wochenfokus/Belastungssteuerung noch nicht nutzbar | OK |
| Offline Development Staff | `development/staff/page.tsx` | Coming Soon | Staff-Effekte noch nicht nutzbar | OK |
| Draft MVP | `draft-overview-screen.tsx` | MVP begrenzt | Manager-Team kann Prospects nur picken; Trade-Ups/Board-Editing nicht aktiv | OK/Teilweise |
| Firebase Multiplayer Training | `online-league-placeholder.tsx` | Read-only | Standardwerte statt lokaler Plaene | OK |

## Teilweise implementierte UI

| Element | Datei | Problem | Ursache | Empfehlung |
|---|---|---|---|---|
| Admin `Woche abschliessen` | `admin-control-center.tsx` | Sichtbar als kritische Action; genaue fachliche Abgrenzung zu `Woche simulieren` schwer erkennbar | Zwei Week-Actions in enger UI | Beschreibungen und Confirm-Text weiter schaerfen |
| Admin `Draft-Status pruefen` | `admin-control-center.tsx` | Nur Notice, keine Detailansicht | Leichte Debug-Aktion | Optional in Liga Detail verlinken |
| Admin `Details verwalten` | `admin-league-manager.tsx` | Identisch zu `Oeffnen` | Redundante Action | Einen Button entfernen oder echte Semantik geben |
| Admin GM prompts | `admin-league-detail.tsx` | Native prompt fuer Warnung, Deadline, Removal Reasons | Schnell implementierte Admin-Werkzeuge | Custom Modal mit Pflichtfeldern |
| Online Local Expert Actions | `online-league-placeholder.tsx` | Viele Aktionen lokal vorhanden, Firebase-MVP blockiert | Local/Firebase Feature-Paritaet fehlt | In Firebase weiter verborgen halten |
| Offline Draft Scout | `draft-scouting-board.tsx` | "Maximales MVP-Scouting erreicht" deutet begrenzte Scouting-Tiefe an | Draft MVP | Als bewusst begrenzt dokumentiert lassen |
| Auth Debug Panel | `firebase-email-auth-panel.tsx` | Technische Fehlermeldungen im UI | Staging/Debug-Hilfe | In Production ggf. kompakter machen |

## Leere, Loading und Error States

| Bereich | Loading | Empty | Error | Bewertung |
|---|---|---|---|---|
| Savegames | Ja | Ja | Ja + Retry | OK |
| Online Hub Continue | Button loading | Missing/invalid lastLeague feedback | Error feedback | OK |
| Online League Search | Ja | "Aktuell keine Liga verfügbar" | Retry | OK |
| Online League Dashboard | Ja | Missing team/member recovery | Retry/Search | OK |
| Online Coming Soon | Ja | n/a | Retry | OK |
| Admin League List | Ja | Create CTA | Retry | OK |
| Admin League Detail | Ja | Not found | Retry/Admin Back | OK |
| Roster | n/a | "Kein Roster geladen" + Free Agency Link | Page-level | OK |
| Depth Chart | n/a | Starter fehlt/Leer | Page-level | OK |
| Inbox | n/a | Empty State im Model | Action Fehler | OK |

## UI-Elemente ohne erkennbare Handler

Keine eindeutig klickbaren UI-Elemente ohne Handler gefunden. Die statische Suche zeigt allerdings viele Elemente mit `aria-disabled` oder bewusstem `disabled`, darunter:

- Sidebar Items ohne `href` bei fehlendem Kontext.
- Online Ready Button bei fehlendem Team/pending Action.
- Admin Week Buttons bei fehlender Liga, fehlendem Schedule, unvollstaendigem Ready-State oder pending Action.
- Savegame Delete bei deaktivierter Capability.
- Offline Create Button bei deaktivierter Erstellung oder fehlendem Login.

## Handler mit potentiell unklarem sichtbaren Effekt

| Handler | Datei | Sichtbarer Effekt | Risiko |
|---|---|---|---|
| `handleDraftCheck` | `admin-control-center.tsx` | Nur Notice Text | Gering |
| `handleSimulationAndWeek` | `admin-control-center.tsx` | Hinweis oder Navigation | Mittel, wenn keine Liga ausgewaehlt |
| `handleSaveFranchiseStrategy` | `online-league-placeholder.tsx` | Local Feedback oder Firebase Guard | Mittel |
| `handleSavePricing` | `online-league-placeholder.tsx` | Local Feedback oder Firebase Guard | Mittel |
| `handleSetMediaExpectation` | `online-league-placeholder.tsx` | Local Feedback oder Firebase Guard | Mittel |

## Top 10 unfertige oder riskante UI-Stellen

1. Admin GM-Management nutzt native `prompt`/`confirm` fuer irreversible Aktionen.
2. Admin `Woche simulieren` und `Woche abschliessen` koennen semantisch verwechselt werden.
3. Admin `Details verwalten` ist redundant zu `Oeffnen`.
4. Multiplayer Nicht-MVP-Punkte sind sauber Coming Soon, aber die Sidebar wirkt trotzdem gross fuer ein MVP.
5. Online Dashboard enthaelt Local Expert Mode Code, der in Firebase nicht synchronisiert ist.
6. Offline Draft ist klar MVP-begrenzt, aber Scouting/Board-Erwartungen koennen groesser sein als Funktionalitaet.
7. Offline Staff/Training/Finance-Trades sind sichtbar als Coming Soon und damit noch kein vollstaendiger Singleplayer-Loop.
8. Auth Debug Details sind fuer normale Nutzer technisch.
9. Native Browser Dialoge brechen visuelle Konsistenz.
10. Hash-basierte Multiplayer Unterbereiche sind weniger robust als echte Unterseiten.

## Empfehlung

- Keine grossen UI-Features bauen, sondern erst Admin-Dialoge und redundante Buttons bereinigen.
- Coming Soon fuer nicht-MVP Bereiche beibehalten; keine halbfertigen Controls reaktivieren.
- E2E fuer Join -> Ready -> Admin Sim -> Reload als UI-Verifikation priorisieren.
