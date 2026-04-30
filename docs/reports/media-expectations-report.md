# Media & Expectations Report

## Ziel

Der Online-GM-Modus hat jetzt ein lokales Media-&-Expectation-System. Der GM kann ein öffentliches Teamziel setzen, das Owner-Erwartungen und Fan Pressure beeinflusst.

## Teamziele

Verfügbare Optionen:

- `Rebuild`
- `Playoffs`
- `Championship`

Das Ziel wird als `OnlineMediaExpectationProfile` am Liga-User gespeichert.

## Datenmodell

`OnlineMediaExpectationProfile` enthält:

- `teamId`
- `userId`
- `season`
- `goal`
- `ownerExpectation`
- `fanPressureModifier`
- `ownerPressureModifier`
- `mediaNarrative`
- `setAt`
- `updatedAt`

## Einfluss auf Owner

Wenn ein GM kein explizites Saison-Erwartungsfeld übergibt, nutzt die Saisonbewertung automatisch das gesetzte Media-Ziel:

- Rebuild → niedrigere sportliche Soforterwartung
- Playoffs → klare Postseason-Erwartung
- Championship → Titel-Fenster mit hohem Druck

Verfehlte hohe Ziele senken Owner Confidence stärker. Realistische Rebuild-Ziele puffern Owner-Druck.

## Einfluss auf Fan Pressure

Fan Pressure berücksichtigt jetzt das gesetzte Teamziel:

- Ein verfehltes Championship-Ziel erhöht Fan Pressure deutlich.
- Ein verfehltes Playoff-Ziel erhöht Fan Pressure moderat.
- Ein realistischer Rebuild stabilisiert Fan Pressure bei schwächerer Bilanz.
- Erfüllte Ziele reduzieren den Druck leicht.

## UI

Im Online-Liga-Dashboard kann der GM im Bereich `Dein Team` ein Ziel setzen:

- Rebuild
- Playoffs
- Championship

Das Dashboard zeigt das aktuelle Ziel, Druck-Modifikatoren und die Media-Narrative.

## Events

Neue Audit-Event-Art:

- `media_expectation_set`

## Tests

Abgedeckt:

- Falsch gesetzte Championship-Erwartung erhöht Fan Pressure und senkt Job Security gegenüber einem Rebuild-Ziel.
- Erfüllte Playoff-Erwartung stabilisiert Fan Pressure und Owner Confidence.

## Offene Punkte

- Noch keine Pressekonferenzen oder Medienereignisse.
- Noch keine KI-generierten Storylines.
- Noch keine mehrstufigen Zielverhandlungen mit dem Owner.
- Das System ist lokal und noch nicht backend-synchronisiert.
