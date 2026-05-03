# Draft Flow

Stand: 2026-05-02

## Ziel des Users

Ein GM will wissen, ob der Draft aktiv oder abgeschlossen ist, nur bei explizitem Klick in den Draft Room gehen und dort picken, wenn sein Team am Zug ist.

## Flow-Diagramm

```text
Online League Dashboard
  -> Sidebar: Draft
    -> /online/league/[leagueId]/draft
      -> Route-State laedt User + Liga
      -> kein Draft oder completed
        -> "Draft abgeschlossen"
      -> Draft active
        -> Draft Room
          -> aktuelle Runde/Pick/Team am Zug anzeigen
          -> Spieler filtern/sortieren
          -> Spieler auswaehlen
          -> wenn eigenes Team am Zug: Pick bestaetigen
          -> Repository makeFantasyDraftPick
          -> Feedback + neuer Draft-State
```

## Notwendige Schritte

1. User ist Liga-Member mit Team.
2. User klickt explizit `Draft`.
3. Draft-Seite laedt.
4. Bei active Draft: Spieler waehlen.
5. Nur wenn eigenes Team am Zug ist: `Pick bestaetigen`.

## Tatsaechliche Implementierung

| Element | Datei | Implementierung | Bewertung |
|---|---|---|---|
| Kein Auto-Redirect | Online Flow | Draft oeffnet nur ueber Route `/draft` | OK |
| Draft Route | `src/app/online/league/[leagueId]/draft/page.tsx` | Rendert `OnlineLeagueDraftPage` | OK |
| Route State | `useOnlineLeagueRouteState` | Laedt Liga/User/Membership | OK |
| Completed State | `online-league-draft-page.tsx` | Zeigt "Draft abgeschlossen" und Pick Count | OK |
| Active Room | `online-fantasy-draft-room.tsx` | Runde/Pick/Team, Liste, Filter, eigener Kaderstand | OK |
| Pick Button | `online-fantasy-draft-room.tsx` | Disabled wenn nicht eigener Turn oder kein Spieler | OK |
| Pick Action | `repository.makeFantasyDraftPick` | Server/Repository schreibt Pick | OK, fachlich sensibel |
| Feedback | `OnlineLeagueDraftPage` | Success/Warning Message | OK |

## Bruchstellen

| Bruchstelle | UX-Auswirkung | Schwere |
|---|---|---|
| Kein Team | Draft Room zeigt "Kein Team" oder Route-State blockt | Hoch |
| Nicht am Zug | Button disabled, User wartet | Niedrig/Mittel |
| Draft completed | User sieht Abschluss, aber kein historisches Board | Niedrig |
| Draft active + andere Menues gesperrt | Kann wie Blockade wirken | Mittel |
| Grosse Spielerliste | Virtualisierung vorhanden, aber UI bleibt tabellarisch dicht | Niedrig/Mittel |

## Unklare States

- "Warte auf anderes Team" ist korrekt, aber bei Auto-/CPU-Teams fehlt ggf. Erklaerung, wie der Pick weitergeht.
- Completed Draft zeigt Pick Count, aber keine klare Weiterleitung zu Roster/Depth Chart ausser Sidebar.
- Wenn Draft-Daten fehlen, ist die Recovery eher technisch.

## Blockierende Bugs

Keine statisch bestaetigten blockierenden Draft-UX-Bugs. Der wichtigste Schutz ist erhalten: kein automatisches Fullscreen-Draftboard beim Liga-Laden.

## Verbesserungsvorschlaege

1. Completed State um CTAs `Zum Dashboard`, `Roster ansehen`, `Depth Chart ansehen` ergaenzen.
2. Bei "nicht am Zug" anzeigen, welches Team am Zug ist und was als Naechstes passiert.
3. Bei fehlendem Team klar zwischen Spieler-Dashboard und Admin-Liga unterscheiden.
4. Draft History kompakt anzeigen, wenn completed.

## Minimale Version fuer spielbaren MVP

```text
Sidebar Draft
  -> Wenn completed: Abschlusskarte + Roster CTA
  -> Wenn active:
       aktuelle Runde/Pick
       eigenes Team / am Zug?
       verfuegbare Spieler
       Pick bestaetigen nur bei eigenem Turn
       Feedback nach Pick
```
