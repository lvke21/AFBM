# Admin UX Improvement Report

Stand: 2026-05-01

## Ziel

Der Adminmodus soll sich wie ein Kontrollraum anfuehlen:

- erst Status verstehen
- dann Liga auswaehlen
- dann sichere Aktionen ausfuehren
- Debug nur als Diagnose verwenden

## Strukturierter Admin Flow

### 1. Einstieg

Der Admin Hub zeigt oben weiterhin den geschuetzten Adminbereich. Die Hauptaktionen sind jetzt in zwei Gruppen strukturiert:

- `Ligen`
  - Ligen verwalten
  - Liga erstellen
- `Betrieb`
  - Simulation & Woche
  - Debug Tools

`Zurück zum Hauptmenü` fuehrt jetzt konsistent nach `/app/savegames`.

### 2. Aktuelle Liga / Dashboard

Die Admin Hub Übersicht wurde als `Aktuelle Liga` geschärft. Sie zeigt:

- Liga ID
- Status
- Teams
- Memberships
- Week-State
- Draft-State

Darunter steht ein `Safety Check` mit:

- Ready Count
- Games der aktuellen Woche
- Blocker-Grund oder Freigabehinweis

### 3. Aktionen

Die Aktionsgruppe ist klarer beschriftet:

- `Woche simulieren`
  - Simulation
  - schreibt Ergebnisse und Records
- `Woche abschließen`
  - Week-State
  - nur nach Confirm ausführen
- `Debug-Status anzeigen`
  - Memberships und Team-Zuweisungen
- `Draft-Status prüfen`
  - zeigt den aktuellen Draft-State

### 4. Kritische Aktionen

Kritische Week-Aktionen behalten einen Confirm Dialog. Der Dialog beschreibt jetzt konkret:

- betroffene Liga
- Saison/Woche
- Anzahl Games der Woche
- dass Ergebnisse, Records und Game Results geschrieben werden
- dass die Aktion serverseitig ueber die Admin API laeuft

Damit ist klarer, dass die Aktion Daten veraendert und nicht nur eine Vorschau ausloest.

### 5. Debug

Das Debug Panel zeigt weiterhin Umgebung und Adminstatus. Die Ligadiagnose ist jetzt expliziter:

- Broken Memberships
- Unassigned Teams
- assignedUserId ohne Membership
- User-Team-Verbindung fuer den aktuellen Admin/User

## Reduzierte Fehleranfälligkeit

- Actions sind nicht mehr als flache Buttonliste dargestellt.
- Status- und Safety-Check stehen vor mutierenden Aktionen.
- Kritische Actions haben eine bessere Wirkungsbeschreibung im Confirm.
- Debug benennt Datenprobleme in Spieler-/Team-Verbindungen klarer.
- Der Hauptmenue-Rueckweg ist konsistent.

## Geaenderte Dateien

- `src/components/admin/admin-control-center.tsx`
- `docs/reports/ux-admin-improvement.md`

## Offene Punkte

- `Woche abschließen` nutzt im Hub weiterhin denselben Admin-API-Pfad wie die Week-Simulation. Die UI beschreibt die Wirkung klarer, aber eine fachlich separate Completion-Action waere ein spaeteres Backend-/Game-State-AP.
- Detailseite `/admin/league/[leagueId]` enthaelt weiterhin sehr viele Admin-Aktionen. Die naechste UX-Stufe waere, diese Seite in Tabs/Abschnitte fuer Week, Draft, GMs, Finance und Debug zu gliedern.
