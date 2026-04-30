# Scouting & Draft Implementation Report

## Datenstruktur

- `Prospect`: lokale Draft-Spielerbasis mit `trueRating`, ungenauem `scoutedRating`, `potential`, `scoutingAccuracy`, Status und Draft-Zuordnung.
- `DraftOrder`: eine einfache, persistierbare Reihenfolge mit Round-1-Picks pro aktuellem Liga-Mitglied.
- `DraftHistoryEntry`: Auditierbare Pick-Historie mit Picknummer, Team, User, Prospect und Zeitpunkt.
- Draft-Picks erzeugen `OnlineContractPlayer` mit Rookie-Vertrag und werden direkt in den Contract-/Salary-Cap-Roster des Teams geschrieben.

## Scouting-Logik

- Default-Prospects starten mit absichtlich ungenauem `scoutedRating`.
- `scoutOnlineProspect()` erhöht die Genauigkeit pro Scouting-Aktion um 20 Punkte bis maximal 95.
- Das angezeigte Rating bewegt sich bei jedem Scout näher an `trueRating`.
- Gescoutete Teams werden über `scoutedByTeamIds` dedupliziert gespeichert.
- Bereits gedraftete Prospects können nicht weiter gescoutet werden.

## Draft-Logik

- `getOnlineLeagueDraftOrderForDisplay()` erzeugt bei fehlender gespeicherter Order eine MVP-Draft-Reihenfolge aus den aktuellen Liga-Mitgliedern.
- `makeOnlineDraftPick()` erlaubt nur dem Team am aktuellen Pick zu draften.
- Ein Prospect kann nur einmal ausgewählt werden.
- Nach Auswahl wird der Prospect auf `drafted` gesetzt, der Pick auf `made` gesetzt, eine History geschrieben und ein Rookie-Spieler mit Vertrag erzeugt.
- Salary-Cap-Validierung läuft vor dem Speichern; ein Pick wird blockiert, wenn der Rookie-Vertrag den Cap überschreiten würde.

## UI Flow

- Im Online-Liga-Dashboard gibt es einen Abschnitt `Scouting & Draft`.
- Der Spieler sieht aktuellen Pick, Draft-Historie, Prospect Board, gescoutetes Rating, Potential und Genauigkeit.
- Aktionen:
  - `Scouten`: verbessert die Informationsqualität.
  - `Draften`: nur aktiv, wenn der aktuelle User am Zug ist und der Prospect verfügbar ist.
- Feedbackmeldungen erklären blockierte oder erfolgreiche Aktionen.

## Validierung

- Stored-League-Validierung akzeptiert und prüft Prospects, DraftOrder und DraftHistory.
- Normalisierung clampet Ratings/Accuracy in `0-100`, sortiert Picks und dedupliziert Scouting-Team-IDs.
- Fallbacks bleiben rückwärtskompatibel: bestehende Ligen ohne Scouting-/Draft-Daten erhalten Defaults zur Laufzeit.

## Tests

- Scouting verbessert Accuracy und bewegt das sichtbare Rating näher an das wahre Rating.
- Draft erstellt korrekt einen neuen Spieler im Team-Roster.
- Falsches Team am Pick wird blockiert.
- Bereits gedraftete Prospects können nicht doppelt ausgewählt werden.

## Offene Punkte

- Aktuell gibt es nur einen kompakten Round-1-MVP-Draft.
- Keine echte College-/Prospect-Generierung über mehrere Saisons.
- Kein Draft-Timer, kein Admin-Draft-Override und keine CPU-Autopicks.
- Draft-Klasse ist bewusst lokal und deterministisch, damit der MVP testbar bleibt.
