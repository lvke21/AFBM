# Coaching System Report

## Ziel

Der lokale Online-GM-Modus wurde um ein erstes Coaching-Hiring-System erweitert. GMs können Coaches aus einem lokalen Markt einstellen und aktive Coaches entlassen. Die Änderungen wirken direkt auf das bestehende Training-System, weil Training Outcomes bereits über Staff-Ratings berechnet werden.

## Neue Datenmodelle

- `CoachRole`: `head_coach`, `offensive_coordinator`, `defensive_coordinator`, `development_coach`
- `CoachRatings`: Offense, Defense, Development
- `Coach`: Coach-ID, Name, Rolle und Ratings
- `CoachTransactionHistoryEntry`: lokale Historie für Hiring/Firing
- `OnlineLeague.availableCoaches`: lokaler Coach-Markt
- `OnlineLeague.coachHistory`: Auditierbare Coaching-Wechsel

## Aktionen

- `hireOnlineCoach(leagueId, userId, coachId)`
  - lädt Liga und GM
  - sucht Coach im lokalen Markt
  - aktualisiert das `CoachingStaffProfile`
  - entfernt den neuen Coach aus dem Markt
  - legt den ersetzten Coach wieder in den Markt
  - schreibt Event und Historie

- `fireOnlineCoach(leagueId, userId, role)`
  - lädt Liga und GM
  - ersetzt die Rolle durch einen Interim-Coach
  - legt den entlassenen Coach wieder in den Markt
  - schreibt Event und Historie

## Einfluss auf Training und Entwicklung

Das bestehende Training-System nutzt `offenseTraining`, `defenseTraining`, `playerDevelopment`, `gamePreparation`, `discipline`, `motivation` und `adaptability`.

Hiring wirkt dadurch sofort:

- Offensive Coordinator verbessert primär Offense Training und Game Preparation.
- Defensive Coordinator verbessert primär Defense Training und Discipline.
- Development Coach verbessert Player Development, Motivation und Adaptability.
- Head Coach beeinflusst mehrere Staff-Werte gleichzeitig.

Interim-Coaches liegen bewusst bei niedrigen Basiswerten, damit ein Wechsel im Training sichtbar und testbar ist.

## UI

Im Online-Liga-Dashboard gibt es einen neuen Bereich `Coaching Staff`:

- aktueller Staff mit Ratings
- Coach-Markt mit verfügbaren Kandidaten
- Buttons zum Einstellen und Feuern
- Feedback nach Aktionen

## Validierung und Persistenz

- Coaches, Ratings und Coach-Historie werden beim Laden validiert.
- Ratings werden auf gültige Trait-Werte normalisiert.
- Bestehende Ligen ohne `availableCoaches` erhalten zur Laufzeit einen Default-Coach-Markt.
- Bestehende Saves bleiben rückwärtskompatibel.

## Tests

Abgedeckt:

- Ein eingestellter Development Coach verbessert Training Outcomes gegenüber einem Interim-Coach.
- Hiring aktualisiert Staff, Markt und Historie.
- Firing setzt einen Interim-Coach, gibt den entlassenen Coach in den Markt zurück und schreibt Historie.

## Offene Punkte

- Noch keine Coach-Gehälter oder Vertragslaufzeiten.
- Noch kein Owner-/Budget-Einfluss auf Staff-Entscheidungen.
- Noch kein mehrjähriger Coach-Progression- oder Reputation-Loop.
- Coach-Markt ist lokal und deterministisch, nicht backend-synchronisiert.
