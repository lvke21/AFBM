# X-Factor System Report

## Ziel

Der lokale Multiplayer-GM-Modus hat jetzt ein erstes X-Factor-System. Spieler koennen seltene Spezialfaehigkeiten besitzen, die nur in passenden Spielsituationen aktiv werden und einen kleinen, klar begrenzten Modifier liefern.

## Datenmodell

`OnlineContractPlayer` wurde erweitert um:

- `xFactors: OnlinePlayerXFactor[]`

Ein `OnlinePlayerXFactor` enthaelt:

- `abilityId`
- `abilityName`
- `description`
- `rarity: "rare"`

Aktuell verfuegbare Abilities:

- `Clutch`
- `Speed Burst`
- `Playmaker`

Bestehende lokale Ligen bleiben kompatibel. Beim Laden werden fehlende X-Factor-Daten aus Position, Overall, Potential und Development Path abgeleitet.

## Seltenheit

X-Factors werden bewusst restriktiv vergeben:

- Premium-Spieler erhalten maximal wenige Abilities.
- Default-Roster haben nicht auf jedem Spieler einen X-Factor.
- Spieler mit hohem Overall, hohem Potential oder Star-Path haben die besten Chancen.

## Trigger-Logik

X-Factors sind situativ:

- `Clutch`: aktiviert in engen Schlussphasen oder Playoff-Kontexten.
- `Speed Burst`: aktiviert bei Raum, langen Downs oder Returns, aber nicht in komprimierten Red-Zone-Situationen.
- `Playmaker`: aktiviert in High-Leverage-Passing-Situationen, z. B. Third Down, langer Pass-Kontext oder Red Zone.

Die Trigger liefern `OnlineXFactorTriggerResult` mit:

- aktiv / inaktiv
- kleinem `impactModifier`
- Begruendungstext

## UI

Die Online-Vertragsliste zeigt pro Spieler die vorhandenen X-Factors oder `Kein X-Factor`. Damit ist das System sichtbar, ohne einen neuen Screen zu erzwingen.

## Tests

Abgedeckt:

- X-Factors werden auf Default-Rostern selten vergeben.
- `Clutch` triggert nur in passenden Late-Game-Kontexten.
- `Speed Burst` triggert bei Raum, nicht in komprimierter Red Zone.
- `Playmaker` triggert bei High-Leverage-Passsituationen.
- Teamweite X-Factor-Auswertung liest gespeicherte Liga-Roster korrekt.

## Offene Punkte

- Noch keine tiefe Game-Engine-Integration in einzelne Play-Resolution-Rolls.
- Noch keine Admin-/GM-Konfiguration fuer X-Factor-Auswahl.
- Noch keine saisonale X-Factor-Entwicklung oder Regression.
