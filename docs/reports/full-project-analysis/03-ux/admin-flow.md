# Admin Flow

Stand: 2026-05-02

## Ziel des Users

Ein Admin will Ligen verwalten, Status verstehen, Datenprobleme erkennen, eine Woche sicher simulieren und danach Ergebnisse validieren.

## Flow-Diagramm

```text
Savegames Hub
  -> Adminmodus
    -> AdminAuthGate
      -> nicht eingeloggt: Login erforderlich
      -> eingeloggt ohne Admin: Zugriff verweigert
      -> Admin: Admin Control Center
        -> Ligen verwalten
        -> Liga auswaehlen
        -> Safety Check lesen
        -> optional Debug Tools
        -> Liga oeffnen
          -> Admin League Detail
            -> Games / Ready / Draft / Results / Standings pruefen
            -> Woche simulieren
            -> Ergebnis + Reload pruefen
```

## Notwendige Schritte

1. Firebase Login.
2. Adminrecht via Custom Claim oder UID-Allowlist.
3. `/admin` oeffnen.
4. Liga laden oder erstellen.
5. Liga auswaehlen.
6. Safety Check muss gruen sein.
7. Simulation ausfuehren.
8. Ergebnisse validieren.

## Tatsaechliche Implementierung

| Schritt | Datei | Bewertung |
|---|---|---|
| Admin Entry | `SavegamesAdminLink`, `/admin/page.tsx` | OK |
| Admin Guard | `AdminAuthGate`, `useFirebaseAdminAccess` | OK |
| Ligen laden | `AdminLeagueManager` -> Admin API `listLeagues` | OK |
| Liga erstellen | `AdminLeagueManager` -> `createLeague` | OK |
| Liga auswaehlen | `AdminControlCenter` State | OK |
| Safety Check | `AdminHubOverview` | OK |
| Debug | `AdminDebugPanel` | OK |
| Liga Detail | `AdminLeagueDetail` | OK, sehr breit |
| Simulation | `handleSimulateWeek` -> `simulateWeek` | OK |
| Kritische Actions | Confirm/Prompt | Funktional, UX-riskant |

## Bruchstellen

| Bruchstelle | UX-Auswirkung | Schwere |
|---|---|---|
| Admin ohne Claim/Allowlist | sieht Access Gate | Mittel |
| Auth Token nicht frisch | Admin wirkt nicht berechtigt | Mittel |
| Keine Liga ausgewaehlt | Simulation & Woche zeigt Hinweis | Niedrig |
| `Woche simulieren` und `Woche abschliessen` | Semantische Doppelung | Hoch |
| Native Confirm/Prompt | Kritische Aktion wirkt roh und fehleranfaellig | Hoch |
| Sehr viele Actions im Detail | Admin kann falsche Aktion waehlen | Mittel/Hoch |
| Staging Live-Smoke offen | Release-Vertrauen begrenzt | Hoch |

## Unklare States

- "Woche abschliessen" klingt wie eigener Schritt, obwohl Simulation die Woche bereits abschliesst.
- Einige Admin Debug-/Development-Aktionen koennen fuer produktive Steuerung gehalten werden.
- Admin kann eine Liga administrieren, auch wenn er als Spieler kein Team hat; diese Rollen sollten im UI klar getrennt bleiben.

## Blockierende Bugs

Kein statisch bestaetigter UI-Blocker. Release-Blocker bleibt pro bisherigen QA-Berichten:

- Vollstaendiger echter Admin-UI-Smoke mit Staging Admin Token war nicht durchgaengig final bestaetigt.

## Verbesserungsvorschlaege

1. `Woche abschliessen` im Hub entfernen oder umbenennen zu "Simulation startet und schliesst die Woche ab".
2. Native `prompt`/`confirm` durch dedizierte Admin-Confirm-Modals ersetzen.
3. Admin Detail in klare Gruppen aufteilen:
   - Status
   - Simulation
   - GMs/Memberships
   - Draft
   - Debug/Destruktiv
4. Destruktive Actions visuell weiter von normalen Actions trennen.
5. Nach Simulation automatische Ergebniszusammenfassung oben anzeigen.

## Minimale Version fuer spielbaren MVP

```text
Admin MVP:
  Zugriff sicher
  -> Liga auswaehlen
  -> Status/Safety Check eindeutig
  -> genau eine Week-Hauptaktion
  -> Confirm
  -> Simulation
  -> Results + Standings + nextWeek
  -> Reload bestaetigt Daten
```
