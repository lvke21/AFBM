# Player Profile Trade-off Layer Report

## Status
Gruen

## Ziel
Die Player-Profile-Decision-Layer zeigt jetzt nicht nur eine schnelle Empfehlung, sondern auch die Entscheidungsspannung dahinter: Was gewinnt der Nutzer, und was verliert er, wenn dieser Spieler startet, gebencht oder entwickelt wird?

## Umgesetzte Erweiterungen

### Trade-off Hinweise
- `getPlayerDecisionLayer` liefert jetzt `tradeoffs`.
- Sichtbare Beispiele:
  - `Starker Starter, aber hohe Fatigue`
  - `Mehr Potential, weniger aktuelle Leistung`
  - `Jetzt stark, spaeter begrenzt`
  - `Gutes Rating, schwacher Fit`
  - `Riskant, aber hohe Upside`
  - `Wenig Trade-off`
- Die Top Section zeigt die wichtigsten Trade-offs direkt unter der Entscheidung.
- Weitere Trade-offs werden kompakt neben den Risiko-Indikatoren angezeigt.

### Positionskonflikte
- Die bestehende Slot-#1-Vergleichslogik wurde erweitert.
- Wenn ein Starter einen jungen Spieler mit mindestens vergleichbarem Potential blockiert, erscheint:
  - `Blockiert Entwicklung von <Spieler>`
- Wenn der Spieler selbst nicht Slot #1 ist und eine relevante Alternative vorhanden ist, erscheint:
  - `Alternative Option vorhanden`

### Kurzfrist vs langfristig
- Kurzfristige Leistung und langfristiger Wert werden kombiniert:
  - hohe aktuelle OVR + geringe POT-Spanne → `Jetzt stark, spaeter begrenzt`
  - niedrigere aktuelle OVR + hohe POT-Spanne → `Mehr Potential, weniger aktuelle Leistung`
  - hohe Upside + Risiko → `Riskant, aber hohe Upside`

### Entscheidungsspannung
- Die Entscheidung wirkt nicht mehr nur gut/schlecht.
- Beispiele:
  - Starten kann sofort helfen, aber Fatigue oder schwacher Fit machen es riskant.
  - Benchen kann kurzfristig Leistung kosten, aber Entwicklung schuetzen.
  - Ein Veteran kann aktuell besser sein, aber einen jungen Spieler blockieren.

## Verwendete Daten
Nur vorhandene Signale:
- Player OVR / POT
- Alter
- Fatigue
- Injury Status
- Scheme Fit
- Rosterstatus
- Depth-Chart-Slot
- vorhandene Team-Read-Model-Spieler derselben Position

## Betroffene Dateien
- `src/components/player/player-detail-model.ts`
- `src/components/player/player-detail-model.test.ts`
- `src/app/app/savegames/[savegameId]/players/[playerId]/page.tsx`
- `docs/gui/player-profile-tradeoff-layer-report.md`

## Tests
- `npx vitest run src/components/player/player-detail-model.test.ts src/components/player/player-role-model.test.ts src/components/player/player-value-model.test.ts`
  - Ergebnis: Gruen, 3 Testdateien, 23 Tests
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen

## Grenzen
- Keine neuen Datenfelder.
- Keine Engine-Aenderung.
- Keine Persistenzlogik.
- Die Trade-offs sind Interpretationen vorhandener Daten, keine garantierten Simulationseffekte.
- Positionskonflikte sind nur sichtbar, wenn Teamdaten und Positionskollegen geladen werden koennen.

## Statuspruefung
- Trade-off Hinweise sichtbar: Ja
- Positionskonflikte sichtbar: Ja
- Kurzfrist/langfristig erkennbar: Ja
- Entscheidungsspannung erhoeht: Ja
- Keine neuen Daten oder Engine-Aenderungen: Ja
- Tests gruen: Ja

Status: Gruen
